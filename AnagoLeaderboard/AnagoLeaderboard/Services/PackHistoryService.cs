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

        var claims = await _dbContext.PackClaims
            .OrderByDescending(claim => claim.ClaimedAt)
            .ToListAsync();

        // Every card, grouped in memory rather than a query per claim. The whole table is coming
        // back either way - there is no paging on this route - so N+1 round trips would buy
        // nothing.
        var cardsByClaim = (await _dbContext.CardInstances.ToListAsync())
            .GroupBy(card => card.PackClaimId)
            .ToDictionary(group => group.Key, group => group.ToList());

        var packs = claims
            .Select(claim => new OpenedPack(
                claim.Id,
                claim.ClaimedAt,
                claim.PlayerId,
                names.GetValueOrDefault(claim.PlayerId, claim.PlayerId),
                claim.Source.ToString(),
                claim.GameId,
                claim.GiftId,
                Cards(cardsByClaim.GetValueOrDefault(claim.Id), subjects)))
            .ToList();

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
    /// </summary>
    private static IReadOnlyList<PackedCard> Cards(
        List<CardInstance>? cards,
        IReadOnlyDictionary<string, CardSubject> subjects) =>
        (cards ?? new List<CardInstance>())
        .Select(card => new PackedCard(subjects[card.SubjectPlayerId], card.IsIcon))
        .OrderByDescending(card => card.Subject.Overall)
        .ThenBy(card => card.Subject.Name)
        .ToList();
}
