using AnagoLeaderboard.Models.Results;

namespace AnagoLeaderboard.Services;

/// <summary>
/// Head-to-head standing between every pair of players, and what a personal album would rate
/// each card at.
///
/// The aggregation is the same one <see cref="PlayerService.GetPlayerStatistics"/> already does
/// for the oefenmateriaal and angstgegner rows on a player page - sum the delta of the team you
/// faced, count the games - with three differences that matter for a card pool and not for a
/// stats page:
///
/// <list type="bullet">
/// <item>It is <strong>one pass over the games for every collector at once</strong>, rather than
/// one pass per collector. A report over the whole roster is O(games), not O(players x games).</item>
/// <item><strong>Inactive players are kept.</strong> The player page filters them out, which is
/// right there and would silently delete every icoon from a personal album - including the best
/// card the volume could have, the angstgegner who has since left.</item>
/// <item><strong>Pairs who never met are reported</strong>, at zero games, instead of being
/// absent. What their card should be rated is an open question, and it cannot be answered by a
/// dataset that omits them.</item>
/// </list>
///
/// The delta read is <see cref="TeamPerformance.DeltaPoints"/>, which is exactly zero-sum
/// (<c>teamDelta = {d, -d}</c>) and excludes the first-ten-games experience factor. Both facts
/// are load-bearing: see <see cref="DeltaScaleCalculator"/>.
///
/// Nothing here is written, and the scale it applies is a candidate. See docs/trading-cards.md.
/// </summary>
public class HeadToHeadService(
    LeaderBoardService leaderBoardService,
    CardRatingCalculator cardRatingCalculator,
    DeltaScaleCalculator deltaScaleCalculator)
{
    /// <summary>Percentiles printed for the fit. Both tails in detail, because that is where the outliers are.</summary>
    private static readonly double[] ReportedPercentiles =
        { 0, 1, 2.5, 5, 10, 25, 50, 75, 90, 95, 97.5, 99, 100 };

    /// <summary>Game-count bands, so the cost of a sample floor can be read off rather than guessed.</summary>
    private static readonly int[] GameCountBands = { 1, 2, 3, 5, 10, 25, 50, 100, 250 };

    /// <summary>Games a pair needs before it may contribute to the collector's centring constant.</summary>
    private const int CentreMinGames = 10;

    /// <summary>Deep pairs at which a collector's centring constant is believed half way.</summary>
    private const int CentrePairsForHalf = 5;

    /// <summary>
    /// Which of a collector's records set the width of their scale, counting from the most extreme.
    ///
    /// <strong>Averaged over a band of ranks rather than read off one.</strong> A single order
    /// statistic makes one specific opponent the silent owner of the whole book's width, and the
    /// extent is a <em>multiplier</em> - so unlike the centring offset, a change to it spreads or
    /// compresses every card around the middle. Measured on Marie, the factor from rank one to rank
    /// five runs 0.36, 0.46, 0.58, 0.78, 1.08: a threefold range, so any result that reorders her top
    /// few moves her whole book by a third. Beating one nemesis would have made two others rarer and
    /// pushed three commons further down.
    ///
    /// Averaging ranks two to five needs several results to shift, because three of the four inputs
    /// stay put when one reorders. Rank one is left out for the same reason it was never used alone -
    /// it is the most volatile figure in the book.
    ///
    /// The first rank or two then overshoot the pin and clamp, so a book carries one to three cards at
    /// its ceiling rather than exactly one. That is still far tighter than a shared scale, which gave
    /// Roel none and Marie three.
    /// </summary>
    private static readonly int[] DefaultExtentRanks = { 2, 3, 4, 5 };

    /// <summary>How far a scale factor may stray from 1, either way. A guard against a collector whose deep records are all tiny being blown up beyond sense.</summary>
    private const double MaxExtentFactor = 4;

    /// <summary>
    /// Where on the rare side of the scale the reference record is pinned, as a fraction of the
    /// outermost anchor.
    ///
    /// Pinning it at the anchor itself would put ranks one, two and three all at or past the cap, so
    /// every book would carry three cards clamped at the top and three chase cards with it. Pinning
    /// it short leaves the top one or two room to spread above it, which is what puts a single card
    /// in the low nineties and the next few just below.
    /// </summary>
    private const double ExtentPinFraction = 0.6;

    /// <summary>
    /// The whole report.
    /// </summary>
    /// <param name="minGames">
    /// Subjects and collectors below this many games in total are left out entirely, which is the
    /// existing card-pool gate rather than a head-to-head one - a player who is not collectable
    /// has no card to rate. Defaults to <see cref="CardRatingCalculator.MinGames"/>.
    /// </param>
    /// <param name="anchors">
    /// A candidate anchor table, overriding the configured one. Lets a fit be swept from the URL
    /// instead of a rebuild.
    /// </param>
    public async Task<HeadToHeadReport> GetReport(
        int? minGames = null,
        DeltaScaleCalculator.DeltaAnchor[]? anchors = null,
        DeltaScaleCalculator.DeltaAnchor[]? scoreAnchors = null,
        double? shrinkageK = null,
        double? nudgeCeiling = null,
        double? trustAt = null,
        int? medianTarget = null)
    {
        var (players, games) = await leaderBoardService.GetLeaderBoard();

        var scale = anchors is { Length: >= 2 }
            ? new DeltaScaleCalculator(anchors)
            : deltaScaleCalculator;

        // The competing metric's own scale. Its band is a handful of goals rather than tens of
        // rating points, so it cannot share the delta's anchors and a like-for-like comparison has
        // to be made by matching percentiles, not numbers.
        var scoreScale = new DeltaScaleCalculator(
            scoreAnchors is { Length: >= 2 }
                ? scoreAnchors
                : new[]
                {
                    new DeltaScaleCalculator.DeltaAnchor(-2, 99),
                    new DeltaScaleCalculator.DeltaAnchor(0, 70),
                    new DeltaScaleCalculator.DeltaAnchor(+2, 40)
                });

        // The fourth option, and the only one that is a count rather than a judgement: rarity from
        // how often the two have played, not how it went. Anchored on log10(games + 1) because the
        // counts run over three decades - 0 to 556 in the deepest book - and a linear scale would
        // put everybody a collector actually plays into the bottom two points.
        var frequencyScale = new DeltaScaleCalculator(new[]
        {
            new DeltaScaleCalculator.DeltaAnchor(0.0, 99),
            new DeltaScaleCalculator.DeltaAnchor(2.75, 40)
        });

        // B2's two constants.
        //
        // K is how many games it takes before a record is believed half way: the reliability term
        // is n/(n+k), so it is 0 for somebody you have never faced and approaches 1 for somebody
        // you have played hundreds of times. The measurement in HeadToHeadTests puts the honest
        // value in the low hundreds, which is why B2's nudge stays modest whatever ceiling is
        // chosen - and why it needs no minimum-games threshold and no fallback rule. Never played
        // means never believed means the card prints its ordinary rating.
        //
        // Ceiling is the most a record may ever move a card, in overall points. It is a taste
        // decision rather than a measured one.
        var k = shrinkageK ?? 200;
        var ceiling = nudgeCeiling ?? 8;

        // The game count at which the ordinary rating stops having any say, ramping from nothing
        // at zero games.
        //
        // <strong>Ten, not five.</strong> At five, a pair's card carries a standard deviation of
        // about 24 overall points on a 45-point scale at the moment its weight reaches full - the
        // instability peaks exactly at the threshold, because that is where a tiny sample first
        // gets complete authority. Ten roughly halves it. It is still the crudest knob in here;
        // shrinkage would cap the churn at about four points anywhere in the book, at the cost of
        // most of the personalisation.
        var trust = trustAt ?? 10;
        var extentRanks = DefaultExtentRanks;

        // The record that counts as extreme, and so the divisor that turns a record into a
        // fraction of the way to that extreme. Taken off the score scale's own outermost anchor so
        // the two cannot drift apart.
        var extent = Math.Max(
            Math.Abs(scoreScale.Anchors[0].AverageDelta),
            Math.Abs(scoreScale.Anchors[^1].AverageDelta));

        var floor = minGames ?? cardRatingCalculator.MinGames;

        var roster = players
            .Where(player => player.NumberOfGames >= floor)
            .OrderByDescending(player => player.VisibleRating)
            .ToList();

        var tally = Tally(games);

        // The centre is the median of the collector's own per-opponent list, one metric each.
        //
        // Two choices in that sentence, and both were arrived at the hard way.
        //
        // <strong>Per opponent, not per game.</strong> A games-weighted mean answers "how does this
        // collector do per game", which is what Elo already balances to zero on the rating side. It
        // is the wrong constant here, because the scale is applied to one number per opponent - so
        // what has to sit at the middle of the scale is the middle of *that* list. A collector with
        // many lightly-played opponents they beat handily has a per-opponent list skewed hard
        // positive while their per-game total is dead level, and their whole book then lands against
        // one end of the scale.
        //
        // <strong>Median, not mean.</strong> The list is fat-tailed by construction - a +24 average
        // off three games is an ordinary entry in it - and a mean chases those. The median does not.
        //
        // Both metrics need it. Elo self-centring is a property of the rating, not of this list.
        var collectorCentre = new Dictionary<string, (double Delta, double Score)>();
        foreach (var group in tally.GroupBy(entry => entry.Key.Collector))
        {
            // Well-played pairs only, and then shrunk by how many of them there are.
            //
            // Two problems solved by one line each, and they happen to be anti-correlated.
            //
            // <strong>Deep pairs only.</strong> A median over the whole opponent list is jittered by
            // the one- and two-game pairs, and a jittered centre is subtracted from every card - so
            // a game against A and B could move C's rating, which is indefensible to somebody
            // holding C. Over ~30 pairs that all have ten games or more, one further game moves one
            // value by a fraction and the median by nothing at all.
            //
            // <strong>Shrunk by how many there are.</strong> A collector with two deep pairs has no
            // business asserting an offset, and gets almost none. That costs nothing, because a
            // collector with no deep pairs also has a near-zero blend weight on every card - their
            // book prints leaderboard ratings whatever the centre is. The collectors for whom the
            // centre matters are exactly the ones who can estimate it.
            var deep = group
                .Where(entry => entry.Value.Games >= CentreMinGames)
                .Select(entry => entry.Value)
                .ToList();

            var confidence = deep.Count / (double)(deep.Count + CentrePairsForHalf);

            collectorCentre[group.Key] = (
                Median(deep.Select(against => against.SumDelta / (double)against.Games)) * confidence,
                Median(deep.Select(against => against.SumScoreDiff / against.Games)) * confidence);
        }

        // Per-book extent: how wide this collector's scale has to be for their book to reach the
        // rare end at all.
        //
        // A shared extent is the reason Roel's book topped out at 88 while Marie's had three cards
        // at the cap - whether anybody's records happen to reach a fixed -5 is luck, not design. One
        // number per collector fixes it, read off their own deep records the same way the centring
        // constant is.
        var collectorFactor = new Dictionary<string, (double Delta, double Score)>();
        foreach (var group in tally.GroupBy(entry => entry.Key.Collector))
        {
            var deep = group
                .Where(entry => entry.Value.Games >= CentreMinGames)
                .Select(entry => entry.Value)
                .ToList();

            var centre = collectorCentre.GetValueOrDefault(group.Key);

            collectorFactor[group.Key] = (
                Factor(deep.Select(a => a.SumDelta / (double)a.Games - centre.Delta), scale, extentRanks),
                Factor(deep.Select(a => a.SumScoreDiff / a.Games - centre.Score), scoreScale, extentRanks));
        }


        var rows = new List<HeadToHeadRow>();

        foreach (var collector in roster)
        {
            foreach (var subject in roster)
            {
                if (subject.Id == collector.Id) continue;

                tally.TryGetValue((collector.Id, subject.Id), out var against);

                // Zero games means zero average, and that is a placeholder rather than a finding.
                // Whether an unmet subject belongs at the middle of the scale, at their ordinary
                // rating, or out of the book altogether is the open question this report exists to
                // inform - so the rows carry the game count next to the figure, and the summary
                // counts them separately.
                var average = against.Games == 0
                    ? 0d
                    : against.SumDelta / (double)against.Games;

                // An icoon's ordinary card is rated on their peak; an active's on today's rating.
                // Carried only so the two scales can be read side by side.
                var globalRating = subject.Active ? subject.VisibleRating : subject.PeakVisibleRating;

                var averageScoreDiff = against.Games == 0
                    ? 0d
                    : against.SumScoreDiff / against.Games;

                var centre = collectorCentre.GetValueOrDefault(collector.Id);

                var centredScoreDiff = against.Games == 0 ? 0d : averageScoreDiff - centre.Score;
                var centredDelta = against.Games == 0 ? 0d : average - centre.Delta;

                // Widened or narrowed to this collector's own extent, so their book reaches the rare
                // end whether their records happen to be big or small. Only the two blended options
                // read the scaled figures; the earlier ones stay on the shared scale so the
                // comparison between them is unaffected.
                var factor = collectorFactor.TryGetValue(collector.Id, out var found) ? found : (Delta: 1d, Score: 1d);

                var scaledScoreDiff = centredScoreDiff * factor.Score;
                var scaledDelta = centredDelta * factor.Delta;

                rows.Add(new HeadToHeadRow(
                    collector.Id,
                    collector.Name,
                    subject.Id,
                    subject.Name,
                    subject.Active,
                    against.Games,
                    against.SumDelta,
                    average,
                    averageScoreDiff,
                    centredScoreDiff,
                    centredDelta,
                    cardRatingCalculator.OverallFor(globalRating),
                    scale.OverallFor(average),
                    scoreScale.OverallFor(averageScoreDiff),
                    scoreScale.OverallFor(centredScoreDiff),
                    frequencyScale.OverallFor(Math.Log10(against.Games + 1)),
                    Nudged(
                        cardRatingCalculator.OverallFor(globalRating),
                        centredScoreDiff,
                        against.Games,
                        k,
                        ceiling,
                        extent,
                        cardRatingCalculator),
                    Blended(
                        cardRatingCalculator.OverallFor(globalRating),
                        scoreScale.OverallFor(scaledScoreDiff),
                        against.Games,
                        trust,
                        cardRatingCalculator),
                    Blended(
                        cardRatingCalculator.OverallFor(globalRating),
                        scale.OverallFor(scaledDelta),
                        against.Games,
                        trust,
                        cardRatingCalculator),
                    Blended(
                        cardRatingCalculator.OverallFor(globalRating),
                        scale.OverallFor(centredDelta),
                        against.Games,
                        trust,
                        cardRatingCalculator),
                    factor.Delta));
            }
        }


        CapToOwnPool(rows);

        if (medianTarget is { } target) Pin(rows, target, cardRatingCalculator);

        return new HeadToHeadReport(rows, Summarise(rows, Decompose(tally)), Describe(scale));
    }

    /// <summary>
    /// B2: the ordinary overall, moved by as much of the personal record as the record has earned.
    ///
    /// <c>reliability = n / (n + k)</c> is the whole mechanism, and it is what lets this option
    /// have no threshold and no fallback: at zero games it is zero, so a subject the collector has
    /// never faced prints exactly what they print today, icoon or not. The sign is negative
    /// because a worse record has to make a card <em>rarer</em>, and rarer is a higher overall.
    ///
    /// Clamped to the scale's own floor and cap rather than to 40 and 99, so a re-anchoring of the
    /// ordinary scale carries through here without a second edit.
    /// </summary>
    private static int Nudged(
        int globalOverall,
        double record,
        int games,
        double k,
        double ceiling,
        double extent,
        CardRatingCalculator cardRatingCalculator)
    {
        if (games == 0 || extent <= 0) return globalOverall;

        var reliability = games / (games + k);
        var normalised = Math.Clamp(record / extent, -1, 1);

        var nudged = globalOverall - reliability * ceiling * normalised;

        return (int)Math.Clamp(
            Math.Round(nudged, MidpointRounding.AwayFromZero),
            cardRatingCalculator.OverallFloor,
            cardRatingCalculator.OverallCap);
    }

    /// <summary>
    /// B4: the personal record is the rating, and the ordinary rating is only what stands in for it
    /// until there is a record to read.
    ///
    /// The weight ramps straight from 0 at no games to 1 at <paramref name="trustAt"/>, after which
    /// the leaderboard has no say at all. That is the whole difference from
    /// <see cref="Nudged"/>: B2 treats the ordinary rating as the truth and the record as a
    /// correction to it, and this treats the record as the truth and the ordinary rating as a
    /// placeholder.
    ///
    /// <strong>It gives a five-game record the same authority as a five-hundred-game one</strong>,
    /// which is deliberate here and is also the thing to watch: the measurement in
    /// <c>HeadToHeadTests</c> puts a record's reliability at roughly <c>n / (n + k)</c> with k in
    /// the low hundreds, so at n = 5 the reading is a few percent signal. Raising
    /// <paramref name="trustAt"/> is the knob that trades personalisation for that.
    /// </summary>
    private static int Blended(
        int globalOverall,
        int recordOverall,
        int games,
        double trustAt,
        CardRatingCalculator cardRatingCalculator)
    {
        if (games == 0 || trustAt <= 0) return globalOverall;

        var weight = Math.Min(games, trustAt) / trustAt;

        var blended = weight * recordOverall + (1 - weight) * globalOverall;

        return (int)Math.Clamp(
            Math.Round(blended, MidpointRounding.AwayFromZero),
            cardRatingCalculator.OverallFloor,
            cardRatingCalculator.OverallCap);
    }

    /// <summary>
    /// One pass over every game, crediting all four seats.
    ///
    /// For a player on the first team, the delta against each opponent is
    /// <c>-SecondTeam.DeltaPoints</c>, which is identically <c>FirstTeam.DeltaPoints</c> because
    /// the two are constructed as <c>{d, -d}</c>. Written the second way here: it is the same
    /// number and it makes the symmetry of the loop visible.
    /// </summary>
    private static Dictionary<(string Collector, string Subject), Against> Tally(List<Game> games)
    {
        var tally = new Dictionary<(string, string), Against>();

        foreach (var game in games)
        {
            var first = new[] { game.FirstTeam.FirstPlayer.PlayerId, game.FirstTeam.SecondPlayer.PlayerId };
            var second = new[] { game.SecondTeam.FirstPlayer.PlayerId, game.SecondTeam.SecondPlayer.PlayerId };

            // The second metric: goals actually won by, less goals expected. Computed exactly the
            // way GameWithAnalytics computes it - ProbTeam1Wins off the four OldRatings, through
            // ExpectedScoreCalculator - so the two cannot disagree about what "expected" means.
            // OldRating is the visible rating rather than the raw one the delta itself is computed
            // from; that approximation is the established one here and is kept deliberately.
            var probFirstWins = RatingCalculator.ProbTeam1Wins(
                game.FirstTeam.FirstPlayer.OldRating,
                game.FirstTeam.SecondPlayer.OldRating,
                game.SecondTeam.FirstPlayer.OldRating,
                game.SecondTeam.SecondPlayer.OldRating);

            // GetExactExpectedMargin, not GetExpectedMargin: the integer version clamps a level
            // fixture to +/-1 and rounds, and both biases survive averaging. See the note there.
            var expected = ExpectedScoreCalculator.GetExactExpectedMargin(probFirstWins);
            var actual = game.FirstTeam.Goals - game.SecondTeam.Goals;

            // Negated for the other side rather than recomputed, so the metric stays exactly
            // zero-sum the way DeltaPoints is. Rounding inside GetExpectedMargin would otherwise
            // make the two directions of one pair disagree by a goal.
            Credit(tally, first, second, game.FirstTeam.DeltaPoints, actual - expected);
            Credit(tally, second, first, game.SecondTeam.DeltaPoints, -(actual - expected));
        }

        return tally;
    }

    /// <summary>
    /// One pair's history, under both candidate metrics.
    ///
    /// The squares are carried only so the variance decomposition can separate how noisy a single
    /// game is from how much the pairs genuinely differ - which is the whole question, and the one
    /// the two metrics have to be compared on.
    /// </summary>
    private readonly record struct Against(
        int Games,
        int SumDelta,
        double SumDeltaSquares,
        double SumScoreDiff,
        double SumScoreDiffSquares);

    private static void Credit(
        Dictionary<(string, string), Against> tally,
        string[] collectors,
        string[] opponents,
        int delta,
        double scoreDiff)
    {
        foreach (var collector in collectors)
        {
            foreach (var opponent in opponents)
            {
                var key = (collector, opponent);
                tally.TryGetValue(key, out var current);
                tally[key] = new Against(
                    current.Games + 1,
                    current.SumDelta + delta,
                    current.SumDeltaSquares + (double)delta * delta,
                    current.SumScoreDiff + scoreDiff,
                    current.SumScoreDiffSquares + (double)scoreDiff * scoreDiff);
            }
        }
    }

    /// <summary>
    /// How much of the spread between pairs is real, and how much is the noise of a single game.
    ///
    /// This is the question the whole report exists for, and percentiles cannot answer it. Two
    /// variances:
    ///
    /// <list type="bullet">
    /// <item><c>withinGame</c> - how much one game's delta scatters around its own pair's mean,
    /// pooled over every pair. Call it sigma^2. It is a property of foosball, not of anybody's
    /// matchup.</item>
    /// <item><c>betweenPairs</c> - how much the pair means scatter around zero, over pairs with
    /// enough games to mean anything. That figure is inflated by sampling: it measures
    /// tau^2 + sigma^2/n, where tau^2 is the real matchup effect.</item>
    /// </list>
    ///
    /// Subtracting gives tau, the signal. <strong>If tau comes out at or below zero, there is no
    /// measurable angstgegner effect at all</strong> and the variation between pairs is the noise
    /// of a coin landing differently - which would make a personal scale a random scale wearing a
    /// story. The ratio <c>sigma^2/tau^2</c> is then also the shrinkage constant <c>k</c>: a pair
    /// with n games deserves <c>n/(n+k)</c> of its raw average and no more.
    /// </summary>
    private static Dictionary<string, double> Decompose(
        Dictionary<(string Collector, string Subject), Against> tally)
    {
        var result = new Dictionary<string, double>();

        Decompose(tally, "delta", against => against.SumDelta, against => against.SumDeltaSquares, result);
        Decompose(tally, "goals", against => against.SumScoreDiff, against => against.SumScoreDiffSquares, result);

        return result;
    }

    private static void Decompose(
        Dictionary<(string Collector, string Subject), Against> tally,
        string label,
        Func<Against, double> sum,
        Func<Against, double> sumSquares,
        Dictionary<string, double> result)
    {
        // Pooled within-pair variance of a single game's figure. Only pairs with 2+ games have a
        // within-pair spread to contribute.
        var residual = 0d;
        var degrees = 0;

        foreach (var against in tally.Values)
        {
            if (against.Games < 2) continue;

            var mean = sum(against) / against.Games;
            residual += sumSquares(against) - against.Games * mean * mean;
            degrees += against.Games - 1;
        }

        var withinGame = degrees > 0 ? residual / degrees : 0;

        result[$"{label} perGameSd"] = Math.Round(Math.Sqrt(withinGame), 3);

        // Then, at each sample band, how much of the observed spread of the means survives once
        // the sampling noise sigma^2/n is taken back out.
        foreach (var band in new[] { 5, 10, 25, 50 })
        {
            var pairs = tally.Values.Where(against => against.Games >= band).ToList();
            if (pairs.Count < 20) continue;

            var means = pairs.Select(against => sum(against) / against.Games).ToList();
            var observed = means.Sum(mean => mean * mean) / means.Count;

            // Harmonic mean of n, which is the right average when each term contributes sigma^2/n.
            var harmonic = pairs.Count / pairs.Sum(against => 1d / against.Games);
            var expectedFromNoise = withinGame / harmonic;

            var signal = observed - expectedFromNoise;

            result[$"{label} n>={band} observedSd"] = Math.Round(Math.Sqrt(observed), 3);
            result[$"{label} n>={band} noiseSd"] = Math.Round(Math.Sqrt(expectedFromNoise), 3);
            result[$"{label} n>={band} signalSd"] = Math.Round(signal > 0 ? Math.Sqrt(signal) : -Math.Sqrt(-signal), 3);

            // The shrinkage constant: a pair with n games deserves n/(n+k) of its raw average. It
            // is the only number here that compares the two metrics directly, because it is a pure
            // ratio and so carries no units.
            result[$"{label} n>={band} shrinkageK"] = signal > 0 ? Math.Round(withinGame / signal, 1) : -1;
        }
    }

    /// <summary>
    /// The centred metric's decomposition, off the rows rather than the tally.
    ///
    /// Subtracting a per-collector constant cannot change how much one game scatters around its
    /// own pair's mean, so the within-game variance is the uncentred one - reused rather than
    /// recomputed, which is also what makes the two columns comparable. Only the between-pair term
    /// moves, and it moves down: some of what looked like matchup was the collector.
    /// </summary>
    private static void DecomposeCentred(
        List<HeadToHeadRow> rows,
        Dictionary<string, double> variance)
    {
        if (!variance.TryGetValue("goals perGameSd", out var perGameSd)) return;

        var withinGame = perGameSd * perGameSd;

        foreach (var band in new[] { 5, 10, 25, 50 })
        {
            var pairs = rows.Where(row => row.Games >= band).ToList();
            if (pairs.Count < 20) continue;

            var observed = pairs.Sum(row => row.CentredScoreDiff * row.CentredScoreDiff) / pairs.Count;
            var harmonic = pairs.Count / pairs.Sum(row => 1d / row.Games);
            var expectedFromNoise = withinGame / harmonic;
            var signal = observed - expectedFromNoise;

            variance[$"centred n>={band} observedSd"] = Math.Round(Math.Sqrt(observed), 3);
            variance[$"centred n>={band} noiseSd"] = Math.Round(Math.Sqrt(expectedFromNoise), 3);
            variance[$"centred n>={band} signalSd"] = Math.Round(signal > 0 ? Math.Sqrt(signal) : -Math.Sqrt(-signal), 3);
            variance[$"centred n>={band} shrinkageK"] = signal > 0 ? Math.Round(withinGame / signal, 1) : -1;
        }
    }

    private static HeadToHeadSummary Summarise(List<HeadToHeadRow> rows, Dictionary<string, double> variance)
    {
        DecomposeCentred(rows.Where(row => row.Games > 0).ToList(), variance);

        var met = rows.Where(row => row.Games > 0).ToList();

        var percentiles = PercentilesOf(met, row => row.AverageDelta);

        // The same figures at rising sample floors, for both metrics. Nothing is filtered out of
        // the report by this; it is the evidence for or against a floor rather than a floor.
        var byFloor = new Dictionary<string, IReadOnlyDictionary<string, double>>();
        foreach (var band in GameCountBands)
        {
            var above = met.Where(row => row.Games >= band).ToList();
            if (above.Count < 20) continue;

            byFloor[$"delta  >={band} ({above.Count} pairs)"] = PercentilesOf(above, row => row.CentredDelta);
            byFloor[$"goals  >={band} ({above.Count} pairs)"] = PercentilesOf(above, row => row.CentredScoreDiff);
        }

        // Both tails, and the game count beside each, because an absent sample floor shows up
        // here and nowhere else: an average of -40 over two games is not the same finding as an
        // average of -4 over two hundred.
        var extremes = met
            .OrderBy(row => row.AverageDelta)
            .Take(12)
            .Concat(met.OrderByDescending(row => row.AverageDelta).Take(12).Reverse())
            .Select(row => row.Line())
            .ToList();

        var bands = new Dictionary<string, int>();
        foreach (var band in GameCountBands)
        {
            bands[$">={band}"] = met.Count(row => row.Games >= band);
        }

        var histogram = new Dictionary<string, int>();
        for (var low = 40; low <= 95; low += 5)
        {
            var high = low + 4;
            histogram[$"{low}-{high}"] = met.Count(row => row.PersonalOverall >= low && row.PersonalOverall <= high);
        }

        return new HeadToHeadSummary(
            rows.Count,
            met.Count,
            rows.Count - met.Count,
            percentiles,
            byFloor,
            variance,
            extremes,
            bands,
            histogram);
    }

    /// <summary>
    /// The scale factor that brings one collector's records up to - or back down to - the width the
    /// shared curve expects.
    ///
    /// Reads the <paramref name="rank"/>-th most extreme record on the rare side and stretches it to
    /// <see cref="ExtentPinFraction"/> of the outermost anchor. Returns 1 when there is nothing to
    /// read, which leaves a collector with no deep negative records on the shared scale rather than
    /// inventing a width for them.
    /// </summary>
    private static double Factor(IEnumerable<double> centredRecords, DeltaScaleCalculator scale, int[] ranks)
    {
        var negatives = centredRecords
            .Where(record => record < 0)
            .OrderBy(record => record)
            .ToArray();

        // Whichever of the wanted ranks actually exist. A collector with only two hard matchups is
        // read off those two rather than being given a width they have not earned.
        var band = ranks
            .Where(rank => rank <= negatives.Length)
            .Select(rank => negatives[rank - 1])
            .ToArray();

        if (band.Length == 0) return 1;

        var reference = band.Average();
        if (reference >= 0) return 1;

        var pin = scale.Anchors[0].AverageDelta * ExtentPinFraction;

        return Math.Clamp(pin / reference, 1 / MaxExtentFactor, MaxExtentFactor);
    }

    private static IReadOnlyDictionary<string, double> PercentilesOf(
        List<HeadToHeadRow> rows,
        Func<HeadToHeadRow, double> metric)
    {
        var sorted = rows.Select(metric).OrderBy(value => value).ToArray();

        return ReportedPercentiles.ToDictionary(
            percentile => $"p{percentile:0.#}",
            percentile => Math.Round(Percentile(sorted, percentile), 3));
    }

    /// <summary>
    /// No card may be rarer than the rarest card the collector's own pool holds.
    ///
    /// A fixed cap of 92 hands the top-rated player a 92, and their book is the one book that cannot
    /// contain one - they are excluded from it, so its natural ceiling is the second-highest rating
    /// on the board. Roel's volume came out 2.3x harder than his volume 1 for exactly that reason:
    /// not because his matchups are extreme, but because he was given a card rarer than any card he
    /// could ever have drawn.
    ///
    /// So the ceiling is read off the book rather than the configuration. It changes nothing for
    /// anybody else, since every other book already contains the 92.
    /// </summary>
    private static void CapToOwnPool(List<HeadToHeadRow> rows)
    {
        foreach (var group in rows.GroupBy(row => row.CollectorId))
        {
            var book = group.ToList();
            var ceiling = book.Max(row => row.GlobalOverall);
            var floor = book.Min(row => row.GlobalOverall);

            foreach (var row in book) row.Clamp(floor, ceiling);
        }
    }

    /// <summary>
    /// Shifts every collector's book so its median lands on <paramref name="target"/>.
    ///
    /// Per collector and per option, because the two options produce differently-shaped books and
    /// the shortfall is not the same for either. See <see cref="HeadToHeadRow.Pin"/> for why this is
    /// not the same correction as the centring.
    /// </summary>
    private static void Pin(List<HeadToHeadRow> rows, int target, CardRatingCalculator cardRatingCalculator)
    {
        foreach (var group in rows.GroupBy(row => row.CollectorId))
        {
            var book = group.ToList();

            var scoreShift = target - (int)Math.Round(
                Median(book.Select(row => (double)row.BlendedOverall)), MidpointRounding.AwayFromZero);

            var deltaShift = target - (int)Math.Round(
                Median(book.Select(row => (double)row.BlendedDeltaOverall)), MidpointRounding.AwayFromZero);

            foreach (var row in book)
            {
                row.Pin(scoreShift, deltaShift, cardRatingCalculator.OverallFloor, cardRatingCalculator.OverallCap);
            }
        }
    }

    /// <summary>The middle value, or the mean of the two middle ones. Zero for an empty sequence.</summary>
    private static double Median(IEnumerable<double> values)
    {
        var sorted = values.OrderBy(value => value).ToArray();

        if (sorted.Length == 0) return 0;

        return sorted.Length % 2 == 1
            ? sorted[sorted.Length / 2]
            : (sorted[sorted.Length / 2 - 1] + sorted[sorted.Length / 2]) / 2;
    }

    /// <summary>Nearest-rank with linear interpolation, on an already-sorted array.</summary>
    private static double Percentile(double[] sorted, double percentile)
    {
        if (sorted.Length == 0) return 0;
        if (sorted.Length == 1) return sorted[0];

        var position = percentile / 100d * (sorted.Length - 1);
        var lower = (int)Math.Floor(position);
        var upper = (int)Math.Ceiling(position);

        return lower == upper
            ? sorted[lower]
            : sorted[lower] + (position - lower) * (sorted[upper] - sorted[lower]);
    }

    private static List<string> Describe(DeltaScaleCalculator scale) =>
        scale.Anchors
            .Select(anchor => $"{anchor.AverageDelta:0.##} -> {anchor.Overall:0.##}")
            .ToList();
}
