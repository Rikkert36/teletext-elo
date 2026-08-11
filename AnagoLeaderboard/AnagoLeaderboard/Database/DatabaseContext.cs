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
        public DbSet<PackClaim> PackClaims => Set<PackClaim>();
        public DbSet<CardInstance> CardInstances => Set<CardInstance>();

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

            modelBuilder.Entity<PackClaim>(claim =>
            {
                claim.HasKey(c => c.Id);

                // A string rather than EF's default int, so a row stays readable in a database
                // browser and an added source cannot silently renumber the existing ones.
                claim.Property(c => c.Source).HasConversion<string>();

                claim.HasOne<Player>()
                    .WithMany()
                    .HasForeignKey(c => c.PlayerId)
                    .OnDelete(DeleteBehavior.Cascade);

                claim.HasOne<Game>()
                    .WithMany()
                    .HasForeignKey(c => c.GameId)
                    .OnDelete(DeleteBehavior.Cascade);

                // These two indexes *are* the double-claim guard. Two tabs racing means one
                // insert fails, and that failure is the 409 - there is no separate check to
                // forget to write.
                claim.HasIndex(c => new { c.PlayerId, c.Source, c.GameId }).IsUnique();

                // Filtered on purpose. Unfiltered it would also forbid a player claiming two
                // *game* packs on one day, which is the normal case. SQLite treats NULLs as
                // distinct, so the index above does not cover the dailies either.
                claim.HasIndex(c => new { c.PlayerId, c.ClaimDate })
                    .IsUnique()
                    .HasFilter($"\"{nameof(PackClaim.Source)}\" = '{nameof(PackSource.Daily)}'");
            });

            modelBuilder.Entity<CardInstance>(card =>
            {
                card.HasKey(c => c.Id);

                card.HasOne<Player>()
                    .WithMany()
                    .HasForeignKey(c => c.PlayerId)
                    .OnDelete(DeleteBehavior.Cascade);

                card.HasOne<Player>()
                    .WithMany()
                    .HasForeignKey(c => c.SubjectPlayerId)
                    .OnDelete(DeleteBehavior.Cascade);

                card.HasOne<PackClaim>()
                    .WithMany()
                    .HasForeignKey(c => c.PackClaimId)
                    .OnDelete(DeleteBehavior.Cascade);

                // Two cascade paths reach a card from a deleted game - this one and the claim's
                // - which SQLite is happy to have. Kept because the direct one says what the
                // rule is: pack size depends on the score, so deleting the game must take the
                // cards it minted.
                card.HasOne<Game>()
                    .WithMany()
                    .HasForeignKey(c => c.GameId)
                    .OnDelete(DeleteBehavior.Cascade);

                // Every read of a collection is "how many of each subject does this player
                // hold", so that is the index.
                card.HasIndex(c => new { c.PlayerId, c.SubjectPlayerId });
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