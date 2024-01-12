using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnagoLeaderboard.Models.Results
{
    public class PlayerPerformance
    {
        public string PlayerId { get; set; }
        public string? Name { get; set; }
        public int OldRating { get; set; }
        public int NewRating { get; set; }

        public static PlayerPerformance Create(string playerId)
        {
            return new PlayerPerformance()
            {
                PlayerId = playerId,
            };
        }
    }
}
