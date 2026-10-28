using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models.RequestParameters;
using AnagoLeaderboard.Models.Results;
using AnagoLeaderboard.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace UnitTests
{
    /// <summary>
    /// The standings behind <c>GET api/cards/collectors</c>, against real SQLite like CardStatisticsTests.
    /// </summary>
    [TestFixture]
    public class CollectorStandingsTests
    {
        private SqliteConnection _connection;
        private DatabaseContext _dbContext;
        private GameService _gameService;
        private CardRatingCalculator _cardRatingCalculator;
        private CollectorStandingsService _collectorStandingsService;

        [SetUp]
        public void Setup()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<DatabaseContext>()
                .UseSqlite(_connection)
                .Options;

            _dbContext = new DatabaseContext(options);
            _dbContext.Database.EnsureCreated();

            _cardRatingCalculator = new CardRatingCalculator();
            _gameService = new GameService(_dbContext);
            var leaderBoardService = new LeaderBoardService(_gameService, _dbContext);
            var cardPoolService = new CardPoolService(leaderBoardService, _cardRatingCalculator);

            _collectorStandingsService = new CollectorStandingsService(
                _dbContext, leaderBoardService, cardPoolService, _cardRatingCalculator);
        }

        [TearDown]
        public void TearDown()
        {
            _claims.Clear();
            _dbContext.Dispose();
            _connection.Dispose();
        }

        [Test]
        public async Task OnlyActivePlayersWithAnAlbumAreListed()
        {
            var players = await ARosterThatHasPlayed();
            await Album(players[0]);
            await Album(players[1]);
            await Retire(players[1]);

            var standings = await _collectorStandingsService.GetStandings();

            Assert.That(standings.Collectors.Select(c => c.PlayerId), Is.EqualTo(new[] { players[0].Id }));
        }

        [Test]
        public async Task AnEmptyBookIsZeroAndAFullOneIsAHundred()
        {
            var players = await ARosterThatHasPlayed();
            await Album(players[0]);
            await Album(players[1]);
            foreach (var subject in players)
            {
                await Mint(players[0].Id, subject.Id, copies: 1);
            }

            var standings = await _collectorStandingsService.GetStandings();
            var full = standings.Collectors.Single(c => c.PlayerId == players[0].Id);
            var empty = standings.Collectors.Single(c => c.PlayerId == players[1].Id);

            Assert.That(full.VolumeOnePercent, Is.EqualTo(100));
            Assert.That(full.Missing, Is.Empty);
            Assert.That(full.Rank, Is.EqualTo(1));
            Assert.That(empty.VolumeOnePercent, Is.Zero);
            Assert.That(empty.Missing, Is.EqualTo(standings.Actives.Select(s => s.Id)));
            Assert.That(empty.WithIconsPercent, Is.Null);
        }

        [Test]
        public async Task EachSlotWeighsOneOverItsDrawChance()
        {
            var players = await ARosterThatHasPlayed();
            await Album(players[0]);
            await Mint(players[0].Id, players[1].Id, copies: 3);

            var standings = await _collectorStandingsService.GetStandings();
            var tickets = standings.Actives.ToDictionary(s => s.Id, s => _cardRatingCalculator.TicketsFor(s.Overall));
            var share = (1 / tickets[players[1].Id]) / tickets.Values.Sum(t => 1 / t);
            var collector = standings.Collectors.Single();

            Assert.That(collector.VolumeOnePercent, Is.EqualTo((int)Math.Floor(share * 100)));
            Assert.That(collector.ActiveCounts[standings.Actives.ToList().FindIndex(s => s.Id == players[1].Id)], Is.EqualTo(3));
        }

        [Test]
        public async Task CollectorsWithTheSameBookShareARank()
        {
            var players = await ARosterThatHasPlayed();
            foreach (var collector in players.Take(3))
            {
                await Album(collector);
            }
            await Mint(players[0].Id, players[3].Id, copies: 1);
            await Mint(players[1].Id, players[3].Id, copies: 2);

            var standings = await _collectorStandingsService.GetStandings();

            Assert.That(standings.Collectors.Select(c => c.Rank), Is.EqualTo(new[] { 1, 1, 3 }));
        }

        /// <summary>
        /// Icon collectors lead, and only icon copies fill an icon slot.
        /// </summary>
        [Test]
        public async Task IconCollectorsComeFirstAndCountTheirIconsBook()
        {
            var players = await ARosterThatHasPlayed();
            var icon = players[3];
            await Mint(players[0].Id, icon.Id, copies: 1, isIcon: false);
            await Retire(icon);

            await Album(players[0], iconsUnlocked: true);
            await Album(players[1]);
            foreach (var subject in players.Take(3))
            {
                await Mint(players[1].Id, subject.Id, copies: 1);
            }

            var standings = await _collectorStandingsService.GetStandings();
            var iconCollector = standings.Collectors[0];

            Assert.That(iconCollector.PlayerId, Is.EqualTo(players[0].Id));
            Assert.That(iconCollector.IconsUnlocked, Is.True);
            Assert.That(iconCollector.WithIconsPercent, Is.Zero);
            Assert.That(iconCollector.IconCounts, Is.EqualTo(new[] { 0 }));
            Assert.That(iconCollector.Missing, Does.Contain(icon.Id), "a player copy does not fill the icoon slot");
            Assert.That(standings.Collectors[1].VolumeOnePercent, Is.EqualTo(100));
            Assert.That(standings.Collectors[1].IconCounts, Is.Null);
        }

        private async Task Album(Player player, bool iconsUnlocked = false)
        {
            var collection = PlayerCollection.Create(player.Id, AlbumCovers.All[0]);
            if (iconsUnlocked) collection.IconsUnlockedAt = DateTime.Now;
            _dbContext.PlayerCollections.Add(collection);
            await _dbContext.SaveChangesAsync();
        }

        private async Task Retire(Player player)
        {
            player.Active = false;
            _dbContext.Players.Update(player);
            await _dbContext.SaveChangesAsync();
        }

        // One daily claim per collector per day, so every minted card in a test hangs off the same one.
        private readonly Dictionary<string, PackClaim> _claims = new();

        private async Task Mint(string ownerId, string subjectId, int copies, bool isIcon = false)
        {
            if (!_claims.TryGetValue(ownerId, out var claim))
            {
                claim = PackClaim.ForDaily(ownerId, DateTime.Now);
                _dbContext.PackClaims.Add(claim);
                _claims[ownerId] = claim;
            }

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
