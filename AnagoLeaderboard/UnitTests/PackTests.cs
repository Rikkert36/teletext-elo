using AnagoLeaderboard.Models.RequestParameters;
using AnagoLeaderboard.Models.Results;
using AnagoLeaderboard.Services;

namespace UnitTests
{
    /// <summary>
    /// Pack sizing, the derivation and the draw - the three pure pieces of
    /// <see cref="PackService"/>. Nothing here touches a database: sizing is a function of a
    /// game row, deriving is a function of today's games and today's claims, and the draw is a
    /// function of the pool.
    /// </summary>
    [TestFixture]
    public class PackTests
    {
        private static readonly DateTime Today = new(2026, 8, 11, 14, 0, 0);

        private readonly CardRatingCalculator _cardRatingCalculator = new();

        /// <summary>
        /// A game between four players of equal rating, with the old ratings filled in the way
        /// the leaderboard replay fills them.
        ///
        /// That last part is the whole reason this helper exists: <c>Game.Create</c> leaves
        /// every OldRating at 0, they are only assigned during a replay, and a game read
        /// straight out of the table therefore sizes every pack wrongly.
        /// </summary>
        private static Game GameBetween(
            int firstTeamGoals,
            int secondTeamGoals,
            int firstTeamRating = 1000,
            int secondTeamRating = 1000)
        {
            var game = Game.Create(
                new GameForm
                {
                    FirstTeamForm = new TeamPerformanceForm
                    {
                        FirstPlayerId = "t1p1",
                        SecondPlayerId = "t1p2",
                        Goals = firstTeamGoals
                    },
                    SecondTeamForm = new TeamPerformanceForm
                    {
                        FirstPlayerId = "t2p1",
                        SecondPlayerId = "t2p2",
                        Goals = secondTeamGoals
                    }
                });

            game.CreatedAt = Today;

            game.FirstTeam.FirstPlayer.OldRating = firstTeamRating;
            game.FirstTeam.SecondPlayer.OldRating = firstTeamRating;
            game.SecondTeam.FirstPlayer.OldRating = secondTeamRating;
            game.SecondTeam.SecondPlayer.OldRating = secondTeamRating;

            return game;
        }

        /* ----------------------------------------------------------------- *
         * Sizing: 1 for playing, +2 for winning, +2 for beating the expected
         * margin - by three or more if you won, by anything at all if you
         * lost. A loss therefore caps at three; five needs a win.
         *
         * `GameBetween`'s two ratings are the first and second team's, so the
         * first team is the underdog whenever the second rating is higher.
         * Expected margins used below, from ExpectedScoreCalculator: a level
         * game is +1, 150 adrift is -2, 700 adrift is -7.
         * ----------------------------------------------------------------- */

        [Test]
        public void EvenGame_APlainLossIsOneCard()
        {
            // Evenly matched, so the expected margin is +1 for the first team. Losing 6-10 is
            // 5 worse than that, nowhere near beating it.
            var pack = PackService.PackForGame(GameBetween(6, 10), "t1p1");

            Assert.That(pack.Size, Is.EqualTo(1));
            Assert.That(pack.DoubledPlayerIds, Is.Empty);
            Assert.That(pack.Reason, Does.StartWith("Verloren met"));
        }

        [Test]
        public void EvenGame_AWinIsThreeCards()
        {
            // Expected +1, actual +3: won, but only 2 better than expected.
            var pack = PackService.PackForGame(GameBetween(10, 7), "t1p1");

            Assert.That(pack.Size, Is.EqualTo(3));
            Assert.That(pack.Reason, Does.StartWith("Gewonnen met"));
        }

        [Test]
        public void EvenGame_AWinAgainstTheOddsIsFiveCards()
        {
            // Expected +1, actual +7.
            var pack = PackService.PackForGame(GameBetween(10, 3), "t1p1");

            Assert.That(pack.Size, Is.EqualTo(5));

            // The margin bonus is in the *size* and nowhere else: a docket says which game the
            // packet came out of, not how the count was arrived at.
            Assert.That(pack.Reason, Is.EqualTo("Gewonnen met t1p2 van t2p1 en t2p2 met 10 - 3"));
        }

