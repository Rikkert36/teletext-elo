using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models.RequestParameters;
using AnagoLeaderboard.Models.Results;
using AnagoLeaderboard.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Linq.Expressions;

namespace AnagoLeaderboard.Controllers
{
    [Route("api")]
    [ApiController]
    public class PlayerController : ControllerBase
    {
        private readonly PlayerService _playerService;
        LogComponent.LogClass _logClient;

        public PlayerController(DatabaseContext databaseContext)
        {
            _playerService = new PlayerService(databaseContext);
            _logClient = new LogComponent.LogClass(Anago.Config.clsAnagoConfig.GetConfig().LogServiceURI, "TafelvoetbalServer");

        }

        [HttpPost("player")]
        public async Task<ActionResult> CreatePlayer([FromForm] PlayerForm playerData)
        {
            try
            {
                await _playerService.CreatePlayer(playerData);
                return Ok();
            } catch (Exception ex)
            {
                string message = ex.Message;
                if (ex.InnerException != null) message += " " + ex.InnerException.Message;
                Log("CreatePlayer", message);
                throw ex;
            }
        }

        [HttpGet("players")]
        public async Task<List<Player>> GetPlayers()
        {
            try
            {
                return await _playerService.GetPlayers();
            } catch (Exception ex)
            {
                string message = ex.Message;
                if (ex.InnerException != null) message += " " + ex.InnerException.Message;
                Log("CreatePlayer", message);
                throw ex;
            }
        }

        [HttpGet("player/{id}")]
        public async Task<Player> GetPlayer(string id)
        {
            return await _playerService.GetPlayer(id);
        }

        [HttpGet("player/{id}/avatar")]
        public IActionResult GetAvatar(string id)
        {
            var fileBytes = _playerService.GetAvatar(id);
            return File(fileBytes, "image/jpeg");

        }

        [HttpGet("player/one/avatar")]
        public async Task<IActionResult> GetPlayerOneAvatar()
        {
            var fileBytes = await _playerService.GetPlayerOneAvatar();
            return File(fileBytes, "image/jpeg");
        }
        
        [HttpDelete("players")]
        public async Task<IActionResult> DeletePlayers()
        {
            await _playerService.DeletePlayers();
            return Ok();
        }

        private void Log(string function, string message)
        {
            _logClient.Log("", "", "", function, message, DateTime.Now, 0);
        }

    }
}
