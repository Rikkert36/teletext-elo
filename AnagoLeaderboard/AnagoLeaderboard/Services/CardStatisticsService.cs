using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models.Results;
using Microsoft.EntityFrameworkCore;

namespace AnagoLeaderboard.Services;

/// <summary>
/// How often each card has actually been packed, across every collector.
///
/// Its own service rather than a method on one of the two it sits between, because both of
/// those have a stated boundary this would cross. <see cref="CardPoolService"/> "knows nothing
/// about collections or packs - it is the set, not anyone's state over it", and counting minted
/// rows is exactly that state. <see cref="PackService"/> owns the rows but is deliberately
/// handed its roster rather than replaying for one, so giving it a leaderboard to build this
/// would undo the reason it has none.
///
/// It reads and counts, and writes nothing. Note what it does <em>not</em> do: it never
/// compares an observed tally against the odds the card was drawn at. A card's expected share
/// is not a property of the card - it depends on the pool as it stood at each draw, on who was
/// doubled in that pack, on any gift floor, on whether that collector had the icons unlocked,
/// and on the draw being without replacement. A single "expected %" column would have to
/// ignore all five, and a number that looks authoritative and is quietly wrong is worse here
/// than no number, because the thing it would be used for is re-tuning the rating scale.
/// </summary>
public class CardStatisticsService
{
    private readonly DatabaseContext _dbContext;
    private readonly LeaderBoardService _leaderBoardService;
    private readonly CardPoolService _cardPoolService;

    public CardStatisticsService(
        DatabaseContext dbContext,
        LeaderBoardService leaderBoardService,
        CardPoolService cardPoolService)
    {
        _dbContext = dbContext;
        _leaderBoardService = leaderBoardService;
        _cardPoolService = cardPoolService;
    }

    public async Task<CardStatistics> GetStatistics()
    {
        // One replay, handed to the pool service - the same arrangement CollectionService uses,
        // and for the same reason: the roster is needed here as well as the pool, and the replay
        // is O(all games) and uncached.
        var (players, _) = await _leaderBoardService.GetLeaderBoard();
        var pool = _cardPoolService.GetPool(players);

        var tallies = await _dbContext.CardInstances
            .GroupBy(card => card.SubjectPlayerId)
            .Select(group => new Tally(
                group.Key,
                group.Count(),
                group.Count(card => card.IsIcon),
                group.Select(card => card.PlayerId).Distinct().Count()))
            .ToListAsync();

        var totalCollectors = await _dbContext.CardInstances
            .Select(card => card.PlayerId)
            .Distinct()
            .CountAsync();

        var byId = tallies.ToDictionary(tally => tally.SubjectPlayerId);
        var inPool = pool.Actives.Concat(pool.Icons).ToList();
        var pooledIds = inPool.Select(subject => subject.Id).ToHashSet();

        var rows = inPool
            .Select(subject => Row(subject, inPool: true, byId.GetValueOrDefault(subject.Id)))
            .ToList();

        // Subjects with cards who are no longer in the pool. They are listed rather than
        // dropped, so the tallies still add up to TotalCards - see CardStatistic.InPool.
        //
        // A tally whose subject is absent from the replay is impossible rather than skipped:
        // a subject had to be in the pool to be drawn, which takes games, and deleting the
        // player cascades their cards away.
        rows.AddRange(players
            .Where(player => !pooledIds.Contains(player.Id) && byId.ContainsKey(player.Id))
            .Select(player => Row(_cardPoolService.SubjectFor(player), inPool: false, byId[player.Id])));

        return new CardStatistics(
            rows.Sum(row => row.TimesPacked),
            totalCollectors,
            // Commonest first, which is the order the question is asked in. Overall breaks the
            // tie because most of a young set is tied on nothing at all, and a column of zeroes
            // in rating order is still readable.
            rows
                .OrderByDescending(row => row.TimesPacked)
                .ThenByDescending(row => row.Subject.Overall)
                .ThenBy(row => row.Subject.Name)
                .ToList());
    }

    private static CardStatistic Row(CardSubject subject, bool inPool, Tally? tally) =>
        new(
            subject,
            inPool,
            tally?.TimesPacked ?? 0,
            tally?.MintedAsIcon ?? 0,
            tally?.Collectors ?? 0);

    /// <summary>
    /// One grouped row. A named type rather than an anonymous one only so it can be passed to
    /// <see cref="Row"/>; it never leaves this class.
    /// </summary>
    private sealed record Tally(string SubjectPlayerId, int TimesPacked, int MintedAsIcon, int Collectors);
}
