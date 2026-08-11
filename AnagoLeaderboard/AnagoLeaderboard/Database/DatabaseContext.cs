using AnagoLeaderboard.Models.RequestParameters;
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
        public DbSet<PlayerCollection> PlayerCollections => Set<PlayerCollection>();

        public async Task Clear()
        {
            var allPlayers = Players.ToList();
            Players.RemoveRange(allPlayers);
            var allGames = Games.ToList();
            Games.RemoveRange(allGames);
            await SaveChangesAsync();
        }

        public async Task AddGame(Game game)
        {
            Games.Add(game);
            await SaveChangesAsync();
        }

        public async Task DeleteGames()
        {
            var allGames = Games.ToList();
            Games.RemoveRange(allGames);
            await SaveChangesAsync();
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Game>()
                .OwnsOne(
                    g => g.FirstTeam,
                    tp =>
                    {
                        tp.OwnsOne(tp => tp.FirstPlayer);
                        tp.OwnsOne(tp => tp.SecondPlayer);
                    });

            modelBuilder.Entity<Game>()
                .OwnsOne(
                    g => g.SecondTeam,
                    tp =>
                    {
                        tp.OwnsOne(tp => tp.FirstPlayer);
                        tp.OwnsOne(tp => tp.SecondPlayer);
                    });

            // Spelled out rather than left to convention, which cannot infer either half of
            // this: Player.Id has a private setter, and a shared primary key one-to-one is
            // not something EF guesses.
            //
            // The cascade is required, not tidiness. PlayerService.DeletePlayer never loads
            // a collection, so without it deleting a player fails on a foreign key
            // violation the moment that player happens to own an album.
            modelBuilder.Entity<PlayerCollection>(collection =>
            {
                collection.HasKey(c => c.PlayerId);

                collection.HasOne<Player>()
                    .WithOne()
                    .HasForeignKey<PlayerCollection>(c => c.PlayerId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            base.OnModelCreating(modelBuilder);
        }

        internal async Task DeletePlayers()
        {
            var allPlayes = Players.ToList();
            Players.RemoveRange(allPlayes);
            await this.SaveChangesAsync();
        }

        internal async Task<List<Game>> GetGamesInRange(DateTime start, DateTime end)
        {
            var result = await Games
                .Where(game => game.CreatedAt >= start && game.CreatedAt <= end)
                .ToListAsync();
            return result;
            
        }
        
        internal async Task<DateTime> FirstGameDate()
        {
            return Games.Min(game => game.CreatedAt);
        }

        internal async Task<DateTime> GetOldestDate()
        {
            return Games.Min(game => game.CreatedAt);
        }

        internal async Task<PlayerGamePage> GetPlayerGames(string id, int pageNumber)
        {
            var pageSize = 10;

            var gamesOnPage = await Games
                .Where(game => game.FirstTeam.FirstPlayer.PlayerId == id
                               || game.FirstTeam.SecondPlayer.PlayerId == id
                               || game.SecondTeam.FirstPlayer.PlayerId == id
                               || game.SecondTeam.SecondPlayer.PlayerId == id)
                .OrderByDescending(game => game.CreatedAt)
                .Take(pageSize)
                .ToListAsync();

            var numberOfGames = Games.Count(game => game.FirstTeam.FirstPlayer.PlayerId == id
                                                  || game.FirstTeam.SecondPlayer.PlayerId == id
                                                  || game.SecondTeam.FirstPlayer.PlayerId == id
                                                  || game.SecondTeam.SecondPlayer.PlayerId == id);

            var numberOfPages = numberOfGames / pageSize + 1;
            return new PlayerGamePage()
            {
                Games = gamesOnPage,
                NumberOfPages = numberOfPages
            };
        }
    }
}