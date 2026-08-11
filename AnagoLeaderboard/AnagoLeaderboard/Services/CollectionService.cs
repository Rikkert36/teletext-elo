using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models.Results;
using Microsoft.EntityFrameworkCore;

namespace AnagoLeaderboard.Services;

/// <summary>
/// A player's state over the card pool: whether they have an album, what it is bound in, and
/// what is in it.
///
/// Reads go through <see cref="CardPoolService"/> rather than building their own list of
/// collectable players, so the collection page and <c>GET api/cards/pool</c> cannot disagree
/// about who is in the set.
/// </summary>
public class CollectionService
{
    private readonly DatabaseContext _dbContext;
    private readonly LeaderBoardService _leaderBoardService;
    private readonly CardPoolService _cardPoolService;
    private readonly CardRatingCalculator _cardRatingCalculator;
    private readonly PackService _packService;

    public CollectionService(
        DatabaseContext dbContext,
        LeaderBoardService leaderBoardService,
        CardPoolService cardPoolService,
        CardRatingCalculator cardRatingCalculator,
        PackService packService)
    {
        _dbContext = dbContext;
        _leaderBoardService = leaderBoardService;
        _cardPoolService = cardPoolService;
        _cardRatingCalculator = cardRatingCalculator;
        _packService = packService;
    }

    /// <summary>
    /// Everything the collection page draws. Null when there is no such player.
    ///
    /// A player with no album still gets a full response with <c>Album</c> null - that is the
    /// flag the opening sequence keys off, and it has to be distinguishable from "no such
    /// player", which is what makes this a nullable return rather than a 404 for both.
    /// </summary>
    public async Task<CollectionState?> GetCollection(string playerId)
    {
        if (!await _dbContext.Players.AnyAsync(player => player.Id == playerId))
        {
            return null;
        }

        var collection = await _dbContext.PlayerCollections
            .SingleOrDefaultAsync(c => c.PlayerId == playerId);

        return await Build(playerId, collection);
    }

    /// <summary>
    /// Fetches the player an album in the leather they picked.
    ///
    /// Idempotent: a player who already has one gets their existing state back rather than a
    /// failed insert. Two tabs, a double click and a retried request all land here, and a
    /// cover choice is not a claim - there is nothing worth telling the user about.
    /// </summary>
    public async Task<CreateCollectionResult> CreateCollection(string playerId, string? cover)
    {
        if (!AlbumCovers.IsKnown(cover))
        {
            return new CreateCollectionResult(CreateCollectionOutcome.UnknownCover, null);
        }

        if (!await _dbContext.Players.AnyAsync(player => player.Id == playerId))
        {
            return new CreateCollectionResult(CreateCollectionOutcome.PlayerNotFound, null);
        }

        var existing = await _dbContext.PlayerCollections
            .SingleOrDefaultAsync(c => c.PlayerId == playerId);

        if (existing is not null)
        {
            return new CreateCollectionResult(
                CreateCollectionOutcome.AlreadyExists,
                await Build(playerId, existing));
        }

        // Checked here and not only in the browser. Without it an under-gate player can spend
        // the whole opening sequence, have a row written, and then land on the games-gate
        // notice with the ceremony already used up.
        var state = await Build(playerId, null);
        if (state is null || !state.Eligible)
        {
            return new CreateCollectionResult(CreateCollectionOutcome.NotEligible, state);
        }

        var collection = PlayerCollection.Create(playerId, cover!);
        _dbContext.PlayerCollections.Add(collection);
        await _dbContext.SaveChangesAsync();

        return new CreateCollectionResult(
            CreateCollectionOutcome.Created,
            await Build(playerId, collection));
    }

