namespace AnagoLeaderboard.Models.Results;

/// <summary>
/// The leathers an album can be bound in.
///
/// One product line in ten dyes: the brass edge and the gold foil are the same on all
/// of them, and only the stain changes. Ids are English and the Dutch labels live in the
/// frontend, where they are UI copy.
///
/// This is a table rather than an enum because the value is persisted as a string -
/// EF maps a C# enum to an int, which would silently turn the JSON contract into a
/// number - and because both the create endpoint and a later re-bind endpoint have to
/// validate against exactly the same set. One list, one <see cref="IsKnown"/>.
///
/// The order here does not matter and is not the shelf: the books are laid out in the
/// order of COVERS in albumLeather.ts, which is what a reader actually sees. This list
/// only has to contain the same ten ids, and PlayerCollectionTests has a case per id so
/// that adding one on the frontend without adding it here fails a test rather than a
/// user's first click.
///
/// "oxblood" changed meaning once, and that is the one thing to know before reading old
/// data: it used to be the tobacco brown, which is now "tobacco", and the id was freed
/// for an actual oxblood. RenameOxbloodCoverToTobacco repoints the rows. A Cover of
/// "oxblood" written before that migration means brown; after it, dark red.
/// </summary>
public static class AlbumCovers
{
    /// <summary>
    /// The stain a book gets when nobody has said otherwise. Kept equal to the id
    /// LockedAlbum paints the padlocked book in, so the album behind the gate is the one
    /// a player would actually be handed.
    /// </summary>
    public const string Default = "tobacco";

    public static readonly IReadOnlyList<string> All = new[]
    {
        "tobacco",
        "tan",
        "oxblood",
        "claret",
        "aubergine",
        "olive",
        "forest",
        "petrol",
        "navy",
        "charcoal"
    };

    public static bool IsKnown(string? cover) => cover is not null && All.Contains(cover);
}
