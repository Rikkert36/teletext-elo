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

    public byte[] ReadAvatarOrFallback(string id)
    {
        var path = AvatarPath(id);
        if (path == null || !File.Exists(path)) path = FallbackAvatarPath;
        return File.ReadAllBytes(path);
    }

    public void EnsureDirectories()
    {
        Directory.CreateDirectory(AvatarDirectory);
        Directory.CreateDirectory(SilhouetteDirectory);
    }
}
