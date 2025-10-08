namespace AnagoLeaderboard.Services;

public class ProbabilityPerScoreCalculator
{
    /// <summary>
    /// Probability of observing an exact scoreline (e.g. 10-7) in a race-to-10 game,
    /// given the Elo-predicted match win probability P1.
    /// </summary>
    public static double ScorelineProbability(double p1, int score1, int score2)
    {
        if (score1 != 10 && score2 != 10)
            throw new ArgumentException("One team must reach exactly 10.");

        // Step 1: invert Elo match probability P1 to rally win chance q
        // (numeric search since no closed form)
        double q = InvertMatchProbability(p1);

        // Step 2: compute probability of this exact scoreline using negative binomial
        if (score1 == 10)
        {
            int k = score2;
            double comb = BinomialCoefficient(10 + k - 1, k);
            return comb * Math.Pow(q, 10) * Math.Pow(1 - q, k);
        }
        else // score2 == 10
        {
            int k = score1;
            double comb = BinomialCoefficient(10 + k - 1, k);
            return comb * Math.Pow(1 - q, 10) * Math.Pow(q, k);
        }
    }

    private static double InvertMatchProbability(double P1)
    {
        // numeric bisection search for q in (0,1)
        double lo = 0.01, hi = 0.99;
        for (int iter = 0; iter < 60; iter++)
        {
            double mid = 0.5 * (lo + hi);
            double pmatch = MatchWinProbability(mid);
            if (pmatch > P1) hi = mid;
            else lo = mid;
        }
        return 0.5 * (lo + hi);
    }

    private static double MatchWinProbability(double q)
    {
        // probability Team1 wins race-to-10 given rally prob q
        double sum = 0.0;
        for (int k = 0; k < 10; k++)
        {
            double comb = BinomialCoefficient(10 + k - 1, k);
            sum += comb * Math.Pow(q, 10) * Math.Pow(1 - q, k);
        }
        return sum;
    }

    private static double BinomialCoefficient(int n, int k)
    {
        // compute C(n,k) in double (safe for n up to ~20)
        if (k < 0 || k > n) return 0;
        if (k == 0 || k == n) return 1;
        double res = 1.0;
        for (int i = 1; i <= k; i++)
            res = res * (n - (k - i)) / i;
        return res;
    }
}
