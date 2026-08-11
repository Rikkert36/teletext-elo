using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models.RequestParameters;
using AnagoLeaderboard.Models.Results;
using AnagoLeaderboard.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace UnitTests
{
    /// <summary>
    /// The album row, against real SQLite rather than the in-memory provider.
    ///
    /// That choice is the whole point of this fixture. The cascade from Players to
    /// PlayerCollections is enforced by the *database*, not by EF's change tracker -
    /// <c>PlayerService.DeletePlayer</c> never loads a collection, so there is nothing tracked
    /// for EF to cascade - and the in-memory provider has no referential integrity at all, so
    /// it would pass this test no matter what the mapping said. SQLite also defaults
    /// <c>PRAGMA foreign_keys</c> to OFF, which is exactly the kind of thing worth proving
    /// rather than assuming.
    /// </summary>
    [TestFixture]
    public class PlayerCollectionTests
    {
        private SqliteConnection _connection;
        private DatabaseContext _dbContext;

        [SetUp]
        public void Setup()
        {
            // Held open for the fixture's lifetime: an in-memory SQLite database exists only as
            // long as a connection to it does, so letting EF open and close its own would
            // discard the schema between calls.
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<DatabaseContext>()
                .UseSqlite(_connection)
                .Options;

            _dbContext = new DatabaseContext(options);
            // Built from the model, so this also checks that the fluent configuration actually
            // produces the shared primary key and the cascade.
            _dbContext.Database.EnsureCreated();
        }

        [TearDown]
        public void TearDown()
        {
            _dbContext.Dispose();
            _connection.Dispose();
        }

        private async Task<Player> AddPlayer(string name)
        {
            var player = Player.CreatePlayer(new PlayerForm { Name = name });
            _dbContext.Players.Add(player);
            await _dbContext.SaveChangesAsync();
            return player;
        }

        [Test]
        public async Task Collection_SharesItsPrimaryKeyWithThePlayer()
        {
            var player = await AddPlayer("Rik Maas");

            _dbContext.PlayerCollections.Add(PlayerCollection.Create(player.Id, "navy"));
            await _dbContext.SaveChangesAsync();

            var stored = await _dbContext.PlayerCollections.SingleAsync();
            Assert.That(stored.PlayerId, Is.EqualTo(player.Id));
            Assert.That(stored.Cover, Is.EqualTo("navy"));
            Assert.That(stored.LegendsUnlockedAt, Is.Null);
        }

        [Test]
        public async Task Collection_CannotExistWithoutItsPlayer()
        {
            _dbContext.PlayerCollections.Add(PlayerCollection.Create("nobody", "navy"));

            Assert.ThrowsAsync<DbUpdateException>(async () => await _dbContext.SaveChangesAsync());
        }

        /// <summary>
        /// The one that matters. Deleting a player has to take their album with it - not for
        /// tidiness, but because <c>PlayerService.DeletePlayer</c> does not know collections
        /// exist, so without the cascade deleting an accidentally-created player would start
        /// failing on a foreign key violation the moment that player owned one.
        /// </summary>
        [Test]
        public async Task DeletingAPlayer_TakesTheirCollectionWithThem()
        {
            var player = await AddPlayer("Weg Ermee");
            _dbContext.PlayerCollections.Add(PlayerCollection.Create(player.Id, "charcoal"));
            await _dbContext.SaveChangesAsync();

            Assert.That(await _dbContext.PlayerCollections.CountAsync(), Is.EqualTo(1));

            _dbContext.Players.Remove(player);
            await _dbContext.SaveChangesAsync();

            Assert.That(await _dbContext.PlayerCollections.CountAsync(), Is.EqualTo(0));
        }

        /// <summary>
        /// Two tabs, or a double click, cannot produce two albums.
        ///
        /// Deliberately through a *second* context over the same database. Adding a duplicate
        /// to the one context is caught by the change tracker before any SQL is generated, which
        /// proves nothing about the schema - and a race is by definition two requests with a
        /// scoped context each. This is what makes the create endpoint's idempotency a
        /// guarantee rather than a race it happens to usually win.
        /// </summary>
        [Test]
        public async Task Collection_IsOnePerPlayer_EvenAcrossTwoContexts()
        {
            var player = await AddPlayer("Twee Keer");
            _dbContext.PlayerCollections.Add(PlayerCollection.Create(player.Id, "navy"));
            await _dbContext.SaveChangesAsync();

            var options = new DbContextOptionsBuilder<DatabaseContext>()
                .UseSqlite(_connection)
                .Options;

            await using var other = new DatabaseContext(options);
            other.PlayerCollections.Add(PlayerCollection.Create(player.Id, "tan"));

            Assert.ThrowsAsync<DbUpdateException>(async () => await other.SaveChangesAsync());

            // And the first one is untouched: a losing race must not restain the winner's book.
            var stored = await _dbContext.PlayerCollections.SingleAsync();
            Assert.That(stored.Cover, Is.EqualTo("navy"));
        }

        [TestCase("oxblood")]
        [TestCase("forest")]
        [TestCase("navy")]
        [TestCase("tan")]
        [TestCase("charcoal")]
        public void AlbumCovers_KnowsEveryStainTheUiOffers(string cover)
        {
            Assert.That(AlbumCovers.IsKnown(cover), Is.True);
        }

        [TestCase("purple")]
        [TestCase("Navy")]
        [TestCase("")]
        [TestCase(null)]
        public void AlbumCovers_RejectsAnythingElse(string cover)
        {
            Assert.That(AlbumCovers.IsKnown(cover), Is.False);
        }

        [Test]
        public void AlbumCovers_DefaultIsOneOfThem()
        {
            Assert.That(AlbumCovers.IsKnown(AlbumCovers.Default), Is.True);
        }

        /* ------------------------------------------------------------------ *
         * CollectionService
         *
         * Every path here is reachable with no games in the database, which is what keeps the
         * setup honest — the happy path needs five games across four players each and is
         * covered end to end against the real roster instead.
         * ------------------------------------------------------------------ */

        private CollectionService BuildService()
        {
            var calculator = new CardRatingCalculator();
            var gameService = new GameService(_dbContext);
            var leaderBoardService = new LeaderBoardService(gameService, _dbContext);
            var poolService = new CardPoolService(leaderBoardService, calculator);
            var packService = new PackService(_dbContext, leaderBoardService, poolService, calculator);
            return new CollectionService(
                _dbContext, leaderBoardService, poolService, calculator, packService);
        }

        [Test]
        public async Task Get_ForAPlayerWhoHasNeverPlayed_DescribesThemRatherThanHidingThem()
        {
            var player = await AddPlayer("Nooit Gespeeld");

            var state = await BuildService().GetCollection(player.Id);

            // The whole point of the games gate having copy: a player who cannot collect yet
            // still gets a full response saying how far off they are.
            Assert.That(state, Is.Not.Null);
            Assert.That(state!.Album, Is.Null);
            Assert.That(state.Eligible, Is.False);
            // Absent from the replay entirely, which must read as zero rather than throw.
            Assert.That(state.NumberOfGames, Is.EqualTo(0));
            Assert.That(state.MinGames, Is.EqualTo(5));
        }

        [Test]
        public async Task Get_ForAnUnknownPlayer_IsNull()
        {
            Assert.That(await BuildService().GetCollection("nobody"), Is.Null);
        }

        [Test]
        public async Task Create_RefusesAnUnknownCover_BeforeTouchingAnythingElse()
        {
            var result = await BuildService().CreateCollection("nobody", "purple");

            // Checked ahead of the player lookup on purpose: a bad colour is the caller's
            // mistake either way, and it is the cheaper answer.
            Assert.That(result.Outcome, Is.EqualTo(CreateCollectionOutcome.UnknownCover));
            Assert.That(await _dbContext.PlayerCollections.CountAsync(), Is.EqualTo(0));
        }

        [Test]
        public async Task Create_RefusesAnUnknownPlayer()
        {
            var result = await BuildService().CreateCollection("nobody", "navy");

            Assert.That(result.Outcome, Is.EqualTo(CreateCollectionOutcome.PlayerNotFound));
        }

        /// <summary>
        /// The one that stops somebody spending the ceremony for nothing: an under-gate player
        /// must be refused *before* a row is written, or they pick a leather, get an album, and
        /// then land on the games-gate notice with the sequence already used up.
        /// </summary>
        [Test]
        public async Task Create_RefusesAnUnderGatePlayer_AndWritesNothing()
        {
            var player = await AddPlayer("Te Weinig Wedstrijden");

            var result = await BuildService().CreateCollection(player.Id, "navy");

            Assert.That(result.Outcome, Is.EqualTo(CreateCollectionOutcome.NotEligible));
            Assert.That(await _dbContext.PlayerCollections.CountAsync(), Is.EqualTo(0));
            // The state still comes back, so the page can say how far off they are without a
            // second request.
            Assert.That(result.State, Is.Not.Null);
            Assert.That(result.State!.NumberOfGames, Is.EqualTo(0));
        }

        [Test]
        public async Task Delete_TakesTheAlbumAway_AndTheCardsWithIt()
        {
            var player = await AddPlayer("Weer Opnieuw");
            _dbContext.PlayerCollections.Add(PlayerCollection.Create(player.Id, "forest"));
            await _dbContext.SaveChangesAsync();

            var state = await BuildService().DeleteCollection(player.Id);

            Assert.That(state, Is.Not.Null);
            Assert.That(state!.Album, Is.Null);
            Assert.That(state.Owned, Is.Empty);
            Assert.That(await _dbContext.PlayerCollections.CountAsync(), Is.EqualTo(0));
        }

        [Test]
        public async Task Delete_IsIdempotent()
        {
            var player = await AddPlayer("Niets Te Wissen");

            // No album is the state being asked for, so this is not an error.
            var state = await BuildService().DeleteCollection(player.Id);

            Assert.That(state, Is.Not.Null);
            Assert.That(state!.Album, Is.Null);
        }

        [Test]
        public async Task Delete_ForAnUnknownPlayer_IsNull()
        {
            Assert.That(await BuildService().DeleteCollection("nobody"), Is.Null);
        }
    }
}
