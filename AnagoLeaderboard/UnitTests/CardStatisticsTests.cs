using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models.RequestParameters;
using AnagoLeaderboard.Models.Results;
using AnagoLeaderboard.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace UnitTests
{
    /// <summary>
    /// The packed-card tally behind <c>GET api/cards/statistics</c>.
    ///
    /// Against real SQLite rather than the in-memory provider, and for a reason beyond the
    /// cascades PlayerCollectionTests needs it for: the tally is one grouped query with a
    /// COUNT(DISTINCT) inside it, and whether that translates at all is a fact about the SQLite
    /// provider. The in-memory provider would evaluate the whole thing in LINQ and pass on a
    /// query the real database cannot run.
    ///
    /// Cards are minted straight onto the table rather than drawn out of packs. What is under
    /// test is the counting, and a weighted random draw cannot be made to produce a known
    /// tally - PackClaimTests already covers the drawing.
    /// </summary>
    [TestFixture]
    public class CardStatisticsTests
    {
        private SqliteConnection _connection;
        private DatabaseContext _dbContext;
        private GameService _gameService;
        private CardStatisticsService _cardStatisticsService;

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

            _cardStatisticsService = new CardStatisticsService(
                _dbContext, leaderBoardService, cardPoolService);
        }

        [TearDown]
        public void TearDown()
        {
            _dbContext.Dispose();
            _connection.Dispose();
        }

        [Test]
        public async Task AnEmptyTableStillListsEveryCollectableCard()
        {
            var players = await ARosterThatHasPlayed();

            var statistics = await _cardStatisticsService.GetStatistics();

            Assert.That(statistics.Cards, Has.Count.EqualTo(players.Count));
            Assert.That(statistics.TotalCards, Is.Zero);
            Assert.That(statistics.TotalCollectors, Is.Zero);
            Assert.That(statistics.Cards.Select(card => card.TimesPacked), Is.All.Zero);
            Assert.That(statistics.Cards.Select(card => card.InPool), Is.All.True);
        }

        [Test]
        public async Task DuplicatesAreCountedAndCollectorsAreNot()
        {
            var players = await ARosterThatHasPlayed();
            var subject = players[0];

            // Three copies for one collector and one for another: four cards, two collectors.
            await Mint(players[1].Id, subject.Id, copies: 3);
            await Mint(players[2].Id, subject.Id, copies: 1);

            var statistics = await _cardStatisticsService.GetStatistics();
            var row = statistics.Cards.Single(card => card.Subject.Id == subject.Id);

            Assert.That(row.TimesPacked, Is.EqualTo(4));
            Assert.That(row.Collectors, Is.EqualTo(2));
            Assert.That(statistics.TotalCards, Is.EqualTo(4));
            Assert.That(statistics.TotalCollectors, Is.EqualTo(2));

            // Commonest first, so the only subject anybody holds leads the list.
            Assert.That(statistics.Cards[0].Subject.Id, Is.EqualTo(subject.Id));
        }

        /// <summary>
        /// The distinction the whole design turns on: what a card looks like is live, and
        /// <c>MintedAsIcon</c> is the only thing that reads the flag frozen at mint.
        /// </summary>
        [Test]
        public async Task MintedAsIconCountsTheFlagAtMintWhileTheSubjectStaysLive()
        {
            var players = await ARosterThatHasPlayed();
            var subject = players[0];

            await Mint(players[1].Id, subject.Id, copies: 1, isIcon: false);

            subject.Active = false;
            _dbContext.Players.Update(subject);
            await _dbContext.SaveChangesAsync();

            var statistics = await _cardStatisticsService.GetStatistics();
            var row = statistics.Cards.Single(card => card.Subject.Id == subject.Id);

            Assert.That(row.Subject.IsIcon, Is.True, "the card is an icoon now");
            Assert.That(row.MintedAsIcon, Is.Zero, "but it was not packed as one");
            Assert.That(row.TimesPacked, Is.EqualTo(1));
        }

        /// <summary>
        /// The row that would otherwise go missing and take the total with it: a subject who has
        /// fallen back under the games gate still has their cards in other collectors' books.
        /// </summary>
        [Test]
        public async Task ASubjectWhoIsNoLongerCollectableIsListedAndFlagged()
        {
            var players = await ARosterThatHasPlayed();
            var newcomer = await AddPlayer("Nieuw");

            // Two games, against a gate of five, so they are in the replay but out of the pool.
            await AGame(newcomer, players[0], players[1], players[2]);
            await AGame(newcomer, players[0], players[1], players[2]);

            await Mint(players[1].Id, newcomer.Id, copies: 2);

            var statistics = await _cardStatisticsService.GetStatistics();
            var row = statistics.Cards.Single(card => card.Subject.Id == newcomer.Id);

            Assert.That(row.InPool, Is.False);
            Assert.That(row.TimesPacked, Is.EqualTo(2));
            Assert.That(statistics.TotalCards, Is.EqualTo(2), "the tallies still add up");
        }

        private async Task Mint(string ownerId, string subjectId, int copies, bool isIcon = false)
        {
            var claim = PackClaim.ForDaily(ownerId, DateTime.Now);
            _dbContext.PackClaims.Add(claim);

            for (var copy = 0; copy < copies; copy++)
            {
                _dbContext.CardInstances.Add(
                    CardInstance.Mint(ownerId, subjectId, claim.Id, gameId: null, isIcon));
            }

            await _dbContext.SaveChangesAsync();
        }

        private async Task<Player> AddPlayer(string name)
        {
            var player = Player.CreatePlayer(new PlayerForm { Name = name });
            _dbContext.Players.Add(player);
            await _dbContext.SaveChangesAsync();
            return player;
        }

        /// <summary>
        /// Four players and six games between them, so everybody clears the games gate - the
        /// same fixture PackClaimTests uses.
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
