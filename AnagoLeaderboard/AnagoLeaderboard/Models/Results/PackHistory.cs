namespace AnagoLeaderboard.Models.Results;

/// <summary>
/// Every pack that has ever been opened, newest first, with the cards that came out of each.
///
/// The log to <see cref="CardStatistics"/>'s tally: the same rows, grouped by the claim that
/// minted them instead of by the face on them. It answers "what came out of that packet" and
/// "who has been opening packets", which no aggregate can - a card's tally cannot say whether
/// four copies were one lucky five-card packet or four mornings in a row.
///
/// Read-only and ungated, like the pool and the statistics. Unlike the statistics it does say
/// which cards a named collector holds, and that is deliberately not a reason to put a key on
/// it: <c>GET api/collections/{playerId}</c> already hands over an entire collection to anybody
/// who asks, so there is nothing here that is not already public. See
/// <see cref="Controllers.CollectionsController"/> for why that is the standing trade.
/// </summary>
/// <param name="TotalPacks">Claims, which is every pack that was ever opened.</param>
/// <param name="TotalCards">
/// Cards across all of them. Equal to <see cref="CardStatistics.TotalCards"/> - the two count
/// the same table - which is what makes the two endpoints checkable against each other.
/// </param>
public sealed record PackHistory(
    int TotalPacks,
    int TotalCards,
    IReadOnlyList<OpenedPack> Packs);

/// <summary>One packet, as it was torn open.</summary>
/// <param name="PackId">
/// The <see cref="PackClaim"/> id. Not the synthetic id the claim route takes - that names a
/// pack that is *available*, and this names one that was opened.
/// </param>
/// <param name="ClaimedAt">When it was opened. The order of the list.</param>
/// <param name="Source">
/// <see cref="PackSource"/> by name rather than by number, the same way the column is stored,
/// because nothing here configures a string enum converter and a bare 3 on the wire says
/// nothing.
/// </param>
/// <param name="GameId">The game that earned it, or null for the other three sources.</param>
/// <param name="GiftId">The present that was opened, or null for the other three.</param>
public sealed record OpenedPack(
    string PackId,
    DateTime ClaimedAt,
    string CollectorId,
    string CollectorName,
    string Source,
    string? GameId,
    string? GiftId,
    IReadOnlyList<PackedCard> Cards);

/// <summary>
/// One card out of one packet.
/// </summary>
/// <param name="Subject">
/// The card as it looks now, off the live pool - so <see cref="CardSubject.IsIcon"/> is today's
/// colourway, exactly as in <see cref="CardStatistic"/> and for the same reason. A packet opened
/// last spring shows the faces its cards wear today, because that is what the collector's book
/// shows too.
/// </param>
/// <param name="MintedAsIcon">
/// Whether this copy was drawn as an icoon, off <see cref="CardInstance.IsIcon"/>. History, and
/// the thing that makes the log a record of the draw rather than a second rendering of the pool:
/// it is what decided which slot the copy filled, and it is the only reason a pull of somebody
/// who has since retired can be told from one made after.
/// </param>
public sealed record PackedCard(CardSubject Subject, bool MintedAsIcon);
