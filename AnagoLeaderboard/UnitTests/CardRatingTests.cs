using AnagoLeaderboard.Services;

namespace UnitTests
{
    /// <summary>
    /// Fidelity of the C# port against the scale that phase 1 was designed and judged on.
    ///
    /// The expected overalls below are not recomputed from this implementation - they are
    /// the published per-player table in docs/trading-cards.md, which the odds, the tier
    /// counts, the ceremony thresholds and every completion estimate were all derived from.
    /// If one of them moves, the balance moved with it.
    /// </summary>
    [TestFixture]
    public class CardRatingTests
    {
        private CardRatingCalculator _calculator = null!;

        [SetUp]
        public void SetUp() => _calculator = new CardRatingCalculator();

        /// <summary>The four anchors the whole scale was fitted to, and the floor.</summary>
        [TestCase(0, 40)]
        [TestCase(800, 70)]
        [TestCase(1000, 80)]
        [TestCase(1851, 90)]
        [TestCase(2600, 99)]
        [TestCase(3000, 99)]
        public void AnchorsAreHitExactly(int visibleRating, int expectedOverall)
        {
            Assert.That(_calculator.OverallFor(visibleRating), Is.EqualTo(expectedOverall));
        }

        [Test]
        public void BelowTheFloorAndAboveTheCeilingBothClamp()
        {
            Assert.That(_calculator.OverallFor(-500), Is.EqualTo(40));
            Assert.That(_calculator.OverallFor(0), Is.EqualTo(40));
            Assert.That(_calculator.OverallFor(3000), Is.EqualTo(99));
            Assert.That(_calculator.OverallFor(10_000), Is.EqualTo(99));
        }

        /// <summary>
        /// The live roster, straight out of the odds table in docs/trading-cards.md. This is
        /// the test that catches a port that is subtly wrong rather than obviously broken.
        /// </summary>
        [TestCase(1851, 90)] // Petar
        [TestCase(1578, 88)] // Ton
        [TestCase(1551, 88)] // Mark
        [TestCase(1463, 87)] // Rik
        [TestCase(1362, 86)] // Luuk
        [TestCase(1327, 85)] // Casper
        [TestCase(1201, 83)] // Gijs
        [TestCase(1179, 83)] // Anneloes
        [TestCase(1144, 82)] // Nadia
        [TestCase(1066, 81)] // Daan van der Beek
        [TestCase(1035, 81)] // Mathijs
        [TestCase(981, 79)]  // Max
        [TestCase(952, 78)]  // Niek
        [TestCase(919, 76)]  // Tanny
        [TestCase(867, 73)]  // Yannick
        [TestCase(864, 73)]  // Marie
        [TestCase(829, 71)]  // Bo
        [TestCase(811, 71)]  // Nynke
        [TestCase(782, 69)]  // Ewan
        [TestCase(767, 69)]  // Rianne
        [TestCase(764, 68)]  // Jeroen van Geel
        [TestCase(761, 68)]  // Sevda
        [TestCase(759, 68)]  // Esther
        [TestCase(740, 67)]  // Karin
        [TestCase(732, 67)]  // Tim
        [TestCase(716, 66)]  // Ida
        [TestCase(688, 65)]  // Lotte
        [TestCase(627, 63)]  // Dmitry
        [TestCase(616, 62)]  // Fraser
        [TestCase(582, 61)]  // Jasper
        [TestCase(538, 59)]  // Sandra
        [TestCase(519, 58)]  // Evie
        [TestCase(342, 52)]  // Daria
        public void RealPlayersLandWhereTheDocumentedOddsSayTheyDo(int visibleRating, int expectedOverall)
        {
            Assert.That(_calculator.OverallFor(visibleRating), Is.EqualTo(expectedOverall));
        }

