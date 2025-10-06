using AnagoLeaderboard.Models.Results;

namespace AnagoLeaderboard.Models;

public record ChampionChange(
    ChampionInfo OldChampion,
    ChampionInfo NewChampion,
    DateTime Date, 
    Game? DecidingGame);
