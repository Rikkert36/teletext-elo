namespace AnagoLeaderboard.Models.Results;

/// <summary>
/// One card, in one collection. The rows a claim mints.
///
/// It stores who owns it and who is on it, and nothing else about the card: rating, overall
/// and tier are all live, computed on read from the subject's current standing, which is the
/// whole point - pull someone at zilver and they become goud when their form improves.
/// </summary>
/// <remarks>
/// Both player references cascade, for different reasons. The owner's is ordinary. The
/// subject's is deliberate: a player is only ever deleted when they were created by accident,
/// and cards of somebody who never existed are not worth keeping.
///
/// <see cref="GameId"/> cascades too, and that one is not tidiness. Pack size depends on the
/// recorded score, so a mis-entered 10-2 mints five cards where 10-9 would have minted three -
/// deleting the game to correct it has to take the illegitimate rewards with it.
/// </remarks>
public class CardInstance
{
    public required string Id { get; set; }

    /// <summary>The collector.</summary>
    public required string PlayerId { get; set; }

    /// <summary>Who is printed on the card.</summary>
    public required string SubjectPlayerId { get; set; }

    /// <summary>The claim that minted it.</summary>
    public required string PackClaimId { get; set; }

    /// <summary>The game the pack came from, or null for a daily freebie.</summary>
    public string? GameId { get; set; }

    /// <summary>
    /// Whether it was drawn as an icoon.
    ///
    /// Frozen at mint time rather than derived from the subject's <c>Active</c> flag, because
    /// the two answer different questions: this says what was pulled out of the packet, and
    /// somebody who goes inactive next month did not retroactively hand you an icoon.
    /// </summary>
    public bool IsLegend { get; set; }

    public DateTime MintedAt { get; set; }

    public static CardInstance Mint(
        string playerId,
        string subjectPlayerId,
        string packClaimId,
        string? gameId,
        bool isLegend) =>
        new()
        {
            Id = Guid.NewGuid().ToString(),
            PlayerId = playerId,
            SubjectPlayerId = subjectPlayerId,
            PackClaimId = packClaimId,
            GameId = gameId,
            IsLegend = isLegend,
            MintedAt = DateTime.Now
        };
}
