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
            Assert.That(pack.Reason, Does.StartWith("gespeeld"));
        }

        [Test]
        public void EvenGame_AWinIsThreeCards()
        {
            // Expected +1, actual +3: won, but only 2 better than expected.
            var pack = PackService.PackForGame(GameBetween(10, 7), "t1p1");

            Assert.That(pack.Size, Is.EqualTo(3));
            Assert.That(pack.Reason, Does.StartWith("gewonnen"));
            Assert.That(pack.Reason, Does.Not.Contain("verwachting"));
        }

        [Test]
        public void EvenGame_AWinAgainstTheOddsIsFiveCards()
        {
            // Expected +1, actual +7.
            var pack = PackService.PackForGame(GameBetween(10, 3), "t1p1");

            Assert.That(pack.Size, Is.EqualTo(5));
            Assert.That(pack.Reason, Is.EqualTo("gewonnen \u2014 10-3 tegen de verwachting in"));
        }

        [Test]
        public void HeavyUnderdog_AGoodLossIsThreeCards()
        {
            // The first team is 700 rating adrift, so they are expected to lose by a distance.
            // Losing 8-10 clears that by enough to earn the margin bonus without winning.
            var pack = PackService.PackForGame(GameBetween(8, 10, 700, 1400), "t1p1");

            Assert.That(pack.Size, Is.EqualTo(3));
            Assert.That(pack.Reason, Is.EqualTo("tegen de verwachting in \u2014 8-10"));
        }

        [Test]
        public void TheSecondTeamIsSizedFromItsOwnSeat()
        {
            var game = GameBetween(3, 10);

            // The same row, read from both ends: the winners get five and the losers get one.
            Assert.That(PackService.PackForGame(game, "t2p1").Size, Is.EqualTo(5));
            Assert.That(PackService.PackForGame(game, "t1p1").Size, Is.EqualTo(1));

            // And the score is printed from the reader's seat, not the row's.
            Assert.That(PackService.PackForGame(game, "t2p1").Reason, Does.Contain("10-3"));
            Assert.That(PackService.PackForGame(game, "t1p1").Reason, Does.Contain("3-10"));
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
                    _cardRatingCalculator, pool, 5, Array.Empty<string>(), false, random);

                Assert.That(drawn.Count, Is.EqualTo(5));
                Assert.That(drawn.Select(card => card.Id).Distinct().Count(), Is.EqualTo(5));
            }
        }

        [Test]
        public void APoolSmallerThanThePackIsNotAnInfiniteLoop()
        {
            var drawn = PackService.Roll(
                _cardRatingCalculator, PoolOf(("a", 1000), ("b", 900)), 5,
                Array.Empty<string>(), false, new Random(1));

            Assert.That(drawn.Count, Is.EqualTo(2));
        }

        [Test]
        public void LegendsAreOnlyDrawnOnceUnlocked()
        {
            var pool = new CardPool(
                5,
                new[] { Subject("active", 1000, false) },
                new[] { Subject("legend", 1000, true) });

            var locked = PackService.Roll(
                _cardRatingCalculator, pool, 2, Array.Empty<string>(), false, new Random(1));
            Assert.That(locked.Select(card => card.Id), Is.EqualTo(new[] { "active" }));

            var unlocked = PackService.Roll(
                _cardRatingCalculator, pool, 2, Array.Empty<string>(), true, new Random(1));
            Assert.That(unlocked.Select(card => card.Id), Is.EquivalentTo(new[] { "active", "legend" }));
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
                             _cardRatingCalculator, pool, size, Array.Empty<string>(), false, random))
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
                    _cardRatingCalculator, pool, 1, Array.Empty<string>(), false, random).Single();
                seen[card.Id] = seen.GetValueOrDefault(card.Id) + 1;
            }

            Assert.That(seen["top"], Is.LessThan(seen["mid"]));
            Assert.That(seen["mid"], Is.LessThan(seen["bottom"]));
        }

        /* ----------------------------------------------------------------- */

        private CardSubject Subject(string id, int visibleRating, bool isLegend) =>
            new(id, id, visibleRating, _cardRatingCalculator.OverallFor(visibleRating), 20, isLegend);

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
