using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models.Results;
using Microsoft.EntityFrameworkCore;

namespace AnagoLeaderboard.Services;

/// <summary>
/// What packs a player has waiting, and what comes out of one when they open it.
///
/// **Packs are derived, not granted.** Nothing writes a pack into existence; what is
/// available is computed on read:
///
/// <code>
/// available(player, now) = games in the last 24h the player took part in  minus  PackClaim rows
///                        + today's daily freebie                          minus  a daily claim
///                        + gift rows not yet expired                      minus  a claim for each
/// </code>
///
/// A <see cref="PackGift"/> is the one exception, and it is the exception that shows the rule:
/// nothing happened to entitle anybody to a present, so there is nothing to derive one from and
/// it needs a row. The subtraction is still a claim table and <c>CreateGame</c> still writes
/// nothing.
///
/// That is worth four things, three of which are gaps a granting design had accepted in
/// writing. <c>CreateGame</c> has no hook, so "cards must never break game submission" stops
/// being a rule and becomes a fact. Editing a game's score re-sizes its unclaimed packs and
/// leaves its claimed ones alone, both for free. Deleting a game takes its unclaimed packs with
/// it with no cascade rule at all - they simply stop being derived. And expiry needs no job and
/// no sweep, because the window *is* the query - which is also why moving game packs off
/// same-day and onto twenty-four rolling hours cost two predicates and no schema at all. See
/// <see cref="GamePackLifetime"/>.
///
/// The way to break all of that again is to reintroduce a write into <c>CreateGame</c>. Don't.
/// </summary>
public class PackService
{
    /// <summary>
    /// Pack ids are synthetic, because a derived pack has no row to take an id from.
    ///
    /// Stable across refetches by construction, which the shelf needs: each packet's tilt and
    /// sheen are seeded from its id, so an id that changed between reads would make the pile
    /// visibly reshuffle itself.
    ///
    /// All four participants of a game see the same id. It names the pack, not the claim - the
    /// owner comes from the player in the route - which is why claiming needs a player id in
    /// the path at all.
    /// </summary>
    private const string GamePrefix = "game:";

    private const string DailyPrefix = "daily:";

    private const string GiftPrefix = "gift:";

    /// <summary>
    /// The set-completion packet. One id, for everybody, forever.
    ///
    /// It needs no discriminator after the colon — unlike a game, a day or a gift there is only
    /// ever one of these per player, and the player is in the route. `once` is there so the id
    /// keeps the prefix shape the other three have rather than being the one bare word among them.
    /// </summary>
    private const string IconsPrefix = "icons:";

    private const string IconsPackId = IconsPrefix + "once";

    /// <summary>
    /// How far past the expected margin a player who *won* has to finish to earn the +2 on top of
    /// the win. Also the bar the opponent-ticket doubling uses, for everyone.
    ///
    /// Three rather than one because winning and beating the expectation are very nearly the same
    /// event - Elo pays the over-performer, and in an even game the winner *is* the over-performer
    /// - so a bonus that fired on any positive residual would pay the top packet twice for one
    /// fact. At three, the win measures direction and this measures magnitude, and those are
    /// independent. It is also what separates an upset from a coin-flip that went your way:
    /// expected -3 and you win by one is a five, expected -1 and you win by one is a three.
    ///
    /// Expressed in margins rather than scores so it is symmetric: expected -6 and actual -3
    /// earns it too, which rewards a good loss.
    /// </summary>
    private const int MarginBonusThreshold = 3;

    /// <summary>
    /// The same bar for a player who *lost*: any improvement on the expected margin at all.
    ///
    /// A loss hardly ever cleared three, so the loser's packet was a flat single in nearly every
    /// game - half of all packets, and the dull outcome. The underdog who was written off and lost
    /// 7 - 10 has done the thing this bonus is for, so they collect it. Elo keeps it honest: the
    /// expectation is derived from the ratings on the row, so a player who keeps over-performing
    /// faces a higher bar next time.
    ///
    /// Both margins are integers, so a game that lands exactly on the prediction is not an
    /// improvement on it and pays a single.
    ///
    /// This caps a loss at three. Five requires a win - deliberately, even though a heavy underdog
    /// losing by three fewer than predicted has arguably earned it: a docket reading
    /// "Verloren ... 7 - 10" next to five cards is not a thing to have to explain at the table.
    /// </summary>
    private const int LosingMarginBonusThreshold = 1;

    /// <summary>
    /// The largest packet a present may be.
    ///
    /// A bound rather than a balance decision: the endpoint takes a number from an unauthenticated
    /// caller and the draw is without replacement, so an absurd size would quietly hand over the
    /// entire pool in one packet. Twice the biggest earned pack is more than anything has needed.
    /// </summary>
    private const int MaxGiftSize = 10;

