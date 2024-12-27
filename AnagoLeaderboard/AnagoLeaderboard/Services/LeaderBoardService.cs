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

            return new GamesInRange()
            {
                Games = result,
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
            var allGames = year == null
                ? await _gameService.GetGames()
                : await _gameService.GetGamesUntilYear(year!.Value);

            Dictionary<
                    string,
                    (int rating, double std, int gamesPlayed, int gamesWon, int gamesLost, int goalsFor, int
                    goalsAgainst)
                >
                playerIdToRating = new();

            var allPlayers = await _dbContext.Players.ToListAsync();
            foreach (var game in allGames)
            {
                var playerIds = game.GetPlayerIds();
                playerIds
                    .Where(playerIds => !playerIdToRating.ContainsKey(playerIds)).ToList()
                    .ForEach(playerId => playerIdToRating.Add(playerId, (1000, 1000, 0, 0, 0, 0, 0)));

                var gamesPlayed = playerIds
                    .Select(playerId => playerIdToRating[playerId].gamesPlayed)
                    .ToList();

                var currentValues = playerIds
                    .Select(
                        playerId => (
                            playerIdToRating[playerId].rating,
                            playerIdToRating[playerId].std,
                            playerIdToRating[playerId].gamesWon,
                            playerIdToRating[playerId].gamesLost,
                            playerIdToRating[playerId].goalsFor,
                            playerIdToRating[playerId].goalsAgainst
                        ))
                    .ToList();

                var ratingCalculator = new RatingCalculator(game, gamesPlayed);
                var updatedValues = ratingCalculator.GetUpdates(currentValues);
                playerIdToRating[playerIds[0]] = updatedValues[0];
                playerIdToRating[playerIds[1]] = updatedValues[1];
                playerIdToRating[playerIds[2]] = updatedValues[2];
                playerIdToRating[playerIds[3]] = updatedValues[3];
            }

            var result = playerIdToRating
                .Select(
                    kvp => new DynamicRatingPlayer(
                        allPlayers.Find(player => player.Id.Equals(kvp.Key)),
                        kvp.Value.rating,
                        kvp.Value.std,
                        kvp.Value.gamesPlayed,
                        kvp.Value.gamesWon,
                        kvp.Value.gamesLost,
                        kvp.Value.goalsFor,
                        kvp.Value.goalsAgainst)
                )
                .OrderByDescending(player => player.VisibleRating)
                .ToList();

            var zeroRatingPlayers = allPlayers
                .Where(player => !playerIdToRating.ContainsKey(player.Id))
                .Select(player => new DynamicRatingPlayer(player, 1000, 1000, 0, 0, 0, 0, 0))
                .ToList();

            result.AddRange(zeroRatingPlayers);
            return (result, allGames);
        }

        public async Task<List<DynamicRatingPlayer>> GetLeaderBoardByYear(int year)
        {
            var (players, games) = await GetLeaderBoard(year);
            return players
                .Where(
                    player => games.Find(
                                  game => game.IsPlayedBy(player.Id) && game.CreatedAt.Year == year)
                              != null)
                .ToList();
        }
    }
}