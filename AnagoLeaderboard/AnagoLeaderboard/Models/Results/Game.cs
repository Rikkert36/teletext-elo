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
        
        public bool Equals(Game otherGame)
        {
            if (!otherGame.IsPlayedBy(FirstTeam.FirstPlayer.PlayerId)) return false;
            
            var firstPlayerTeam = otherGame.GetTeam(FirstTeam.FirstPlayer.PlayerId);
            var opponentTeam = otherGame.GetOtherTeam(FirstTeam.FirstPlayer.PlayerId);
                
            if (FirstTeam.Goals != firstPlayerTeam.Goals || SecondTeam.Goals != opponentTeam.Goals)
            {
                return false;
            }
                
            return firstPlayerTeam.HasPlayer(FirstTeam.SecondPlayer.PlayerId) 
                   && opponentTeam.HasPlayer(SecondTeam.FirstPlayer.PlayerId)
                   && opponentTeam.HasPlayer(SecondTeam.SecondPlayer.PlayerId);
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

        public bool IsWonBy(string playerId)
        {
            if (FirstTeam.FirstPlayer.PlayerId.Equals(playerId) || FirstTeam.SecondPlayer.PlayerId.Equals(playerId))
            {
                return FirstTeam.Goals > SecondTeam.Goals;
            }

            if (SecondTeam.FirstPlayer.PlayerId.Equals(playerId) || SecondTeam.SecondPlayer.PlayerId.Equals(playerId))
            {
                return SecondTeam.Goals > FirstTeam.Goals;
            }

            throw new Exception("PlayerID not in team");
        }

        public string GetTeamMemberId(string playerId)
        {
            if (FirstTeam.FirstPlayer.PlayerId.Equals(playerId))
            {
                return FirstTeam.SecondPlayer.PlayerId;
            }
            
            if (FirstTeam.SecondPlayer.PlayerId.Equals(playerId))
            {
                return FirstTeam.FirstPlayer.PlayerId;
            }
            
            if (SecondTeam.FirstPlayer.PlayerId.Equals(playerId))
            {
                return SecondTeam.SecondPlayer.PlayerId;
            }
            
            if (SecondTeam.SecondPlayer.PlayerId.Equals(playerId))
            {
                return SecondTeam.FirstPlayer.PlayerId;
            }
            
            throw new Exception("PlayerID not in team");
        }
        
        public TeamPerformance GetTeam(string playerId)
        {
            if (FirstTeam.FirstPlayer.PlayerId.Equals(playerId) || FirstTeam.SecondPlayer.PlayerId.Equals(playerId))
            {
                return FirstTeam;
            }

            if (SecondTeam.FirstPlayer.PlayerId.Equals(playerId) || SecondTeam.SecondPlayer.PlayerId.Equals(playerId))
            {
                return SecondTeam;
            }
            
            throw new Exception("PlayerID not in team");

        }

        public TeamPerformance GetOtherTeam(string playerId)
        {
            if (FirstTeam.FirstPlayer.PlayerId.Equals(playerId) || FirstTeam.SecondPlayer.PlayerId.Equals(playerId))
            {
                return SecondTeam;
            }

            if (SecondTeam.FirstPlayer.PlayerId.Equals(playerId) || SecondTeam.SecondPlayer.PlayerId.Equals(playerId))
            {
                return FirstTeam;
            }
            
            throw new Exception("PlayerID not in team");

        }

        internal bool IsPlayedBy(string id)
        {
            return FirstTeam.FirstPlayer.PlayerId.Equals(id)
                || FirstTeam.SecondPlayer.PlayerId.Equals(id)
                || SecondTeam.FirstPlayer.PlayerId.Equals(id)
                || SecondTeam.SecondPlayer.PlayerId.Equals(id);
        }
    }
}
