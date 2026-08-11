using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models.Results;
using Microsoft.EntityFrameworkCore;

namespace AnagoLeaderboard.Services;

/// <summary>
/// What packs a player has waiting, and what comes out of one when they open it.
///
/// **Packs are derived, not granted.** Nothing writes a pack into existence; what is
/// available is computed on read:
///
/// <code>
/// available(player, today) = games today the player took part in  minus  PackClaim rows
///                          + the daily freebie                    minus  a daily claim
/// </code>
///
/// That is worth four things, three of which are gaps a granting design had accepted in
/// writing. <c>CreateGame</c> has no hook, so "cards must never break game submission" stops
/// being a rule and becomes a fact. Editing a game's score re-sizes its unclaimed packs and
/// leaves its claimed ones alone, both for free. Deleting a game takes its unclaimed packs with
/// it with no cascade rule at all - they simply stop being derived. And hard same-day expiry
/// needs no job and no read filter, because "today's games" *is* the window.
///
/// The way to break all of that again is to reintroduce a write into <c>CreateGame</c>. Don't.
/// </summary>
public class PackService
{
    /// <summary>
    /// Pack ids are synthetic, because a derived pack has no row to take an id from.
    ///
    /// Stable across refetches by construction, which the shelf needs: each packet's tilt and
    /// sheen are seeded from its id, so an id that changed between reads would make the pile
    /// visibly reshuffle itself.
    ///
    /// All four participants of a game see the same id. It names the pack, not the claim - the
    /// owner comes from the player in the route - which is why claiming needs a player id in
    /// the path at all.
    /// </summary>
    private const string GamePrefix = "game:";

    private const string DailyPrefix = "daily:";

    /// <summary>
    /// Em dash, escaped rather than typed: every other .cs file in this project is pure ASCII
    /// outside its comments, and a string literal that has to survive the compiler guessing at
    /// an encoding is not worth the risk for one punctuation mark.
    /// </summary>
    private const string Dash = "\u2014";

    /// <summary>
    /// Beating the expected margin by this much earns the +2, and doubles both opponents'
    /// tickets.
    ///
    /// Expressed in margins rather than scores so it is symmetric: expected -6 and actual -3
    /// earns it too, which rewards a good loss.
    /// </summary>
    private const int MarginBonusThreshold = 3;

    private readonly DatabaseContext _dbContext;
    private readonly LeaderBoardService _leaderBoardService;
    private readonly CardPoolService _cardPoolService;
    private readonly CardRatingCalculator _cardRatingCalculator;

    public PackService(
        DatabaseContext dbContext,
        LeaderBoardService leaderBoardService,
        CardPoolService cardPoolService,
        CardRatingCalculator cardRatingCalculator)
    {
        _dbContext = dbContext;
        _leaderBoardService = leaderBoardService;
        _cardPoolService = cardPoolService;
        _cardRatingCalculator = cardRatingCalculator;
    }

    /// <summary>
    /// Everything this player could open right now.
    /// </summary>
    /// <param name="allGames">
    /// The games as the leaderboard replay handed them back, <em>not</em> a fresh query.
    /// <see cref="PlayerPerformance.OldRating"/> is assigned during that replay rather than read
    /// off the row, so a game fetched straight out of the table reports every old rating as 0
    /// and sizes every pack wrongly.
    /// </param>
    public async Task<IReadOnlyList<AvailablePack>> GetAvailable(
        string playerId,
        IReadOnlyList<Game> allGames)
    {
        var today = DateTime.Now.Date;

        var claimsToday = await _dbContext.PackClaims
            .Where(claim => claim.PlayerId == playerId && claim.ClaimDate == today)
            .ToListAsync();

        return Derive(playerId, allGames, claimsToday, today);
    }

    /// <summary>
    /// The derivation itself, with everything it reads passed in. Pure, and so the piece the
    /// tests drive.
    /// </summary>
    public static IReadOnlyList<AvailablePack> Derive(
        string playerId,
        IReadOnlyList<Game> allGames,
        IReadOnlyList<PackClaim> claims,
        DateTime today)
    {
        // Both lists are narrowed to the day here rather than trusted to arrive narrowed. The
        // window is the whole of the expiry rule, so it belongs with the rule, not with whoever
        // happened to run the query.
        var claimsToday = claims.Where(claim => claim.ClaimDate == today.Date).ToList();

        var claimedGameIds = claimsToday
            .Where(claim => claim.Source == PackSource.Game)
            .Select(claim => claim.GameId)
            .ToHashSet();

        var packs = allGames
            .Where(game => game.CreatedAt.Date == today.Date)
            .Where(game => game.GetPlayerIds().Contains(playerId))
            .Where(game => !claimedGameIds.Contains(game.Id))
            .OrderByDescending(game => game.CreatedAt)
            .Select(game => PackForGame(game, playerId))
            .ToList();

        // Last, under the game packs. It is the smallest and the one that is always there, so
        // it is the bottom of the pile rather than the top of it.
        if (!claimsToday.Any(claim => claim.Source == PackSource.Daily))
        {
            packs.Add(DailyPack(today));
        }

        return packs;
    }

