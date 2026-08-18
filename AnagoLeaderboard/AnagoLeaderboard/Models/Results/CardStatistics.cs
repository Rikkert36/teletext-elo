namespace AnagoLeaderboard.Models.Results;

/// <summary>
/// How often each card has actually come out of a packet, across every collector.
///
/// A record of what the raffle did, not of what it is meant to do. The odds a card is drawn
/// at are a property of <see cref="Services.CardRatingCalculator.TicketsFor"/> and of the pool
/// it was drawn from at the time; this counts rows. The two are worth comparing by eye and
/// deliberately not compared here - see <see cref="Services.CardStatisticsService"/>.
/// </summary>
/// <param name="TotalCards">
/// Every <see cref="CardInstance"/> row there is. The denominator for a card's share, left to
/// the caller to divide out rather than sent per row.
/// </param>
/// <param name="TotalCollectors">
/// How many players hold at least one card. Not the number of albums: a player who has fetched
/// a book and never opened a packet is not counted, which is what makes this the figure a
/// per-card <see cref="CardStatistic.Collectors"/> can be read against.
/// </param>
public sealed record CardStatistics(
    int TotalCards,
    int TotalCollectors,
    IReadOnlyList<CardStatistic> Cards);

/// <summary>One subject's tally.</summary>
/// <param name="Subject">
/// The card as it looks now, off the live pool - so <see cref="CardSubject.IsIcon"/> here is
/// today's colourway rather than what any particular copy was minted as. That is the same rule
/// the album draws by, and <see cref="MintedAsIcon"/> is the column that answers the other
/// question.
/// </param>
/// <param name="InPool">
/// Whether a packet can still contain them. False is not a bug and does not imply zero cards: a
/// subject who was collectable when a game they played in got deleted can fall back under the
/// games gate while the cards minted of them stay in other people's books. Dropping those rows
/// would leave the tallies not adding up to <see cref="CardStatistics.TotalCards"/>, so they are
/// listed and flagged instead.
/// </param>
/// <param name="TimesPacked">Copies minted, duplicates included.</param>
/// <param name="MintedAsIcon">
/// How many of those were drawn as an icoon, off <see cref="CardInstance.IsIcon"/>. History, and
/// the only place it is read: a subject can have copies of both kinds, minted either side of the
/// day they went out of service.
/// </param>
/// <param name="Collectors">How many different players hold at least one copy.</param>
public sealed record CardStatistic(
    CardSubject Subject,
    bool InPool,
    int TimesPacked,
    int MintedAsIcon,
    int Collectors);
