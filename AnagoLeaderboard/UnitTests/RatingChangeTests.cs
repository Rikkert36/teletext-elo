using AnagoLeaderboard.Models.Results;
using AnagoLeaderboard.Services;
using System.Collections.Generic;
using System.Linq;

namespace UnitTests
{
    /// <summary>
    /// The Elo arithmetic: the expected score from the two team averages, the points factor
    /// that scales a win by its goal margin, and the experience factor that doubles the swing
    /// for someone who has just started.
    ///
    /// These assert on <see cref="PlayerStats.Rating"/> - the raw Elo - rather than on
    /// <see cref="PlayerPerformance.NewRating"/>, which is the visible rating and therefore
    /// carries the inexperience deduction on top of everything measured here.
    /// </summary>
    [TestFixture]
    public class RatingChangeTests
    {
        private readonly List<int> _standardGamesPlayed = new List<int> { 10, 10, 10, 10 };

        [Test]
        public void RatingIsAverage_PointsFactorIsAverage()
        {
            var team1Goals = 10;
            var team2Goals = 5;

            var updates = GetUpdates(team1Goals, team2Goals, _standardGamesPlayed, 1500, 1500, 1200, 1200);

            Assert.That(updates[0].Stats.Rating, Is.EqualTo(1508));
            Assert.That(updates[2].Stats.Rating, Is.EqualTo(1192));
        }

        [Test]
        public void PointsFactorIsMax()
        {
            var team1Goals = 10;
            var team2Goals = 0;

            var updates = GetUpdates(team1Goals, team2Goals, _standardGamesPlayed, 1500, 1500, 1200, 1200);

            Assert.That(updates[0].Stats.Rating, Is.EqualTo(1515));
            Assert.That(updates[2].Stats.Rating, Is.EqualTo(1185));
        }

        [Test]
        public void PointsFactorIsMin()
        {
            var team1Goals = 10;
            var team2Goals = 9;

            var updates = GetUpdates(team1Goals, team2Goals, _standardGamesPlayed, 1500, 1500, 1200, 1200);

            Assert.That(updates[0].Stats.Rating, Is.EqualTo(1502));
            Assert.That(updates[2].Stats.Rating, Is.EqualTo(1198));
        }

        [Test]
        public void RatingIsNotAverage()
        {
            var team1Goals = 10;
            var team2Goals = 5;

            var updates = GetUpdates(team1Goals, team2Goals, _standardGamesPlayed, 1600, 1400, 1100, 1300);

            Assert.That(updates[0].Stats.Rating, Is.EqualTo(1608));
            Assert.That(updates[1].Stats.Rating, Is.EqualTo(1408));
            Assert.That(updates[2].Stats.Rating, Is.EqualTo(1092));
            Assert.That(updates[3].Stats.Rating, Is.EqualTo(1292));
        }

        [Test]
        public void TestVaryingExperienceFactor()
        {
            var team1Goals = 10;
            var team2Goals = 0;
            var gamesPlayed = new List<int> { 0, 3, 6, 10 };

            var updates = GetUpdates(team1Goals, team2Goals, gamesPlayed, 1500, 1500, 1200, 1200);

            Assert.That(updates[0].Stats.Rating, Is.EqualTo(1530));
            Assert.That(updates[1].Stats.Rating, Is.EqualTo(1526));
            Assert.That(updates[2].Stats.Rating, Is.EqualTo(1179));
            Assert.That(updates[3].Stats.Rating, Is.EqualTo(1185));
        }

        private static List<PlayerUpdate> GetUpdates(
            int team1Goals,
            int team2Goals,
            IReadOnlyList<int> gamesPlayed,
            params int[] ratings)
        {
            var game = GetGame(team1Goals, team2Goals, ratings);

            var stats = ratings
                .Select((rating, i) => new PlayerStats(rating, 0, gamesPlayed[i], 0, 0, 0, 0))
                .ToList();

            return new RatingCalculator(game).GetUpdates(stats);
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
