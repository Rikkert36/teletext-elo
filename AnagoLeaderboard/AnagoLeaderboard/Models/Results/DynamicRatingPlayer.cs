namespace AnagoLeaderboard.Models.Results
{
    public class DynamicRatingPlayer : Player
    {
        public int VisibleRating { get; private set; }

        /// <summary>
        /// The highest <see cref="VisibleRating"/> this player has ever held, taken over
        /// every game in the replay. Equal to <see cref="VisibleRating"/> for a player
        /// currently at their best, and 0 for anyone who has never played.
        ///
        /// This is the number an icoon's trading card is rated on: an icoon says who
        /// someone was, not what their form has decayed to. Note it is the peak of the
        /// *visible* rating rather than the raw one - the inexperience deduction shrinks as
        /// you play, so the two peak at different moments and only this one is what a card
        /// would ever have printed.
        /// </summary>
        public int PeakVisibleRating { get; private set; }

        public DynamicRatingPlayer(
            Player player,
            int rating,
            double inexperienceDeduction,
            int gamesPlayed,
            int wins,
            int losses,
            int goalsFor,
            int goalsAgainst,
            int? peakVisibleRating = null) : base(player)
        {
            Rating = rating;
            VisibleRating = (int)Math.Round(Rating - inexperienceDeduction);
            PeakVisibleRating = peakVisibleRating ?? VisibleRating;
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