    /// <summary>
    /// One player's pack for one game: 1 for playing, +2 for winning, +2 for beating the
    /// expected margin by three or more. So 1, 3 or 5.
    ///
    /// A pure function of the game row. <see cref="GameWithAnalytics"/> computes both margins
    /// from the four old ratings frozen on the row, so this needs no leaderboard replay of its
    /// own and cannot drift as ratings move.
    /// </summary>
    public static AvailablePack PackForGame(Game game, string playerId)
    {
        var analytics = new GameWithAnalytics(game);

        // Both are the first team's goal difference: expected, and what actually happened.
        var expectedMargin = 10 - analytics.ExpectedScore;
        var actualMargin = 10 - analytics.ActualScore;

        // Everything above is written from the first team's seat, so sign-flip for the second.
        if (game.SecondTeam.HasPlayer(playerId))
        {
            expectedMargin = -expectedMargin;
            actualMargin = -actualMargin;
        }

        var won = game.IsWonBy(playerId);
        var beatExpectation = actualMargin - expectedMargin >= MarginBonusThreshold;

        var team = game.GetTeam(playerId);
        var opponents = game.GetOtherTeam(playerId);
        var score = $"{team.Goals}-{opponents.Goals}";

        // Winning *or* beating the expected margin doubles both opponents' tickets. Flat 2x
        // even when both are true - a dominant win already pays five cards, and compounding to
        // 4x would let blowouts dominate collections. This is flavour, not an economy lever:
        // doubling 2 of 38 players shifts about 6% of the ticket mass.
        var doubled = won || beatExpectation
            ? new List<string> { opponents.FirstPlayer.PlayerId, opponents.SecondPlayer.PlayerId }
            : new List<string>();

        var reason = (won, beatExpectation) switch
        {
            (true, true) => $"gewonnen {Dash} {score} tegen de verwachting in",
            (true, false) => $"gewonnen {Dash} {score}",
            (false, true) => $"tegen de verwachting in {Dash} {score}",
            (false, false) => $"gespeeld {Dash} {score}"
        };

        return new AvailablePack(
            GamePrefix + game.Id,
            1 + (won ? 2 : 0) + (beatExpectation ? 2 : 0),
            reason,
            doubled);
    }

    /// <summary>One free single a day, for turning up.</summary>
    public static AvailablePack DailyPack(DateTime day) =>
        new(
            DailyPrefix + day.ToString("yyyy-MM-dd"),
            1,
            "dagelijks pakje",
            Array.Empty<string>());

    /// <summary>
    /// Opens a pack: files the cards and reports what was in it.
    ///
    /// Rolled here rather than when the pack was earned. A pack belongs to a player, so this
    /// credits that player whoever clicked it - the cards cannot be stolen either way - which
    /// means rolling late costs nothing in safety and avoids minting rows for packs that expire
    /// unopened. Within a same-day window ratings cannot drift meaningfully in between.
    /// </summary>
    public async Task<ClaimResult> Claim(string playerId, string packId)
    {
        if (!await _dbContext.Players.AnyAsync(player => player.Id == playerId))
        {
            return new ClaimResult(ClaimOutcome.PlayerNotFound, null);
        }

        var collection = await _dbContext.PlayerCollections
            .SingleOrDefaultAsync(c => c.PlayerId == playerId);

        // There has to be a book to file them in. The row's existence is what says a collection
        // was ever started, so minting cards without one would leave them nowhere.
        if (collection is null)
        {
            return new ClaimResult(ClaimOutcome.NoAlbum, null);
        }

        var (players, allGames) = await _leaderBoardService.GetLeaderBoard();
        var pool = _cardPoolService.GetPool(players);

        var rated = players.SingleOrDefault(player => player.Id == playerId);
        if ((rated?.NumberOfGames ?? 0) < _cardRatingCalculator.MinGames)
        {
            return new ClaimResult(ClaimOutcome.NotEligible, null);
        }

        var today = DateTime.Now.Date;
        var claimsToday = await _dbContext.PackClaims
            .Where(claim => claim.PlayerId == playerId && claim.ClaimDate == today)
            .ToListAsync();

        // Deriving again rather than trusting the id is the whole of the authorisation: an id
        // that is not on this list is somebody else's game, yesterday's pack, one already
        // opened, or invented.
        var pack = Derive(playerId, allGames, claimsToday, today)
            .SingleOrDefault(available => available.Id == packId);

        if (pack is null)
        {
            return new ClaimResult(ClaimOutcome.NotAvailable, null);
        }

        var gameId = pack.Id.StartsWith(GamePrefix, StringComparison.Ordinal)
            ? pack.Id[GamePrefix.Length..]
            : null;

        await using var transaction = await _dbContext.Database.BeginTransactionAsync();

        var claim = gameId is null
            ? PackClaim.ForDaily(playerId, today)
            : PackClaim.ForGame(playerId, gameId, today);

        _dbContext.PackClaims.Add(claim);

        try
        {
            // Alone, and before anything is rolled. The unique indexes on PackClaim are the
            // double-claim guard, so this insert failing *is* the 409 - two tabs racing means
            // one of them lands here.
            await _dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            _dbContext.Entry(claim).State = EntityState.Detached;
            await transaction.RollbackAsync();
            return new ClaimResult(ClaimOutcome.AlreadyClaimed, null);
        }

        var counts = await CountsBySubject(playerId);
        var legendsUnlocked = collection.LegendsUnlockedAt is not null;

        var revealed = new List<RevealedCard>();

        foreach (var subject in Roll(
                     _cardRatingCalculator, pool, pack.Size, pack.DoubledPlayerIds, legendsUnlocked))
        {
            // Read before incrementing. This is the only point at which "did this fill an empty
            // slot" can still be answered.
            var before = counts.GetValueOrDefault(subject.Id);
            counts[subject.Id] = before + 1;

            _dbContext.CardInstances.Add(
                CardInstance.Mint(playerId, subject.Id, claim.Id, gameId, subject.IsLegend));

            revealed.Add(new RevealedCard(subject, before == 0, before + 1));
        }

        // A permanent latch, not a recomputed flag: finishing the active set keeps the legends
        // forever, so a new joiner or somebody crossing the games gate afterwards cannot
        // un-complete it. Actives only - legends are the reward for finishing that set, so they
        // must not dilute the thing they are awarded for.
        if (collection.LegendsUnlockedAt is null
            && pool.Actives.Count > 0
            && pool.Actives.All(active => counts.GetValueOrDefault(active.Id) > 0))
        {
            collection.LegendsUnlockedAt = DateTime.Now;
        }

        await _dbContext.SaveChangesAsync();
        await transaction.CommitAsync();

        return new ClaimResult(ClaimOutcome.Claimed, revealed);
    }

