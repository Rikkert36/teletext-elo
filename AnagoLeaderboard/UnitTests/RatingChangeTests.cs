using AnagoLeaderboard.Models.RequestParameters;
using AnagoLeaderboard.Models.Results;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UnitTests
{
    [TestFixture]
    public class RatingChangeTests
    {
        List<int> _standardGamesPlayed = new List<int> { 10, 10, 10, 10 };
        [Test]
        public void RatingIsAverage_PointsFactorIsAverage()
        {
            var firstPlayerRating = 1500;
            var secondPlayerRating = 1500;
            var thirdPlayerRating = 1200;
            var fourthPlayerRating = 1200;
            var team1Goals = 10;
            var team2Goals = 5;        
            
            var game = GetGame(team1Goals, team2Goals, firstPlayerRating, secondPlayerRating, thirdPlayerRating, fourthPlayerRating);
            var ratingCalculator = new AnagoLeaderboard.Services.RatingCalculator(game, _standardGamesPlayed);
            //ratingCalculator.CalculateRating();
            
            Assert.That(game.FirstTeam.FirstPlayer.NewRating, Is.EqualTo(1508));
            Assert.That(game.SecondTeam.FirstPlayer.NewRating, Is.EqualTo(1192));
        }

        [Test]
        public void PointsFactorIsMax()
        {
            var firstPlayerRating = 1500;
            var secondPlayerRating = 1500;
            var thirdPlayerRating = 1200;
            var fourthPlayerRating = 1200;
            var team1Goals = 10;
            var team2Goals = 0;

            var game = GetGame(team1Goals, team2Goals, firstPlayerRating, secondPlayerRating, thirdPlayerRating, fourthPlayerRating);
            var ratingCalculator = new AnagoLeaderboard.Services.RatingCalculator(game, _standardGamesPlayed);
            //ratingCalculator.CalculateRating();

            Assert.That(game.FirstTeam.FirstPlayer.NewRating, Is.EqualTo(1515));
            Assert.That(game.SecondTeam.FirstPlayer.NewRating, Is.EqualTo(1185));
        }

        [Test]
        public void PointsFactorIsMin()
        {
            var firstPlayerRating = 1500;
            var secondPlayerRating = 1500;
            var thirdPlayerRating = 1200;
            var fourthPlayerRating = 1200;
            var team1Goals = 10;
            var team2Goals = 9;

            var game = GetGame(team1Goals, team2Goals, firstPlayerRating, secondPlayerRating, thirdPlayerRating, fourthPlayerRating);
            var ratingCalculator = new AnagoLeaderboard.Services.RatingCalculator(game, _standardGamesPlayed);
            //ratingCalculator.CalculateRating();

            Assert.That(game.FirstTeam.FirstPlayer.NewRating, Is.EqualTo(1502));
            Assert.That(game.SecondTeam.FirstPlayer.NewRating, Is.EqualTo(1198));
        }

        [Test]
        public void RatingIsNotAverage()
        {
            var firstPlayerRating = 1600;
            var secondPlayerRating = 1400;
            var thirdPlayerRating = 1100;
            var fourthPlayerRating = 1300;
            var team1Goals = 10;
            var team2Goals = 5;

            var game = GetGame(team1Goals, team2Goals, firstPlayerRating, secondPlayerRating, thirdPlayerRating, fourthPlayerRating);
            var ratingCalculator = new AnagoLeaderboard.Services.RatingCalculator(game, _standardGamesPlayed);
            //ratingCalculator.CalculateRating();

            Assert.That(game.FirstTeam.FirstPlayer.NewRating, Is.EqualTo(1608));
            Assert.That(game.FirstTeam.SecondPlayer.NewRating, Is.EqualTo(1408));
            Assert.That(game.SecondTeam.FirstPlayer.NewRating, Is.EqualTo(1092));
            Assert.That(game.SecondTeam.SecondPlayer.NewRating, Is.EqualTo(1292));
        }

        [Test]
        public void TestVaryingExperienceFactor()
        {
            var firstPlayerRating = 1500;
            var secondPlayerRating = 1500;
            var thirdPlayerRating = 1200;
            var fourthPlayerRating = 1200;
            var team1Goals = 10;
            var team2Goals = 0;
            var gamesPlayed = new List<int> { 0, 3, 6, 10 };

            var game = GetGame(team1Goals, team2Goals, firstPlayerRating, secondPlayerRating, thirdPlayerRating, fourthPlayerRating);
            
            var ratingCalculator = new AnagoLeaderboard.Services.RatingCalculator(game, gamesPlayed);
            //ratingCalculator.CalculateRating();

            Assert.That(game.FirstTeam.FirstPlayer.NewRating, Is.EqualTo(1530));
            Assert.That(game.FirstTeam.SecondPlayer.NewRating, Is.EqualTo(1526));
            Assert.That(game.SecondTeam.FirstPlayer.NewRating, Is.EqualTo(1179));
            Assert.That(game.SecondTeam.SecondPlayer.NewRating, Is.EqualTo(1185));
        }

        private static Game GetGame(int team1Goals, int team2Goals, params int[] ratings)
        {
            return new Game()
            {
                FirstTeam = new TeamPerformance()
                {
                    FirstPlayer = new PlayerPerformance()
                    {
                        PlayerId = "firstPlayerId",
                        OldRating = ratings[0]
                    },
                    SecondPlayer = new PlayerPerformance()
                    {
                        PlayerId = "secondPlayerId",
                        OldRating = ratings[1]
                    },
                    Goals = team1Goals
                },
                SecondTeam = new TeamPerformance()
                {
                    FirstPlayer = new PlayerPerformance()
                    {
                        PlayerId = "thirdPlayerId",
                        OldRating = ratings[2]
                    },
                    SecondPlayer = new PlayerPerformance()
                    {
                        PlayerId = "fourthPlayerRating",
                        OldRating = ratings[3]
                    },
                    Goals = team2Goals
                }
            };
        }

    }
}
