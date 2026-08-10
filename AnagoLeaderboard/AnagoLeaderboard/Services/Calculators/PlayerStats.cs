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

    /// <summary>
    /// The rating as shown anywhere in the app: the raw Elo minus the inexperience
    /// deduction, which is what <see cref="Std"/> is. A new player is 1000 minus 1000, so
    /// the scale says nothing about you until you have played.
    ///
    /// Expressed once here because it is computed in three places - the leaderboard rows,
    /// the per-game old/new ratings, and the all-time-high a legend's card is rated on -
    /// and those must not be allowed to drift apart.
    /// </summary>
    public int VisibleRating => (int)Math.Round(Rating - Std);
}
