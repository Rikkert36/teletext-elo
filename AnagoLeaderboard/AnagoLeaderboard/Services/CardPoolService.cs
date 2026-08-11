using AnagoLeaderboard.Models.Results;

namespace AnagoLeaderboard.Services;

/// <summary>
/// Who is on a card, and what that card is worth.
///
/// The pool is the same for everybody, so this knows nothing about collections or packs -
/// it is the set, not anyone's state over it. The collection endpoint will call straight
/// into here rather than building its own list, so the two cannot disagree about who is
/// collectable.
/// </summary>
public class CardPoolService
{
    private readonly LeaderBoardService _leaderBoardService;
    private readonly CardRatingCalculator _cardRatingCalculator;

    public CardPoolService(LeaderBoardService leaderBoardService, CardRatingCalculator cardRatingCalculator)
    {
        _leaderBoardService = leaderBoardService;
        _cardRatingCalculator = cardRatingCalculator;
    }

    public async Task<CardPool> GetPool()
    {
        // One replay for both lists. It is O(all games), but that is already the cost of
        // every existing GET on this API.
        var (players, _) = await _leaderBoardService.GetLeaderBoard();

        return GetPool(players);
    }

    /// <summary>
    /// The pool from a roster that has already been replayed.
    ///
    /// The replay is not cached and costs O(all games), so a caller that needs the pool
    /// <em>and</em> something else off the leaderboard - the collection endpoint needs the
    /// picked player's game count, which is filtered out of the pool by definition - would
    /// otherwise pay for it twice on one request.
    /// </summary>
    public CardPool GetPool(IReadOnlyList<DynamicRatingPlayer> players)
    {
        var minGames = _cardRatingCalculator.MinGames;

        var eligible = players.Where(player => player.NumberOfGames >= minGames).ToList();

        var actives = eligible
            .Where(player => player.Active)
            .Select(player => ToSubject(player, player.VisibleRating, isLegend: false))
            .ToList();

        // Rated on the all-time high, which is the whole point of an icoon: it says who
        // someone was, not what their form decayed to before they stopped playing. It also
        // spreads them across the tiers - somebody who managed ten games and peaked at 780
        // is an icoon in silver, and a gold card would lie about them.
        var legends = eligible
            .Where(player => !player.Active)
            .Select(player => ToSubject(player, player.PeakVisibleRating, isLegend: true))
            .ToList();

        return new CardPool(minGames, Ordered(actives), Ordered(legends));
    }

    private CardSubject ToSubject(DynamicRatingPlayer player, int visibleRating, bool isLegend) =>
        new(
            player.Id,
            player.Name,
            visibleRating,
            _cardRatingCalculator.OverallFor(visibleRating),
            player.NumberOfGames,
            isLegend);

    /// <summary>
    /// Best first. The album sorts into its own printed order regardless, but an unordered
    /// list would make every other consumer - the odds table, a debug dump - invent one.
    /// </summary>
    private static IReadOnlyList<CardSubject> Ordered(IEnumerable<CardSubject> subjects) =>
        subjects.OrderByDescending(subject => subject.VisibleRating).ToList();
}
