using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models.RequestParameters;
using AnagoLeaderboard.Models.Results;
using AnagoLeaderboard.Services;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UnitTests
{
    [TestFixture]
    public class GameUploadTests
    {
        private PlayerService _playerService;
        private GameService _gameService;

        private readonly List<string>  _gameIdsToDelete = new();
        private readonly List<string> _playerIdsToDelete = new();

        [SetUp]
        public void Setup()
        {
            var dbOption = new DbContextOptionsBuilder<DatabaseContext>()
                .UseInMemoryDatabase("some database")
                .Options;

            var databaseContext = new DatabaseContext(dbOption);
            _gameService = new GameService(databaseContext);
            var leaderBoardService = new LeaderBoardService(_gameService, databaseContext);
            _playerService = new PlayerService(databaseContext, leaderBoardService, null);

        }

        [TearDown]
        public async Task TearDown()
        {
            //_playerIdsToDelete.ForEach(async playerId => await _playerService.DeletePlayer(playerId));
            //_gameIdsToDelete.ForEach(async gameId => await _gameService.DeleteGame(gameId));
        }

        [Test]
        public async Task TestSaveGame()
        {
            var randomPlayerNames = new List<string>();
            var randomPlayerIds = new List<string>();

            for (int i = 0; i < 4; i++)
            {
                randomPlayerNames.Add(RandomString(10));
                var playerData = new PlayerForm() { Name = randomPlayerNames[i] };
                var playerId = await _playerService.CreatePlayer(playerData);
                randomPlayerIds.Add(playerId);
                _playerIdsToDelete.Add(playerId);
            }

            var gameForm = new GameForm()
            {
                FirstTeamForm = new TeamPerformanceForm()
                {
                    FirstPlayerId = randomPlayerIds[0],
                    SecondPlayerId = randomPlayerIds[1],
                    Goals = 10
                },
                SecondTeamForm = new TeamPerformanceForm()
                {
                    FirstPlayerId = randomPlayerIds[2],
                    SecondPlayerId = randomPlayerIds[3],
                    Goals = 3
                }
            };

            var gameId = await _gameService.CreateGame(gameForm);
            _gameIdsToDelete.Add(gameId);

            Game game = await _gameService.GetGame(gameId);
            Assert.That(game.FirstTeam.FirstPlayer.Name, Is.EqualTo(randomPlayerNames[0]));
            Assert.That(game.FirstTeam.SecondPlayer.Name, Is.EqualTo(randomPlayerNames[1]));
            Assert.That(game.SecondTeam.FirstPlayer.Name, Is.EqualTo(randomPlayerNames[2]));
            Assert.That(game.SecondTeam.SecondPlayer.Name, Is.EqualTo(randomPlayerNames[3]));
            Assert.That(game.FirstTeam.Goals, Is.EqualTo(10));
            Assert.That(game.SecondTeam.Goals, Is.EqualTo(3));
            Assert.That(game.CreatedAt.Date, Is.EqualTo(DateTime.Now.Date));

        }

        [Test]
        public async Task TwoGamesWithSamePlayers_CanBeCreated()
        {
            var randomPlayerNames = new List<string>();
            var randomPlayerIds = new List<string>();

            for (int i = 0; i < 4; i++)
            {
                randomPlayerNames.Add(RandomString(10));
                var playerData = new PlayerForm() { Name = randomPlayerNames[i] };
                var playerId = await _playerService.CreatePlayer(playerData);
                randomPlayerIds.Add(playerId);
                _playerIdsToDelete.Add(playerId);
            }

            var gameForm1 = new GameForm()
            {
                FirstTeamForm = new TeamPerformanceForm()
                {
                    FirstPlayerId = randomPlayerIds[0],
                    SecondPlayerId = randomPlayerIds[1],
                    Goals = 10
                },
                SecondTeamForm = new TeamPerformanceForm()
                {
                    FirstPlayerId = randomPlayerIds[2],
                    SecondPlayerId = randomPlayerIds[3],
                    Goals = 3
                }
            };

            var gameForm2 = new GameForm()
            {
                FirstTeamForm = new TeamPerformanceForm()
                {
                    FirstPlayerId = randomPlayerIds[0],
                    SecondPlayerId = randomPlayerIds[1],
                    Goals = 10
                },
                SecondTeamForm = new TeamPerformanceForm()
                {
                    FirstPlayerId = randomPlayerIds[2],
                    SecondPlayerId = randomPlayerIds[3],
                    Goals = 2
                }
            };

            var game1Id = await _gameService.CreateGame(gameForm1);
            var game2Id = await _gameService.CreateGame(gameForm2);
            List<Game> games = await _gameService.GetGames();

            var firstGame = games.Find(game => game.Id == game1Id);
            var secondGame = games.Find(game => game.Id == game2Id);

            _gameIdsToDelete.Add(firstGame.Id);
            _gameIdsToDelete.Add(secondGame.Id);
            Assert.That(firstGame.SecondTeam.Goals, Is.EqualTo(3));
            Assert.That(secondGame.SecondTeam.Goals, Is.EqualTo(2));

        }

        [Test]
        public async Task NumberOfGamesAreUpdated()
        {
            var randomPlayerNames = new List<string>();
            var randomPlayerIds = new List<string>();

            for (int i = 0; i < 4; i++)
            {
                randomPlayerNames.Add(RandomString(10));
                var playerData = new PlayerForm() { Name = randomPlayerNames[i] };
                var playerId = await _playerService.CreatePlayer(playerData);
                randomPlayerIds.Add(playerId);
                _playerIdsToDelete.Add(playerId);
            }

            var gameForm = new GameForm()
            {
                FirstTeamForm = new TeamPerformanceForm()
                {
                    FirstPlayerId = randomPlayerIds[0],
                    SecondPlayerId = randomPlayerIds[1],
                    Goals = 10
                },
                SecondTeamForm = new TeamPerformanceForm()
                {
                    FirstPlayerId = randomPlayerIds[2],
                    SecondPlayerId = randomPlayerIds[3],
                    Goals = 5
                }
            };

            var gameId = await _gameService.CreateGame(gameForm);
            _gameIdsToDelete.Add(gameId);
            var firstPlayer = await _playerService.GetPlayer(randomPlayerIds[0]);
            var thirdPlayer = await _playerService.GetPlayer(randomPlayerIds[2]);
            Assert.That(firstPlayer.NumberOfGames, Is.EqualTo(1));
            Assert.That(firstPlayer.NumberOfWins, Is.EqualTo(1));
            Assert.That(firstPlayer.NumberOfLosses, Is.EqualTo(0));
            Assert.That(thirdPlayer.NumberOfGames, Is.EqualTo(1));
            Assert.That(thirdPlayer.NumberOfWins, Is.EqualTo(0));
            Assert.That(thirdPlayer.NumberOfLosses, Is.EqualTo(1));
        }

        [Test]
        public async Task RatingsAreUpdated()
        {
            var randomPlayerNames = new List<string>();
            var randomPlayerIds = new List<string>();

            for (int i = 0; i < 4; i++)
            {
                randomPlayerNames.Add(RandomString(10));
                var playerData = new PlayerForm() { Name = randomPlayerNames[i] };
                var playerId = await _playerService.CreatePlayer(playerData);
                randomPlayerIds.Add(playerId);
                _playerIdsToDelete.Add(playerId);
            }

            var gameForm = new GameForm()
            {
                FirstTeamForm = new TeamPerformanceForm()
                {
                    FirstPlayerId = randomPlayerIds[0],
                    SecondPlayerId = randomPlayerIds[1],
                    Goals = 10
                },
                SecondTeamForm = new TeamPerformanceForm()
                {
                    FirstPlayerId = randomPlayerIds[2],
                    SecondPlayerId = randomPlayerIds[3],
                    Goals = 5
                }
            };

            var gameId = await _gameService.CreateGame(gameForm);
            _gameIdsToDelete.Add(gameId);
            var firstPlayer = await _playerService.GetPlayer(randomPlayerIds[0]);
            var thirdPlayer = await _playerService.GetPlayer(randomPlayerIds[2]);

            Assert.That(firstPlayer.Rating > 1000);
            Assert.That(thirdPlayer.Rating < 1000);
        }

        [Test]
        public async Task Delete_IfThereIsOnlyOneGame_RatingsAreRestTo1000()
        {
            var (randomPlayerNames, randomPlayerIds) = await CreateNewPlayers(4);

            var gameForm = new GameForm()
            {
                FirstTeamForm = new TeamPerformanceForm()
                {
                    FirstPlayerId = randomPlayerIds[0],
                    SecondPlayerId = randomPlayerIds[1],
                    Goals = 10
                },
                SecondTeamForm = new TeamPerformanceForm()
                {
                    FirstPlayerId = randomPlayerIds[2],
                    SecondPlayerId = randomPlayerIds[3],
                    Goals = 5
                }
            };

            var gameId = await _gameService.CreateGame(gameForm);
            var firstPlayer = await _playerService.GetPlayer(randomPlayerIds[0]);
            var thirdPlayer = await _playerService.GetPlayer(randomPlayerIds[2]);

            Assert.That(firstPlayer.Rating, Is.GreaterThan(1000));
            Assert.That(thirdPlayer.Rating, Is.LessThan(1000));

            await _gameService.DeleteGame(gameId);
            firstPlayer = await _playerService.GetPlayer(randomPlayerIds[0]);
            thirdPlayer = await _playerService.GetPlayer(randomPlayerIds[2]);
            Assert.That(firstPlayer.Rating, Is.EqualTo(1000));
            Assert.That(thirdPlayer.Rating, Is.EqualTo(1000));

            var attemptedDeletedGame = _gameService.GetGame(gameId);
            Assert.That(attemptedDeletedGame, Is.Not.Null);

        }
 
        [Test]
        public async Task Game_score_can_be_updated()
        {
            var (randomPlayerNames, randomPlayerIds) = await CreateNewPlayers(4);

            var initialGame = new GameForm()
            {
                FirstTeamForm = new TeamPerformanceForm()
                {
                    FirstPlayerId = randomPlayerIds[0],
                    SecondPlayerId = randomPlayerIds[1],
                    Goals = 10
                },
                SecondTeamForm = new TeamPerformanceForm()
                {
                    FirstPlayerId = randomPlayerIds[2],
                    SecondPlayerId = randomPlayerIds[3],
                    Goals = 5
                }
            };

            var gameId = await _gameService.CreateGame(initialGame);

            var updatedGame = new GameForm()
            {
                FirstTeamForm = new TeamPerformanceForm()
                {
                    FirstPlayerId = randomPlayerIds[0],
                    SecondPlayerId = randomPlayerIds[1],
                    Goals = 10
                },
                SecondTeamForm = new TeamPerformanceForm()
                {
                    FirstPlayerId = randomPlayerIds[2],
                    SecondPlayerId = randomPlayerIds[3],
                    Goals = 3
                }
            };

            _gameService.UpdateGame(gameId, updatedGame);

            var game = await _gameService.GetGame(gameId);
            Assert.NotNull(game);
            Assert.That(game.SecondTeam.Goals, Is.EqualTo(3));
        }

        [Test]
        public async Task Game_players_be_updated()
        {
            var (randomPlayerNames, randomPlayerIds) = await CreateNewPlayers(5);

            var initialGame = new GameForm()
            {
                FirstTeamForm = new TeamPerformanceForm()
                {
                    FirstPlayerId = randomPlayerIds[0],
                    SecondPlayerId = randomPlayerIds[1],
                    Goals = 10
                },
                SecondTeamForm = new TeamPerformanceForm()
                {
                    FirstPlayerId = randomPlayerIds[2],
                    SecondPlayerId = randomPlayerIds[3],
                    Goals = 5
                }
            };

            var gameId = await _gameService.CreateGame(initialGame);

            var updatedGame = new GameForm()
            {
                FirstTeamForm = new TeamPerformanceForm()
                {
                    FirstPlayerId = randomPlayerIds[0],
                    SecondPlayerId = randomPlayerIds[4],
                    Goals = 10
                },
                SecondTeamForm = new TeamPerformanceForm()
                {
                    FirstPlayerId = randomPlayerIds[2],
                    SecondPlayerId = randomPlayerIds[3],
                    Goals = 3
                }
            };

            _gameService.UpdateGame(gameId, updatedGame);

            var game = await _gameService.GetGame(gameId);
            Assert.NotNull(game);
            Assert.That(game.SecondTeam.Goals, Is.EqualTo(3));
            Assert.That(game.FirstTeam.SecondPlayer.Name, Is.EqualTo(randomPlayerNames[4]));
        }

        private async Task<(List<string>, List<string>)> CreateNewPlayers(int n)
        {
            var randomPlayerNames = new List<string>();
            var randomPlayerIds = new List<string>();
            for (int i = 0; i < n; i++)
            {
                randomPlayerNames.Add(RandomString(10));
                var playerData = new PlayerForm() { Name = randomPlayerNames[i] };
                var playerId = await _playerService.CreatePlayer(playerData);
                randomPlayerIds.Add(playerId);
                _playerIdsToDelete.Add(playerId);
            }
            return (randomPlayerNames, randomPlayerIds);
        }


        private static Random random = new Random();

        public static string RandomString(int length)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            return new string(Enumerable.Repeat(chars, length)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }
    }
}
