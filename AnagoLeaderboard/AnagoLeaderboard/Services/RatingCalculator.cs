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

        public void CalculateRating()
        {
            var team1Score = _team1Goals > _team2Goals ? 1 : 0;
            var team2Score = _team2Goals > _team1Goals ? 1 : 0;
            if (_team1Goals == _team2Goals) throw new InvalidDataException("It cannot be a draw");

            var pointsFactor = Math.Abs(_team1Goals - _team2Goals) * 0.2;

            var team1Rating = (_team2Player1Rating + _team2Player2Rating) / 2;
            var team2Rating = (_team1Player1Rating + _team1Player2Rating) / 2;

            double team1Ratio = (team1Rating - team2Rating) / (double)400;
            double team2Ratio = (team2Rating - team1Rating) / (double)400;
            
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

            var roundedTeam2Delta = (int)Math.Round(team2Delta, 0);

            _game.FirstTeam.FirstPlayer.NewRating = _team1Player1Rating + roundedTeam1Player1Delta;
            _game.FirstTeam.SecondPlayer.NewRating = _team1Player2Rating + roundedTeam1Player2Delta;
            _game.SecondTeam.FirstPlayer.NewRating = _team2Player1Rating + roundedTeam2Player1Delta;
            _game.SecondTeam.SecondPlayer.NewRating = _team2Player2Rating + roundedTeam2Player2Delta;


        }
    }
}
