using AnagoLeaderboard.Models.Results;
using AnagoLeaderboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace AnagoLeaderboard.Controllers
{
    [Route("api")]
    [ApiController]
    public class CardController : ControllerBase
    {
        private readonly CardPoolService _cardPoolService;

        public CardController(CardPoolService cardPoolService)
        {
            _cardPoolService = cardPoolService;
        }

        /// <summary>
        /// Every player a pack can contain: actives on their current rating, icons on
        /// their all-time high.
        ///
        /// The collection endpoint will carry this same set, since the album has to draw
        /// silhouettes for cards you do not own. This route stays as the cheap way to look
        /// at the pool on its own - no collection, no packs, nothing persisted.
        /// </summary>
        [HttpGet("cards/pool")]
        public async Task<CardPool> GetCardPool()
        {
            return await _cardPoolService.GetPool();
        }
    }
}
