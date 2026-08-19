namespace AnagoLeaderboard.Models.Results;

/// <summary>
/// The whole collection page in one response.
///
/// Deliberately not split into collection / pool / icons routes. The book is one object -
/// the album builds its sections from the pool, the icons and the owned counts together
/// and then walks the result in printed order, so three routes would mean either a book
/// that cannot draw until all three land, or one that draws and then grows a section,
/// shifting every card index behind it underneath an open card viewer.
///
/// It ships cards you do not own, because the album is mostly silhouettes and that is the
/// feature. So this carries the set, not just your part of it.
/// </summary>
/// <param name="Album">
/// Null until the player has fetched an album off the table, and the single flag the UI
/// branches on to decide between the opening sequence and the book. Everything else on this
/// record is populated either way, so "no collection yet" never has to be inferred from a
/// status code - which would collide with an unknown player.
/// </param>
/// <param name="Eligible">
/// Whether this player is over the games gate. False still returns a full response: the page
/// needs <see cref="NumberOfGames"/> and <see cref="MinGames"/> to say how far off they are.
/// </param>
/// <param name="NumberOfGames">
/// From the leaderboard replay, not from Player.NumberOfGames. The stored counter and the
/// replayed one can disagree, and pool membership is decided by the replayed one - reading
/// the column here would let this report someone eligible who is absent from
/// <see cref="Pool"/>.
/// </param>
/// <param name="Owned">
/// Counts, not card objects: a card is live and wholly derivable from its pool entry, and
/// the page only builds a lookup from this anyway, so embedding the player twice would just
/// invite the two copies to drift.
/// </param>
/// <param name="Packs">
/// Derived rather than stored - today's games this player took part in, plus the daily
/// freebie, less whatever they have already opened. Empty until they have an album, because
/// a pack claimed without one would have nowhere to be filed.
/// </param>
public sealed record CollectionState(
    string PlayerId,
    AlbumBinding? Album,
    bool Eligible,
    int NumberOfGames,
    int MinGames,
    IReadOnlyList<OwnedCard> Owned,
    IReadOnlyList<AvailablePack> Packs,
    IReadOnlyList<CardSubject> Pool,
    IReadOnlyList<CardSubject> Icons);

/// <summary>
/// The album as a physical object: how it is bound, and what it is bound to hold.
///
/// The icons latch lives here rather than on the root of <see cref="CollectionState"/>
/// because it is a property of <em>this binding</em> - the book you are holding either has
/// the icons in it or it does not, and a half-bound book is the visible record of that. Two
/// things follow, both wanted. Emptying the collection deletes the row, so the unlock leaves
/// with the binding and <c>Album: null</c> cannot carry a stale one. And the flag is
/// unreachable without an album, which is correct: there is nothing for an unlock to be a
/// property of until there is a book.
///
/// The collection's <em>contents</em> - owned, packs, the pool - stay on the root, because
/// those are things you have rather than facts about the object they are kept in.
/// </summary>
/// <param name="Cover">One of <see cref="AlbumCovers.All"/>.</param>
/// <param name="IconsUnlocked">
/// Whether this book holds the icons. Drives the half-binding, and whether
/// <see cref="CollectionState.Icons"/> ships at all.
/// </param>
/// <remarks>
/// There is deliberately no "you may claim the icons" flag here. Completing the set puts a
/// **packet** on the shelf - see <see cref="Services.PackService.IconsPack"/> - and that packet
/// existing is the whole of the offer. A second flag saying the same thing is a second thing to
/// keep in step with the derivation, and the two would eventually disagree about whether the
/// affordance should be on screen.
/// </remarks>
public sealed record AlbumBinding(
    string Cover,
    DateTime CreatedAt,
    bool IconsUnlocked);

/// <summary>
/// How many copies of one subject the collector holds, split by the kind of card each copy came
/// out of the packet as - see <see cref="MintTally"/>, which this is the wire shape of.
///
/// Both numbers ship for every subject the collector holds anything of, and the page picks by
/// the slot it is filling: a slot takes the count of its own kind, and prints the other in
/// brackets against an unticked checklist row. That bracketed figure is the only thing standing
/// between "you have to pack this icoon" and a card you know you had disappearing without a
/// word, so it is not an extra: it is the reason the rule is legible at all.
/// </summary>
public sealed record OwnedCard(string PlayerId, int AsPlayer, int AsIcon);

/// <summary>
/// A pack waiting to be opened.
///
/// Ids are synthetic and stable - "game:{gameId}", "daily:{yyyy-MM-dd}", "gift:{giftId}" -
/// because a derived pack has no row to take an id from, and the packet pile's tilt and sheen
/// are seeded from the id so it must survive a refetch.
/// </summary>
/// <param name="Reason">
/// The one line the packet's docket prints, and the whole of it: a full Dutch sentence, capitalised,
/// saying where the packet came from. "Gewonnen met Bo van Daan en Rik met 10 - 3" for a game,
/// "Dagelijks gratis pakje", "De set is compleet", or whatever the giver wrote on a present.
///
/// It is a sentence and not a label because there is nothing else on the docket to caption - see
/// "What a packet says: the docket" in docs/trading-cards.md. Nothing about the *size* belongs in
/// it: the wrapper prints the number, and how it was arrived at is not the docket's business.
/// </param>
/// <param name="MinimumOverall">
/// The floor on every card in it, or null for an ordinary draw - which is every earned pack,
/// since the only choice a game makes is the size. Only a <see cref="PackGift"/> ever sets it.
///
/// It reaches the wire because the wrapper prints it instead of a count ("80+") and is foiled
/// orange rather than by size: a packet that is lying to you about the odds should look like it.
/// </param>
/// <param name="GuaranteesIcon">
/// The single card in it is drawn from the icons rather than from the actives. True only for the
/// set-completion packet.
///
/// It reaches the wire for the same reason <see cref="MinimumOverall"/> does: the wrapper prints
/// what it is promising, and a packet making a promise this large should not look like the daily
/// freebie. It is also what tells the page to run the re-binding before opening it.
/// </param>
public sealed record AvailablePack(
    string Id,
    int Size,
    string Reason,
    IReadOnlyList<string> DoubledPlayerIds,
    int? MinimumOverall = null,
    bool GuaranteesIcon = false);
