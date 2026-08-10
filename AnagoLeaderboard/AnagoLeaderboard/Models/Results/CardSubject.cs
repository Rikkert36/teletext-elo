namespace AnagoLeaderboard.Models.Results;

/// <summary>
/// A player as a trading card shows them.
///
/// Deliberately thin. Cards carry no statistics - the whole face is the photo, the first
/// name and the overall - so anything else the collection page needs (the nickname, the
/// duplicate count) either comes off the name or comes from somewhere that is not the card.
/// </summary>
/// <param name="VisibleRating">
/// For an ordinary card the player's current rating; for a legend their all-time high.
/// One field rather than two on purpose: the card does not care which it is, and nothing
/// downstream should have to branch on it.
/// </param>
/// <param name="Overall">
/// The 40-99 number printed in the corner, from <see cref="Services.CardRatingCalculator"/>.
/// Computed here rather than in the browser because the same scale drives the raffle
/// weighting, so a client with its own copy could print an overall inconsistent with the
/// odds the card was actually drawn at.
/// </param>
/// <param name="IsLegend">
/// Drives the icoon colourway. Not a fifth tier - a legend has an ordinary tier like
/// anyone else, and it moves the metal of their icoon.
/// </param>
public sealed record CardSubject(
    string Id,
    string Name,
    int VisibleRating,
    int Overall,
    int NumberOfGames,
    bool IsLegend);
