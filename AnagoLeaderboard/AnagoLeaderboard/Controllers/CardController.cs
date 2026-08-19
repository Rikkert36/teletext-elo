using AnagoLeaderboard.Models.Results;
using AnagoLeaderboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace AnagoLeaderboard.Controllers
{
    /// <summary>
    /// The read-only side of the trading cards: what a pack can contain, and what packs have
    /// actually contained. Nothing here is anybody's state to change, which is why none of it
    /// needs the player in the path the way <see cref="CollectionsController"/> does.
    /// </summary>
    [Route("api")]
    [ApiController]
    public class CardController : ControllerBase
    {
        private readonly CardPoolService _cardPoolService;
        private readonly CardStatisticsService _cardStatisticsService;
        private readonly PackHistoryService _packHistoryService;

        public CardController(
            CardPoolService cardPoolService,
            CardStatisticsService cardStatisticsService,
            PackHistoryService packHistoryService)
        {
            _cardPoolService = cardPoolService;
            _cardStatisticsService = cardStatisticsService;
            _packHistoryService = packHistoryService;
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

        /// <summary>
        /// Every pack that has been opened, newest first, with the cards it contained grouped
        /// under it.
        ///
        /// The same rows the statistics endpoint counts, grouped by the claim instead of by the
        /// face - so this is the one route that can say what came out of a particular packet, and
        /// that four copies of somebody were one lucky five-card packet rather than four mornings
        /// in a row.
        ///
        /// Ungated, like the two above it, and see <see cref="PackHistory"/> for why naming the
        /// collector does not change that. Unpaged on purpose: a few thousand claims a year is
        /// small enough to hand over whole, and a page number would be the third order this API
        /// has to keep straight for a route that is read by hand.
        ///
        /// Costs one leaderboard replay and two queries, like every other GET here. Nothing is
        /// written.
        /// </summary>
        [HttpGet("packs")]
        public async Task<PackHistory> GetPackHistory()
        {
            return await _packHistoryService.GetHistory();
        }
    }
}