    /// <summary>
    /// How long a game pack stands open, measured from the game itself.
    ///
    /// This replaced hard same-day expiry, and only for game packs. The case same-day got wrong
    /// is the one it admitted to: a game at five o'clock died at midnight, so the pack you earned
    /// on the way out of the office was gone before you were back in it. Twenty-four hours from
    /// the game means an evening game is still there the next morning, which is when it was
    /// always going to be opened.
    ///
    /// **The daily freebie deliberately did not follow.** It stays keyed on the calendar date -
    /// see <see cref="DailyPack"/> - because a rolling window would make it ratchet: claim at
    /// nine and the next is due at nine, claim that one at eleven and the next is due at eleven,
    /// and it walks forward until it falls outside office hours and costs somebody a day for
    /// having been early. A reward for turning up must not punish turning up promptly. Presents
    /// never expired and still do not.
    ///
    /// Measured from <see cref="Game.CreatedAt"/> rather than from the top of the previous day,
    /// so every pack gets the same lifetime and two games in one evening expire an hour apart -
    /// invisible in practice, and the rule is one sentence rather than two.
    /// </summary>
    private static readonly TimeSpan GamePackLifetime = TimeSpan.FromHours(24);

    private readonly DatabaseContext _dbContext;
    private readonly CardRatingCalculator _cardRatingCalculator;

    /// <summary>
    /// **This does not replay the leaderboard, and must not learn how.**
    ///
    /// The roster, the pool and the games all arrive as arguments, from a caller that has
    /// already paid for the one replay a request is allowed. Injecting
    /// <see cref="LeaderBoardService"/> here would be a convenient-looking change that
    /// silently doubles the cost of opening a pack - which is exactly what it used to do.
    /// </summary>
    public PackService(DatabaseContext dbContext, CardRatingCalculator cardRatingCalculator)
    {
        _dbContext = dbContext;
        _cardRatingCalculator = cardRatingCalculator;
    }

    /// <summary>
    /// Everything this player could open right now.
    /// </summary>
    /// <param name="allGames">
    /// The games as the leaderboard replay handed them back, <em>not</em> a fresh query.
    /// <see cref="PlayerPerformance.OldRating"/> is assigned during that replay rather than read
    /// off the row, so a game fetched straight out of the table reports every old rating as 0
    /// and sizes every pack wrongly.
    /// </param>
    /// <param name="pool">
    /// The card pool, for the set-completion packet alone — without it that packet is simply not
    /// offered. Optional so a caller that only wants today's earned packs need not replay the
    /// leaderboard to get one.
    /// </param>
    /// <param name="counts">This player's holdings, for the same reason.</param>
    public async Task<IReadOnlyList<AvailablePack>> GetAvailable(
        string playerId,
        IReadOnlyList<Game> allGames,
        CardPool? pool = null,
        IReadOnlyDictionary<string, MintTally>? counts = null)
    {
        var now = DateTime.Now;
        var (claims, gifts) = await ReadDerivationInputs(playerId, now);

        return Derive(playerId, allGames, claims, now, gifts, pool, counts);
    }

    /// <summary>
    /// The two tables the derivation subtracts and adds, for one player.
    ///
    /// Shared by <see cref="GetAvailable"/> and <see cref="Claim"/> so the two cannot come to
    /// different answers about what is on the shelf - the claim re-derives rather than trusting
    /// the id it was handed, and that is the whole of the authorisation.
    /// </summary>
    private async Task<(List<PackClaim> Claims, List<PackGift> Gifts)> ReadDerivationInputs(
        string playerId,
        DateTime now)
    {
        // The claims the window can still reach, plus every gift claim this player has ever made,
        // plus their set-completion claim if they have one. A present stands open for days and the
        // icoon packet stands open forever, so a claim of either kind from months ago is still the
        // thing that stops it coming back - narrowing those to the window would hand the same
        // packet over every morning.
        //
        // **This filter has to be at least as wide as the pack window, or an opened pack comes
        // back.** A pack is offered when no claim for it is in this list, so a claim the read
        // misses reads as "never opened". It is provably wide enough: a claim cannot predate the
        // thing it claims, so any claim for a game inside the window was made on or after that
        // game's date, which is on or after the window's first date. Generous by up to a day,
        // which costs a handful of rows and keeps the predicate on the stored date rather than on
        // an expression the index cannot use.
        var earliestRelevantDate = (now - GamePackLifetime).Date;

        var claims = await _dbContext.PackClaims
            .Where(claim => claim.PlayerId == playerId)
            .Where(claim =>
                claim.ClaimDate >= earliestRelevantDate
                || claim.Source == PackSource.Gift
                || claim.Source == PackSource.Icons)
            .ToListAsync();

        // Every present is addressed, so this is the one way one can reach this player - "everybody"
        // is expanded into named rows when the gift is given, not matched here. Still only a read
        // optimisation rather than the rule: whether a present is available is decided in `Derive`,
        // alongside the day window, so there is one place where that question is answered.
        var gifts = await _dbContext.PackGifts
            .Where(gift => gift.PlayerId == playerId)
            .ToListAsync();

        return (claims, gifts);
    }

