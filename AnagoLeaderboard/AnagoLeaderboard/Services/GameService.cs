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
            await _dbContext.AddGame(game);
            return game.Id;

        }
        
        public async Task<bool> IsGameDuplicate(GameForm gameForm)
        {
            var game = Game.Create(gameForm);
            var games = await _dbContext.Games.ToListAsync();
            
            var gamesToday = games.Where(game => game.CreatedAt.Date == DateTime.Now.Date);
            
            foreach (Game existingGame in gamesToday)
            {
                if (game.Equals(existingGame))
                {
                    return true;
                }
            }

            return false;
        }

        public async Task DeleteGame(string gameId)
        {
            var game = await _dbContext.Games.FindAsync(gameId);
            if (game != null)
            {
                _dbContext.Attach(game);
                _dbContext.Remove(game);
                _dbContext.SaveChanges();
            } else
            {
                throw new KeyNotFoundException("Game was not found.");
            };
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

        internal async Task<DateTime> GetOldestDate()
        {
            return await _dbContext.GetOldestDate();
        }

        internal async Task<GamesInRange> GetGamesInRange(DateTime start, DateTime end)
        {
            var result = await _dbContext.GetGamesInRange(start, end);
            foreach (Game game in result.Games)
            {
                AddPlayerNames(game);
            }
            return result;
        }

        public async Task UpdateGame(string gameId, GameForm updatedGame)
        {

            var game = await _dbContext.Games.FindAsync(gameId);
            if (game != null)
            {
                _dbContext.Attach(game);
                game.FirstTeam.FirstPlayer.PlayerId = updatedGame.FirstTeamForm.FirstPlayerId;
                game.FirstTeam.SecondPlayer.PlayerId = updatedGame.FirstTeamForm.SecondPlayerId;
                game.SecondTeam.FirstPlayer.PlayerId = updatedGame.SecondTeamForm.FirstPlayerId;
                game.SecondTeam.SecondPlayer.PlayerId = updatedGame.SecondTeamForm.SecondPlayerId;
                game.FirstTeam.Goals = updatedGame.FirstTeamForm.Goals;
                game.SecondTeam.Goals = updatedGame.SecondTeamForm.Goals;
                _dbContext.SaveChanges();
            } else
            {
                throw new KeyNotFoundException("Game was not found.");
            };

        }

        public async Task<List<Game>> GetGamesUntilYear(int year)
        {
            var result = await _dbContext.Games.Where(game => game.CreatedAt.Year <= year).ToListAsync();
            foreach (Game game in result)
            {
                AddPlayerNames(game);
            }
            return result;
        }
    }
}
