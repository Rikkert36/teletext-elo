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
            .Select(player => ToSubject(player, player.VisibleRating, isIcon: false))
            .ToList();

        // Rated on the all-time high, which is the whole point of an icoon: it says who
        // someone was, not what their form decayed to before they stopped playing. It also
        // spreads them across the tiers - somebody who managed ten games and peaked at 780
        // is an icoon in silver, and a gold card would lie about them.
        var icons = eligible
            .Where(player => !player.Active)
            .Select(player => ToSubject(player, player.PeakVisibleRating, isIcon: true))
            .ToList();

        return new CardPool(minGames, Ordered(actives), Ordered(icons));
    }

    /// <summary>
    /// Whether a collector holds the whole active set - the thing that earns the icons.
    ///
    /// <strong>Actives only.</strong> The icons are the reward for finishing that set, so
    /// counting them here would let the reward dilute the thing it is awarded for, and a set
    /// that grows every time you win would never close.
    ///
    /// An empty roster is deliberately <em>not</em> complete. Vacuous truth would hand the
    /// icons to the first person to open a packet on a database with nobody over the games
    /// gate, which is exactly the state a fresh install and every test fixture start in.
    ///
    /// Lives here, next to the code that decides who is an active and who is an icoon,
    /// rather than inside the claim that used to apply it. Its old home is what made the
    /// unlock a side effect of opening a pack.
    /// </summary>
    public static bool ActiveSetComplete(CardPool pool, IReadOnlyDictionary<string, int> counts) =>
        pool.Actives.Count > 0
        && pool.Actives.All(active => counts.GetValueOrDefault(active.Id) > 0);

    private CardSubject ToSubject(DynamicRatingPlayer player, int visibleRating, bool isIcon) =>
        new(
            player.Id,
            player.Name,
            visibleRating,
            _cardRatingCalculator.OverallFor(visibleRating),
            player.NumberOfGames,
            isIcon);

    /// <summary>
    /// Best first. The album sorts into its own printed order regardless, but an unordered
    /// list would make every other consumer - the odds table, a debug dump - invent one.
    /// </summary>
    private static IReadOnlyList<CardSubject> Ordered(IEnumerable<CardSubject> subjects) =>
        subjects.OrderByDescending(subject => subject.VisibleRating).ToList();
}