        /// <summary>
        /// The upset, and the reason a winner's bonus is gated at three rather than at one: an
        /// underdog who wins pays five, but a level game that merely went your way does not.
        /// Winning and beating the expectation are nearly the same claim, so the second +2 has to
        /// measure magnitude or it is paying twice for one fact.
        /// </summary>
        [Test]
        public void Underdog_AWinIsFiveCardsButALevelGameWonNarrowlyIsThree()
        {
            // Expected -2, actual +1: three better than the ratings said.
            Assert.That(PackService.PackForGame(GameBetween(10, 9, 1250, 1400), "t1p1").Size,
                Is.EqualTo(5));

            // Expected +1, actual +1: won, and did exactly what was expected of them.
            Assert.That(PackService.PackForGame(GameBetween(10, 9), "t1p1").Size, Is.EqualTo(3));
        }

        /// <summary>
        /// The loser's bonus. Any improvement on the expected margin earns it, where it used to
        /// take three - which a loss hardly ever cleared, so half of all packets were a flat
        /// single. Note that this needs the reader to be at least a mild underdog: in a level game
        /// the expected margin is ±1, so a loss can never beat it.
        /// </summary>
        [Test]
        public void Underdog_ALossOneGoalBetterThanExpectedIsThreeCards()
        {
            // Expected -2, actual -1. One better, and that is enough.
            var pack = PackService.PackForGame(GameBetween(9, 10, 1250, 1400), "t1p1");

            Assert.That(pack.Size, Is.EqualTo(3));
            Assert.That(pack.Reason, Is.EqualTo("Verloren met t1p2 van t2p1 en t2p2 met 9 - 10"));

            // And it doubles the opponents, because the doubling is the same test as the +2.
            Assert.That(pack.DoubledPlayerIds, Is.EquivalentTo(new[] { "t2p1", "t2p2" }));
        }

        [Test]
        public void Underdog_ALossExactlyOnThePredictionIsOneCard()
        {
            // Expected -2, actual -2. Both margins are integers, so landing on the prediction is
            // not an improvement on it.
            var pack = PackService.PackForGame(GameBetween(8, 10, 1250, 1400), "t1p1");

            Assert.That(pack.Size, Is.EqualTo(1));
        }

        [Test]
        public void HeavyUnderdog_AGoodLossIsThreeCards()
        {
            // The first team is 700 rating adrift, so they are expected to lose by a distance.
            // Losing 8-10 clears that by five, which is where the cap bites: a loss stops at three
            // however far past the prediction it finishes, because five requires a win.
            var pack = PackService.PackForGame(GameBetween(8, 10, 700, 1400), "t1p1");

            Assert.That(pack.Size, Is.EqualTo(3));
            Assert.That(pack.Reason, Is.EqualTo("Verloren met t1p2 van t2p1 en t2p2 met 8 - 10"));

            // Clearing it by three or more does double the opponents, win or lose.
            Assert.That(pack.DoubledPlayerIds, Is.EquivalentTo(new[] { "t2p1", "t2p2" }));
        }

        /// <summary>
        /// The size never falls when the result improves, at any fixed expectation - so there is
        /// never a reason to throw a game. Walked over every scoreline from either seat.
        /// </summary>
        /// <summary>
        /// The whole of the opponent bonus, in one line: any packet bigger than a single doubles
        /// both opponents, and a single doubles nobody.
        ///
        /// It holds because the doubling is the same test as the two +2s rather than a second,
        /// similar-looking one. Holding it at the winner's bar while the loser's bonus sat at one
        /// would leave a three-card packet that doubled nobody - the only packet in the design
        /// that would pay more than a single without saying who it was earned against.
        /// </summary>
        [TestCase(0)]
        [TestCase(150)]
        [TestCase(400)]
        [TestCase(700)]
        public void TheOpponentBonusFiresExactlyWhenThePacketBeatsASingle(int gap)
        {
            foreach (var playerId in new[] { "t1p1", "t2p1" })
            {
                for (var own = 0; own <= 10; own++)
                {
                    for (var against = 0; against <= 10; against++)
                    {
                        // A scoreline the game model can hold: somebody reached ten, not both.
                        if ((own == 10) == (against == 10)) continue;

                        var game = playerId == "t1p1"
                            ? GameBetween(own, against, 1400 - gap, 1400)
                            : GameBetween(against, own, 1400, 1400 - gap);

                        var pack = PackService.PackForGame(game, playerId);
                        var opponents = playerId == "t1p1"
                            ? new[] { "t2p1", "t2p2" }
                            : new[] { "t1p1", "t1p2" };

                        Assert.That(
                            pack.DoubledPlayerIds,
                            pack.Size > 1 ? Is.EquivalentTo(opponents) : Is.Empty,
                            $"{playerId} at a {gap} gap, {own} - {against}, {pack.Size} cards");
                    }
                }
            }
        }

