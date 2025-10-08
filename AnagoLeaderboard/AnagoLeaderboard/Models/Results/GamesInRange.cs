namespace AnagoLeaderboard.Models.Results
{
    public class GamesInRange
    {
        public List<GameWithAnalytics> Games { get; set; }
        public bool GamesBefore { get; set; }
    }
}
