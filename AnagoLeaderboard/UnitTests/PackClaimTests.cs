using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models.RequestParameters;
using AnagoLeaderboard.Models.Results;
using AnagoLeaderboard.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace UnitTests
{
    /// <summary>
    /// Claiming a pack, against real SQLite rather than the in-memory provider.
    ///
    /// The same reasoning as <see cref="PlayerCollectionTests"/>, and here it matters more: the
    /// unique indexes on PackClaim <em>are</em> the double-claim guard - there is no check in
    /// the service to test instead - and the in-memory provider enforces neither them nor the
    /// cascades, so it would pass these no matter what the mapping said.
    /// </summary>
    [TestFixture]
    public class PackClaimTests
    {
        private SqliteConnection _connection;
        private DatabaseContext _dbContext;
        private GameService _gameService;
        private PackService _packService;
        private CollectionService _collectionService;

        [SetUp]
        public void Setup()
        {
            // Held open for the fixture's lifetime - see PlayerCollectionTests.
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<DatabaseContext>()
                .UseSqlite(_connection)
                .Options;

            _dbContext = new DatabaseContext(options);
            _dbContext.Database.EnsureCreated();

            var cardRatingCalculator = new CardRatingCalculator();
            _gameService = new GameService(_dbContext);
            var leaderBoardService = new LeaderBoardService(_gameService, _dbContext);
            var cardPoolService = new CardPoolService(leaderBoardService, cardRatingCalculator);

            _packService = new PackService(
                _dbContext, leaderBoardService, cardPoolService, cardRatingCalculator);

            _collectionService = new CollectionService(
                _dbContext, leaderBoardService, cardPoolService, cardRatingCalculator, _packService);
        }

        [TearDown]
        public void TearDown()
        {
            _dbContext.Dispose();
            _connection.Dispose();
        }

        /* ----------------------------------------------------------------- *
         * The indexes, which are the guard.
         * ----------------------------------------------------------------- */

        [Test]
        public async Task TheSameDailyCannotBeClaimedTwice()
        {
            var player = await AddPlayer("Rik Maas");
            var today = DateTime.Now.Date;

            _dbContext.PackClaims.Add(PackClaim.ForDaily(player.Id, today));
            await _dbContext.SaveChangesAsync();

            _dbContext.PackClaims.Add(PackClaim.ForDaily(player.Id, today));
            Assert.ThrowsAsync<DbUpdateException>(async () => await _dbContext.SaveChangesAsync());
        }

        [Test]
        public async Task TwoGamePacksOnOneDayDoNotCollide()
        {
            var players = await ARosterThatHasPlayed();
            var games = await _dbContext.Games.Select(game => game.Id).Take(2).ToListAsync();
            var today = DateTime.Now.Date;

            // The daily index has to be filtered on Source. Unfiltered it would forbid exactly
            // this, which is the normal case for anyone who plays twice in an afternoon.
            _dbContext.PackClaims.Add(PackClaim.ForGame(players[0].Id, games[0], today));
            _dbContext.PackClaims.Add(PackClaim.ForGame(players[0].Id, games[1], today));
            _dbContext.PackClaims.Add(PackClaim.ForDaily(players[0].Id, today));

            Assert.DoesNotThrowAsync(async () => await _dbContext.SaveChangesAsync());
        }

        [Test]
        public async Task TheSameGamePackCannotBeClaimedTwice()
        {
            var players = await ARosterThatHasPlayed();
            var gameId = await _dbContext.Games.Select(game => game.Id).FirstAsync();
            var today = DateTime.Now.Date;

            _dbContext.PackClaims.Add(PackClaim.ForGame(players[0].Id, gameId, today));
            await _dbContext.SaveChangesAsync();

            _dbContext.PackClaims.Add(PackClaim.ForGame(players[0].Id, gameId, today));
            Assert.ThrowsAsync<DbUpdateException>(async () => await _dbContext.SaveChangesAsync());
        }

        [Test]
        public async Task AClaimCannotOutliveItsPlayer()
        {
            var players = await ARosterThatHasPlayed();
            _dbContext.PackClaims.Add(PackClaim.ForDaily(players[0].Id, DateTime.Now.Date));
            await _dbContext.SaveChangesAsync();

            _dbContext.Players.Remove(await _dbContext.Players.SingleAsync(p => p.Id == players[0].Id));
            await _dbContext.SaveChangesAsync();

            Assert.That(await _dbContext.PackClaims.CountAsync(), Is.EqualTo(0));
        }

        /* ----------------------------------------------------------------- *
         * Claiming.
         * ----------------------------------------------------------------- */

        [Test]
        public async Task ClaimingTheDaily_MintsACardThatSurvives()
        {
            var players = await ARosterThatHasPlayed();
            var me = players[0];
            await _collectionService.CreateCollection(me.Id, "navy");

            var before = await _collectionService.GetCollection(me.Id);
            var daily = before!.Packs.Single(pack => pack.Id.StartsWith("daily:"));

            var result = await _packService.Claim(me.Id, daily.Id);

            Assert.That(result.Outcome, Is.EqualTo(ClaimOutcome.Claimed));
            Assert.That(result.Cards!.Count, Is.EqualTo(1));
            Assert.That(result.Cards[0].IsNew, Is.True);
            Assert.That(result.Cards[0].Copies, Is.EqualTo(1));

            // Filed, not just reported: a fresh read of the collection has it.
            var after = await _collectionService.GetCollection(me.Id);
            Assert.That(after!.Owned.Sum(owned => owned.Count), Is.EqualTo(1));
            Assert.That(
                after.Owned.Single().PlayerId,
                Is.EqualTo(result.Cards[0].Player.Id));

            // And the packet is off the shelf.
            Assert.That(after.Packs.Any(pack => pack.Id == daily.Id), Is.False);
        }

        [Test]
        public async Task ASecondCopyIsNotNewAndCounts()
        {
            // A roster where exactly one player is over the games gate, so the draw has only one
            // card it can possibly produce and the second pull is certain to be a duplicate.
            var me = await ARosterWhereOnlyOnePlayerIsCollectable();
            await _collectionService.CreateCollection(me.Id, "navy");

            var first = await ClaimTheDaily(me.Id);

            // Backdated rather than deleted, so today's freebie comes back while the card it
            // minted stays: CardInstance cascades from PackClaim, so removing the row would
            // empty the collection and the second pull would be new again.
            await _dbContext.PackClaims.ExecuteUpdateAsync(
                claims => claims.SetProperty(claim => claim.ClaimDate, DateTime.Now.Date.AddDays(-1)));
            _dbContext.ChangeTracker.Clear();

            var second = await ClaimTheDaily(me.Id);

            Assert.That(first.Cards!.Single().Player.Id, Is.EqualTo(me.Id));
            Assert.That(first.Cards.Single().IsNew, Is.True);
            Assert.That(first.Cards.Single().Copies, Is.EqualTo(1));

            Assert.That(second.Cards!.Single().IsNew, Is.False);
            Assert.That(second.Cards.Single().Copies, Is.EqualTo(2));
        }

        [Test]
        public async Task CompletingTheActiveSetLatchesTheLegendsOpen()
        {
            // The same one-player pool: completing the set is one card away, which is the only
            // way to reach the latch inside a test.
            var me = await ARosterWhereOnlyOnePlayerIsCollectable();
            await _collectionService.CreateCollection(me.Id, "navy");

            Assert.That((await _collectionService.GetCollection(me.Id))!.LegendsUnlocked, Is.False);

            await ClaimTheDaily(me.Id);

            Assert.That((await _collectionService.GetCollection(me.Id))!.LegendsUnlocked, Is.True);
        }

        [Test]
        public async Task ClaimingTwiceIsRefused()
        {
            var players = await ARosterThatHasPlayed();
            var me = players[0];
            await _collectionService.CreateCollection(me.Id, "navy");

            var state = await _collectionService.GetCollection(me.Id);
            var daily = state!.Packs.Single(pack => pack.Id.StartsWith("daily:"));

            Assert.That(
                (await _packService.Claim(me.Id, daily.Id)).Outcome,
                Is.EqualTo(ClaimOutcome.Claimed));

            // The second attempt never reaches the index - the pack is no longer derived - so
            // this is the ordinary refusal rather than the race.
            Assert.That(
                (await _packService.Claim(me.Id, daily.Id)).Outcome,
                Is.EqualTo(ClaimOutcome.NotAvailable));
        }

        [Test]
        public async Task WithoutAnAlbumThereIsNothingToClaimInto()
        {
            var players = await ARosterThatHasPlayed();

            var result = await _packService.Claim(players[0].Id, "daily:" + Today());

            Assert.That(result.Outcome, Is.EqualTo(ClaimOutcome.NoAlbum));
        }

        [Test]
        public async Task AnInventedPackIdIsRefused()
        {
            var players = await ARosterThatHasPlayed();
            await _collectionService.CreateCollection(players[0].Id, "navy");

            Assert.That(
                (await _packService.Claim(players[0].Id, "game:made-up")).Outcome,
                Is.EqualTo(ClaimOutcome.NotAvailable));

            Assert.That(
                (await _packService.Claim(players[0].Id, "daily:2020-01-01")).Outcome,
                Is.EqualTo(ClaimOutcome.NotAvailable));
        }

        [Test]
        public async Task AnUnderGatePlayerCannotClaim()
        {
            var players = await ARosterThatHasPlayed();
            var newcomer = await AddPlayer("Nieuw");

            // Given an album by hand, since the create endpoint would refuse them one too.
            _dbContext.PlayerCollections.Add(PlayerCollection.Create(newcomer.Id, "navy"));
            await _dbContext.SaveChangesAsync();

            var result = await _packService.Claim(newcomer.Id, "daily:" + Today());

            Assert.That(result.Outcome, Is.EqualTo(ClaimOutcome.NotEligible));
            Assert.That(players, Is.Not.Empty);
        }

        [Test]
        public async Task DeletingAGameTakesTheCardsItMinted()
        {
            var players = await ARosterThatHasPlayed();
            var me = players[0];
            await _collectionService.CreateCollection(me.Id, "navy");

            var state = await _collectionService.GetCollection(me.Id);
            var gamePack = state!.Packs.First(pack => pack.Id.StartsWith("game:"));
            var gameId = gamePack.Id["game:".Length..];

            await _packService.Claim(me.Id, gamePack.Id);
            Assert.That(await _dbContext.CardInstances.CountAsync(), Is.GreaterThan(0));

            await _gameService.DeleteGame(gameId);

            // Pack size depends on the score, so correcting a game by deleting it has to take
            // the cards it paid out with it.
            Assert.That(await _dbContext.CardInstances.CountAsync(), Is.EqualTo(0));
            Assert.That(await _dbContext.PackClaims.CountAsync(), Is.EqualTo(0));
        }

        [Test]
        public async Task EmptyingACollectionTakesTheCardsAndTheClaims()
        {
            var players = await ARosterThatHasPlayed();
            var me = players[0];
            await _collectionService.CreateCollection(me.Id, "navy");
            await ClaimTheDaily(me.Id);

            var state = await _collectionService.DeleteCollection(me.Id);

            Assert.That(state!.Album, Is.Null);
            Assert.That(state.Owned, Is.Empty);
            Assert.That(await _dbContext.CardInstances.CountAsync(), Is.EqualTo(0));
            Assert.That(await _dbContext.PackClaims.CountAsync(), Is.EqualTo(0));
        }

        [Test]
        public async Task PacksAreOnlyOfferedOnceThereIsABook()
        {
            var players = await ARosterThatHasPlayed();

            var without = await _collectionService.GetCollection(players[0].Id);
            Assert.That(without!.Album, Is.Null);
            Assert.That(without.Packs, Is.Empty);

            await _collectionService.CreateCollection(players[0].Id, "navy");

            var with = await _collectionService.GetCollection(players[0].Id);
            Assert.That(with!.Packs, Is.Not.Empty);
        }

        /* ----------------------------------------------------------------- */

        private static string Today() => DateTime.Now.ToString("yyyy-MM-dd");

        private async Task<ClaimResult> ClaimTheDaily(string playerId)
        {
            var state = await _collectionService.GetCollection(playerId);
            var daily = state!.Packs.Single(pack => pack.Id.StartsWith("daily:"));
            return await _packService.Claim(playerId, daily.Id);
        }

        private async Task<Player> AddPlayer(string name)
        {
            var player = Player.CreatePlayer(new PlayerForm { Name = name });
            _dbContext.Players.Add(player);
            await _dbContext.SaveChangesAsync();
            return player;
        }

        /// <summary>
        /// Four players and six games between them today, so everybody is over the games gate
        /// and everybody has game packs waiting.
        /// </summary>
        private async Task<List<Player>> ARosterThatHasPlayed()
        {
            var players = new List<Player>();
            foreach (var name in new[] { "Rik", "Petar", "Ton", "Mark" })
            {
                players.Add(await AddPlayer(name));
            }

            var pairings = new[]
            {
                (0, 1, 2, 3), (0, 2, 1, 3), (0, 3, 1, 2),
                (1, 2, 0, 3), (1, 3, 0, 2), (2, 3, 0, 1)
            };

            foreach (var (a, b, c, d) in pairings)
            {
                await _gameService.CreateGame(
                    new GameForm
                    {
                        FirstTeamForm = new TeamPerformanceForm
                        {
                            FirstPlayerId = players[a].Id,
                            SecondPlayerId = players[b].Id,
                            Goals = 10
                        },
                        SecondTeamForm = new TeamPerformanceForm
                        {
                            FirstPlayerId = players[c].Id,
                            SecondPlayerId = players[d].Id,
                            Goals = 6
                        }
                    });
            }

            return players;
        }

        /// <summary>
        /// One player in six games against nine others who each turn up twice, so only they are
        /// over the games gate.
        ///
        /// That makes the card pool a single player, which is what lets a test say anything
        /// certain about a weighted random draw.
        /// </summary>
        private async Task<Player> ARosterWhereOnlyOnePlayerIsCollectable()
        {
            var me = await AddPlayer("Rik");

            var others = new List<Player>();
            for (var i = 0; i < 9; i++)
            {
                others.Add(await AddPlayer($"Speler {i}"));
            }

            for (var game = 0; game < 6; game++)
            {
                await _gameService.CreateGame(
                    new GameForm
                    {
                        FirstTeamForm = new TeamPerformanceForm
                        {
                            FirstPlayerId = me.Id,
                            SecondPlayerId = others[game * 3 % 9].Id,
                            Goals = 10
                        },
                        SecondTeamForm = new TeamPerformanceForm
                        {
                            FirstPlayerId = others[(game * 3 + 1) % 9].Id,
                            SecondPlayerId = others[(game * 3 + 2) % 9].Id,
                            Goals = 6
                        }
                    });
            }

            return me;
        }
    }
}
