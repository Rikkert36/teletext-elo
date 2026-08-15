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
         * margin by three or more.
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

        [Test]
        public void HeavyUnderdog_AGoodLossIsThreeCards()
        {
            // The first team is 700 rating adrift, so they are expected to lose by a distance.
            // Losing 8-10 clears that by enough to earn the margin bonus without winning.
            var pack = PackService.PackForGame(GameBetween(8, 10, 700, 1400), "t1p1");

            Assert.That(pack.Size, Is.EqualTo(3));
            Assert.That(pack.Reason, Is.EqualTo("Verloren met t1p2 van t2p1 en t2p2 met 8 - 10"));
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
        public void YesterdaysGameOffersNothingToday()
        {
            var yesterday = GameBetween(10, 7);
            yesterday.CreatedAt = Today.AddDays(-1);

            var packs = PackService.Derive(
                "t1p1", new[] { yesterday }, Array.Empty<PackClaim>(), Today);

            // Hard same-day expiry needs no job and no filter: "today's games" is the query.
            Assert.That(packs.Select(pack => pack.Id), Is.EqualTo(new[] { "daily:2026-08-11" }));
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
            // 1851 -> 90 and 1362 -> 85 clear an 85 floor; the other three do not.
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
