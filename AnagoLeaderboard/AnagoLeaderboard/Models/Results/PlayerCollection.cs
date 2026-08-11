namespace AnagoLeaderboard.Models.Results;

/// <summary>
/// That a player has a collection at all, and what their album looks like.
///
/// The row's <em>existence</em> is the load-bearing part: no row means the collection has
/// never been started, which is what puts the player through the opening sequence instead
/// of dropping them onto an album that was simply always there. So this is deliberately
/// not created lazily on first read - see <see cref="Services.CollectionService"/>.
///
/// Shares its primary key with <see cref="Player"/>. Unlike the legacy Game-to-Player
/// shape, which carries bare id strings and no foreign keys at all, this one has a real FK
/// with a cascade: a player is only ever deleted when they were created by accident, and
/// leaving their album behind would leave a row pointing at nobody.
/// </summary>
public class PlayerCollection
{
    /// <summary>Primary key and foreign key both - one album per player.</summary>
    public required string PlayerId { get; set; }

    /// <summary>
    /// One of <see cref="AlbumCovers.All"/>.
    ///
    /// An ordinary settable property on purpose. It is chosen once today, in the opening
    /// sequence, but that is a decision about which endpoints exist rather than about the
    /// shape of the data - a later re-bind is a write to this column and nothing more, so
    /// there is no write-once guard here to unpick when it arrives.
    /// </summary>
    public required string Cover { get; set; }

    /// <summary>
    /// When the album was fetched off the table. Local time, like every other timestamp in
    /// this codebase, and like the server-local day the pack window will be measured in.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// When the active set was completed, or null while it has not been.
    ///
    /// A permanent latch rather than a recomputed flag: once you have finished the set you
    /// keep the legends, so a new joiner or somebody crossing the games gate afterwards
    /// cannot un-complete it. Written by <see cref="Services.PackService.Claim"/> when a
    /// claim completes the active set, and by hand from the development-only legends route.
    /// </summary>
    public DateTime? LegendsUnlockedAt { get; set; }

    public static PlayerCollection Create(string playerId, string cover) =>
        new()
        {
            PlayerId = playerId,
            Cover = cover,
            CreatedAt = DateTime.Now,
            LegendsUnlockedAt = null
        };
}
