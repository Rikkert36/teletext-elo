using AnagoLeaderboard.Models;
using AnagoLeaderboard.Models.Results;

namespace AnagoLeaderboard.Services
{
    public class RatingCalculator
    {
        private readonly Game _game;
        private readonly int _team1Goals;
        private readonly int _team2Goals;

        //maximum number you can grow (if you win by a 5 goal margin) (assuming that you played at least 10 games)
        private const double Lambda = 0.2303;
        private const int KFactor = 50;

        /// <summary>
        /// Computes new rating based on Elo based calculation.
        /// Additionaly takes account points factor which takes a win by a 5-goal margin as a standard win, so whichs translates to a factor of 1.
        /// The margin = pointfactor relations is as follows: 1 = 0.2, 2 = 0.4, 3 = 0.6, 4 = 0.8, 5 = 1, 6  = 1.2, 7 = 1.4, 8 = 1.6, 9 = 1.8, 10 = 2
        /// </summary>
        /// <param name="game"></param>
        /// <param name="gamesPlayed"></param>
        public RatingCalculator(Game game)
        {
            _game = game;
            _team1Goals = game.FirstTeam.Goals;
            _team2Goals = game.SecondTeam.Goals;
        }
        
        internal List<PlayerUpdate> GetUpdates(List<PlayerStats> currentPlayers)
        {
            var result = CalculateOutcome(currentPlayers);

            var players = _game.GetPlayers();

            for (int i = 0; i < 4; i++)
            {
                var oldStats = currentPlayers[i];
                var newStats = result[i].Stats;

                players[i].NewRating = (int)Math.Round(newStats.Rating - newStats.Std);
                players[i].OldRating = (int)Math.Round(oldStats.Rating - oldStats.Std);
                players[i].SetStandardDeviation(oldStats.Std, newStats.Std);
            }

            return result;
        }
        
        private List<PlayerUpdate> CalculateOutcome(IReadOnlyList<PlayerStats> players)
        {
            var baseDelta = GetDelta(
                players[0].Rating, players[1].Rating, players[2].Rating, players[3].Rating,
                _team1Goals, _team2Goals);

            var teamDelta = new[] { baseDelta, -baseDelta };
            var teamGoals = new[] { _team1Goals, _team2Goals };

            var teamScore = new[]
            {
                _team1Goals > _team2Goals ? 1 : 0,
                _team2Goals > _team1Goals ? 1 : 0
            };

            var result = new List<PlayerUpdate>(capacity: 4);

            for (int i = 0; i < 4; i++)
            {
                var p = players[i];

                int team = GetTeamIndex(i);
                int opp = GetOppTeamIndex(team);

                int adjustedDelta = (int)Math.Round(
                    teamDelta[team] * ExperienceFactor(p.GamesPlayed),
                    0);

                var updatedStats = p with
                {
                    Rating = p.Rating + adjustedDelta,
                    Std = NewStd(p.GamesPlayed),
                    GamesPlayed = p.GamesPlayed + 1,
                    GamesWon = p.GamesWon + teamScore[team],
                    GamesLost = p.GamesLost + teamScore[opp],
                    GoalsFor = p.GoalsFor + teamGoals[team],
                    GoalsAgainst = p.GoalsAgainst + teamGoals[opp]
                };

                result.Add(new PlayerUpdate(
                    Stats: updatedStats,
                    Delta: (int)Math.Round(teamDelta[team], 0)
                ));
            }

            return result;
        }

        public static double GetDelta(
            int rating1,
            int rating2,
            int rating3,
            int rating4,
            int team1Goals,
            int team2Goals)
        {
            double expected1 = ProbTeam1Wins(rating1, rating2, rating3, rating4);

            var team1Score = team1Goals >= team2Goals ? 1 : 0;
            
            var pointsFactor = Math.Abs(team1Goals - team2Goals) * 0.2;
            var delta = (team1Score - expected1) * KFactor * pointsFactor;

            return delta;
        }

        public static double ProbTeam1Wins(int rating11, int rating12, int rating21, int rating22)
        {
            var team1Rating = (rating11 + rating12) / 2;
            var team2Rating = (rating21 + rating22) / 2;

            double team1Ratio = (team2Rating - team1Rating) / (double)400;

            double team1Expected = 1 / (Math.Pow(10, team1Ratio) + 1);

            return team1Expected;
        }
        
        private static int GetTeamIndex(int playerIndex) => playerIndex / 2;

        private static int GetOppTeamIndex(int teamIndex) => 1 - teamIndex;

        private static double ExperienceFactor(int gamesPlayed) =>
            Math.Max(1, 2 - (0.1 * gamesPlayed));

        private static double NewStd(int gamesPlayed)
        {
            double decreaseFactor = Math.Exp(-Lambda * (gamesPlayed + 1));
            return 1000 * decreaseFactor;
        }
    }
}