using AnagoLeaderboard.Models;
using AnagoLeaderboard.Models.RequestParameters;
using AnagoLeaderboard.Models.Results;
using AnagoLeaderboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace AnagoLeaderboard.Controllers
{
    [Route("api")]
    [ApiController]
    public class PlayerController : ControllerBase
    {
        private readonly PlayerService _playerService;
        private readonly ChampionService _championService;

        public PlayerController(PlayerService playerService, ChampionService championService)
        {
            _playerService = playerService;
            _championService = championService;
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
                throw ex;
            }
        }

        [HttpPatch("player/{id}")]
        public async Task<ActionResult> UpdatePlayerName(string id, [FromBody] string newName)
        {
            await _playerService.UpdatePlayerName(id, newName);
            return Ok();
        }

        [HttpGet("players")]
        public async Task<List<DynamicRatingPlayer>> GetPlayers(bool activeOnly = false)
        {
            try
            {
                return await _playerService.GetPlayers(activeOnly);
            } 
            catch (Exception ex)
            {
                string message = ex.Message;
                if (ex.InnerException != null) message += " " + ex.InnerException.Message;
                throw ex;
            }
        }

        [HttpGet("player/{id}")]
        public async Task<DynamicRatingPlayer> GetPlayer(string id)
        {
            return await _playerService.GetPlayer(id);
        }

        [HttpPatch("player/{id}/avatar")]
        public async Task<ActionResult> UpdateAvatar(string id, [FromForm] UpdateAvatarForm newAvatar)
        {
            try
            {
                await _playerService.UpdateAvatar(id, newAvatar.Avatar);
                return Ok();
            }  catch (Exception ex)
            {
                string message = ex.Message;
                if (ex.InnerException != null) message += " " + ex.InnerException.Message;
                throw ex;
            }
        }


        [HttpGet("player/{id}/avatar")]
        public IActionResult GetAvatar(string id)
        {
            var fileBytes = _playerService.GetAvatar(id);
            return File(fileBytes, "image/jpeg");

        }

        [HttpGet("player/{id}/games/page/{pageNumber}")]
        public async Task<PlayerGamePage> GetPlayerGamesPage(string id, int pageNumber)
        {
            return await _playerService.GetPlayerGames(id, pageNumber);
        }
        
        [HttpGet("player/{id}/games")]
        public async Task<List<Game>> GetPlayerGames(string id)
        {
            return await _playerService.GetPlayerGames(id);
        }
          

        [HttpGet("player/one/avatar")]
        public async Task<IActionResult> GetPlayerOneAvatar()
        {
            var fileBytes = await _championService.GetChampionAvatar();
            return File(fileBytes, "image/jpeg");
        }
        
        [HttpGet("player/champion-history")]
        public async Task<List<string>> GetChampionHistory()
        {
            var history = await _championService.GetChampionHistory();
            return history.Select(change => change.ToString()).ToList();
        }

        [HttpGet("player/{id}/rank")]
        public async Task<int> GetPlayerRank(string id)
        {
            return await _playerService.GetPlayerRank(id);
        }

        [HttpDelete("players")]
        public async Task<IActionResult> DeletePlayers(string password)
        {
            if (!password.Equals("deleteplayer" + DateTime.Now.Date.DayOfWeek + DateTime.Now.Date.Hour)) throw new Exception("Enter the password");
            await _playerService.DeletePlayers();
            return Ok();
        }

        [HttpDelete("player/{id}")]
        public async Task<IActionResult> DeletePlayer(string id)
        {
            await _playerService.DeletePlayer(id);
            return Ok();
        }

        [HttpGet("player/{id}/stats")]
        public async Task<PlayerStatistics> GetPlayerStats(string id)
        {
            var result = await _playerService.GetPlayerStatistics(id);
            return result;
        }
        
        [HttpPatch("player/{id}/active/{active}")]
        public async Task UpdatePlayerActive(string id, bool active)
        {
            await _playerService.UpdatePlayerActive(id, active);
        }

    }
}