        [TestCase(0)]
        [TestCase(150)]
        [TestCase(400)]
        [TestCase(700)]
        public void SizeIsMonotonicInYourOwnGoalDifference(int gap)
        {
            // Every scoreline from the reader's own seat, worst first: 0-10 through 9-10, then
            // 10-9 through 10-0. So the reader's goal difference runs -10 to +10.
            var scorelines = new List<(int Own, int Against)>();
            for (var own = 0; own <= 9; own++) scorelines.Add((own, 10));
            for (var against = 9; against >= 0; against--) scorelines.Add((10, against));

            // Read from both seats, with the reader always the side that is `gap` adrift.
            foreach (var playerId in new[] { "t1p1", "t2p1" })
            {
                var previous = 0;

                foreach (var (own, against) in scorelines)
                {
                    var game = playerId == "t1p1"
                        ? GameBetween(own, against, 1400 - gap, 1400)
                        : GameBetween(against, own, 1400, 1400 - gap);

                    var size = PackService.PackForGame(game, playerId).Size;

                    Assert.That(size, Is.GreaterThanOrEqualTo(previous),
                        $"{playerId} at a {gap} gap went backwards on {own} - {against}");

                    previous = size;
                }
            }
        }

        /// <summary>
        /// The docket is a sentence about the game, so it needs the three other people in it -
        /// the partner first, then both opponents, all by first name.
        /// </summary>
        [Test]
        public void ADocketNamesThePartnerAndBothOpponents()
        {
            var game = GameBetween(10, 7);
            game.FirstTeam.FirstPlayer.Name = "Rik Maas";
            game.FirstTeam.SecondPlayer.Name = "Bo de Vries";
            game.SecondTeam.FirstPlayer.Name = "Daan";
            // A nickname in the middle goes with the surname: the first word is the first name.
            game.SecondTeam.SecondPlayer.Name = "Jeroen \"Jerry\" van Geel";

            Assert.That(
                PackService.PackForGame(game, "t1p1").Reason,
                Is.EqualTo("Gewonnen met Bo van Daan en Jeroen met 10 - 7"));
        }

        /// <summary>
        /// A game row that never went through <c>GameService.GetGames</c> has no names on it, and
        /// that must cost the docket its names and nothing else - the collection response is built
        /// from these.
        /// </summary>
        [Test]
        public void ADocketFallsBackToIdsWhenTheNamesWereNeverFilledIn()
        {
            Assert.That(
                PackService.PackForGame(GameBetween(10, 7), "t1p1").Reason,
                Is.EqualTo("Gewonnen met t1p2 van t2p1 en t2p2 met 10 - 7"));
        }

        [Test]
        public void TheSecondTeamIsSizedFromItsOwnSeat()
        {
            var game = GameBetween(3, 10);

            // The same row, read from both ends: the winners get five and the losers get one.
            Assert.That(PackService.PackForGame(game, "t2p1").Size, Is.EqualTo(5));
            Assert.That(PackService.PackForGame(game, "t1p1").Size, Is.EqualTo(1));

            // And the score is printed from the reader's seat, not the row's.
            Assert.That(PackService.PackForGame(game, "t2p1").Reason, Does.Contain("10 - 3"));
            Assert.That(PackService.PackForGame(game, "t1p1").Reason, Does.Contain("3 - 10"));
        }

        /* ----------------------------------------------------------------- *
         * The opponent bonus.
         * ----------------------------------------------------------------- */

