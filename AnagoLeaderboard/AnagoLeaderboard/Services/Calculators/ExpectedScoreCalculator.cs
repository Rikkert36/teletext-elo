namespace AnagoLeaderboard.Services;

public class ExpectedScoreCalculator
{
    /// <summary>
    /// Trained on historical data from 2024 and 2025 seasons with about 2000 games.
    /// </summary>
    private const double A = 0.240038;
    
    public static int GetExpectedMargin(double probTeam1Wins)
    {
        double margin = GetExactExpectedMargin(probTeam1Wins);

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

    /// <summary>
    /// The same curve, without the rounding and without the +/-1 clamp.
    ///
    /// <see cref="GetExpectedMargin"/> answers "what scoreline should we call expected", and for
    /// that a whole number is right and a predicted margin of zero is useless - a game has to be
    /// expected to go one way or the other. Both of those decisions are wrong for an
    /// <em>average</em>: the clamp turns a genuinely level fixture into a predicted +/-1, so
    /// anybody who is repeatedly the marginal favourite accumulates a systematic shortfall against
    /// a margin they were never really expected to win by, and the rounding scatters up to half a
    /// goal per game on top. Over hundreds of games that bias is larger than the effect being
    /// measured.
    ///
    /// So the head-to-head metric reads this and the pack sizing reads the integer. Same curve,
    /// same constant, different questions.
    /// </summary>
    public static double GetExactExpectedMargin(double probTeam1Wins)
    {
        double z = Math.Log(probTeam1Wins / (1.0 - probTeam1Wins));
        return 10 * Math.Tanh(A * z);
    }
}