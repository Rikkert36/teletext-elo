namespace AnagoLeaderboard.Models.Results;

/// <summary>Where a pack came from. <see cref="Gift"/> is the only granted kind.</summary>
public enum PackSource
{
    Game,
    Daily,

    /// <summary>
    /// A <see cref="PackGift"/> - the one source that is a row rather than a derivation, because
    /// nothing happened to entitle anybody to a present.
    /// </summary>
    Gift,

    /// <summary>
    /// The packet that comes with finishing the active set: one guaranteed icoon, once ever.
    ///
    /// **Derived, like the daily freebie, and deliberately not a <see cref="Gift"/>.** It would
    /// have been easy to write a gift row when the last active card landed, and that is the
    /// `CreateGame` mistake again - a grant bolted onto whichever transaction happened to be
    /// passing. Nothing entitles you to this except the state of your collection, and that state
    /// is readable, so it is a derivation: offered while the set is complete and this claim does
    /// not exist, and gone the moment it does.
    /// </summary>
    Icons
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
    /// The present that was opened, or null for the other two sources.
    ///
    /// Cascades too, for the same reason: withdrawing a gift takes the cards it paid out with it.
    /// </summary>
    public string? GiftId { get; set; }

    /// <summary>
    /// The day the pack belonged to, at midnight. Server-local, like every other date in this
    /// codebase.
    ///
    /// Only the daily freebie is keyed on it - a game pack is identified by its game and a gift
    /// by its row - but it is stored for all three, because it is the only thing that makes an
    /// old row readable.
    ///
    /// **Only the daily freebie is keyed on it, and nothing else may become so.** A present
    /// stands open forever and a game pack for a full day, so the derivation has to see a gift
    /// claim from last Tuesday or last night's game claim this morning, or the packet comes back
    /// after it was opened. See <see cref="Services.PackService.Derive"/>, which subtracts every
    /// claim it is given and reads this column for the daily alone.
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

    public static PackClaim ForGift(string playerId, string giftId, DateTime day) =>
        new()
        {
            Id = Guid.NewGuid().ToString(),
            PlayerId = playerId,
            Source = PackSource.Gift,
            GameId = null,
            GiftId = giftId,
            ClaimDate = day.Date,
            ClaimedAt = DateTime.Now
        };

    /// <summary>
    /// The set-completion packet, claimed. One per player, ever.
    ///
    /// The day is stored because every row stores it, and read by nothing: this claim is keyed on
    /// the player alone. Keying it on the day would offer the packet again tomorrow, which is the
    /// same trap a gift claim avoids - and here it would hand out an unlimited supply of
    /// guaranteed icoons, one a night.
    /// </summary>
    public static PackClaim ForIcons(string playerId, DateTime day) =>
        new()
        {
            Id = Guid.NewGuid().ToString(),
            PlayerId = playerId,
            Source = PackSource.Icons,
            GameId = null,
            ClaimDate = day.Date,
            ClaimedAt = DateTime.Now
        };
}