    /// <summary>
    /// The derivation itself, with everything it reads passed in. Pure, and so the piece the
    /// tests drive.
    /// </summary>
    /// <param name="now">
    /// The moment being asked about, and both halves of it are used: the date decides which
    /// daily freebie is on offer, and the time is what the game window and a gift's
    /// <c>ExpiresAt</c> are measured against. Passing a bare date therefore still works and
    /// reads as midnight, which is the start of that day's freebie and the end of the game
    /// window reaching back into the day before.
    /// </param>
    /// <param name="claims">
    /// This player's claims. Game, gift and icoon claims must arrive <em>complete</em> - the
    /// derivation subtracts them all regardless of date, because an opened pack must never be
    /// offered again and the day it was opened on says nothing about that. Only the daily
    /// freebie reads <see cref="PackClaim.ClaimDate"/>, so only daily claims may be narrowed,
    /// and only to today.
    /// </param>
    /// <param name="gifts">
    /// Candidate presents - the one thing here that is a row rather than a computation. Whether
    /// each is addressed to this player, still standing and unclaimed is decided below, for the
    /// same reason the day window is: those are the whole of "what is available", so they belong
    /// with the derivation rather than with whoever happened to run the query.
    /// </param>
    /// <param name="pool">
    /// The pool, and <paramref name="counts"/> this player's holdings — together the whole of
    /// whether the set-completion packet is on the shelf. Both optional: a caller with neither is
    /// asking about today's earned packs, and gets exactly those.
    ///
    /// **This packet is derived, not granted, and that is the point.** Writing a gift row when the
    /// last active card landed would have been easy and is the `CreateGame` mistake again — a grant
    /// bolted onto whichever transaction happened to be passing, with a second thing to keep in
    /// step. Nothing entitles anyone to this except the state of their collection, that state is
    /// readable, so it is read.
    /// </param>
    public static IReadOnlyList<AvailablePack> Derive(
        string playerId,
        IReadOnlyList<Game> allGames,
        IReadOnlyList<PackClaim> claims,
        DateTime now,
        IReadOnlyList<PackGift>? gifts = null,
        CardPool? pool = null,
        IReadOnlyDictionary<string, MintTally>? counts = null)
    {
        var today = now.Date;
        var windowStart = now - GamePackLifetime;

        // **Every game claim counts, whatever day it was made on.** No date narrowing here on
        // purpose: a claim is the record that a pack was opened, and an opened pack must never
        // come back, so nothing about *when* it was opened may be allowed to hide it. Narrowing
        // this to the day was safe only while a pack could not outlive the day it was earned on;
        // under a rolling window it would re-offer this morning a pack that was opened last
        // night, and the shelf would carry a packet whose claim then 409s on the unique index.
        var claimedGameIds = claims
            .Where(claim => claim.Source == PackSource.Game)
            .Select(claim => claim.GameId)
            .ToHashSet();

        var claimedGiftIds = claims
            .Where(claim => claim.Source == PackSource.Gift)
            .Select(claim => claim.GiftId)
            .ToHashSet();

        var packs = new List<AvailablePack>();

        // First of all, above even a present. It turns up once in a collection's life and it is
        // the rarest thing that will ever lie on this shelf, so it is not going under the
        // afternoon's packets.
        //
        // Offered while the set is complete and this claim does not exist — deliberately *not*
        // gated on the icons latch. The packet is what unlocks them, so gating it on the unlock
        // would make it vanish from the shelf at the moment it was being opened.
        if (pool is not null
            && counts is not null
            && CardPoolService.ActiveSetComplete(pool, counts)
            && !claims.Any(claim => claim.Source == PackSource.Icons))
        {
            packs.Add(IconsPack());
        }

        // Then presents: the only other packs nobody played for, so above the ones they did.
        packs.AddRange((gifts ?? Array.Empty<PackGift>())
            .Where(gift => gift.PlayerId == playerId)
            // Presents do not expire any more, so this passes for everything written today. Kept
            // because the column is still nullable and still honoured: a kind of gift that wants a
            // deadline can have one without this having to be remembered.
            .Where(gift => gift.ExpiresAt is null || gift.ExpiresAt > now)
            .Where(gift => !claimedGiftIds.Contains(gift.Id))
            .OrderByDescending(gift => gift.CreatedAt)
            .Select(GiftPack));

        // Strictly newer than the window's edge, so "less than twenty-four hours old" is the whole
        // of it and a game exactly a day old is out rather than balanced on the boundary.
        packs.AddRange(allGames
            .Where(game => game.CreatedAt > windowStart)
            .Where(game => game.GetPlayerIds().Contains(playerId))
            .Where(game => !claimedGameIds.Contains(game.Id))
            .OrderByDescending(game => game.CreatedAt)
            .Select(game => PackForGame(game, playerId)));

        // Last, under the game packs. It is the smallest and the one that is always there, so
        // it is the bottom of the pile rather than the top of it.
        //
        // Keyed on the calendar date, and the one source still keyed on a date at all. See
        // `GamePackLifetime` for why this did not follow the game packs onto a rolling window.
        if (!claims.Any(claim => claim.Source == PackSource.Daily && claim.ClaimDate == today))
        {
            packs.Add(DailyPack(today));
        }

        return packs;
    }

