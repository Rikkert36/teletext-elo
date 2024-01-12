using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models.RequestParameters;
using AnagoLeaderboard.Models.Results;
using Microsoft.EntityFrameworkCore;

namespace AnagoLeaderboard.Services
{
    public class GameService
    {
        private readonly DatabaseContext _dbContext;
        public GameService(DatabaseContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<string> CreateGame(GameForm gameForm)
        {
            var game = Game.Create(gameForm);
            await _dbContext.AddOldRatings(game);
            List<int> numberOfGamesPlayed = await _dbContext.GetNumberOfGamesPlayedByPlayers(game);
            var ratingCalculator = new RatingCalculator(game, numberOfGamesPlayed);
            ratingCalculator.CalculateRating();
            await _dbContext.AddGame(game);
            return game.Id;

        }

        public async Task DeleteGame(string gameId)
        {
            var game = await _dbContext.Games.FindAsync(gameId);
            if (game != null)
            {
                await CheckCanBeDeleted(game);
                _dbContext.Attach(game);
                _dbContext.Remove(game);
                await RevertGameChanges(game);
                _dbContext.SaveChanges();
            } else
            {
                throw new KeyNotFoundException("Game was not found.");
            };
        }

        private async Task CheckCanBeDeleted(Game game)
        {
            var playerPerformances = game.GetPlayerPerformances();
            foreach (var playerPerformance in playerPerformances)
            {
                var player = await _dbContext.Players.FindAsync(playerPerformance.PlayerId);
                if (player != null)
                {
                    bool notLatestGame = player.Rating != playerPerformance.NewRating;
                    if (notLatestGame) throw new InvalidOperationException();
                }
            }
        }

        private async Task RevertGameChanges(Game game)
        {
            var winningTeam = game.FirstTeam.Goals > game.SecondTeam.Goals ? game.FirstTeam : game.SecondTeam;
            var losingTeam = game.FirstTeam.Goals > game.SecondTeam.Goals ? game.SecondTeam : game.FirstTeam;
            foreach (var playerPerformance in game.GetPlayerPerformances())
            {
                var player = await _dbContext.Players.FindAsync(playerPerformance.PlayerId);
                if (player != null)
                {
                    player.Rating = playerPerformance.OldRating;
                    bool won = winningTeam.FirstPlayer.PlayerId == player.Id || winningTeam.SecondPlayer.PlayerId == player.Id;
                    int goalsFor;
                    int goalsAgainst;
                    if (won)
                    {
                        goalsFor = winningTeam.Goals;
                        goalsAgainst = losingTeam.Goals;
                    } else
                    {
                        goalsFor = losingTeam.Goals;
                        goalsAgainst = winningTeam.Goals;
                    }
                    player.RevertGame(won, goalsFor, goalsAgainst);

                }
            }
        }

        public async Task DeleteGames()
        {
            await _dbContext.DeleteGames();

        }

        public async Task<Game> GetGame(string Id)
        {
            var result = await _dbContext.Games.FindAsync(Id);
            if (result == null)
            {
                throw new KeyNotFoundException($"player {Id} does not exist");
            } else
            {
                AddPlayerNames(result);
                return result;
            }
        }

        public async Task<List<Game>> GetGames()
        {
            var result = await _dbContext.Games.ToListAsync();
            foreach (Game game in result)
            {
                AddPlayerNames(game);
            }
            return result;
        }

        private void AddPlayerNames(Game result)
        {
            List<PlayerPerformance> players = new()
            {
                result.FirstTeam.FirstPlayer,
                result.FirstTeam.SecondPlayer,
                result.SecondTeam.FirstPlayer,
                result.SecondTeam.SecondPlayer
            };

            players.ForEach(async (PlayerPerformance playerPerformance) =>
            {
                var playerNameOrNull = (await _dbContext.Players.FindAsync(playerPerformance.PlayerId));
                if (playerNameOrNull != null)
                {
                    playerPerformance.Name = playerNameOrNull.Name;
                } else
                {
                    playerPerformance.Name = "Player not found";
                }
            });
        }
    }
}
