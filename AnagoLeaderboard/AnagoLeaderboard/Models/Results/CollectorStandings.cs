namespace AnagoLeaderboard.Models.Results;

/// <summary>
/// How far every active collector is with their album, and how often each of them packed each card.
/// </summary>
/// <param name="Actives">Volume I's cards, rarest first; every count list on a standing follows this order.</param>
/// <param name="Icons">The icons book's cards, rarest first.</param>
/// <param name="Collectors">Icon collectors first, then everyone else, best first within each.</param>
public sealed record CollectorStandings(
    IReadOnlyList<CardSubject> Actives,
    IReadOnlyList<CardSubject> Icons,
    IReadOnlyList<CollectorStanding> Collectors);

/// <param name="Rank">Shared by collectors whose books are worth exactly the same.</param>
/// <param name="VolumeOnePercent">Book value of volume I, weighted 1/p per card, rounded down.</param>
/// <param name="WithIconsPercent">Volume I and the icons book together; null until the icons are unlocked.</param>
/// <param name="Missing">Subject ids of the empty slots, rarest first, volume I before icons.</param>
/// <param name="ActiveCounts">Player copies per card in <see cref="CollectorStandings.Actives"/>.</param>
/// <param name="IconCounts">Icon copies per card in <see cref="CollectorStandings.Icons"/>; null until unlocked.</param>
public sealed record CollectorStanding(
    string PlayerId,
    string Name,
    int Rank,
    bool IconsUnlocked,
    int VolumeOnePercent,
    int? WithIconsPercent,
    IReadOnlyList<string> Missing,
    IReadOnlyList<int> ActiveCounts,
    IReadOnlyList<int>? IconCounts);
