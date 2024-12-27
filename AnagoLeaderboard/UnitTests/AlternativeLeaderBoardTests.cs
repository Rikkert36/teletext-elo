using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models.RequestParameters;
using AnagoLeaderboard.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace UnitTests
{
    public class AlternativeLeaderBoardTests : IDisposable
    {
        private readonly PlayerService _playerService;
        private readonly GameService _gameService;
        private readonly LeaderBoardService _leaderBoardService;

        public AlternativeLeaderBoardTests()
        {
            var databaseName = "mydatabase_" + DateTime.Now.ToFileTimeUtc();
            var dbOption = new DbContextOptionsBuilder<DatabaseContext>()
                .UseInMemoryDatabase(databaseName)
                .Options;

            var databaseContext = new DatabaseContext(dbOption);
            _leaderBoardService = new LeaderBoardService(_gameService, databaseContext);
            _gameService = new GameService(databaseContext);
            _playerService = new PlayerService(databaseContext, _leaderBoardService, _gameService);
        }

        public void Dispose()
        {
        }
        

        private async Task<string> CreateGame(string player1, string player2, string player3, string player4, int goals1, int goals2)
        {
            return await _gameService.CreateGame(new GameForm()
            {
                FirstTeamForm = new TeamPerformanceForm()
                {
                    FirstPlayerId = player1,
                    SecondPlayerId = player2,
                    Goals = goals1,
                },
                SecondTeamForm =
                    new TeamPerformanceForm()
                    {
                        FirstPlayerId = player3,
                        SecondPlayerId = player4,
                        Goals = goals2,
                    },
            });
        }
    }
}