    /// <summary>
    /// One player's pack for one game: 1 for playing, +2 for winning, and +2 for beating the
    /// expected margin - by three or more if you won, by anything at all if you lost. So 1, 3 or
    /// 5, and a loss caps at 3.
    ///
    /// A pure function of the game row. <see cref="GameWithAnalytics"/> computes both margins
    /// from the four old ratings frozen on the row, so this needs no leaderboard replay of its
    /// own and cannot drift as ratings move.
    /// </summary>
    public static AvailablePack PackForGame(Game game, string playerId)
    {
        var analytics = new GameWithAnalytics(game);

        // Both are the first team's goal difference: expected, and what actually happened.
        var expectedMargin = 10 - analytics.ExpectedScore;
        var actualMargin = 10 - analytics.ActualScore;

        // Everything above is written from the first team's seat, so sign-flip for the second.
        if (game.SecondTeam.HasPlayer(playerId))
        {
            expectedMargin = -expectedMargin;
            actualMargin = -actualMargin;
        }

        var won = game.IsWonBy(playerId);
        var residual = actualMargin - expectedMargin;

        // The second +2 is gated harder for a winner than for a loser, because for a winner it is
        // very nearly the same claim as the first one. A loser needs only to have done better than
        // the ratings said; a winner needs to have done so emphatically. See the two thresholds.
        var beatExpectation =
            residual >= (won ? MarginBonusThreshold : LosingMarginBonusThreshold);

        var team = game.GetTeam(playerId);
        var opponents = game.GetOtherTeam(playerId);
        var partner = team.FirstPlayer.PlayerId == playerId ? team.SecondPlayer : team.FirstPlayer;

        // Winning *or* beating the expected margin doubles both opponents' tickets. Flat 2x
        // even when both are true - a dominant win already pays five cards, and compounding to
        // 4x would let blowouts dominate collections. This is flavour, not an economy lever:
        // doubling 2 of 38 players shifts about 6% of the ticket mass.
        //
        // It keeps the winner's bar at both ends rather than following `beatExpectation` down to
        // the loser's, which is a choice not to disturb something the rule change did not have to
        // disturb: `PackOddsTests.PackSizeMix` measures it at 53.1% of packs, against 59.1% on the
        // loser's bar. Neither number is a lever - this is flavour - so it stays where it was.
        var doubled = won || residual >= MarginBonusThreshold
            ? new List<string> { opponents.FirstPlayer.PlayerId, opponents.SecondPlayer.PlayerId }
            : new List<string>();

        /*
         * The whole of what the packet's docket says, in one sentence: who you played it with,
         * who you played it against, and how it went. Written here rather than assembled in the
         * browser because this is the only place that has all three - the names live on the
         * replayed game row, and a `Pack` carries no player ids a client could look up.
         *
         * It says nothing about the *size*, and that is deliberate: the wrapper already prints
         * the number, and the four-way split that used to be in this switch ("tegen de
         * verwachting in") was an explanation of how the number was arrived at. A docket says
         * which game the packet came out of; the odds are not its business.
         */
        var reason = $"{(won ? "Gewonnen" : "Verloren")} met {FirstName(partner)} "
            + $"van {FirstName(opponents.FirstPlayer)} en {FirstName(opponents.SecondPlayer)} "
            + $"met {team.Goals} - {opponents.Goals}";

        return new AvailablePack(
            GamePrefix + game.Id,
            1 + (won ? 2 : 0) + (beatExpectation ? 2 : 0),
            reason,
            doubled);
    }

