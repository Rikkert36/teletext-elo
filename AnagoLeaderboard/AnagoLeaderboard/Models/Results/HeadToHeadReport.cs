using System.Globalization;

namespace AnagoLeaderboard.Models.Results;

/// <summary>
/// What a personal, head-to-head album would be rated on: every (collector, subject) pair on the
/// roster, with the average Elo delta per game between them and the overall a candidate scale
/// turns it into.
///
/// A report, not a feature. It exists to answer the one question that decides whether the volume
/// is possible - how the average delta is actually distributed, and therefore where the anchors
/// go - and the summary is the part that does that work. Rows are for reading a particular book;
/// <see cref="HeadToHeadSummary"/> is for fitting the scale.
/// </summary>
public class HeadToHeadReport(
    IReadOnlyList<HeadToHeadRow> rows,
    HeadToHeadSummary summary,
    IReadOnlyList<string> anchors)
{
    public IReadOnlyList<HeadToHeadRow> Rows { get; } = rows;

    public HeadToHeadSummary Summary { get; } = summary;

    /// <summary>The anchor table the overalls in <see cref="Rows"/> were produced by, echoed back so a printout says which scale it is.</summary>
    public IReadOnlyList<string> Anchors { get; } = anchors;
}

/// <summary>One collector's standing against one subject.</summary>
public class HeadToHeadRow(
    string collectorId,
    string collectorName,
    string subjectId,
    string subjectName,
    bool subjectActive,
    int games,
    int sumDelta,
    double averageDelta,
    double averageScoreDiff,
    double centredScoreDiff,
    double centredDelta,
    int globalOverall,
    int personalOverall,
    int scorePersonalOverall,
    int centredPersonalOverall,
    int frequencyOverall,
    int nudgedOverall,
    int blendedOverall,
    int blendedDeltaOverall,
    int sharedDeltaOverall,
    double extentFactorDelta)
{
    public string CollectorId { get; } = collectorId;
    public string CollectorName { get; } = collectorName;
    public string SubjectId { get; } = subjectId;
    public string SubjectName { get; } = subjectName;

    /// <summary>Whether the subject is on the active roster. False means their card is an icoon.</summary>
    public bool SubjectActive { get; } = subjectActive;

    /// <summary>Games the two played on opposing teams. Zero is a real answer and is reported rather than dropped.</summary>
    public int Games { get; } = games;

    /// <summary>Summed delta, from the collector's side: positive means the collector over-performed.</summary>
    public int SumDelta { get; } = sumDelta;

    /// <summary>
    /// <see cref="SumDelta"/> over <see cref="Games"/>, and zero when they never met.
    ///
    /// Per game rather than summed, because a sum measures how much two people have played each
    /// other and this has to measure how it went.
    /// </summary>
    public double AverageDelta { get; } = averageDelta;

    /// <summary>
    /// The competing metric: goals actually won by, less goals expected, averaged per game.
    ///
    /// Measures the same thing as <see cref="AverageDelta"/> and differs in two ways that matter.
    /// Its reference point is the <em>expected margin</em> rather than a draw, and it weights every
    /// goal equally, where the delta weights the rarer outcome more heavily - a favourite's losses
    /// count several times their wins. Both differences reduce variance without touching the
    /// signal, which is the whole reason to measure it.
    /// </summary>
    public double AverageScoreDiff { get; } = averageScoreDiff;

    /// <summary>What the card prints today, off the ordinary rating scale. Carried for comparison only.</summary>
    public int GlobalOverall { get; } = globalOverall;

    /// <summary>What the card would print in this collector's book under the candidate delta scale.</summary>
    public int PersonalOverall { get; } = personalOverall;

    /// <summary>
    /// <see cref="AverageScoreDiff"/> less the median of this collector's per-opponent list.
    ///
    /// Without it the metric measures the collector as much as the matchup, and the whole book
    /// lands against one end of the scale: somebody who habitually wins narrowly falls short of the
    /// fitted margin curve against everybody. It is a single constant per collector, so it changes
    /// nothing about the order of a book - only where that book sits against the anchors, and
    /// therefore how much of the 40-99 range it uses and whether two collectors' books are
    /// comparable at all.
    ///
    /// It also changes what the figure claims. Uncentred it says "I beat the app's prediction
    /// against this person"; centred it says "I do better against this person than against my
    /// typical opponent", which is the more useful statement for an album and a different one.
    /// </summary>
    public double CentredScoreDiff { get; } = centredScoreDiff;

    /// <summary>
    /// <see cref="AverageDelta"/> less the median of this collector's per-opponent list.
    ///
    /// The Elo metric needs this too, which is easy to get wrong: Elo self-centring balances a
    /// player's games-<em>weighted</em> total to zero, which is what keeps their rating honest and
    /// says nothing about the unweighted list of one figure per opponent. Many lightly-played
    /// opponents beaten handily barely touch the weighted total while dominating that list.
    /// </summary>
    public double CentredDelta { get; } = centredDelta;

    /// <summary>The same, under the score-difference metric and its own percentile-matched anchors.</summary>
    public int ScorePersonalOverall { get; } = scorePersonalOverall;

    /// <summary>And under the centred score difference, which is the only one of the three with neither a known bias nor Elo's asymmetric weighting.</summary>
    public int CentredPersonalOverall { get; } = centredPersonalOverall;

    /// <summary>
    /// Rarity from <see cref="Games"/> alone: the people you play daily are commons, the people you
    /// barely see are rares, and somebody you have never faced is the rarest card in your book.
    ///
    /// The odd one out here, and deliberately so - it is a count rather than an estimate of how a
    /// matchup goes, so it carries no sampling error at all and needs neither a floor nor
    /// shrinkage nor a fallback.
    /// </summary>
    public int FrequencyOverall { get; } = frequencyOverall;

    /// <summary>
    /// B2: the ordinary overall, nudged by the centred record and by how much that record has
    /// earned. The only option that needs neither a minimum-games rule nor a decision about
    /// subjects the collector has never faced - both fall out of the reliability term.
    /// </summary>
    public int NudgedOverall { get; } = nudgedOverall;

    /// <summary>
    /// B4: the record <em>is</em> the rating, and the ordinary rating only stands in until there is
    /// a record to read. The weight ramps from nothing at zero games to everything at the trust
    /// threshold, so past that point the leaderboard has no say at all.
    ///
    /// The opposite stance to <see cref="NudgedOverall"/>: B2 calls the leaderboard the truth and
    /// the record a correction, this calls the record the truth and the leaderboard a placeholder.
    /// </summary>
    public int BlendedOverall { get; private set; } = blendedOverall;

    /// <summary>B5: the same construction as <see cref="BlendedOverall"/>, but reading the Elo-delta record instead of the goal-difference one. The two differ only in which metric they trust.</summary>
    public int BlendedDeltaOverall { get; private set; } = blendedDeltaOverall;

    /// <summary>B5 on the Elo-delta record <em>before</em> the per-book extent normalisation - the same construction on the shared scale. Carried so the two can be read side by side.</summary>
    public int SharedDeltaOverall { get; private set; } = sharedDeltaOverall;

    /// <summary>The scale factor the collector's own extent produced. 1 means their records already matched the shared width.</summary>
    public double ExtentFactorDelta { get; } = extentFactorDelta;

    /// <summary>
    /// Holds both blended options inside the range the collector's own pool can offer. See
    /// <c>HeadToHeadService.CapToOwnPool</c> for why the ceiling is a property of the book rather
    /// than of the scale.
    /// </summary>
    internal void Clamp(int floor, int ceiling)
    {
        BlendedOverall = Math.Clamp(BlendedOverall, floor, ceiling);
        BlendedDeltaOverall = Math.Clamp(BlendedDeltaOverall, floor, ceiling);
    }

    /// <summary>
    /// Shifts both blended options by a constant so that this collector's book has the median the
    /// scale was aimed at.
    ///
    /// A second correction stacked on the centring, and it exists because the two answer different
    /// questions. Centring puts the median <em>record</em> at zero, which puts the middle anchor
    /// where a level matchup prints. The median <em>card</em> is a different quantity: most of a
    /// book is thin pairs blended back toward their ordinary ratings, and the people a collector
    /// rarely plays are the rarely-playing people - lower rated than the roster average - so the
    /// blended half drags the book's middle below where the record's middle sits.
    ///
    /// Applied last, after clamping, so the shift is in overall points rather than in record units.
    /// </summary>
    internal void Pin(int scoreShift, int deltaShift, int floor, int cap)
    {
        BlendedOverall = Math.Clamp(BlendedOverall + scoreShift, floor, cap);
        BlendedDeltaOverall = Math.Clamp(BlendedDeltaOverall + deltaShift, floor, cap);
    }

    /// <summary>
    /// One readable line, the way <c>api/packs?compact=true</c> and
    /// <c>player/champion-history</c> answer. Off the model so the two shapes cannot drift.
    ///
    /// Both metrics on one line on purpose: the question these rows exist to answer is which of
    /// them produces a book that reads true, and that is a comparison rather than a figure.
    /// </summary>
    public string Line() =>
        string.Format(
            CultureInfo.InvariantCulture,
            "{0,-18} {1,4}x   delta {2,7:+0.00;-0.00; 0.00} -> {3,2}   goals {4,6:+0.00;-0.00; 0.00} -> {5,2}   centred {6,6:+0.00;-0.00; 0.00} -> {7,2}   (was {8,2}){9}",
            SubjectName.Length <= 18 ? SubjectName : SubjectName[..18],
            Games,
            AverageDelta,
            PersonalOverall,
            AverageScoreDiff,
            ScorePersonalOverall,
            CentredScoreDiff,
            CentredPersonalOverall,
            GlobalOverall,
            SubjectActive ? "" : "  [icoon]");
}

