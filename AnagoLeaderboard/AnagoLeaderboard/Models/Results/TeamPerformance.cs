using AnagoLeaderboard.Models.RequestParameters;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnagoLeaderboard.Models.Results
{
    public class TeamPerformance
    {
        [NotMapped]
        public PlayerPerformance FirstPlayer {get; set;}

        [NotMapped]
        public PlayerPerformance SecondPlayer { get; set; }
        
        public int Goals { get; set;}
        
        [NotMapped]
        public int DeltaPoints { get; set; }

        public static TeamPerformance Create(TeamPerformanceForm teamPerformance) {
            return new TeamPerformance()
            {
                FirstPlayer = PlayerPerformance.Create(teamPerformance.FirstPlayerId),
                SecondPlayer = PlayerPerformance.Create(teamPerformance.SecondPlayerId),
                Goals = teamPerformance.Goals
            };
            
        }
        
        public bool HasPlayer(string playerId)
        {
            return FirstPlayer.PlayerId.Equals(playerId) || SecondPlayer.PlayerId.Equals(playerId);
        }
    }
}
