using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models;
using AnagoLeaderboard.Models.Results;

namespace AnagoLeaderboard.Services;

public class ChampionService
{
    private readonly DatabaseContext _dbContext;
    private readonly GameService _gameService;
    private readonly Random _random;

    private const int RandomnessSeed = 36;

    public ChampionService(DatabaseContext dbContext, GameService gameService)
    {
        _dbContext = dbContext;
        _gameService = gameService;
        _random = new Random(RandomnessSeed);
    }

    public async Task<List<ChampionChange>> GetChampionHistory()
    {
        var result = new List<ChampionChange>();
        
        var games = await _gameService.GetGames();
        var daysSinceChampionPlayed = 0;
        
        var firstChampionToss = _random.Next(0, 2);
        var firstWinningTeam = games[0].GetWinningTeam();

        var firstWinningPerformance = firstChampionToss == 0
            ? firstWinningTeam.FirstPlayer
            : firstWinningTeam.SecondPlayer;
        var currentChampion = new ChampionInfo(firstWinningPerformance.PlayerId, firstWinningPerformance.Name);
        
        var gamesPerDay = GetGamesPerDay(games);
        
        for (var currentDate = games[0].CreatedAt; currentDate <= DateTime.Now; currentDate = currentDate.AddDays(1))
        {
            if (daysSinceChampionPlayed > 15)
            {
                var playerPool = GetPlayersThatDidPlay(gamesPerDay, currentDate);
                if (playerPool.Count > 0)
                {
                    var newChampionIndex = _random.Next(0, playerPool.Count);
                    var newChampion = playerPool.ElementAt(newChampionIndex);
                    result.Add(new ChampionChange(currentChampion, newChampion, currentDate, null));
                    currentChampion = newChampion;
                    daysSinceChampionPlayed = 0;
                }
            }
            
            if (!gamesPerDay.ContainsKey(currentDate.Date))
            {
                daysSinceChampionPlayed++;
                continue;
            }

            var gamesToday = gamesPerDay[currentDate.Date];
            foreach (var game in gamesToday)
            {
                if (!game.IsPlayedBy(currentChampion.Id)) continue;
                
                daysSinceChampionPlayed = 0;
                
                if (game.IsWonBy(currentChampion.Id)) continue;
                
                var championToss = _random.Next(0, 2);
                var winningTeam = game.GetWinningTeam();
                var newChampionPerformance = championToss == 0
                    ? winningTeam.FirstPlayer
                    : winningTeam.SecondPlayer;

                var newChampion =
                    new ChampionInfo(newChampionPerformance.PlayerId, newChampionPerformance.Name);
                result.Add(new ChampionChange(currentChampion, newChampion, game.CreatedAt, game));
                currentChampion = newChampion;
            }

        }

        return result;
    }
    
    private HashSet<ChampionInfo> GetPlayersThatDidPlay(Dictionary<DateTime, List<Game>> gamesPerDay, DateTime currentDate)
    {
        var result = new HashSet<ChampionInfo>();
        for (var date = currentDate.AddDays(-15); date < currentDate; date = date.AddDays(1))
        {
            if (!gamesPerDay.ContainsKey(date.Date)) continue;
            
            var games = gamesPerDay[date.Date];
            foreach (var game in games)
            {
                var players = game.GetPlayers();
                foreach (var player in players)
                {
                    result.Add(new ChampionInfo(player.PlayerId, player.Name));
                }
            }
        }

        return result;
    }
    
    private Dictionary<DateTime, List<Game>> GetGamesPerDay(List<Game> games)
    {
        var result = new Dictionary<DateTime, List<Game>>();
        foreach (var game in games)
        {
            var date = game.CreatedAt.Date;
            if (!result.ContainsKey(date))
            {
                result[date] = new List<Game>();
            }
            result[date].Add(game);
        }

        return result;
    }
}