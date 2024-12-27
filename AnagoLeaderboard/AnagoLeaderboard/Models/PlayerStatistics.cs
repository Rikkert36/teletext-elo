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
    public PlayerGameNumberTuple(DynamicRatingPlayer player, int won, int lost)
    {
        Player = player;
        Won = won;
        Lost = lost;
    }

    public DynamicRatingPlayer Player { get; }
    public int Won { get; }
    public int Lost { get; }
}