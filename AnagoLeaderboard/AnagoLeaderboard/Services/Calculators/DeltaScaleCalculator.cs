namespace AnagoLeaderboard.Services;

/// <summary>
/// The candidate rating scale for a personal, head-to-head volume: average Elo delta per game
/// against one opponent, mapped onto the same 40-99 overall the ordinary cards print.
///
/// This is an <em>analysis</em> scale, not a live one. Nothing draws a pack through it yet; it
/// exists so <c>GET api/cards/volume2</c> can answer what a book would look like under a given
/// anchor table, which is the only way to fit one. See docs/trading-cards.md.
///
/// Two things about it are easy to get backwards and both are pinned by tests.
///
/// <strong>It is monotonically decreasing.</strong> A high positive average means you do better
/// against that person than your rating says you should - oefenmateriaal - and an oefenmateriaal
/// card has to be <em>common</em>, so it prints a low overall. A negative average is an
/// angstgegner, which is the rare card and prints high. Every other scale in this codebase runs
/// the other way.
///
/// <strong>The input is bounded to +/-100 by construction</strong> and that is the frame the
/// anchors are fitted inside: <see cref="RatingCalculator.GetDelta"/> is
/// <c>(score - expected) * 50 * (margin * 0.2)</c>, the margin caps at 10 so the points factor
/// caps at 2.0, and the reported delta deliberately excludes the first-ten-games experience
/// factor - which would reach +/-200 and is a convergence device that says nothing about the
/// game. The realistic spread of an <em>average</em> over many games is far tighter than the
/// bound on a single one, which is exactly why the anchors cannot be guessed.
/// </summary>
public class DeltaScaleCalculator
{
    /// <summary>A point on the piecewise-linear delta scale. Overall is a double; only the final interpolated value rounds.</summary>
    public sealed record DeltaAnchor(double AverageDelta, double Overall);

    /// <summary>
    /// The fitted scale, measured against the real roster rather than guessed.
    ///
    /// Three anchors, and each of the three numbers was argued for:
    ///
    /// <list type="bullet">
    /// <item><strong>+/-5 as the extent.</strong> The centred records at ten games or more run
    /// p10/p90 = -5.51/+4.25, so this is the band the believable pairs actually occupy. It is not
    /// the whole range - a one-game pair reaches +/-50 - and fitting to that range put every real
    /// matchup within a couple of points of the middle.</item>
    /// <item><strong>92 at the rare end.</strong> The cap is the pacing lever, not the median:
    /// tickets halve every 2.5 overall points above the hinge, so 95 is 2.3x rarer than the board's
    /// current top card and 99 is six times rarer. 92 puts the chase at parity with volume 1.</item>
    /// <item><strong>82 in the middle.</strong> Not the median of the book - the blend pulls thin
    /// pairs back toward their ordinary ratings, so a middle anchor of 82 produces a book whose
    /// median is about 73, matching today's. What it sets is where the 80 line falls against the
    /// record distribution, and at 82 it lands just above a zero record, which is what puts
    /// ~23 cards at 80 or above, the count a real book holds.</item>
    /// </list>
    ///
    /// <strong>appsettings.json wins over these at runtime</strong>, exactly as
    /// <see cref="CardRatingCalculator"/>'s anchors do, so the two have to move together. The
    /// measurement behind every figure is in <c>HeadToHeadTests</c> and docs/trading-cards.md.
    /// </summary>
    private static readonly DeltaAnchor[] DefaultDeltaAnchors =
    {
        new(-5, 92),
        new(0, 82),
        new(+5, 50)
    };

    private readonly DeltaAnchor[] _anchors;

    public DeltaScaleCalculator(IConfiguration configuration)
    {
        var configured = configuration
            .GetSection("Cards")
            .GetSection("DeltaScaleAnchors")
            .Get<DeltaAnchor[]>();

        _anchors = Normalise(configured is { Length: >= 2 } ? configured : DefaultDeltaAnchors);
    }

    /// <summary>Built-in frame, for tests and for anything with no configuration to hand.</summary>
    public DeltaScaleCalculator() : this(DefaultDeltaAnchors)
    {
    }

    /// <summary>
    /// An explicit table, so a sweep can try several without a rebuild or a config edit. This is
    /// what the h2h report's <c>anchors</c> query parameter reaches.
    /// </summary>
    public DeltaScaleCalculator(DeltaAnchor[] anchors)
    {
        _anchors = Normalise(anchors);
    }

    public IReadOnlyList<DeltaAnchor> Anchors => _anchors;

    /// <summary>
    /// The overall a card would print in the album of a collector whose average delta against
    /// that subject is <paramref name="averageDelta"/>.
    ///
    /// Interpolated linearly between anchors and flat outside them, so the two ends clamp rather
    /// than run off the scale - which is what keeps a single 10-0 in a one-game pair from asking
    /// for an overall of 300.
    /// </summary>
    public int OverallFor(double averageDelta)
    {
        var first = _anchors[0];
        var last = _anchors[^1];

        if (averageDelta <= first.AverageDelta) return Round(first.Overall);
        if (averageDelta >= last.AverageDelta) return Round(last.Overall);

        for (var i = 1; i < _anchors.Length; i++)
        {
            var high = _anchors[i];
            if (averageDelta > high.AverageDelta) continue;

            var low = _anchors[i - 1];
            var t = (averageDelta - low.AverageDelta) / (high.AverageDelta - low.AverageDelta);

            return Round(low.Overall + t * (high.Overall - low.Overall));
        }

        return Round(last.Overall);
    }

    /// <summary>
    /// Parses the compact wire form the report takes - <c>"-6:99,0:70,6:40"</c> - so an anchor
    /// table is a URL rather than a rebuild. Returns null for anything unparseable, which the
    /// caller turns into the configured default rather than an error.
    /// </summary>
    public static DeltaAnchor[]? ParseAnchors(string? spec)
    {
        if (string.IsNullOrWhiteSpace(spec)) return null;

        var anchors = new List<DeltaAnchor>();

        foreach (var pair in spec.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var parts = pair.Split(':', StringSplitOptions.TrimEntries);

            if (parts.Length != 2) return null;
            if (!double.TryParse(parts[0], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var delta)) return null;
            if (!double.TryParse(parts[1], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var overall)) return null;

            anchors.Add(new DeltaAnchor(delta, overall));
        }

        return anchors.Count >= 2 ? anchors.ToArray() : null;
    }

    /// <summary>Ascending in delta, so the interpolation walk can assume an order regardless of how the table was written.</summary>
    private static DeltaAnchor[] Normalise(DeltaAnchor[] anchors) =>
        anchors.OrderBy(anchor => anchor.AverageDelta).ToArray();

    /// <summary>Half up, matching <see cref="CardRatingCalculator"/> for the reason given there.</summary>
    private static int Round(double overall) =>
        (int)Math.Round(overall, MidpointRounding.AwayFromZero);
}
