using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models.RequestParameters;
using AnagoLeaderboard.Models.Results;
using AnagoLeaderboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace AnagoLeaderboard.Controllers
{
    [Route("api")]
    [ApiController]
    public class GameController : ControllerBase
    {

        private readonly GameService _gameService;
        private readonly LeaderBoardService _leaderBoardService;

        public GameController(GameService gameService, LeaderBoardService leaderBoardService)
        {
            _gameService = gameService;
            _leaderBoardService = leaderBoardService;
        }

        [HttpPost("game")]
        public async Task<ActionResult> CreateGame([FromBody]GameForm gameForm)
        {
            try
            {
                await _gameService.CreateGame(gameForm);
                return Ok();
            } catch (Exception ex)
            {
                string message = ex.Message;
                if (ex.InnerException != null) message += " " + ex.InnerException.Message;
                throw ex;
            }
        }

        [HttpPut("game/{id}")]
        public async Task<ActionResult> UpdateGame(string id, [FromBody] GameForm gameForm)
        {
            try
            {
                await _gameService.UpdateGame(id, gameForm);
                return Ok();
            } catch (Exception ex)
            {
                string message = ex.Message;
                if (ex.InnerException != null) message += " " + ex.InnerException.Message;
                throw ex;
            }
        }

        [HttpGet("game/{id}")]
        public async Task<Game> GetGame(string id)
        {
            return await _gameService.GetGame(id);
        }

        [HttpGet("games")]
        public async Task<List<Game>> GetGames()
        {
            return (await _leaderBoardService.GetLeaderBoard()).Item2;
        }

        [HttpGet("games/{start}/{end}")]
        public async Task<GamesInRange> GetGamesInRange(DateTime start, DateTime end)
        {
            try
            {
                return await _leaderBoardService.GetGamesInRange(start, end);
            } catch(Exception ex)
            {
                string message = ex.Message;
                if (ex.InnerException != null)
                {
                    message += ex.InnerException.Message;
                }
                throw ex;
            }
        }

        [HttpDelete("game/{id}")]
        public async Task DeleteGame(string id)
        {
            await _gameService.DeleteGame(id);
        }

        [HttpDelete("games")]
        public async Task<ActionResult> DeleteGames(string password)
        {
            if (!password.Equals("deletegame" + DateTime.Now.Date.DayOfWeek + DateTime.Now.Date.Hour)) throw new Exception("Enter the password");
            await _gameService.DeleteGames();
            return Ok();
        }
    }
}
