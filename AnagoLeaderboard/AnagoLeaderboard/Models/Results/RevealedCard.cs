namespace AnagoLeaderboard.Models.Results;

/// <summary>
/// One card as it comes out of a packet.
///
/// The subject is nested rather than flattened so this is a <see cref="CardSubject"/> with two
/// facts about the pull attached, and the browser can hand the inner object to the same code
/// that draws every other card.
/// </summary>
/// <param name="IsNew">
/// Whether it filled an empty slot. Answerable only at the moment of the claim, from the count
/// *before* the card was filed, and the whole of what the reveal's new-card beat keys off.
/// </param>
/// <param name="Copies">How many the collector holds now, this one included.</param>
public sealed record RevealedCard(CardSubject Player, bool IsNew, int Copies);

/// <summary>
/// The answer to opening a pack: what was in it, and the collection it landed in.
///
/// The state travels with the cards rather than being fetched afterwards, for the same reason
/// <c>POST collections/{playerId}/create</c> returns the whole page - a follow-up read is
/// another full leaderboard replay, and here it would be the second one in a single user
/// action. It also means the shelf and the book are correct the instant the reveal ends, with
/// nothing in flight.
/// </summary>
public sealed record PackReveal(IReadOnlyList<RevealedCard> Cards, CollectionState State);
