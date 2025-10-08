using AnagoLeaderboard.Services;

namespace AnagoLeaderboard.Models.Results;

public class GameWithAnalytics : Game
{
    public double[] ProbabilityPerScore { get; set; }
    public int[] DeltaPerScore { get; set; } = new int[21];

    /// <summary>
    /// Int between 0 and 20 (included) representing the expected score for the first team.
    /// 0 means first team one with 10 - 0, 1 means first team one with 10 - 1, ..., 9 means first team one with 10 - 9,
    /// 10 means with 10 - 10, 11 means with 9 - 10, ..., 20 means with 0 - 10.
    /// </summary>
    public int ExpectedScore { get; set; }

    /// <summary>
    /// Int between 0 and 29 representing the actual score for the first team.
    /// Same system as ExpectedScore.
    /// </summary>
    public int ActualScore { get; set; }
    
    public double ProbabilityFirstTeamWins { get; set; }

    public GameWithAnalytics(Game game)
    {
        Id = game.Id;
        FirstTeam = game.FirstTeam;
        SecondTeam = game.SecondTeam;
        CreatedAt = game.CreatedAt;

        ActualScore = SecondTeam.Goals - FirstTeam.Goals + 10;

        ProbabilityFirstTeamWins = RatingCalculator.ProbTeam1Wins(
            FirstTeam.FirstPlayer.OldRating,
            FirstTeam.SecondPlayer.OldRating,
            SecondTeam.FirstPlayer.OldRating,
            SecondTeam.SecondPlayer.OldRating);

        // Number of goals team 1 is expected to win by, so from -10 to 10.
        var expectedMargin = ExpectedScoreCalculator.GetExpectedMargin(ProbabilityFirstTeamWins);
        
        ExpectedScore = expectedMargin * -1 + 10;
        ProbabilityPerScore = GetProbabilityPerScore(ProbabilityFirstTeamWins);
        DeltaPerScore = GetDeltaPerScore();
    }

    private double[] GetProbabilityPerScore(double probTeam1Wins)
    {
        var result = new double[21];
        for (var i = 0; i < 21; i++)
        {
            var team1Score = i <= 10 ? 10 : 10 - (i - 10);
            var team2Score = i >= 10 ? 10 : 10 - (10 - i);

            var prob = ProbabilityPerScoreCalculator.ScorelineProbability(probTeam1Wins, team1Score, team2Score);
            result[i] = prob;
        }

        return result;
    }

    private int[] GetDeltaPerScore()
    {
        var result = new int[21];
        for (var i = 0; i < 21; i++)
        {
            var team1Score = i <= 10 ? 10 : 10 - (i - 10);
            var team2Score = i >= 10 ? 10 : 10 - (10 - i);

            var delta = RatingCalculator.GetDelta(
                FirstTeam.FirstPlayer.OldRating,
                FirstTeam.SecondPlayer.OldRating,
                SecondTeam.FirstPlayer.OldRating,
                SecondTeam.SecondPlayer.OldRating,
                team1Score,
                team2Score);

            if (delta < 0)
            {
                // We want to show the positive delta for the winning team.
                delta *= -1;
            }
            
            result[i] = (int)Math.Round(delta, 0);;
        }

        return result;
    }
}