namespace AnagoLeaderboard.Services;

/// <summary>
/// The trading-card rating scale and the raffle weighting behind the pack draw.
///
/// Two numbers come out of here and they are tuned against each other, which is why
/// they live in one class and one configuration section: <see cref="OverallFor"/> maps a
/// visible rating onto a FIFA-style 40-99 overall, and <see cref="TicketsFor"/> turns that
/// overall into raffle tickets. Moving a scale anchor therefore does not only change what
/// a card prints, it silently re-balances how rare that card is.
///
/// Ported from the phase-1 TypeScript in anago-leader-board-ui/src/mock/cardMock.ts. The
/// full reasoning behind every constant is in docs/trading-cards.md; the short version is
/// below.
/// </summary>
public class CardRatingCalculator
{
    /// <summary>
    /// A point on the piecewise-linear rating scale.
    ///
    /// Overall is a double because two anchors are fractional (600 -> 61.5); only the
    /// final interpolated value is rounded.
    /// </summary>
    public sealed record ScaleAnchor(double VisibleRating, double Overall);

    /// <summary>
    /// Anchors: visible rating -> overall, interpolated linearly between them.
    ///
    /// A smooth curve cannot fit these. 800->1000 is 200 rating for 10 points while
    /// 1000->1851 is 851 rating for the same 10, a 4x slope change steeper than any log or
    /// logistic will bend, so the scale is deliberately piecewise rather than fitted.
    ///
    /// Everything up to 1851 is fixed and must stay so: it is the highest rating ever
    /// recorded, it is pinned to exactly 90, and every player sits at or below it.
    /// </summary>
    private static readonly ScaleAnchor[] DefaultScaleAnchors =
    {
        new(0, 40),
        new(200, 47),
        new(400, 54),
        new(600, 61.5),
        new(800, 70),
        new(1000, 80),
        new(1250, 84),
        new(1500, 87),
        new(1851, 90),
        new(2200, 93),
        new(2600, 96),
        new(3000, 99)
    };

    /// <summary>Unreachable in practice; the top anchor is already beyond any real rating.</summary>
    private const int DefaultOverallCap = 99;

    /// <summary>
    /// Overall points per halving of raffle tickets below the hinge. Flat by design: a
    /// halving takes more than the entire sub-80 range, so everybody down there is close to
    /// equally common.
    /// </summary>
    private const double DefaultDLow = 30;

    /// <summary>
    /// Overall points per halving above the hinge. The rarity tuning knob, and the one
    /// number most likely to need retuning once collections are actually being built.
    /// </summary>
    private const double DefaultDHigh = 2.5;

    /// <summary>Where the halving rate changes. Overall 80 is exactly visible rating 1000.</summary>
    private const double DefaultHinge = 80;

    /// <summary>
    /// Games needed both to appear on a card and to own a collection.
    ///
    /// The gate is symmetric on purpose: crossing it makes you collectable and a collector
    /// in the same moment. It exists because the inexperience deduction is ~316 at five
    /// games and ~794 at one, so without a floor the scale reports attendance, not skill.
    /// </summary>
    private const int DefaultMinGames = 5;

    private readonly ScaleAnchor[] _anchors;
    private readonly int _overallCap;
    private readonly double _dLow;
    private readonly double _dHigh;
    private readonly double _hinge;

    public int MinGames { get; }

    /// <summary>
    /// The overall a player on the very bottom anchor prints, and the top of the scale.
    ///
    /// Exposed so that anything validating an overall - a gift's floor, for instance - reads the
    /// range off the scale rather than repeating 40 and 99, which are configurable.
    /// </summary>
    public int OverallFloor => Round(_anchors[0].Overall);

    public int OverallCap => _overallCap;

    public CardRatingCalculator(IConfiguration configuration)
    {
        var section = configuration.GetSection("Cards");

        var configured = section.GetSection("ScaleAnchors").Get<ScaleAnchor[]>();
        _anchors = configured is { Length: >= 2 }
            ? configured.OrderBy(anchor => anchor.VisibleRating).ToArray()
            : DefaultScaleAnchors;

        _overallCap = section.GetValue("OverallCap", DefaultOverallCap);
        _dLow = section.GetValue("DLow", DefaultDLow);
        _dHigh = section.GetValue("DHigh", DefaultDHigh);
        _hinge = section.GetValue("Hinge", DefaultHinge);
        MinGames = section.GetValue("MinGames", DefaultMinGames);
    }

    /// <summary>Built-in balance, for tests and for anything that has no configuration to hand.</summary>
    public CardRatingCalculator()
    {
        _anchors = DefaultScaleAnchors;
        _overallCap = DefaultOverallCap;
        _dLow = DefaultDLow;
        _dHigh = DefaultDHigh;
        _hinge = DefaultHinge;
        MinGames = DefaultMinGames;
    }

    /// <summary>
    /// The number printed in the corner of the card.
    ///
    /// For an icoon this is fed their all-time-high visible rating rather than their
    /// current one, which is the whole difference between an icoon and an ordinary card.
    /// </summary>
    public int OverallFor(int visibleRating)
    {
        var first = _anchors[0];
        var last = _anchors[^1];

        if (visibleRating <= first.VisibleRating) return Round(first.Overall);
        if (visibleRating >= last.VisibleRating) return _overallCap;

        for (var i = 1; i < _anchors.Length; i++)
        {
            var high = _anchors[i];
            if (visibleRating > high.VisibleRating) continue;

            var low = _anchors[i - 1];
            var t = (visibleRating - low.VisibleRating) / (high.VisibleRating - low.VisibleRating);

            return Round(low.Overall + t * (high.Overall - low.Overall));
        }

        return _overallCap;
    }

    /// <summary>
    /// Raffle tickets a player holds in a pack draw: 2^-E, with the halving rate itself
    /// accelerating above the hinge.
    ///
    /// A single global rate does not work, because the scale deliberately compresses the
    /// top: the best and a mid-table player are 9 overall points apart despite an 816-rating
    /// gap, so a constant rate would make them barely 2x apart in rarity while two players
    /// 374 rating apart at the bottom came out 3.4x apart - backwards relative to real skill.
    ///
    /// Continuous at the hinge: only the slope changes, there is no jump.
    /// </summary>
    public double TicketsFor(int overall)
    {
        var exponent = overall <= _hinge
            ? (overall - _anchors[0].Overall) / _dLow
            : (_hinge - _anchors[0].Overall) / _dLow + (overall - _hinge) / _dHigh;

        return Math.Pow(2, -exponent);
    }

    /// <summary>
    /// Half up, not half to even.
    ///
    /// C# rounds midpoints to the nearest even number by default and JavaScript rounds them
    /// up, and the scale produces exact midpoints on real ratings - the 800-1000 segment
    /// runs 20 rating to the point, so 810 lands on precisely 70.5. Left on the default the
    /// C# and TypeScript scales would quietly disagree by a point on a whole set of
    /// ratings, which is exactly the kind of drift moving the scale server-side was meant
    /// to end.
    /// </summary>
    private static int Round(double overall) =>
        (int)Math.Round(overall, MidpointRounding.AwayFromZero);
}
