using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models.RequestParameters;
using AnagoLeaderboard.Models.Results;
using AnagoLeaderboard.Services;
using Microsoft.EntityFrameworkCore;

namespace UnitTests
{
    public class PlayerTests
    {
        private PlayerService _playerService;
        
        [SetUp]
        public void Setup()
        {
            var dbOption = new DbContextOptionsBuilder<DatabaseContext>()
                .UseSqlite("Data Source=C:\\tafelvoetbal\\tafelvoetbal-server\\data\\test\\testdata.db")
                .Options;
            _playerService = new PlayerService(new AnagoLeaderboard.Database.DatabaseContext(dbOption));
        }

        [TearDown]
        public async Task TearDown()
        {
            //await _playerService.Clear();
        }

        [Test]
        public async Task Player_WhenCreatedCanBeRetrieved() 
        {
            var playerData = new PlayerForm() { Name = "Rik Maas", Avatar = null };
            var playerId = await _playerService.CreatePlayer(playerData);
            Player player = await _playerService.GetPlayer(playerId);
            Assert.That(player.Name, Is.EqualTo("Rik Maas"));
        }

        [Test]
        public async Task GetPlayers_RetrievesNothingInitially()
        {
            List<Player> players = await _playerService.GetPlayers();
            Assert.That(players.Count, Is.EqualTo(0));
        }
    }
}