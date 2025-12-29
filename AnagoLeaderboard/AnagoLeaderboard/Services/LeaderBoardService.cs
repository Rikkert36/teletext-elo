using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models.Results;
using Microsoft.EntityFrameworkCore;

namespace AnagoLeaderboard.Services
{
    public class LeaderBoardService
    {
        private readonly GameService _gameService;
        private readonly DatabaseContext _dbContext;

        public LeaderBoardService(GameService gameService, DatabaseContext dbContext)
        {
            _gameService = gameService;
            _dbContext = dbContext;
        }

        public async Task<GamesInRange> GetGamesInRange(DateTime start, DateTime end)
        {
            var allGames = (await GetLeaderBoard()).Item2;

            var result = allGames
                .Where(game => game.CreatedAt >= start && game.CreatedAt <= end)
                .ToList();

            var notLatestGame = true;
            if (result.Count > 0)
            {
                var oldestGameFromWeek = result.Min(game => game.CreatedAt);
                var oldestGameEver = await _gameService.GetOldestDate();
                notLatestGame = oldestGameFromWeek != oldestGameEver;
            }

            var analyzedGames = result.Select(game => new GameWithAnalytics(game));

            return new GamesInRange()
            {
                Games = analyzedGames.ToList(),
                GamesBefore = notLatestGame
            };
        }

        public async Task<List<DynamicRatingPlayer>> GetCurrentLeaderBoard()
        {
            return (await GetLeaderBoard()).Item1
                .Where(player => player.Active)
                .ToList();
        }
        
        public async Task<(List<DynamicRatingPlayer>, List<Game>)> GetLeaderBoard(int? year = null)
        {
            var allGames = year is null
                ? await _gameService.GetGames()
                : await _gameService.GetGamesUntilYear(year.Value);

            var playersById = await _dbContext.Players.ToDictionaryAsync(p => p.Id);

            var statsByPlayerId = new Dictionary<string, PlayerStats>();

            foreach (var game in allGames)
            {
                var gamePlayerIds = game.GetPlayerIds(); // T1P1, T1P2, T2P1, T2P2

                EnsurePlayers(gamePlayerIds, statsByPlayerId);

                var ratingCalculator = new RatingCalculator(game);

                var updates = ratingCalculator.GetUpdates(gamePlayerIds.Select(id => statsByPlayerId[id]).ToList());

                game.FirstTeam.DeltaPoints = updates[0].Delta;
                game.SecondTeam.DeltaPoints = updates[2].Delta;

                for (int i = 0; i < gamePlayerIds.Count; i++)
                    statsByPlayerId[gamePlayerIds[i]] = updates[i].Stats;
            }

            var rated = statsByPlayerId
                .Select(kvp => new DynamicRatingPlayer(
                    playersById[kvp.Key],
                    kvp.Value.Rating,
                    kvp.Value.Std,
                    kvp.Value.GamesPlayed,
                    kvp.Value.GamesWon,
                    kvp.Value.GamesLost,
                    kvp.Value.GoalsFor,
                    kvp.Value.GoalsAgainst
                ))
                .OrderByDescending(p => p.VisibleRating)
                .ToList();

            var unrated = playersById.Values
                .Where(p => !statsByPlayerId.ContainsKey(p.Id))
                .Select(p => new DynamicRatingPlayer(p, 1000, 1000, 0, 0, 0, 0, 0))
                .ToList();

            rated.AddRange(unrated);
            return (rated, allGames);
        }
        
        private static void EnsurePlayers(
            IEnumerable<string> playerIds,
            IDictionary<string, PlayerStats> statsByPlayerId)
        {
            foreach (var id in playerIds)
                statsByPlayerId.TryAdd(id, PlayerStats.NewPlayer);
        }
        
        public async Task<List<DynamicRatingPlayer>> GetLeaderBoardByYear(int year)
        {
            var (players, games) = await GetLeaderBoard(year);
            return players
                .Where(player => games.Find(game => game.IsPlayedBy(player.Id) && game.CreatedAt.Year == year)
                                 != null)
                .ToList();
        }
    }
}