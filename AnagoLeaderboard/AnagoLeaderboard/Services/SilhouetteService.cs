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
/// </summary>
public class SilhouetteService
{
    private readonly ILogger<SilhouetteService> _logger;
    private readonly AvatarStorage _storage;
    private readonly bool _enabled;
    private readonly string _command;
    private readonly string _argumentTemplate;
    private readonly int _timeoutSeconds;

    public SilhouetteService(IConfiguration configuration, AvatarStorage storage, ILogger<SilhouetteService> logger)
    {
        _logger = logger;
        _storage = storage;

        var section = configuration.GetSection("Silhouette");
        _enabled = section.GetValue("Enabled", false);
        _command = section.GetValue<string>("Command") ?? "node";
        _argumentTemplate = section.GetValue<string>("Arguments") ?? string.Empty;
        _timeoutSeconds = section.GetValue("TimeoutSeconds", 120);
    }

    /// <summary>
    /// Starts the generator for one player without waiting for the result.
    /// </summary>
    public void QueueRegenerate(string id)
    {
        if (!_enabled)
        {
            _logger.LogDebug("Silhouette generation is disabled; skipped {Id}", id);
            return;
        }

        if (_storage.SilhouettePath(id) == null)
        {
            _logger.LogWarning("Silhouette not generated: {Id} is not a valid id", id);
            return;
        }

        _ = Task.Run(() => Regenerate(id));
    }

    private void Regenerate(string id)
    {
        var arguments = _argumentTemplate
            .Replace("{id}", id)
            .Replace("{avatars}", _storage.AvatarDirectory)
            .Replace("{silhouettes}", _storage.SilhouetteDirectory);

        try
        {
            _storage.EnsureDirectories();

            var startInfo = new ProcessStartInfo(_command, arguments)
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };

            using var process = Process.Start(startInfo);
            if (process == null)
            {
                _logger.LogError("Silhouette generator did not start for {Id}", id);
                return;
            }

            // Drain before waiting: a full pipe would deadlock the child process.
            var output = process.StandardOutput.ReadToEnd();
            var errors = process.StandardError.ReadToEnd();

            if (!process.WaitForExit(_timeoutSeconds * 1000))
            {
                process.Kill(entireProcessTree: true);
                _logger.LogError("Silhouette generator timed out for {Id} after {Seconds}s", id, _timeoutSeconds);
                return;
            }

            if (process.ExitCode != 0)
            {
                _logger.LogError("Silhouette generator exited {Code} for {Id}: {Errors}", process.ExitCode, id, errors);
                return;
            }

            _logger.LogInformation("Silhouette refreshed for {Id}: {Output}", id, output.Trim());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Silhouette generation failed for {Id}", id);
        }
    }
}
