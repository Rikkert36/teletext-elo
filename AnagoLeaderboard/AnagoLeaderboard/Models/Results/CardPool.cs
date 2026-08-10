namespace AnagoLeaderboard.Models.Results;

/// <summary>
/// Everything a pack can contain, and everything the album has a slot for.
///
/// Both lists are sent together rather than split across endpoints because the album is
/// one book: legends are extra pages appended to it once unlocked, not a separate view, so
/// a client that had to wait on two responses could not draw the book until both arrived.
/// </summary>
/// <param name="Legends">
/// Inactive players over the games gate, rated on their all-time high. They are only
/// drawable by collectors who have completed the active set, but the set itself is not a
/// secret - what is unlocked is whether they appear in your packs and your book.
/// </param>
public sealed record CardPool(
    int MinGames,
    IReadOnlyList<CardSubject> Actives,
    IReadOnlyList<CardSubject> Legends);
