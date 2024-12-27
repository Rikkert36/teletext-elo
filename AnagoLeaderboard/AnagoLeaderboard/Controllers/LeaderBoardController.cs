using AnagoLeaderboard.Models.Results;
using AnagoLeaderboard.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace AnagoLeaderboard.Controllers
{
    [Route("api/leaderboard")]
    [ApiController]
    public class LeaderBoardController : ControllerBase
    {
        private readonly LeaderBoardService _leaderBoardService;

        public LeaderBoardController(LeaderBoardService leaderBoardService)
        {
            _leaderBoardService = leaderBoardService;
        }

        [HttpGet]
        public async Task<List<DynamicRatingPlayer>> GetDynamicLeaderBoard()
        {
            return await _leaderBoardService.GetCurrentLeaderBoard();
        }
        
        [HttpGet("years/{year}")]
        public async Task<List<DynamicRatingPlayer>> GetDynamicLeaderBoardByYear(int year)
        {
            return await _leaderBoardService.GetLeaderBoardByYear(year);
        }
        
    }
}
