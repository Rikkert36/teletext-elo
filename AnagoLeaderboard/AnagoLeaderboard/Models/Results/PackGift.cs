namespace AnagoLeaderboard.Models.Results;

/// <summary>
/// A pack somebody was handed rather than earned. The only grant-shaped table in the design.
///
/// Everything else about a pack is <em>derived</em> - today's games plus the daily freebie,
/// minus the claims - and that is deliberately load-bearing. A present is the one thing that
/// cannot be derived, because nothing happened to entitle anyone to it, so it needs a row that
/// says so. That makes this the exception to the rule rather than a hole in it: the derivation
/// still reads rows and subtracts claims, and <c>CreateGame</c> still writes nothing.
///
/// It is also what the test panel's pack buttons are, so a debug pack and a present are the
/// same object. That is the whole reason there is no second <c>packs/debug</c> route: a second
/// grant-shaped endpoint would only be a second thing to keep in step with
/// <see cref="Services.PackService.Roll"/>.
/// </summary>
/// <summary>
/// The answer to handing out presents: which rows were written.
///
/// A receipt rather than a collection, and deliberately so on both counts. A present to everybody
/// has no single collection to answer with, and the giver is usually not the recipient - so there
/// is no page here to return, and the one caller who has just given itself a packet refetches.
///
/// Separate from <see cref="Services.GiftResult"/>, which carries the outcome the controller turns
/// into a status code. Sending that too would put an integer on the wire that is always the same
/// value on a 200 and that no client can read.
/// </summary>
/// <param name="GiftIds">
/// One per named recipient, or a single id for everybody. Returned because it is the only handle on
/// a present afterwards: deleting the row is how a mistaken gift is withdrawn, and that takes any
/// cards already claimed from it with it.
/// </param>
/// <param name="Everybody">
/// Whether it went to the whole office. Explicit because <see cref="GiftIds"/> has one entry either
/// way when a single player was named, so its length is not a headcount.
/// </param>
public sealed record GiftReceipt(IReadOnlyList<string> GiftIds, bool Everybody);

public class PackGift
{
    public required string Id { get; set; }

    /// <summary>
    /// Who it is for. **Always somebody.**
    ///
    /// It used to be nullable, where null meant "everybody" - one row with no recipient, which
    /// made "everybody" mean the roster at *claim* time. That is now resolved at *gift* time
    /// instead: <see cref="Services.PackService.GiveGift"/> expands the word into one row per
    /// player on the roster, so the convenience lives in the call and the table only ever holds
    /// addressed presents. See that method for why.
    /// </summary>
    public required string PlayerId { get; set; }

    /// <summary>Cards in the packet. 1 whenever <see cref="MinimumOverall"/> is set.</summary>
    public required int Size { get; set; }

    /// <summary>
    /// The floor on the overall of every card drawn from it, or null for an ordinary draw.
    ///
    /// A floor rather than a tier or a ceremony level, because it is the one number both of
    /// those are expressed in - "goud and up" is 75, and the ceremony's four steps *are*
    /// 75/80/85/90. A tier could not separate 75-79 from 80-84 (both are goud) and a level
    /// could not say "zilver and up" at all, so a raw overall says everything either of them
    /// could and needs no table to be read against.
    ///
    /// It is a <em>floor</em>, not a target: the draw keeps its weighting inside the qualifying
    /// candidates, so 75+ still hands out far more 75s than 90s. And if nobody clears it, the
    /// draw falls through to the whole pool rather than failing - a guarantee is about the odds,
    /// and a pool that cannot honour it is not a reason to refuse somebody a packet.
    /// </summary>
    public int? MinimumOverall { get; set; }

    /// <summary>Why it was given. Reaches the wrapper's tooltip, like a game pack's.</summary>
    public required string Reason { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// When it stops being derived, or null for never. See <see cref="LifetimeDays"/>.
    /// </summary>
    public DateTime? ExpiresAt { get; set; }

    public static PackGift Create(
        string playerId,
        int size,
        int? minimumOverall,
        string reason)
    {
        var now = DateTime.Now;

        return new PackGift
        {
            Id = Guid.NewGuid().ToString(),
            PlayerId = playerId,
            // A guarantee is always a single card. Two guaranteed golds in one packet is a
            // different product, and nothing has asked for one.
            Size = minimumOverall is null ? size : 1,
            MinimumOverall = minimumOverall,
            Reason = reason,
            CreatedAt = now,
            /*
             * **Presents do not expire.** They stood open for seven days; they now stand open
             * until they are opened. A present that runs out is a mean present, and there is no
             * "you were not here so you earned nothing" to fall back on the way a game pack has.
             */
            ExpiresAt = null
        };
    }
}
