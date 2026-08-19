using AnagoLeaderboard.Models;
using AnagoLeaderboard.Models.RequestParameters;
using AnagoLeaderboard.Models.Results;
using AnagoLeaderboard.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

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


        /// <summary>
        /// The player's photo, or the shared fallback when there is none.
        ///
        /// Cached hard and, just as importantly, validatable. The pool is around 180 MB of
        /// original camera uploads — the largest single file is 17 MB, to be painted at
        /// 150 px in the album and at most 380 px in the viewer. The max-age keeps a warm
        /// client from asking at all; the ETag means a client that does ask pays a 304
        /// instead of the body.
        ///
        /// Both halves earn their keep over the VPN. The origin negotiates h2, so every
        /// stream shares one connection and one congested tunnel, and a small api call
        /// issued alongside tens of megabytes of photos waits on the window they are
        /// filling — opening the album while portraits are in flight is the case that
        /// hurts.
        ///
        /// An hour of staleness is the price: a replaced photo takes that long to appear,
        /// or one hard refresh. Same bargain the silhouette makes below, on the same asset.
        /// </summary>
        [HttpGet("player/{id}/avatar")]
        [ResponseCache(Duration = 3600, Location = ResponseCacheLocation.Any)]
        public IActionResult GetAvatar(string id)
        {
            var (path, lastModified, length) = _playerService.GetAvatarFile(id);

            // An upload always rewrites the file, so write time plus length identifies a
            // version well enough. PhysicalFile handles the 304 by itself when the browser
            // sends If-None-Match, and streams the file off disk instead of buffering it.
            var etag = new EntityTagHeaderValue($"\"{lastModified.Ticks:x}-{length:x}\"");

            return PhysicalFile(path, "image/jpeg", lastModified, etag);
        }

        /// <summary>
        /// The silhouette mask: a PNG where only the alpha channel matters, opaque where
        /// the player is. Meant to be used as a CSS mask on a card you do not own yet.
        ///
        /// 404 when there is no mask, on purpose — the card has its own empty state and
        /// needs to know when to use it. The album requests the whole pool at once, so
        /// cache headers are sent along.
        /// </summary>
        [HttpGet("player/{id}/silhouette")]
        [ResponseCache(Duration = 3600, Location = ResponseCacheLocation.Any)]
        public IActionResult GetSilhouette(string id)
        {
            var silhouette = _playerService.GetSilhouette(id);
            if (silhouette == null) return NotFound();

            var (bytes, lastModified) = silhouette.Value;

            // Regenerating a mask always rewrites the file, so write time plus length
            // identifies a version well enough for a conditional GET. File() turns this
            // into a 304 by itself when the browser sends If-None-Match.
            var etag = new EntityTagHeaderValue($"\"{lastModified.Ticks:x}-{bytes.Length:x}\"");

            return File(bytes, "image/png", lastModified, etag);
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
