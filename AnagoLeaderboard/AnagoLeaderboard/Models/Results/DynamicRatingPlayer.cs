namespace AnagoLeaderboard.Models.Results
{
    public class DynamicRatingPlayer : Player
    {
        public int VisibleRating { get; private set; }

        public DynamicRatingPlayer(
            Player player, 
            int rating, 
            double inexperienceDeduction,
            int gamesPlayed,
            int wins,
            int losses,
            int goalsFor,
            int goalsAgainst) : base(player)
        {
            Rating = rating;
            VisibleRating = (int)Math.Round(Rating - inexperienceDeduction);
            NumberOfGames = gamesPlayed;
            NumberOfWins = wins;
            NumberOfLosses = losses;
            GoalsFor = goalsFor;
            GoalsAgainst = goalsAgainst;
        }

        public override string ToString()
        {
            return Name + " " + Active;
        }
    }
}
