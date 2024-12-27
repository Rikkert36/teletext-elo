using AnagoLeaderboard.Models;
using AnagoLeaderboard.Models.Results;

namespace AnagoLeaderboard.Services
{
    public class RatingCalculator
    {
        //maximum number you can grow (if you win by a 5 goal margin) (assuming that you played at least 10 games)
        private readonly int _kFactor;

        private readonly Game _game;
        private readonly List<int> _gamesPlayed;
        private readonly int _team1Goals;
        private readonly int _team2Goals;
        private readonly int _team1Player1Rating;
        private readonly int _team1Player2Rating;
        private readonly int _team2Player1Rating;
        private readonly int _team2Player2Rating;

        private const double lambda = 0.2303;

        /// <summary>
        /// Computes new rating based on Elo based calculation.
        /// Additionaly takes account points factor which takes a win by a 5-goal margin as a standard win, so whichs translates to a factor of 1.
        /// The margin = pointfactor relations is as follows: 1 = 0.2, 2 = 0.4, 3 = 0.6, 4 = 0.8, 5 = 1, 6  = 1.2, 7 = 1.4, 8 = 1.6, 9 = 1.8, 10 = 2
        /// </summary>
        /// <param name="game"></param>
        /// <param name="kFactor"></param>
        public RatingCalculator(Game game, List<int> gamesPlayed, int kFactor = 50)
        {
            _game = game;
            _gamesPlayed = gamesPlayed;
            _kFactor = kFactor;
            _team1Goals = game.FirstTeam.Goals;
            _team2Goals = game.SecondTeam.Goals;
            _team1Player1Rating = game.FirstTeam.FirstPlayer.OldRating;
            _team1Player2Rating = game.FirstTeam.SecondPlayer.OldRating;
            _team2Player1Rating = game.SecondTeam.FirstPlayer.OldRating;
            _team2Player2Rating = game.SecondTeam.SecondPlayer.OldRating;
        }

        internal List<(int rating, double std, int gamesPlayed, int gamesWon, int gamesLost, int goalsFor, int goalsAgainst)> 
            GetUpdates(List<(int rating, double std, int gamesWon, int gamesLost, int goalsFor, int goalsAgainst)> currentValues)
        {
            var result = CalculateOutcome(
                currentValues.Select(value => (value.rating)).ToList(),
                currentValues.Select(value => (value.gamesWon)).ToList(),
                currentValues.Select(value => (value.gamesLost)).ToList(),
                currentValues.Select(value => (value.goalsFor)).ToList(),
                currentValues.Select(value => (value.goalsAgainst)).ToList()
            );

            _game.FirstTeam.FirstPlayer.NewRating = (int)Math.Round(result[0].rating - result[0].std);
            _game.FirstTeam.SecondPlayer.NewRating = (int)Math.Round(result[1].rating - result[1].std);
            _game.SecondTeam.FirstPlayer.NewRating = (int)Math.Round(result[2].rating - result[2].std);
            _game.SecondTeam.SecondPlayer.NewRating = (int)Math.Round(result[3].rating - result[3].std);

            _game.FirstTeam.FirstPlayer.SetStandardDeviation(currentValues[0].std, result[0].std);
            _game.FirstTeam.SecondPlayer.SetStandardDeviation(currentValues[1].std, result[1].std);
            _game.SecondTeam.FirstPlayer.SetStandardDeviation(currentValues[2].std, result[2].std);
            _game.SecondTeam.SecondPlayer.SetStandardDeviation(currentValues[3].std, result[3].std);

            _game.FirstTeam.FirstPlayer.OldRating = (int)Math.Round(currentValues[0].rating - currentValues[0].std);
            _game.FirstTeam.SecondPlayer.OldRating = (int)Math.Round(currentValues[1].rating - currentValues[1].std);
            _game.SecondTeam.FirstPlayer.OldRating = (int)Math.Round(currentValues[2].rating - currentValues[2].std);
            _game.SecondTeam.SecondPlayer.OldRating = (int)Math.Round(currentValues[3].rating - currentValues[3].std);
            return result;
        }

        private List<(int rating, double std, int gamesPlayed, int gamesWon, int gamesLost, int goalsFor, int goalsAgainst)> 
            CalculateOutcome(List<int> rating, List<int> gamesWon, List<int> gamesLost, List<int> goalsFor, List<int> goalsAgainst)
        {
            var team1Score = _team1Goals > _team2Goals ? 1 : 0;
            var team2Score = _team2Goals > _team1Goals ? 1 : 0;
            if (_team1Goals == _team2Goals) throw new InvalidDataException("It cannot be a draw");

            var pointsFactor = Math.Abs(_team1Goals - _team2Goals) * 0.2;

            var team1Rating = (rating[0] + rating[1]) / 2;
            var team2Rating = (rating[2] + rating[3]) / 2;

            double team1Ratio = (team2Rating - team1Rating) / (double)400;
            double team2Ratio = (team1Rating - team2Rating) / (double)400;

            double team1Expected = 1 / (Math.Pow(10, team1Ratio) + 1);
            double team2Expected = 1 / (Math.Pow(10, team2Ratio) + 1);

            var team1Delta = (team1Score - team1Expected) * _kFactor * pointsFactor;
            var team2Delta = (team2Score - team2Expected) * _kFactor * pointsFactor;

            var team1Player1ExperienceFactor = Math.Max(1, 2 - (0.1 * _gamesPlayed[0]));
            var team1Player2ExperienceFactor = Math.Max(1, 2 - (0.1 * _gamesPlayed[1]));
            var team2Player1ExperienceFactor = Math.Max(1, 2 - (0.1 * _gamesPlayed[2]));
            var team2Player2ExperienceFactor = Math.Max(1, 2 - (0.1 * _gamesPlayed[3]));

            var roundedTeam1Player1Delta = (int)Math.Round(team1Delta * team1Player1ExperienceFactor, 0);
            var roundedTeam1Player2Delta = (int)Math.Round(team1Delta * team1Player2ExperienceFactor, 0);
            var roundedTeam2Player1Delta = (int)Math.Round(team2Delta * team2Player1ExperienceFactor, 0);
            var roundedTeam2Player2Delta = (int)Math.Round(team2Delta * team2Player2ExperienceFactor, 0);

            var stdValues = new double[4];
            for (int i = 0; i < 4; i++)
            {
                double decreaseFactor = Math.Exp(-lambda * (_gamesPlayed[i] + 1));
                stdValues[i] = 1000 * decreaseFactor;
            }

            var deltas = new List<int>() {
                roundedTeam1Player1Delta,
                roundedTeam1Player2Delta,
                roundedTeam2Player1Delta,
                roundedTeam2Player2Delta
                };

            List<(int rating, double std, int gamesPlayed, int gameWon, int gamesLost, int goalsFor, int goalsAgainst)> result = [];
            for (int i = 0; i < 4; i++)
            {
                result.Add(
                    (
                    rating[i] + deltas[i],
                    stdValues[i],
                    _gamesPlayed[i] + 1,
                    gamesWon[i] + (i < 2 ? team1Score : team2Score),
                    gamesLost[i] + (i < 2 ? team2Score : team1Score),
                    goalsFor[i] + (i < 2 ? _team1Goals : _team2Goals),
                    goalsAgainst[i] + (i < 2 ? _team2Goals : _team1Goals)
                    )
                );
            }
            return result;

        }
    }
}
