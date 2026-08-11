namespace AnagoLeaderboard.Models.Results;

/// <summary>
/// The whole collection page in one response.
///
/// Deliberately not split into collection / pool / legends routes. The book is one object -
/// the album builds its sections from the pool, the legends and the owned counts together
/// and then walks the result in printed order, so three routes would mean either a book
/// that cannot draw until all three land, or one that draws and then grows a section,
/// shifting every card index behind it underneath an open card viewer.
///
/// It ships cards you do not own, because the album is mostly silhouettes and that is the
/// feature. So this carries the set, not just your part of it.
/// </summary>
/// <param name="Album">
/// Null until the player has fetched an album off the table, and the single flag the UI
/// branches on to decide between the opening sequence and the book. Everything else on this
/// record is populated either way, so "no collection yet" never has to be inferred from a
/// status code - which would collide with an unknown player.
/// </param>
/// <param name="Eligible">
/// Whether this player is over the games gate. False still returns a full response: the page
/// needs <see cref="NumberOfGames"/> and <see cref="MinGames"/> to say how far off they are.
/// </param>
/// <param name="NumberOfGames">
/// From the leaderboard replay, not from Player.NumberOfGames. The stored counter and the
/// replayed one can disagree, and pool membership is decided by the replayed one - reading
/// the column here would let this report someone eligible who is absent from
/// <see cref="Pool"/>.
/// </param>
/// <param name="Owned">
/// Counts, not card objects: a card is live and wholly derivable from its pool entry, and
/// the page only builds a lookup from this anyway, so embedding the player twice would just
/// invite the two copies to drift.
///
/// Always empty for now - owned cards need the CardInstance table, which arrives with the
/// claim endpoint.
/// </param>
/// <param name="Packs">
/// Always empty for now. Packs are derived from today's games minus a claim table rather
/// than granted, and neither half of that exists yet.
/// </param>
public sealed record CollectionState(
    string PlayerId,
    AlbumBinding? Album,
    bool Eligible,
    int NumberOfGames,
    int MinGames,
    IReadOnlyList<OwnedCard> Owned,
    IReadOnlyList<AvailablePack> Packs,
    bool LegendsUnlocked,
    IReadOnlyList<CardSubject> Pool,
    IReadOnlyList<CardSubject> Legends);

/// <summary>
/// The album as a physical object, and nothing else.
///
/// Only the binding lives here. The collection's contents - owned, packs, the legends latch
/// - stay on the root of <see cref="CollectionState"/>, so a non-null Album means exactly
/// one thing ("this player has an album") rather than becoming a second nested bag of state
/// that can drift from the root.
/// </summary>
/// <param name="Cover">One of <see cref="AlbumCovers.All"/>.</param>
public sealed record AlbumBinding(string Cover, DateTime CreatedAt);

/// <summary>How many copies of one player's card the collector holds.</summary>
public sealed record OwnedCard(string PlayerId, int Count);

/// <summary>
/// A pack waiting to be opened.
///
/// Here so the response shape does not change when PackService starts filling the list.
/// Ids are synthetic and stable - "game:{gameId}", "daily:{yyyy-MM-dd}" - because a derived
/// pack has no row to take an id from, and the packet pile's tilt and sheen are seeded from
/// the id so it must survive a refetch.
/// </summary>
public sealed record AvailablePack(
    string Id,
    int Size,
    string Reason,
    IReadOnlyList<string> DoubledPlayerIds);