    /// <summary>
    /// A first name, the way the scoreboard prints one - the first word of the stored name, so
    /// a nickname in the middle of it is dropped along with the surname.
    ///
    /// Not <see cref="PlayerPerformance.ToString"/>, which is the same rule but throws on a
    /// player whose name was never filled in. That happens on any game row not read through
    /// <c>GameService.GetGames</c>, and a missing name must cost a packet its docket, not the
    /// whole collection response. The id is the fallback because it is at least identifying;
    /// there is nothing better to say about a player the roster does not know.
    /// </summary>
    private static string FirstName(PlayerPerformance player)
    {
        if (string.IsNullOrWhiteSpace(player.Name))
        {
            return player.PlayerId;
        }

        var cut = player.Name.IndexOfAny(new[] { ' ', '\t', '\n', '\r' });
        return cut == -1 ? player.Name : player.Name[..cut];
    }

    /// <summary>One free single a day, for turning up.</summary>
    public static AvailablePack DailyPack(DateTime day) =>
        new(
            DailyPrefix + day.ToString("yyyy-MM-dd"),
            1,
            "Dagelijks gratis pakje",
            Array.Empty<string>());

    /// <summary>
    /// The packet that comes with finishing the active set: one card, guaranteed to be an icoon.
    ///
    /// A single card rather than a handful, for the same reason a guaranteed gift is one: a
    /// guarantee is a statement about *the* card in the packet, and two guaranteed icoons is a
    /// different product nobody has asked for.
    ///
    /// No opponents to double — nobody was beaten for it — and no <c>MinimumOverall</c>, because
    /// an icoon is not a rating band. They spread right across the tiers (4 goud zeldzaam, 7 goud,
    /// 7 zilver, 2 brons at the last count), so a floor would exclude most of the people this
    /// packet exists to hand you.
    /// </summary>
    public static AvailablePack IconsPack() =>
        new(
            IconsPackId,
            1,
            "De set is compleet",
            Array.Empty<string>(),
            GuaranteesIcon: true);

    /// <summary>
    /// A present, as a packet. The one pack that is read off a row rather than worked out.
    ///
    /// No opponents to double: nobody was beaten to earn it.
    /// </summary>
    public static AvailablePack GiftPack(PackGift gift) =>
        new(
            GiftPrefix + gift.Id,
            gift.Size,
            gift.Reason,
            Array.Empty<string>(),
            gift.MinimumOverall);

    /// <summary>
    /// Opens a pack: files the cards and reports what was in it.
    ///
    /// Rolled here rather than when the pack was earned. A pack belongs to a player, so this
    /// credits that player whoever clicked it - the cards cannot be stolen either way - which
    /// means rolling late costs nothing in safety and avoids minting rows for packs that expire
    /// unopened. Within a day-long window ratings cannot drift meaningfully in between.
    ///
    /// Answers only about the pack. Whether the player exists, has an album and is over the
    /// games gate is settled by <see cref="CollectionService.ClaimPack"/> before this is
    /// called - it has to be, because producing <paramref name="collection"/> and
    /// <paramref name="pool"/> is what answers all three.
    /// </summary>
    /// <param name="allGames">
    /// The games as the leaderboard replay handed them back. See <see cref="GetAvailable"/>
    /// for what goes wrong with a fresh query.
    /// </param>
    public async Task<PackClaimResult> Claim(
        string playerId,
        string packId,
        PlayerCollection collection,
        CardPool pool,
        IReadOnlyList<Game> allGames)
    {
        var now = DateTime.Now;
        var today = now.Date;
        var (claims, gifts) = await ReadDerivationInputs(playerId, now);

        /*
         * Read before the derivation rather than after, because the set-completion packet's whole
         * availability is a question about these counts — deriving without them would leave that
         * packet off the list and answer NotAvailable for the one pack the page had just been told
         * to open.
         */
        var counts = await CountsBySubject(playerId);

        // Deriving again rather than trusting the id is the whole of the authorisation: an id
        // that is not on this list is somebody else's game, somebody else's present, yesterday's
        // pack, an expired one, one already opened, or invented.
        var pack = Derive(playerId, allGames, claims, now, gifts, pool, counts)
            .SingleOrDefault(available => available.Id == packId);

        if (pack is null)
        {
            return new PackClaimResult(ClaimOutcome.NotAvailable, null);
        }

        var gameId = pack.Id.StartsWith(GamePrefix, StringComparison.Ordinal)
            ? pack.Id[GamePrefix.Length..]
            : null;

        var giftId = pack.Id.StartsWith(GiftPrefix, StringComparison.Ordinal)
            ? pack.Id[GiftPrefix.Length..]
            : null;

        var isIconsPack = pack.Id == IconsPackId;

        await using var transaction = await _dbContext.Database.BeginTransactionAsync();

        var claim = (gameId, giftId, isIconsPack) switch
        {
            (not null, _, _) => PackClaim.ForGame(playerId, gameId, today),
            (_, not null, _) => PackClaim.ForGift(playerId, giftId, today),
            (_, _, true) => PackClaim.ForIcons(playerId, today),
            _ => PackClaim.ForDaily(playerId, today)
        };

        _dbContext.PackClaims.Add(claim);

        try
        {
            // Alone, and before anything is rolled. The unique indexes on PackClaim are the
            // double-claim guard, so this insert failing *is* the 409 - two tabs racing means
            // one of them lands here.
            await _dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            _dbContext.Entry(claim).State = EntityState.Detached;
            await transaction.RollbackAsync();
            return new PackClaimResult(ClaimOutcome.AlreadyClaimed, null);
        }

        var iconsUnlocked = collection.IconsUnlockedAt is not null;

        var revealed = new List<RevealedCard>();

        foreach (var subject in Roll(
                     _cardRatingCalculator,
                     pool,
                     pack.Size,
                     pack.DoubledPlayerIds,
                     iconsUnlocked,
                     pack.MinimumOverall,
                     iconsOnly: pack.GuaranteesIcon))
        {
            // Read before incrementing. This is the only point at which "did this fill an empty
            // slot" can still be answered.
            //
            // Per kind, off the subject's live flag, and that is what makes the icoon of somebody
            // you already collected as a player land as NEW rather than as a duplicate: their
            // icoon slot was empty however deep the pile of player cards behind it. Filling an
            // empty slot is the whole of what `isNew` says. See MintTally.
            var tally = counts.GetValueOrDefault(subject.Id) ?? MintTally.None;
            var before = tally.OfKind(subject.IsIcon);
            counts[subject.Id] = tally.Plus(subject.IsIcon);

            _dbContext.CardInstances.Add(
                CardInstance.Mint(playerId, subject.Id, claim.Id, gameId, subject.IsIcon));

            revealed.Add(new RevealedCard(subject, before == 0, before + 1));
        }

        // Filing the last active card does NOT latch the icons here, and nothing in this method
        // may start to. Completing the set makes the unlock claimable; the collector claims it
        // themselves at PUT api/collections/{playerId}/icons, and the book closing and being
        // re-bound is the payoff.
        //
        // A latch here would fire the instant the card was filed, so the seal would never be on
        // the table to press - the unlock would land silently, mid-pack-reveal, with the player
        // watching a card come out of a packet rather than their album. It is the same shape of
        // mistake as granting packs inside CreateGame: a write bolted onto the nearest passing
        // transaction, taking a moment away from the place that was built to give it.

        await _dbContext.SaveChangesAsync();
        await transaction.CommitAsync();

        return new PackClaimResult(ClaimOutcome.Claimed, revealed);
    }

