using AnagoLeaderboard.Models.RequestParameters;
using System.Reflection.Metadata;

namespace AnagoLeaderboard.Models.Results
{
    public class Player
    {
        public string Id { get; private set; }
        public string Name { get; set; }
        public int Rating { get; set; }
        public int NumberOfGames { get; protected set; }
        public int NumberOfWins { get; protected set; }
        public int NumberOfLosses { get; protected set; }
        public int GoalsFor { get; protected set; }
        public int GoalsAgainst { get; protected set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime UpdatedAt { get; private set; }
        public bool Active { get; set; }

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
                UpdatedAt = now,
                Active = true
            };
        }

        public Player()
        {
        }

        public Player(Player copyPlayer)
        {
            Id = copyPlayer.Id;
            Name = copyPlayer.Name;
            Rating = copyPlayer.Rating;
            NumberOfGames = copyPlayer.NumberOfGames;
            NumberOfWins = copyPlayer.NumberOfWins;
            NumberOfLosses = copyPlayer.NumberOfLosses;
            GoalsFor = copyPlayer.GoalsFor;
            GoalsAgainst = copyPlayer.GoalsAgainst;
            CreatedAt = copyPlayer.CreatedAt;
            UpdatedAt = copyPlayer.UpdatedAt;
            Active = copyPlayer.Active;
        }
    }
}
