using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models.RequestParameters;
using AnagoLeaderboard.Models.Results;
using AnagoLeaderboard.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace UnitTests
{
    /// <summary>
    /// Claiming a pack, against real SQLite rather than the in-memory provider.
    ///
    /// The same reasoning as <see cref="PlayerCollectionTests"/>, and here it matters more: the
    /// unique indexes on PackClaim <em>are</em> the double-claim guard - there is no check in
    /// the service to test instead - and the in-memory provider enforces neither them nor the
    /// cascades, so it would pass these no matter what the mapping said.
    /// </summary>
    [TestFixture]
    public class PackClaimTests
    {
        private SqliteConnection _connection;
        private DatabaseContext _dbContext;
        private GameService _gameService;
        private PackService _packService;
        private CollectionService _collectionService;

        [SetUp]
        public void Setup()
        {
            // Held open for the fixture's lifetime - see PlayerCollectionTests.
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<DatabaseContext>()
                .UseSqlite(_connection)
                .Options;

            _dbContext = new DatabaseContext(options);
            _dbContext.Database.EnsureCreated();

            var cardRatingCalculator = new CardRatingCalculator();
            _gameService = new GameService(_dbContext);
            var leaderBoardService = new LeaderBoardService(_gameService, _dbContext);
            var cardPoolService = new CardPoolService(leaderBoardService, cardRatingCalculator);

            // PackService takes no leaderboard: the roster, the pool and the games are handed to
            // it by CollectionService, which owns the single replay a request is allowed.
            _packService = new PackService(_dbContext, cardRatingCalculator);

            _collectionService = new CollectionService(
                _dbContext, leaderBoardService, cardPoolService, cardRatingCalculator, _packService);
        }

        [TearDown]
        public void TearDown()
        {
            _dbContext.Dispose();
            _connection.Dispose();
        }

        /* ----------------------------------------------------------------- *
         * The indexes, which are the guard.
         * ----------------------------------------------------------------- */

        [Test]
        public async Task TheSameDailyCannotBeClaimedTwice()
        {
            var player = await AddPlayer("Rik Maas");
            var today = DateTime.Now.Date;

            _dbContext.PackClaims.Add(PackClaim.ForDaily(player.Id, today));
            await _dbContext.SaveChangesAsync();

            _dbContext.PackClaims.Add(PackClaim.ForDaily(player.Id, today));
            Assert.ThrowsAsync<DbUpdateException>(async () => await _dbContext.SaveChangesAsync());
        }

        [Test]
        public async Task TwoGamePacksOnOneDayDoNotCollide()
        {
            var players = await ARosterThatHasPlayed();
            var games = await _dbContext.Games.Select(game => game.Id).Take(2).ToListAsync();
            var today = DateTime.Now.Date;

            // The daily index has to be filtered on Source. Unfiltered it would forbid exactly
            // this, which is the normal case for anyone who plays twice in an afternoon.
            _dbContext.PackClaims.Add(PackClaim.ForGame(players[0].Id, games[0], today));
            _dbContext.PackClaims.Add(PackClaim.ForGame(players[0].Id, games[1], today));
            _dbContext.PackClaims.Add(PackClaim.ForDaily(players[0].Id, today));

            Assert.DoesNotThrowAsync(async () => await _dbContext.SaveChangesAsync());
        }

        [Test]
        public async Task TheSameGamePackCannotBeClaimedTwice()
        {
            var players = await ARosterThatHasPlayed();
            var gameId = await _dbContext.Games.Select(game => game.Id).FirstAsync();
            var today = DateTime.Now.Date;

            _dbContext.PackClaims.Add(PackClaim.ForGame(players[0].Id, gameId, today));
            await _dbContext.SaveChangesAsync();

            _dbContext.PackClaims.Add(PackClaim.ForGame(players[0].Id, gameId, today));
            Assert.ThrowsAsync<DbUpdateException>(async () => await _dbContext.SaveChangesAsync());
        }

        [Test]
        public async Task AClaimCannotOutliveItsPlayer()
        {
            var players = await ARosterThatHasPlayed();
            _dbContext.PackClaims.Add(PackClaim.ForDaily(players[0].Id, DateTime.Now.Date));
            await _dbContext.SaveChangesAsync();

            _dbContext.Players.Remove(await _dbContext.Players.SingleAsync(p => p.Id == players[0].Id));
            await _dbContext.SaveChangesAsync();

            Assert.That(await _dbContext.PackClaims.CountAsync(), Is.EqualTo(0));
        }

        /* ----------------------------------------------------------------- *
         * Claiming.
         * ----------------------------------------------------------------- */

        [Test]
        public async Task ClaimingTheDaily_MintsACardThatSurvives()
        {
            var players = await ARosterThatHasPlayed();
            var me = players[0];
            await _collectionService.CreateCollection(me.Id, "navy");

            var before = await _collectionService.GetCollection(me.Id);
            var daily = before!.Packs.Single(pack => pack.Id.StartsWith("daily:"));

            var result = await _collectionService.ClaimPack(me.Id, daily.Id);

            Assert.That(result.Outcome, Is.EqualTo(ClaimOutcome.Claimed));
            Assert.That(result.Cards!.Count, Is.EqualTo(1));
            Assert.That(result.Cards[0].IsNew, Is.True);
            Assert.That(result.Cards[0].Copies, Is.EqualTo(1));

            // The state travels with the cards, so the page needs no follow-up read: the card is
            // already in it and the packet is already off the shelf. This is the property that
            // saves the second leaderboard replay.
            Assert.That(result.State!.Owned.Sum(owned => owned.AsPlayer + owned.AsIcon), Is.EqualTo(1));
            Assert.That(result.State.Owned.Single().PlayerId, Is.EqualTo(result.Cards[0].Player.Id));
            Assert.That(result.State.Packs.Any(pack => pack.Id == daily.Id), Is.False);

            // Filed, not just reported: a fresh read agrees with what came back.
            var after = await _collectionService.GetCollection(me.Id);
            Assert.That(after!.Owned.Sum(owned => owned.AsPlayer + owned.AsIcon), Is.EqualTo(1));
            Assert.That(after.Owned.Single().PlayerId, Is.EqualTo(result.Cards[0].Player.Id));
            Assert.That(after.Packs.Any(pack => pack.Id == daily.Id), Is.False);
        }

        [Test]
        public async Task ARefusedClaimCarriesNoState()
        {
            var players = await ARosterThatHasPlayed();
            await _collectionService.CreateCollection(players[0].Id, "navy");

            var result = await _collectionService.ClaimPack(players[0].Id, "game:made-up");

            // Nothing changed, so whatever the page is showing is still right - and building a
            // state to say so would cost the replay this design exists to save.
            Assert.That(result.Outcome, Is.EqualTo(ClaimOutcome.NotAvailable));
            Assert.That(result.State, Is.Null);
            Assert.That(result.Cards, Is.Null);
        }

        [Test]
        public async Task ASecondCopyIsNotNewAndCounts()
        {
            // A roster where exactly one player is over the games gate, so the draw has only one
            // card it can possibly produce and the second pull is certain to be a duplicate.
            var me = await ARosterWhereOnlyOnePlayerIsCollectable();
            await _collectionService.CreateCollection(me.Id, "navy");

            var first = await ClaimTheDaily(me.Id);

            // Backdated rather than deleted, so today's freebie comes back while the card it
            // minted stays: CardInstance cascades from PackClaim, so removing the row would
            // empty the collection and the second pull would be new again.
            await _dbContext.PackClaims.ExecuteUpdateAsync(
                claims => claims.SetProperty(claim => claim.ClaimDate, DateTime.Now.Date.AddDays(-1)));
            _dbContext.ChangeTracker.Clear();

            var second = await ClaimTheDaily(me.Id);

            Assert.That(first.Cards!.Single().Player.Id, Is.EqualTo(me.Id));
            Assert.That(first.Cards.Single().IsNew, Is.True);
            Assert.That(first.Cards.Single().Copies, Is.EqualTo(1));

            Assert.That(second.Cards!.Single().IsNew, Is.False);
            Assert.That(second.Cards.Single().Copies, Is.EqualTo(2));
        }

        /// <summary>
        /// Completing the set **puts a packet on the shelf** rather than latching the icons.
        ///
        /// This test used to assert the opposite, and the reversal is the point: the claim wrote
        /// the latch itself, so the unlock landed silently in the middle of a pack reveal. It is
        /// now the collector's to claim, and re-introducing a write inside
        /// <see cref="PackService.Claim"/> would make the packet pointless — the latch would close
        /// before it could ever be opened. That is what this pins.
        /// </summary>
        [Test]
        public async Task CompletingTheActiveSetOffersAPacketRatherThanLatchingTheIcons()
        {
            // The same one-player pool: completing the set is one card away, which is the only
            // way to finish it inside a test.
            var me = await ARosterWhereOnlyOnePlayerIsCollectable();
            await _collectionService.CreateCollection(me.Id, "navy");

            var before = (await _collectionService.GetCollection(me.Id))!;
            Assert.That(before.Album!.IconsUnlocked, Is.False);
            Assert.That(before.Packs.Any(pack => pack.GuaranteesIcon), Is.False);

            var result = await ClaimTheDaily(me.Id);

            // Still locked - but the packet is there, in the very response that revealed the card,
            // because the state is built from the same counts the claim just added to. So it is on
            // the shelf by the time the reveal ends, with no refetch.
            Assert.That(result.State!.Album!.IconsUnlocked, Is.False);
            Assert.That(result.State!.Packs.Count(pack => pack.GuaranteesIcon), Is.EqualTo(1));

            // And nothing was written, so a fresh read agrees.
            var stored = await _dbContext.PlayerCollections.SingleAsync(c => c.PlayerId == me.Id);
            Assert.That(stored.IconsUnlockedAt, Is.Null);

            var after = (await _collectionService.GetCollection(me.Id))!;
            Assert.That(after.Album!.IconsUnlocked, Is.False);
            Assert.That(after.Packs.Count(pack => pack.GuaranteesIcon), Is.EqualTo(1));
        }

        /// <summary>
        /// The packet follows the set: it goes when the set stops being complete, and comes back.
        ///
        /// Purely derived, with no row to say it was ever earned — so a player crossing the games
        /// gate takes it off the shelf until they are collected too. That is the same rule every
        /// other pack is offered under, and the reason there is nothing to reconcile.
        /// </summary>
        [Test]
        public async Task TheIconPacketGoesWhenTheSetStopsBeingComplete()
        {
            var me = await ARosterWhereOnlyOnePlayerIsCollectable();
            await _collectionService.CreateCollection(me.Id, "navy");
            await ClaimTheDaily(me.Id);

            Assert.That(
                (await _collectionService.GetCollection(me.Id))!.Packs.Any(p => p.GuaranteesIcon),
                Is.True);

            /*
             * Three of the under-gate players cross it.
             *
             * The roster helper leaves everybody but `me` on two games, so three more each takes
             * them to five — the gate — and the active set grows by three cards this collector
             * does not hold.
             */
            var others = await _dbContext.Players
                .Where(player => player.Id != me.Id)
                .Take(3)
                .ToListAsync();

            for (var game = 0; game < 3; game++)
            {
                await _gameService.CreateGame(
                    new GameForm
                    {
                        FirstTeamForm = new TeamPerformanceForm
                        {
                            FirstPlayerId = others[0].Id,
                            SecondPlayerId = others[1].Id,
                            Goals = 10
                        },
                        SecondTeamForm = new TeamPerformanceForm
                        {
                            FirstPlayerId = others[2].Id,
                            SecondPlayerId = me.Id,
                            Goals = 6
                        }
                    });
            }

            var broken = (await _collectionService.GetCollection(me.Id))!;

            Assert.That(broken.Pool.Count, Is.GreaterThan(1), "the set really did grow");
            Assert.That(
                broken.Packs.Any(pack => pack.GuaranteesIcon),
                Is.False,
                "the set is no longer complete, so there is nothing to offer");
        }

        /// <summary>
        /// The claim, end to end: complete the set, unlock, and the icons are in the book.
        /// </summary>
        [Test]
        public async Task ClaimingOnACompleteSetUnlocksTheIcons()
        {
            var me = await ARosterWhereOnlyOnePlayerIsCollectable();
            await _collectionService.CreateCollection(me.Id, "navy");
            await ClaimTheDaily(me.Id);

            var claimed = await _collectionService.SetIconsUnlocked(me.Id, true, force: false);

            Assert.That(claimed.Outcome, Is.EqualTo(IconsOutcome.Unlocked));
            Assert.That(claimed.State!.Album!.IconsUnlocked, Is.True);

            var stored = await _dbContext.PlayerCollections.SingleAsync(c => c.PlayerId == me.Id);
            Assert.That(stored.IconsUnlockedAt, Is.Not.Null);

            // The packet survives the unlock — it is what unlocked it, and it has not been opened
            // yet. Gating its derivation on the latch would have it vanish mid-flow.
            Assert.That(
                claimed.State!.Packs.Any(pack => pack.GuaranteesIcon),
                Is.True,
                "the packet is claimed separately, so unlocking must not take it off the shelf");
        }

        /// <summary>
        /// An incomplete set is refused, and writes nothing.
        ///
        /// The only way to reach this is a client offering a seal it should not have — a page that
        /// has gone stale — so it has to be a refusal rather than a quiet success.
        /// </summary>
        [Test]
        public async Task PressingTheSealOnAnIncompleteSetIsRefused()
        {
            // The full roster, so one daily card cannot possibly complete the set.
            var me = (await ARosterThatHasPlayed())[0];
            await _collectionService.CreateCollection(me.Id, "navy");
            await ClaimTheDaily(me.Id);

            var refused = await _collectionService.SetIconsUnlocked(me.Id, true, force: false);

            Assert.That(refused.Outcome, Is.EqualTo(IconsOutcome.SetIncomplete));
            Assert.That(refused.State, Is.Null);

            var stored = await _dbContext.PlayerCollections.SingleAsync(c => c.PlayerId == me.Id);
            Assert.That(stored.IconsUnlockedAt, Is.Null);
        }

        /// <summary>
        /// Claiming twice is idempotent, **and does not move the date**. Two tabs racing the seal,
        /// or one retried request, must not rewrite the day somebody earned their icons.
        /// </summary>
        [Test]
        public async Task ClaimingTheIconsTwiceKeepsTheOriginalDate()
        {
            var me = await ARosterWhereOnlyOnePlayerIsCollectable();
            await _collectionService.CreateCollection(me.Id, "navy");
            await ClaimTheDaily(me.Id);
            await _collectionService.SetIconsUnlocked(me.Id, true, force: false);

            var first = (await _dbContext.PlayerCollections
                .SingleAsync(c => c.PlayerId == me.Id)).IconsUnlockedAt;

            var again = await _collectionService.SetIconsUnlocked(me.Id, true, force: false);

            Assert.That(again.Outcome, Is.EqualTo(IconsOutcome.AlreadyUnlocked));
            Assert.That(again.State!.Album!.IconsUnlocked, Is.True);
            Assert.That(
                (await _dbContext.PlayerCollections.SingleAsync(c => c.PlayerId == me.Id))
                    .IconsUnlockedAt,
                Is.EqualTo(first));
        }

        /// <summary>The development bypass skips the check the real claim enforces.</summary>
        [Test]
        public async Task ForcingTheIconsSkipsTheCompletenessCheck()
        {
            var me = (await ARosterThatHasPlayed())[0];
            await _collectionService.CreateCollection(me.Id, "navy");

            var forced = await _collectionService.SetIconsUnlocked(me.Id, true, force: true);

            Assert.That(forced.Outcome, Is.EqualTo(IconsOutcome.Unlocked));
            Assert.That(forced.State!.Album!.IconsUnlocked, Is.True);
        }

        [Test]
        public async Task TheIconsCannotBeClaimedWithoutAnAlbum()
        {
            var me = (await ARosterThatHasPlayed())[0];

            var refused = await _collectionService.SetIconsUnlocked(me.Id, true, force: true);

            Assert.That(refused.Outcome, Is.EqualTo(IconsOutcome.NoAlbum));
        }

        [Test]
        public async Task TheIconsCannotBeClaimedForAnUnknownPlayer()
        {
            var refused = await _collectionService.SetIconsUnlocked("nobody", true, force: true);

            Assert.That(refused.Outcome, Is.EqualTo(IconsOutcome.PlayerNotFound));
        }

        /// <summary>
        /// The unlock belongs to the binding, so emptying the album takes it away.
        ///
        /// It cannot be asserted directly on the wire — the flag lives on <c>Album</c> and there is
        /// no album left to carry it, which **is** the guarantee: a stale unlock beside a null
        /// album is not representable. So this checks both halves, the row and the shape.
        /// </summary>
        [Test]
        public async Task EmptyingTheAlbumTakesTheIconsWithIt()
        {
            var me = await ARosterWhereOnlyOnePlayerIsCollectable();
            await _collectionService.CreateCollection(me.Id, "navy");
            await _collectionService.SetIconsUnlocked(me.Id, true, force: true);

            var emptied = await _collectionService.DeleteCollection(me.Id);

            Assert.That(emptied!.Album, Is.Null);
            Assert.That(await _dbContext.PlayerCollections.AnyAsync(c => c.PlayerId == me.Id), Is.False);

            // And a new album starts locked rather than inheriting the old one's unlock.
            await _collectionService.CreateCollection(me.Id, "navy");
            Assert.That(
                (await _collectionService.GetCollection(me.Id))!.Album!.IconsUnlocked,
                Is.False);
        }

        /// <summary>
        /// A subject going out of service leaves their icoon slot <em>empty</em>, with the player
        /// cards you hold of them counted beside it rather than filling it.
        ///
        /// This is the rule two others are easy to mistake for, and it is the one place where the
        /// two halves of the design are both visible at once. The *pool* moves the subject across
        /// and the album draws slots and colourway from it, so what the card looks like follows
        /// the subject and always will. But <see cref="CardInstance.IsIcon"/> is frozen at mint
        /// and stays false, and it is what decides which slot a copy fills — so the icoon has to
        /// be packed. The player cards are not lost and not counted as icoons: they stay on
        /// <c>AsPlayer</c>, which is what the checklist prints in brackets against the unticked
        /// row.
        ///
        /// It used to assert the reverse — that the held card came back already collected on
        /// unlock. That handed over part of the icons set as a reward for cards earned towards
        /// the active one. See <c>MintTally</c>.
        /// </summary>
        [Test]
        public async Task AnIconSlotStartsEmptyWhenItsSubjectGoesOutOfService()
        {
            var me = await ARosterWhereOnlyOnePlayerIsCollectable();
            await _collectionService.CreateCollection(me.Id, "navy");
            await ClaimTheDaily(me.Id);

            // The one collectable subject is the collector themselves on this roster.
            var held = (await _collectionService.GetCollection(me.Id))!;
            Assert.That(held.Pool.Single().Id, Is.EqualTo(me.Id));
            Assert.That(held.Pool.Single().IsIcon, Is.False);
            Assert.That(held.Owned.Single().PlayerId, Is.EqualTo(me.Id));

            var minted = await _dbContext.CardInstances.FirstAsync(c => c.SubjectPlayerId == me.Id);
            Assert.That(minted.IsIcon, Is.False);

            // Out of service.
            var subject = await _dbContext.Players.SingleAsync(p => p.Id == me.Id);
            subject.Active = false;
            await _dbContext.SaveChangesAsync();

            var after = (await _collectionService.GetCollection(me.Id))!;

            // Gone from the active pool, and the card is still theirs and still counted - as the
            // player card it was drawn as.
            Assert.That(after.Pool, Is.Empty);
            Assert.That(after.Owned.Single().PlayerId, Is.EqualTo(me.Id));
            Assert.That(after.Owned.Single().AsPlayer, Is.GreaterThan(0));
            Assert.That(after.Owned.Single().AsIcon, Is.Zero);

            // Invisible while locked: no slot on either list, so the book has nowhere to print it.
            Assert.That(after.Album!.IconsUnlocked, Is.False);
            Assert.That(after.Icons, Is.Empty);

            // The mint-time record did not change - it answers a different question.
            Assert.That(
                (await _dbContext.CardInstances.FirstAsync(c => c.SubjectPlayerId == me.Id)).IsIcon,
                Is.False);

            // Unlock, and the slot is there wearing the icoon colourway - and empty. The player
            // cards behind it are what the bracket on the checklist row is counting.
            await _collectionService.SetIconsUnlocked(me.Id, true, force: true);
            var unlocked = (await _collectionService.GetCollection(me.Id))!;

            Assert.That(unlocked.Icons.Single().Id, Is.EqualTo(me.Id));
            Assert.That(unlocked.Icons.Single().IsIcon, Is.True);
            Assert.That(unlocked.Owned.Single().AsIcon, Is.Zero, "the icoon still has to be packed");
            Assert.That(unlocked.Owned.Single().AsPlayer, Is.GreaterThan(0), "and these are the bracket");
        }

        /// <summary>
        /// The other half of the same rule: packing that icoon is a NEW card, however many player
        /// cards of the same subject are already in the book.
        ///
        /// This is the payoff, and it is worth pinning because it is the assertion that would
        /// silently invert if anything went back to a flat count. Under the old rule the reveal
        /// called this a duplicate and skipped the new-card beat, which is the moment the whole
        /// icons set exists to produce.
        /// </summary>
        [Test]
        public async Task PackingTheIconOfAPlayerYouAlreadyHoldIsNew()
        {
            var me = await ARosterWhereOnlyOnePlayerIsCollectable();
            await _collectionService.CreateCollection(me.Id, "navy");

            // A player card first, on a roster whose pool is one deep, so the draw is certain.
            var first = await ClaimTheDaily(me.Id);
            Assert.That(first.Cards!.Single().IsNew, Is.True);

            var subject = await _dbContext.Players.SingleAsync(p => p.Id == me.Id);
            subject.Active = false;
            await _dbContext.SaveChangesAsync();
            await _collectionService.SetIconsUnlocked(me.Id, true, force: true);

            // Backdated rather than deleted, so today's freebie comes back while the player card
            // stays - CardInstance cascades from PackClaim, and deleting the row here would empty
            // the very pile this test is about.
            await _dbContext.PackClaims.ExecuteUpdateAsync(
                claims => claims.SetProperty(claim => claim.ClaimDate, DateTime.Now.Date.AddDays(-1)));
            _dbContext.ChangeTracker.Clear();

            var second = await ClaimTheDaily(me.Id);
            var icon = second.Cards!.Single();

            Assert.That(icon.Player.IsIcon, Is.True);
            Assert.That(icon.IsNew, Is.True, "it filled the icoon slot");
            Assert.That(icon.Copies, Is.EqualTo(1), "counted per kind, not over the whole pile");

            var owned = second.State!.Owned.Single();
            Assert.That(owned.AsIcon, Is.EqualTo(1));
            Assert.That(owned.AsPlayer, Is.EqualTo(1));
        }

        /// <summary>
        /// Completing the active set takes a <em>player</em> card, so an icoon who comes back
        /// cannot be ticked off with the icoon copies you already hold.
        ///
        /// The reverse direction of the same rule, and the reason
        /// <see cref="CardPoolService.ActiveSetComplete"/> reads one half of the tally rather than
        /// the total. Left flat, a comeback would complete a set off cards drawn from the icon
        /// pool - and on this roster it would hand over the icons packet for nothing.
        /// </summary>
        [Test]
        public async Task AComebackIsNotTickedOffByTheIconYouHold()
        {
            var me = await ARosterWhereOnlyOnePlayerIsCollectable();
            await _collectionService.CreateCollection(me.Id, "navy");

            // Retire them, unlock the icons, and pack the icoon: the whole pool is that one card.
            var subject = await _dbContext.Players.SingleAsync(p => p.Id == me.Id);
            subject.Active = false;
            await _dbContext.SaveChangesAsync();
            await _collectionService.SetIconsUnlocked(me.Id, true, force: true);

            var claimed = await ClaimTheDaily(me.Id);
            Assert.That(claimed.Cards!.Single().Player.IsIcon, Is.True);

            // Back in service. Their active slot returns, and the icoon in the book does not fill
            // it, so the set is not complete and the completion packet is not offered.
            subject.Active = true;
            await _dbContext.SaveChangesAsync();

            var leaderBoard = new LeaderBoardService(_gameService, _dbContext);
            var (players, allGames) = await leaderBoard.GetLeaderBoard();
            var pool = new CardPoolService(leaderBoard, new CardRatingCalculator()).GetPool(players);
            var counts = await _packService.CountsBySubject(me.Id);

            Assert.That(pool.Actives.Single().Id, Is.EqualTo(me.Id));
            Assert.That(counts[me.Id].AsIcon, Is.EqualTo(1));
            Assert.That(counts[me.Id].AsPlayer, Is.Zero);
            Assert.That(CardPoolService.ActiveSetComplete(pool, counts), Is.False);

            var packs = await _packService.GetAvailable(me.Id, allGames, pool, counts);
            Assert.That(packs.Any(pack => pack.Id == "icons"), Is.False);
        }

        [Test]
        public async Task ClaimingTwiceIsRefused()
        {
            var players = await ARosterThatHasPlayed();
            var me = players[0];
            await _collectionService.CreateCollection(me.Id, "navy");

            var state = await _collectionService.GetCollection(me.Id);
            var daily = state!.Packs.Single(pack => pack.Id.StartsWith("daily:"));

            Assert.That(
                (await _collectionService.ClaimPack(me.Id, daily.Id)).Outcome,
                Is.EqualTo(ClaimOutcome.Claimed));

            // The second attempt never reaches the index - the pack is no longer derived - so
            // this is the ordinary refusal rather than the race.
            Assert.That(
                (await _collectionService.ClaimPack(me.Id, daily.Id)).Outcome,
                Is.EqualTo(ClaimOutcome.NotAvailable));
        }

        [Test]
        public async Task WithoutAnAlbumThereIsNothingToClaimInto()
        {
            var players = await ARosterThatHasPlayed();

            var result = await _collectionService.ClaimPack(players[0].Id, "daily:" + Today());

            Assert.That(result.Outcome, Is.EqualTo(ClaimOutcome.NoAlbum));
        }

        [Test]
        public async Task AnInventedPackIdIsRefused()
        {
            var players = await ARosterThatHasPlayed();
            await _collectionService.CreateCollection(players[0].Id, "navy");

            Assert.That(
                (await _collectionService.ClaimPack(players[0].Id, "game:made-up")).Outcome,
                Is.EqualTo(ClaimOutcome.NotAvailable));

            Assert.That(
                (await _collectionService.ClaimPack(players[0].Id, "daily:2020-01-01")).Outcome,
                Is.EqualTo(ClaimOutcome.NotAvailable));
        }

        [Test]
        public async Task AnUnderGatePlayerCannotClaim()
        {
            var players = await ARosterThatHasPlayed();
            var newcomer = await AddPlayer("Nieuw");

            // Given an album by hand, since the create endpoint would refuse them one too.
            _dbContext.PlayerCollections.Add(PlayerCollection.Create(newcomer.Id, "navy"));
            await _dbContext.SaveChangesAsync();

            var result = await _collectionService.ClaimPack(newcomer.Id, "daily:" + Today());

            Assert.That(result.Outcome, Is.EqualTo(ClaimOutcome.NotEligible));
            Assert.That(players, Is.Not.Empty);
        }

        [Test]
        public async Task DeletingAGameTakesTheCardsItMinted()
        {
            var players = await ARosterThatHasPlayed();
            var me = players[0];
            await _collectionService.CreateCollection(me.Id, "navy");

            var state = await _collectionService.GetCollection(me.Id);
            var gamePack = state!.Packs.First(pack => pack.Id.StartsWith("game:"));
            var gameId = gamePack.Id["game:".Length..];

            await _collectionService.ClaimPack(me.Id, gamePack.Id);
            Assert.That(await _dbContext.CardInstances.CountAsync(), Is.GreaterThan(0));

            await _gameService.DeleteGame(gameId);

            // Pack size depends on the score, so correcting a game by deleting it has to take
            // the cards it paid out with it.
            Assert.That(await _dbContext.CardInstances.CountAsync(), Is.EqualTo(0));
            Assert.That(await _dbContext.PackClaims.CountAsync(), Is.EqualTo(0));
        }

        [Test]
        public async Task EmptyingACollectionTakesTheCardsAndTheClaims()
        {
            var players = await ARosterThatHasPlayed();
            var me = players[0];
            await _collectionService.CreateCollection(me.Id, "navy");
            await ClaimTheDaily(me.Id);

            var state = await _collectionService.DeleteCollection(me.Id);

            Assert.That(state!.Album, Is.Null);
            Assert.That(state.Owned, Is.Empty);
            Assert.That(await _dbContext.CardInstances.CountAsync(), Is.EqualTo(0));
            Assert.That(await _dbContext.PackClaims.CountAsync(), Is.EqualTo(0));
        }

        [Test]
        public async Task PacksAreOnlyOfferedOnceThereIsABook()
        {
            var players = await ARosterThatHasPlayed();

            var without = await _collectionService.GetCollection(players[0].Id);
            Assert.That(without!.Album, Is.Null);
            Assert.That(without.Packs, Is.Empty);

            await _collectionService.CreateCollection(players[0].Id, "navy");

            var with = await _collectionService.GetCollection(players[0].Id);
            Assert.That(with!.Packs, Is.Not.Empty);
        }

        /* ----------------------------------------------------------------- *
         * Gifts.
         * ----------------------------------------------------------------- */

        [Test]
        public async Task AGiftBecomesAPacketAndOpensLikeAnyOther()
        {
            var players = await ARosterThatHasPlayed();
            var me = players[0];
            await _collectionService.CreateCollection(me.Id, "navy");

            var gift = await _packService.GiveGift(new[] { me.Id }, 3, null, "testpakje");
            Assert.That(gift.Outcome, Is.EqualTo(GiftOutcome.Given));
            Assert.That(gift.Everybody, Is.False);

            var state = await _collectionService.GetCollection(me.Id);
            var packet = state!.Packs.Single(pack => pack.Id == "gift:" + gift.GiftIds.Single());
            Assert.That(packet.Size, Is.EqualTo(3));

            // Giving writes a row and stops. From the tear onwards a present and an earned pack are
            // the same object, which is why there is no second draw to keep in step.
            var result = await _collectionService.ClaimPack(me.Id, packet.Id);

            Assert.That(result.Outcome, Is.EqualTo(ClaimOutcome.Claimed));
            Assert.That(result.Cards!.Count, Is.EqualTo(3));
            Assert.That(result.State!.Owned.Sum(owned => owned.AsPlayer + owned.AsIcon), Is.EqualTo(3));
            Assert.That(result.State.Packs.Any(pack => pack.Id == packet.Id), Is.False);

            var after = await _collectionService.GetCollection(me.Id);
            Assert.That(after!.Packs.Any(pack => pack.Id == packet.Id), Is.False);
        }

        [Test]
        public async Task TheSameGiftCannotBeClaimedTwice()
        {
            var players = await ARosterThatHasPlayed();
            var gift = await _packService.GiveGift(new[] { players[0].Id }, 1, null, "testpakje");
            var giftId = gift.GiftIds.Single();

            _dbContext.PackClaims.Add(PackClaim.ForGift(players[0].Id, giftId, DateTime.Now.Date));
            await _dbContext.SaveChangesAsync();

            // The index is the guard, as with the other two sources - and unlike the daily's it
            // needs no date, because a present outlives the day it was opened on.
            _dbContext.PackClaims.Add(PackClaim.ForGift(players[0].Id, giftId, DateTime.Now.Date));
            Assert.ThrowsAsync<DbUpdateException>(async () => await _dbContext.SaveChangesAsync());
        }

        [Test]
        public async Task AGiftToEverybodyLandsOnEverybodysShelf()
        {
            var players = await ARosterThatHasPlayed();
            foreach (var player in players)
            {
                await _collectionService.CreateCollection(player.Id, "navy");
            }

            var gift = await _packService.GiveGift(null, 1, null, "voor iedereen");
            Assert.That(gift.Everybody, Is.True);

            /*
             * **One row per player, and this assertion is the reversal.** It used to read "one row,
             * not one per player": a gift to everybody was a single unaddressed row, which made
             * "everybody" mean the roster at *claim* time.
             *
             * That was tolerable while presents ran out after a week. They do not expire any more,
             * so an unaddressed row would go on being a present for whoever joins next year. The
             * word is expanded at gift time instead, and the convenience stays in the call — the
             * giver still says "everybody" rather than pasting four ids.
             */
            Assert.That(
                gift.GiftIds.Count,
                Is.EqualTo(players.Count),
                "one row per player on the roster, resolved when the gift was given");

            Assert.That(
                await _dbContext.PackGifts.AnyAsync(g => g.PlayerId == null),
                Is.False,
                "every present is addressed");

            // Each recipient gets their own packet, and opens their own.
            foreach (var player in players)
            {
                var state = await _collectionService.GetCollection(player.Id);
                var theirs = state!.Packs.Where(pack => pack.Id.StartsWith("gift:")).ToList();

                Assert.That(theirs.Count, Is.EqualTo(1), $"{player.Name} got nothing");

                Assert.That(
                    (await _collectionService.ClaimPack(player.Id, theirs.Single().Id)).Outcome,
                    Is.EqualTo(ClaimOutcome.Claimed));
            }
        }

        /// <summary>
        /// A gift to everybody is addressed to the office **as it was that day**.
        ///
        /// This replaces a test that pinned the opposite — that such a gift reached somebody it did
        /// not name — which was the behaviour the expansion removed. Somebody who joins afterwards
        /// finds nothing, because the present was not given to them.
        /// </summary>
        [Test]
        public async Task AGiftToEverybodyDoesNotReachSomebodyWhoJoinsLater()
        {
            var players = await ARosterThatHasPlayed();

            await _packService.GiveGift(null, 1, null, "voor iedereen");

            var newcomer = await AddPlayer("Nieuw");
            _dbContext.PlayerCollections.Add(PlayerCollection.Create(newcomer.Id, "navy"));
            await _dbContext.SaveChangesAsync();

            Assert.That(
                await _dbContext.PackGifts.AnyAsync(gift => gift.PlayerId == newcomer.Id),
                Is.False);

            Assert.That(
                (await _collectionService.GetCollection(newcomer.Id))!.Packs
                    .Any(pack => pack.Id.StartsWith("gift:")),
                Is.False,
                "the present was addressed to the office as it stood, and they were not in it");

            // And everybody who *was* there still has theirs.
            foreach (var player in players)
            {
                Assert.That(
                    await _dbContext.PackGifts.AnyAsync(gift => gift.PlayerId == player.Id),
                    Is.True,
                    $"{player.Name} was on the roster and should have one");
            }
        }

        [Test]
        public async Task AGuaranteedGiftDrawsFromTheBandAndNowhereElse()
        {
            var players = await ARosterThatHasPlayed();
            var me = players[0];
            await _collectionService.CreateCollection(me.Id, "navy");

            // A floor the whole roster clears, since four players on six games sit nowhere near the
            // top of the scale. What is being pinned here is that the floor survives the round trip
            // through the row and the derivation, not what the pool happens to hold.
            var gift = await _packService.GiveGift(new[] { me.Id }, null, 40, "test");

            var state = await _collectionService.GetCollection(me.Id);
            var packet = state!.Packs.Single(pack => pack.Id == "gift:" + gift.GiftIds.Single());

            Assert.That(packet.Size, Is.EqualTo(1), "a guarantee is always a single card");
            Assert.That(packet.MinimumOverall, Is.EqualTo(40));

            var result = await _collectionService.ClaimPack(me.Id, packet.Id);
            Assert.That(result.Cards!.Single().Player.Overall, Is.GreaterThanOrEqualTo(40));
        }

        [Test]
        public async Task AnExpiredGiftIsNoLongerOffered()
        {
            var players = await ARosterThatHasPlayed();
            var me = players[0];
            await _collectionService.CreateCollection(me.Id, "navy");

            var gift = await _packService.GiveGift(new[] { me.Id }, 1, null, "testpakje");
            var packId = "gift:" + gift.GiftIds.Single();

            Assert.That((await _collectionService.GetCollection(me.Id))!.Packs
                .Any(pack => pack.Id == packId));

            await _dbContext.PackGifts.ExecuteUpdateAsync(
                gifts => gifts.SetProperty(g => g.ExpiresAt, DateTime.Now.AddMinutes(-1)));
            _dbContext.ChangeTracker.Clear();

            Assert.That(
                (await _collectionService.GetCollection(me.Id))!.Packs.Any(pack => pack.Id == packId),
                Is.False);

            // And it cannot be opened by id either, because the claim re-derives rather than
            // trusting what it was handed.
            Assert.That(
                (await _collectionService.ClaimPack(me.Id, packId)).Outcome,
                Is.EqualTo(ClaimOutcome.NotAvailable));
        }

        [Test]
        public async Task WithdrawingAGiftTakesTheCardsItPaidOut()
        {
            var players = await ARosterThatHasPlayed();
            var me = players[0];
            await _collectionService.CreateCollection(me.Id, "navy");

            var gift = await _packService.GiveGift(new[] { me.Id }, 3, null, "testpakje");
            await _collectionService.ClaimPack(me.Id, "gift:" + gift.GiftIds.Single());
            Assert.That(await _dbContext.CardInstances.CountAsync(), Is.EqualTo(3));

            _dbContext.PackGifts.RemoveRange(await _dbContext.PackGifts.ToListAsync());
            await _dbContext.SaveChangesAsync();

            // Deleting the row is how a mistaken present is withdrawn, and it has to undo the
            // reward as well - the same rule as a deleted game.
            Assert.That(await _dbContext.CardInstances.CountAsync(), Is.EqualTo(0));
            Assert.That(await _dbContext.PackClaims.CountAsync(), Is.EqualTo(0));
        }

        [Test]
        public async Task AGiftIsEitherASizeOrAFloorAndNeverBoth()
        {
            var players = await ARosterThatHasPlayed();
            var me = players[0].Id;

            Assert.That(
                (await _packService.GiveGift(new[] { me }, 3, 85, "test")).Outcome,
                Is.EqualTo(GiftOutcome.NotOneChoice));

            Assert.That(
                (await _packService.GiveGift(new[] { me }, null, null, "test")).Outcome,
                Is.EqualTo(GiftOutcome.NotOneChoice));

            Assert.That(
                (await _packService.GiveGift(new[] { me }, 0, null, "test")).Outcome,
                Is.EqualTo(GiftOutcome.SizeOutOfRange));

            Assert.That(
                (await _packService.GiveGift(new[] { me }, 99, null, "test")).Outcome,
                Is.EqualTo(GiftOutcome.SizeOutOfRange));

            Assert.That(
                (await _packService.GiveGift(new[] { me }, null, 120, "test")).Outcome,
                Is.EqualTo(GiftOutcome.FloorOutOfRange));

            // Nothing was written by any of them.
            Assert.That(await _dbContext.PackGifts.CountAsync(), Is.EqualTo(0));
        }

        [Test]
        public async Task AGiftToANameThatDoesNotExistIsRefused()
        {
            var players = await ARosterThatHasPlayed();

            // A typo would otherwise write a present addressed to nobody: unclaimable, invisible on
            // every shelf, and so a row that silently did nothing.
            var result = await _packService.GiveGift(
                new[] { players[0].Id, "verzonnen" }, 1, null, "test");

            Assert.That(result.Outcome, Is.EqualTo(GiftOutcome.UnknownPlayer));
            Assert.That(await _dbContext.PackGifts.CountAsync(), Is.EqualTo(0));
        }

        [Test]
        public async Task NamingSomebodyTwiceHandsThemOnePacket()
        {
            var players = await ARosterThatHasPlayed();
            var me = players[0].Id;

            var result = await _packService.GiveGift(new[] { me, me }, 1, null, "test");

            // A list is a list of recipients, not of presents.
            Assert.That(result.GiftIds.Count, Is.EqualTo(1));
        }

        [Test]
        public async Task AGiftWithNoReasonStillLabelsItsWrapper()
        {
            var players = await ARosterThatHasPlayed();
            var me = players[0];
            await _collectionService.CreateCollection(me.Id, "navy");

            var gift = await _packService.GiveGift(new[] { me.Id }, 1, null, "   ");

            var state = await _collectionService.GetCollection(me.Id);
            var packet = state!.Packs.Single(pack => pack.Id == "gift:" + gift.GiftIds.Single());

            Assert.That(packet.Reason, Is.EqualTo("Cadeaupakje"));
        }

        /* ----------------------------------------------------------------- */

        private static string Today() => DateTime.Now.ToString("yyyy-MM-dd");

        private async Task<ClaimResult> ClaimTheDaily(string playerId)
        {
            var state = await _collectionService.GetCollection(playerId);
            var daily = state!.Packs.Single(pack => pack.Id.StartsWith("daily:"));
            return await _collectionService.ClaimPack(playerId, daily.Id);
        }

        private async Task<Player> AddPlayer(string name)
        {
            var player = Player.CreatePlayer(new PlayerForm { Name = name });
            _dbContext.Players.Add(player);
            await _dbContext.SaveChangesAsync();
            return player;
        }

        /// <summary>
        /// Four players and six games between them today, so everybody is over the games gate
        /// and everybody has game packs waiting.
        /// </summary>
        private async Task<List<Player>> ARosterThatHasPlayed()
        {
            var players = new List<Player>();
            foreach (var name in new[] { "Rik", "Petar", "Ton", "Mark" })
            {
                players.Add(await AddPlayer(name));
            }

            var pairings = new[]
            {
                (0, 1, 2, 3), (0, 2, 1, 3), (0, 3, 1, 2),
                (1, 2, 0, 3), (1, 3, 0, 2), (2, 3, 0, 1)
            };

            foreach (var (a, b, c, d) in pairings)
            {
                await _gameService.CreateGame(
                    new GameForm
                    {
                        FirstTeamForm = new TeamPerformanceForm
                        {
                            FirstPlayerId = players[a].Id,
                            SecondPlayerId = players[b].Id,
                            Goals = 10
                        },
                        SecondTeamForm = new TeamPerformanceForm
                        {
                            FirstPlayerId = players[c].Id,
                            SecondPlayerId = players[d].Id,
                            Goals = 6
                        }
                    });
            }

            return players;
        }

        /// <summary>
        /// One player in six games against nine others who each turn up twice, so only they are
        /// over the games gate.
        ///
        /// That makes the card pool a single player, which is what lets a test say anything
        /// certain about a weighted random draw.
        /// </summary>
        private async Task<Player> ARosterWhereOnlyOnePlayerIsCollectable()
        {
            var me = await AddPlayer("Rik");

            var others = new List<Player>();
            for (var i = 0; i < 9; i++)
            {
                others.Add(await AddPlayer($"Speler {i}"));
            }

            for (var game = 0; game < 6; game++)
            {
                await _gameService.CreateGame(
                    new GameForm
                    {
                        FirstTeamForm = new TeamPerformanceForm
                        {
                            FirstPlayerId = me.Id,
                            SecondPlayerId = others[game * 3 % 9].Id,
                            Goals = 10
                        },
                        SecondTeamForm = new TeamPerformanceForm
                        {
                            FirstPlayerId = others[(game * 3 + 1) % 9].Id,
                            SecondPlayerId = others[(game * 3 + 2) % 9].Id,
                            Goals = 6
                        }
                    });
            }

            return me;
        }
    }
}
