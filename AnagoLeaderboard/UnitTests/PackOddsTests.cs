using System.Diagnostics;
using System.Text;
using System.Text.Json;
using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models.Results;
using AnagoLeaderboard.Services;
using Microsoft.EntityFrameworkCore;

namespace UnitTests
{
    /// <summary>
    /// What a pack's odds actually are, on the real roster, measured rather than derived.
    ///
    /// This is the replacement for the "kansen" button that used to sit on the collection page's
    /// test panel and drew a few thousand packs in the browser. The browser cannot draw a pack any
    /// more - the scale and the raffle live on the server precisely so a second copy of them cannot
    /// disagree - so the measurement moved here.
    ///
    /// Separate from <see cref="PackTests"/> on purpose. That fixture pins the <em>rules</em>: a win
    /// is three cards, nobody appears twice, a floor narrows the candidates. This one answers a
    /// quantitative question and costs a million draws to answer it, so everything in it is
    /// <c>[Explicit]</c> and an ordinary <c>dotnet test</c> never pays for it:
    ///
    ///     dotnet test AnagoLeaderboard\UnitTests\UnitTests.csproj ^
    ///         --filter "FullyQualifiedName~PackOddsTests.PackOdds" ^
    ///         -l "console;verbosity=detailed"
    ///
    /// <strong>It has to be filtered by name.</strong> <c>--filter "TestCategory=odds"</c> looks
    /// like it should work and does not: the NUnit adapter only overrides <c>[Explicit]</c> for a
    /// filter that names the test, and a category filter silently reports every test in it as
    /// skipped with the reason below as its "error".
    ///
    /// Two numbers come out and they are easy to confuse, which is the whole reason this exists.
    /// The <em>per-card</em> share is one player's slice of the ticket mass. The <em>per-pack</em>
    /// inclusion probability is what a collector experiences, and for a five it is a little over
    /// five times larger, because a pack is five draws without replacement rather than one.
    /// </summary>
    [TestFixture]
    [Category("odds")]
    public class PackOddsTests
    {
        /// <summary>
        /// Packs drawn. A million puts the standard error on the rarest subject at roughly 1% of
        /// its own value, which is well inside what the question needs.
        /// </summary>
        private const int Packs = 1_000_000;

        private static readonly int[] PackSizes = { 1, 3, 5 };

        /// <summary>
        /// Shards, and therefore seeds. Fixed rather than <c>Environment.ProcessorCount</c> so the
        /// run is reproducible on any machine: the shard count is part of the seed set, and a
        /// different one is a different stream of numbers.
        /// </summary>
        private const int Shards = 16;

        private const int BaseSeed = 20260818;

        private readonly CardRatingCalculator _cardRatingCalculator = new();

