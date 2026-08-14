using System.ComponentModel;
using System.Diagnostics;

namespace AnagoLeaderboard.Services;

/// <summary>
/// Regenerates the silhouette mask for a single player, in a separate process.
///
/// Deliberately not in this process. Generating a mask needs a segmentation model
/// (ONNX Runtime) and an image decoder, both native, and under in-process IIS hosting
/// those would stay loaded in w3wp: their dlls are then locked during a deploy, and the
/// cached session costs memory permanently for something that runs a few times a year.
/// A short-lived child process has none of those problems.
///
/// The call is fire-and-forget after an upload: a failed generation must never fail the
/// upload. With no mask the card falls back to its flat plate, and the generator can be
/// run over the whole directory later to repair it.
///
/// There is deliberately nothing to configure. The generator lives in the repository at
/// tools/silhouette and is carried into the publish output by the csproj, so there is one
/// copy of it and it arrives wherever the API does. Everything it needs to be told —
/// which directories to read and write — the API already knows from
/// <see cref="AvatarStorage"/>. Node itself is the one external requirement; if it is
/// missing the generation fails like any other failure, which is to say visibly in the
/// log and harmlessly for the upload.
/// </summary>
public class SilhouetteService
{
    /// Generating one mask is a model load plus four inference passes: a couple of
    /// seconds warm, more on a cold file cache. Long enough that a slow machine is never
    /// cut off, short enough that a wedged process is not left behind for an hour.
    private const int TimeoutSeconds = 120;

    private const string ScriptName = "make-silhouettes.mjs";

    private readonly ILogger<SilhouetteService> _logger;
    private readonly AvatarStorage _storage;

    public SilhouetteService(AvatarStorage storage, ILogger<SilhouetteService> logger)
    {
        _logger = logger;
        _storage = storage;
    }

    /// <summary>
    /// Starts the generator for one player without waiting for the result.
    /// </summary>
    public void QueueRegenerate(string id)
    {
        if (_storage.SilhouettePath(id) == null)
        {
            _logger.LogWarning("Silhouette not generated: {Id} is not a valid id", id);
            return;
        }

        _ = Task.Run(() => Regenerate(id));
    }

    private void Regenerate(string id)
    {
        try
        {
            var script = LocateScript();
            if (script == null)
            {
                _logger.LogError(
                    "Silhouette generator not found: no {Script} beside the application at {Base} " +
                    "and no tools/silhouette above it. A publish carries it; a build from source " +
                    "reads it out of the repository.",
                    ScriptName, AppContext.BaseDirectory);
                return;
            }

            _storage.EnsureDirectories();

            var startInfo = new ProcessStartInfo("node")
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };

            // ArgumentList quotes each argument for us. The directories come from
            // configuration and the base path in production ends in a separator, which is
            // precisely the case a hand-quoted command line gets wrong: a trailing
            // backslash before a closing quote escapes the quote.
            startInfo.ArgumentList.Add(script);
            startInfo.ArgumentList.Add("--avatars");
            startInfo.ArgumentList.Add(_storage.AvatarDirectory);
            startInfo.ArgumentList.Add("--out");
            startInfo.ArgumentList.Add(_storage.SilhouetteDirectory);
            startInfo.ArgumentList.Add("--id");
            startInfo.ArgumentList.Add(id);

            using var process = Process.Start(startInfo);
            if (process == null)
            {
                _logger.LogError("Silhouette generator did not start for {Id}", id);
                return;
            }

            // Drain before waiting: a full pipe would deadlock the child process.
            var output = process.StandardOutput.ReadToEnd();
            var errors = process.StandardError.ReadToEnd();

            if (!process.WaitForExit(TimeoutSeconds * 1000))
            {
                process.Kill(entireProcessTree: true);
                _logger.LogError("Silhouette generator timed out for {Id} after {Seconds}s", id, TimeoutSeconds);
                return;
            }

            if (process.ExitCode != 0)
            {
                _logger.LogError("Silhouette generator exited {Code} for {Id}: {Errors}", process.ExitCode, id, errors);
                return;
            }

            _logger.LogInformation("Silhouette refreshed for {Id}: {Output}", id, output.Trim());
        }
        catch (Win32Exception ex)
        {
            // What a missing node looks like. Worth its own message: the generic one sends
            // you looking at the script rather than at the machine.
            _logger.LogError(ex, "Silhouette generation failed for {Id}: could not run 'node'. " +
                                 "Node must be on the PATH of the account the API runs as.", id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Silhouette generation failed for {Id}", id);
        }
    }

    /// <summary>
    /// Finds the generator without being told where it is, in the two layouts that exist.
    /// </summary>
    private static string? LocateScript()
    {
        // Published: the csproj copies the tool in beside the application.
        var published = Path.Combine(AppContext.BaseDirectory, "silhouette", ScriptName);
        if (File.Exists(published)) return published;

        // Running from source: bin/<config>/net8.0 sits some way under the repository root.
        // The tool is not copied into the build output because node_modules is ~260 MB, and
        // restating that on every incremental build to save this walk is a poor trade.
        for (var directory = new DirectoryInfo(AppContext.BaseDirectory); directory != null; directory = directory.Parent)
        {
            var candidate = Path.Combine(directory.FullName, "tools", "silhouette", ScriptName);
            if (File.Exists(candidate)) return candidate;
        }

        return null;
    }
}
