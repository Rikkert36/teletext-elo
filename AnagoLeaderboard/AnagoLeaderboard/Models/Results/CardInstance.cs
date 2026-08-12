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
    /// Whether it was drawn as an icoon. A mint-time historical record, and nothing more.
    ///
    /// <strong>Nothing reads this to decide what a card looks like, and nothing should
    /// start to.</strong> What a card shows follows its subject's <em>current</em> standing,
    /// icoon-ness included: the album builds its slots from the live pool and reads the
    /// colourway off the pool entry, so a player going inactive turns the card already in
    /// your book into an icoon. That is the same rule as a zilver card becoming goud when
    /// their form improves, and it is deliberate - a collection tracks the office as it is,
    /// not as it was on the day each packet was torn open.
    ///
    /// What this column is for is answering "what came out of the packet", which is a
    /// question about history rather than about presentation. Wiring it into rendering would
    /// freeze a card's face at mint and quietly contradict the live-card rule.
    /// </summary>
    public bool IsIcon { get; set; }

    public DateTime MintedAt { get; set; }

    public static CardInstance Mint(
        string playerId,
        string subjectPlayerId,
        string packClaimId,
        string? gameId,
        bool isIcon) =>
        new()
        {
            Id = Guid.NewGuid().ToString(),
            PlayerId = playerId,
            SubjectPlayerId = subjectPlayerId,
            PackClaimId = packClaimId,
            GameId = gameId,
            IsIcon = isIcon,
            MintedAt = DateTime.Now
        };
}