        [Test]
        public void QualifyingPack_DoublesExactlyTheTwoOpponents()
        {
            var pack = PackService.PackForGame(GameBetween(10, 7), "t1p1");

            Assert.That(pack.DoubledPlayerIds, Is.EquivalentTo(new[] { "t2p1", "t2p2" }));
        }

        [Test]
        public void WinningAndBeatingTheMargin_StillDoublesOnlyTheSameTwo()
        {
            // Both conditions met. The pack is five cards, but the bonus stays flat 2x on two
            // players rather than compounding - a blowout must not dominate a collection.
            var pack = PackService.PackForGame(GameBetween(10, 3), "t1p1");

            Assert.That(pack.Size, Is.EqualTo(5));
            Assert.That(pack.DoubledPlayerIds, Is.EquivalentTo(new[] { "t2p1", "t2p2" }));
        }

        [Test]
        public void ABonusDoublesTheTicketsOfThoseTwoAndNobodyElse()
        {
            var pool = PoolOf(("a", 1000), ("b", 1000), ("c", 1000));

            var plain = TicketShareOf("a", pool, Array.Empty<string>());
            var doubled = TicketShareOf("a", pool, new[] { "a", "b" });

            // Three equal players: a third each, and doubling two of them makes those two half
            // as likely again relative to the untouched third.
            Assert.That(plain, Is.EqualTo(1.0 / 3).Within(1e-9));
            Assert.That(doubled, Is.EqualTo(2.0 / 5).Within(1e-9));
        }

        /* ----------------------------------------------------------------- *
         * The derivation.
         * ----------------------------------------------------------------- */

        [Test]
        public void WithNoGames_OnlyTheDailyIsOffered()
        {
            var packs = PackService.Derive(
                "t1p1", Array.Empty<Game>(), Array.Empty<PackClaim>(), Today);

            Assert.That(packs.Count, Is.EqualTo(1));
            Assert.That(packs[0].Id, Is.EqualTo("daily:2026-08-11"));
            Assert.That(packs[0].Size, Is.EqualTo(1));
        }

        [Test]
        public void TheDailyIsOfferedOncePerDay()
        {
            var claimed = new[] { PackClaim.ForDaily("t1p1", Today) };

            Assert.That(
                PackService.Derive("t1p1", Array.Empty<Game>(), claimed, Today),
                Is.Empty);

            // Tomorrow it is back, because the claim is keyed on the day.
            Assert.That(
                PackService.Derive("t1p1", Array.Empty<Game>(), claimed, Today.AddDays(1)).Count,
                Is.EqualTo(1));
        }

        [Test]
        public void AGameOffersAPackToAllFourOfItsPlayers()
        {
            var game = GameBetween(10, 7);
            var games = new[] { game };

            foreach (var playerId in game.GetPlayerIds())
            {
                var packs = PackService.Derive(playerId, games, Array.Empty<PackClaim>(), Today);

                Assert.That(packs.Any(pack => pack.Id == "game:" + game.Id), $"{playerId} got no pack");
            }
        }

        [Test]
        public void SomebodyElsesGameOffersNothing()
        {
            var packs = PackService.Derive(
                "stranger", new[] { GameBetween(10, 7) }, Array.Empty<PackClaim>(), Today);

            Assert.That(packs.Select(pack => pack.Id), Is.EqualTo(new[] { "daily:2026-08-11" }));
        }

        [Test]
        public void AGamePackStandsOpenForTwentyFourHours()
        {
            // The case that retired same-day expiry: played on the way out of the office, opened
            // on the way back in. Under the old rule midnight took it.
            var lastNight = GameBetween(10, 7);
            lastNight.CreatedAt = Today.AddDays(-1).AddHours(3); // 17:00 yesterday.

            var nextMorning = Today.AddDays(-1).AddHours(19); // 09:00 today.

            var packs = PackService.Derive(
                "t1p1", new[] { lastNight }, Array.Empty<PackClaim>(), nextMorning);

            Assert.That(packs.Any(pack => pack.Id == "game:" + lastNight.Id));
        }

