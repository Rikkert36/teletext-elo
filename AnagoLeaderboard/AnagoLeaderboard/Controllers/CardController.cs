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
        private readonly HeadToHeadService _headToHeadService;

        public CardController(
            CardPoolService cardPoolService,
            CardStatisticsService cardStatisticsService,
            PackHistoryService packHistoryService,
            HeadToHeadService headToHeadService)
        {
            _cardPoolService = cardPoolService;
            _cardStatisticsService = cardStatisticsService;
            _packHistoryService = packHistoryService;
            _headToHeadService = headToHeadService;
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
        /// <param name="compact">
        /// Collapses each packet to one readable line - <c>"19-08-2026 14:02 - Rik pakte: Ton
        /// (74), Mark (81)"</c> - and answers a <c>string[]</c> instead of the full object,
        /// exactly like <c>player/champion-history</c> does. The lines come off
        /// <see cref="OpenedPack.Line"/>, so the two shapes are the same data and cannot drift -
        /// the bracketed overall included, which is today's rather than the one the card was
        /// worth at the draw. See that method for why.
        ///
        /// A parameter on this route rather than a second route, because it is one report at two
        /// levels of detail and a <c>packs/lines</c> beside it would be a second thing to
        /// remember to extend. The cost is that the action returns an untyped
        /// <see cref="ActionResult"/> and Swagger stops naming a schema for it - acceptable here,
        /// where the generated client is not regenerated anyway and both shapes are hand-written
        /// on the browser side if they are ever needed.
        /// </param>
        [HttpGet("packs")]
        public async Task<ActionResult> GetPackHistory([FromQuery] bool compact = false)
        {
            var history = await _packHistoryService.GetHistory();

            return compact
                ? Ok(history.Packs.Select(pack => pack.Line()).ToList())
                : Ok(history);
        }

        /// <summary>
        /// <strong>Volume II: the personal album.</strong> What every card would be rated at in
        /// every collector's book, if rarity came from your own record against that person rather
        /// than from the leaderboard.
        ///
        /// <para>
        /// <strong>The concept, because nothing else in this codebase implies it.</strong> Volume I
        /// gives everybody the same book: a card's overall is the subject's rating, so Petar is a 89
        /// for all of us and completing the set is one long wait for him. Volume II keeps the same
        /// pool, the same pack sizes and the same ceremony, and changes exactly one thing - a card's
        /// overall is computed from <em>the collector's own head-to-head record against that
        /// subject</em>. Your angstgegner is your rare card. So every collector's book is different,
        /// and for the first time looking at somebody else's collection tells you something you
        /// cannot get anywhere else in the app.
        /// </para>
        /// <para>
        /// <strong>The number therefore does not mean what it means in volume I</strong>, and that
        /// is the single most important thing to hold on to here. A 92 in this book does not say
        /// "good player" - it says "hard for me". Marie's 92 is Esther, who is a 68 on the
        /// leaderboard. Anything that reads a volume II overall as a statement about a player's
        /// standing is wrong, which is also why volume II cannot wear volume I's brons/zilver/goud:
        /// those metals already mean "good player" to everybody who has held a card. See
        /// docs/card-volume2-colourways.html for the colourway work that follows from that.
        /// </para>
        /// <para>
        /// <strong>Still a report, not a feature.</strong> Nothing here is written, no pack is drawn
        /// through it, and <see cref="CardPoolService"/> does not know it exists. The scale it
        /// applies is settled - see <see cref="DeltaScaleCalculator"/> - but promoting it to a real
        /// volume means a per-collector pool, which is a genuine architectural change: volume I's
        /// pool is one shared, cacheable object and this one is not.
        /// </para>
        /// <para>
        /// The whole design, every settled figure and the measurements behind them are in
        /// <c>docs/trading-cards.md</c> under "Volume II". Read that before changing any number in
        /// here; most of them look arbitrary and none of them are.
        /// </para>
        ///
        /// Ungated like the three above it. Every figure in it is derived from games that are
        /// already public, and it names no collection.
        ///
        /// Costs one leaderboard replay and one pass over the games. Nothing is written.
        /// </summary>
        /// <param name="compact">
        /// Answers a <c>string[]</c>, one line per pair, off <see cref="HeadToHeadRow.Line"/> -
        /// the same arrangement <c>api/packs</c> uses, and for the same reason.
        /// </param>
        /// <param name="summaryOnly">
        /// Drops the rows and answers only the distribution. This is the shape that fits the
        /// anchors, and it is a few hundred bytes against a few hundred kilobytes.
        /// </param>
        /// <param name="minGames">
        /// The card-pool gate, not a head-to-head one: below it a player has no card to rate.
        /// Defaults to the configured <c>Cards:MinGames</c>.
        /// </param>
        /// <param name="anchors">
        /// A candidate anchor table as <c>"-6:99,0:70,6:40"</c>, overriding the configured one, so
        /// a fit can be swept from the URL rather than a rebuild. Unparseable input falls back to
        /// the configured table rather than failing - this is a printout, and a 400 here would only
        /// ever be a typo.
        /// </param>
        [HttpGet("cards/volume2")]
        public async Task<ActionResult> GetHeadToHead(
            [FromQuery] bool compact = false,
            [FromQuery] bool summaryOnly = false,
            [FromQuery] int? minGames = null,
            [FromQuery] string? anchors = null,
            [FromQuery] string? scoreAnchors = null,
            [FromQuery] double? shrinkageK = null,
            [FromQuery] double? nudgeCeiling = null,
            [FromQuery] double? trustAt = null,
            [FromQuery] int? medianTarget = null)
        {
            var report = await _headToHeadService.GetReport(
                minGames,
                DeltaScaleCalculator.ParseAnchors(anchors),
                DeltaScaleCalculator.ParseAnchors(scoreAnchors),
                shrinkageK,
                nudgeCeiling,
                trustAt,
                medianTarget);

            if (summaryOnly) return Ok(new { report.Anchors, report.Summary });

            return compact
                ? Ok(report.Rows.Select(row => row.Line()).ToList())
                : Ok(report);
        }
    }
}