    /// <summary>How many of each subject this player holds.</summary>
    public async Task<Dictionary<string, int>> CountsBySubject(string playerId) =>
        await _dbContext.CardInstances
            .Where(card => card.PlayerId == playerId)
            .GroupBy(card => card.SubjectPlayerId)
            .Select(group => new { SubjectPlayerId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(row => row.SubjectPlayerId, row => row.Count);

    /// <summary>
    /// The draw: a weighted raffle without replacement.
    ///
    /// Every card in every pack comes off these odds - packs are never tier-guaranteed, and the
    /// only choice a pack makes is its size. Tier-slot odds in the FIFA style would invert here
    /// anyway, because the tier populations are a diamond rather than a pyramid: a 30% bronze
    /// slot split over four players makes each of them commoner than any gold.
    ///
    /// Each player holds <c>2^-E</c> tickets from <see cref="CardRatingCalculator.TicketsFor"/>,
    /// and nobody appears twice in one pack - successive sampling, redrawing proportional to
    /// the tickets that are left, which is <em>not</em> the same as drawing k independently and
    /// dropping the duplicates.
    /// </summary>
    public static IReadOnlyList<CardSubject> Roll(
        CardRatingCalculator cardRatingCalculator,
        CardPool pool,
        int size,
        IReadOnlyList<string> doubledPlayerIds,
        bool legendsUnlocked,
        Random? random = null)
    {
        random ??= Random.Shared;

        // Legends join the same pool with no special rarity; their all-time-high overalls are
        // high, so the curve makes them rare on its own.
        var candidates = pool.Actives
            .Concat(legendsUnlocked ? pool.Legends : Array.Empty<CardSubject>())
            .Select(subject => new
            {
                Subject = subject,
                Tickets = cardRatingCalculator.TicketsFor(subject.Overall)
                          * (doubledPlayerIds.Contains(subject.Id) ? 2 : 1)
            })
            .ToList();

        var drawn = new List<CardSubject>();

        // Guarded rather than assumed: 38 candidates against a pack of 5 makes this theoretical,
        // but a pool smaller than the pack size would otherwise loop forever.
        while (drawn.Count < size && candidates.Count > 0)
        {
            var total = candidates.Sum(candidate => candidate.Tickets);
            var roll = random.NextDouble() * total;

            var index = 0;
            for (; index < candidates.Count - 1; index++)
            {
                roll -= candidates[index].Tickets;
                if (roll <= 0) break;
            }

            drawn.Add(candidates[index].Subject);
            candidates.RemoveAt(index);
        }

        return drawn;
    }
}

public enum ClaimOutcome
{
    Claimed,
    PlayerNotFound,
    NoAlbum,
    NotEligible,

    /// <summary>Unknown id, someone else's game, yesterday's pack, or one already opened.</summary>
    NotAvailable,

    /// <summary>Two tabs raced and this one lost the unique index.</summary>
    AlreadyClaimed
}

public sealed record ClaimResult(ClaimOutcome Outcome, IReadOnlyList<RevealedCard>? Cards);
