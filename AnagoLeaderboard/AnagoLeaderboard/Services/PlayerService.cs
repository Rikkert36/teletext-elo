using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models;
using AnagoLeaderboard.Models.RequestParameters;
using AnagoLeaderboard.Models.Results;
using Microsoft.EntityFrameworkCore;
using MoreLinq.Extensions;

namespace AnagoLeaderboard.Services
{
    public class PlayerService
    {
        private readonly DatabaseContext _dbContext;
        private readonly LeaderBoardService _leaderBoardService;
        private readonly GameService _gameService;

        public PlayerService(DatabaseContext dbContext, LeaderBoardService leaderBoardService, GameService gameService)
        {
            _dbContext = dbContext;
            _leaderBoardService = leaderBoardService;
            _gameService = gameService;
        }

        public async Task<string> CreatePlayer(PlayerForm playerData)
        {
            var player = Player.CreatePlayer(playerData);
            _dbContext.Players.Add(player);
            await _dbContext.SaveChangesAsync();
            if (playerData.Avatar != null) await SaveAvatar(player.Id, playerData.Avatar);
            return player.Id;
        }

        private async Task SaveAvatar(string id, IFormFile avatar)
        {
            var filePath = @$"C:\tafelvoetbal\tafelvoetbal-server\data\avatars\{id}";
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await avatar.CopyToAsync(stream);
            }
        }

        public async Task<DynamicRatingPlayer> GetPlayer(string id)
        {
            var dynamicPlayers = await GetPlayers();
            var result = dynamicPlayers.FirstOrDefault(x => x.Id == id);
            if (result == null)
            {
                throw new KeyNotFoundException($"player {id} does not exist");
            }
            else
            {
                return result;
            }
        }
        
        public async Task<PlayerStatistics> GetPlayerStatistics(string id)
        {
            var (_, games) = await _leaderBoardService.GetLeaderBoard();
            
            var players = await GetPlayers();
            var deltaWithPerPlayer = new Dictionary<string, int>();
            var gamesWithPlayer = new Dictionary<string, int>();
            
            var deltaAgainstPerPlayer = new Dictionary<string, int>();
            var gamesAgainstPlayer = new Dictionary<string, int>();

            foreach (Game game in games)
            {
                if (game.IsPlayedBy(id))
                {
                    var teamMemberId = game.GetTeamMemberId(id);
                    var otherTeam = game.GetOtherTeam(id);
                    
                    AddToMap(deltaWithPerPlayer, teamMemberId, game.GetTeam(id).DeltaPoints);
                    AddToMap(gamesWithPlayer, teamMemberId, 1);
                    AddToMap(deltaAgainstPerPlayer, otherTeam.FirstPlayer.PlayerId, -game.GetOtherTeam(id).DeltaPoints);
                    AddToMap(gamesAgainstPlayer, otherTeam.FirstPlayer.PlayerId, 1);
                    AddToMap(deltaAgainstPerPlayer, otherTeam.SecondPlayer.PlayerId, -game.GetOtherTeam(id).DeltaPoints);
                    AddToMap(gamesAgainstPlayer, otherTeam.SecondPlayer.PlayerId, 1);
                }
            }

            return new PlayerStatistics(
                AddResultsWithOtherPlayers(deltaWithPerPlayer, gamesWithPlayer, players),
                AddResultsWithOtherPlayers(deltaAgainstPerPlayer, gamesAgainstPlayer, players)
            );
        }
        
        private List<PlayerGameNumberTuple> AddResultsWithOtherPlayers(
            Dictionary<string, int> deltaPerPlayer,
            Dictionary<string, int> numberOfGames,
            List<DynamicRatingPlayer> players)
        {
            var result = new List<PlayerGameNumberTuple>();
            foreach (var playerId in deltaPerPlayer.Keys)
            {
                var player = players.FirstOrDefault(x => x.Id == playerId);
                if (player.Active)
                    result.Add(new PlayerGameNumberTuple(player, deltaPerPlayer[playerId], numberOfGames[playerId]));
            }

            return result;
        }
        
        private static void AddToMap(Dictionary<string, int> playerDeltaMap, string otherplayerId, int delta)
        {
            if (!playerDeltaMap.TryGetValue(otherplayerId, out int currentDelta))
            {
                currentDelta = 0;
            }

            playerDeltaMap[otherplayerId] = currentDelta + delta;
        }

