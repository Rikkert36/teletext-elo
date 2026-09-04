using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models.Results;
using Microsoft.EntityFrameworkCore;

namespace AnagoLeaderboard.Services;

/// <summary>
/// Every pack that was opened, with the cards it minted, newest first.
///
/// Its own service for the same two reasons <see cref="CardStatisticsService"/> is one, which are
/// stated there in full: <see cref="CardPoolService"/> is the set rather than anyone's state over
/// it, and <see cref="PackService"/> owns the rows but is deliberately handed its roster instead
/// of replaying for one, so giving it a leaderboard would undo the reason it has none. Kept apart
/// from the statistics service as well, because grouping by claim and grouping by subject share
/// no work beyond the replay every GET on this API already pays for.
///
/// It reads and groups, and writes nothing.
/// </summary>
public class PackHistoryService
{
    private readonly DatabaseContext _dbContext;
    private readonly LeaderBoardService _leaderBoardService;
    private readonly CardPoolService _cardPoolService;

    public PackHistoryService(
        DatabaseContext dbContext,
        LeaderBoardService leaderBoardService,
        CardPoolService cardPoolService)
    {
        _dbContext = dbContext;
        _leaderBoardService = leaderBoardService;
        _cardPoolService = cardPoolService;
    }

    public async Task<PackHistory> GetHistory()
    {
        // One replay, and both things taken off it: the collector's name, and every card's
        // subject. The replay lists every player row there is - rated and unrated alike - so
        // these lookups are total over the roster, and a card whose subject or owner is missing
        // from it is impossible rather than skipped: deleting a player cascades their cards away.
        var (players, _) = await _leaderBoardService.GetLeaderBoard();
        var names = players.ToDictionary(player => player.Id, player => player.Name);
        var subjects = players.ToDictionary(player => player.Id, _cardPoolService.SubjectFor);

        // Oldest first here, and reversed at the end into the newest-first order the route
        // answers in. The star can only be decided by walking the log forwards: a copy is the
        // first of its slot exactly when nothing before it filled that slot, and "before" is not
        // a question a newest-first pass can answer. Tie-broken on the id, because two claims can
        // carry the same stamp - the daily and a game packet opened in the same minute - and
        // without it the two could swap places between runs and hand the star to a different one
        // of them each time.
        var claims = (await _dbContext.PackClaims.ToListAsync())
            .OrderBy(claim => claim.ClaimedAt)
            .ThenBy(claim => claim.Id, StringComparer.Ordinal)
            .ToList();

        // Every card, grouped in memory rather than a query per claim. The whole table is coming
        // back either way - there is no paging on this route - so N+1 round trips would buy
        // nothing.
        var cardsByClaim = (await _dbContext.CardInstances.ToListAsync())
            .GroupBy(card => card.PackClaimId)
            .ToDictionary(group => group.Key, group => group.ToList());

        // Every slot any collector has ever filled, in the order they filled them. One set for
        // the whole pass rather than a query per claim: the table is already in memory above, and
        // the answer for a claim depends on every claim before it anyway.
        var filled = new HashSet<(string Collector, string Subject, bool AsIcon)>();

        var packs = new List<OpenedPack>(claims.Count);

        foreach (var claim in claims)
        {
            packs.Add(new OpenedPack(
                claim.Id,
                claim.ClaimedAt,
                claim.PlayerId,
                names.GetValueOrDefault(claim.PlayerId, claim.PlayerId),
                claim.Source.ToString(),
                claim.GameId,
                claim.GiftId,
                Cards(claim.PlayerId, cardsByClaim.GetValueOrDefault(claim.Id), subjects, filled)));
        }

        packs.Reverse();

        return new PackHistory(
            packs.Count,
            packs.Sum(pack => pack.Cards.Count),
            packs);
    }

    /// <summary>
    /// A packet's contents, best card first - the pool's own order, so a reader can see what a
    /// packet was worth without sorting it themselves. Draw order is not available to sort by:
    /// every card in a packet is minted in one pass and shares a <see cref="CardInstance.MintedAt"/>
    /// to the tick.
    ///
    /// An empty list is not a state a claim can be in - a pack always contains at least one card -
    /// but it is what a claim whose cards were deleted by hand would show, and that is more useful
    /// than a missing row.
    ///
    /// <paramref name="filled"/> is the slots already taken and is added to as the packet is
    /// walked, so <see cref="PackedCard.FirstCopy"/> falls out of the set's own answer to "was
    /// this new". Marked <em>after</em> the sort rather than in draw order, which only matters for
    /// two identical copies in one packet: the star then lands on the one that is printed first,
    /// so the line reads as a star and a duplicate beside it rather than the other way round.
    /// Every card in a packet is minted in one pass and shares a tick, so there is no draw order
    /// to prefer instead.
    /// </summary>
    private static IReadOnlyList<PackedCard> Cards(
        string collectorId,
        List<CardInstance>? cards,
        IReadOnlyDictionary<string, CardSubject> subjects,
        HashSet<(string Collector, string Subject, bool AsIcon)> filled) =>
        (cards ?? new List<CardInstance>())
        .Select(card => (Subject: subjects[card.SubjectPlayerId], card.SubjectPlayerId, card.IsIcon))
        .OrderByDescending(card => card.Subject.Overall)
        .ThenBy(card => card.Subject.Name)
        .Select(card => new PackedCard(
            card.Subject,
            card.IsIcon,
            filled.Add((collectorId, card.SubjectPlayerId, card.IsIcon))))
        .ToList();
}
