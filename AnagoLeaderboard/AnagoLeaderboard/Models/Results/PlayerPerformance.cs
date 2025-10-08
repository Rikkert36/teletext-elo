using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations.Schema;
using System.Transactions;

namespace AnagoLeaderboard.Models.Results
{
    public class PlayerPerformance
    {
        public string PlayerId { get; set; }
        public string? Name { get; set; }
        public int OldRating { get; set; }
        public int NewRating { get; set; }

        [NotMapped]
        public double? StdBefore { get; private set; }

        [NotMapped]
        public double? StdAfter { get; private set; }

        public static PlayerPerformance Create(string playerId)
        {
            return new PlayerPerformance()
            {
                PlayerId = playerId,
            };
        }

        internal void SetStandardDeviation(double stdBefore, double stdAfter)
        {
            StdBefore = stdBefore;
            StdAfter = stdAfter;
        }
        
        public string ToString()
        {
            int index = Name.IndexOfAny(new char[] { ' ', '\t', '\n', '\r' });

            string firstWord = index == -1 ? Name : Name.Substring(0, index);

            return firstWord;
        }
    }
}