        /// <summary>
        /// The live pool, as <c>GET /api/cards/pool</c> returns it, checked in next to this file.
        ///
        /// A snapshot rather than a database read: the measurement has to be fast, offline and the
        /// same every time, and a replay of every game ever played is none of those. Refresh it
        /// with the API running -
        ///
        ///     curl http://localhost:44350/api/cards/pool > UnitTests/Data/pool-snapshot.json
        ///
        /// - or, with no API to hand, from <see cref="PrintThePoolFromADatabase"/> below.
        ///
        /// The overalls are recomputed through <see cref="CardRatingCalculator"/> rather than read
        /// off the file. A stale snapshot can then be wrong about who is on the roster, which is
        /// visible, but never about the scale, which would not be.
        /// </summary>
        private CardPool LoadPool()
        {
            var path = Path.Combine(TestContext.CurrentContext.TestDirectory, "Data", "pool-snapshot.json");

            Assert.That(File.Exists(path), $"no pool snapshot at {path}");

            var snapshot = JsonSerializer.Deserialize<PoolSnapshot>(
                File.ReadAllText(path),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            Assert.That(snapshot, Is.Not.Null);

            return new CardPool(
                snapshot!.MinGames,
                snapshot.Actives.Select(subject => Rescaled(subject, isIcon: false)).ToList(),
                snapshot.Icons.Select(subject => Rescaled(subject, isIcon: true)).ToList());
        }

        private CardSubject Rescaled(SnapshotSubject subject, bool isIcon) =>
            new(
                subject.Id,
                subject.Name,
                subject.VisibleRating,
                _cardRatingCalculator.OverallFor(subject.VisibleRating),
                subject.NumberOfGames,
                isIcon);

        /* ----------------------------------------------------------------- *
         * The measurement.
         * ----------------------------------------------------------------- */

        /// <summary>
        /// A million packs of every size a game can pay, against the arithmetic.
        ///
        /// Icons locked and no opponent bonus - an ordinary earned pack, opened by a collector who
        /// has not finished the active set. 1, 3 and 5 are the only sizes that exist; how a game
        /// picks between them is <see cref="PackSizeMix"/>'s question, not this one's.
        ///
        /// The Monte Carlo is checked against an <em>exact</em> reference computed in
        /// <see cref="ExactInclusionProbabilities"/>, so this is a proof rather than a printout: if
        /// the draw ever stopped being successive sampling, the two would part company well before
        /// anybody noticed a collection filling up oddly.
        /// </summary>
        [Test]
        [Explicit("Three million draws. Run it deliberately - see the filter on the fixture.")]
        public void PackOdds()
        {
            var pool = LoadPool();
            var candidates = pool.Actives;

            var tickets = candidates
                .Select(subject => _cardRatingCalculator.TicketsFor(subject.Overall))
                .ToArray();
            var ticketMass = tickets.Sum();

            var index = candidates
                .Select((subject, i) => (subject, i))
                .ToDictionary(pair => pair.subject.Id, pair => pair.i);

            TestContext.Out.WriteLine(
                $"{candidates.Count} actives, {pool.Icons.Count} icons (locked, so not drawn), "
                + $"minGames {pool.MinGames}, ticket mass {ticketMass:F4}");

            var exact = new Dictionary<int, double[]>();
            var observed = new Dictionary<int, Measurement>();

            foreach (var size in PackSizes)
            {
                exact[size] = ExactInclusionProbabilities(tickets, size);

                var stopwatch = Stopwatch.StartNew();
                observed[size] = Simulate(pool, size);
                stopwatch.Stop();

                TestContext.Out.WriteLine(
                    $"{Packs:N0} packs of {size} in {stopwatch.ElapsedMilliseconds:N0} ms "
                    + $"over {Shards} shards");
            }

            Report(pool, candidates, index, tickets, ticketMass, exact, observed);

            foreach (var size in PackSizes)
            {
                /*
                 * Both have to sum to the pack size. For the measured one that is arithmetic -
                 * every pack yields exactly that many cards - but for the exact one it is the check
                 * that catches "draw k independently and drop the duplicates" masquerading as
                 * successive sampling, which comes out short. It is the property PackTests pins on a
                 * synthetic pool, here on the real one, and at three sizes rather than one.
                 */
                Assert.That(
                    exact[size].Sum(), Is.EqualTo(size).Within(1e-9),
                    $"the exact inclusion probabilities must sum to {size}");

                Assert.That(
                    observed[size].Appearances.Values.Sum() / (double)Packs,
                    Is.EqualTo(size).Within(1e-9),
                    $"every pack must hold exactly {size} distinct subject(s)");

                Assert.That(observed[size].BestInPack.Sum(), Is.EqualTo(Packs));

                // Five sigma, on a run whose seeds are fixed, so this is deterministic rather than
                // flaky - it either passes forever or the draw changed.
                foreach (var subject in candidates)
                {
                    var p = exact[size][index[subject.Id]];
                    var sigma = Math.Sqrt(p * (1 - p) / Packs);
                    var measured =
                        observed[size].Appearances.GetValueOrDefault(subject.Id) / (double)Packs;

                    Assert.That(
                        measured, Is.EqualTo(p).Within(5 * sigma),
                        $"{subject.Name} came out {measured:P4} against an exact {p:P4} "
                        + $"in a pack of {size}");
                }
            }
        }

        /* ----------------------------------------------------------------- *
         * The draw, a million times.
         * ----------------------------------------------------------------- */

        /// <summary>
        /// Runs the production <see cref="PackService.Roll"/>, sharded.
        ///
        /// Each shard holds its own seeded <see cref="Random"/>. That is not a performance
        /// convenience: a seeded Random is not thread-safe, and sharing one across threads corrupts
        /// its state quietly enough to return values outside [0,1) - which here would look like a
        /// balance finding rather than a bug.
        /// </summary>
        private Measurement Simulate(CardPool pool, int size)
        {
            var perShard = new Measurement[Shards];

            Parallel.For(0, Shards, shard =>
            {
                var random = new Random(BaseSeed + shard);
                var tally = new Dictionary<string, int>();
                var bestInPack = new long[101];

                var from = (int)((long)Packs * shard / Shards);
                var to = (int)((long)Packs * (shard + 1) / Shards);

                for (var i = from; i < to; i++)
                {
                    var drawn = PackService.Roll(
                        _cardRatingCalculator, pool, size, Array.Empty<string>(), false, random: random);

                    // Thrown rather than asserted, and hand-rolled rather than LINQ: this runs a
                    // million times on a worker thread, where NUnit's assertions do not belong and
                    // a Distinct().Count() per pack would cost more than the draw it is checking.
                    if (drawn.Count != size) throw new InvalidOperationException($"drew {drawn.Count}");

                    var best = 0;

                    for (var a = 0; a < drawn.Count; a++)
                    {
                        if (drawn[a].Overall > best) best = drawn[a].Overall;

                        for (var b = a + 1; b < drawn.Count; b++)
                        {
                            if (drawn[a].Id == drawn[b].Id)
                            {
                                throw new InvalidOperationException($"{drawn[a].Name} twice in one pack");
                            }
                        }

                        tally[drawn[a].Id] = tally.GetValueOrDefault(drawn[a].Id) + 1;
                    }

                    // The best card in the pack, kept as a histogram. It is what makes "a five
                    // contains an 85 or better" answerable: that is a union, not a sum, and adding
                    // up the column would double-count every pack holding two of the band.
                    bestInPack[best]++;
                }

                perShard[shard] = new Measurement(tally, bestInPack);
            });

            var appearances = new Dictionary<string, int>();
            var best = new long[101];

            foreach (var measurement in perShard)
            {
                foreach (var (id, count) in measurement.Appearances)
                {
                    appearances[id] = appearances.GetValueOrDefault(id) + count;
                }

                for (var overall = 0; overall < best.Length; overall++)
                {
                    best[overall] += measurement.BestInPack[overall];
                }
            }

            return new Measurement(appearances, best);
        }

        /// <summary>What a run of packs came to: who turned up, and how good each pack's best card was.</summary>
        private sealed record Measurement(Dictionary<string, int> Appearances, long[] BestInPack);

        /* ----------------------------------------------------------------- *
         * The arithmetic the simulation is checked against.
         * ----------------------------------------------------------------- */

        /// <summary>
        /// Exact inclusion probabilities for a draw of <paramref name="size"/> without replacement.
        ///
        /// Successive sampling has no closed form for more than one draw - the second draw's
        /// weights depend on who the first took out - so this enumerates every ordered draw
        /// sequence and accumulates its probability onto the subjects in it. Over 37 candidates and
        /// a pack of five that is 37x36x35x34x33 sequences, about 51 million, and it runs in a
        /// second or so.
        ///
        /// It reads its ticket vector out of <see cref="CardRatingCalculator.TicketsFor"/>, so
        /// there is no second copy of the balance here - only a second way of counting the same
        /// draw, which is the point.
        /// </summary>
        private static double[] ExactInclusionProbabilities(double[] tickets, int size)
        {
            var totals = new double[tickets.Length];
            var taken = new bool[tickets.Length];

            void Walk(int remaining, double remainingTickets, double probability)
            {
                if (remaining == 0) return;

                for (var i = 0; i < tickets.Length; i++)
                {
                    if (taken[i]) continue;

                    var here = probability * tickets[i] / remainingTickets;
                    totals[i] += here;

                    if (remaining > 1)
                    {
                        taken[i] = true;
                        Walk(remaining - 1, remainingTickets - tickets[i], here);
                        taken[i] = false;
                    }
                }
            }

            Walk(Math.Min(size, tickets.Length), tickets.Sum(), 1.0);

            return totals;
        }

        /* ----------------------------------------------------------------- *
         * The table.
         * ----------------------------------------------------------------- */

        /// <summary>
        /// The table: exact inclusion probabilities per subject, one column per pack size.
        ///
        /// The exact values are printed rather than the measured ones, because they are the answer -
        /// the million packs per size are what proves them right, and that agreement is reported
        /// underneath as one worst-case z per size rather than as three more columns nobody reads.
        /// </summary>
        private void Report(
            CardPool pool,
            IReadOnlyList<CardSubject> candidates,
            IReadOnlyDictionary<string, int> index,
            double[] tickets,
            double ticketMass,
            IReadOnlyDictionary<int, double[]> exact,
            IReadOnlyDictionary<int, Measurement> observed)
        {
            var largest = PackSizes[^1];
            var table = new StringBuilder();

            var head = new StringBuilder()
                .Append("name".PadRight(31))
                .Append("rating".PadLeft(6))
                .Append("ovr".PadLeft(5))
                .Append("tickets".PadLeft(10))
                .Append("per card".PadLeft(10));

            foreach (var size in PackSizes) head.Append($"{size}-pack".PadLeft(11));
            head.Append($"1 in ({largest})".PadLeft(11));

            table.AppendLine();
            table.AppendLine(head.ToString());
            table.AppendLine(new string('-', head.Length));

            foreach (var subject in candidates.OrderByDescending(subject => subject.VisibleRating))
            {
                var i = index[subject.Id];
                var name = subject.Name.Length > 30 ? subject.Name[..29] + "…" : subject.Name;

                var row = new StringBuilder()
                    .Append(name.PadRight(31))
                    .Append(subject.VisibleRating.ToString().PadLeft(6))
                    .Append(subject.Overall.ToString().PadLeft(5))
                    .Append(tickets[i].ToString("F5").PadLeft(10))
                    .Append((tickets[i] / ticketMass).ToString("P3").PadLeft(10));

                foreach (var size in PackSizes) row.Append(exact[size][i].ToString("P3").PadLeft(11));
                row.Append((1 / exact[largest][i]).ToString("F0").PadLeft(11));

                table.AppendLine(row.ToString());
            }

            table.AppendLine();

            foreach (var size in PackSizes)
            {
                var worst = 0.0;
                var worstName = "";

                foreach (var subject in candidates)
                {
                    var p = exact[size][index[subject.Id]];
                    var seen =
                        observed[size].Appearances.GetValueOrDefault(subject.Id) / (double)Packs;
                    var z = (seen - p) / Math.Sqrt(p * (1 - p) / Packs);

                    if (Math.Abs(z) > Math.Abs(worst))
                    {
                        worst = z;
                        worstName = FirstName(subject.Name);
                    }
                }

                table.AppendLine(
                    $"pack of {size}: column sums to {exact[size].Sum():F6}, and the worst "
                    + $"disagreement with {Packs:N0} measured packs is z = {worst,5:F2} ({worstName})");
            }

            /*
             * Bands, as a union rather than a sum of the column above: read straight off the best
             * card in each simulated pack, so a pack holding two of a band is counted once. Summing
             * the column instead overstates the 80+ line by nearly a third.
             */
            var best = candidates.MaxBy(subject => subject.Overall)!;

            var bandHead = new StringBuilder().Append("contains".PadRight(16));
            foreach (var size in PackSizes) bandHead.Append($"{size}-pack".PadLeft(11));

            table.AppendLine();
            table.AppendLine(bandHead.ToString());
            table.AppendLine(new string('-', bandHead.Length));

            foreach (var floor in new[] { best.Overall, 88, 85, 80 }.Distinct().OrderByDescending(f => f))
            {
                var band = candidates.Count(subject => subject.Overall >= floor);
                var row = new StringBuilder().Append($"{floor}+ ({band} of them)".PadRight(16));

                foreach (var size in PackSizes)
                {
                    row.Append((observed[size].BestInPack.Skip(floor).Sum() / (double)Packs)
                        .ToString("P3").PadLeft(11));
                }

                table.AppendLine(row.ToString());
            }

            /*
             * What the icons do to the same numbers, without simulating them.
             *
             * The per-card share is a ratio against the whole ticket mass, so unlocking the icons
             * dilutes everybody in the pool without any of their own tickets changing. It is worth
             * printing because it is the number most easily mistaken for a pack's odds - it is a
             * per-card share, and a pack of five draws five times.
             */
            var withIcons = ticketMass
                            + pool.Icons.Sum(subject => _cardRatingCalculator.TicketsFor(subject.Overall));

            table.AppendLine();
            table.AppendLine(
                $"with the icons unlocked the mass is {withIcons:F4} over "
                + $"{candidates.Count + pool.Icons.Count} subjects, and {FirstName(best.Name)}'s "
                + $"per-card share falls from {tickets[index[best.Id]] / ticketMass:P3} to "
                + $"{tickets[index[best.Id]] / withIcons:P3}");

            TestContext.Out.WriteLine(table.ToString());
        }

        /// <summary>The first word, the way a docket names somebody. Nicknames live in the middle.</summary>
        private static string FirstName(string name) => name.Split(' ')[0];

        /* ----------------------------------------------------------------- *
         * Refreshing the snapshot with no API running.
         * ----------------------------------------------------------------- */

        /// <summary>
        /// Prints the pool from a real database, in the shape the snapshot file wants.
        ///
        /// The ordinary way to refresh <c>Data/pool-snapshot.json</c> is a curl against a running
        /// API - see <see cref="LoadPool"/>. This is the way that works with nothing running, and
        /// it is worth keeping for exactly that reason.
        ///
        /// <strong>Prefer the curl.</strong> The local development database is a copy taken by
        /// hand and drifts behind the server within days - it produced a roster two ratings and
        /// two subjects out of date the first time this was run, which is exactly the kind of
        /// wrong that reads as a balance finding rather than a stale file.
        ///
        /// It <strong>copies the database first</strong> and opens the copy. Reading is harmless in
        /// principle, but SQLite takes locks and writes a journal to serve a read, and the
        /// production file is not something a test suite should be touching at all. Point it
        /// somewhere with <c>TAFELVOETBAL_DB</c>, and set <c>POOL_SNAPSHOT_OUT</c> to write the
        /// snapshot rather than print it:
        ///
        ///     $env:POOL_SNAPSHOT_OUT = "...\UnitTests\Data\pool-snapshot.json"
        ///     dotnet test ... --filter "FullyQualifiedName~PrintThePoolFromADatabase"
        /// </summary>
        [Test]
        [Explicit("Reads a copy of a real database. Run it when the snapshot needs refreshing.")]
        public async Task PrintThePoolFromADatabase()
        {
            var source = Environment.GetEnvironmentVariable("TAFELVOETBAL_DB")
                         ?? @"C:\tafelvoetbal-data\productiondata.db";

            Assert.That(File.Exists(source), $"no database at {source}");

            var copy = Path.Combine(Path.GetTempPath(), $"pool-snapshot-{Guid.NewGuid():N}.db");

            File.Copy(source, copy);
            foreach (var suffix in new[] { "-wal", "-shm" })
            {
                if (File.Exists(source + suffix)) File.Copy(source + suffix, copy + suffix);
            }

            try
            {
                // Pooling off, or the copy is still held open when the finally block tries to
                // delete it: Microsoft.Data.Sqlite keeps a disposed connection's handle around.
                var options = new DbContextOptionsBuilder<DatabaseContext>()
                    .UseSqlite($"Data Source={copy};Pooling=False")
                    .Options;

                await using var dbContext = new DatabaseContext(options);

                var cardRatingCalculator = new CardRatingCalculator();
                var leaderBoardService = new LeaderBoardService(new GameService(dbContext), dbContext);
                var cardPoolService = new CardPoolService(leaderBoardService, cardRatingCalculator);

                var (players, _) = await leaderBoardService.GetLeaderBoard();
                var pool = cardPoolService.GetPool(players);

                var json = JsonSerializer.Serialize(
                    pool,
                    new JsonSerializerOptions
                    {
                        WriteIndented = true,
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                    });

                TestContext.Out.WriteLine($"{pool.Actives.Count} actives, {pool.Icons.Count} icons");

                // Written straight to the snapshot when asked, rather than printed for copying out:
                // the names carry nicknames in quotes, and console output is not JSON.
                var destination = Environment.GetEnvironmentVariable("POOL_SNAPSHOT_OUT");
                if (string.IsNullOrWhiteSpace(destination))
                {
                    TestContext.Out.WriteLine(json);
                }
                else
                {
                    await File.WriteAllTextAsync(destination, json, new UTF8Encoding(false));
                    TestContext.Out.WriteLine($"written to {destination}");
                }
            }
            finally
            {
                foreach (var suffix in new[] { "", "-wal", "-shm" })
                {
                    if (File.Exists(copy + suffix)) File.Delete(copy + suffix);
                }
            }
        }

        /* ----------------------------------------------------------------- *
         * What the sizing rule actually pays, on games that were really played.
         * ----------------------------------------------------------------- */

        /// <summary>
        /// The pack-size mix, measured over every game in a real database rather than derived from
        /// P(win) = 0.5 and a guess at P(bonus).
        ///
        /// It exists because the mix is an input to the pacing arithmetic in
        /// <c>docs/trading-cards.md</c> - average pack size feeds completion time, which is what
        /// <c>DHigh</c> is tuned against - and that mix was a pair of assumed numbers until the
        /// loser's bonus was widened, at which point guessing at the new one was not good enough.
        ///
        /// It prints the retired rule alongside the live one, so the cost of the change is legible
        /// rather than asserted. The retired rule is spelled out inline here and nowhere else; it is
        /// not coming back.
        ///
        /// Reads a copy of the database, the same way <see cref="PrintThePoolFromADatabase"/> does
        /// and for the same reasons. Point it somewhere with <c>TAFELVOETBAL_DB</c>:
        ///
        ///     dotnet test AnagoLeaderboard\UnitTests\UnitTests.csproj ^
        ///         --filter "FullyQualifiedName~PackOddsTests.PackSizeMix" ^
        ///         -l "console;verbosity=detailed"
        /// </summary>
        [Test]
        [Explicit("Reads a copy of a real database. Run it when the sizing rule changes.")]
        public async Task PackSizeMix()
        {
            var source = Environment.GetEnvironmentVariable("TAFELVOETBAL_DB")
                         ?? @"C:\tafelvoetbal-data\productiondata.db";

            Assert.That(File.Exists(source), $"no database at {source}");

            var copy = Path.Combine(Path.GetTempPath(), $"size-mix-{Guid.NewGuid():N}.db");

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

                // GetGames is the replay, and the replay is what puts OldRating on a row. Sizing a
                // pack off a raw table read gets every expected margin wrong.
                var games = await new GameService(dbContext).GetGames();

                Assert.That(games, Is.Not.Empty, "no games in the database");

                // "Recent" is measured against the newest game in the file rather than today, so a
                // stale copy still reports a full year and the run stays reproducible.
                var newest = games.Max(game => game.CreatedAt);
                var cutoff = newest.AddYears(-1);

                Report("All games", games, newest);
                Report("Last 12 months", games.Where(game => game.CreatedAt >= cutoff).ToList(), newest);
            }
            finally
            {
                foreach (var suffix in new[] { "", "-wal", "-shm" })
                {
                    if (File.Exists(copy + suffix)) File.Delete(copy + suffix);
                }
            }
        }

