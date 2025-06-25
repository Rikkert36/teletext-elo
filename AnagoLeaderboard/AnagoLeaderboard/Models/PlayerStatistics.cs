using AnagoLeaderboard.Models.Results;

namespace AnagoLeaderboard.Models;

public class PlayerStatistics(
    List<PlayerGameNumberTuple> gamesWith,
    List<PlayerGameNumberTuple> gamesAgainst)
{
    public List<PlayerGameNumberTuple> GamesWith { get; } = gamesWith;
    public List<PlayerGameNumberTuple> GamesAgainst { get; } = gamesAgainst;

}

public class PlayerGameNumberTuple
{
    public PlayerGameNumberTuple(DynamicRatingPlayer player, int delta, int numberOfGames)
    {
        Player = player;
        Delta = delta;
        NumberOfGames = numberOfGames;
    }

    public DynamicRatingPlayer Player { get; }
    public int Delta { get; }
    
    public int NumberOfGames { get; }
}