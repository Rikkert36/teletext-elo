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
        private readonly PackService _packService;
        private readonly IWebHostEnvironment _environment;

        /// <summary>
        /// <see cref="PackService"/> is here for the gift route alone, and deliberately not reached
        /// through <see cref="CollectionService"/> like everything else on this controller. A
        /// present is not a state over the card pool - it touches no collection, needs no
        /// leaderboard replay and returns no page - so routing it through the service that owns
        /// the replay would add a pass-through and invite somebody to have it build a state.
        /// </summary>
        public CollectionsController(
            CollectionService collectionService,
            PackService packService,
            IWebHostEnvironment environment)
        {
            _collectionService = collectionService;
            _packService = packService;
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
        /// Opens a pack: rolls it, files the cards, and hands them back with whether each one
        /// filled an empty slot - together with the collection they landed in.
        ///
        /// The state comes back for the same reason the create endpoint's does: the alternative
        /// is the client refetching, and that is a second full leaderboard replay inside one
        /// user action.
        ///
        /// The pack is named by a synthetic id - "game:{gameId}" or "daily:{yyyy-MM-dd}" -
        /// because a derived pack has no row to take an id from. Those ids are guessable from
        /// the public games list, where a stored grant's GUID would not have been, and that is a
        /// deliberate trade rather than an oversight: the cards land with the player in the path
        /// whoever asked for them, so the worst it buys is spoiling somebody's reveal.
        /// </summary>
        [HttpPost("collections/{playerId}/packs/{packId}/claim")]
        public async Task<ActionResult<PackReveal>> ClaimPack(string playerId, string packId)
        {
            var result = await _collectionService.ClaimPack(playerId, packId);

            switch (result.Outcome)
            {
                case ClaimOutcome.Claimed:
                    return Ok(new PackReveal(result.Cards!, result.State!));

                case ClaimOutcome.PlayerNotFound:
                case ClaimOutcome.NotAvailable:
                    return NotFound();

                case ClaimOutcome.AlreadyClaimed:
                    return Conflict("Dit pakje is al geopend.");

                case ClaimOutcome.NoAlbum:
                    return Conflict("Deze speler heeft nog geen album.");

                case ClaimOutcome.NotEligible:
                    return Conflict(
                        "Speler heeft nog niet genoeg wedstrijden gespeeld voor een album.");

                default:
                    return StatusCode(500);
            }
        }

        /// <summary>
        /// Presents a pack to a named player, to several, or to everybody.
        ///
        /// The one grant-shaped route in the design, and the only one that brings a pack into
        /// existence rather than deriving one. That is allowed here because a present is the one
        /// pack nothing can be derived from - nobody played a game to earn it - and it is kept
        /// honest by how little it does: it writes a gift row, the packet then appears on the
        /// shelf, and the ordinary claim endpoint opens it. There is no second draw and no second
        /// mint to keep in step.
        ///
        /// It answers with the gift ids rather than a collection, because for "everybody" there is
        /// no single collection to answer with - and because the caller is usually not the
        /// recipient. A page that has just given itself a packet refetches, which costs the
        /// leaderboard replay the claim route works so hard to avoid; that is the right trade for
        /// something done by hand a few times a month rather than a thousand times a year.
        ///
        /// **Not development only**, unlike the two routes below it. Handing out packs is a real
        /// thing to want to do in an office - a tournament prize, a birthday, a welcome - and this
        /// app has no authentication anywhere by design, so gating it on the environment would
        /// protect nothing while removing the feature.
        /// </summary>
        [HttpPost("collections/gifts")]
        public async Task<ActionResult<GiftReceipt>> GiveGift([FromBody] GiftForm form)
        {
            var result = await _packService.GiveGift(
                form?.PlayerIds,
                form?.Size,
                form?.MinimumOverall,
                form?.Reason);

            switch (result.Outcome)
            {
                case GiftOutcome.Given:
                    return Ok(new GiftReceipt(result.GiftIds, result.Everybody));

                case GiftOutcome.NotOneChoice:
                    return BadRequest(
                        "Geef of een aantal kaarten, of een minimale overall - niet beide en niet "
                        + "geen van beide. Een pakje met een garantie is altijd een enkele kaart.");

                case GiftOutcome.SizeOutOfRange:
                    return BadRequest("Een pakje bevat tussen 1 en 10 kaarten.");

                case GiftOutcome.FloorOutOfRange:
                    return BadRequest("De minimale overall valt buiten de schaal.");

                case GiftOutcome.UnknownPlayer:
                    return NotFound("Minstens een van de genoemde spelers bestaat niet.");

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

        /// <summary>
        /// Claims the icons. The collector has the whole active set and is pressing the seal.
        ///
        /// **The plain call is a real endpoint in every environment** — it is how the unlock is
        /// earned, and the only thing that latches it. The server checks the set itself rather
        /// than trusting the caller: the seal decides whether to *offer* the press from the same
        /// predicate, but a page that has gone stale could offer one that is no longer earned.
        ///
        /// The two bypasses stay **development only**, and 404 rather than 403 outside it for the
        /// same reason as the delete — a route that is not meant to exist should not announce that
        /// it does. `force` skips the check, because earning this legitimately is a three-month
        /// proposition and there would otherwise be no way to look at an icoon in a book at all.
        /// `unlocked=false` puts it back, which a collector may never do to their own album.
        /// </summary>
        [HttpPut("collections/{playerId}/icons")]
        public async Task<ActionResult<CollectionState>> SetIconsUnlocked(
            string playerId,
            [FromQuery] bool unlocked = true,
            [FromQuery] bool force = false)
        {
            if ((force || !unlocked) && !_environment.IsDevelopment())
            {
                return NotFound();
            }

            var result = await _collectionService.SetIconsUnlocked(playerId, unlocked, force);

            return result.Outcome switch
            {
                IconsOutcome.PlayerNotFound or IconsOutcome.NoAlbum => NotFound(),

                // The one refusal worth a body: the client thought the set was finished and it is
                // not, so it needs to refetch rather than retry.
                IconsOutcome.SetIncomplete => Conflict(
                    "De actieve set is nog niet compleet, dus er is nog niets te ontgrendelen."),

                _ => Ok(result.State)
            };
        }
    }
}
