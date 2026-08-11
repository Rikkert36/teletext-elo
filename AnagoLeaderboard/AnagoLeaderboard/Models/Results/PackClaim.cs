namespace AnagoLeaderboard.Models.Results;

/// <summary>Where a pack came from. Gifts arrive later and are the only granted kind.</summary>
public enum PackSource
{
    Game,
    Daily
}

/// <summary>
/// That a pack has been opened. The only thing about a pack that is ever stored.
///
/// Packs themselves are derived rather than granted - what is available to a player today is
/// the games they played in today, plus the daily freebie, minus the rows in this table. So
/// this is the subtraction, and nothing writes a pack into existence: <c>CreateGame</c>
/// inserts nothing, which is what makes "cards can never break game submission" a fact about
/// the shape of the code rather than a rule somebody has to remember.
///
/// Deliberately never flushed. The derivation only ever looks at today, so old rows are read
/// by nothing - but they cost a few thousand rows a year in SQLite and they are a free record
/// of where a card came from, while a nightly flush would be a scheduled job in a design whose
/// main virtue is having no moving parts.
/// </summary>
public class PackClaim
{
    public required string Id { get; set; }

    /// <summary>Who opened it. FK to Players, cascade - see <see cref="CardInstance"/>.</summary>
    public required string PlayerId { get; set; }

    public required PackSource Source { get; set; }

    /// <summary>
    /// The game that entitled them to it, or null for the daily freebie.
    ///
    /// Cascades: deleting a game takes the claims it caused with it, so a game entered wrongly
    /// and deleted stops having ever been worth a pack.
    /// </summary>
    public string? GameId { get; set; }

    /// <summary>
    /// The day the pack belonged to, at midnight. Server-local, like every other date in this
    /// codebase.
    ///
    /// Only the daily freebie is keyed on it - a game pack is identified by its game - but it
    /// is stored for both, because it is the only thing that makes an old row readable.
    /// </summary>
    public DateTime ClaimDate { get; set; }

    public DateTime ClaimedAt { get; set; }

    public static PackClaim ForGame(string playerId, string gameId, DateTime day) =>
        new()
        {
            Id = Guid.NewGuid().ToString(),
            PlayerId = playerId,
            Source = PackSource.Game,
            GameId = gameId,
            ClaimDate = day.Date,
            ClaimedAt = DateTime.Now
        };

    public static PackClaim ForDaily(string playerId, DateTime day) =>
        new()
        {
            Id = Guid.NewGuid().ToString(),
            PlayerId = playerId,
            Source = PackSource.Daily,
            GameId = null,
            ClaimDate = day.Date,
            ClaimedAt = DateTime.Now
        };
}
