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
        private readonly CardStatisticsService _cardStatisticsService;

        public CardController(
            CardPoolService cardPoolService,
            CardStatisticsService cardStatisticsService)
        {
            _cardPoolService = cardPoolService;
            _cardStatisticsService = cardStatisticsService;
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

        /// <summary>
        /// How often each card has come out of a packet, over every collector there is.
        ///
        /// Ungated, like the pool above it. Everything in it is an aggregate over figures that
        /// are already public - who is collectable, and what they are rated - and no row says
        /// which cards any particular collector holds, so there is nothing here to put behind
        /// the caretaker's key.
        ///
        /// Costs one leaderboard replay and two grouped queries, like every other GET on this
        /// API. Nothing is written.
        /// </summary>
        [HttpGet("cards/statistics")]
        public async Task<CardStatistics> GetCardStatistics()
        {
            return await _cardStatisticsService.GetStatistics();
        }
    }
}
