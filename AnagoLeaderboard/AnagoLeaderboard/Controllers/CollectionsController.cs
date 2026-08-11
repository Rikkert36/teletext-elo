using AnagoLeaderboard.Models.RequestParameters;
using AnagoLeaderboard.Models.Results;
using AnagoLeaderboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace AnagoLeaderboard.Controllers
{
    /// <summary>
    /// A player's own collection. There is no authentication anywhere in this app and never
    /// will be, so the player is named in the path and taken at their word - the harm is
    /// bounded, since cards always land with the rightful owner and only the surprise of a
    /// reveal can be spoiled. The mitigation lives in the UI: the player picker is a
    /// type-ahead rather than a list to choose from.
    /// </summary>
    [Route("api")]
    [ApiController]
    public class CollectionsController : ControllerBase
    {
        private readonly CollectionService _collectionService;
        private readonly IWebHostEnvironment _environment;

        public CollectionsController(
            CollectionService collectionService,
            IWebHostEnvironment environment)
        {
            _collectionService = collectionService;
            _environment = environment;
        }

        /// <summary>
        /// The whole collection page in one response.
        ///
        /// A player who has never started a collection is not an error: they get a full
        /// response with a null album, which is what sends them through the opening sequence.
        /// 404 is reserved for a player who does not exist.
        /// </summary>
        [HttpGet("collections/{playerId}")]
        public async Task<ActionResult<CollectionState>> GetCollection(string playerId)
        {
            var state = await _collectionService.GetCollection(playerId);

            if (state is null)
            {
                return NotFound();
            }

            return Ok(state);
        }

        /// <summary>
        /// Fetches the player an album in the leather they picked, and returns the page as it
        /// now stands.
        ///
        /// The full state comes back rather than just the binding, because the book is one
        /// object and must not be drawn from a partial response - and because it saves the
        /// client an immediate refetch, which would be a second full leaderboard replay.
        /// </summary>
        [HttpPost("collections/{playerId}/create")]
        public async Task<ActionResult<CollectionState>> CreateCollection(
            string playerId,
            [FromBody] CreateCollectionForm form)
        {
            var result = await _collectionService.CreateCollection(playerId, form?.Cover);

            switch (result.Outcome)
            {
                case CreateCollectionOutcome.Created:
                case CreateCollectionOutcome.AlreadyExists:
                    return Ok(result.State);

                case CreateCollectionOutcome.PlayerNotFound:
                    return NotFound();

                case CreateCollectionOutcome.NotEligible:
                    return Conflict(
                        $"Speler heeft nog niet genoeg wedstrijden gespeeld voor een album.");

                case CreateCollectionOutcome.UnknownCover:
                    return BadRequest(
                        $"Onbekende kleur. Kies uit: {string.Join(", ", AlbumCovers.All)}.");

                default:
                    return StatusCode(500);
            }
        }

        /// <summary>
        /// Puts the album back on the table, so the opening sequence can be watched again.
        /// **Development only.**
        ///
        /// Gated because outside development there is no reason to destroy a collection, and
        /// once cards are persisted this takes them with it. It answers 404 rather than 403
        /// when the environment is wrong: a route that is not meant to exist should not
        /// announce that it does.
        ///
        /// Idempotent, like create — a player with no album is already in the state being
        /// asked for, so that is not an error.
        /// </summary>
        [HttpDelete("collections/{playerId}")]
        public async Task<ActionResult<CollectionState>> DeleteCollection(string playerId)
        {
            if (!_environment.IsDevelopment())
            {
                return NotFound();
            }

            var state = await _collectionService.DeleteCollection(playerId);

            if (state is null)
            {
                return NotFound();
            }

            return Ok(state);
        }
    }
}