        public async Task Clear()
        {
            await _dbContext.Clear();
        }

        internal byte[] GetAvatar(string id)
        {
            var filePath = @$"C:\tafelvoetbal\tafelvoetbal-server\data\avatars\{id}";
            if (File.Exists(filePath))
            {
            }
            else
            {
                filePath = @$"C:\tafelvoetbal\tafelvoetbal-server\data\avatars\empty-avatar.jpg";
            }

            return System.IO.File.ReadAllBytes(filePath);
        }

        internal async Task<byte[]> GetPlayerOneAvatar()
        {
            var players = await GetPlayers();
            var highestRatedPlayer = players.OrderByDescending(player => player.Rating).FirstOrDefault();
            var filePath = @$"C:\tafelvoetbal\tafelvoetbal-server\data\avatars\{highestRatedPlayer.Id}";
            if (!File.Exists(filePath))
            {
                filePath = @$"C:\tafelvoetbal\tafelvoetbal-server\data\avatars\empty-avatar.jpg";
            }

            return System.IO.File.ReadAllBytes(filePath);
        }

        public async Task<int> GetPlayerRank(string id)
        {
            var allPlayers = await GetPlayers();

            var groupedPlayers = allPlayers.GroupBy(player => player.VisibleRating)
                .OrderByDescending(group => group.Key);
            int rank = 1;
            foreach (var group in groupedPlayers)
            {
                foreach (var player in group)
                {
                    if (player.Id.Equals(id))
                    {
                        if (player.Active)
                        {
                            return rank;
                        }

                        return -1;
                    }
                }

                rank += group.Count(player => player.Active);
            }

            throw new KeyNotFoundException();
        }

        public async Task DeletePlayer(string playerId)
        {
            var player = await _dbContext.Players.FindAsync(playerId);
            if (player != null)
            {
                _dbContext.Attach(player);
                _dbContext.Remove(player);
                _dbContext.SaveChanges();
            }
        }

        internal async Task DeletePlayers()
        {
            await _dbContext.DeletePlayers();
        }

        internal async Task UpdatePlayerName(string id, string newName)
        {
            var player = await _dbContext.Players.FindAsync(id);
            if (player != null)
            {
                player.Name = newName;
                _dbContext.SaveChanges();
            }
        }

        internal async Task UpdateAvatar(string id, IFormFile newAvatar)
        {
            await SaveAvatar(id, newAvatar);
        }

        public async Task<List<DynamicRatingPlayer>> GetPlayers(bool activeOnly = false)
        {
            var allPlayers = (await _leaderBoardService.GetLeaderBoard()).Item1;
            if (activeOnly)
            {
                return allPlayers.Where(player => player.Active).ToList();
            }

            return allPlayers;
        }

        internal async Task<List<Game>> GetPlayerGames(string id)
        {
            var result = (await _leaderBoardService.GetLeaderBoard()).Item2
                .Where(game => game.IsPlayedBy(id))
                .ToList();

            await AddPlayerNames(result);
            return result;
        }

        private async Task AddPlayerNames(List<Game> result)
        {
            var allPlayers = await GetPlayers();
            
            foreach (Game game in result)
            {
                List<PlayerPerformance> players = new()
                {
                    game.FirstTeam.FirstPlayer,
                    game.FirstTeam.SecondPlayer,
                    game.SecondTeam.FirstPlayer,
                    game.SecondTeam.SecondPlayer
                };

                players.ForEach(
                    async playerPerformance =>
                    {
                        var playerNameOrNull = allPlayers.Find(player => player.Id == playerPerformance.PlayerId);
                        if (playerNameOrNull != null)
                        {
                            playerPerformance.Name = playerNameOrNull.Name;
                        }
                        else
                        {
                            playerPerformance.Name = "Player not found";
                        }
                    });
            }
        }

        internal async Task<PlayerGamePage> GetPlayerGames(string id, int pageNumber)
        {
            var result = await _dbContext.GetPlayerGames(id, pageNumber);
            await AddPlayerNames(result.Games);
            return result;
        }

        public async Task UpdatePlayerActive(string id, bool active)
        {
            var player = await _dbContext.Players.FindAsync(id);
            if (player != null)
            {
                player.Active = active;
                _dbContext.SaveChanges();
            }
        }
    }
}