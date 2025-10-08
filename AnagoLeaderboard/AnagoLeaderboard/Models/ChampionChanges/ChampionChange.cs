using AnagoLeaderboard.Models.Results;

namespace AnagoLeaderboard.Models;

public class ChampionChange(
    ChampionInfo OldChampion,
    ChampionInfo NewChampion,
    DateTime Date, 
    Game? DecidingGame)
{
    public ChampionInfo OldChampion { get; init; } = OldChampion;
    public ChampionInfo NewChampion { get; init; } = NewChampion;
    public DateTime Date { get; init; } = Date;
    public Game? DecidingGame { get; init; } = DecidingGame;

    public string ToString()
    {
        var reasonString = DecidingGame == null 
            ? $"{OldChampion.ToString()} speelde niet voor 2 weken" 
            : $"{DecidingGame.ToString()}";
        return $"{Date.ToString("dd-MM")}: {OldChampion.ToString()} -> {NewChampion.ToString()}: {reasonString}";
    }
}
