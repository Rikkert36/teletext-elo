using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models.RequestParameters;
using AnagoLeaderboard.Models.Results;
using AnagoLeaderboard.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace UnitTests
{
    /// <summary>
    /// The opened-pack log behind <c>GET api/packs</c>.
    ///
    /// Against real SQLite for the same reason CardStatisticsTests is, and built the same way:
    /// cards are minted straight onto the table, because what is under test is the grouping and a
    /// weighted random draw cannot be made to produce a known packet. PackClaimTests covers the
    /// drawing.
    /// </summary>
    [TestFixture]
    public class PackHistoryTests
    {
        private SqliteConnection _connection;
        private DatabaseContext _dbContext;
        private GameService _gameService;
        private PackHistoryService _packHistoryService;

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

            _packHistoryService = new PackHistoryService(
                _dbContext, leaderBoardService, cardPoolService);
        }

        [TearDown]
        public void TearDown()
        {
            _dbContext.Dispose();
            _connection.Dispose();
        }

        [Test]
        public async Task NoPacksOpenedIsAnEmptyLogRatherThanAnError()
        {
            await ARosterThatHasPlayed();

            var history = await _packHistoryService.GetHistory();

            Assert.That(history.Packs, Is.Empty);
            Assert.That(history.TotalPacks, Is.Zero);
            Assert.That(history.TotalCards, Is.Zero);
        }

        /// <summary>
        /// The whole point of the route: cards sit under the packet they came out of, and are not
        /// mixed with the ones from the packet next to it.
        /// </summary>
        [Test]
        public async Task CardsAreGroupedUnderThePackTheyCameOutOf()
        {
            var players = await ARosterThatHasPlayed();
            var collector = players[0];

            // Two days, because one collector may only have one daily freebie a day - the unique
            // index on the table says so.
            await Mint(
                collector.Id,
                new[] { players[1].Id, players[2].Id, players[3].Id },
                DateTime.Today.AddDays(-1));
            await Mint(collector.Id, new[] { players[1].Id });

            var history = await _packHistoryService.GetHistory();

            Assert.That(history.TotalPacks, Is.EqualTo(2));
            Assert.That(history.TotalCards, Is.EqualTo(4));
            Assert.That(
                history.Packs.Select(pack => pack.Cards.Count),
                Is.EquivalentTo(new[] { 3, 1 }));
            Assert.That(
                history.Packs.Select(pack => pack.CollectorName),
                Is.All.EqualTo(collector.Name));
        }

        [Test]
        public async Task PacksAreNewestFirst()
        {
            var players = await ARosterThatHasPlayed();

            var first = await Mint(players[0].Id, new[] { players[1].Id });
            var second = await Mint(players[1].Id, new[] { players[2].Id });

            // Minted milliseconds apart, so the ordering is stamped rather than left to the clock.
            first.ClaimedAt = new DateTime(2026, 1, 1, 9, 0, 0);
            second.ClaimedAt = new DateTime(2026, 1, 2, 9, 0, 0);
            await _dbContext.SaveChangesAsync();

            var history = await _packHistoryService.GetHistory();

            Assert.That(history.Packs[0].PackId, Is.EqualTo(second.Id));
            Assert.That(history.Packs[1].PackId, Is.EqualTo(first.Id));
        }

        /// <summary>
        /// A packet from a game carries the game, and a daily carries neither it nor a gift - the
        /// three columns that say where a packet came from.
        /// </summary>
        [Test]
        public async Task WhereThePackCameFromIsOnTheRow()
        {
            var players = await ARosterThatHasPlayed();
            var game = (await _gameService.GetGames()).First();

            var gameClaim = PackClaim.ForGame(players[0].Id, game.Id, DateTime.Now);
            _dbContext.PackClaims.Add(gameClaim);
            _dbContext.CardInstances.Add(
                CardInstance.Mint(
                    players[0].Id, players[1].Id, gameClaim.Id, game.Id, isIcon: false));
            await _dbContext.SaveChangesAsync();

            var daily = await Mint(players[0].Id, new[] { players[2].Id });

            var history = await _packHistoryService.GetHistory();
            var fromGame = history.Packs.Single(pack => pack.PackId == gameClaim.Id);
            var fromDaily = history.Packs.Single(pack => pack.PackId == daily.Id);

            Assert.That(fromGame.Source, Is.EqualTo(nameof(PackSource.Game)));
            Assert.That(fromGame.GameId, Is.EqualTo(game.Id));
            Assert.That(fromDaily.Source, Is.EqualTo(nameof(PackSource.Daily)));
            Assert.That(fromDaily.GameId, Is.Null);
            Assert.That(fromDaily.GiftId, Is.Null);
        }

        /// <summary>
        /// The same distinction CardStatisticsTests pins for the tally: the face is live, and
        /// <c>MintedAsIcon</c> is the only thing reading the flag frozen at mint.
        /// </summary>
        [Test]
        public async Task MintedAsIconIsHistoryWhileTheSubjectStaysLive()
        {
            var players = await ARosterThatHasPlayed();
            var subject = players[1];

            await Mint(players[0].Id, new[] { subject.Id });

            subject.Active = false;
            _dbContext.Players.Update(subject);
            await _dbContext.SaveChangesAsync();

            var card = (await _packHistoryService.GetHistory()).Packs.Single().Cards.Single();

            Assert.That(card.Subject.IsIcon, Is.True, "the card is an icoon now");
            Assert.That(card.MintedAsIcon, Is.False, "but it was not packed as one");
        }

        [Test]
        public async Task DeletingTheGameTakesItsPacksOutOfTheLog()
        {
            var players = await ARosterThatHasPlayed();
            var game = (await _gameService.GetGames()).First();

            var claim = PackClaim.ForGame(players[0].Id, game.Id, DateTime.Now);
            _dbContext.PackClaims.Add(claim);
            _dbContext.CardInstances.Add(
                CardInstance.Mint(players[0].Id, players[1].Id, claim.Id, game.Id, isIcon: false));
            await _dbContext.SaveChangesAsync();

            _dbContext.Games.Remove(game);
            await _dbContext.SaveChangesAsync();

            var history = await _packHistoryService.GetHistory();

            Assert.That(history.Packs, Is.Empty);
            Assert.That(history.TotalCards, Is.Zero);
        }

        /// <summary>One claim and one card per named subject, as a daily freebie.</summary>
        private async Task<PackClaim> Mint(
            string ownerId,
            IReadOnlyList<string> subjectIds,
            DateTime? day = null)
        {
            var claim = PackClaim.ForDaily(ownerId, day ?? DateTime.Today);
            _dbContext.PackClaims.Add(claim);

            foreach (var subjectId in subjectIds)
            {
                _dbContext.CardInstances.Add(
                    CardInstance.Mint(ownerId, subjectId, claim.Id, gameId: null, isIcon: false));
            }

            await _dbContext.SaveChangesAsync();
            return claim;
        }

        private async Task<Player> AddPlayer(string name)
        {
            var player = Player.CreatePlayer(new PlayerForm { Name = name });
            _dbContext.Players.Add(player);
            await _dbContext.SaveChangesAsync();
            return player;
        }

        /// <summary>
        /// Four players and six games between them, so everybody clears the games gate - the same
        /// fixture CardStatisticsTests and PackClaimTests use.
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
                await AGame(players[a], players[b], players[c], players[d]);
            }

            return players;
        }

        private async Task AGame(Player a, Player b, Player c, Player d) =>
            await _gameService.CreateGame(
                new GameForm
                {
                    FirstTeamForm = new TeamPerformanceForm
                    {
                        FirstPlayerId = a.Id,
                        SecondPlayerId = b.Id,
                        Goals = 10
                    },
                    SecondTeamForm = new TeamPerformanceForm
                    {
                        FirstPlayerId = c.Id,
                        SecondPlayerId = d.Id,
                        Goals = 6
                    }
                });
    }
}
