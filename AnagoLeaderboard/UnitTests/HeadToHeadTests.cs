using System.Text.Json;
using AnagoLeaderboard.Database;
using AnagoLeaderboard.Services;
using Microsoft.EntityFrameworkCore;

namespace UnitTests
{
    /// <summary>
    /// What the head-to-head scale would actually look like, on the real roster.
    ///
    /// Same job for the personal album that <see cref="PackOddsTests"/> does for the pack odds:
    /// the question is quantitative and cannot be answered from the formula, so it is measured
    /// against a copy of a real database. Everything here is <c>[Explicit]</c> and an ordinary
    /// <c>dotnet test</c> never pays for it:
    ///
    ///     dotnet test AnagoLeaderboard\UnitTests\UnitTests.csproj ^
    ///         --filter "FullyQualifiedName~HeadToHeadTests.PrintTheDistribution" ^
    ///         -l "console;verbosity=detailed"
    ///
    /// It has to be filtered <em>by name</em>, for the reason PackOddsTests gives: a category
    /// filter does not override <c>[Explicit]</c>.
    /// </summary>
    [TestFixture]
    [Category("h2h")]
    public class HeadToHeadTests
    {
        /// <summary>
        /// The settled scale, pinned.
        ///
        /// Not <c>[Explicit]</c> and reading no database: every figure here was argued for against
        /// the real roster, and each one is a number somebody could change in a minute while
        /// tidying. The measurements that produced them are in the explicit tests below and in
        /// docs/trading-cards.md; this only guards them.
        /// </summary>
        [Test]
        public void TheSettledScaleIsWhatWasAgreed()
        {
            var scale = new DeltaScaleCalculator();

            Assert.Multiple(() =>
            {
                Assert.That(
                    scale.Anchors.Select(a => (a.AverageDelta, a.Overall)),
                    Is.EqualTo(new[] { (-5d, 92d), (0d, 82d), (5d, 50d) }),
                    "the delta scale's anchors moved");

                // The cap is the pacing lever: tickets halve every 2.5 overall points above the
                // hinge, so 95 would be 2.3x rarer than the board's top card and 99 six times.
                Assert.That(scale.OverallFor(-9), Is.EqualTo(92), "clamps to the cap");
                Assert.That(scale.OverallFor(-5), Is.EqualTo(92), "the rare extent");
                Assert.That(scale.OverallFor(0), Is.EqualTo(82), "a level matchup");
                Assert.That(scale.OverallFor(+5), Is.EqualTo(50), "the common extent");

                // The 80 line sits just above a zero record. That is what puts roughly 23 cards at
                // 80 or above in a real book - the count today's book holds - and it is the whole
                // reason the middle anchor is 82 rather than the book's median of ~73.
                Assert.That(scale.OverallFor(+0.30), Is.GreaterThanOrEqualTo(80));
                Assert.That(scale.OverallFor(+0.60), Is.LessThan(80));
            });
        }

        /// <summary>
        /// The blend and the extent, pinned for the same reason as the scale above.
        ///
        /// These are the two that decide how much a record is allowed to say. Ten games to full
        /// weight rather than five - at five the card churns by about 24 overall points at the
        /// moment its weight tops out - and the per-book extent read off ranks two to five rather
        /// than one, so no single opponent silently owns the width of a whole book.
        /// </summary>
        [Test]
        public void TheSettledBlendIsWhatWasAgreed()
        {
            var blended = typeof(HeadToHeadService).GetMethod(
                "Blended",
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static);

            Assert.That(blended, Is.Not.Null,
                "Blended has been renamed or moved; this guard no longer guards anything");

            var calculator = new CardRatingCalculator();
            object Weigh(int games) =>
                blended!.Invoke(null, new object[] { 70, 92, games, 10d, calculator })!;

            Assert.Multiple(() =>
            {
                Assert.That(Weigh(10), Is.EqualTo(92), "ten games hands the record full authority");
                Assert.That(Weigh(5), Is.EqualTo(81), "five games is half way to the record");
                Assert.That(Weigh(0), Is.EqualTo(70), "never played prints the ordinary rating untouched");
            });
        }

