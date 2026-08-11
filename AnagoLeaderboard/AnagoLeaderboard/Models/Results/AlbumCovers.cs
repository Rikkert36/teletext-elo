namespace AnagoLeaderboard.Models.Results;

/// <summary>
/// The leathers an album can be bound in.
///
/// One product line in five dyes: the brass edge and the gold foil are the same on all
/// of them, and only the stain changes. Ids are English and the Dutch labels live in the
/// frontend, where they are UI copy.
///
/// This is a table rather than an enum because the value is persisted as a string -
/// EF maps a C# enum to an int, which would silently turn the JSON contract into a
/// number - and because both the create endpoint and a later re-bind endpoint have to
/// validate against exactly the same set. One list, one <see cref="IsKnown"/>.
/// </summary>
public static class AlbumCovers
{
    /// <summary>The stain a book gets when nobody has said otherwise.</summary>
    public const string Default = "oxblood";

    public static readonly IReadOnlyList<string> All = new[]
    {
        "oxblood",
        "forest",
        "navy",
        "tan",
        "charcoal"
    };

    public static bool IsKnown(string? cover) => cover is not null && All.Contains(cover);
}