        [Test]
        public void AGamePackExpiresADayAfterTheGame()
        {
            var game = GameBetween(10, 7);
            game.CreatedAt = Today.AddDays(-1); // Exactly 24h before `Today`.

            // On the edge it is already gone: the window is "less than a day old", so a game
            // exactly a day old is out rather than balanced on the boundary.
            Assert.That(
                PackService.Derive("t1p1", new[] { game }, Array.Empty<PackClaim>(), Today)
                    .Select(pack => pack.Id),
                Is.EqualTo(new[] { "daily:2026-08-11" }));

            // A minute earlier it is still there. No job and no sweep - the window is the query.
            Assert.That(
                PackService.Derive(
                        "t1p1", new[] { game }, Array.Empty<PackClaim>(), Today.AddMinutes(-1))
                    .Any(pack => pack.Id == "game:" + game.Id));
        }

        [Test]
        public void AClaimedGameStopsBeingOffered()
        {
            var game = GameBetween(10, 7);
            var claimed = new[] { PackClaim.ForGame("t1p1", game.Id, Today) };

            var mine = PackService.Derive("t1p1", new[] { game }, claimed, Today);
            Assert.That(mine.Select(pack => pack.Id), Is.EqualTo(new[] { "daily:2026-08-11" }));

            // And only for the player who claimed it. The other three still have theirs.
            var theirs = PackService.Derive("t2p1", new[] { game }, Array.Empty<PackClaim>(), Today);
            Assert.That(theirs.Any(pack => pack.Id == "game:" + game.Id));
        }

        /// <summary>
        /// The trap the rolling window opens, and the whole reason `Derive` subtracts game claims
        /// without looking at their date.
        ///
        /// A pack earned last night can be opened last night and is still inside the window this
        /// morning. If the claim were narrowed to the day - as it was, safely, while a pack could
        /// not outlive the day it was earned on - yesterday's claim would fall out of view and the
        /// packet would be back on the shelf, already opened.
        /// </summary>
        [Test]
        public void AGameClaimedYesterdayIsNotOfferedAgainToday()
        {
            var lastNight = GameBetween(10, 7);
            lastNight.CreatedAt = Today.AddDays(-1).AddHours(3); // 17:00 yesterday.

            var claimedThen = new[]
            {
                PackClaim.ForGame("t1p1", lastNight.Id, Today.AddDays(-1))
            };

            var nextMorning = Today.AddDays(-1).AddHours(19); // 09:00 today, still in the window.

            var packs = PackService.Derive(
                "t1p1", new[] { lastNight }, claimedThen, nextMorning);

            Assert.That(
                packs.Any(pack => pack.Id == "game:" + lastNight.Id),
                Is.False,
                "an opened pack came back the next morning");
        }

        /// <summary>
        /// The same guarantee stated without a window at all: a claim is the record that a pack
        /// was opened, and nothing about how long ago that was may bring it back.
        /// </summary>
        [Test]
        public void AGameClaimIsNeverOutlivedByItsPack()
        {
            var game = GameBetween(10, 7);
            game.CreatedAt = Today;

            var claimed = new[] { PackClaim.ForGame("t1p1", game.Id, Today) };

            foreach (var offset in new[] { 0, 1, 6, 23 })
            {
                var packs = PackService.Derive(
                    "t1p1", new[] { game }, claimed, Today.AddHours(offset));

                Assert.That(
                    packs.Any(pack => pack.Id == "game:" + game.Id),
                    Is.False,
                    $"offered again {offset}h after being claimed");
            }
        }

        [Test]
        public void GamePacksComeFirst_NewestFirst_AndTheDailyIsLast()
        {
            var older = GameBetween(10, 7);
            older.CreatedAt = Today.AddHours(-3);

            var newer = GameBetween(10, 2);
            newer.CreatedAt = Today.AddHours(-1);

            var packs = PackService.Derive(
                "t1p1", new[] { older, newer }, Array.Empty<PackClaim>(), Today);

            Assert.That(
                packs.Select(pack => pack.Id),
                Is.EqualTo(new[] { "game:" + newer.Id, "game:" + older.Id, "daily:2026-08-11" }));
        }

        /* ----------------------------------------------------------------- *
         * Gifts - the one pack that is a row rather than a derivation.
         * ----------------------------------------------------------------- */

