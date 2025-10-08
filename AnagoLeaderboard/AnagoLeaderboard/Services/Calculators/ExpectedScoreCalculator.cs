namespace AnagoLeaderboard.Services;

public class ExpectedScoreCalculator
{
    /// <summary>
    /// Trained on historical data from 2024 and 2025 seasons with about 2000 games.
    /// </summary>
    private const double A = 0.240038;
    
    public static int GetExpectedMargin(double probTeam1Wins)
    {
        double z = Math.Log(probTeam1Wins / (1.0 - probTeam1Wins));
        double margin = 10 * Math.Tanh(A * z);
        
        if (margin >= 0 && margin < 1)
        {
            return 1;
        } 
        
        if (margin < 0 && margin > -1)
        {
            return -1;
        }
        
        return (int)Math.Round(margin);
    }
}