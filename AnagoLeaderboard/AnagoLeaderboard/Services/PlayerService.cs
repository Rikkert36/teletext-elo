using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models.RequestParameters;
using AnagoLeaderboard.Models.Results;
using Microsoft.EntityFrameworkCore;

namespace AnagoLeaderboard.Services
{
    public class PlayerService
    {
        private readonly DatabaseContext _dbContext;

        public PlayerService(DatabaseContext dbContext) {
            _dbContext = dbContext; 
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

        public async Task<List<Player>> GetPlayers()
        {
            return await _dbContext.Players.ToListAsync();
        }

        public async Task<Player> GetPlayer(string Id)
        {
            var result = await _dbContext.Players.FindAsync(Id);
            if (result == null)
            {
                throw new KeyNotFoundException($"player {Id} does not exist");
            } else
            {
                return result;
            }
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
            } else
            {
                filePath = @$"C:\tafelvoetbal\tafelvoetbal-server\data\avatars\empty-avatar.jpg";
            }
            return System.IO.File.ReadAllBytes(filePath);


        }

        internal async Task<byte[]> GetPlayerOneAvatar()
        {
            var players = await _dbContext.Players.ToListAsync();
            var highestRatedPlayer = players.OrderByDescending(player => player.Rating).FirstOrDefault();
            var filePath = @$"C:\tafelvoetbal\tafelvoetbal-server\data\avatars\{highestRatedPlayer.Id}";
            if (File.Exists(filePath))
            {
            } else
            {
                filePath = @$"C:\tafelvoetbal\tafelvoetbal-server\data\avatars\empty-avatar.jpg";
            }
            return System.IO.File.ReadAllBytes(filePath);
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
    }
}
