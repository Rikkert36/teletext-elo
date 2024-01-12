using System.Reflection.Metadata;
using System.Runtime.InteropServices;
using System.Runtime.Serialization;

namespace AnagoLeaderboard.Models.RequestParameters
{
    public class PlayerForm
    {
        public string Name { get; set; }
        public IFormFile? Avatar { get; set; }

    }
}