        /// <summary>
        /// The distribution of average delta per pair, and how a candidate anchor table spreads it
        /// over 40-99.
        ///
        /// No sample floor: pairs are reported at whatever game count they have, including one, so
        /// that the cost of not having a floor is visible in the extremes rather than assumed.
        /// </summary>
        [Test]
        [Explicit("Reads a copy of a real database.")]
        public async Task PrintTheDistribution()
        {
            var candidates = new[]
            {
                (Name: "three anchors +/-6", Spec: (string?)"-6:99,0:70,6:40"),
                (Name: "linear +/-8", Spec: "-8:99,8:40"),
                (Name: "linear +/-15", Spec: "-15:99,15:40"),
                (Name: "linear +/-21", Spec: "-21:99,21:40")
            };

            await WithProductionCopy(async service =>
            {
                var first = await service.GetReport();

                TestContext.Out.WriteLine($"pairs {first.Summary.Pairs}, met {first.Summary.PairsWithGames}, never met {first.Summary.PairsWithoutGames}");
                TestContext.Out.WriteLine("game bands   " + string.Join("  ", first.Summary.PairsByGameCount.Select(entry => $"{entry.Key}={entry.Value}")));
                TestContext.Out.WriteLine();
                TestContext.Out.WriteLine("### variance decomposition");
                foreach (var (key, value) in first.Summary.Variance)
                {
                    TestContext.Out.WriteLine($"  {key,-24} {value}");
                }
                TestContext.Out.WriteLine();
                TestContext.Out.WriteLine("### average delta, by sample floor");
                foreach (var (floor, values) in first.Summary.PercentilesByFloor)
                {
                    TestContext.Out.WriteLine($"  {floor,-22} " + string.Join("  ", values.Select(entry => $"{entry.Key}={entry.Value}")));
                }
                TestContext.Out.WriteLine();

                foreach (var candidate in candidates)
                {
                    var report = await service.GetReport(
                        anchors: DeltaScaleCalculator.ParseAnchors(candidate.Spec));

                    TestContext.Out.WriteLine($"### {candidate.Name}  [{string.Join(", ", report.Anchors)}]");
                    TestContext.Out.WriteLine("  overalls  " + string.Join("  ", report.Summary.OverallHistogram.Select(entry => $"{entry.Key}={entry.Value}")));
                }
            });
        }

        /// <summary>
        /// One collector's whole book under the candidate scale, next to what the same cards print
        /// today. Set <c>H2H_COLLECTOR</c> to a name fragment; defaults to the busiest player.
        /// </summary>
        [Test]
        [Explicit("Reads a copy of a real database.")]
        public async Task PrintOneBook()
        {
            var wanted = Environment.GetEnvironmentVariable("H2H_COLLECTOR");
            var spec = Environment.GetEnvironmentVariable("H2H_ANCHORS");

            await WithProductionCopy(async service =>
            {
                var report = await service.GetReport(
                    anchors: DeltaScaleCalculator.ParseAnchors(spec),
                    scoreAnchors: DeltaScaleCalculator.ParseAnchors(
                        Environment.GetEnvironmentVariable("H2H_SCORE_ANCHORS")),
                    shrinkageK: Read("H2H_K"),
                    nudgeCeiling: Read("H2H_CEILING"),
                    trustAt: Read("H2H_TRUST"),
                    medianTarget: Read("H2H_MEDIAN") is { } t ? (int)t : null);

                var collector = wanted is null
                    ? report.Rows.GroupBy(row => row.CollectorName)
                        .OrderByDescending(group => group.Sum(row => row.Games))
                        .First().Key
                    // Exact first, then a prefix, then anywhere. "Ida" is a substring of "Hidayat",
                    // so a bare Contains hands back Ridho's book and says nothing about it.
                    : report.Rows.Select(row => row.CollectorName).Distinct().OrderBy(name =>
                            name.Equals(wanted, StringComparison.OrdinalIgnoreCase) ? 0
                            : name.StartsWith(wanted, StringComparison.OrdinalIgnoreCase) ? 1
                            : name.Contains(wanted, StringComparison.OrdinalIgnoreCase) ? 2
                            : 3)
                        .First();

                var book = report.Rows.Where(row => row.CollectorName == collector).ToList();

                // Two tables rather than one wide one: each option is judged by whether its own
                // ordering reads true, and an ordering is only legible when the table is sorted by
                // it.
                var factor = book.First().ExtentFactorDelta;

                TestContext.Out.WriteLine($"### {collector} - B5, op elo-delta  [extent x{factor:0.00}]");
                TestContext.Out.WriteLine(
                    $"| {"tegenstander",-22} | {"n",4} | {"record",8} | {"nu",2} | {"B",2} |");
                TestContext.Out.WriteLine(
                    $"|{new string('-', 24)}|{new string('-', 6)}|{new string('-', 10)}|{new string('-', 4)}|{new string('-', 4)}|");

                foreach (var row in book
                             .OrderByDescending(row => row.BlendedDeltaOverall)
                             .ThenByDescending(row => row.Games))
                {
                    var name = row.SubjectName.Length <= 22 ? row.SubjectName : row.SubjectName[..22];

                    TestContext.Out.WriteLine(
                        $"| {name,-22} | {row.Games,4} | {row.CentredDelta,8:+0.00;-0.00; 0.00} | " +
                        $"{row.GlobalOverall,2} | {row.BlendedDeltaOverall,2} |");
                }

                var calculator = new CardRatingCalculator();
                var mass = book.Sum(row => calculator.TicketsFor(row.BlendedDeltaOverall));
                var nuMass = book.Sum(row => calculator.TicketsFor(row.GlobalOverall));

                TestContext.Out.WriteLine(
                    $"  median {Median(book.Select(row => (double)row.BlendedDeltaOverall)):0} " +
                    $"(nu {Median(book.Select(row => (double)row.GlobalOverall)):0})  " +
                    $"max {book.Max(row => row.BlendedDeltaOverall)}  " +
                    $">=80: {book.Count(row => row.BlendedDeltaOverall >= 80)} (nu {book.Count(row => row.GlobalOverall >= 80)})  " +
                    $"vol {ExpectedDraws(book.Select(row => calculator.TicketsFor(row.BlendedDeltaOverall) / mass)):N0} " +
                    $"({ExpectedDraws(book.Select(row => calculator.TicketsFor(row.GlobalOverall) / nuMass)):N0} nu)");
            });
        }