    /// <summary>
    /// Hands somebody a pack they did not earn - or hands one to everybody.
    ///
    /// **The only write in this design that brings a pack into existence**, and the reason it is
    /// allowed to is that a present is the one pack nothing can be derived from. Note what it
    /// still is not: it writes a <see cref="PackGift"/> and stops. It does not roll, does not mint
    /// a card and does not touch a collection - the packet goes on the shelf and the ordinary
    /// claim opens it, so a gift and an earned pack are the same object from the tear onwards.
    ///
    /// Size and floor are exclusive, which is the whole shape of the feature: a packet is either
    /// <em>n</em> ordinary cards or one card at a floor. Sizing a guaranteed packet is a
    /// combination nothing has asked for, and offering it would mean deciding whether the floor
    /// applies to all five cards or one of them.
    /// </summary>
    /// <param name="playerIds">
    /// Who gets one. Null or empty means everybody - and **"everybody" is expanded here, into one
    /// row per player on the roster right now.**
    ///
    /// It used to be a single row with no recipient, which meant "whoever is on the roster when it
    /// is claimed". That was tolerable while presents ran out after a week; now that they do not
    /// expire it would go on being a present for people who join next year. Resolving the list at
    /// gift time fixes that at the root rather than with a deadline: a present is addressed to the
    /// people who were here when it was given, and every row has a recipient.
    ///
    /// The convenience is kept where it belongs - in the call, not in the data. A caller still says
    /// "everybody" instead of pasting forty ids.
    /// </param>
    public async Task<GiftResult> GiveGift(
        IReadOnlyList<string>? playerIds,
        int? size,
        int? minimumOverall,
        string? reason)
    {
        if ((size is null) == (minimumOverall is null))
        {
            return new GiftResult(GiftOutcome.NotOneChoice, Array.Empty<string>(), false);
        }

        if (size is not null && (size < 1 || size > MaxGiftSize))
        {
            return new GiftResult(GiftOutcome.SizeOutOfRange, Array.Empty<string>(), false);
        }

        if (minimumOverall is not null
            && (minimumOverall < _cardRatingCalculator.OverallFloor
                || minimumOverall > _cardRatingCalculator.OverallCap))
        {
            return new GiftResult(GiftOutcome.FloorOutOfRange, Array.Empty<string>(), false);
        }

        // Distinct, so naming somebody twice hands them one packet rather than two - a list is a
        // list of recipients, not of presents.
        var recipients = (playerIds ?? Array.Empty<string>())
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct()
            .ToList();

        var everybody = recipients.Count == 0;

        if (everybody)
        {
            /*
             * "Everybody" is resolved to the roster as it stands, so what lands in the table is a
             * list of named recipients like any other gift. The word is a convenience for the
             * caller - nobody wants to paste forty ids - and it stops being one the moment the
             * request is read.
             *
             * Everybody means *everybody*, not everybody who can currently be given a card: the
             * games gate is a rule about drawing, and somebody who crosses it next week should
             * find the present that was given to the office still waiting. What has been fixed is
             * only who "the office" was on the day.
             */
            recipients = await _dbContext.Players
                .Select(player => player.Id)
                .ToListAsync();

            if (recipients.Count == 0)
            {
                return new GiftResult(GiftOutcome.UnknownPlayer, Array.Empty<string>(), false);
            }
        }
        else
        {
            // Checked rather than trusted. A typo'd id would otherwise write a present addressed to
            // nobody, which nothing would ever surface: it cannot be claimed and it does not appear
            // on anyone's shelf, so it would simply be a row that did nothing.
            var known = await _dbContext.Players
                .Where(player => recipients.Contains(player.Id))
                .Select(player => player.Id)
                .ToListAsync();

            if (known.Count != recipients.Count)
            {
                return new GiftResult(GiftOutcome.UnknownPlayer, Array.Empty<string>(), false);
            }
        }

        var gifts = recipients
            .Select(id => PackGift.Create(id, size ?? 1, minimumOverall, GiftReason(reason)))
            .ToList();

        _dbContext.PackGifts.AddRange(gifts);
        await _dbContext.SaveChangesAsync();

        return new GiftResult(
            GiftOutcome.Given,
            gifts.Select(gift => gift.Id).ToList(),
            everybody);
    }