        [Test]
        public void AGiftSitsOnTopOfThePile()
        {
            var gift = PackGift.Create("t1p1", 3, null, "cadeautje");

            var packs = PackService.Derive(
                "t1p1", new[] { GameBetween(10, 7) }, Array.Empty<PackClaim>(), Today, new[] { gift });

            // Above the game packs and the daily. It is the unusual thing on the shelf and the
            // only one nobody played for.
            Assert.That(packs[0].Id, Is.EqualTo("gift:" + gift.Id));
            Assert.That(packs[0].Size, Is.EqualTo(3));
            Assert.That(packs[0].Reason, Is.EqualTo("cadeautje"));
            Assert.That(packs.Last().Id, Is.EqualTo("daily:2026-08-11"));
        }

        /// <summary>
        /// A present reaches its recipient and nobody else.
        ///
        /// This replaces <c>AGiftToEverybodyReachesSomebodyItDoesNotName</c>, which pinned the
        /// opposite: a gift with a null recipient used to mean "everybody" and so reached people it
        /// did not name. That case no longer exists — <see cref="PackService.GiveGift"/> expands
        /// "everybody" into one addressed row per player when the gift is given — so the derivation
        /// now has exactly one rule to apply, and this is it.
        /// </summary>
        [Test]
        public void AGiftReachesTheRecipientAndNobodyElse()
        {
            var mine = PackGift.Create("t1p1", 1, null, "alleen voor mij");
            var theirs = PackGift.Create("t2p1", 1, null, "alleen voor hen");

            var forMe = PackService.Derive(
                "t1p1", Array.Empty<Game>(), Array.Empty<PackClaim>(), Today,
                new[] { mine, theirs });

            Assert.That(forMe.Any(pack => pack.Id == "gift:" + mine.Id));
            Assert.That(forMe.Any(pack => pack.Id == "gift:" + theirs.Id), Is.False);

            // And a stranger, who was addressed by neither, gets neither.
            var forStranger = PackService.Derive(
                "stranger", Array.Empty<Game>(), Array.Empty<PackClaim>(), Today,
                new[] { mine, theirs });

            Assert.That(forStranger.Any(pack => pack.Id.StartsWith("gift:")), Is.False);
        }

        [Test]
        public void AClaimedGiftStaysClaimedTomorrow()
        {
            var gift = PackGift.Create("t1p1", 1, null, "cadeautje");
            var claimed = new[] { PackClaim.ForGift("t1p1", gift.Id, Today) };

            // The property that separates a gift claim from a daily one. A present stands open for
            // days, so if the derivation narrowed gift claims to the day the way it narrows the
            // other two, the same packet would be handed over again every morning.
            foreach (var day in new[] { Today, Today.AddDays(1), Today.AddDays(5) })
            {
                var packs = PackService.Derive(
                    "t1p1", Array.Empty<Game>(), claimed, day, new[] { gift });

                Assert.That(
                    packs.Any(pack => pack.Id == "gift:" + gift.Id),
                    Is.False,
                    $"the present came back on {day:yyyy-MM-dd}");
            }
        }

        /// <summary>
        /// One recipient opening their present does not take anybody else's.
        ///
        /// It used to be a claim against one shared unaddressed row, which is what made this worth
        /// pinning. Expanding "everybody" at gift time makes it structural instead: each recipient
        /// has their own row and their own claim, so there is nothing left to get wrong. Kept
        /// because it is the property that mattered, and it should stay true however it is achieved.
        /// </summary>
        [Test]
        public void OneRecipientOpeningTheirsLeavesTheRestAlone()
        {
            // What `GiveGift(null, ...)` now writes for a two-person office.
            var mine = PackGift.Create("t1p1", 1, null, "voor iedereen");
            var theirs = PackGift.Create("t2p1", 1, null, "voor iedereen");
            var everyone = new[] { mine, theirs };

            var claimed = new[] { PackClaim.ForGift("t1p1", mine.Id, Today) };

            Assert.That(
                PackService.Derive("t1p1", Array.Empty<Game>(), claimed, Today, everyone)
                    .Any(pack => pack.Id.StartsWith("gift:")),
                Is.False,
                "they opened theirs");

            Assert.That(
                PackService.Derive("t2p1", Array.Empty<Game>(), claimed, Today, everyone)
                    .Any(pack => pack.Id == "gift:" + theirs.Id),
                "somebody else opening theirs is none of their business");
        }

