using System.Text.RegularExpressions;

namespace AnagoLeaderboard.Services;

/// <summary>
/// The single place that decides where avatars and silhouettes live on disk.
///
/// Before this class, <see cref="PlayerService"/> wrote uploads to a hardcoded C:\ path
/// while reads went through FileSystem:BasePath, so an uploaded avatar landed in a
/// different directory from the one it was served out of. Everything now goes through
/// configuration, which also means the silhouette generator sees the same directory the
/// upload lands in.
/// </summary>
public class AvatarStorage
{
    /// Player ids are guids, but there may be legacy ones, so anything that could escape
    /// the directory is rejected. The id comes straight off the route and goes straight
    /// into a Path.Combine.
    private static readonly Regex SafeId = new(@"^[A-Za-z0-9._-]{1,128}$", RegexOptions.Compiled);

    private readonly string _basePath;

    public AvatarStorage(IConfiguration configuration)
    {
        _basePath = configuration.GetValue<string>("FileSystem:BasePath")
                    ?? throw new ArgumentNullException("FileSystem:BasePath not configured");
    }

    /// <summary>
    /// The sizes a resized copy of an avatar is kept at, shortest side in pixels.
    ///
    /// A closed list, because it is a list of *surfaces* rather than of numbers, and
    /// because an open one lets a caller fill the disk with sizes nothing asks for:
    ///
    ///   512  — every card. The photo is drawn with `object-fit: cover`, so a square
    ///          source is scaled to the card's height: 203px in the album, 336 for the
    ///          pack opener's hero. Also covers the leaderboard's 40px avatar and the
    ///          player page's 160px one, which is the point of them sharing this width —
    ///          one url means one download for someone who opens both pages.
    ///   1024 — the card viewer, where the card is 380×532 and the photo is the thing
    ///          being looked at. 4% under a true 2× for the largest viewer size, which
    ///          is not a difference anyone finds on a face behind a multiply tint.
    ///
    /// Adding a width is a deploy plus a backfill run (see tools/silhouette), never a
    /// deploy alone: nothing generates these on request.
    /// </summary>
    public static readonly int[] VariantWidths = { 512, 1024 };

    public string AvatarDirectory => Path.Combine(_basePath, "avatars");

    public string SilhouetteDirectory => Path.Combine(_basePath, "silhouettes");

    /// <summary>
    /// Where the copies of one width live: a sibling of `avatars`, not a subdirectory of
    /// it, because the generator treats every file in the avatar directory as a player.
    /// </summary>
    public string AvatarVariantDirectory(int width) => Path.Combine(_basePath, $"avatars-{width}");

    public string FallbackAvatarPath => Path.Combine(AvatarDirectory, "empty-avatar.jpg");

    /// The avatar file is named exactly after the id, with no extension.
    public string? AvatarPath(string id) =>
        SafeId.IsMatch(id) ? Path.Combine(AvatarDirectory, id) : null;

    /// A copy carries the same name as the original, in its own directory.
    public string? AvatarVariantPath(string id, int width) =>
        SafeId.IsMatch(id) ? Path.Combine(AvatarVariantDirectory(width), id) : null;

    /// <summary>
    /// The width a request is served at: the smallest allowed width that is at least what
    /// was asked for, or the largest there is.
    ///
    /// Snapped rather than rejected so a caller asking for 640 gets a sensible answer
    /// instead of an error, and snapped *up* so it never returns something softer than
    /// was asked for.
    /// </summary>
    public static int NearestVariantWidth(int requested)
    {
        foreach (var width in VariantWidths)
        {
            if (width >= requested) return width;
        }

        return VariantWidths[^1];
    }

    /// The mask does get an extension: it is always a PNG carrying alpha.
    public string? SilhouettePath(string id) =>
        SafeId.IsMatch(id) ? Path.Combine(SilhouetteDirectory, id + ".png") : null;

    /// <summary>
    /// The file a request for this id resolves to — the player's own photo, or the shared
    /// fallback when there is none — together with the metadata a conditional GET needs.
    ///
    /// Hands out a path rather than the bytes so a response can stream straight off disk.
    /// These are original camera uploads and the largest run to double-digit megabytes,
    /// which is well past the threshold where buffering one into a byte[] per request
    /// lands on the large object heap.
    ///
    /// <paramref name="width"/> asks for a resized copy, and is the caller saying how big
    /// it will draw the photo rather than which file it wants. **A copy is never
    /// guaranteed to exist**: they are written by the generator after an upload and by a
    /// backfill run, not on demand, and one is deliberately not written for a photo that
    /// is already smaller than the width asked for. Missing, stale or too-small all land
    /// on the original, which is correct in every case and merely slower in the first.
    /// </summary>
    public (string Path, DateTime LastModified, long Length) ResolveAvatar(string id, int? width = null)
    {
        var path = AvatarPath(id);
        var file = path == null ? null : new FileInfo(path);
        if (file == null || !file.Exists) file = new FileInfo(FallbackAvatarPath);

        if (width != null)
        {
            var variantPath = AvatarVariantPath(id, width.Value);
            var variant = variantPath == null ? null : new FileInfo(variantPath);

            // Older than the photo means it belongs to a photo that has been replaced —
            // the generator has run since, or is about to. Serving it would keep handing
            // out the previous face for as long as the copy sat there.
            if (variant != null && variant.Exists && variant.LastWriteTimeUtc >= file.LastWriteTimeUtc)
            {
                file = variant;
            }
        }

        return (file.FullName, file.LastWriteTimeUtc, file.Length);
    }

    /// For callers that need the bytes in hand. Prefer <see cref="ResolveAvatar"/> when
    /// the bytes are on their way to a response body.
    public byte[] ReadAvatarOrFallback(string id) => File.ReadAllBytes(ResolveAvatar(id).Path);

    public void EnsureDirectories()
    {
        Directory.CreateDirectory(AvatarDirectory);
        Directory.CreateDirectory(SilhouetteDirectory);

        foreach (var width in VariantWidths)
        {
            Directory.CreateDirectory(AvatarVariantDirectory(width));
        }
    }
}
