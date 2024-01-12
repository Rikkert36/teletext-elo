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
        LogComponent.LogClass _logClient;

        public GameController(DatabaseContext databaseContext)
        {
            _gameService = new GameService(databaseContext);
            _logClient = new LogComponent.LogClass(Anago.Config.clsAnagoConfig.GetConfig().LogServiceURI, "TafelvoetbalServer");
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
                Log("CreateGame", message);
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
            return await _gameService.GetGames();
        }

        [HttpDelete("game/{id}")]
        public async Task DeleteGame(string id)
        {
            await _gameService.DeleteGame(id);
        }

        [HttpDelete("games")]
        public async Task<ActionResult> DeleteGames()
        {
            await _gameService.DeleteGames();
            return Ok();
        }

        private void Log(string function, string message)
        {
            _logClient.Log("", "", "", function, message, DateTime.Now, 0);
        }
    }
}