        [Test]
        public void AGuaranteedGiftIsASingleCardAndCarriesItsFloor()
        {
            // Size is ignored when a floor is given: a packet is either n ordinary cards or one
            // card at a floor, never both.
            var gift = PackGift.Create("t1p1", 5, 85, "test");

            var pack = PackService.GiftPack(gift);

            Assert.That(pack.Size, Is.EqualTo(1));
            Assert.That(pack.MinimumOverall, Is.EqualTo(85));

            // And nothing earned ever carries one - the only choice a game makes is the size.
            Assert.That(PackService.PackForGame(GameBetween(10, 3), "t1p1").MinimumOverall, Is.Null);
            Assert.That(PackService.DailyPack(Today).MinimumOverall, Is.Null);
        }

        /* ----------------------------------------------------------------- *
         * The draw.
         * ----------------------------------------------------------------- */

        [Test]
        public void NoPlayerAppearsTwiceInAPack()
        {
            var pool = PoolOf(("a", 1800), ("b", 1200), ("c", 900), ("d", 700), ("e", 400));
            var random = new Random(20260811);

            for (var attempt = 0; attempt < 500; attempt++)
            {
                var drawn = PackService.Roll(
                    _cardRatingCalculator, pool, 5, Array.Empty<string>(), false, random: random);

                Assert.That(drawn.Count, Is.EqualTo(5));
                Assert.That(drawn.Select(card => card.Id).Distinct().Count(), Is.EqualTo(5));
            }
        }

        [Test]
        public void APoolSmallerThanThePackIsNotAnInfiniteLoop()
        {
            var drawn = PackService.Roll(
                _cardRatingCalculator, PoolOf(("a", 1000), ("b", 900)), 5,
                Array.Empty<string>(), false, random: new Random(1));

            Assert.That(drawn.Count, Is.EqualTo(2));
        }

        [Test]
        public void IconsAreOnlyDrawnOnceUnlocked()
        {
            var pool = new CardPool(
                5,
                new[] { Subject("active", 1000, false) },
                new[] { Subject("icon",1000, true) });

            var locked = PackService.Roll(
                _cardRatingCalculator, pool, 2, Array.Empty<string>(), false, random: new Random(1));
            Assert.That(locked.Select(card => card.Id), Is.EqualTo(new[] { "active" }));

            var unlocked = PackService.Roll(
                _cardRatingCalculator, pool, 2, Array.Empty<string>(), true, random: new Random(1));
            Assert.That(unlocked.Select(card => card.Id), Is.EquivalentTo(new[] { "active", "icon" }));
        }

        [Test]
        public void AFloorNarrowsTheDrawToWhoClearsIt()
        {
            // 1851 -> 90 and 1362 -> 86 clear an 85 floor; the other three do not.
            var pool = PoolOf(("top", 1851), ("rare", 1362), ("gold", 1035), ("silver", 919), ("bronze", 342));
            var random = new Random(20260811);

            var seen = new HashSet<string>();
            for (var i = 0; i < 2000; i++)
            {
                seen.Add(PackService.Roll(
                        _cardRatingCalculator, pool, 1, Array.Empty<string>(), false, 85, random)
                    .Single().Id);
            }

            Assert.That(seen, Is.EquivalentTo(new[] { "top", "rare" }));
        }

        [Test]
        public void AFloorStillWeightsInsideItself()
        {
            var pool = PoolOf(("top", 1851), ("rare", 1362), ("bronze", 342));
            var random = new Random(20260811);

            var seen = new Dictionary<string, int>();
            for (var i = 0; i < 20000; i++)
            {
                var card = PackService.Roll(
                    _cardRatingCalculator, pool, 1, Array.Empty<string>(), false, 85, random).Single();
                seen[card.Id] = seen.GetValueOrDefault(card.Id) + 1;
            }

            // A floor narrows the candidates and changes nothing else, so an 85+ packet still hands
            // out far more 85s than 90s. It buys you the band, not the best card in it.
            Assert.That(seen["rare"], Is.GreaterThan(seen["top"]));
            Assert.That(seen.ContainsKey("bronze"), Is.False);
        }