        /// <summary>
        /// The full report as JSON, which is what <c>GET api/cards/volume2</c> answers. Written to
        /// <c>H2H_OUT</c> when set, printed otherwise.
        /// </summary>
        [Test]
        [Explicit("Reads a copy of a real database.")]
        public async Task DumpTheReport()
        {
            await WithProductionCopy(async service =>
            {
                var report = await service.GetReport(
                    anchors: DeltaScaleCalculator.ParseAnchors(Environment.GetEnvironmentVariable("H2H_ANCHORS")));

                var json = JsonSerializer.Serialize(report, new JsonSerializerOptions
                {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                var destination = Environment.GetEnvironmentVariable("H2H_OUT");
                if (string.IsNullOrWhiteSpace(destination))
                {
                    TestContext.Out.WriteLine(json);
                }
                else
                {
                    await File.WriteAllTextAsync(destination, json, new System.Text.UTF8Encoding(false));
                    TestContext.Out.WriteLine($"written to {destination}");
                }
            });
        }

        /// <summary>
        /// A throwaway copy of the production database, wired up the way the API wires it.
        ///
        /// Copied rather than opened, and with pooling off, for the reasons
        /// <see cref="PackOddsTests.PrintThePoolFromADatabase"/> gives: the live file has a WAL
        /// beside it, and Microsoft.Data.Sqlite keeps a disposed connection's handle around long
        /// enough to defeat the delete.
        /// </summary>
        /// <summary>
        /// Whether an uncentred record is biased by the collector's own standing.
        ///
        /// This is the question that decides whether centring is needed at all. If a strong player's
        /// per-opponent records sit systematically lower than a weak player's, then an uncentred
        /// scale rates the collector rather than the matchup and has to be corrected. If they do
        /// not, centring is machinery for nothing - and dropping it removes the one path by which a
        /// game against A and B can move C's card.
        /// </summary>
        [Test]
        [Explicit("Reads a copy of a real database.")]
        public async Task PrintCollectorCentres()
        {
            await WithProductionCopy(async service =>
            {
                var report = await service.GetReport();

                // Each player's own overall, read off the rows where they appear as the subject.
                var overallByName = report.Rows
                    .GroupBy(row => row.SubjectName)
                    .ToDictionary(group => group.Key, group => group.First().GlobalOverall);

                TestContext.Out.WriteLine(
                    $"| {"collector",-24} | {"eigen",5} | {"m",3} | {"elo heel",8} | {"elo nu",8} | {"gls heel",8} | {"gls nu",8} |");
                TestContext.Out.WriteLine(
                    $"|{new string('-', 26)}|{new string('-', 7)}|{new string('-', 5)}|{new string('-', 10)}|{new string('-', 10)}|{new string('-', 10)}|{new string('-', 10)}|");

                foreach (var group in report.Rows
                             .GroupBy(row => row.CollectorName)
                             .OrderByDescending(group => overallByName.GetValueOrDefault(group.Key)))
                {
                    var met = group.Where(row => row.Games > 0).ToList();
                    if (met.Count < 10) continue;

                    // The old constant: the median over every opponent, jitter included.
                    var wholeElo = Median(met.Select(row => row.AverageDelta));
                    var wholeGoals = Median(met.Select(row => row.AverageScoreDiff));

                    // The new one, recovered from any row the service actually centred: the row
                    // carries both the raw and the centred figure, so the difference is the constant.
                    var sample = met.First();
                    var usedElo = sample.AverageDelta - sample.CentredDelta;
                    var usedGoals = sample.AverageScoreDiff - sample.CentredScoreDiff;

                    var name = group.Key.Length <= 24 ? group.Key : group.Key[..24];

                    TestContext.Out.WriteLine(
                        $"| {name,-24} | {overallByName.GetValueOrDefault(group.Key),5} | " +
                        $"{met.Count(row => row.Games >= 10),3} | " +
                        $"{wholeElo,8:+0.00;-0.00; 0.00} | {usedElo,8:+0.00;-0.00; 0.00} | " +
                        $"{wholeGoals,8:+0.00;-0.00; 0.00} | {usedGoals,8:+0.00;-0.00; 0.00} |");
                }
            });
        }

        private static double Median(IEnumerable<double> values)
        {
            var sorted = values.OrderBy(value => value).ToArray();
            if (sorted.Length == 0) return 0;

            return sorted.Length % 2 == 1
                ? sorted[sorted.Length / 2]
                : (sorted[sorted.Length / 2 - 1] + sorted[sorted.Length / 2]) / 2;
        }

        private static double Correlation(IEnumerable<(double X, double Y)> pairs)
        {
            var data = pairs.ToArray();
            if (data.Length < 3) return 0;

            var meanX = data.Average(point => point.X);
            var meanY = data.Average(point => point.Y);

            var covariance = data.Sum(point => (point.X - meanX) * (point.Y - meanY));
            var varianceX = data.Sum(point => Math.Pow(point.X - meanX, 2));
            var varianceY = data.Sum(point => Math.Pow(point.Y - meanY, 2));

            return varianceX <= 0 || varianceY <= 0
                ? 0
                : covariance / Math.Sqrt(varianceX * varianceY);
        }

        /// <summary>One option's book, sorted by that option, with the record it reads beside it.</summary>
        private static void Print(
            string title,
            string recordHeader,
            IEnumerable<AnagoLeaderboard.Models.Results.HeadToHeadRow> rows,
            Func<AnagoLeaderboard.Models.Results.HeadToHeadRow, double> record,
            Func<AnagoLeaderboard.Models.Results.HeadToHeadRow, int> overall)
        {
            TestContext.Out.WriteLine(title);
            TestContext.Out.WriteLine(
                $"| {"tegenstander",-22} | {"n",4} | {recordHeader,8} | {"nu",2} | {"B",2} |");
            TestContext.Out.WriteLine(
                $"|{new string('-', 24)}|{new string('-', 6)}|{new string('-', 10)}|{new string('-', 4)}|{new string('-', 4)}|");

            var book = rows.ToList();

            foreach (var row in book)
            {
                var name = row.SubjectName.Length <= 22 ? row.SubjectName : row.SubjectName[..22];

                TestContext.Out.WriteLine(
                    $"| {name,-22} | {row.Games,4} | {record(row),8:+0.00;-0.00; 0.00} | " +
                    $"{row.GlobalOverall,2} | {overall(row),2} |");
            }

            // The shape of the book, which is not the shape of the record: the middle anchor decides
            // where a zero record prints, and the median *card* is a different quantity because the
            // thin pairs are pulled back toward their ordinary ratings and those subjects are not a
            // fair sample of the roster.
            TestContext.Out.WriteLine(
                $"  shape: median {Median(book.Select(row => (double)overall(row))):0} " +
                $"(nu {Median(book.Select(row => (double)row.GlobalOverall)):0})  " +
                $"min {book.Min(row => overall(row))} max {book.Max(row => overall(row))}  " +
                $">=80: {book.Count(row => overall(row) >= 80)} (nu {book.Count(row => row.GlobalOverall >= 80)})");

            // The pacing number, and the only one that says how long a volume takes.
            //
            // Not the median and not the count above 80: what a collector experiences is the chance
            // the card they are still missing turns up, and that is one card's share of the ticket
            // mass. Read through the live TicketsFor so the hinge and DHigh are the real ones.
            var calculator = new CardRatingCalculator();

            var mass = book.Sum(row => calculator.TicketsFor(overall(row)));
            var rarest = book.Max(row => overall(row));
            var share = calculator.TicketsFor(rarest) / mass;

            var nuMass = book.Sum(row => calculator.TicketsFor(row.GlobalOverall));
            var nuRarest = book.Max(row => row.GlobalOverall);
            var nuShare = calculator.TicketsFor(nuRarest) / nuMass;

            TestContext.Out.WriteLine(
                $"  chase: zeldzaamste {rarest} bij {share:P3} per kaart  " +
                $"(nu {nuRarest} bij {nuShare:P3})  -> {nuShare / share:0.0}x zo zwaar");

            // And the number the chase is only a proxy for: how many cards it takes to fill the
            // book. Unequal-probability coupon collecting has no closed form, so it is integrated:
            // E[T] = INT (1 - PROD(1 - e^-p_i t)) dt. The rarest card dominates it, but not alone -
            // a graded top costs more than a single spike, which is exactly the difference the ">=80"
            // count was standing in for.
            var draws = ExpectedDraws(book.Select(row => calculator.TicketsFor(overall(row)) / mass));
            var nuDraws = ExpectedDraws(book.Select(row => calculator.TicketsFor(row.GlobalOverall) / nuMass));

            TestContext.Out.WriteLine(
                $"  vol:   {draws:N0} kaarten om vol te maken  (nu {nuDraws:N0})  -> {draws / nuDraws:0.00}x");
        }

        /// <summary>
        /// Expected draws to collect every card, for cards drawn independently with the given
        /// probabilities. Integrated numerically; the step and horizon are sized off the rarest card.
        /// </summary>
        private static double ExpectedDraws(IEnumerable<double> probabilities)
        {
            var p = probabilities.Where(value => value > 0).ToArray();
            if (p.Length == 0) return 0;

            var horizon = 40 / p.Min();
            var step = horizon / 200_000;
            var total = 0d;

            for (var t = step / 2; t < horizon; t += step)
            {
                var allCollected = 1d;
                foreach (var value in p) allCollected *= 1 - Math.Exp(-value * t);

                total += (1 - allCollected) * step;
            }

            return total;
        }

        /// <summary>An optional numeric knob off the environment, so a sweep needs no rebuild.</summary>
        private static double? Read(string name) =>
            double.TryParse(
                Environment.GetEnvironmentVariable(name),
                System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture,
                out var value)
                ? value
                : null;

        private static async Task WithProductionCopy(Func<HeadToHeadService, Task> body)
        {
            var source = Environment.GetEnvironmentVariable("TAFELVOETBAL_DB")
                         ?? @"C:\tafelvoetbal-data\productiondata.db";

            Assert.That(File.Exists(source), $"no database at {source}");

            var copy = Path.Combine(Path.GetTempPath(), $"h2h-{Guid.NewGuid():N}.db");

            File.Copy(source, copy);
            foreach (var suffix in new[] { "-wal", "-shm" })
            {
                if (File.Exists(source + suffix)) File.Copy(source + suffix, copy + suffix);
            }

            try
            {
                var options = new DbContextOptionsBuilder<DatabaseContext>()
                    .UseSqlite($"Data Source={copy};Pooling=False")
                    .Options;

                await using var dbContext = new DatabaseContext(options);

                var leaderBoardService = new LeaderBoardService(new GameService(dbContext), dbContext);

                await body(new HeadToHeadService(
                    leaderBoardService,
                    new CardRatingCalculator(),
                    new DeltaScaleCalculator()));
            }
            finally
            {
                foreach (var suffix in new[] { "", "-wal", "-shm" })
                {
                    if (File.Exists(copy + suffix)) File.Delete(copy + suffix);
                }
            }
        }
    }
}