        /// <summary>
        /// The two ratings the current anchors were tuned against, pinned as a pair.
        ///
        /// They are one test rather than two because they are one trade-off. Everything added to
        /// the 1000-1851 stretch to lift the board accumulates onto the top active, and he prints
        /// 90 only while his raw value stays under 90.50 - he is at 89.80. So the record holder
        /// reaching 92 and the top active staying 90 is not two facts about two players; it is
        /// the single constraint that picked these anchors, and a re-tune that breaks either half
        /// has broken the tuning.
        ///
        /// Deliberately the live ratings rather than the anchor values, because the whole point
        /// is where real people land between anchors.
        /// </summary>
        [Test]
        public void TheRecordHolderPrints92AndTheTopActiveStays90()
        {
            Assert.Multiple(() =>
            {
                Assert.That(_calculator.OverallFor(1954), Is.EqualTo(92),
                    "Roel Loonen's all-time high, the highest rating ever recorded");
                Assert.That(_calculator.OverallFor(1816), Is.EqualTo(90),
                    "Petar's current rating - the ceiling on sharpening anything below 1851");
            });
        }

        /// <summary>
        /// The 800-1000 segment runs 20 rating to the point, so odd multiples of ten land on
        /// an exact midpoint. C# rounds those to even by default and JavaScript rounds them
        /// up; without an explicit mode the two scales disagree here and nowhere obvious.
        /// </summary>
        [TestCase(810, 71)]
        [TestCase(830, 72)]
        [TestCase(850, 73)]
        [TestCase(870, 74)]
        [TestCase(890, 75)]
        public void ExactMidpointsRoundUp(int visibleRating, int expectedOverall)
        {
            Assert.That(_calculator.OverallFor(visibleRating), Is.EqualTo(expectedOverall));
        }

        [Test]
        public void ScaleNeverGoesBackwards()
        {
            var previous = _calculator.OverallFor(0);

            for (var rating = 1; rating <= 3200; rating++)
            {
                var overall = _calculator.OverallFor(rating);
                Assert.That(overall, Is.GreaterThanOrEqualTo(previous),
                    $"overall dropped at visible rating {rating}");
                previous = overall;
            }

            Assert.That(previous, Is.EqualTo(99));
        }

        /// <summary>
        /// The halving rate accelerates above overall 80, but it may not jump there: the
        /// hinge is a change of slope, not a step. A discontinuity would put a visible cliff
        /// in the rarity of two players one point apart.
        /// </summary>
        [Test]
        public void TicketsAreContinuousAtTheHinge()
        {
            var atHinge = _calculator.TicketsFor(80);

            Assert.That(atHinge, Is.EqualTo(Math.Pow(2, -40d / 30)).Within(1e-12));
            Assert.That(_calculator.TicketsFor(79) / atHinge, Is.EqualTo(Math.Pow(2, 1d / 30)).Within(1e-9));
        }

        [Test]
        public void TheFloorHoldsExactlyOneTicket()
        {
            Assert.That(_calculator.TicketsFor(40), Is.EqualTo(1).Within(1e-12));
        }

        [Test]
        public void TicketsFallMonotonicallyAcrossTheWholeScale()
        {
            for (var overall = 41; overall <= 99; overall++)
            {
                Assert.That(_calculator.TicketsFor(overall),
                    Is.LessThan(_calculator.TicketsFor(overall - 1)),
                    $"tickets did not fall at overall {overall}");
            }
        }

        /// <summary>
        /// Documented consequence of the flat sub-hinge rate: the entire bottom two-thirds of
        /// the roster, Daria at 52 up to Max at 79, spans only about 1.87x in tickets. That
        /// is why bronze is barely commoner than silver, and it is a deliberate property
        /// rather than an accident of the numbers.
        /// </summary>
        [Test]
        public void TheWholeSubHingeRosterSpansAboutOnePointNineTimes()
        {
            var spread = _calculator.TicketsFor(52) / _calculator.TicketsFor(79);

            Assert.That(spread, Is.EqualTo(1.87).Within(0.01));
        }

        /// <summary>
        /// And the counterpart above the hinge: ten overall points there are worth four
        /// halvings, so the top of the board is genuinely scarce rather than merely rarer.
        /// </summary>
        [Test]
        public void TenPointsAboveTheHingeCostFourHalvings()
        {
            var spread = _calculator.TicketsFor(80) / _calculator.TicketsFor(90);

            Assert.That(spread, Is.EqualTo(16).Within(1e-9));
        }
    }
}
