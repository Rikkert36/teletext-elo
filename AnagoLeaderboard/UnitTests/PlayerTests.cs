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
                .UseInMemoryDatabase("AnagoLeaderboard")
                .Options;
            
            var databaseContext = new DatabaseContext(dbOption);
            var gameService = new GameService(databaseContext);
            var leaderBoardService = new LeaderBoardService(gameService, databaseContext);
            _playerService = new PlayerService(databaseContext, leaderBoardService, null);
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


    }
}