/// <summary>
/// The distribution the anchors get fitted to.
///
/// Percentiles rather than a mean and a standard deviation, because the input is fat-tailed by
/// construction: the margin factor is linear and uncapped to 2.0, so one 10-0 carries a large
/// share of a short pair's average, and a normal summary would describe a shape the data does
/// not have.
/// </summary>
public class HeadToHeadSummary(
    int pairs,
    int pairsWithGames,
    int pairsWithoutGames,
    IReadOnlyDictionary<string, double> percentiles,
    IReadOnlyDictionary<string, IReadOnlyDictionary<string, double>> percentilesByFloor,
    IReadOnlyDictionary<string, double> variance,
    IReadOnlyList<string> extremes,
    IReadOnlyDictionary<string, int> pairsByGameCount,
    IReadOnlyDictionary<string, int> overallHistogram)
{
    /// <summary>Every (collector, subject) pair considered, met or not.</summary>
    public int Pairs { get; } = pairs;

    public int PairsWithGames { get; } = pairsWithGames;

    /// <summary>Pairs who have never played each other. These are the ones with no personal figure at all, and the reason a fallback has to be decided.</summary>
    public int PairsWithoutGames { get; } = pairsWithoutGames;

    /// <summary>Percentiles of <see cref="HeadToHeadRow.AverageDelta"/> over the pairs that have met.</summary>
    public IReadOnlyDictionary<string, double> Percentiles { get; } = percentiles;

    /// <summary>
    /// The same percentiles, recomputed over pairs at or above each of several game counts.
    ///
    /// This is the table that answers whether a sample floor is needed, and it answers it without
    /// imposing one: if the band narrows sharply as the floor rises, then the width of the
    /// unfiltered distribution is an artefact of pairs who met once, and anchors fitted to it
    /// would be fitted to noise.
    /// </summary>
    public IReadOnlyDictionary<string, IReadOnlyDictionary<string, double>> PercentilesByFloor { get; } = percentilesByFloor;

    /// <summary>
    /// The variance decomposition, which is the one figure that says whether the volume is
    /// possible: how much of the difference between pairs is a real matchup and how much is the
    /// noise of one game. A signal standard deviation at or below zero means there is nothing to
    /// build a scale on. See <c>HeadToHeadService.Decompose</c>.
    /// </summary>
    public IReadOnlyDictionary<string, double> Variance { get; } = variance;

    /// <summary>The most extreme pairs at each end, as lines. What an absent sample floor actually costs, in names.</summary>
    public IReadOnlyList<string> Extremes { get; } = extremes;

    /// <summary>How many pairs sit in each game-count band, which is what a sample floor would cut.</summary>
    public IReadOnlyDictionary<string, int> PairsByGameCount { get; } = pairsByGameCount;

    /// <summary>How the candidate scale spreads those pairs over 40-99, in bands of five. A scale that works fills it; one that does not piles up in one band.</summary>
    public IReadOnlyDictionary<string, int> OverallHistogram { get; } = overallHistogram;
}
