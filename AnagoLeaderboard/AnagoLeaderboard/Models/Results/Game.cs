using AnagoLeaderboard.Models.RequestParameters;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnagoLeaderboard.Models.Results
{
    public class Game
    {
        public string Id { get; set; }
        [NotMapped]
        public TeamPerformance FirstTeam { get; set; }
        [NotMapped]
        public TeamPerformance SecondTeam { get; set; }
        public DateTime CreatedAt { get; set; }

        public static Game Create(GameForm game)
        {
            return new Game()
            {
                Id = Guid.NewGuid().ToString(),
                FirstTeam = TeamPerformance.Create(game.FirstTeamForm),
                SecondTeam = TeamPerformance.Create(game.SecondTeamForm),
                CreatedAt = DateTime.Now
            };
        }

        public List<string> GetPlayerIds()
        {
            return new List<string>()
            {
                FirstTeam.FirstPlayer.PlayerId,
                FirstTeam.SecondPlayer.PlayerId,
                SecondTeam.FirstPlayer.PlayerId,
                SecondTeam.SecondPlayer.PlayerId
            };
        }

        public List<PlayerPerformance> GetPlayerPerformances()
        {
            return new List<PlayerPerformance>()
            {
                FirstTeam.FirstPlayer,
                FirstTeam.SecondPlayer,
                SecondTeam.FirstPlayer,
                SecondTeam.SecondPlayer
            };
        }

        internal int GetGoalsFor(string playerId)
        {
            if (FirstTeam.FirstPlayer.PlayerId.Equals(playerId) || FirstTeam.SecondPlayer.PlayerId.Equals(playerId))
            {
                return FirstTeam.Goals;
            } else if (SecondTeam.FirstPlayer.PlayerId.Equals(playerId) || SecondTeam.SecondPlayer.PlayerId.Equals(playerId))
            {
                return SecondTeam.Goals;
            } else
            {
                throw new Exception("PlayerID not in team");
            }
        }

        internal int GetGoalsAgainst(string playerId)
        {
            if (FirstTeam.FirstPlayer.PlayerId.Equals(playerId) || FirstTeam.SecondPlayer.PlayerId.Equals(playerId))
            {
                return SecondTeam.Goals;
            } else if (SecondTeam.FirstPlayer.PlayerId.Equals(playerId) || SecondTeam.SecondPlayer.PlayerId.Equals(playerId))
            {
                return FirstTeam.Goals;
            } else
            {
                throw new Exception("PlayerID not in team");
            }
        }
    }
}
