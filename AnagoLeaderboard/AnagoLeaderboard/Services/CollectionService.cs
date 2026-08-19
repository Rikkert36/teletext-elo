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
    /// Claims the icons: the collector has the whole active set and is pressing the seal.
    ///
    /// <strong>This is the only thing that latches the unlock.</strong> Completing the set no
    /// longer writes anything - see <see cref="PackService.Claim"/> for why the latch is not
    /// there - so the endpoint has to check the set itself rather than trust that something
    /// upstream already did.
    ///
    /// One replay, like <see cref="ClaimPack"/>: the pool to check the set against and the state
    /// to answer with both come out of it. A second replay here would double the cost of the one
    /// request in this feature that is guaranteed to be somebody's favourite moment.
    /// </summary>
    /// <param name="unlocked">
    /// False relocks. Development only, and only reachable with <paramref name="force"/> - a
    /// collector cannot un-earn their own album.
    /// </param>
    /// <param name="force">
    /// Skips the completeness check. Development only. Earning this legitimately is a
    /// three-month proposition, and without a bypass there is no way to look at an icoon in a
    /// book at all.
    /// </param>
    public async Task<IconsResult> SetIconsUnlocked(string playerId, bool unlocked, bool force)
    {
        if (!await _dbContext.Players.AnyAsync(player => player.Id == playerId))
        {
            return new IconsResult(IconsOutcome.PlayerNotFound, null);
        }

        var collection = await _dbContext.PlayerCollections
            .SingleOrDefaultAsync(c => c.PlayerId == playerId);

        // Nothing to bind the icons into. Distinct from PlayerNotFound because the two want
        // different answers from the UI - one is a bad id, the other is a player who has simply
        // not started a collection.
        if (collection is null)
        {
            return new IconsResult(IconsOutcome.NoAlbum, null);
        }

        if (!unlocked)
        {
            collection.IconsUnlockedAt = null;
            await _dbContext.SaveChangesAsync();

            return new IconsResult(IconsOutcome.Relocked, await Build(playerId, collection));
        }

        // Idempotent, and the timestamp is deliberately left alone: two tabs racing the seal, or
        // a retried request, must not move the date somebody earned.
        if (collection.IconsUnlockedAt is not null)
        {
            return new IconsResult(IconsOutcome.AlreadyUnlocked, await Build(playerId, collection));
        }

        var (players, allGames) = await _leaderBoardService.GetLeaderBoard();
        var pool = _cardPoolService.GetPool(players);

        if (!force)
        {
            var counts = await _packService.CountsBySubject(playerId);

            // The server is the authority on this, not the seal. The client decides whether to
            // *show* the seal from the same predicate, but a stale page - a card deleted with its
            // game, a player reactivated since the last fetch - could offer one that is no longer
            // earned, and the answer to that is a refusal rather than a free unlock.
            if (!CardPoolService.ActiveSetComplete(pool, counts))
            {
                return new IconsResult(IconsOutcome.SetIncomplete, null);
            }
        }

        collection.IconsUnlockedAt = DateTime.Now;
        await _dbContext.SaveChangesAsync();

        // Built from the replay above rather than a fresh one. Latching the icons cannot move a
        // rating, so that roster is still current - and `collection` is tracked, so the state
        // below reports the unlock, and the icons it just admitted to the book, in this response.
        return new IconsResult(
            IconsOutcome.Unlocked,
            await Build(playerId, collection, players, allGames, pool));
    }

    /// <summary>
    /// Opens a pack and reports the collection it changed.
    ///
    /// **The whole point of this method is that there is exactly one replay in it.** Claiming
    /// needs the pool to roll from and the replayed games to derive from; the page then needs
    /// the new state. Both used to be separate requests doing a full O(all games) replay each,
    /// so opening one pack cost two - the same trap <c>CreateCollection</c> avoided by
    /// returning the whole page rather than letting the client refetch.
    ///
    /// So the replay lives here, at the top, and everything below is handed it.
    /// <see cref="PackService"/> deliberately cannot do this for itself.
    /// </summary>
    public async Task<ClaimResult> ClaimPack(string playerId, string packId)
    {
        if (!await _dbContext.Players.AnyAsync(player => player.Id == playerId))
        {
            return new ClaimResult(ClaimOutcome.PlayerNotFound, null, null);
        }

        var collection = await _dbContext.PlayerCollections
            .SingleOrDefaultAsync(c => c.PlayerId == playerId);

        // There has to be a book to file them in. The row's existence is what says a collection
        // was ever started, so minting cards without one would leave them nowhere.
        if (collection is null)
        {
            return new ClaimResult(ClaimOutcome.NoAlbum, null, null);
        }

        var (players, allGames) = await _leaderBoardService.GetLeaderBoard();
        var pool = _cardPoolService.GetPool(players);

        var rated = players.SingleOrDefault(player => player.Id == playerId);
        if ((rated?.NumberOfGames ?? 0) < _cardRatingCalculator.MinGames)
        {
            return new ClaimResult(ClaimOutcome.NotEligible, null, null);
        }

        var result = await _packService.Claim(playerId, packId, collection, pool, allGames);

        if (result.Outcome != ClaimOutcome.Claimed)
        {
            return new ClaimResult(result.Outcome, null, null);
        }

        // Reusing the replay across the write is safe, and worth being explicit about: opening a
        // pack mints cards and cannot move anybody's rating, so the roster this was built from is
        // still current. It also means the state below is built from the same counts the claim
        // just added to - so a pack that fills the last empty active slot reports
        // Album.IconsClaimable true in the very response that revealed the card, and the seal is
        // on the table by the time the reveal ends.
        return new ClaimResult(
            ClaimOutcome.Claimed,
            result.Cards,
            await Build(playerId, collection, players, allGames, pool));
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
    private async Task<CollectionState> Build(string playerId, PlayerCollection? collection)
    {
        var (players, allGames) = await _leaderBoardService.GetLeaderBoard();

        return await Build(playerId, collection, players, allGames, _cardPoolService.GetPool(players));
    }

    /// <summary>
    /// The page, from a roster that has already been replayed.
    ///
    /// Split out for <see cref="ClaimPack"/>, which has to replay before it can claim and would
    /// otherwise pay for a second one to describe the result. Same reason
    /// <see cref="CardPoolService.GetPool(IReadOnlyList{DynamicRatingPlayer})"/> exists.
    /// </summary>
    private async Task<CollectionState> Build(
        string playerId,
        PlayerCollection? collection,
        IReadOnlyList<DynamicRatingPlayer> players,
        IReadOnlyList<Game> allGames,
        CardPool pool)
    {
        // Absent from the replay means no games at all: it is built up per game, so a player
        // who has never played is in Players and nowhere else.
        var rated = players.SingleOrDefault(player => player.Id == playerId);
        var numberOfGames = rated?.NumberOfGames ?? 0;

        var iconsUnlocked = collection?.IconsUnlockedAt is not null;

        var counts = await _packService.CountsBySubject(playerId);

        var owned = counts
            .Select(count => new OwnedCard(count.Key, count.Value.AsPlayer, count.Value.AsIcon))
            .ToList();

        // No book, no packets. They would have nowhere to be filed - the claim endpoint refuses
        // for the same reason - and the shelf would otherwise appear beside the five shut
        // albums, before the player has started a collection at all.
        //
        // The replayed games are handed over rather than re-queried: PackService sizes packs
        // from the old ratings that only exist inside a replay.
        // The pool and the counts are handed over for the set-completion packet, whose whole
        // availability is a question about them. Without them it is simply not offered.
        var packs = collection is null
            ? Array.Empty<AvailablePack>()
            : await _packService.GetAvailable(playerId, allGames, pool, counts);

        return new CollectionState(
            playerId,
            collection is null
                ? null
                : new AlbumBinding(collection.Cover, collection.CreatedAt, iconsUnlocked),
            numberOfGames >= _cardRatingCalculator.MinGames,
            numberOfGames,
            _cardRatingCalculator.MinGames,
            owned,
            packs,
            pool.Actives,
            // The icons set is not a secret - what unlocking changes is whether they turn up
            // in your packs and your book - but sending them before that would put icoons in
            // the album's slot order, which is built from exactly this list.
            iconsUnlocked ? pool.Icons : Array.Empty<CardSubject>());
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

/// <summary>
/// What came out of the packet, and the collection as it now stands.
/// </summary>
/// <param name="State">
/// Only on success, unlike <see cref="CreateCollectionResult"/>. A refused claim changes
/// nothing, so whatever the page is already showing is still right - and building a state to
/// say so would cost the replay this whole method exists to save.
/// </param>
public sealed record ClaimResult(
    ClaimOutcome Outcome,
    IReadOnlyList<RevealedCard>? Cards,
    CollectionState? State);

public enum IconsOutcome
{
    /// <summary>The latch was pulled, by earning it or by the development bypass.</summary>
    Unlocked,

    /// <summary>Already earned. Idempotent, and the original date is untouched.</summary>
    AlreadyUnlocked,

    /// <summary>Put back. Development only.</summary>
    Relocked,

    PlayerNotFound,

    /// <summary>No album, so there is nothing for the icons to be bound into.</summary>
    NoAlbum,

    /// <summary>
    /// The active set is not finished, so there is nothing to claim. A refusal rather than a
    /// silent no-op: the only way to reach it is a client offering a seal it should not have,
    /// and that is worth telling it about.
    /// </summary>
    SetIncomplete
}

/// <param name="State">
/// Absent only for the outcomes that changed nothing and have nothing to describe. In
/// particular <c>SetIncomplete</c> carries none, because building one would spend a replay on
/// telling a page something it could already see.
/// </param>
public sealed record IconsResult(IconsOutcome Outcome, CollectionState? State);