    /// <summary>
    /// Puts the album back on the table: deletes the collection row, so the player walks the
    /// opening sequence again.
    ///
    /// Development only - see <see cref="Controllers.CollectionsController"/>. It exists
    /// because the opening sequence is the one part of this feature that can only be watched
    /// once per player, and "sign in as somebody else" is a poor substitute when the thing
    /// being judged is how it feels for *you*. Deliberately not a production endpoint: outside
    /// development there is no reason to destroy a collection.
    ///
    /// It takes the cards and the claims with it. Neither cascades from the album row - they
    /// hang off the player, not off the collection - but "back to the start of the story" means
    /// an empty book and today's packets back on the shelf, and leaving either behind would put
    /// the player on a cover choice with a collection still underneath it.
    ///
    /// Idempotent, like create: no row is the state being asked for, so it is not an error.
    /// </summary>
    public async Task<CollectionState?> DeleteCollection(string playerId)
    {
        if (!await _dbContext.Players.AnyAsync(player => player.Id == playerId))
        {
            return null;
        }

        var existing = await _dbContext.PlayerCollections
            .SingleOrDefaultAsync(c => c.PlayerId == playerId);

        var cards = await _dbContext.CardInstances
            .Where(card => card.PlayerId == playerId)
            .ToListAsync();

        var claims = await _dbContext.PackClaims
            .Where(claim => claim.PlayerId == playerId)
            .ToListAsync();

        _dbContext.CardInstances.RemoveRange(cards);
        _dbContext.PackClaims.RemoveRange(claims);

        if (existing is not null)
        {
            _dbContext.PlayerCollections.Remove(existing);
        }

        await _dbContext.SaveChangesAsync();

        return await Build(playerId, null);
    }

    /// <summary>
    /// Sets or clears the legends latch by hand. **Development only** - see
    /// <see cref="Controllers.CollectionsController"/>.
    ///
    /// The latch is real now: it is written by the claim endpoint when the active set is
    /// completed, which at the published odds is a three-month proposition. There is no other
    /// way to look at an icoon in a book, so there is a switch.
    /// </summary>
    public async Task<CollectionState?> SetLegendsUnlocked(string playerId, bool unlocked)
    {
        var collection = await _dbContext.PlayerCollections
            .SingleOrDefaultAsync(c => c.PlayerId == playerId);

        if (collection is null)
        {
            return null;
        }

        collection.LegendsUnlockedAt = unlocked ? collection.LegendsUnlockedAt ?? DateTime.Now : null;
        await _dbContext.SaveChangesAsync();

        return await Build(playerId, collection);
    }

    /// <summary>
    /// One leaderboard replay, shared by the pool and by the player's own game count.
    ///
    /// The count cannot come out of the pool - <see cref="CardPoolService"/> filters out
    /// everyone under the gate, which is exactly the player this has to be able to describe -
    /// and it deliberately does not come from <c>Player.NumberOfGames</c> either: that is a
    /// stored counter, while pool membership is decided by the replayed one, so reading the
    /// column could report somebody eligible who is absent from the pool.
    /// </summary>
    private async Task<CollectionState?> Build(string playerId, PlayerCollection? collection)
    {
        var (players, allGames) = await _leaderBoardService.GetLeaderBoard();
        var pool = _cardPoolService.GetPool(players);

        // Absent from the replay means no games at all: it is built up per game, so a player
        // who has never played is in Players and nowhere else.
        var rated = players.SingleOrDefault(player => player.Id == playerId);
        var numberOfGames = rated?.NumberOfGames ?? 0;

        var legendsUnlocked = collection?.LegendsUnlockedAt is not null;

        var owned = (await _packService.CountsBySubject(playerId))
            .Select(count => new OwnedCard(count.Key, count.Value))
            .ToList();

        // No book, no packets. They would have nowhere to be filed - the claim endpoint refuses
        // for the same reason - and the shelf would otherwise appear beside the five shut
        // albums, before the player has started a collection at all.
        //
        // The replayed games are handed over rather than re-queried: PackService sizes packs
        // from the old ratings that only exist inside a replay.
        var packs = collection is null
            ? Array.Empty<AvailablePack>()
            : await _packService.GetAvailable(playerId, allGames);

        return new CollectionState(
            playerId,
            collection is null ? null : new AlbumBinding(collection.Cover, collection.CreatedAt),
            numberOfGames >= _cardRatingCalculator.MinGames,
            numberOfGames,
            _cardRatingCalculator.MinGames,
            owned,
            packs,
            legendsUnlocked,
            pool.Actives,
            // The legends set is not a secret - what unlocking changes is whether they turn up
            // in your packs and your book - but sending them before that would put icoons in
            // the album's slot order, which is built from exactly this list.
            legendsUnlocked ? pool.Legends : Array.Empty<CardSubject>());
    }
}

public enum CreateCollectionOutcome
{
    Created,
    AlreadyExists,
    PlayerNotFound,
    NotEligible,
    UnknownCover
}

/// <param name="State">
/// Present for every outcome that has one to report, including <c>NotEligible</c> - the page
/// can then show how far off the player is without a second request.
/// </param>
public sealed record CreateCollectionResult(CreateCollectionOutcome Outcome, CollectionState? State);
