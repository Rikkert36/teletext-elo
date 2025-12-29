namespace AnagoLeaderboard.Services;

public sealed record PlayerStats(
    int Rating,
    double Std,
    int GamesPlayed,
    int GamesWon,
    int GamesLost,
    int GoalsFor,
    int GoalsAgainst)
{
    public static PlayerStats NewPlayer => new(1000, 1000, 0, 0, 0, 0, 0);
}
