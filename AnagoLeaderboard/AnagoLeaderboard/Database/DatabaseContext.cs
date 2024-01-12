using AnagoLeaderboard.Models.Results;
using Microsoft.EntityFrameworkCore;

namespace AnagoLeaderboard.Database
{
    public class DatabaseContext : DbContext
    {
        public DatabaseContext(DbContextOptions<DatabaseContext> options) : base(options)
        {

        }

        public DbSet<Player> Players => Set<Player>();
        public DbSet<Game> Games => Set<Game>();

        public async Task Clear()
        {
            var allPlayers = Players.ToList();
            Players.RemoveRange(allPlayers);
            await this.SaveChangesAsync();
        }

        public async Task AddGame(Game game)
        {
            Games.Add(game);
            List<string> playerIds = game.GetPlayerIds();

            var winningTeam = game.FirstTeam.Goals > game.SecondTeam.Goals ? game.FirstTeam : game.SecondTeam;
            var playerPerformances = game.GetPlayerPerformances();

            foreach (var playerId in playerIds)
            {
                var player = await Players.FindAsync(playerId);
                if (player != null)
                {
                    bool won = winningTeam.FirstPlayer.PlayerId == playerId || winningTeam.SecondPlayer.PlayerId == playerId;
                    player.Rating = playerPerformances.Find(performance => performance.PlayerId.Equals(playerId))!.NewRating;
                    var goalsFor = game.GetGoalsFor(playerId);
                    var goalsAgainst = game.GetGoalsAgainst(playerId);
                    player.AddGame(won, goalsFor, goalsAgainst);
                }
            }
            await SaveChangesAsync();
        }

        internal async Task AddOldRatings(Game game)
        {
            var playerPerformances = game.GetPlayerPerformances();
            foreach (var playerPerformance in playerPerformances)
            {
                var player = await Players.FindAsync(playerPerformance.PlayerId);
                playerPerformance.OldRating = player!.Rating;
            }
        }
        internal async Task<List<int>> GetNumberOfGamesPlayedByPlayers(Game game)
        {
            List<int> result = new List<int>();
            List<string> playerIds = game.GetPlayerIds();
            foreach(var playerId in playerIds)
            {
                var player = await Players.FindAsync(playerId);
                if (player != null)
                {
                    result.Add(player.NumberOfGames);
                } else
                {
                    throw new KeyNotFoundException($"Player: {playerId} not found");
                }
            }
            return result;
        }

        public async Task DeleteGames()
        {
            var allGames = Games.ToList();
            Games.RemoveRange(allGames);
            await this.SaveChangesAsync();
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Game>()
                .OwnsOne(g => g.FirstTeam, tp =>
                {
                    tp.OwnsOne(tp => tp.FirstPlayer);
                    tp.OwnsOne(tp => tp.SecondPlayer);
                });

            modelBuilder.Entity<Game>()
                .OwnsOne(g => g.SecondTeam, tp =>
                {
                    tp.OwnsOne(tp => tp.FirstPlayer);
                    tp.OwnsOne(tp => tp.SecondPlayer);
                });

            base.OnModelCreating(modelBuilder);
        }

        internal async Task DeletePlayers()
        {
            var allPlayes = Players.ToList();
            Players.RemoveRange(allPlayes);
            await this.SaveChangesAsync();
        }
    }
}