    /// <summary>
    /// What the docket says when the giver did not say. Dutch, like every other reason, and a
    /// sentence rather than a label because it is printed as one - see <see cref="PackForGame"/>.
    /// </summary>
    private static string GiftReason(string? reason) =>
        string.IsNullOrWhiteSpace(reason) ? "Cadeaupakje" : reason.Trim();

    /// <summary>
    /// How many of each subject this player holds, split by the kind of card each copy was drawn
    /// as. <see cref="MintTally"/> carries why it is a split rather than one figure.
    ///
    /// Together with the statistics tally this is the only place
    /// <see cref="CardInstance.IsIcon"/> is read, and both read it for what it is: the record of
    /// what came out of the packet. Neither decides what a card looks like.
    /// </summary>
    public async Task<Dictionary<string, MintTally>> CountsBySubject(string playerId) =>
        await _dbContext.CardInstances
            .Where(card => card.PlayerId == playerId)
            .GroupBy(card => card.SubjectPlayerId)
            .Select(group => new
            {
                SubjectPlayerId = group.Key,
                AsPlayer = group.Count(card => !card.IsIcon),
                AsIcon = group.Count(card => card.IsIcon)
            })
            .ToDictionaryAsync(
                row => row.SubjectPlayerId,
                row => new MintTally(row.AsPlayer, row.AsIcon));