        /// <summary>
        /// One slice of <see cref="PackSizeMix"/>: every seat of every game sized both ways.
        /// </summary>
        private static void Report(string label, IReadOnlyCollection<Game> games, DateTime newest)
        {
            var live = new Dictionary<int, int> { [1] = 0, [3] = 0, [5] = 0 };
            var retired = new Dictionary<int, int> { [1] = 0, [3] = 0, [5] = 0 };
            var doubled = 0;
            var doubledUnderTheRetiredBar = 0;
            var seats = 0;

            foreach (var game in games)
            {
                var analytics = new GameWithAnalytics(game);

                foreach (var team in new[] { game.FirstTeam, game.SecondTeam })
                {
                    // The first team's goal difference, expected and actual, sign-flipped for the
                    // other seat - exactly as PackService reads it.
                    var flip = team == game.FirstTeam ? 1 : -1;
                    var residual = flip * ((10 - analytics.ActualScore) - (10 - analytics.ExpectedScore));

                    foreach (var player in new[] { team.FirstPlayer, team.SecondPlayer })
                    {
                        var won = game.IsWonBy(player.PlayerId);
                        var pack = PackService.PackForGame(game, player.PlayerId);

                        live[pack.Size]++;

                        // The retired rule: one threshold of three, win or lose.
                        retired[1 + (won ? 2 : 0) + (residual >= 3 ? 2 : 0)]++;

                        // Read off the packet rather than recomputed, so this reports what the
                        // service does and cannot quietly measure a stale copy of the rule.
                        if (pack.DoubledPlayerIds.Any()) doubled++;

                        // What it fired on under the retired single bar of three.
                        if (won || residual >= 3) doubledUnderTheRetiredBar++;

                        seats++;
                    }
                }
            }

            var table = new StringBuilder()
                .AppendLine()
                .AppendLine($"{label}: {games.Count} games, {seats} packs, newest {newest:yyyy-MM-dd}")
                .AppendLine("            live      retired")
                .AppendLine("  ------------------------------");

            foreach (var size in new[] { 1, 3, 5 })
            {
                table.AppendLine(
                    $"  {size} card{(size == 1 ? " " : "s")}  {live[size] / (double)seats,9:P1}  "
                    + $"{retired[size] / (double)seats,9:P1}");
            }

            var liveMean = live.Sum(entry => entry.Key * entry.Value) / (double)seats;
            var retiredMean = retired.Sum(entry => entry.Key * entry.Value) / (double)seats;

            table
                .AppendLine("  ------------------------------")
                .AppendLine($"  mean     {liveMean,9:F2}  {retiredMean,9:F2}")
                .AppendLine($"  change   {liveMean / retiredMean - 1,9:P1}")
                .AppendLine()
                .AppendLine($"  opponent bonus fires on {doubled / (double)seats:P1} of packs")
                .AppendLine($"  ... and did on {doubledUnderTheRetiredBar / (double)seats:P1} under the retired bar");

            TestContext.Out.WriteLine(table.ToString());
        }

        /* ----------------------------------------------------------------- */

        /// <summary>
        /// The snapshot file's shape - <c>GET /api/cards/pool</c>'s payload.
        ///
        /// Its own types rather than <see cref="CardPool"/> because the overalls are recomputed on
        /// load, so deserialising straight into the production record would quietly accept whatever
        /// number the file happened to carry.
        /// </summary>
        private sealed record PoolSnapshot(
            int MinGames,
            IReadOnlyList<SnapshotSubject> Actives,
            IReadOnlyList<SnapshotSubject> Icons);

        private sealed record SnapshotSubject(
            string Id,
            string Name,
            int VisibleRating,
            int NumberOfGames);
    }
}
