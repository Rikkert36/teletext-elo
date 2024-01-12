using AnagoLeaderboard.Models.RequestParameters;
using System.Reflection.Metadata;

namespace AnagoLeaderboard.Models.Results
{
    public class Player
    {
        public string Id { get; private set; }
        public string Name { get; private set; }
        public int Rating { get; set; }
        public int NumberOfGames { get; private set; }
        public int NumberOfWins { get; private set; }
        public int NumberOfLosses { get; private set; }
        public int GoalsFor { get; private set; }
        public int GoalsAgainst { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime UpdatedAt { get; private set; }

        public static Player CreatePlayer(PlayerForm playerData)
        {
            var now = DateTime.Now;
            return new Player()
            {
                Id = Guid.NewGuid().ToString(),
                Name = playerData.Name,
                Rating = 1000,
                NumberOfGames = 0,
                NumberOfWins = 0,
                NumberOfLosses = 0,
                GoalsFor = 0,
                GoalsAgainst = 0,
                CreatedAt = now,
                UpdatedAt = now
            };
        }

        public void AddGame(bool won, int goalsFor, int goalsAgainst)
        {
            NumberOfGames++;
            if (won)
            {
                NumberOfWins++;
            } else
            {
                NumberOfLosses++;
            }
            GoalsFor += goalsFor;
            GoalsAgainst += goalsAgainst;
            UpdatedAt = DateTime.Now;
        }

        public void RevertGame(bool won, int goalsFor, int goalsAgainst)
        {
            NumberOfGames--;
            if (won)
            {
                NumberOfWins--;
            } else
            {
                NumberOfLosses--;
            }
            GoalsFor -= goalsFor;
            GoalsAgainst -= goalsAgainst;
            UpdatedAt = DateTime.Now;
            
        }
    }
}
