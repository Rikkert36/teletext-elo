using System.Globalization;

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
    IReadOnlyList<PackedCard> Cards)
{
    /// <summary>
    /// The packet as one line, for <c>GET api/packs?compact=true</c> - the same arrangement
    /// <c>player/champion-history</c> uses, where the model owns its one-line form and the
    /// controller only maps over it. Derived from this object rather than assembled anywhere
    /// else, so the two shapes of the route cannot come to disagree about what was in a packet.
    ///
    /// To the minute, and the day is stamped in full: this log runs for years, so a
    /// <c>dd-MM</c> the way a champion change carries would be ambiguous the moment there is a
    /// second season of it. Formatted invariant rather than in the server's culture, because
    /// <c>:</c> in a format string is the culture's *time separator* placeholder rather than a
    /// literal colon - a machine set to the wrong locale would quietly print <c>14.02</c>.
    ///
    /// Dutch, because a line served for somebody to read is UI copy - the same reason a champion
    /// change says "speelde niet voor 2 weken" rather than translating it.
    ///
    /// First names, like every other line and every card face in this app. Duplicates are
    /// repeated rather than collapsed, because two copies of somebody is what a packet
    /// containing two copies of somebody should read as - and they are in the list's own
    /// best-first order. The overall in brackets is what makes that order legible: without it
    /// the line says a packet held three cards but not whether it was worth opening.
    ///
    /// <strong>That overall is today's, not the one the card was worth on the day it was
    /// pulled</strong>, because it is read off <see cref="PackedCard.Subject"/>, which is the
    /// live pool. So a line can say <c>Rik pakte: Petar (89)</c> about a packet torn open when
    /// Petar was a 70. That is not a rounding of the truth, it is the same rule the album, the
    /// checklist and the statistics follow - <see cref="CardInstance"/> stores no rating at all
    /// on purpose, and pulling somebody at zilver who becomes goud is the intended behaviour
    /// rather than a defect of it. It is also what keeps this line agreeing with the
    /// <c>subject.overall</c> the full response carries for the same card, which is the whole
    /// reason <see cref="Line"/> is derived from this object.
    ///
    /// A mint-time overall would need a frozen column of its own beside
    /// <see cref="CardInstance.IsIcon"/> and would print a number that nothing else in the app
    /// shows. If that is ever wanted it is a feature, not a format change: read that property's
    /// remarks first, because they say why the one frozen flag there is does not decide what a
    /// card looks like.
    ///
    /// A trailing <c>*</c> marks a <see cref="PackedCard.FirstCopy"/> - the pull that filled a
    /// slot that had been empty until then. It is the one thing on this line that is not a
    /// rendering of the pool but a fact about the draw, and it is here because it is what makes
    /// the log readable as a story: without it every line is a list of faces, and with it the
    /// good mornings stand out. Two copies of a new subject in one packet star only the first,
    /// because the second one filled nothing.
    ///
    /// Deliberately silent about <see cref="Source"/>, <see cref="GameId"/> and
    /// <see cref="PackedCard.MintedAsIcon"/>. This is the skim of who packed what and when;
    /// anything that has to know where a packet came from wants the full response, which is
    /// the same route without the parameter.
    /// </summary>
    public string Line() =>
        $"{ClaimedAt.ToString("dd-MM-yyyy HH:mm", CultureInfo.InvariantCulture)} - "
        + $"{FirstName(CollectorName)} pakte: "
        + string.Join(
            ", ",
            Cards.Select(card =>
                $"{FirstName(card.Subject.Name)} ({card.Subject.Overall})"
                + (card.FirstCopy ? "*" : string.Empty)));

    /// <summary>
    /// The first word of a name, the way <see cref="Models.ChampionInfo"/> takes it. Two people
    /// sharing a first name is a collision this line accepts: it is what their cards print, so a
    /// log that disambiguated would name them differently from the thing it is a log of.
    /// </summary>
    private static string FirstName(string name)
    {
        var space = name.IndexOfAny(new[] { ' ', '\t', '\n', '\r' });

        return space == -1 ? name : name[..space];
    }
}

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
/// <param name="FirstCopy">
/// Whether this copy filled a slot that was empty until then: the first time this collector ever
/// packed this subject <em>as this kind of card</em>. The <c>*</c> on <see cref="OpenedPack.Line"/>.
///
/// <strong>Keyed on the slot, not on the face</strong>, so it splits on
/// <see cref="MintedAsIcon"/> exactly the way <see cref="Services.PackService.CountsBySubject"/>
/// does - a first icoon of somebody whose player card you already hold is a new slot and stars,
/// because the checklist counts those player cards in brackets against it rather than ticking it.
/// See <see cref="CardInstance.IsIcon"/> for the rule and why the two questions - what a card
/// looks like, and what you have collected - are answered by different flags. Keying this on the
/// subject alone would print no star on the day an icoon set opens, which is the day there is
/// most to star.
///
/// History, like <see cref="MintedAsIcon"/> and unlike <see cref="Subject"/>: it is a fact about
/// the moment the packet was torn open, so it does not move when the subject's standing does. It
/// does move when an <em>earlier</em> claim is deleted, because then the copy that was second
/// becomes the one that filled the slot - which is right, and is the same cascade that takes a
/// mis-entered game's packets out of the log entirely.
///
/// Per collector, and only ever about the collector who opened the packet. Somebody else pulling
/// a card first does not take your star: the slot it filled was in your book.
/// </param>
public sealed record PackedCard(CardSubject Subject, bool MintedAsIcon, bool FirstCopy);