        [Test]
        public void AFloorNobodyClearsIsIgnoredRatherThanRefused()
        {
            var pool = PoolOf(("top", 1851), ("bottom", 342));

            var drawn = PackService.Roll(
                _cardRatingCalculator, pool, 1, Array.Empty<string>(), false, 99,
                random: new Random(1));

            // Nobody is a 99. A guarantee is about the odds, and a pool that cannot honour one is
            // not a reason to hand somebody an empty packet.
            Assert.That(drawn.Count, Is.EqualTo(1));
        }

        [Test]
        public void AFloorCanReachAnIconOnceUnlocked()
        {
            var pool = new CardPool(
                5,
                new[] { Subject("active", 1000, false) },
                new[] { Subject("icon",1954, true) });

            // Locked, nobody clears 90 and the draw falls through to the only active there is.
            Assert.That(
                PackService.Roll(
                        _cardRatingCalculator, pool, 1, Array.Empty<string>(), false, 90,
                        random: new Random(1))
                    .Single().Id,
                Is.EqualTo("active"));

            // Unlocked, the icoon is the one card that clears it - which is why the top button is a
            // floor rather than a player pinned to the top of the active pool.
            Assert.That(
                PackService.Roll(
                        _cardRatingCalculator, pool, 1, Array.Empty<string>(), true, 90,
                        random: new Random(1))
                    .Single().Id,
                Is.EqualTo("icon"));
        }

        /// <summary>
        /// The check that catches a wrong without-replacement implementation.
        ///
        /// Summed inclusion probabilities have to equal the pack size exactly - that is what
        /// makes a pack of five *five* cards - and successive sampling is not the same thing as
        /// drawing five independently and dropping the duplicates, which would come out short.
        /// </summary>
        [TestCase(1)]
        [TestCase(3)]
        [TestCase(5)]
        public void InclusionProbabilitiesSumToThePackSize(int size)
        {
            var pool = PoolOf(
                ("a", 1851), ("b", 1578), ("c", 1463), ("d", 1201), ("e", 1035),
                ("f", 919), ("g", 811), ("h", 716), ("i", 582), ("j", 342));

            var random = new Random(20260811);
            var appearances = new Dictionary<string, int>();

            const int packs = 40000;
            for (var i = 0; i < packs; i++)
            {
                foreach (var card in PackService.Roll(
                             _cardRatingCalculator, pool, size, Array.Empty<string>(), false, random: random))
                {
                    appearances[card.Id] = appearances.GetValueOrDefault(card.Id) + 1;
                }
            }

            var summed = appearances.Values.Sum() / (double)packs;
            Assert.That(summed, Is.EqualTo(size).Within(1e-9));
        }

        [Test]
        public void RarityFollowsTheRating()
        {
            var pool = PoolOf(("top", 1851), ("mid", 1000), ("bottom", 342));
            var random = new Random(20260811);

            var seen = new Dictionary<string, int>();
            for (var i = 0; i < 20000; i++)
            {
                var card = PackService.Roll(
                    _cardRatingCalculator, pool, 1, Array.Empty<string>(), false, random: random).Single();
                seen[card.Id] = seen.GetValueOrDefault(card.Id) + 1;
            }

            Assert.That(seen["top"], Is.LessThan(seen["mid"]));
            Assert.That(seen["mid"], Is.LessThan(seen["bottom"]));
        }

        /* ----------------------------------------------------------------- */

        private CardSubject Subject(string id, int visibleRating, bool isIcon) =>
            new(id, id, visibleRating, _cardRatingCalculator.OverallFor(visibleRating), 20, isIcon);

        private CardPool PoolOf(params (string Id, int VisibleRating)[] players) =>
            new(
                5,
                players.Select(player => Subject(player.Id, player.VisibleRating, false)).ToList(),
                Array.Empty<CardSubject>());

        /// <summary>What share of the raffle one player holds, measured by drawing singles.</summary>
        private double TicketShareOf(string playerId, CardPool pool, IReadOnlyList<string> doubled)
        {
            var tickets = pool.Actives.ToDictionary(
                subject => subject.Id,
                subject => _cardRatingCalculator.TicketsFor(subject.Overall)
                           * (doubled.Contains(subject.Id) ? 2 : 1));

            return tickets[playerId] / tickets.Values.Sum();
        }
    }
}