    /// <summary>
    /// The draw: a weighted raffle without replacement.
    ///
    /// Every card in every pack comes off these odds - packs are never tier-guaranteed, and the
    /// only choice a pack makes is its size. Tier-slot odds in the FIFA style would invert here
    /// anyway, because the tier populations are a diamond rather than a pyramid: a 30% bronze
    /// slot split over four players makes each of them commoner than any gold.
    ///
    /// Each player holds <c>2^-E</c> tickets from <see cref="CardRatingCalculator.TicketsFor"/>,
    /// and nobody appears twice in one pack - successive sampling, redrawing proportional to
    /// the tickets that are left, which is <em>not</em> the same as drawing k independently and
    /// dropping the duplicates.
    /// </summary>
    /// <param name="minimumOverall">
    /// A floor on every card drawn, from a <see cref="PackGift"/>. Null for every earned pack -
    /// those are never tier-guaranteed, and the only choice a game makes is the size.
    ///
    /// It narrows the candidates and changes nothing else, so the weighting still applies
    /// <em>inside</em> them: a 75+ packet hands out far more 75s than 90s, which is the point. If
    /// nobody clears the floor it is ignored rather than refused - a pool that cannot honour a
    /// guarantee is not a reason to hand somebody an empty packet, and on a small roster (or a
    /// test one) that is the ordinary case rather than a corner.
    /// </param>
    /// <param name="iconsOnly">
    /// Draw from the icons instead of from the whole pool — the set-completion packet, and nothing
    /// else, sets this.
    ///
    /// A separate axis from <paramref name="minimumOverall"/> rather than a very high floor,
    /// because an icoon is not a rating band: they run right across the tiers, so any floor that
    /// caught all of them would catch most of the actives too.
    ///
    /// It respects <paramref name="iconsUnlocked"/> rather than overriding it, and the ordering
    /// that makes that safe is the page's: the unlock is written *before* this packet is claimed,
    /// so by the time this runs the latch is set. If it somehow is not, this falls through to an
    /// ordinary draw rather than handing out a card the collection cannot show — the same
    /// forgiveness `minimumOverall` gets, and for the same reason.
    /// </param>
    public static IReadOnlyList<CardSubject> Roll(
        CardRatingCalculator cardRatingCalculator,
        CardPool pool,
        int size,
        IReadOnlyList<string> doubledPlayerIds,
        bool iconsUnlocked,
        int? minimumOverall = null,
        Random? random = null,
        bool iconsOnly = false)
    {
        random ??= Random.Shared;

        // Icons join the same pool with no special rarity; their all-time-high overalls are
        // high, so the curve makes them rare on its own.
        var everyone = pool.Actives
            .Concat(iconsUnlocked ? pool.Icons : Array.Empty<CardSubject>())
            .ToList();

        /*
         * Narrowed to the icons, or not narrowed at all if that would leave nothing to draw.
         *
         * The fall-through matters more here than it looks: a roster with nobody out of service
         * has no icons, and that is the state a fresh install and every test fixture start in. An
         * empty packet would be worse than a packet that quietly kept its promise loosely.
         */
        var iconsAvailable = iconsOnly && iconsUnlocked && pool.Icons.Count > 0;
        var eligible = iconsAvailable ? pool.Icons.ToList() : everyone;

        var qualifying = minimumOverall is null
            ? eligible
            : eligible.Where(subject => subject.Overall >= minimumOverall).ToList();

        var candidates = (qualifying.Count > 0 ? qualifying : eligible)
            .Select(subject => new
            {
                Subject = subject,
                Tickets = cardRatingCalculator.TicketsFor(subject.Overall)
                          * (doubledPlayerIds.Contains(subject.Id) ? 2 : 1)
            })
            .ToList();

        var drawn = new List<CardSubject>();

        // Guarded rather than assumed: 38 candidates against a pack of 5 makes this theoretical,
        // but a pool smaller than the pack size would otherwise loop forever.
        while (drawn.Count < size && candidates.Count > 0)
        {
            var total = candidates.Sum(candidate => candidate.Tickets);
            var roll = random.NextDouble() * total;

            var index = 0;
            for (; index < candidates.Count - 1; index++)
            {
                roll -= candidates[index].Tickets;
                if (roll <= 0) break;
            }

            drawn.Add(candidates[index].Subject);
            candidates.RemoveAt(index);
        }

        return drawn;
    }
}

/// <summary>
/// Everything opening a pack can come to.
///
/// Shared between <see cref="PackService"/> and <see cref="CollectionService"/>, which raise
/// different halves of it: the first three are settled before the pack is even looked at, by
/// the reads that produce the collection and the pool.
/// </summary>
public enum ClaimOutcome
{
    Claimed,
    PlayerNotFound,
    NoAlbum,
    NotEligible,

    /// <summary>Unknown id, someone else's game, yesterday's pack, or one already opened.</summary>
    NotAvailable,

    /// <summary>Two tabs raced and this one lost the unique index.</summary>
    AlreadyClaimed
}

/// <summary>What came out of the packet, and nothing about the collection around it.</summary>
public sealed record PackClaimResult(ClaimOutcome Outcome, IReadOnlyList<RevealedCard>? Cards);

/// <summary>Everything handing out a present can come to.</summary>
public enum GiftOutcome
{
    Given,

    /// <summary>Neither a size nor a floor was given, or both were.</summary>
    NotOneChoice,

    SizeOutOfRange,

    /// <summary>The floor is off the rating scale entirely.</summary>
    FloorOutOfRange,

    /// <summary>At least one named recipient does not exist.</summary>
    UnknownPlayer
}

/// <summary>
/// The presents that were written.
/// </summary>
/// <param name="GiftIds">
/// One per recipient, or a single id when it went to everybody. Returned rather than swallowed
/// because it is the only handle on a present afterwards - deleting the row is how a mistaken
/// gift is withdrawn, and that takes any cards already claimed from it with it.
/// </param>
/// <param name="Everybody">
/// Whether this went to the whole office. Worth saying explicitly: <c>GiftIds</c> has one entry
/// either way when a single player was named, so the count cannot be read as the recipient count.
/// </param>
public sealed record GiftResult(
    GiftOutcome Outcome,
    IReadOnlyList<string> GiftIds,
    bool Everybody);
