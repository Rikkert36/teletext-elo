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
