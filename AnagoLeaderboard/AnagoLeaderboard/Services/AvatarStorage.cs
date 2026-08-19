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

    public string AvatarDirectory => Path.Combine(_basePath, "avatars");

    public string SilhouetteDirectory => Path.Combine(_basePath, "silhouettes");

    public string FallbackAvatarPath => Path.Combine(AvatarDirectory, "empty-avatar.jpg");

    /// The avatar file is named exactly after the id, with no extension.
    public string? AvatarPath(string id) =>
        SafeId.IsMatch(id) ? Path.Combine(AvatarDirectory, id) : null;

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
    /// </summary>
    public (string Path, DateTime LastModified, long Length) ResolveAvatar(string id)
    {
        var path = AvatarPath(id);
        var file = path == null ? null : new FileInfo(path);
        if (file == null || !file.Exists) file = new FileInfo(FallbackAvatarPath);

        return (file.FullName, file.LastWriteTimeUtc, file.Length);
    }

    /// For callers that need the bytes in hand. Prefer <see cref="ResolveAvatar"/> when
    /// the bytes are on their way to a response body.
    public byte[] ReadAvatarOrFallback(string id) => File.ReadAllBytes(ResolveAvatar(id).Path);

    public void EnsureDirectories()
    {
        Directory.CreateDirectory(AvatarDirectory);
        Directory.CreateDirectory(SilhouetteDirectory);
    }
}
