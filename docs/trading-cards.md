# Trading cards for teletext-elo

## Where this stands (last updated 2026-08-11)

**Phase 1 (frontend on mock data) is essentially complete.** Everything below the
"Presentation layer" heading has been built and iterated on at length.

**A collection is now a persisted thing, and the page has a beginning.** The second
backend slice is in: `PlayerCollection` (the first card table, and the first
migration), `CollectionService`, `CollectionsController` with
`GET api/collections/{playerId}` and `POST api/collections/{playerId}/create`, and
the frontend swapped onto `httpCardsClient`. With it came the **opening sequence** —
a signing-in ledger where the searchbar was, and five shut albums in five leather
stains that you pick one of before the shelf and the empty book appear. See "Getting
in: the ledger and the five books".

**Packs and cards are persisted, and the last big slice is done.** `PackClaim` and
`CardInstance` exist, `PackService` derives / sizes / rolls / claims, and
`POST api/collections/{playerId}/packs/{packId}/claim` is the endpoint. Playing a
game today puts real packets on the shelf, everybody gets one free single a day, and
**cards survive a reload**. The derivation is the one written up under "Packs are
derived, not granted" — nothing was invented at implementation time — and the two
unique indexes on `PackClaim` are the double-claim guard, exactly as specified.

Four things worth knowing about how it landed:

- **`Derive` narrows to the day itself** rather than trusting its caller to have
  queried only today's claims. The window is the whole of the expiry rule, so it
  belongs with the rule. A test caught this.
- **`GameWithAnalytics` must be fed replayed games.** `PlayerPerformance.OldRating`
  is assigned inside `GetUpdates` during the leaderboard replay, *not* read off the
  row — so a game fetched straight from the table reports every old rating as 0 and
  sizes every pack wrongly. `CollectionService.Build` hands `PackService` the games
  the replay already returned; it used to discard them.
- **The dev-only `DELETE` now takes the cards and the claims with it.** Neither
  cascades from the album row — both hang off the player — so "back to the start of
  the story" had to say so explicitly.
- **`PUT api/collections/{playerId}/legends`**, development only, exists because the
  latch is real now and earning it is a three-month proposition. Without it there is
  no way to look at an icoon in a book at all.

**With it, the phase-1 mock is gone.** `mockCardsClient`, `packSandbox`,
`MOCK_PACKS`, `ACTIVE_POOL_SNAPSHOT`, `FALLBACK_LEGENDS`, the seeded starting
collection, `drawPack`, `ticketsFor` and `overallFor` are all deleted;
`mock/cardMock.ts` survives as the types, the tier cutoffs, the ceremony arithmetic
and the name and URL helpers, which is everything in it that was ever presentation.
`CardPlayer.overall` is now required, and signing in takes a `SelectablePlayer` —
the ledger lists players under the games gate, who have no overall for the same
reason they have no card. **`npm start` with no API behind it no longer renders a
collection**, which is the honest state of a feature whose pool, odds, draw and cards
all live on the server.

**The test panel stays**, against what this document used to say, and its pack
buttons stay with it — as stubs. A pack cannot be invented in the browser any more,
so `grant` logs and does nothing; the buttons and their per-level copy are kept
because **granting a named player (or everybody) a specific pack is the next
feature**, and they are its first caller. `GrantOptions` in `cardsClient.ts` is the
contract it has to honour, and `PackService.Roll` is where the guarantees have to
land. The panel itself wants a debug flag rather than `SHOW_DEBUG = true`.

Gone with the mock: the `kansen (console)` button, which drew a few thousand packs in
the browser to check the observed frequencies. That check is now
`InclusionProbabilitiesSumToThePackSize` in `UnitTests/PackTests.cs`, where it runs on
every build rather than when somebody remembers to press a button.

**The first backend slice was `GET /api/cards/pool`.** Read-only — no migration, no
tables, nothing persisted — and it existed because a legend is rated on their
all-time-high `visibleRating`, which is computable only inside the leaderboard's full
game replay. So the icoon pages show **20 real people** instead of six placeholders,
spread 4/7/7/2 across the tiers. Built with it: `CardRatingCalculator` (the scale and
the ticket weighting, in C#, configured from `appsettings.json`),
`PeakVisibleRating` on `DynamicRatingPlayer`, and `CardPoolService`.

The mock's frozen **active** roster, `ACTIVE_POOL_SNAPSHOT`, is gone with the rest of
the mock. It is worth knowing it existed, because **the odds table below, and every
completion estimate here, were computed against it** — 38 players at their ratings on
2026-08-05 — so those numbers describe that roster rather than whatever the
leaderboard says today.

`## Architecture` and `## Backend changes` are now **built**, with the exception of
the gift table. The one substantial change since they were first written: **packs are
derived from today's games minus a claim table, rather than granted by a hook
inside `CreateGame`.** Read that section before touching any of it — the derivation
closes three gaps the granting design accepted in writing, and reintroducing a
write into `CreateGame` is how they come back.

Done and signed off: the mock data module, the `cardsClient` seam, the Panini card
face, the album's stiff 3D flip, the pack opener's five beats, the FLIP travel,
the new-card marking, the four-level ceremony, and the D-minor payoff ladder.

Newest, and **on trial rather than signed off**: the **silhouette beat**. A new
card flips into its tier metal, its overall and the green rim with the portrait
still withheld as the player's own outline; then a green shimmer crosses the card
and writes their name on a character at a time in its wake, one tick of sound
each, with the portrait dissolving in so the face and the last letter land
together. So a pull reads as *how good → it's new → who*. Duplicates are
unchanged. The green rim moved from after the reveal to the turn itself.

The first pass at this had no write — a flat pause, then a dissolve — and read as
a glitch rather than a build, which is the note worth keeping: held time on its
own is latency, and the eye reads latency as a fault. Two consequences to judge:
the post-flip window is now **name-dependent** (1160ms for "Bo", 1640ms for "Daan
van der Beek", both base), and `playNameTick` / `playNameSettle` are the first
sounds added since the payoff ladder. Judge it on a **sub-75 new card** first —
that is the majority case and the one with no ceremony under it.

Before that: the **games gate dropped from 10 to 5**, for the card pool, the access
gate and the legends pool alike. Four players join (Yannick, Sevda, Dmitry,
Sandra), the set is 38 cards, and everyone's per-pack rate falls ~15%. `DHigh`
stays at 2.5 — the slower completion is accepted, not compensated. See
"Why ≥5 games".

Most recently: the **icoon card was rebuilt** (2026-08-10). It keeps its premise —
legends wear a colourway rather than a black `legende` pill — and changes almost
everything else: **one ground for every legend instead of one per tier**, the shard
fan removed, the grade warmed, a 1px gold rule added, the sheen cut and the ink
lifted. Rarity is still untouched. See "The icoon card", and
[icoon-uniform.html](icoon-uniform.html) for the comparison it was decided on.

Before that: the **card viewer** — click any slot, including an empty one, and the card
fills the screen with its full name, nickname, tier and duplicate count, browsable
left and right through the whole book. The count also reaches the album's tooltip.
The page-turn strips narrowed to the page margin to make room for the click.

**Three visual decisions closed, and folded in.** All three were live switchers in
the test panel; each winner is now the only body of code left, and the losing
candidates, their modules and their rows are deleted.

- **The stage is H · mahonie** — a french-polished mahogany table seen from
  straight above. Chosen over nine others: four screen directions (teletekst,
  sportuitzending, plakboek, vitrine, arcade) and four other timbers. Folded into
  `.game-stage`; `stageTheme.ts` and `tabletop.css` are gone. See "Framing".
- **The album is 1 · leer**, the leather book — the quiet control the five loud
  Panini-style candidates were being judged against, and it beat all of them.
  `albumStyle.ts`, `albumstyle.css` and `AlbumDecor.tsx` are gone, along with the
  `--pg-*` page palettes and the per-page artwork they drove; album.css is the
  whole book again.
- **The face reveal sounds like 3 · arpeggio** — D5 · F5 · A5 · D6 rising into the
  accent, over the shipped single chime and over a FIFA-style walkout and an MTG
  foil sheen. Folded into `playNameReveal`; `revealSound.ts` is gone. See "Sound".

**Separately, and open:** how the silhouette beat resolves
(`utils/revealStyle.ts` + `styles/reveal.css` + `utils/cardPieces.ts`, switchable
live from the test panel). Three rounds in, two candidates remain: **D · gloeien**
(the silhouette charging and draining) and **H · scherven** (the card breaking
into cells whose skins take their shapes one at a time). See "Candidates for the
payoff" below — and note the open question of whether they are rivals at all, or
the low and high ends of the scale. Once one is picked, fold
its rules into card.css / packopen.css, bring its timings back into
`PackOpener.tsx` as constants, and delete the modules, `reveal.css` and the
switcher.

**Then:** `PackGift` and `POST api/collections/gifts` — present a pack to a named
player or to everybody, and wire the test panel's pack buttons to it. Everything else
in phase 2 is done.

Two smaller things still open:
- Whether first-name-only is acceptable now that two Daans and two Jeroens read
  identically on their cards.
- Whether the ceremony should enter at 80+ rather than 75+ (18% of cards rather
  than 28%).

The `src/mock/` directory now holds no mocks — `cardMock.ts` is the card domain the
UI needs and nothing else. Renaming it is ten import sites of churn for no behaviour,
so it is worth doing on its own rather than smuggled into a slice.

The `guarantee*` options survive on `Pack` with nothing setting them: they are how a
ceremony level is reached on demand instead of on a ~3% roll, and the gift endpoint is
what will set them. `window.cardDebug` is down to the animation speed and the mute
setting, both of which are genuinely client-side.

## Context

The app has no authentication and will never have any. We want a collectable
trading-card layer on top of it: playing a game earns you a pack, packs are
opened for a reveal, and the cards are yours to keep.

Identity is **the existing player record**, named on the collection page. No
accounts, no email, no verification — a pure trust system in an office where
everyone already knows each other. Persistence comes free because players
already live in the database.

Cards are **live, not snapshots**: a card always shows its player's current
rating and tier. Pull someone at Zilver and they become Goud when their form
improves — so the leaderboard becomes the metagame, because you start caring
about the form of players you hold.

Outcome: you play foosball, someone logs the game, all four players get a pack
sized by how well they did, and collections build toward a legends unlock.

## Settled decisions

| Decision | Choice |
| --- | --- |
| Storage | Server-side (SQLite/EF Core). Sole source of truth. |
| Identity | `PlayerId`, entered via type-ahead (not a dropdown). Browser remembers the last pick. |
| Signing in | A **ruled ledger** lying open on the table, not a searchbar. Still a type-ahead — you write your name on the line. |
| Signing out | The **register stays on the table**, small, in the margin opposite the packet shelf. Clicking it crosses your name out. There is no player picker anywhere. |
| Sound | Synthesised, **on, and no mute button** — the browser and the OS both already have one. Reachable from `cardDebug`. |
| Starting a collection | A **ceremony, not an absence**. Five shut albums lie on the table, you pick one up, and your name is blocked into the cover in gold foil before the shelf and the empty book appear. |
| Album cover | Five leather stains — bordeaux, cognac, bosgroen, marineblauw, antraciet — brass edge and gold foil on all five. **Chosen once**, with no preview. |
| Access gate | Collection page unlocks once that player has **≥5 games** — symmetric with the card pool. |
| Pack recipients | **All four participants** of a game. |
| Pack size | 1 for playing, **+2** for winning, **+2** for beating expected margin by ≥3. So 1, 3 or 5. |
| Opponent bonus | Winning *or* beating expected margin by ≥3 doubles both opponents' tickets in that pack. Flat 2×, does not stack to 4×. Flavour, not balance. |
| Within a pack | Each player at most once — draw **without replacement**. |
| Free pack | One 1-card pack per player per day. |
| Pack expiry | **Hard.** Unrevealed at end of day = gone. |
| Contents rolled | At reveal time. |
| Duplicates | **Not** shown on the card at all — but in the tooltip and the card viewer, which are off-face surfaces. New cards are marked instead, with a glow at reveal. No conversion economy. |
| Card rating | **Live**, computed on read from `visibleRating`. No stat columns on the card. |
| Card sub-stats | **Dropped.** Not worth it for ~15 active players. |
| Rarity axis | Rating alone — no foils, no serials, one card per player. |
| Card pool | **Active** players with ≥5 games. |
| Legends | Completing the active set permanently unlocks inactive (≥5 games) players in packs, alongside actives. Rated on all-time-high, and **interleaved into the book by rating** rather than given their own pages. |
| Cards ↔ games | `CardInstance.GameId` FK with cascade delete. |
| Cards ↔ players | `SubjectPlayerId` FK, **also cascade**. Player deletion only ever happens for accidentally-created players, so losing their cards is correct. |
| Presentation | Not a screen: a **mahogany table** seen from above, with the book, the packets and the controls as objects lying on it. No OS chrome, token-driven. Chosen from ten candidates in two families — five screens, five timbers. |
| Album | Hand-rolled stiff CSS 3D page flip. No new dependency. |
| Card face | **Panini**: photo near-full-bleed and masked into the metal, no plates, first name only, DIN type, no stats. |
| Icoon | The **legend** colourway, not a fifth tier: monochrome photo warmed back up, one near-white two-zone ground for **every** legend, a 1px gold rule on the edge, no shards. Replaces the `legende` pill. **The tier no longer moves anything.** No effect on rarity. |
| Sound | Fully **synthesised** (WebAudio, no assets). On, with no in-page toggle. |
| Pacing | Two knobs — `DEFAULT_SCALE` (2) and `DEFAULT_CEREMONY_MS` (2000). Both settled by ear on the sliders and baked in. |
| Reveal ceremony | Graduated over four levels at 75/80/85/90 overall. Identical at any timestamp `t`; only the *length* differs. |

Deferred: trading between collections.

Still open: **which stage direction to use** — the last remaining visual decision.

## The legends pool

The `Active` flag is maintained — the database holds a healthy number of
inactive players already, so the legends pool has content on day one. (The
47-player list used for the numbers below came from `GET /api/leaderboard`,
which filters on `Active` via `GetCurrentLeaderBoard()`, so it is the active
roster only.)

Legends are inactive players with ≥5 games, rated on their **all-time-high**
`visibleRating`. Unlock is a permanent latch: once you have completed the active
set you keep legends forever, so new joiners and players crossing 5 games do
not un-complete it.

**There are 20 of them**, now that `GET /api/cards/pool` can say so, and they
spread across every tier: 4 goud zeldzaam, 7 goud, 7 zilver, 2 brons. That spread
is the thing to keep — it is the whole argument for the icoon carrying its tier's
metal rather than being uniformly gold, and it is now demonstrated rather than
asserted.

### One sequence, not an annexe

Legends are **shuffled in among the actives by rating**, not appended as a block of
legends pages. The book is one ascending sequence and an icoon turns up on the
spread its rating earns it.

The original design appended them, on the reasoning that the album should *grow*
rather than split in two. Interleaving serves that better: unlocking makes every
spread you already knew denser instead of adding a section at the back that reads
as a separate collection with its own completion. It also puts the rarest card in
the album — Roel Loonen at overall 91 — on the last page, past the best active
player, which is where the book was always building toward.

Consequences, both accepted:

- An empty slot no longer tells you whether it is an active or a legend. See the
  icoon section for why that is kept.
- The set roughly grows by half on unlock (38 → 58 at today's roster), all of it in
  the middle of the book rather than after it.

The completion meter and the unlock gate still count **actives only** — legends are
the reward for finishing that set, so they must not dilute the thing they are
awarded for.

The legend gate is held symmetric with the card pool deliberately, but it is the
one place where 5 is arguable: it means somebody who played five games and left
is an icoon forever. **This has stopped being hypothetical.** Two legends sit at
exactly five games (overall 64 and 58) and three more in the 8–10 band, so the
bottom of the legends pages is now people who passed through. Whether that reads
as a nice piece of office history or as clutter is the first thing to judge once
the pages are real — and the gate is the knob.

## The rating scale (FIFA-style 40–99)

Anchors: `1851 → 90`, `1000 → 80`, `800 → 70`, floor `40`.

A smooth curve cannot fit these. Fitting `A + B·ln(r + C)` solves to `C = −738`,
which diverges below 738 rating; a 99-capped logistic hits the upper anchors but
yields `800 → 77` and `0 → 60`, compressing the bottom half upward. The cause is
structural — 800→1000 is 200 rating for 10 points while 1000→1851 is 851 rating
for the same 10 points, a 4× slope change steeper than any log or logistic can
bend. So: **piecewise-linear interpolation** through an anchor table.

| visibleRating | overall |
|---:|---:|
| 0 | 40 |
| 200 | 47 |
| 400 | 54 |
| 600 | 61.5 |
| 800 | 70 |
| 1000 | 80 |
| 1250 | 84 |
| 1500 | 87 |
| 1851 | 90 |
| 2200 | 93 |
| 2600 | 96 |
| 3000 | 99 |
| above | clamp 99 |

Slope rises monotonically to a peak of `.05` in the 800–1000 band then falls
monotonically — an S-curve inflecting exactly where the anchors demand. 99 is
unreachable in practice.

### Why 99 lands at 3000 and not 4000

Everything up to **1851 is fixed** and must stay so. It is pinned to exactly 90,
every active player sits at or below it, and since overall also feeds the ticket
weighting, moving any anchor in that range silently re-balances rarity.

It was originally justified as "the highest rating ever recorded", which was
wrong: 1851 was Petar's rating in the snapshot this was written against — his
*current* rating, not anyone's peak. Now that the replay tracks peaks, the real
all-time high is **1954** (Roel Loonen), with Petar at 1953 and Ton at 1931. This
changes nothing structural, because all three land inside the 1851→2200 segment
that was already there as headroom, and Roel comes out at overall 91. But it does
mean the region above 1851 is **not** hypothetical the way the paragraphs below
assume: legends are rated on peaks, and the best legend is above every active
player on the board.

The table originally ran on to `4000 → 98`, which reserved 9 of the 59 available
points — **15% of the scale** — for ratings nobody has been near. That headroom is
what made the top steep: a point cost 146 rating at 1851 and 400 by the end.

Spending the same span on ratings that are at least imaginable gives three even
steps of +3. The first continues the slope below it almost exactly — 117 → 116
rating per point, a **0.99× kink** — so 1500 through 3000 is now effectively one
straight line:

| overall | old cutoff | new | width old | width new |
|---:|---:|---:|---:|---:|
| 90 | 1792 | 1792 | 146 | **117** |
| 92 | 2113 | 2025 | 187 | 116 |
| 94 | 2500 | 2267 | 250 | 133 |
| 96 | 3050 | 2533 | 350 | 133 |
| 98 | 3800 | 2800 | 200 | 133 |
| 99 | 4000 | **3000** | — | — |

**No player's overall changed** — 0 of 38 actives and 0 of the legend
placeholders — so the odds table, the completion estimates and `DHigh` all stand
untouched. That is the whole reason this change was safe to make on its own.

Still open, and independent of this: the worst kink on the scale remains **3.13×
at rating 1000**, where the slope snaps from 20 to 62.5 rating per point. Monotone
cubic (PCHIP) interpolation over the same anchors would smooth it to 1.50× while
passing through every anchor exactly; it moves four of forty cards by +1 and
crosses no tier or ceremony boundary.

Legends use the same scale applied to their **all-time-high** `visibleRating`.
`GetLeaderBoard` already replays every game in chronological order, so tracking
a running per-player maximum is a few lines inside the existing loop.

Anchors belong in `appsettings.json` — this is the balance knob most likely to
need retuning.

### Tiers (cosmetic labels only)

| Tier | overall | count |
| --- | ---: | ---: |
| Goud Zeldzaam | 85+ | 6 |
| Goud | 75–84 | 12 |
| Zilver | 65–74 | 12 |
| Brons | <65 | 4 |

**There is still no Icoon tier** — gold is the top of this axis, so the 90s are
simply gold. The reveal ceremony is driven by the **overall**, not by tier, and
steps at 75 / 80 / 85 / 90 — so a 90+ pull still escalates well past an 85 even
though the card itself shows no distinction above 85. See "The rare ceremony"
below.

Icoon exists, but on a **different axis**: it is what a legend's card looks like,
not a rung above gold. A legend has a tier like everyone else, and it moves the
icoon's metal. See "The icoon card" under the presentation layer.

Also considered and rejected: collapsing 85+ into 75–84, or moving that
distinction off tone onto a structural signal. The argument for it is that two
shades of gold are indistinguishable in an album where the 6 rare golds are
scattered among 38 slots — which is true and does not matter. The rarity signal
was never the metal: it is the overall printed in the corner and the length of
the ceremony. FUT makes gold-rare and gold-common just as quietly different, on
purpose. Leave both golds alone.

### Why ≥5 games

`visibleRating = rating − 1000·e^(−0.2303·games)`, so the deduction is ~794 at
one game and ~100 at ten. Without a floor the scale reports attendance, not
skill: Ninette's real rating is 1003 but she scores 47; Thomas, Nino and Angela
all sit at exactly 40 and are indistinguishable. Crossing the gate becomes a
small event — you become both collectable and able to collect.

**The gate was 10 and is now 5.** The deduction is continuous, not a switch, and
that is what makes the lower gate safe:

| games | 5 | 6 | 7 | 9 | 10 | 15 | 20 | 30 |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| deduction | −316 | −251 | −199 | −126 | −100 | −32 | −10 | −1 |

At five games you are still docked ~316, so a short hot streak cannot buy a
top-of-scale card: the four players the drop admits arrive at overall 73, 68, 63
and 59 despite raw ratings of 993, 887, 878 and 737. They land mid-table, which
is the whole argument. (It is also worth reading the table in the other
direction: the deduction is ~1 by 30 games, so anyone past that is on their real
rating and the floor is doing nothing at all.)

The cost is that four extra cards dilute the pool. It is paid **almost perfectly
uniformly** — every existing player's per-pack rate falls 14.4–15.5%, Petar
losing the most at 15.5% and Daria the least at 14.4% — so the rarity
*structure* survives intact: top-to-bottom spread goes 28.6× to 28.5×. The
scarce cards do not become disproportionately scarce; everything stretches by
about 1.18× and the set gets four cards longer.

`DHigh` was deliberately **left at 2.5**. It could be raised to ~2.7 to hold
Petar at his old ~187 packs, but the honest read is that a lower gate should
cost something, and 3.5 months median is still inside the window the 2.5-vs-1.9
argument above was defending. Revisit it only if completion actually stalls in
practice.

Cards are live, so these four re-rate fast: Yannick is raw 993 on nine games and
would be an overall 80 if that holds to thirty. A ≥5 gate means the mid-table
churns visibly week to week. That is arguably the feature — your own card gets
rarer as you play — but it is new behaviour that ≥10 largely suppressed.

## The draw: weighted raffle with an accelerating rate

Tier populations are a **diamond, not a pyramid** (6/12/12/4), so FIFA-style
tier-slot odds invert: a 30% "Brons slot" split across only 4 players makes each
~7.5% — commoner than any Goud player at 20%/12 ≈ 1.7%.

Packs are also **never tier-guaranteed**: the only choice is pack size (1, 3 or
5), and every card in every pack is drawn on the odds below.

A single global halving rate fails too, because the rating scale deliberately
compresses the top: Petar (1851) and Mathijs (1035) are 9 overall points apart
despite an 816-rating gap, so a constant rate would put them a mere 2.2× apart
in rarity while Daria and Ida (374 rating apart) would be 3.4× apart — backwards
relative to real skill.

So each player holds `2^(−E)` raffle tickets, where the halving rate itself
accelerates:

```
E = (overall − 40) / 30              if overall ≤ 80
E = 1.333 + (overall − 80) / 2.5     if overall > 80
```

Continuous at 80 — no jump, only the slope changes — and 80 is exactly rating
1000. Below it a halving takes 30 overall points, more than the entire sub-80
range, so everyone there is near-flat by design.

The whole sub-80 range spans just **1.87×**, so Brons is barely commoner than
Zilver. Weighting reads the rating *value*, not rank — deliberately, so sliding
from 1050 to 950 makes you commoner without moving a place on the leaderboard.

`DHigh` is set to **2.5** and stays in `appsettings.json` for rebalancing (1.9 →
Petar 0.084%/card, 2.0 → 0.101%, 2.5 → 0.195%). 2.5 was chosen over 1.9 because
completion is one long coin-flip on the top player, so the two ends of the
distribution are far apart: at 2.5 half of collectors finish in ~3 months while
the unlucky tail is still hunting at 6–7. 1.9 would push nearly everyone to half
a year. A reward almost nobody reaches is worse than one some people reach early.

**Structural caveat:** completion time is a property of whoever is top of the
leaderboard. If Petar goes inactive he moves to the legends pool and the
remaining active set becomes dramatically easier. This number drifts with the
roster; `DHigh` is the correction. Accepted knowingly.

### One of each per pack

Each player can appear at most once in a pack, so a pack is a draw **without
replacement** (successive sampling: redraw proportional to remaining tickets).
This lifts everyone's per-pack inclusion odds slightly — ~4% for a 3-card pack,
~9% for a 5-card pack — and is folded into every number below. Guard for a pool
smaller than the pack size, though 38 vs 5 makes it theoretical.

### Opponent bonus

A qualifying player (won, or beat expected margin by ≥3) has **both opponents'
tickets doubled** for that pack's draw. Flat 2× even if both conditions are met —
a dominant win already pays 5 cards, and compounding to 4× would let blowouts
dominate collections.

**This is flavour, not balance, and should be treated as such.** Doubling 2 of 38
players shifts only ~6% of the ticket mass, lifting Petar's season rate ~8%. The
intent is that it circulates as an urban legend — *you can pack someone more
easily if you beat them* — which happens to be true, and happens to mean that
collecting the best player is easiest for whoever beats the best player. Do not
tune it as an economy lever.

### Per-player odds at DHigh = 2.5

Mix assumption for the last column: 42.5% × 1-card, 35% × 3-card, 22.5% × 5-card,
from P(win) = 0.5 and P(bonus) ≈ 0.30.

Bracketed values are what the same player was under the old ≥10 gate, kept so the
cost of the drop stays legible.

| Player | rating | ovr | 1-pack | 3-pack | 5-pack | avg packs to first |
|---|--:|--:|--:|--:|--:|--:|
| Petar | 1851 | 90 | 0.17% | 0.52% | 0.90% | 222 (187) |
| Ton | 1578 | 88 | 0.29% | 0.90% | 1.5% | 128 (108) |
| Mark, Rik | 1551, 1463 | 87 | 0.38% | 1.2% | 2.0% | 97 (82) |
| Luuk, Casper | 1362, 1327 | 85 | 0.67% | 2.1% | 3.5% | 56 (47) |
| Gijs, Anneloes | 1201, 1179 | 83 | 1.2% | 3.6% | 6.1% | 32 (27) |
| Nadia, Ridho, Jeroen Mens | 1144–1098 | 82 | 1.5% | 4.7% | 7.9% | 25 (21) |
| Daan vd Beek, Daan Verkade, Laura, Mathijs | 1066–1035 | 81 | 2.0% | 6.1% | 10% | 19 (16) |
| Max | 981 | 79 | 2.7% | 8.2% | 14% | 14.0 (11.9) |
| Niek | 952 | 78 | 2.8% | 8.4% | 14% | 13.7 (11.7) |
| Tanny | 919 | 76 | 2.9% | 8.8% | 15% | 13.1 (11.2) |
| **Yannick**, Marie | 867, 864 | 73 | 3.1% | 9.4% | 16% | 12.3 (—, 10.4) |
| Bo, Simon, Nynke | 829–811 | 71 | 3.3% | 9.8% | 16% | 11.7 (10.0) |
| Ewan, Rianne | 782, 767 | 69 | 3.4% | 10% | 17% | 11.2 (9.6) |
| Jeroen van Geel, **Sevda**, Esther | 764–759 | 68 | 3.5% | 11% | 18% | 11.0 (9.4) |
| Karin, Tim | 740, 732 | 67 | 3.6% | 11% | 18% | 10.7 (9.2) |
| Ida | 716 | 66 | 3.7% | 11% | 18% | 10.5 (9.0) |
| Lotte | 688 | 65 | 3.8% | 11% | 19% | 10.3 (8.8) |
| **Dmitry** | 627 | 63 | 3.9% | 12% | 19% | 9.8 (—) |
| Fraser | 616 | 62 | 4.0% | 12% | 20% | 9.6 (8.2) |
| Jasper | 582 | 61 | 4.1% | 12% | 20% | 9.4 (8.1) |
| **Sandra** | 538 | 59 | 4.3% | 13% | 21% | 9.0 (—) |
| Evie | 519 | 58 | 4.4% | 13% | 22% | 8.8 (7.5) |
| Daria | 342 | 52 | 5.1% | 15% | 24% | 7.8 (6.6) |

The scarcity spread is deliberately not Petar-only: Ton at 128 packs, the 87s at
97 and the 85s at 56 are all genuinely hard, while the bottom two-thirds sits in
a tight 7.8–14 band. Top-to-bottom range is 28×, unchanged by the gate drop.

Sanity check for the implementation: these inclusion probabilities must sum to
**2.600** across all 38 players — exactly the average pack size, as required when
no player can repeat within a pack. Worth asserting in a unit test. (The 1-, 3-
and 5-pack columns must likewise sum to 1, 3 and 5. That is the check that
catches a wrong without-replacement implementation, and it is easy to get subtly
wrong: successive sampling is not the same as "draw k independently and dedupe".)

Still excluded from the pool (under 5 games): Inge, Ancella, Molly, Ninette,
Sylvia, Lianne, Thomas, Nino, Angela — all on two games or fewer, which is where
the deduction is still ≥501 and the scale genuinely cannot say anything.

Legends join the same pool with no special rarity. Their all-time-high overalls
are high, so the curve makes them rare automatically.

## Volume and pacing

**Average pack size ≈ 2.6 cards**, from `1 + 2×P(win) + 2×P(bonus)` with
P(win) = 0.5 and P(beating expected margin by ≥3) ≈ 0.30. That 0.30 is grounded
in the existing data: a mid-table player wins 10-6 and loses 6-10 on average, so
a typical winning margin is ~4 against an expected margin of ~1 in an even
matchup. Roughly half of wins clear the bar; losses clear it only for heavy
underdogs who keep it close.

Per person, at **3 games/day, 5 days/week** (roughly the heaviest current rate —
1746 games over ~2.5 years):

| | per day | per week |
|---|---:|---:|
| Game packs | 3 | 15 |
| Free packs | 1 | 5 |
| Cards | 8.8 | 44 |

Completing the 38-card active set at `DHigh = 2.5`, with no-duplicates-per-pack
and the opponent bonus both folded in. Bracketed figures are the 34-card set
under the old ≥10 gate:

| | 3-game days | weeks | months | games | packs | cards |
|---|---:|---:|---:|---:|---:|---:|
| Median | ~75 (64) | ~15 (13) | ~3.5 (3) | ~225 (192) | ~300 (256) | ~662 (563) |
| 90% confidence | ~164 (140) | ~33 (28) | ~7.5 (6.5) | ~492 (420) | ~656 (560) | ~1,442 (1,232) |

Completion is essentially *"when do you first pull Petar"* — every other card
arrives long before, which is why the median and the 90th percentile are more
than 2× apart. Half of collectors finish inside a quarter; the unlucky tail is
still hunting at seven or eight months.

Note what the four extra cards did *not* do: they added ~17% to the median but
they did not change the shape. Completion is still one long coin-flip on the top
player, and the ratio between the median and the tail is the same. Four more
commons cost almost nothing on their own — the whole delay is Petar getting
15.5% rarer.

Because duplicates are shown but never converted, a collector at median
completion holds roughly **33 Darias, 29 Evies, 28 Sandras, 27 Jaspers** — and
double that by the 90th percentile. The collection grid must handle three-digit
counts gracefully.

## Architecture

Four production endpoints, one development-only, one hook, and no background jobs.

| | | |
| --- | --- | --- |
| `GET` | `api/cards/pool` | **Built.** Every player a pack can contain: actives on their current rating, legends on their all-time high. |
| `GET` | `api/collections/{playerId}` | **Built.** The whole page in one response — pool, legends, owned counts, available packs, unlock state, eligibility, and the album's binding. |
| `POST` | `api/collections/{playerId}/create` | **Built.** Fetches the player an album in the leather they picked. Idempotent; returns the same payload as the `GET`. |
| `POST` | `api/collections/{playerId}/packs/{packId}/claim` | **Built.** Rolls, files the cards, returns them with `isNew` and `copies`. 409 for an already-claimed pack, for a player with no album and for one under the gate; 404 for an unknown player and for a pack that is not currently derived — which covers an invented id, somebody else's game and yesterday's packet alike. |
| `DELETE` | `api/collections/{playerId}` | **Built, development only.** Puts the album back on the table so the opening sequence can be watched again, and takes the cards and the claims with it. Idempotent; 404s outside Development rather than 403, because a route that is not meant to exist should not announce that it does. |
| `PUT` | `api/collections/{playerId}/legends` | **Built, development only**, gated the same way. Flips the latch by hand, because earning it is a three-month proposition and it is the only way to see an icoon in a book. |
| `PUT` | `api/collections/{playerId}/cover` | Later, and only if wanted. A re-bind. Reserved rather than built — see "The album is chosen once". |
| `POST` | `api/collections/gifts` | **Next.** Present packs to a named player or to everybody — the one grant-shaped thing left, and what the test panel's pack buttons are waiting on. |

The development-only `api/collections/{playerId}/packs/debug` that used to sit in this
table was never built and is not going to be. A debug pack and a present are the same
object — a pack somebody was handed rather than earned — so `api/collections/gifts`
covers both, and a second grant-shaped route would only be a second thing to keep in
step with `PackService.Roll`.

**The routes are plural, and there is no `api/collection/players`.** Both were
singular in this document and in `cardsClient.ts`'s header comment for as long as
they were hypothetical; `collections` is what got built. The type-ahead endpoint was
dropped entirely rather than renamed: `GET api/players?activeOnly=true` already
returns exactly what the ledger needs, so a card-specific route could only have
disagreed with it. See "The ledger lists everybody" for why it wants the *unfiltered*
list.

**The seam has been carrying this contract, not this document.**
[cardsClient.ts](anago-leader-board-ui/src/clients/cardsClient.ts) defines
`CollectionState` and a third call (`getSelectablePlayers`) that the sketch which
used to sit here never mentioned. When the two disagree, the seam is right.

### Packs are derived, not granted

An available pack is **computed**, not stored:

```
available(player, today) =
      games today the player took part in     minus  PackClaim rows
    + the daily freebie                       minus  a daily claim
    + gift rows not yet claimed                      (later)
```

`CreateGame` inserts nothing. This was originally specified the other way round —
a `PackGrant` row written per participant inside the game hook — and deriving is
better for four reasons, three of which close gaps the granting design accepted
in writing:

- **"Cards must never break game submission" stops being a rule and becomes a
  fact.** There is no hook, so there is nothing to fail and nothing to wrap.
- **`PUT /api/game/{id}` re-rolls correctly.** The accepted gap — edits do not
  re-roll already-granted packs — disappears: an unclaimed pack is sized from the
  game's *current* score, so correcting a mis-entered 10-2 resizes it, while a
  claimed one is rightly left alone.
- **Deleting a game takes its unclaimed packs with it** with no cascade rule at
  all; they simply stop being derived. Only `CardInstance.GameId` still needs the
  cascade, for the claimed half.
- **No expiry job and no read filter.** "Today's games" *is* the window — which
  also turns hard same-day expiry from a settled decision into a one-line knob.
- **No lazy materialisation for the daily freebie.** It is "does a claim row exist
  for me for today?", which is a read.

**Sizing is a pure function of the game row.**
[GameWithAnalytics](AnagoLeaderboard/AnagoLeaderboard/Models/Results/GameWithAnalytics.cs)
already computes `ExpectedScore` and `ActualScore` from the four stored
`OldRating`s — no leaderboard replay, and immutable, because those are frozen on
the row when the game is written. So `expectedMargin = 10 − ExpectedScore`,
`actualMargin = 10 − ActualScore`, and the bonus is
`actualMargin − expectedMargin ≥ 3`, sign-flipped for the second team. The
opponent bonus and the wrapper's reason come off the same row.

Two consequences, one of them a real cost:

- **Pack ids become synthetic and stable**: `game:{gameId}`, `daily:{yyyy-MM-dd}`,
  `gift:{giftId}`. A small win — the packet pile's tilt and sheen are seeded from
  the id deliberately (see "The shelf stays up"), and a derived id is stable across
  refetches by construction rather than by care.
- **Claiming needs `playerId` in the path**, because a synthetic id no longer
  identifies an owner — and those ids are *guessable* from the public games list,
  where a grant GUID was not. The harm is the bounded one below (the cards still
  land with the owner), but the bar for spoiling somebody's reveal is lower than it
  was, and that is a deliberate trade rather than an oversight.

### Roll at claim

A pack belongs to a player, so the claim endpoint credits that player regardless
of who clicked it — the cards cannot be stolen either way. Rolling at claim
therefore costs nothing in safety and avoids writing card rows for packs that
expire unopened. With a same-day window, ratings cannot drift meaningfully
between the game and the claim.

### Hard daily expiry

Unclaimed at end of day = gone. Absence from the office means you were not
playing and so earned no game packs anyway, and the free daily pack is a reward
for visiting, so there is nothing to lose by not visiting. The one real case is
an end-of-day game, which is the player's own call — and the app is now mobile
friendly, so opening on a phone is quick.

"Day" = server-local date, consistent with `DateTime.Now` used throughout.

Under derivation this needs no enforcing: the window is the query. Widening it to
three days, or to forever, is one date filter — so the decision stays settled but
stops being expensive to revisit. Gifts are the deliberate exception and carry
their own `ExpiresAt`, because a present that vanishes overnight is a mean present.

### Impersonation: type-ahead, not a dropdown

The harm is bounded — the cards still land with the owner, so only the reveal is
spoiled, and a griefer who opens a pack you would have let expire has actually
helped you. So the mitigation is deliberately minimal: **the player picker is a
type-ahead field, not a select.** Typing a colleague's name to view their
collection feels materially different from selecting it off a sanctioned list,
and it costs nothing for legitimate use.

Deliberately not doing: per-player PINs (forgotten PINs become a support queue,
and it walls off the fun part to protect a surprise), reveal attribution, or
re-watchable reveals. Revisit only if someone actually griefs.

### Pack sizing

`actualMargin − expectedMargin ≥ 3` earns the +2, using
`ExpectedScoreCalculator.GetExpectedMargin` fed by
`RatingCalculator.ProbTeam1Wins` — both already exist and the former is trained
on ~2000 of these games. Expressing the rule in *margins* rather than scores
makes it symmetric: expected −6, actual −3 also earns the bonus, rewarding a
good loss.

Known incentive: pack size now depends on the recorded score, and both teams
benefit from a close game. Since `pointsFactor = margin × 0.2` drives the Elo
delta, shaved margins would slowly compress ratings. Mild and socially visible,
but it's the first time score entry has carried a reward.

### Cards must never break game submission

A failure anywhere in pack granting must **not** roll back the game insert. A lost
pack is acceptable, a lost game is not.

This used to be a rule enforced by wrapping the grant hook in a try/catch. Under
derivation there is no hook: `CreateGame` writes a game and nothing else, and the
packs that game entitles four people to are worked out when somebody asks. The
rule is now structural, and **the way to break it again is to reintroduce a write
into `CreateGame`.** Don't.

### Anti-farming

Packs only come from games, so farming means polluting the leaderboard
everyone watches — self-punishing and visible. Plus: **enforce the duplicate
check server-side.** It currently exists only as an advisory endpoint
([GameController.cs:38](AnagoLeaderboard/AnagoLeaderboard/Controllers/GameController.cs#L38))
that the frontend politely calls first; `CreateGame` validates nothing at all.
Reuse `Game.Equals`, already written for exactly this.

## Backend changes

All under `AnagoLeaderboard/AnagoLeaderboard/`.

### Migration + models

New entities in `Models/Results/`, registered in
[DatabaseContext.cs](AnagoLeaderboard/AnagoLeaderboard/Database/DatabaseContext.cs).
The existing `OwnsOne` flattening and absent Game→Player FKs are legacy shape;
new tables should use real FKs.

- **`PackClaim`** — **built.** `Id`, `PlayerId`, `Source` (`Game` | `Daily`; `Gift`
  arrives with the gift table), `GameId` (nullable, cascade), `ClaimDate`,
  `ClaimedAt`. Unique on `(PlayerId, Source, GameId)` and on `(PlayerId, ClaimDate)`
  for dailies. **Those indexes are the double-claim guard** — two tabs racing means
  one insert fails, and that failure is the 409. There is no separate check to forget.
  - The daily index **must be filtered** (`WHERE "Source" = 'Daily'`). As written
    here it was `(PlayerId, Source, ClaimDate)`, which is fine, but the obvious
    unfiltered `(PlayerId, ClaimDate)` forbids a player claiming two *game* packs on
    one day — the normal case for anyone who plays twice in an afternoon. There is a
    test for exactly that.
  - SQLite treats NULLs as distinct in a unique index, so the first index does not
    accidentally cover the dailies either. The two are genuinely separate rules.
  - `Source` is stored as a **string**, via `HasConversion<string>()`. EF maps enums
    to `int`, and an added source would then silently renumber the existing ones.
- **`CardInstance`** — **built.** `Id`, `PlayerId` (owner), `SubjectPlayerId` (who's
  on the card, cascade delete), `PackClaimId` (cascade), `GameId` (cascade delete),
  `IsLegend`, `MintedAt`, indexed on `(PlayerId, SubjectPlayerId)` because every read
  of a collection is "how many of each subject".
  - Deleting a game therefore reaches its cards **two ways** — directly, and through
    the claim — which SQLite is happy to have. The direct one is kept because it is
    the one that states the rule.
  - `IsLegend` is frozen at mint time rather than derived from the subject's `Active`
    flag: the two answer different questions, and somebody going inactive next month
    did not retroactively hand you an icoon.
- **`PlayerCollection`** — **built**, and the only table so far. `PlayerId` (PK
  *and* FK to `Players`, cascade), `Cover`, `CreatedAt`, `LegendsUnlockedAt`
  (nullable — a permanent latch, so new joiners and players crossing 5 games don't
  un-complete an existing unlock; nothing writes it until the claim endpoint can
  count owned cards).
  - Named `PlayerCollectionState` here originally. It gained the binding and stopped
    being only a state bag, so it is `PlayerCollection` — it *is* the collection row.
  - **The row's existence is load-bearing.** No row means the collection has never
    been started, which is what puts a player through the opening sequence rather
    than dropping them onto an album that was simply always there. So it is
    deliberately **not** created lazily on first read.
  - `Cover` is a `string` validated against `AlbumCovers.All`, not a C# enum: EF maps
    enums to `int` and the JSON contract would quietly become a number.
  - The cascade is required rather than tidy — `PlayerService.DeletePlayer` never
    loads a collection, so without it deleting a player fails on a FK violation the
    moment that player owns an album.
- **`PackGift`**, later — `Id`, `PlayerId` (nullable: null means everyone), `Size`,
  `Reason`, `CreatedAt`, `ExpiresAt` (nullable). The only grant-shaped table in
  the design, because a present cannot be derived from anything that happened.

Cascade on `GameId` for `CardInstance`, so deleting a game removes the cards it
minted. This is not tidiness — pack size depends on the score, so a mis-entered
10-2 mints 5 cards where 10-9 mints 3, and deleting the game to correct it must
take the illegitimate rewards with it. **Unclaimed packs need no rule**: they were
never rows, and a deleted game stops being derived.

**Do not flush `PackClaim` nightly.** The derivation only ever looks at today, so
old rows are never read again and flushing buys nothing — while costing a
scheduled job, which is a moving part in a design whose main virtue is having
none. A few thousand rows a year is nothing in SQLite, and they are a free record
of where a card came from.

Generated as `20260811121556_AddPackClaimAndCardInstance` — `dotnet-ef 8.0.0` is
pinned in `.config/dotnet-tools.json`. Note that `dotnet ef` builds the project, so a
running dev API locks `bin\Debug` and the build fails on the exe copy;
`--configuration Release` sidesteps it without stopping the API.

### Services

Done:

- **`Services/Calculators/CardRatingCalculator.cs`** — the piecewise scale and the
  ticket weighting, beside the existing
  [RatingCalculator.cs](AnagoLeaderboard/AnagoLeaderboard/Services/Calculators/RatingCalculator.cs).
  Anchors, `DHigh`, `DLow`, `Hinge` and `MinGames` live in the `Cards` section of
  `appsettings.json`, together because they are tuned against each other.
- **`Services/LeaderBoardService.cs`** — a running per-player max `visibleRating`
  inside the existing replay loop, surfaced as `DynamicRatingPlayer.PeakVisibleRating`.
  The deduction *is* `PlayerStats.Std`, so the visible rating at any point in
  history is `Rating − Std` and needed no new arithmetic; it is now expressed once,
  as `PlayerStats.VisibleRating`, and used by the leaderboard rows, the per-game
  old/new ratings and the peak alike so the three cannot drift.
- **`Services/CardPoolService.cs`** — actives and legends. Knows nothing about
  collections or packs; it is the set, not anyone's state over it, which is what
  lets `CollectionService` call straight into it rather than build its own list.

- **`Services/PackService.cs`** — deriving, sizing, rolling, claiming, the daily
  freebie. `Derive`, `PackForGame`, `DailyPack` and `Roll` are all **static**: they
  are pure functions of the arguments handed to them, which is what lets the tests
  drive them without a database, and `Roll` takes an injectable `Random` for the same
  reason.
- **`Services/CollectionService.cs`** — now also fills `Owned` from `CardInstance` and
  `Packs` from `PackService`, and hands over the games the replay already returned
  rather than letting anything re-query them. See the `OldRating` note at the top of
  this document.

Still to write:

- `Services/GameService.cs` — the duplicate guard, and **only** that.

Both rolling and reading a collection need current ratings via
`GetCurrentLeaderBoard()` — an O(all games) replay, already the cost of every
existing GET.

### One collection endpoint, not three

`Controllers/CollectionController.cs`, `[Route("api")]` to match existing style,
and it returns the whole page in one response — `pool`, `legends`, `owned`,
`packs`, `legendsUnlocked`, `eligible`.

**Not split into collection / pool / legends routes.** The book is one object:
`CollectionPage` builds its sections from pool + legends + counts together and
`albumSlotOrder` walks the result, so three routes would mean either an album that
cannot draw until all three land, or one that draws and then *grows a section* —
which shifts every card-viewer index behind it, underneath an open viewer. The
same argument rules out splitting the pool into ordinary cards and icoons.

Two things that shape the payload:

- **It ships cards you do not own.** The album is mostly silhouettes; that is the
  feature. So the response carries the set, not just your cards.
- **`owned` is `{playerId, count}`**, not card objects. A card is live and wholly
  derivable from its pool entry, and the page only builds a `Map<id, count>` from
  it anyway — embedding the player twice would just invite the two copies to drift.

`GET api/cards/pool` survives alongside it as the cheap way to look at the pool on
its own. It calls the same service, so the two cannot disagree.

### The scale lives on the server

`overall` is computed in C# and sent down; `tierFor` and `ceremonyLevelFor` stay in
TypeScript.

The anchor table is a **balance** knob rather than a presentation one — it also
feeds `ticketsFor`, and moving any anchor below 1851 silently re-balances rarity.
Once the draw runs server-side, a browser with its own copy of the scale could
print an overall inconsistent with the odds the card was actually drawn at, and
nothing would ever surface it. Retuning `appsettings.json` now also needs no
frontend deploy.

The tier cutoffs and the ceremony's 75/80/85/90 do **not** follow it: they are
thresholds the card CSS and the pack opener key off directly, `TIER_LABELS` is
Dutch UI copy, and both are pure functions of `overall`, so there is no second
source of truth to keep in step.

One trap found while porting: **C# rounds midpoints to even and JavaScript rounds
them up.** The 800–1000 segment runs 20 rating to the point, so 810 lands on
exactly 70.5 — left on the default the two scales would have disagreed by a point
on a whole family of real ratings, quietly. `CardRatingCalculator` rounds
`AwayFromZero` and there is a test pinning it.

## Presentation layer

The teletext theme is deliberately minimal and cannot carry a card collection, so
the collection is **not** teletext. It is a 2002-era PC game screen — and the
palette collision is made intentional rather than accidental by framing it that
way.

No animation library is used (no framer-motion, react-spring or GSAP — only
`@emotion/react` via MUI and plain CSS), and none was added. Everything is plain
CSS plus a hand-written FLIP.

### Framing: a table, not a screen and not an OS window

The first attempt took "Windows XP aesthetic" literally and built a Luna dialog
with a title bar and window buttons. Wrong read — the reference is the era's
**games**, not its dialogs. The second read it as a game *screen*, which was
closer and still wrong: there is no screen. There is a **french-polished mahogany
table seen from straight above**, with the book, the packets and the controls
lying on it, and the site's black is the room around it.

Nav, leaderboard, games and player pages stay pure teletext, untouched.

The stage is **fully token-driven** — one set of custom properties covers the
header, footer, plates, buttons, input, meter, readouts *and* the book's inside
covers (`--book-inside`).

#### How this was chosen

Ten candidates in two families, all switchable live from the test panel while the
question was open. **A–E** treated the stage as a screen the book was displayed on
and differed in geometry and depth model, not just palette: `teletekst` (zero
depth, Mode-7, solid RGB blocks), `sportuitzending` (everything sheared),
`plakboek` (cut paper rotated off square), `vitrine` (hairlines and air, controls
as text) and `arcade` (dithered checkerboard, hard 2px bevels). **F–J** were the
table, differing only in timber: `eiken`, `grenen`, `mahonie`, `beuken`, `noten`.

**H · mahonie won**, and the family it belongs to is the larger half of that:
deep red-brown, ribbon figure, and one glued top rather than loose boards — so the
board seams and the per-board tone shift the other four timbers needed are gone
entirely, and what a polished finish gives instead is a **specular streak** across
the top and a hard vignette at the corners.

Three rules the table follows, each of them arrived at by getting it wrong first:

1. **The table is a table-sized object, not a background.** `width: min(1660px,
   97vw)`, centred, with an edge that catches the light and a shadow on the floor.
   Bleeding the wood to the edges of the viewport made it a texture behind a page.
   The figure has to clear the album, which sizes itself from the *viewport*
   rather than from its container — see "The shelf was overlapping the book" for
   where 1660 comes from.
2. **Nothing is spread on it.** An earlier pass put a felt blotter, a paper
   placemat, a baize inlay and a café cloth under the book. Covering the wood with
   a mat defeats the only thing the timber is for. Bare wood, the book, the
   packets and the keys.
3. **Everything is an object or it is engraved.** There is no chrome to hang things
   on, so a control is either a physical thing lying on the wood — a key, a packet,
   a slot cut into the surface — or it is type cut into it. Nothing gets a panel:
   the header, the footer and the packet shelf have no background at all. Buttons
   are keys with a light face, a hard bottom edge and 2px of travel.

`--drop` is the shadow everything on the table casts; objects disagreeing about
where the light is kills it instantly. `--ink` and `--ink-dim` are warm and light
because the timber is dark. There are also **no rules** — `.game-rule` is gone
from the shell entirely: a brass divider is screen furniture, and the space
between two objects on a table is the divider.

The test panel is deliberately exempt (`.game-plate--debug`): it is scaffolding,
and it has to stay readable rather than in character.

**The wood is real noise, not gradients.** The first pass faked grain with
`repeating-linear-gradient` and read as corduroy — grain is noise stretched along
one axis, irregular and self-similar at several scales, and a repeating gradient is
by definition none of those. So the grain is two inline `feTurbulence` layers as
data URIs (`--grain-figure` for the broad ribbon bands, `--grain-tight` for the
pores) with `baseFrequency` stretched hard along x so the noise elongates into
grain running the table's length, blended `overlay`/`soft-light` over a base tone,
under the lamp's highlight. No asset is fetched and nothing animates. A third
layer, `--grain-flake`, was the ray fleck of quarter-sawn oak and beech; mahogany
has none, so it went with those candidates.

Two details that are load-bearing:

- Each grain layer is **stretched over the whole slab** (`100% 100%`), never tiled:
  turbulence does not tile, and a stretched instance has no seam either.
- **Strength is baked into each layer's colour matrix**, because CSS has no
  per-layer background opacity. The matrix maps luminance into a band around
  mid-grey, which is exactly the value `overlay` and `soft-light` leave untouched.

Four layers in a fixed order, so the parallel `background-size` / `-repeat` /
`-blend-mode` lists stay aligned.

**Packets are packets.** The side panel used to hold buttons captioned
"3 kaarten". A button that *describes* a packet is a worse object than the packet,
especially two seconds before you see the real one full size — so the shelf
renders the same `.pack` element the opener tears apart (`.pack--mini`), at the size
of a card in the book. Tilts and sheen offsets come from the pack's **id**, never
random and no longer from its index, so a re-render does not reshuffle the pile —
and neither does a packet leaving the middle of it, which now happens in front of
you (see "The shelf stays up"). This is not tabletop-only; it is better
under all ten stages. What makes it work is that the packet is shaped like a packet
and scaled like the album — see the wrapper bullets under
[Pack opening](#pack-opening).

### Getting in: the ledger and the five books

The page used to have one entrance and no beginning. A bare type-ahead sat in the
header, and picking a name dropped you straight onto a fully-formed album. Both
halves of that were wrong.

**The searchbar was the one piece of undisguised UI on the table.** The stage's rule
is that everything on it is either a physical object or engraved into the surface, and
a text field floating in the middle of the mahogany is neither. So signing in is a
**ruled ledger lying open on the wood**, one blank line, and you write your name on
it. It is the right object rather than merely a themed one — a book you sign to say
you were here is exactly what the control is doing — and it sits beside the album
without arguing with it, because two books on one table is a normal thing to see.

It is **still a type-ahead**, and that is load-bearing rather than incidental: it is
the entire impersonation mitigation (see above), and a roster of clickable names would
throw it away for nothing.

Three details that took a pass each:

- **The paper is the brightest thing on the stage.** Everything else is dark with light
  type; paper under a lamp is lighter than polished mahogany, so the ledger is the one
  element allowed to be pale. Its light comes from the top left like everything else's.
- **The gutter is real.** A flat cream rectangle reads as a card. Two pages with a
  shadowed valley between them reads as a bound book seen from above — the same trick
  `.album__binding` plays.
- **The names appear as further lines on the same page**, not in a dropdown. No panel,
  no border, no shadow. The header picker needed a floating menu because it had nowhere
  to put the list; here the page *is* the list.

#### Signing out is the same object, reversed

The register **stays on the table**. Once you are signed in it lies in the right margin,
small, open at the line you signed, with your name on it in the handwriting you wrote it
in. Clicking it draws a stroke through the name and returns you to the full-size ledger.

You got in by writing your name in a book, so you get out by crossing it out — the same
object and the same gesture reversed. Nothing had to be invented for it, which is the test
this table applies to every control.

- **In the margin opposite the packet shelf**, and out of flow for the same reason: the
  book is centred on the table and neither margin can move it. The two things lying beside
  the album are what you came for and how you leave.
- **The strike is drawn, not switched on.** A pen crossing out a name is a stroke with a
  direction and a duration; `line-through` appearing all at once is a state change, and the
  difference is the whole beat. A `scaleX` on a pseudo-element, so it costs no layout.
- **It is captioned** (`uitschrijven`), which the page-turn strips deliberately are not.
  A page edge under a cursor can only mean one thing; a ledger with your name on it could
  as easily mean "look at this", and guessing wrong costs you the page you were on.
- **Stood down during a reveal and during the binding ceremony**, exactly as the shelf is:
  you cannot sign yourself out with a card in the air, and a way to abandon a book halfway
  through having your name blocked into it is not a thing to offer.
- It reuses `playPageTurn` rather than getting its own sound. Closing a register is paper
  moving, at the same weight as turning a leaf.

**The player picker is gone entirely**, and so is the header it lived in. It was doing two
jobs badly: it was the last undisguised control on the table, and it made reading a
colleague's collection a matter of typing another name into a box that was already open.
Impersonation has always been *accepted* here — there is no authentication and never will
be, and the harm is bounded — but accepted is not the same as invited, and an open text
field pointed at everybody's albums is an invitation. Signing out and back in through the
register costs the same number of clicks and reads as a deliberate act.

Two things moved out of the header with it:

- `snel openen` went to the test panel. It skips the reveal, which is the part of this
  feature people are here for, so it is a development convenience and not a setting.
- **The mute button was deleted rather than moved.** This reverses "persisted mute" as a
  settled decision. A speaker icon in the corner of a mahogany table was the last piece of
  OS chrome on the page, and it existed to solve a problem the browser's tab mute and the
  computer's volume knob both already solve. `isMuted`/`setMuted` and the persisted key all
  still work and are exposed on `cardDebug`, so a silent development session is one console
  call away — what went is the icon, not the capability.

`GameShell` now renders its header only when something is in it. An empty one still
contributed its bottom margin and pushed the whole table down for nothing.

#### The ledger lists everybody

Including players under the games gate, struck through, with how far off they are.

Filtering them out was the first version and it is worse: a name that is simply not
there cannot explain itself, and the players this affects are exactly the newest
colleagues — the ones with least reason to assume the page is working. This is also
why the type-ahead is backed by `GET api/players?activeOnly=true` rather than by the
card pool, which excludes them by definition.

One hole, accepted: `LeaderBoardService` builds its stats map per game, so a player
with **no games at all** is absent from that route entirely — they exist in `Players`
and nowhere else. The ledger's empty state says as much rather than us reshaping
`PlayerService` for somebody's first week.

#### Choosing the album

Five shut albums lying side by side, blank covers, one per stain. Click one: the other
four are taken off the table, the survivor slides to the middle, comes up to full size,
and the owner's name is blocked into the cover a letter at a time. Then the shelf and
the book appear.

- **Five books, not a swatch row, and no preview.** Choosing is picking an object up off
  a table; a control that restains a book in place is a settings widget with leather
  printed on it. The cost is committing before you see your name on it, which is the
  deal a real shop gives you.
- **The books are scaled with a transform, never resized.** `--page-w` is not overridden
  anywhere in the ceremony. It is viewport-derived and two other things read it at *use*
  time — `--album-card-w` and `--book-w` — so an override would silently resize the pack
  shelf as well. A transform also scales the cover's clamped type along with the box,
  which a width override does not: a rebuilt-narrow book gets full-size type and the name
  visibly shrinks at the handover.
- **Five across must fit without clipping.** `.game-stage` is `overflow: hidden`, so a
  sixth of a book past the edge is unreachable rather than scrollable. At 0.55 that is
  5×273px against 1592px of usable table at 1920×1080, and 5×194px against 1271px at
  1366×768. On a phone they wrap to three and two at 0.36 — one row of five leaves about
  62px each, which is tappable but a mean-looking shelf.
- **Nothing on the shelf has to be legible at the book's own scale.** The stain's name is
  set on the wood *under* the book rather than printed on it, and the covers are blocked
  blind — a series name and a rule, no owner. That is the whole reason a 36% book works.
- **The finished book is its own element**, at exactly `--page-w × --page-h` and centred in
  a well that reserves the album's footprint including the nav-label row. The shelf book
  is a small flat approximation; the handover has to land on the real geometry or the
  book jumps at the swap. The two crossfade.
- **The name is stamped with `playFoilStamp`, which is new.** `playSlot` per letter was
  tried and is audibly wrong: eleven grains over 100ms plus a 130Hz boom, so at ~45ms a
  letter (base) the grains smear into a wash and the booms become a pitched pulse train.
  A hot foil press is a small dry tick. The one heavy sound is `playCoverTurn`, and it
  lands *after* the name rather than under it. Spaces take no block and make no sound.

#### The sequence ends on an invitation, not an open book

The ceremony hands over a **shut** book, and then the line above it says *"Klik op de
kaft en blader langs de randen"* until you open it.

Opening it automatically was tried first and is wrong, even though it looks better for
two seconds. The album's whole navigation is undiscoverable by design — no arrows beside
the book, and deliberately nothing drawn on the page-turn strips — so the first thing a
new owner does has to *teach* that, and a book that opens itself teaches nothing. It also
spends the cover-turn flip at a moment when the reader did not ask for it, which is the
one gesture the album most needs them to learn.

So the invitation goes in the one place the design has already assigned to
discoverability: the single line above the book. It names **both** controls, because both
are invisible — the cover is the button, and the page edges are the only other one.

- It replaces `gesloten`, which was fine for a returning reader and useless for a new one:
  it names the state instead of offering the way out of it.
- It clears itself **the moment the book is opened, by any route** — cover click, turn
  strip, arrow key, swipe, or the card viewer turning to a card. Watched off the book's
  position rather than hooked into `turn()`, so "any route" stays true without a list
  somebody has to remember to extend.
- It does **not** come back when the book is shut again. "You have not worked out how to
  open this" cannot become true a second time.
- `.album__nav-label` now reserves a line's height. The label sits above the book, so a
  string longer than `gesloten` would otherwise push the whole book down.

Whether it should be a *first visit* hint rather than a *first book* hint is open: it is
keyed on having just watched the binding, so somebody who returns tomorrow to a book they
never opened gets `gesloten` and no help. The album already knows that from its saved
position, so the fix is one condition if it turns out to matter.

#### Getting back to the start of the story

Two different undos, and they must stay different — the two states they produce are what
the ordering bugs live between:

| | destroys | lands on | where |
| --- | --- | --- | --- |
| `leegmaken` | the album, on the server, plus cards and packs | the cover choice | test panel |
| the register | the remembered id in this browser, and nothing else | the ledger | on the table |

The register deliberately **leaves the album alone**. That is the whole point of it: the
returning-visitor path is the one that flashed the ledger and then the cover choice, and
testing it needs an album that already exists. A single "reset everything" control would
have made that bug untestable.

There was briefly a `resetten` button on the test panel doing the register's job. It went
when the register arrived: signing out is a real part of the page rather than scaffolding,
and a duplicate on a panel that is going to be deleted is one more thing to remember to
remove.

`leegmaken` goes through the server (`DELETE api/collections/{playerId}`) rather than
`mockDebug`, because the album is a row — clearing it client-side would leave the real one
in place and the two silently disagreeing, which is exactly the class of bug a test panel
is supposed to surface rather than create.

#### The album is chosen once

There is no re-bind, and no `PATCH`. Choosing your leather is a one-time ceremony; a
swappable cover turns it into a settings dropdown.

But **nothing is written in a way that blocks one**, and five things are deliberate
about that: `Cover` is an ordinary mutable column with no write-once guard; validation
lives once in `AlbumCovers.IsKnown` so a later `PUT .../cover` cannot drift from it;
`AlbumChoice` makes no network call of its own and takes an `onChoose` callback, so the
page decides whether a pick means create or re-bind; the name-stamping beat is a prop
(`stampName`) because a re-bind must not re-stamp a name that is already yours; and
`Album` reads `cover` from a prop on every render rather than freezing it at mount.

One thing a re-bind will have to solve rather than inherit: **a `background` built from
custom properties cannot be transitioned** — which is exactly why `.album__binding` is
its own element rather than a background on `.album__book`. So changing a cover cuts
unless two stacked layers are crossfaded on opacity.

### The album: stiff CSS 3D flip

Hand-rolled, no dependency:

- container with `perspective: 2600px`; leaves absolutely stacked with
  `transform-origin: left center`, animating `rotateY(0 → −180deg)`
- each leaf holds `.front`/`.back` with `backface-visibility: hidden`
- z-index reshuffles by flip state (see `leafZ`)

**Both faces need an explicit 3D transform.** `backface-visibility: hidden` is
ignored on an element that isn't itself 3D-transformed, so the front face — which
originally had no transform — stayed visible after its leaf rotated and showed
mirrored through the back of the page. A `translateZ(1px)` on each also stops the
two faces z-fighting.

Stiff rather than soft-curling is deliberate: bending a page needs a deformable
mesh, and the libraries that fake it read as 2010s iPad iBooks. Encarta and the
XP Help viewer flipped stiffly.

Sizing is driven by viewport **height** first: `min(40vw, 56vh × 0.78, 520px)`. A
purely width-driven book grew taller than the viewport on shorter screens and
pushed the controls below the fold.

**The page turn is on the book, not beside it.** A transparent strip down the
outer edge of each open page (`.album__turn`). Clicking the shut cover already
opened the album, so the same gesture now carries the whole navigation and there
is no chrome around the furniture. The page label stays as a single line above,
and it is what tells you where you are.

**Nothing is drawn on the strip** — no arrow, no chevron. The affordance is the
page edge warming under the cursor plus the pointer, and that is the whole
control. A glyph printed on the paper is a button the book does not have, which
is the same objection that removed the flanking arrows; drawing it smaller and
fainter would only have been a quieter version of the thing being dropped. The
cost is discoverability, which the cover-click precedent and the label above are
carrying.

- The strips are **siblings of `.album__book`**, not children. The book is
  `preserve-3d`, so anything inside it joins the 3D scene and gets depth-sorted
  against the turning leaves. Out here they are a flat overlay pinned to the
  book's edges with `50% ± var(--book-w) / 2`, which lands correctly whether the
  flex container hugs the book or is stretched wider, since the book is centred
  either way. `--book-w` is one page on mobile.
- **Not rendered while shut.** The whole cover is the target there, and a second
  hit area over part of it only competes with that.
- At either end the strip **stops lighting**, via `pointer-events: none` on
  `:disabled`. With nothing drawn there is no disabled state to style, which is
  the point: a book with no page left simply does not respond at that edge.
- The wash lives on `::before` at zero opacity, not as a `background` on the
  button — a gradient cannot transition from `none`, so it would snap.
- It fades **in** over 160ms and **out** over 90ms. Light behaves that way;
  matched durations read as a UI state toggling.
- **The strip is exactly the page's own margin and not a pixel more.** It used to
  run `clamp(28px, 3vw, 48px)` and reach a sliver into the outermost card column,
  which was free while nothing in the album was clickable — and stopped being free
  the moment cards opened the viewer, because that overlap became a dead zone on
  ~18% of an outer card on a desktop and ~25% on a phone, on the one column a hand
  naturally lands on. The width now comes from `--page-pad-x`, shared with
  `.album__page`'s padding so the two cannot drift.
  - The cost is a narrower target, paid differently on each: 22px is a comfortable
    edge for a cursor, and on a phone swipe was always the primary gesture with the
    strip only ever the fallback. So the mobile widening (`clamp(34px, 11vw, 56px)`,
    justified by a thumb having no hover to hint with) is gone too — the fallback is
    the thing that gives way.

**Left and right arrow keys turn the page too**, clamped at both ends like the
strips. On the window rather than on the book: the strips are the only focusable
thing on it, they go dead at either end, and nothing hands the book focus on load,
so a listener on the element would only answer after a click. Modifier
combinations and anything typed into a field (the name type-ahead) are left alone.
The card viewer has a window listener on the same two keys, so the album's stands
down while `focusPlayerId` is set — otherwise one press would both turn a page and
step the viewer.

Previously two `.game-button` arrows flanked the book. They worked, but they were
the one thing on the page that was not part of the book, and they cost horizontal
space on every screen for a control used at most twice per spread.

Missing cards render as ghosted silhouettes; that is the completion driver and the
whole reason the album beats a grid. Mobile drops to one page with swipe.

### The card face: Panini, no stats

The photo fills almost the whole card. Everything else is overlaid on it.

- **No plates.** Number and name are printed straight onto the card. Every boxed
  version read as a badge stuck onto a photo.
- **The photo dissolves into the metal** — full-bleed with a mask fading the
  bottom 20–40% and the top-left corner 10–32%, intersected via
  `mask-composite`. That removes the hard rectangle *and* clears the metal the
  number and name sit on, which is what allowed the plates to go.
- **Tinted toward the tier** — a tier gradient over the photo at
  `mix-blend-mode: multiply`, 42%, with `isolation: isolate` so it acts on the
  photo only. White studio backdrops pick up the metal colour. Silver's tint had
  to stop being white: multiplying by white does nothing, which is why silver
  cards read as blank paper.
- **First name only**, mixed case, `nowrap` with ellipsis. Full names ran to one
  line for some players and two for others, so the band was a different height on
  every card. Full name and nickname moved to the tooltip. **Note:** first names
  are not unique — two Daans and two Jeroens — so the photo is doing the
  disambiguating.
- **Type is DIN** (`Bahnschrift SemiCondensed` on Windows, `DIN Condensed` on
  macOS, falling back through Agency FB and Franklin Gothic). Impact read as a
  poster face and Franklin Gothic/Segoe UI as a UI font with no character.
- **Type scales with the card**, not in px: the card is a
  `container-type: inline-size` and every text element is sized in `cqw`
  (overall 20.5cqw, name 10cqw). Absolute sizes meant the ratio of type to card
  differed in every context it rendered — 0.13 on the reveal hero against 0.23 on
  an album page. Ratios are taken from the results row. This deleted fifteen
  per-context font overrides.
  - `.card__legend` was the last px holdout and was converted at the ratios it had
    on the default 150px card. It has since been deleted entirely — see "The icoon
    card" — but the lesson stands for anything added to the face later.
- No statistics anywhere, no duplicate count, no tier text **on the card**. Tier
  reads from the frame and the name plate colour. The count and the tier name live
  in the viewer — see below.

### The icoon card

**Icoon is not a fifth tier, it is the legend.** The same axis FIFA's Icons sit on:
not *better than gold* but *a different kind of card* — who someone is rather than
how good they are now. That axis already existed here as `isLegend`, so this is
that flag finally doing something on the face rather than a new concept.

It **replaces the black `legende` pill**, which was the only element on the card
that was a *label* rather than material — the same objection that removed every
plated version of the number and the name; it simply never got put through it. For
the same reason nothing on the card prints the word "icoon" either. The word still
appears in the viewer (`viewer__flag`), which is an off-face surface.

Rarity is **completely untouched**: no separate draw, no extra tickets, no new
threshold. `tierFor()`, `TicketsFor()`, `DHigh`, `PackService.Roll()` and the
ceremony are all unchanged.

Four parts and no more:

1. **The photo is graded to monochrome and warmed back up** (`grayscale(1)
   sepia(.6) contrast(1) brightness(1.06)`), instead of being tinted toward a tier
   colour. This is the whole idea; the rest exists to support it. The tier tint
   becomes the *wash* that puts the grey photo back onto the card's own material,
   at 0.58 rather than the coloured tiers' 0.42 — a grey image takes far more
   multiply before anything breaks.
2. **One near-white two-zone ground**, a warm ivory light zone in the upper right
   over a near-neutral body shading to grey-taupe at the lower left, so an icoon
   reads from the far side of a spread. The same ground on every legend.
3. **A 1px gold rule** on the edge — `rgba(176,142,66,.85)` at inset 0.
4. **The type is an olive-bronze**, `#7C6A3C`, where the tiers use a near-black.
   The reference sets its number, name and rules in metal, and that is most of why
   those cards read as pressed rather than printed.

Plus one subtraction: **the foil sheen is cut from .17 to .05.** That band is
calibrated for foil over a coloured ground; across a near-white card it is a white
diagonal stripe with nothing to justify it, and this card reads as printed board.

#### The 2026-08-10 rebuild

Everything above except the premise is newer than the first version, and the four
things that changed all changed for the same reason: **the design was judged on
five cards and broke on twenty.** Worked through in
[icoon-uniform.html](icoon-uniform.html), which renders the whole legend pool.

**One colourway, not one per tier.** The three differed in exactly four values —
the ground, the coloured ray, the white ray and the photo wash. The white ray was a
compensation value rather than a choice. The wash was pinned warm at the top on
every tier (a cool top cancels the sepia), so it could only differ at a bottom stop
the portrait mask was already fading out. And the ground differed between bronze and
gold by *saturation alone*, in the same hue family, over the ~30% of the card the
mask clears. Only silver read as its own thing, and only because warm-versus-cool
survives at album size. Three colourways that read as two is not a system.

The old rule — the tier must follow the legend down, because a gold ground on a
69-rated legend lies about him — held while the grounds were *coloured*. This ground
is near-white and makes no rating claim, so the claim is left to the overall, which
is the one hard fact on the face anyway.

**The shard fan is gone.** It existed to fill the two areas the portrait mask clears,
which would otherwise be blank stock with the name hanging in them. On the new ground
that area is no longer blank — it is the card. Rays were also the loudest thing on a
face whose whole point is quiet.

**The grade is warmer.** Sepia .34 → .6 and the wash .5 → .58. Three lighter grades
were rendered over the whole pool and all washed the faces out to grey-cream on the
paler ground. A version that kept the photo in colour was tried too — that is the
*ordinary* gold card's answer to a golden face, and it is a different card rather
than a warmer one.

**Two proposals were rejected at the last step,** both after seeing them on twenty
cards:

- **Cutting the portrait out** along the player's own outline — the reference's
  photos are cutouts, and we already ship a per-player mask for empty slots. Two
  masks cannot be fixed at all: Luc Geurts has a lump welded to his shoulder about
  70 mask-pixels wide, and eroding hard enough to cut it takes his head; Quynh Pham's
  photo is cropped so tight there is no background to remove. Across the rest it took
  more of the picture than it gave back. The portrait keeps its rectangle and its two
  fades.
- **Greying the facets** to match the reference's soft grey streaks. Ours have
  **hard** colour stops, so a grey one draws a visible seam across the top-left
  corner; white has the same hard stop and no value difference to reveal it. Grey is
  not available until the gradient is rewritten with soft stops.

Also considered and dropped: **setting the name in caps**, which the reference does.
The casing on the card does not change.

Two things about the ink that are easy to undo by accident:

- **The name divider goes metal with the type, and the engraved highlight warms
  up with it.** A bronze number over a black hairline is just a card with a
  bronze number on it, and a white highlight under a bronze rule reads as a line
  lying on white paper rather than one cut into a warm card. The rule is the ink
  at 62% rather than a separately chosen brown, so the two cannot drift.
- **A bronze per tier was tried**, back when there were tiers to vary it by, and it
  made the ink a second thing the tier moved. Moot now that there is one colourway
  — but the specificity trap it created is not. **Every icoon rule that has to beat
  a tier block is written `.card.card--icoon`**, doubled, because `card--icoon`
  sits alongside `card--{tier}` on the element and a single class would only win by
  being later in the file.

Also not a saturated gold, which was the first attempt. Gold type competes with
the metal it is printed on and loses, because the ground is already the gold; it
has to read as ink that happens to be metallic, not as more metal. The darker
brown also recovers the contrast a gold ink cost the overall — which is the one
hard fact on the face, so it is the last thing that may go quiet.

`--tier-a` and `--tier-b` **still exist on the icoon** and still feed the wash over
the photo — they are simply no longer set per tier. Keep them warm whatever else
moves: a cool wash cancels the sepia and leaves a grey card with no icoon reading at
all. That is the trap the old silver colourway spent three revisions in, and it is
still live, because the wash is the only thing standing between the grade and a
plain greyscale photo.

#### The reveal beat is gold on an icoon

The one place the green/gold split is suspended, and only here. Everywhere else
gold means rare and cool green means new, and the reveal beat's light is green
because it is the newness signal (see *New, not duplicate*). On an icoon that
reading is unavailable: the card is a monochrome portrait warmed back to sepia on
ivory, so a mint figure charging in the middle of it is the only cool thing on the
card and lands as a colour cast rather than as light — there is nothing else in
the palette for it to be light *of*.

So `--reveal-mid` / `--reveal-hot` / `--reveal-peak` / `--reveal-halo` /
`--reveal-halo-peak` are declared on `.card` in the green the rest of the pool
uses, and re-declared warm in the icoon block. The ramp is unchanged in shape and
timing: the figure still starts at `--tier-ink`, which on this card is already
olive bronze, climbs through gold instead of through green, and still peaks on a
near-white so the drain lands on paper. Only the hue moved.

**It is a yellow-gold, and the first pass was not.** That one ran the middle of
the ramp through the card's own bronze (`#9a7526`) and it came out orange. The
reason is the ground: on ivory an amber ramp has nothing brighter than itself to
be measured against, so it reads as a warm cast over the card rather than as
something on the card lighting up. Every stop was pulled toward yellow and white,
twice — the middle from `#9a7526` through `#c9a63c` to `#e0c273`, which is lit
metal rather than bronze, and the top two to `#fff8d2` and `#fffefa`, which are
white with a gold bias rather than gold. The flash field took the same correction
both times; the two are one light and cannot be tuned apart.

- **The flash field follows it, and has to.** The figure and the field it stands
  in cannot disagree for the length of the beat. It costs the note in packopen.css
  that the green field is the "new" rim's own colour, so light reaching the border
  reads as being absorbed into the glow already there — a real loss, accepted,
  because on this card the field has to agree with the card first.
- **The field's variables live on `.opener__stage`, not on the card.**
  `.opener__flash` is a sibling of the flip and the `card--icoon` class is several
  levels down inside it; CSS cannot select upward. `PackOpener` publishes
  `opener__stage--icoon` off `current.player.isLegend` on their nearest common
  ancestor. Nothing else about the ceremony changes — icoon is still not a tier,
  and the level, the build length and the gold ramp are still the overall's.
- **The "new" rim goes gold with it**, which reverses the first pass here. It was
  left green on the argument that the rim outlives the beat and has to mean one
  thing on every card — and the beat then flared gold and handed off to a green
  residue, which reads as a second, unexplained event. The rim *is* the residue of
  the charge draining (`REVEAL_RIM_AT` times it to exactly that), so it cannot be
  a different colour from the light it is left by.
  - The cost is real and accepted: "new" is no longer one colour across the pool.
    It is affordable because **the rim exists only inside the opener** — the
    reveal card, the flight and the results strip, all places where an icoon is
    one card among five and the comparison is right there. The album does not mark
    new at all, so nothing outside the opener changes.
  - **The rim's gold is deliberately more saturated than the beat's peak.** The
    beat is light over metal and can run almost white; the rim has to hold an edge
    against a near-white card, and washing it to the same value would make it
    invisible on the one colourway it most needs to show on. This is the version
    of the original objection that survived.
  - Mechanically the same idiom as the beat: `--new-rim` and `--new-glow-1..3` on
    `.card`, re-declared in the icoon block. The four stacked shadows in
    packopen.css are on `.card` descendants and inherit them, including the
    `--flip-scale` copy used during the flight, so the two cannot drift apart.

#### There is no frame, and that took five passes to establish

The reference card carries gold piping round its edge, and reproducing it went
`3.4% → 2.6 → 1.7 → 0.85 → 0` inset before being cut entirely. Worth recording,
because every step was wrong for a reason that is not obvious:

- **Any card stock left outside the gold reads as a margin *around* a frame**
  rather than as the card being framed, and the eye finds it however narrow it is.
  There is no width at which a margin stops looking like a margin.
- **A thick band is a mat, not a frame.** Two attempts widened the rule instead of
  removing the margin inside it.
- **Reserving space for it is worse still.** One pass stopped the photo at the
  frame and left the band empty; that is a mount holding a picture, which the
  reference is not.
- **Gold vanishing at a corner is tone, not width.** A metal gradient that runs up
  into near-white is invisible on ivory stock. No stop may be lighter than the
  ground it sits on, and the ring needs a contact shadow — `drop-shadow`, not
  `box-shadow`, since a mask clips box-shadows away entirely (same reason the pack
  wrapper's shadow is a filter).

And then the whole thing came off anyway, because the reference needs it and we do
not: **its card is a shaped shield with a crown and shoulders, and the piping is
what draws that shape.** Ours is a 5:7 rounded rectangle, so the piping had nothing
to draw, became the loudest thing on the face, and — being identical on every
variant — flattened the differences between them. With it gone the shards read;
they were never weak, they were being shouted over.

Do not add a frame back without also changing the card's outline. That is a
separate decision: it touches the album grid, the pack opener's FLIP and every drop
shadow in the feature.

**The 1px gold rule added on 2026-08-10 is not that object, and the difference is
the whole of why it works.** Every rejected version was a *ring inset from the edge*,
and each one left card stock outside the gold, which reads as a margin around a frame
however narrow it is — the failure that no width could fix. The rule sits at
`inset: 0` on the existing 6px radius, so there is no outside: it draws the card's own
boundary rather than hanging a frame on it. The ground is also near-white everywhere
now, which is the other half — a boundary that needed drawing, on a card that no
longer has a dark metal edge to draw it. Do not inset it and do not widen it; either
one is the rejected object again.

Also rejected along the way: a sepia version of the existing gold (a gold card with
a grey photo is a gold card, and icoons lie among rare golds in the album); a
near-black obsidian card matching the wrapper and card back (the strongest runner-up
— the only one equally good on teletext black and on the wooden tabletops — but it
will not bend to the tiers, since black-with-silver is the same object with a
different accent); and a banknote engraving with guilloche (the only candidate
carrying a *pattern*, which is exactly the argument that killed the striped and
checkerboard card backs).

Empty slots are deliberately **not** marked as icoons. A silhouette's job is to be
identically blank.

This used to have a second half — "and legends have their own pages in the album",
so you could tell from *where you were* what a blank slot was. That stopped being
true when legends were interleaved by rating (see "One sequence, not an annexe"),
and the decision is kept anyway: an unmarked silhouette now genuinely does not say
whether it is an active or an icoon. Which is arguably better — an icoon-shaped
hole would advertise a card you have never seen — but it is now a real gap in the
album rather than a redundant one, and it is the thing to revisit first if the
legends half of the book turns out to be unreadable while empty.

The full comparison — five candidates, four real faces, both frame readings, and
the live photo-grade sliders — is in
[icoon-designs.html](icoon-designs.html), kept as the record of what was
eliminated.

### The card viewer

A card in the book is ~144px wide on a 1920 screen and the photo is what
disambiguates two Daans, so the album could be browsed cover to cover without ever
really *seeing* a card. Clicking a slot lifts it out over a scrim, with
`‹ 12 / 38 ›` beneath it, arrow keys and swipe.

It exists to carry the two facts the face has no room for — the full name with its
nickname, and how deep the duplicate pile is. **Both are off-face, which is why
this does not reopen the no-stats decision.** The tooltip already carried the name
and nickname for exactly that reason; the count simply joins them.

- **The hover tooltip stays a native `title`.** A styled panel is not available
  here: `.album__face` is `overflow: hidden` under an `.album` that carries
  `perspective`, so a tooltip rendered inside the page is clipped *and* depth-sorted
  against the leaves, and one rendered outside the book is the only piece of chrome
  on a page that has none. The price is the browser's ~1s delay and nothing at all
  on touch — accepted, because the viewer is the real surface and it is one click
  away. `ownedLabel()` is shared between the two so they cannot phrase it two ways.
- **Placeholders are in the sequence and open like any other slot.** Skipping them
  would mean pressing right jumps two slots left onto the next row, so the sequence
  would stop matching the page you are looking at. And a silhouette blown up large
  is the completion driver the album exists for — it gets `nog niet in bezit` where
  the count goes, and **no overall and no tier**, because the face already prints
  `??` and greys its frame: what a missing card is worth is part of the hunt.
- **The details are typeset beside the card, never on it.** On the card this is
  precisely the statistics block that was designed out; off it, it is the caption a
  display case has. Existing stage tokens throughout, so it follows whichever of the
  ten stage directions wins.
  - **The caption column is a fixed width, not a max-width.** The panel is centred,
    so a column that shrinks to fit its text moves the panel and takes the card with
    it: browsing from "Bo" to "Jeroen van Geel" slid the card sideways under the
    cursor. The card's position has to be a property of the window, not of whose card
    is on screen. Long names wrap inside the reserved column. Vertical needs no
    equivalent — the card is by far the tallest thing in the panel, so a two-line
    caption changes nothing. Same reason `.viewer__count` has a `min-width`: without
    it the chevrons shuffle as the number gains a digit.
- **The position readout *is* the control.** `‹ 12 / 38 ›` — the counter is
  information the album genuinely cannot give you, and that is what earns the two
  chevrons attached to it their place on a page whose own navigation is an unlit
  page edge. The album's trick does not transfer: over a dark scrim there is no page
  edge to warm, so at rest there would be nothing there at all. They are type, not
  `.game-button` plates, which would be the only pressed metal on the screen.
- **Navigation clamps rather than wraps**, like the turn strips going dead at either
  end of the book.
- **The book follows the viewer, silently.** `focusPlayerId` turns to the spread of
  whatever is on screen, so closing leaves the album where you ended up with no
  close-time handling at all, and the 620ms leaf transition is never seen. It sets
  the state directly rather than calling `turn()` — a page-turn sound with no page
  visible to turn is unexplained noise.
- **Focus goes back to the card you were last looking at, not the one you clicked**
  (via `data-slot-player`), since the book has moved underneath. And a face rotated
  away is still focusable, so `PageFace` takes a `visible` flag and puts every other
  page's slots at `tabIndex={-1}` — without it, tabbing walks all 38 cards, most of
  them invisible.
- **No sound.** Browsing is not an event, and `playSlot` / `playPageTurn` /
  `playFlip` each already mean something specific elsewhere.
- **Sized from viewport height first** (`min(52vh, 76vw, 380px)`), as the album is
  and for the same reason: a 5:7 card grows 1.4× faster vertically than
  horizontally, so a width-led number runs off a short window long before a narrow
  one. The scrim's clear centre is measured in **card widths, not percentages** —
  `.opener__dim`'s lesson, which cost a round there.
- The card gets its **drop shadow back**: `.album__slots .card` kills it because a
  card in an album is mounted flat, and this one genuinely is lifted. Silhouettes
  are **not** faded, though — the per-style opacity is scoped to the book, where a
  ghost has to sit behind the cards beside it. Nothing sits beside this one.
- Considered and not done: a **flip to a detail back**, which `cardMock.ts` gestures
  at ("the nickname lands on the back of the card instead — a back that does not yet
  exist"). `.card--back` is the wrapper's neutral foil, deliberately blank and shared
  by every card in the game; giving it content contradicts that. A **FLIP from the
  slot's rect** is also deliberately absent — the machinery exists in `PackOpener`,
  but the source slot sits inside `perspective: 2600px` on a rotated face, so the
  measured rect is a projection rather than layout geometry.

### Pack opening

Five beats: wrapper → tear → the card arrives → reveal → hand-off to the row.

- **The wrapper is a sachet, and the silhouette is what says so.** The first
  version was foil paint on a 5:7 rounded rectangle — the geometry of the thing
  inside it — so it read as a card with an unfamiliar back. No amount of texture
  fixes that. Three things do: **pinked edges** (a heat-sealed bag is cut with a
  serrated blade, and nothing else in the UI has a jagged outline), a **chrome seal**
  at each end with a dark seam on the body side, and **size taken from the card** —
  see the next bullet.
  - The teeth are a **mask**, not a `clip-path` polygon: no 40-point polygon to
    maintain, it applies to the torn halves and the seals for free, and the teeth
    can be a fixed size in px so a packet on the shelf is serrated like the big
    one rather than carrying a shrunken pattern.
  - A mask clips box-shadows away entirely, so the packet's shadow is a
    `filter: drop-shadow` — which is computed from the masked silhouette and is
    therefore serrated too. Same reason the shelf's focus ring is a pair of
    stacked drop-shadows: an `outline` survived only at the tooth tips. The one
    surviving `box-shadow` is the *inset* edge line, and only because its top and
    bottom runs are hidden behind the chrome; it lives with the shared paint so each
    torn half keeps its own, and `.pack--tearing` must null it or the wrapper keeps
    a ring while its halves fly off.
- **The coloured panel is exactly one card**, and everything that is not the pouch is
  outside it: `--pack-h` is the card height plus one `--crimp` at each end, and the
  saw teeth are cut *through* those seals rather than added beyond them, which is what
  pinking shears do to a heat seal. The width takes no margin, because the panel runs
  the packet's full width. So a packet stands about a fifth taller than a card — that
  is the two seals — and is exactly as wide.
  - **The panel is the measurement, because the panel is the pouch.** A crimp is
    flattened film sealed to itself with nothing inside it, and the seam shadow under
    each seal is the film lifting over the card's edge — the same line from the other
    side. Measuring to the outer edge of the packet, or to the tooth bases, both put
    the card behind the seals; measuring the *panel* is the only version with a
    physical reason, and it was got wrong twice before it was got right.
  - The shelf feeds it `--album-card-w` — one slot of the album's grid, declared on
    `:root` in album.css precisely so a sibling of the album can read it — so **a
    packet on the table holds a card from the book.** The packets used to be
    quarter-size on a `clamp()` unrelated to the book, and next to album cards three
    times their height they read as icons of packets.
  - That parity is also what let the whole `.pack--mini` type-scaling block go: within
    ~1.7× of the hero packet, one set of `%`-based print rules serves both sizes.
  - Two knock-ons: `.album-side` widened to `clamp(148px, 24vw, 352px)` to fit two
    packets per row (at 216px the shelf was a scrolling strip one and a half packets
    tall), and the shelf's `max-height` went 46vh → 56vh so two rows fit.
  - That width is now an upper bound rather than the width — see "The book does not
    move" below.

**The book does not move.** `.album-layout` was a two-column flex row, so the book
centred inside whatever width the shelf left rather than on the stage: it sat
`(aside + gap) / 2` — about 190px at 1600×900 — right of centre while you held
packets and snapped back the moment you opened your last one. The book is the
heaviest object on the page and the only one that moved, and it moved on returning
from the opener.

The shelf is **out of flow** instead (`position: absolute`, `.album-layout` is its
containing block). `.album-main` spans the full width and the book centres on the
stage always, packets or not. Nothing is reserved on the right to balance the shelf
— the margin the book already leaves is what the packets lie in, which is also the
truer reading of "objects lying next to the book".

- The cost is that the shelf now gets the room the book leaves rather than asking
  for 352px. `--shelf-room` on `.album-layout` computes it —
  `(--stage-w - 2·--stage-pad - --book-w) / 2 - gap - 16px` — which is resolvable in
  CSS because every term is viewport-relative. Hence `--book-w` moving from `.album`
  to `:root` (same reason as `--album-card-w`), and the stage's width and side padding
  becoming `--stage-w` / `--stage-pad`: if the stage's own box and the box in that
  formula drift apart, the shelf overlaps the book. Which is exactly what happened —
  see "The shelf was overlapping the book".
- The packets shrink to keep the pile **two columns** where they can, down to a 96px
  floor, below which the shelf becomes one centred column at whatever size fits. Two
  columns is what makes it read as a pile; a few percent off card parity is a
  cheaper price than a list. Card-sized survives from ~1600px wide; 1440×900 gets
  96px packets in two columns; tall windows (a big book, a thin margin) get one.
  Those figures are for a full-bleed stage. On the tabletop stages the slab, not the
  window, is what the margin comes out of — see "The table is 1660, not 1520".
- Below the width where even one packet fits, the shelf goes back above the book in
  flow. Two triggers, because the book grows with viewport *height* as well:
  `max-width: 1150px`, or `max-width: 1400px and min-height: 1000px` — a 1300×1400
  window is wide by the first test but its book is 1040px and leaves 91px a side.
  Stacking is symmetric, so the book stays centred there too. This replaces the old
  900px breakpoint.
- The shelf is also capped to `min(56vh, --page-h)`: out of flow it contributes no
  height, so a shelf taller than the book would run down over the test panel.
- Rejected: reserving a mirrored gutter on the right (keeps the book centred, but
  spends ~700px of layout width on furniture), and animating the collapse with a
  `grid-template-columns` transition (makes the jump graceful without removing it).
- **The print is the badge and the number. Nothing else.** It carried "OPENEN" and
  the grant reason ("testpakje", "gewonnen") too, and both are gone: a wrapper does
  not caption itself with the instruction for opening it, and the reason is metadata
  about the grant, not about the product. Both crowded the badge, which is the thing
  that makes these read as rik-dev packets at all. The reason still reaches anyone who
  wants it as the tile's `title`/`aria-label`; the opener's hint says what to do.
  - A debug pack prints its guarantee instead of a count (`80+` for
    `guaranteeLevel: 2`, thresholds read off `CEREMONY_STEPS` so the print cannot
    drift from the draw). Those are always single cards, so no count is lost.
  - Everything is positioned **and sized** in % of the packet, so one set of rules
    serves the opener and the shelf with no overrides — which only works now the two
    are within ~1.7× of each other rather than 4×. Nothing may sit inside `--crimp`
    at either end: print does not survive a fold.
  - The face is one component (`PackFace`) used in **four** places: the tile, the
    sealed wrapper, and *both torn halves*. Giving each half the whole face and
    letting its `clip-path` cut through is what makes the printing tear with the
    foil; while the print lived on the parent it blinked out the instant you
    clicked and the halves flew off blank.
  - The badge asset is **trimmed to the artwork's own alpha bounds**, so its CSS box
    *is* the badge — hence `aspect-ratio: 320 / 256` rather than a square. The two go
    together: re-trim or fix the ratio if the asset is replaced, or the badge
    letterboxes inside its box and stops sitting where the percentages say.
    (The first asset was the badge on a **black field** and needed a radial mask to
    dissolve that black into the foil, or it read as a sticker stuck on the packet.
    A transparent version replaced it and the mask went with it.)
- **The card back is the back of the wrapper.** Same near-black foil, same chrome, same
  badge — you tear open a black-and-chrome packet and a black-and-chrome card comes out,
  which is what a real card product does and what makes the five beats one object rather
  than two. It replaced a brown leather field with a serif "T7" monogram, which belonged
  to neither the packet nor the site and competed with the album's binding.
  Chosen from seven rendered side by side — mosaic to the edge, mosaic vignetted, this
  one, rings from behind the badge, the table's steel rods, the playfield, and a blind
  emboss — on all three grounds it has to survive (opener, tabletop, teletekst black).
  - **No colour of its own.** The packet is coloured by type; the back is the neutral
    colourway of the same design (near enough the fallbacks in `packFoil.ts`). Every card
    shares this back, so a coloured one would either leak what is coming or contradict
    the packet it came from.
  - **No pattern.** One pool of light behind the badge and one broad foil facet, at the
    same angle as the face's `--facets` — which is also where the argument against
    repeating stripes already lives. Every patterned candidate had the same problem: a
    texture on the back has to be either meaningful or invisible, and a tiled one is
    neither. Two were tried and dropped: diagonal stripes, and a Mode-7 checkerboard.
  - **Solid black by the edge**, as the topmost background layer: clear over the middle,
    black by the border, so the light pools and stops. That is the frame — no chrome rule
    inside the art, nothing for the eye to catch on. An inset rule was tried and cut.
  - **No text.** It carried "TAFELVOETBAL" in the Teletekst face for one revision; a back
    does not need to name the product it is the back of, and it crowded the badge.
  - The vignette goes **in the background stack**, and the 1px edge is a `::before`
    element rather than an inset shadow, for two separate reasons. `.card::after` is the
    foil sheen every card carries, so a `.card--back::after` inherits that gradient and
    its `z-index` while only partly overriding them (the back keeps the sheen, which is
    right — it is the same foil as the face). And `.opener__stage .card` re-declares
    `box-shadow` for the reveal card's drop shadow, outranking anything in card.css, so an
    inset ring vanishes in the one place the back is on screen at full size.
- **The surface follows the logo, and there are no stripes.** Near-black foil with the
  packet's colour pooled in the middle of it (that is how the badge is lit), a neon
  rim bleeding off the edges, chrome seals like every frame and bar on the badge, and
  the count set like its LED scoreboard — the one place a number appears in the brand.
  The diagonal foil grain and the seal ribbing are both deleted: two sets of stripes
  made the wrapper look woven, and cheap next to the badge. What sells foil is the
  moving sheen and the side-to-side bulge, not texture.
- **One colour per *type* of packet** (`utils/packFoil.ts`), not per packet. A 3-card
  packet is always the same blue, so you learn to recognise a five before you have
  read the number on it — colour is a property of the product, as on a shelf of real
  ones. Hues come off the badge: its green (1), its blue man (3), its red man (5), the
  flame (debug-only forced packs). Fixed saturation and lightness; only the hue moves.
  - An earlier version hashed `pack.id`, giving every individual packet its own hue
    out of 21. It made the pile look varied and told you nothing, and no two packets
    were ever the same product twice.
  - One hue drives the foil, the glow and the numeral together, so a type is one
    colour rather than a colour plus an accent.
  - **The edge line is the exception: it is neutral white, not the hue.** Tinting it
    was the obvious extension of the rule above and it looked wrong, because the
    chrome seals cover the line's top and bottom runs — all you ever saw of it was two
    full-height coloured stripes down the sides, reading as a red/green/blue outline
    stuck onto the packet rather than as a printed rim. It is a highlight on a curved
    surface, so it has to be light.
- **One stage for all five beats.** The sealed wrapper is rendered *inside*
  `.opener__stage`, the stage's height is fixed at `--pack-h` (its tallest
  occupant, the packet), and the empty revealed row is rendered during the sealed
  and tearing beats too. All three are needed: while the wrapper was a sibling of
  the stage, the wrapper phase was a shorter column with no row beneath it, so
  `justify-content: center` placed the packet lower than the stage that replaced
  it and the first card rose dozens of pixels from where you clicked. You clicked
  one thing and a different thing answered.
  - The centring then gives something better than stillness for free: a packet is a
    card plus one tooth at each end, so a card centred in a box one packet tall lands
    exactly on the coloured panel the wrapper was — same width, same height, same
    place. The card rises from precisely where it was lying.
  - This is why the packet's geometry (`--crimp`, `--tooth-*`, `--pack-h`) is declared
    on `.opener` / `.pack-shelf` and not on `.pack`: the stage has to reserve the
    packet's height, and a parent cannot read a variable declared on its child. The
    tooth size has to be up there for the same reason — `--pack-h` is computed from it.
- **Tear.** The line is baked into a `clip-path` on two halves and never animates; only
  the halves move. Only the **top** strip comes off — both halves flying apart read as
  an explosion, not an opening. It tears **just under the top seal**, so what leaves is
  the sealed end; the original line ran across the middle of the face, which is how you
  open a sleeve, not a bag. `.pack--tearing`
  must strip the parent's own background **and its edge line and its seal
  pseudo-elements and its mask and `overflow`** — the first three leave the halves
  flying away over an intact wrapper, and the last two clipped the strip out of
  existence the moment it passed the top edge.
  - **The line is torn, not cut.** It was eight big regular triangles, which is what a
    serrated blade leaves — the same shape as the packet's own pinked seals, so the
    decoration was applied twice and neither read as what it was. Torn film is nearly
    straight locally (jitter ~0.8% of the packet height, ~3px, against the teeth's
    5.5%), irregularly spaced so no wavelength is legible, **drifting** overall
    (10.6% → 13.7% left to right: you tear from one corner and the line runs downhill
    away from it), with **one deeper nick** where the film caught and gave way at once.
    A single large feature among many small ones is most of what reads as torn.
  - Since the clip-path is static, vertex count is free — 24 points per half. They must
    stay **exact complements**, every point appearing in both lists reversed, or a seam
    of background shows between the halves for the first frames. The *bottom* copy is
    the one worth tuning: it sits under the card for the whole reveal, while the top
    strip is gone in 380ms.
  - Rejected: an SVG path (buys curves, but both halves then have to be exact
    complements of a hand-drawn shape) and an `feTurbulence` displacement (genuinely
    irregular, but a per-frame filter on an element that is mid-animation).
- **Entrance and flip are on separate elements.** Both animate `transform`, and a
  running animation always beats a class-driven value — on one element the
  rotation was suppressed for the whole entrance and then snapped.
- **Both faces of the flip need a 3D transform of their own** (`translateZ(1px)`), exactly
  as the album's leaves do. `backface-visibility: hidden` is ignored on an element that is
  not itself 3D-transformed, and the back face had none — so it was never culled and
  showed through the front. It went unnoticed for as long as the back was a dark brown
  field with nothing bright on it; putting the badge there made it obvious. There is no
  `perspective` in the opener, so the translate costs nothing visually and changes no
  measurement the FLIP takes.
  - Nothing inside a face should carry a `z-index` it does not need, for the same reason:
    it makes the element a candidate for promotion out of the flattened subtree that
    back-face culling depends on.
- **Hold is counted from the end of the flip**, not the start. A single "dwell"
  measured from the turn left the card readable for about 40ms.
- **Hold depends on newness only** (340ms, +340ms if new). Rarity is expressed in
  the *anticipation*, not in how long a revealed card lingers. Side effect: packs
  get quicker on their own as the album fills.
- **The travel to the row is a FLIP** — measure the hero's rect, measure the new
  slot after layout, invert and release. Nothing travelled before; the card was
  destroyed while a separate small card popped in. **Every existing slot is
  measured too**, because the row is centre-justified and re-centres on each
  addition, so the siblings snapped without it.
- The flying card carries a plain shadow instead of its glow: `transform: scale()`
  scales box-shadows, so a 42px halo drawn at 100px became 100px at 2.4× and the
  card visibly puffed up before travelling.
- **A 200ms hand-off gap** separates the outgoing card from the incoming one.
  Without it both occupy the centre at once and a face-up player appears to turn
  back into a card back.

### The shelf stays up

*On trial — built, not yet signed off.*

Four packets is a normal day (three games plus the freebie), and opening the second
one used to cost a round trip: back to the album, find the pile again, click. The
opener replaced the whole album, so the pile it came from ceased to exist for the
duration.

It does not any more. `.album-layout` is now **one layout for both states** — the
opener takes the book's place inside `.album-main` and the shelf never unmounts.
Nothing moves when it happens, and that is the entire reason this works rather than
being an idea about it: `--shelf-room` is computed from the viewport, not measured
off whatever is currently in the middle, so the packets are in the same place after
the swap as before it. **The next packet is a click where you just clicked.**

Four things had to follow from it:

- **The packet you are opening leaves the pile on the click**, not on the refresh at
  the end of the reveal. It is in your hands; the shelf shrinks at the moment you
  pick one up.
- **Tilt and sheen come off the pack id, not the array index.** Index was stable only
  while the shelf outlived nothing. Now a packet leaves the *middle* of a list that
  stays on screen, and every packet below it would inherit its neighbour's angle and
  visibly resettle — the pile rearranging itself because one was picked up. Lying
  still is a property of the packet, so it keys off the packet.
- **The pile goes inert from the tear to the last card** (`.album-side--set-aside`,
  driven by `PackOpener`'s new `onStart` against the existing `onFinished`). Dimmed
  to 0.34 rather than hidden — how many you have left is worth knowing through the
  reveal, and a shelf that vanished and came back would be a layout event at the
  worst possible moment — and `pointer-events: none`, so a stray click mid-ceremony
  cannot tear down a reveal in progress. **Not** for as long as the opener is
  mounted: a sealed packet lying on the stage is a decision you have not taken yet,
  so the pile stays live and you can still change your mind.
  - It stands down in 200ms with no delay and comes back over 420ms after a 320ms
    wait — the same asymmetry as the album's turn strips, for the same reason, plus a
    beat so the pile lighting does not compete with the results you just got. The
    pile brightening *is* the invitation to open the next one.
  - The gold build's vignette is `position: fixed` and covers the shelf for free, but
    only on the ~28% of cards that get a ceremony and only once it has ramped. The
    dim has to hold for the other 72%.
  - **"terug naar het album" stands down with it**, and did not at first. The exit sat
    live under the opener while the pile beside it was dimmed and unclickable, which
    is a control contradicting the rule the shelf had just stated — and it was also a
    hole in that rule, since `revealing` is raised by `onStart` and lowered only by
    `onFinished`: leaving mid-reveal unmounted the one component that would ever have
    lowered it, so the shelf stayed dim and inert for the rest of the session. It is
    now hidden for the length of the reveal (`.game-button--away`) *and* `closeOpener`
    clears the flag, because the flag's lifetime should be a property of the page and
    not of a callback that may never arrive.
    - `visibility`, and the row keeps its box. Unmounting it would shorten the column
      at the exact moment the first card is rising out of the wrapper, which is the
      one thing this stage is built never to do — the same reason `.opener__hint`
      renders `&nbsp;` during the tear.
    - Hidden rather than disabled, unlike the shelf. The shelf stays legible because
      how many packets are left is worth knowing through the reveal; an exit has no
      such value, and a greyed-out one invites the click it is refusing.
- **Results do not accumulate.** Each packet gets its own reveal and its own grid,
  and `key={openingPack.id}` remounts the opener, which is what already guaranteed
  it. A running total across packets would turn a pile into a session and blur which
  cards came out of which packet.

**Not below 1150px**, where the shelf is above the book in flow rather than beside
it. Up there it would push the reveal down by a row of packets, and the ceremony's
vignette clears its hole at 45% of the *viewport* — so the card would drift out of
its own spotlight on exactly the pulls the spotlight is for. Underneath is no better:
the opener is 62vh and centred, so packets below it start off screen. The stacked
layout keeps the old round trip, and loses nothing it had.

### The shelf was overlapping the book

Separately, and there all along on the tabletop stages: **`--shelf-room` was measuring
the viewport while the stage had stopped being the viewport.**

The formula is `(100vw − 2·--stage-pad − --book-w) / 2`, and `--stage-pad` was hoisted
to `:root` precisely so it could not drift from `.game-stage`'s own padding — with a
comment saying that if it ever did, the shelf would start overlapping the book. The
width was the term nobody thought could drift, because the screen stages (A–E) are
full bleed, so it was written as a bare `100vw`.

Then the tabletop family made the stage a table-sized **object** — `min(1520px, 97vw)`,
centred, with tighter side padding of its own — and neither half reached the formula.
At 1920×1080 the slab is 1520 wide and leaves the book 229px a side; the formula still
believed it had 381 and handed the shelf its full 352px cap. The shelf was sized for a
margin four times the one it was lying in.

So `--stage-w` joins `--stage-pad` on `:root`, `.game-stage` reads its `width` and
`padding` from the tokens, and `--shelf-room` subtracts the tokens rather than a
literal. The rule the original comment was reaching for, stated
properly: **anything that changes the stage's box changes the tokens, not the box.**

#### The table is 1660, not 1520

Fixing the overlap exposed the second half of the same staleness: at 1920×1080 the
corrected shelf came out at 187px, and two packets need **226** — `2 × 96` at the floor,
plus the 12px gap and 22px of padding. So the pile was correct and single-column, which
is the outcome the shelf's whole sizing ladder exists to avoid.

1520 was set when the packets were quarter-size tiles. Card-sized, the table has to
clear the book plus a shelf-sized margin on *both* sides — the book is centred, so the
margin it leaves is symmetric whether or not both hold packets:

```
--stage-w  ≥  --book-w + 2 × (--shelf-gap + 226px + 16px) + 2 × --stage-pad
```

1598 at 1920×1080, and 1644 at the same width on a taller window, where the book caps
at 1040. **1660** covers any 1920-wide window; the shelf gets 257px and holds two
columns of 111px packets.

Full card parity would want ~1781 — 93vw at 1920 — and that is the line this stays
behind deliberately. The slab exists to read as a table in a dark room rather than a
wooden wall, and two columns at 79% of a card is the cheaper price than one column at
100%, which is the same trade the packets already make against `--album-card-w`.
Re-derive from the formula if the packets or the tilts change; do not nudge the number.

One thing found while chasing this and deliberately *not* changed: a packet leans, and
flex lays out the box it would have occupied if it did not. `.pack--mini` rotates up to
4.1° and a packet is ~1.7× as tall as it is wide, so the rotated silhouette overhangs
its own box by `(w/2)(cosθ−1) + (h/2)sinθ` ≈ 6% of the width per side — 8.9px at the
largest a packet gets, and ~11.2px under the hover `scale(1.04)`. The shelf's 11px of
side padding absorbs almost exactly that and always did, which is why this was not the
bug. It is worth knowing that the figure is not slack but a fit: widening it is
subtracted twice in `--pack-w`, and past ~11px two packets no longer clear the shelf's
352px cap and the pile drops to a single column.

### New, not duplicate

Duplicates are the majority within a couple of months, so **new** cards are
marked rather than duplicates dimmed — dimming would make almost every pack read
as a failure. A cool green rim glow, distinct from the warm gold rarity glow
because new and rare are independent facts. `revealPack` returns `isNew` and
`copies`, captured before the count is incremented; the phase-2 endpoint must
return the same.

The results line reports **new** cards only ("3 nieuwe kaarten toegevoegd"), since
counting all five claimed additions the album never got.

#### The silhouette beat

*On trial — built, not yet signed off.*

A new card does not turn straight into a face. It turns into its **tier metal,
its overall and the green rim**, with the player still their own outline — and
then a shimmer crosses the card and **writes their name on, one character at a
time, in its wake**, with the portrait dissolving in so that the face and the
last letter land together. A duplicate is unchanged: flip, full card.

So the order you experience a pull in is **how good → it's new → who**, which is
the order the three facts actually matter in. It also gives "new" a moment of its
own that is not a rim quietly appearing on a card you have already finished
reading.

**The first version had no write** — a flat 150ms pause and then a dissolve — and
it read as dry, as a glitch rather than as a build. That is the lesson worth
keeping: a pause is only suspense if something is visibly under way in it. Held
time on its own is just latency, and the eye reads latency as a fault.

The timeline, in base ms from the **flip landing** (×2 for real figures), all of
it in `PackOpener.tsx`:

| from flip | for | what |
|---|---:|---|
| 0 | `SILHOUETTE_LEAD_MS` 120 | the silhouette holds alone |
| 120 | `NAME_TICK_MS` 40 × characters | the shimmer crosses, the name writes behind it |
| last character − `PORTRAIT_LEAD_MS` 60 | `PORTRAIT_FADE_MS` 180 | the portrait cross-dissolves in |
| then | `READABLE_MS` 340 | fully readable — exactly what a duplicate gets |

- **Per-character timing is constant, so a long name genuinely takes longer.**
  "Anneloes Ernest" is fourteen ticks and "Bo" is two: 1160ms against 1640ms for
  the whole post-flip window. This was raised as both a pacing problem and an
  information leak — the rhythm tells you roughly how long the name is before you
  can read it — and **accepted on both counts**. A constant rate is what makes it
  read as writing rather than as a progress bar, and the alternative is every card
  paying the longest name's price. Do not normalise the duration.
  - The cost is real and should be watched. Across the 38-card pool the printed
    name averages **9.6 characters** (14 at the top — "Petar Drandarov", "Anneloes
    Ernest", "Daan van der Beek", "Lotte Wesselman" — and 2 at the bottom), so a
    mean new card runs ~1460ms base and a 3-card pack of new cards about 4.8s
    against the 3.96s it used to. It unwinds on its own as the album fills and new
    cards get rarer, but it is at its worst for a new collector, which is exactly
    the wrong end.
  - **The short names are where to look for it failing.** The shimmer's pass *is*
    the write, so its duration is the name's: "Bo" is two ticks, which is a 160ms
    crossing at the settled multiplier, and "Ida" 240ms. Those are flashes rather
    than passes. There are only three cards under five characters (Bo, Ida, Niek)
    so it may not matter — but if it does, note that the obvious fix is a floor on
    the shimmer, and a floor decouples it from the characters and takes the wake
    alignment with it. That is a real trade, not a free one.
- **A space is revealed with the character after it**, never on a tick of its own
  (`nameGroups`, one regex). Otherwise "Daan van der Beek" pauses three times for
  nothing and the gaps tell you the word count before you can read a word.
- **The whole string is laid out from the first frame and revealed by opacity.**
  The name band is centred, so a version that appended characters as they arrived
  would grow outward from the middle and shift every glyph already on the card at
  every tick. Opacity does not affect layout; the box is reserved once and nothing
  moves again.
  - `font-kerning: none` on `.card__name` is part of this. Kerning does not apply
    across element boundaries, so the span-per-character version would be a
    fraction of a pixel wider than the plain text node the results row renders —
    and that difference lands exactly at the hand-off. At 0.045em of tracking the
    pairs a kerning table would tighten are already held apart, so it costs
    nothing and makes the two renderings provably identical.
  - No glow or colour change per glyph, only opacity. **The shimmer passing over
    the band is already the light**, and igniting each letter as well would be a
    second light source doing the same job — the objection that took the diagonal
    grain off the wrapper once the badge's own sheen was carrying it.
- **The write shimmer is green, not gold.** Same element idiom and the same
  keyframes as the ceremony's, deliberately not the same colour: gold is the
  rarity signal and green is the newness signal, which is the whole reason the rim
  is cool green rather than a second warm glow. A gold pass over an
  already-turned card would read as the ceremony continuing past its own climax,
  at every tier, on cards that never had one. It is also dimmer and narrower than
  the gold one (0.28/0.5 against 0.5/0.8, a 24% band against 32%) — that one
  crosses a blank card back, this one crosses a face you are reading, and at
  ceremony strength it washed the overall out as it went by.
- **The counter lives in `PackOpener`, not in `PlayerCard`.** The same timer that
  lights a character plays its tick, so the two cannot drift; a card that wrote
  itself would put sound and picture on separate clocks. Same argument
  `animationSpeed.ts` makes for one multiplier across JS and CSS.
- **`holdFor` takes the card now, and `HOLD_NEW_BONUS_MS` is gone.** The post-flip
  window is name-dependent, so it cannot be a constant: it is the lead, the write,
  the tail of the portrait's dissolve past the last character, and then
  `READABLE_MS`. The bonus a new card used to get is now literally the length of
  its build. Duplicates are untouched — a flat `HOLD_MS`, and skipping the beat
  entirely is what makes the beat mean "new".
- **The portrait starts 60ms early on purpose.** The face and the name are one
  fact — *who this is* — so they have to arrive as one event. Starting the fade on
  the final character leaves the name complete and the face still resolving behind
  it, which is two small endings where there should be one.
- **The withheld card is emphatically not the album's empty slot.** It keeps the
  metal, the real overall and the rim; the empty slot is the grey colourway with
  `??` in the corner. This is the same trap as switching the gold glow off at the
  turn — a build that resolves into something that looks common — and that one was
  a real bug, fixed once already. `PlayerCard` takes `reveal`, not `empty`, and
  the two must not be conflated.
  - The mask's fill inverts accordingly: the empty slot is dark cloth and needs a
    *light* figure, this is bright metal and needs a *dark* one. It is
    `var(--tier-ink)` at 80% with a light-to-dark wash over it, so the metal's
    facets carry on through the figure — solid ink read as a sticker cut to the
    shape of a person, which is the objection that took the plates off the number
    and the name.
  - That fill is scoped to `.card--reveal` and **not** to `.card--withheld`, which
    is the narrower class and the obvious place for it. `card--withheld` comes off
    the moment the portrait starts fading in, so the outline would revert to the
    empty slot's pale grey underneath a photo that is still half transparent — a
    silhouette visibly changing colour as the face arrives over it. The mask layer
    has no reason to change at all; it is simply covered.
  - `.card__portrait::after` — the tier tint — is **removed from the mask layer**.
    It multiplies over a photo, which fills the box opaquely; over a mask, whose
    backdrop is the card's own metal, it composites as a flat 42% panel of tier
    colour and dulls exactly the region the beat is drawing the eye to. The empty
    slot never showed this because it lays an opaque `#1a1a1a` underneath.
- **It sits under the ceremony, not beside it.** The gold build runs entirely
  *before* the flip and still climaxes there; this runs entirely after. Nothing
  here is level-aware — the write knows about the name, not about the tier — so
  the governing rule that a build is identical at any timestamp `t` is untouched,
  because none of this is part of that build.
- **The green rim enters with the turn**, not at `FLIP_MS` after it. The flip has
  to resolve into metal + overall + rim together, or the rim arrives as a fourth
  beat behind a card you have already read. Its 240ms bloom runs under the second
  half of the 320ms flip and is fully up as the card lands. It still persists into
  the results row, which is how you see afterwards which cards were new.
- **Both layers are mounted and the photo dissolves in on top**, rather than the
  two cross-fading. At 50/50 a true cross-fade shows the card's ground through
  both. The mask never needs to fade out at all: the photo covers it exactly,
  since the two layers carry the same portrait masks.
- **The mask is rendered eagerly here**, skipping the probe the album uses. The
  probe cannot resolve before the element's first frame — not even from cache — and
  the hero mounts a fresh card for every pull, so the album's one-frame bare plate
  would be a blink in the middle of the beat. Same argument as `eager` on the
  portrait, and the tear now preloads the masks alongside the avatars. Every player
  in the pool has one, so there is no fallback path; a 404 degrades to a
  masked-out layer, which is the bare plate again.
- **No `title` for the whole beat.** A native tooltip naming the player is
  precisely what is being written on, and the cursor is already sitting on the
  card because that is where the packet was.
- **Reduced motion and the skip both land on the finished card.** Neither ever
  enters the reveal: reduced motion and fast mode jump straight from the click to
  the results grid, and a click mid-reveal clears every pending timer and does the
  same. Cards there carry no `reveal` prop at all, so they render exactly as they
  do in the album. The `prefers-reduced-motion` block in card.css is a second
  guard behind that, and it resolves to the *finished* state — a card with its
  name on — rather than to a nameless one.

Known and pre-existing, not introduced here: during a *duplicate's* ceremony the
face-down card still carries its `title`, because `backface-visibility` hides the
front face from painting but not from hit-testing. Hovering a rare duplicate for
a second names it before it turns. New cards are covered by the rule above.

### Candidates for the payoff

**Open**, live behind the test panel's *onthulling* row.

#### What round one established

The expanding circle resolved the card in one even gesture, and an even gesture
has no payoff in it. Six candidates were compared — the shipped circle (A), a
photographic develop (B), a teletekst line paint (C), a charge-and-cool inside
the silhouette (D), a three-stage fracture (E) and a long wait resolved by one
cut (F). **D won.** A, B, C, E and F were deleted rather than parked: a switcher
with ten entries is a switcher nobody uses.

Everything below inherits these, and so must anything added later:

- **Something must accumulate.** A burst that starts and finishes at one rate
  discharges nothing. Every candidate names something that builds during the
  wait, so the end of it is a release rather than an arrival.
- **Build slow, land fast.** 60–80% of the length goes almost nowhere and it
  resolves in the last fifth. A resolution as long as its own build reads as a
  fade.
- **The card recoils.** It never reacted to its own reveal, which was the largest
  single miss of the round. Under 200ms, never more than 3%, on `.card` so the
  rim's `box-shadow` pops with it. **Keep this whichever candidate wins.**
- **The accent is single.** `rimAt` is *not* a taste figure per candidate — it is
  the frame that candidate discharges on, and the rim, the chime and the last
  visual change all land there together.
- **The eyes are the payoff.** Nothing may make the face nameable before the
  discharge. A mechanism that gives the face away halfway has already spent the
  beat.

**D · gloeien**, kept: the silhouette lights from within — tier ink to green to
white-hot — holds at the top for ~90ms with nothing else moving, and then the
light *drains* and leaves a face behind it. The only candidate that resolves by
subtraction, and the reason it won: every other reveal answers "when does the
face arrive", this one answers "where did the light go". `rimAt` 0.62, at the
drain rather than at the peak — the rim is the residue of that light leaving.

#### Round two: the shard family

The card breaks into **seven to eleven cells that tile it exactly**, and their
skins take their shapes one at a time. Shape, count and order are generated per
card from the player id, so no two players break alike and each always breaks the
same way as itself.

Three attempts got this wrong before it worked, and each mistake looks reasonable
on paper, so all three are worth keeping written down:

- **Pieces flew onto the surface** — first from off-card, then from behind the
  figure. Both read as objects being *placed* rather than as a card resolving.
  **Nothing travels now.** A skin takes its shape where the shape already is, and
  any future version that moves a cell across the card is this mistake again.
- **Every card broke into the same arrangement.** A jittered 3×4 grid always
  gives one roughly central cell ringed by the rest; the jitter moves seams a few
  percent and changes nothing you can see. Seeds are now placed by one of three
  **break modes** (`scatter`, `cluster`, `strata`) with a per-card cell count,
  because count is the coarsest thing the eye reads.
- **The seams were a glow around each filled piece.** A `drop-shadow` can only
  halo something that is already there, so it can never draw the edge *between*
  two states — and every internal edge stayed drawn on a finished card.

**The seam is the frontier.** This is the rule the whole family now hangs on: a
line exists exactly where revealed meets unrevealed. Two neighbouring cells both
filled means no line between them — not faded, *gone*, because there is no
unrevealed side for it to be the edge of. The network thins as the card fills and
at the end it does not exist, because there is no frontier anywhere.

That is why `cardPieces.ts` returns an **edge list** and not just polygons. Each
internal edge is tagged during clipping with the cell on its other side, so its
whole life is determined: it lights when the first of its two cells fills and
dies when the second does. Stroking each cell separately would draw every
internal edge twice and leave a permanent web across a finished card. Edges along
the card's own border are not returned at all — outside the card is not
unrevealed territory, and the rim already lives there.

Three implementation notes that are not obvious:

- **Seams are SVG `<line>`s with `vector-effect="non-scaling-stroke"`**, one
  `drop-shadow` on the whole `<svg>` rather than one per line. A 1.6px stroke
  needs the glow to read as light on metal instead of as a drawn border, and
  paying for it once is one composited layer instead of twenty.
- **Three elements per cell.** The outer is scheduled, the middle carries the
  clip and **never moves**, the inner is the skin and is the only thing a
  candidate may animate. A transform on the clipped element drags the shape
  around with the skin, and then there is nothing fixed for the skin to snap to.
- **A seam is scheduled by delay and duration**, not by keyframe percentages —
  every seam has different moments and a keyframe percentage cannot read a custom
  property. Its whole life is `front` to `gone`.

**Pacing.** The gaps accelerate — the first cell sits alone for the best part of
a second and every wait after it is 0.76 of the last, so the sequence ends in a
rush. `revealMs: 1700` is *derived*, not chosen: a nine-cell card spends 25% of
its motion on the first wait, which at the settled ×2 is ~860ms. Change `ease`
and it has to be re-derived or the weight goes. The beat runs ~3.4s real, about
4.4s post-flip for a new card and ~24s for a five-new-card pack — far past the
original "under two seconds" target, and a deliberate trade. Click-to-skip covers
the impatient case and the long version gets rarer as the album fills.

Schedules are **normalised**, so a seven-cell card and an eleven-cell card take
exactly as long as each other. Same rule that made the beat's length independent
of the name: one duration for everybody, whatever they broke into.

**Round three, settled: the only visible axis is granularity.** Five shard
candidates were compared and **four were cut for being indistinguishable** from
the plain snap — a skin pulling tight onto its shape, a skin flooding it from the
centre, and two that announced shapes one and three fills ahead of their skins.

That is a general result, not a verdict on those four. The seizing is over inside
a frame and the eye is on the card rather than on any one cell, so anything that
varies *how a single cell resolves* cannot be seen. **Do not propose a sixth.**

What can be seen is **how many cells there are and how fast they come** — and a
fifth candidate, the same break at seven to eleven cells rather than fourteen to
twenty-two, tested exactly that and lost on its merits. The finer break is the
better answer to the only axis that reads.

**H · scherven** is what is left: 14–22 cells, `ease` 0.87, ~4.8s of motion,
opening on a ~650ms wait and closing on ~70ms.

**`ease` is not free once the count moves.** The gaps are a geometric series, so
at the coarse break's 0.76 the sum barely grows as cells are added — doubling the
count at that ratio spends every extra shard in a tail where the last ones land
inside a single frame. 0.87 is what keeps an eighteen-cell run legible all the
way down, and `revealMs` is re-derived from it. The break costs ~6.2s post-flip
per new card and ~32s for a five-new-card pack.

#### Round four: what the silhouette is *for*

**Open.** Both mechanics now have a **silhouette-first** twin, on the same row.

Every version so far treats the silhouette as the thing in the way: it is on the
card when the flip lands, and the effect's job is to get rid of it. The twins
invert that. The flip lands on **bare metal and the overall — no figure at all**,
and what the effect *delivers* is a glowing silhouette. The face and the name
then arrive after it, as a separate final beat.

So the pull reads **how good → whose shape → who**, against the settled beat's
how good → it's new → who. The silhouette stops being an obstacle and becomes
the payload, which gives the effect something to do beyond uncovering a photo.

| | Mechanic | What the effect delivers | Where the light is | Motion |
|---|---|---|---|---|
| **D · gloeien** | charge & drain | the face | the figure's own glow | ~1.6s |
| **E · silhouet uit gloed** | charge & drain | a glowing figure, then the face | the figure's own bloom | ~2.2s |
| **H · scherven** | the break | the face | the seams | ~4.8s |
| **I · gloed uit het figuur** | the break | a glowing figure, then the face | the landed figure blooms | ~5.1s |
| **J · kaart uitgelicht** | the break | as I | full-screen bloom + vignette | ~5.1s |

##### The card-sized blob, and why it never worked

Three attempts put the light in a radial gradient on `.opener__flash`, a
card-shaped box sitting over the card at `z-index: 3`. All three failed the same
two ways, and both are worth keeping written down.

**It renders as a rectangle.** A bare `circle` gradient sizes to the *farthest
corner*, so on a 5:7 box the left and right edges sit only ~47% along its own
ramp — still around half alpha — and then the element ends. What you see is the
box: hard sides, a visible top, a soft bottom. Growing the box (one version
reached `inset: -26%`) makes the rectangle bigger, not the light softer.

**And it washes the card out.** Every bit of intensity went on top of the figure
and the seams — the two things it was supposed to be dramatising — so the card
came out flat and pale, exactly as `.opener__dim`'s note in packopen.css predicts
in gold: *"a big soft gradient with nothing dark next to it just makes the screen
faintly yellow, and past a point extra width actively lowers the card-to-surround
contrast that does the reading."*

The two answers now on the row are the two ways out of that:

- **Put the light in the figure** (E, I). A stack of `drop-shadow`s traces the
  silhouette's alpha, so the glow is shaped like a person and exists only where
  the figure does — in I, only around the shards that have *landed*, so it grows
  on its own as the break proceeds. Stacked rather than single because one shadow
  at a large radius is a smear and one at a small radius is a rim light; three
  give a falloff. Every keyframe must carry the same number of shadows or the
  list will not interpolate.
  - I puts one filter on `.card__pieces` rather than one per shard. Cheaper, but
    mainly *more correct*: twenty-two glows are twenty-two adjacent light
    sources, whereas the union of the landed shards is "the figure so far" and
    one filter over it is one light. It also blooms the seam network, which adds
    rather than muddies since the green is the same.
  - `.card` is `overflow: hidden`, so both are clipped at the card border. The
    figure is central enough that little is lost; the alternative is a second
    copy of the silhouette outside the card purely to cast light.
- **Spend contrast instead of output** (J). The gold pair in green: a
  full-screen bloom with a vignette under it, the surround pulled down as the
  green comes up, so the card is the bright clear thing in a darkened room.
  `position: fixed`, so the stage's clip cannot cut it back into a rectangle, and
  the clear centre is measured in **card widths** rather than percentages —
  a percentage radius on a viewport-sized layer tracks the window instead of the
  card. The trade is that it dims the whole page on every new card, not only on a
  rare one, and that is the thing to judge.
  - This moved `--reveal-ms` from `.opener__riser` up to `.opener__stage`: the
    fixed layers are siblings *outside* the riser, so the clock had to hang off
    their nearest common ancestor.
  - Both its ramps end at nothing rather than being faded out by a class. They
    unmount with the flash, and there is no state after the motion to hang a fade
    on — an element that unmounts at full brightness cuts the light dead.

- **E is D with the ramp starting from nothing**, which was the whole of the
  original observation and it is correct — at 0.8 opacity the figure was already
  sitting there in tier ink, so the charge only lit something you had been
  looking at for a second. From nothing, the same ramp is a reveal.
  - It needs a **plateau D does not have**: a stretch at readable green between
    arriving and going white. D ramps straight to white-hot, which is fine when
    the figure was already there to be lit, but here the charge has to deliver a
    silhouette legibly before it burns it out — and a figure is only a figure
    while it is short of white. That plateau is most of E's extra 600ms.
- **I and J are H with a silhouette inside each shard** instead of a photo
  fragment. Same geometry, same schedule, same frontier seams; only the payload
  changed, which is a `PlayerCard` decision rather than a CSS one.
  - **The face arrives with the last shard, not after it.** There was a held beat
    — `lastAt` 0.78 against a face at 0.88, so the assembled figure stood
    complete for ~580ms first — and it read as a stall. The reasoning had been
    that three stages need three slots, and it was wrong: **the last shard *is*
    the figure completing**, so anything after it is the card waiting rather than
    resolving. 0.88 and 0.90 are ~100ms apart, close enough to be one event and
    far enough that the last shard is seen.
  - They resolve **by subtraction**, like D's drain: the shard layer fades and
    the face is underneath, because the photo is rendered below the shards and
    has to be. A family resemblance worth having for a candidate whose point is
    that the silhouette was the thing being delivered.
  - **I and J differ only in where the bloom comes from.** I gives every landed
    shard its own, so the card brightens because more of it is lit — the
    intensity is a *consequence* of the progress and tracks the accelerating
    rhythm without being told to, at the cost of a composited layer per shard (up
    to 22). J puts one bloom over the card and ramps it on the clock, knowing
    nothing about the shards. If J wins, the finding is that the build need not
    be *caused* by the progress, only agree with it — and one layer is far
    cheaper than 22.
  - I's per-shard bloom sits on `.card__piece`, **outside** the clip. A filter is
    applied before `clip-path`, so a glow declared on the figure inside
    `.card__piece-cut` is cut off at the cell boundary — right for the small
    seated glow each shard already has, useless for a bloom whose job is to
    spread past the shard and add to its neighbours. Same rule that forced the
    seams onto their own element.
  - **Watch the empty shards.** A figure covers maybe half the card, so a shard
    out at a corner delivers nothing but its own seams. That either reads as the
    figure emerging within a spreading crack network or as half the shards doing
    nothing, and it is the one thing here that cannot be reasoned out in advance.
- **Hiding the ground figure is scoped to the shard candidates, not to
  `card--via`.** It was on `card--via` for one build, on the reasoning that it is
  about *being silhouette-first* — and that hid E's figure too, so E played as a
  card that lit up and then showed a photo, with no silhouette at any point. Only
  a candidate that has something else to carry the figure may take it away.

**Open: this may not be an either/or.** The idea on the table is **glow (D) up to
84 and shards from 85**, so the break is what the top of the scale gets rather
than what every new card gets. Nothing is built for it — both are whole-beat
candidates today and the switcher picks one for all cards.

Notes:

- **The name is never one of the cells.** A name broken into fragments is the
  word-at-a-time version in another costume — a name is a single fact and the
  beats spent on its own grammar are beats spent on nothing. The face arrives in
  pieces; *who it is* arrives all at once, with the last cell.
- **Only the last cell knocks the card.** Nine knocks is a rattle; one is an
  ending. Driven by `animation-delay` off `--pieces-name`, because the accent
  moves per candidate and a keyframe percentage cannot read a custom property.
- **The backfill is load-bearing.** Independently antialiased clip paths leave
  hairlines along shared edges, so the plain portrait is brought up behind the
  skins at 99%. Invisible — it is the same image — but without it a finished card
  stays faintly cracked forever.
- **A cell's own portrait must be walled off from the beat's rules.**
  `.card--reveal .card__portrait--photo` is a descendant selector and a cell's
  portrait is a descendant of the card, so those rules emptied every cell and
  collapsed the entire family into one late pop. Fixed with a reset *and* a `>`
  combinator; anything added later that selects `.card__portrait--photo` inside
  `.card--reveal` has the same problem.
- **Every shard gets the same snap as it lands** (`playShardSnap`), scheduled off
  the same `at` fractions the CSS animates from, so a sound cannot drift off the
  shape it belongs to. The run *is* the beat; one sound followed by thin ticks
  makes the opening shard the event and every other one decoration.
  - **`playShardSnap` takes no arguments, and that is the finding.** The first
    version was a small dry tick that varied across the run — quieter and
    brighter toward the end — and it sounded wrong for a reason that had nothing
    to do with the tick. **The first shard lands on the same frame as
    `playNameReveal`**, so it was heard *through* that sound's air and sparkle
    while every shard after it was heard bare. The tick was fine; the comparison
    was the bug. Fixed at both ends: the snap carries its own air, and
    `playNameReveal` takes `air = false` for the shard family so nothing stacks
    on shard one. It keeps its chime, because the rim still arrives.
  - **It is glass, and that came from removing things.** The version before it
    was air, mid grains and a 168 Hz body — the recipe for a piece of wood being
    set down. The low end is what made it wood and the broad soft band under it
    is what stopped anything ringing. Now: a 30ms contact sweeping *down* from
    9k (a hard strike is a click decaying; a rising sweep is something opening,
    which is right for the bloom and wrong here), high grains at **Q 16** so they
    ring rather than click, and `playGlassRing`.
  - **`playGlassRing` is inharmonic**, and that is the whole difference between
    glass and a tone: struck glass rings on plate modes, so the ratios are
    1 / 2.32 / 3.5 / 4.9 and deliberately not 2 / 3 / 4. A harmonic stack at
    these frequencies is a bell. Decays are 65–200ms against `playBell`'s 5.6s,
    because twenty of these land inside four seconds; a 2ms attack against its
    8ms, because glass has no rise at all.
  - **No low end anywhere**, which reverses the earlier note here. A shard *is* a
    physical event and does want contact — but the contact belongs in the click
    and the grains, and putting it in the bass made it a heavy object.
    `playNameReveal` reached the same conclusion from the other direction.
  - **A different size of glass each time**: the ring's fundamental is drawn from
    1850–2900 Hz per call, because a card breaking into eighteen pieces does not
    produce eighteen identical shards. It stays clear of a D-minor chord that may
    still be ringing because the partials are inharmonic and above 1.8k — the ear
    takes them as size, not as pitch. Same reason the ceremony's riser is pure
    air.
  - **Short layers only.** At the end of a run the snaps are 40ms apart, so
    anything with a tail smears into the next four.
  - The break is computed once into a ref in `playCard`, **not** memoised on
    `cards[cursor]`. The memo was a real bug: `playCard` schedules the sound
    before the state change that brings the card on, so it still held the
    *previous* card's cells and every snap was timed to a different break than
    the one on screen.
- Only new cards get the beat, so judge on a fresh collection (*leegmaken*) — and
  because the family breaks differently per player, judge each across several
  cards rather than on one pull.

### The rare ceremony: graduated across the gold band

Four levels, entered at **75 / 80 / 85 / 90** overall — so roughly 28% of cards
get some build-up. (Moving the entry to 80+ would make it 18%; still open.)

**The governing rule: the build must look and sound identical at any timestamp
`t`, regardless of level.** Level is expressed by *how long it goes on*, never by
what it does. At `t = 900ms` an 80 and a 90 are indistinguishable; the 80 simply
stops there. This is what makes the build suspenseful rather than a label — you
learn the tier by the build *failing to end*.

That rule is load-bearing and easy to violate. Anything level-specific — a
brighter hue, an extra element, a different curve, a distinct sound — breaks it
instantly, and every early attempt did.

Two phases:

1. **Shimmer** — a single golden pass across the card, `CEREMONY_SHIMMER` (~0.256
   of the full build, 680ms nominal). Identical at every level, including level 1,
   which is shimmer *only*.
2. **Radiation** — light building out from the card's own edge, starting the
   instant the shimmer ends. Levels 2–4 differ only in where they cut off
   (`CEREMONY_STEPS` in `mock/cardMock.ts`: ~0.256 / 0.504 / 0.752 / 1).

Both are **derived from a nominal ms split** (`CEREMONY_SHIMMER_MS` 680 +
`CEREMONY_RADIATE_MS` 1980) rather than written as fractions, because the two
phases have to be tunable independently and with bare decimals they are not:
stretching the radiation means raising the total, lowering the shimmer fraction by
the exact compensating amount, and re-spacing all four steps. The ratios are still
what ships — the debug panel retunes the total at runtime and the proportions have
to survive it.

The radiation was **stretched 1.5×** (1320 → 1980 nominal) with the shimmer left
at 680. Slowing the shimmer too just makes the highlight crawl across the card;
the radiation is the phase that carries the suspense.

Implementation notes, each of which cost a round:

- **One shared CSS animation, frozen rather than shortened.** All levels run the
  same `opener-glow-grow` ramp, delayed by `--shimmer-ms` and running for
  `--radiate-ms`; `animation-play-state: paused` stops it wherever the level
  ends. Giving each level its own duration would rescale the curve, so an 80 at
  `t` would look like a 90 at `2t` — visibly wrong, and exactly what the rule
  forbids.
- **No hard gold edge at any level.** Every shadow is blurred. Zero-blur rings
  announced the tier the moment the card landed.
- **The riser's envelope is shaped for the longest window and cut early**, not
  compressed. `playRareRise(fullMs, actualMs)` computes ramp targets
  analytically — `peak * Math.min(1, actual / rampEnd)` — because reading
  `gain.value` on an automated param returns the value *now*, not the ramp's
  future value, which gutted the riser at every cutoff.
- **The riser's noise source is looped**, because the shared buffer in
  `getNoise` is three seconds and a level 4 radiation is 3960ms real at the ×2
  multiplier. A `BufferSource` that runs off the end of its buffer goes silent
  and its later `stop()` is a no-op, so the air cut out a second before the card
  turned while the gain ramp climbed on — audible only on 90+, since level 3 is
  2640ms and still fits. This appeared when the radiation was stretched to 1980
  and is the reason to loop rather than to grow the buffer: the fix holds
  whatever the build length becomes.
- The glow **survives the turn**. Switching it off at reveal meant all that
  build-up resolved into a card that looked exactly like a common one.
- **The build reads by contrast, not by output.** The gold was pushed brighter and
  then wider and read as clearer for neither: a large soft gradient with nothing
  dark beside it just tints the screen, and past roughly 200px the outer halo
  lowers the card-to-surround contrast that actually does the work. What fixed it
  was a vignette (`.opener__dim`) ramping the *surround* down on the same clock as
  the gold comes up. Before reaching for more brightness or more spread again,
  check whether the answer is less light elsewhere.
  - It shares the bloom's `glowing` / `faceUp` / `blooming` flags rather than
    holding state of its own, so the two halves cannot drift apart at the freeze
    or the fade. Its clear centre is sized in `--pack-w` units, not percentages —
    a percentage radius on a viewport-sized layer tracks the window instead of the
    card, clipping the card's corners on a short window.
- **Gold motes drawn inward** (`.opener__motes`), added on top of the vignette as
  the third screen-level layer. The bloom and the vignette are both smooth
  monotonic ramps with nothing for the eye to follow, which is the deeper reason
  pushing either one harder kept hitting diminishing returns; the motes are the
  only part of the build with trackable motion.
  - This is knowingly close to the line that killed the sunburst beams. It stays
    the right side of it by being small, sparse (14) and slow, and by being the
    *only* moving element. Judge it before adding anything else — if the build
    ever reads as busy, this is the layer to cut first.
  - **The stream drains rather than fading out.** No new mote sets out, and the ones
    already travelling finish their run into the card and are absorbed. Fading them
    out mid-flight instead threw away the one thing the layer is about.
  - **The drain begins on the turn itself.** Delaying it was tried twice and
    abandoned both times: at the flip's *end* it collided with the bloom's recession
    and was never really seen — worst at level 2, where the ramp only reaches about a
    third to begin with — and at the flip's midpoint it still read as an afterthought.
    - An early drain did at first make **the flip read as faster than its unchanged
      640ms**, which is worth remembering as a general trap: nothing about the flip
      had been touched. But the cause was the *contrast* between a slow stream and
      a sudden rush, not the timing. Once the motes flew faster of their own accord
      the gap narrowed and the early drain was fine — the fix was the base speed,
      not the delay.
    - `MOTE_DRAIN_RATE` is 3, bounded by the card's departure: every mote must be
      absorbed before the card leaves for the row, or it is converging on nothing.
      Worst case is the longest *flight* in `MOTES` (~183) on a mote that has just set
      out — 61 at ×3 — so the layer empties well before the flip lands, and well inside
      the 660 a duplicate stays up for. `MOTE_DRAIN_MS` (70) has to stay above that
      figure, or the fade starts while the slowest motes are still travelling.
  - **The motes' fade is its own flag (`motesOut`), not `blooming`.** Sharing
    `blooming` is what made the drain invisible: the bloom and vignette must recede
    the moment the card turns or they hang over an empty stage, which put a 620ms
    fade directly on top of the drain. The motes need the opposite — to outlive that
    recession long enough to finish travelling. The fade now trails the drain and is
    only a safety net, since a drained mote is already held at zero opacity; it does
    the real work only on the fallback path where nothing drains.
    - **This is the one part that cannot be CSS.** Letting an in-flight iteration
      finish means capping the count at "elapsed, plus this one", and CSS cannot
      read how far along a running animation is. Reaching for
      `animation-duration` instead is actively wrong: it preserves elapsed *time*,
      not progress, so every mote jumps to a new spot on the path. The Web
      Animations API is a browser API, not an animation library — the no-library
      rule is intact and nothing is added to the bundle.
    - `fill: 'forwards'` on the capped animation is **load-bearing**. A finished
      unfilled mote reverts to no transform and lands dead centre on the card, with
      nothing driving opacity — fourteen solid dots in a heap on the player's face.
      `.opener__mote { opacity: 0 }` guards the same failure a second way.
    - Considered and rejected in its place: **motes bouncing off the card** at the
      turn. It would have collided with `.opener__particles`, the outward burst
      that fires in the same instant and is top-tier only — doubling it up at
      level 4 and handing levels 2–3 something close to the top tier's payoff. No
      rule forbids it (it is after the turn, where level-specific effects are
      already allowed) but it spends the top tier's distinctiveness, which is much
      harder to win back than a bounce is to add.
  - **Only the intensity ramp freezes at the turn; the motes keep drifting.** The
    ramp freeze is load-bearing — it is what makes an 80 a 90 that stopped early.
    Mote velocity carries none of that, because the build is already over by the
    turn, and pausing it too left a field of dead dots sitting still through the
    whole fade. Anything still visible should still be moving.
  - **`--mote-cycle` is one variable feeding both the duration and the delay.** The
    delay is a fraction *of a cycle*, used to spread the motes along the path, so a
    delay computed against a different length than the animation runs for bunches
    them up. Overriding the duration alone on the `nth-child(3n)` third did exactly
    that.
  - **Nothing about a mote may be uniform across the set — uniform is what produced
    a visible rotating wheel.** The scatter lives in `MOTES` in `PackOpener.tsx`,
    computed once at module load from a `fract(sin(n) * large)` hash.
    - **Velocity is set and the duration derived from it** (`MOTE_SPEED`, ±8% per
      mote), not the other way round. Drawing cycle length and distance independently
      let a long cycle pair with a short distance, and the resulting 1.5× spread
      between slowest and fastest read as a few motes *lagging* rather than as
      variety. Distances still differ, so cycles are still all distinct.
    - The killer was **shared cycle lengths**: two durations across 14 motes, with
      phase offsets spaced evenly across the cycle, means the same ring of motes at
      the same radii comes round again every cycle. All 14 durations are distinct
      now, so the configuration only repeats at their common multiple — never,
      within a build.
    - Dealing angles out in **coprime strides did not help**, and the reason is
      worth keeping: every angle was still used exactly once, so the ring stayed
      evenly covered, which *is* the problem. Replaced by the **golden angle**
      (137.508°), which never lands on a regular polygon at any count and puts
      consecutive-in-time motes far apart.
    - Start distance and phase are jittered too, so they neither appear out of one
      ring nor set out in an even procession.
    - The hash is **deterministic and module-level on purpose**. `Math.random()` in
      the render would deal new values on every state change, and since these become
      custom properties the keyframes read, a mote mid-flight would jump to a new
      angle and distance each time `faceUp` or `motesOut` flipped.
  - **Speed comes from the flight fraction, which is why cycle length and flight speed
    are separate numbers.** A mote flies over the first **30%** of its cycle
    (`opener-mote-in`, `MOTE_FLIGHT`) and spends the remaining 70% landed and
    invisible. Velocity is distance over *flight time*, so the flight can be shortened
    — making a mote fly faster — without touching the cycle, which is what governs how
    often the stream repeats.
    - **`MOTE_SPEED` is the knob for plain speed, and it is now 12.4** — 2.5× where it
      sat before, asked for directly. Raising it scales the cycle down with it (mean
      ~465, from ~1160), so the density is untouched: the same ~30% of the motes are
      airborne, they just cross faster and set out again sooner. Use this rather than
      the flight fraction unless the intent really is to trade density for speed.
    - **Lowering the flight fraction thins the stream**, since only that fraction of
      the motes is airborne at any moment. `MOTE_COUNT` has to rise to compensate —
      it went 14 → 24 when the fraction went 0.45 → 0.30, holding about 7 motes on
      screen. Speeding them up without raising the count just empties the screen.
    - Phase offsets stay spread across the **whole** cycle, not confined to the
      flight window. Confining them puts every mote on screen at once on the first
      frame and then leaves a gap behind them — a pulse rather than a stream.
    - The other two levers were both tried and both cost something. **Shortening the
      cycle** (to a mean of 626) makes the stream churn and repeat sooner — it is not
      the same thing as flying faster, which is the distinction the whole layer turns
      on. **Buying speed from distance** ran `farK` to 4.2, and a mote is fully faded
      in only a fifth of the way along its path: past about 2.8 card widths that point
      falls outside a 1080-tall window, so motes travelling vertically stopped fading
      in and popped into view at the screen edge. Distance is capped by the viewport,
      not by taste.
    - For the record, since it looks like a free knob: keeping the current velocity at
      the original cycle length through distance alone would need `farK` 5.93 — motes
      starting 1410px out and not visible until 1137px. There is no version of that
      which works.
  - `--mote-t` is a *unitless fraction of a cycle* rather than a finished delay, so
    the spacing still holds when every mote carries a different cycle length. Both
    the duration and the delay must use the same fallback value, or a mote missing
    its inline cycle spaces itself against a length it does not run for.
  - `--mote-cycle` comes from JS and is therefore already through `ms()`; the CSS
    cannot apply `--anim` to it a second time.
  - Reduced motion drops the layer entirely rather than stilling it: with the
    drift removed the motes collapse onto their origin and heap up at the card's
    centre.
- The bloom is **class-driven, not a keyframe**: an animation with `forwards`
  pins the final opacity so there is no way back. A transition goes both ways.
  It lives in its own `blooming` state, because `glowing` persists past the turn
  by design and the screen-filling glow must not — it would hang there lighting
  an empty stage while the card travels.

`guaranteeTier` / `guaranteePlayerId` / `guaranteeLevel` on `Pack` and
`DrawOptions` exist purely so a level can be summoned on demand while tuning.
They are mock-only and go away with phase 2.

### Pacing: two knobs, and everything derives from them

At three games a day this plays ~1,000 times a year, so it must be skippable and
brisk. A click anywhere always jumps to the end state.

- **`DEFAULT_SCALE`** (`utils/animationSpeed.ts`) is a duration multiplier,
  **settled at 2**. Published to CSS as `--anim`; every CSS duration is
  `calc(Xms * var(--anim, 1))` and every JS timing goes through `ms()`. The two
  layers cannot drift apart, which they would if tuned separately — a flip
  starting before the card finished arriving, a dwell ending mid-transition.

  Worth knowing before editing any timing: **every base constant in
  `PackOpener.tsx` and every duration in the CSS is written at half its real
  length.** `FLIP_MS = 320` turns in 640ms; `SETTLE_MS = 460` travels in 920ms.
- **`DEFAULT_CEREMONY_MS`** — **2660**, so **5320ms at ×2**. This is the length of
  the *longest* build, level 4; every other level and both phase boundaries are
  fractions of it, so raising it slows the shimmer, the radiation and all four
  cutoffs together. Published unitless as `--ceremony` so CSS can do
  `calc(var(--ceremony) * 1ms * var(--anim))`.

  It mirrors `CEREMONY_SHIMMER_MS + CEREMONY_RADIATE_MS` in `mock/cardMock.ts`,
  which is where the split is decided. **Change it in both places** or the pacing
  printed in the debug panel stops matching what actually plays.

  **Settled, not provisional.** Chosen on the slider and then baked in. The four
  builds it produces, in real time at the ×2 multiplier:

  | level | entry | build | of which radiation |
  |---|---|---:|---:|
  | 1 | 75+ | 1360ms | — (shimmer only) |
  | 2 | 80+ | 2680ms | 1320ms |
  | 3 | 85+ | 4000ms | 2640ms |
  | 4 | 90+ | 5320ms | 3960ms |

  A 90+ now holds for over five seconds before it turns. That is a long time for
  something that plays ~1,000 times a year, and it is only tolerable because a
  click skips straight to the end state — if the skip ever stops working, this
  number is the first thing to reconsider.

One knob for both sound and visual is deliberate: a slider that only slowed the
audio would drift out of step with the glow, and the riser has to *end* exactly
as the card turns.

Both are exposed as sliders in the phase-1 test panel. `prefers-reduced-motion` is
honoured throughout.

### Sound: synthesised, no assets

WebAudio only — no binary files to author, host or cache-bust. Master gain stage
plus a shared convolution reverb built from a decaying noise impulse; sustained
swells overlap and would otherwise clip.

- **Physical sounds are granular.** A tear or page turn is dozens of tiny
  irregular crackles with randomised playback rate, buffer offset, filter
  frequency and gain. A single filtered noise burst with a smooth decay is
  precisely what "fake" sounds like.
- **A turn is three events: peel, arc, settle.** The arc is `playSwish`, whose
  band rises *and falls again* — a one-way filter ramp reads as a fade rather
  than as something passing you, which is why the first page turn sounded like
  paper being crumpled nearby instead of a page going over. It also has **no
  boom**: a sheet has no low end, and the 120 Hz sine that used to land on it
  made every turn sound like the book being shut.
- **The cover has its own sound** (`playCoverTurn`), because a cover is a stiff
  board on a glued spine, not a big page: a stick-slip creak instead of a peel,
  an arc an octave and a half lower over twice the time, almost no fibre rustle —
  and it is the one turn that *does* get a boom, because it lands. Fires on the
  move between the shut book and the first spread in either direction, which is
  leaf 0 on desktop and page 0 on mobile.
- **The shimmer phase has its own sound** (`playShimmerSweep`), scaled to the
  shimmer length so it lands on the phase boundary.
- **The face reveal is a rising arpeggio** (`playNameReveal`): D5 · F5 · A5 · D6,
  45ms apart, rising in gain into the accent, over an air sweep and with the
  sparkle released on the landing. Chosen over three others — the shipped single
  chime, a FIFA-style walkout (sub and crowd) and an MTG-style foil sheen (no
  attack anywhere).

  The chime it replaced was **one struck note held back to the accent**, written
  when the card resolved by *expanding*. It does not: it charges, holds, and the
  light **drains**. A single strike announces an event; a run builds into one,
  which is the shape the picture has. Its pitch was also inherited rather than
  chosen — D6 over D5, high above the payoff's D4 bell so it stayed tonic — so the
  run keeps that for free by being **a D-minor arpeggio**, the payoff's own chord.

  The reverb send **opens as the run climbs**, 0.72 → 1.02. Uniformly wet, the
  lead notes smear into the one that matters; opening it puts the dry attacks at
  the bottom where the rhythm is and the space at the top where the payoff is, and
  the last note's tail is still ringing under the drain.

  Nothing in it goes below ~700 Hz. A boom is mass and what happens to this card
  is light, which is exactly what the walkout candidate was there to test — it
  read as heavier than the picture every time.

  The first version of this comparison was **not an audition at all**, and that is
  the most useful thing about it: all eight entries ended on the same two
  tubular-bell partials, so the loudest layer was common to every option and only
  the garnish differed. They sounded the same because they nearly were. Whatever
  marks the accent is open; a bell is one answer out of an enormous space.
- **The build-up is a reverse cymbal** — a highpass noise swell over a clean sine
  sub, no pitch movement. Chosen by ear from ten candidates; everything that
  climbed read as thin or busy, and a sawtooth sub in the 38–190 Hz range through
  a low lowpass sounded like flatulence. Its length comes from the caller so it
  tracks the visual build including the multiplier — a musical hit should not
  stretch, but a build must.
- **The payoff is one chord in D minor, gaining a voice per level** — the audio
  mirror of the visual rule. All four levels are the same harmony, so they build
  on each other rather than being four unrelated stings (which is what they were
  before: rooted in G, A, A and D).

  | level | swell | choir |
  |---|---|---|
  | 1 | — (bell only) | — |
  | 2 | A2 · D3 | — |
  | 3 | D2 · **F2** · A2 · D3 | F3 · A3 · D4 |
  | 4 | D1 · D2 · **F2** · A2 · D3 · D4 | D3 · F3 · A3 · D4, then D4 · F4 · A4 · D5 |

  The third is **F natural**, not F♯. Major read as cheerful; minor reads as
  monumental. Levels 1 and 2 were signed off on intensity and must not get
  quieter. The bell holds D4 at every level.
- Built from an impact, a sub, an inharmonic bell (tubular-bell ratios, so it
  reads as cast metal, tails lengthened by ~⅓), a filtered saw swell with a
  *linear* attack, and a **formant choir** — parallel bandpasses at 720/1240/2680
  Hz with per-voice vibrato, which is what makes it sacred rather than merely
  loud. Level 4's second choir enters an octave up and late, so the sound keeps
  rising after the impact.
- **Removed and not to be re-added:** any single-voice swell on level 1 (reads as
  a flute), and `playDrop` — a sawtooth bending 210 → 34 Hz into level 4's hit,
  which read as a low sucking note.
- Default on, persisted mute in the header.

#### Writing the name: `playNameTick` and `playNameSettle`

> **Neither of these exists, and neither does the per-character write on the card.**
> `utils/sounds.ts` has no `playNameTick` and no `playNameSettle`; the reveal is a
> single keyframed text node (`PlayerCard.tsx` — *"One text node, everywhere,
> including the reveal"* — driven by `reveal-charge`/`reveal-cool` in `card.css`), and
> the per-word spans it briefly had were reverted. This section describes a version of
> the silhouette beat that was rolled back and the rollback was never written down
> here, which cost a round of confusion when the album's foil stamping went looking
> for something to reuse. It found nothing, and `playFoilStamp` was written instead —
> to the constraints below, which are the part of this section that is still good.
>
> Left in place rather than deleted because the reasoning is exactly right and will be
> wanted again if the per-character write comes back. **Read it as a specification, not
> as a description of the code.**

The beat was silent in its first version, and that is most of why it read as a
glitch: nothing was happening and nothing said anything was about to. It now has
one tick per character and a settle on the last, and the constraints on those two
sounds are the whole design.

- **Granular and non-pitched, both of them.** This is the constraint everything
  else follows from. The ticks fire up to seventeen times *underneath* the D-minor
  payoff, and any pitch either agrees with that chord and joins it or disagrees
  and fights it. Noise can do neither, so a run of ticks stays texture rather than
  becoming a counter-melody. It is also why `playNameSettle` has no `playBoom`
  under it — low end would make it a hit, and the payoff is the only climax the
  reveal has.
- **The quietest sounds in the module**: 0.028 and 0.038, against `playSlot`'s
  0.05 and `playFlip`'s 0.1.
- **A tick is two grains, not one.** A single grain is a click, and a click is
  what synthetic sounds like — the same reason the tear and the page turn are
  clouds rather than bursts.
- **The settle is the same grain, darker and longer** (1400–4200 Hz against
  2400–5200, ~30ms against ~15). Lower and wider is what closes a phrase. A
  resolve, not a sting.
- **Nothing was added at the flip**, and the payoff has not moved. The ticks begin
  `SILHOUETTE_LEAD_MS` after the card lands — 120 base, so 240ms — which puts the
  first one well inside the chord's decay rather than under its impact. On a
  common card the flip's own `playFlip`/`playSlot` have decayed by ~165ms, so the
  ticks are the only thing there and are not competing with anything either.
- **Identical at every ceremony level**, like everything else after the turn. The
  ticks know about the name, not about the tier.

This replaces the previous note here, which recorded that the beat was
deliberately silent and that the fallback if it needed something was to move
`playSlot()` off the flip. It needed something; this is it. `playSlot()` was left
where it is — it belongs to the flip, not to this beat — but if the two now read
as redundant on a common new card, that is still the thing to drop.

## Frontend changes

All under `anago-leader-board-ui/src/`.

### Styles in plain CSS, not JSS

`src/styles/game.css` (game-screen shell), `card.css`, `album.css` (book and
flip), `packopen.css` (the five beats), `viewer.css` (the enlarged card),
`ledger.css` (the signing-in book), `albumchoice.css` (the five shut albums).
Deliberately **not** `@mui/styles` — JSS is deprecated and unpleasant for
multi-step keyframe sequences, and plain CSS is already an established pattern via
`App.css`.

New components: `components/GameShell.tsx`, `Album.tsx`, `PlayerCard.tsx`,
`PackOpener.tsx`, `PackTile.tsx`, `PackFace.tsx`, `CardViewer.tsx`,
`SigningLedger.tsx`, `LedgerCorner.tsx`, `AlbumChoice.tsx`.

`PlayerPicker.tsx` **is deleted.** It was the header's type-ahead; the ledger took over
signing in and the register took over signing out, so there was nothing left for it to do.
Its matching logic — substring over the whole stored name, eight results, Enter takes the
first — lives on in `SigningLedger`, which is the part worth keeping.

`utils/albumLeather.ts` holds the five stains and the custom properties the book's
outside is painted with, following `utils/packFoil.ts` exactly. It is the only place
the leather colours live; `album.css` reads them with bordeaux fallbacks, so a cover
rendered with no stain set is the book as it was before there was a choice.

**One binary asset**, and only one: `src/assets/rik-dev-logo.png`, the mark printed on
the wrapper. Imported through webpack rather than dropped in `public/`, so it is
content-hashed and cannot go stale. It is the transparent-background original, cropped
to its alpha bounds and scaled to 320×256 — the 1024² source is 1.6 MB and the badge is
never drawn wider than ~140 CSS px.

Sound effects are **synthesised with WebAudio** (`utils/sounds.ts`) rather than
loaded from files — no binary assets to author, host or cache-bust, and short
synthetic blips suit the era better than samples. The opening click satisfies
autoplay policy, so no unlocking dance is needed.

### Do not regenerate the NSwag client

[clients/server.generated.ts](anago-leader-board-ui/src/clients/server.generated.ts)
is 1727 generated lines and the `.nswag` config embeds a stale swagger snapshot,
so regenerating risks breaking existing calls. Add a hand-written
`clients/cardsClient.ts` — an interface in phase 1 backed by
`mock/cardMock.ts`, swapped for plain `fetch` against
`window.TAFELVOETBAL_SERVER_URL` in phase 2. Nothing generated gets touched, and
since identity is now a player pick rather than an email on the game form,
`GameForm` needs no changes at all.

### New collection page

`pages/CollectionPage.tsx`, route `/collectie` in
[App.tsx](anago-leader-board-ui/src/App.tsx#L23), nav entry in
`components/NavBar.tsx` (needs its own teletext colour alongside the existing
red/green/yellow/cyan).

- Player picker as a **type-ahead**, remembered in localStorage. Reuse the
  `getPlayers(true)` fetch pattern from
  [GamesPage.tsx:871-982](anago-leader-board-ui/src/pages/GamesPage.tsx#L871-L982)
  but not its `Select` — see the impersonation note above.
- Gate on ≥5 games for the picked player (`MIN_GAMES` in `mock/cardMock.ts`;
  `MinGamesForCards` in `appsettings.json` once the backend exists — it belongs
  next to `DHigh`, since the two are tuned against each other).
- Unrevealed packs, the pack opener, the album, legends progress — see the
  Presentation layer above.
- Reuse `hooks/useIsMobile.ts` for the single-page mobile album.

### Worth fixing while in there

[`saveGame`](anago-leader-board-ui/src/pages/GamesPage.tsx#L507) swallows
exceptions, so a failed submit looks identical to a success. That becomes
actively misleading once four people are expecting packs from it.

## Build order: UI first, on mock data

The presentation layer is the risky, opinion-heavy part; the backend is
comparatively mechanical. So **phase 1 is frontend only, with no backend written
and no API called for cards.**

### Phase 1 — the whole UI against mocks

`src/mock/cardMock.ts` holds everything the UI needs:

- The 38 pool players with real names and ratings, pasted from
  `GET /api/leaderboard`.
- The piecewise rating scale and the ticket weighting, ported to TypeScript
  (~30 lines).
- `drawPack(size, opponentIds?)` — weighted sampling without replacement,
  including the 2× opponent bonus.
- A few canned unrevealed packs, and a partially-filled collection so
  silhouettes, duplicates and legends progress all have something to render.

Implementing the *real* weighting in the mock rather than uniform random matters:
the entire point of phase 1 is judging whether a rare pull **feels** rare, and it
cannot if Petar shows up as often as Daria.

**The seam that makes this disposable:** define the `cardsClient.ts` interface now
and implement it twice — mock first, HTTP later. The components import the
interface, never the mock, so switching to the real API is a one-file change and
no component is touched. The TS scale/weighting is throwaway once the C# version
exists; only the display code survives.

**That bet paid, and is now settled.** The claim endpoint deleted the mock
implementation, the sandbox and every fixture in one go, and **not one component
changed** — the whole of it was `cardsClient.ts`, the fixture half of `cardMock.ts`,
and two lines in `CollectionPage` where `owned` went from cards to counts.

Avatars need no mock. `public/config.js` already points at the deployed API, so
`/api/player/{id}/avatar` serves real photos while everything else is fake.

Order within phase 1: `XpWindow` → `PlayerCard` → `Album` with the flip →
`PackOpener` last, since its feel is what needs the most iterating.

### Phase 2 — backend

1. ~~`CardRatingCalculator` — the piecewise scale and ticket weighting as pure C#
   functions. Port from the phase-1 TypeScript.~~ **Done**, with 50 unit tests: the
   anchors, the clamp at both ends, monotonicity across the whole range, the
   midpoint-rounding trap, ticket continuity at the hinge, and every player in the
   published odds table landing on the overall it lists. The 2.600 sum check waited
   for the draw, since it is a property of that rather than of the weighting, and
   lands in `PackTests` with step 5.
2. ~~Peak tracking and `GET api/cards/pool`, so icoon cards show real people.~~
   **Done.**
3. ~~The first migration, `CollectionService`, `CollectionsController`.~~ **Done** —
   `PlayerCollection`, the collection read and the create, plus the opening sequence
   that hangs off `album: null`.
4. ~~Swap the mock client implementation for the HTTP one.~~ **Done.**
5. ~~`PackClaim`, `CardInstance`, `PackService`, and
   `POST api/collections/{playerId}/packs/{packId}/claim`.~~ **Done**, and with it the
   whole of the sandbox, `mockCardsClient` and `cardMock`'s fixture half. The file
   survives as presentation only — see "Where this stands". The **test panel does not
   die with it**, against what step 5 originally assumed: its pack buttons are the
   first caller for the gift endpoint, so they stay as stubs rather than being deleted
   and rewritten.
6. `PackGift` and `POST api/collections/gifts` — present a pack to a named player or
   to everybody, and wire the test panel's buttons to it. The guarantees in
   `GrantOptions` need a home in `PackService.Roll`. This is the only grant-shaped
   table in the design, because a present cannot be derived from anything that
   happened.

Note what the collection slice cost that was not foreseen: `CardPoolService` needed a
second `GetPool` overload taking an already-replayed roster. `GetLeaderBoard()` is not
cached, and the collection endpoint needs the pool *and* the picked player's game
count — which cannot come from the pool, because the pool filters out exactly the
under-gate player the games gate has to describe. Without the overload every
collection read paid for two full replays.

Splitting 2 out ahead of the migration was worth it beyond the icoon pages: it put
the scale in front of real data early, which is what turned up the midpoint
rounding trap, the wrong "highest rating ever recorded" claim, and the fact that
the 5–9 games band in the legends pool is populated after all.

## Verification

### Phase 1 — the visual checks

Written when `npm start` on its own was enough. It no longer is: the mock client is
gone, so all of these now need the API running and a signed-in player with an album.
The checks themselves are unchanged and are still the regression list for the
presentation layer.

1. `/collectie` renders full-bleed with no OS chrome and no width cap; nav,
   leaderboard, games and player pages are untouched teletext.
2. Flip forward and backward through all 4 spreads — z-index stays correct
   mid-flip, no flicker, no leaf showing through another.
3. Missing cards are silhouettes; a duplicate occupies no second slot and shows
   no count **on the card face** — only in its tooltip and in the viewer.
3a. **Click the outermost cards of both open pages, at their outer edge.** The
    viewer opens every time — this is what the turn strips were narrowed for, and
    the regression to watch. The strips must still light on hover, still turn, and
    still go dead at the first and last spread.
3b. In the viewer: arrows, chevrons and swipe walk the whole book including
    silhouettes, the counter matches, both ends clamp rather than wrap. Escape and a
    click on the scrim close it; a click on the card does not. Closing leaves the
    book on the spread of the card you ended on, having played **no page-turn sound**
    while browsing. Tab reaches only the two visible pages' cards.
4. Open a mock common pack: **stopwatch it under 2 seconds**, and a click
   mid-animation lands immediately on the end state.
5. Force each ceremony level via `guaranteeLevel` and **screen-record two levels,
   then compare frames at the same `t`** — they must be indistinguishable until
   the shorter one stops. This is the one check that catches a regression of the
   governing rule, and eyeballing it is not enough.
6. Force a 74-rated pull — no shimmer, no radiation, nothing at all.
7. Force a 75-rated pull — shimmer only, and **no gold edge**.
8. Hit `/api/player/{id}/avatar` for all 38 pool players against the deployed API
   and count the misses. This decides whether the photo-centric card face is
   viable, and it is checkable now because avatars are the one thing not mocked.
   **Not yet done.** Note `PlayerService.SaveAvatar` writes to a `C:\` path while
   `GetAvatar` reads from `T:\`, so coverage may be worse than it looks.
9. On an actual phone: 3D flip and swipe both behave, single-page layout holds.
10. `prefers-reduced-motion: reduce` in devtools — the reveal still completes and
    shows every card.
11. Sound plays on the first click (the opening click satisfies autoplay policy)
    and the mute toggle persists across a reload.
12. Draw a few hundred mock packs in the console and confirm the observed
    frequencies match the odds table — cheap way to validate the TS weighting
    before porting it to C#.

### Phase 2 — backend and integration

1. `cd AnagoLeaderboard && dotnet test` — NUnit, not xUnit. Note two things about
   the suite as it stands: the solution file itself is broken (`MSB4051`, a stale
   project GUID), so build the projects individually; and the whole
   `RatingChangeTests` fixture fails at HEAD for reasons predating any of this —
   all five tests assert on `NewRating`, which is only ever assigned inside
   `GetUpdates`, and each of them has its only calculation call commented out. It
   was written against a `CalculateRating()` API that no longer exists. Everything
   else is green.
2. ~~Unit-test `CardRatingCalculator` against the anchors.~~ **Done** — see the
   phase-2 build order above for what is covered.

2a. **The collection slice.** `dotnet ef database update` has to be run by hand
    against every database — there is no auto-migrate, `Program.cs` builds the app and
    calls `Run()` — so Development (`C:\tafelvoetbal-data\`) and production
    (`T:\tafelvoetbal-server\data\`, over a share) are separate steps, and skipping one
    makes every collection GET throw *no such table*. Then:
    - `GET api/collections/{id}` for a ≥5-game active → `album: null`,
      `eligible: true`, 37 actives in `pool`, `owned`/`packs` empty. For an under-gate
      player → `eligible: false` with the right `numberOfGames`. Unknown id → 404.
    - `POST .../create` with `{"cover":"navy"}` → 200. **Post it again** → 200, same
      row, no 500. An unknown colour → 400. An under-gate player → refused.
    - `DELETE api/player/{id}` for a throwaway player who owns an album → no FK
      violation, and the row goes with them. That is what the cascade is for.
    - Clear `tafelvoetbal.cards.playerId` → the ledger fills the stage, with **no header at
      all** and no footer. An under-gate name is listed struck through.
    - The register lies in the right margin once signed in, opposite the packet shelf, and
      is present during the cover choice too — signing in as the wrong person and getting
      out again before binding a book has to work. Click it: the name is crossed through,
      then the ledger. It dims and goes inert during a reveal and during the stamping.
    - Below 1150px wide the margins collapse and the register stacks **below** the book
      while the shelf stacks above it.
    - Pick a leather → four books leave, one centres, the name foils in, the book lands
      **shut** on page one. Watch the handover frame as the footer appears.
    - **Reload → straight to the album, with no flash of the ledger and no flash of the
      cover-choice table.** Two separate ordering bugs, both of which happened, and the
      pair of regressions to watch:
      - The ledger flash is what `restoring` exists for. The pick is stored as an *id*,
        and an id is not a player — the games gate and the cover both need the record —
        so it cannot be restored until `GET api/players` lands. Without the flag that one
        round trip renders as the front door, and it also makes the collection request
        that follows look as though it fired with no name set.
      - The cover-choice flash is what the loading branch exists for: `collection === null`
        and `album === null` are otherwise indistinguishable.
    - **A 404 here has two causes and the message says both.** By design the endpoint 404s
      only for an unknown player — so a 404 for a name just picked off the list looks
      impossible, and the actual cause is almost always an API binary older than the page,
      where `/api/collections` is not a route at all. That cost a round of confusion the
      first time. Restart the API before believing anything else about a 404.
    - Switch player and come back: no cover flash, no other player's page position, no
      other player's album under the new name.
    - All five stains: brass edge, gold foil, cover rule and title emboss move with the
      leather; the pages stay paper-brown; the inside covers stay the stage's green.
    - Stop the API and reload → the error branch, a loud Dutch console warning, and
      **no** invitation to pick a cover.
2b. **The pack slice.** `dotnet ef database update` by hand against both databases
    again, or every collection GET throws *no such table* on `PackClaims`. Then:
    - Sign in as a ≥5-game player with an album on a day they have not played: exactly
      one packet on the shelf, the green single. Open it, then **reload and confirm the
      card is still in the book** — the whole point of the slice.
    - Reload again: no second daily.
    - Enter a game with that player in it → all four participants gain a packet, sized
      1 / 3 / 5 by the rule. A 10-3 win against the odds is a five.
    - The wrapper's `title` carries the reason and the score from *your* seat, not the
      row's — the losing side of a 10-3 reads `gespeeld — 3-10`.
    - `PUT /api/game/{id}` to change the score before anyone claims → the pack resizes.
      Edit one after a claim → it does not, and the cards already minted stand.
    - `DELETE /api/game/{id}` → the packet stops being offered and its cards vanish.
    - Two tabs on the same packet → one reveal, one 409, one set of cards.
    - Past midnight, yesterday's unclaimed packets are gone whether opened or not.
    - The test panel's pack buttons log a warning and do nothing. Expected until the
      gift endpoint lands.
3. ~~Unit-test pack sizing: a win gives 3, a win beating expected margin by 3+
   gives 5, a loss beating expected margin by 3+ gives 3, a plain loss gives 1.~~
   **Done**, from both teams' seats — `UnitTests/PackTests.cs`.
4. ~~Unit-test the opponent bonus: a qualifying pack doubles exactly the two
   opponents' tickets and no one else's, and a win *plus* margin bonus still
   doubles only 2×.~~ **Done.**
5. ~~Unit-test the draw: no player appears twice in a 5-card pack, and summed
   inclusion probabilities over the pack mix equal the average pack size.~~
   **Done** — the sum is asserted to equal the pack size exactly for 1, 3 and 5 over
   40k packs, which is the check that catches "draw k independently and dedupe"
   masquerading as successive sampling. A pool smaller than the pack is also covered,
   because it is the one input that could loop forever.

5a. **The claim slice**, in `UnitTests/PackClaimTests.cs`, against real SQLite over a
    held-open in-memory connection — the in-memory provider enforces neither the unique
    indexes nor the cascades, and here those *are* the implementation. Covered: the
    daily can only be claimed once a day and comes back tomorrow; two game packs on one
    day do not collide (the filtered index); a claim cannot outlive its player; claiming
    mints a card that a fresh read of the collection has; a second copy reports
    `isNew: false` and `copies: 2`; completing the active set latches the legends;
    deleting the game takes its cards; emptying a collection takes the cards and the
    claims; and packs are only offered once there is a book.
    - The one-player-pool helper is what makes any of the draw-dependent assertions
      possible: one player over the gate and nine under it means the roll has exactly
      one card it can produce.
6. `dotnet run` the API, `npm start` the UI (proxy via `public/config.js`).
7. Submit a game → all four participants each have a pack of the right size →
   reveal → cards persist across a hard reload.
8. Confirm cards are live: push a held player over 1000 rating and verify an
   already-owned card moves from Zilver to Goud.
9. Confirm a player under 5 games never appears in a pack and cannot open the
   collection page — and that one *on* 5 does both.
10. Delete a game via `DELETE /api/game/{id}` and confirm its cards vanish, and
    that it stops offering a pack to its four players.
11. Roll the clock past midnight and confirm yesterday's packs are no longer
    offered, claimed or not.
12. Edit a game's score via `PUT /api/game/{id}` before anyone claims, and confirm
    the pack resizes. Then edit one *after* a claim and confirm it does not.
13. Claim the same pack from two tabs at once and confirm exactly one succeeds —
    the unique index is what enforces this, so it is worth proving.
14. Confirm inactive ≥5-game players appear only for collectors who have
    unlocked legends, rated on their all-time-high.
15. Complete an active set on a test collector and confirm the legends latch
    survives a new player later crossing 5 games.
16. After swapping the mock client for the HTTP one, re-run the phase-1 visual
    checks — no component should have needed changing.

### The pool slice — checked

- Peaks are ≥ the current visible rating for all 76 players, and exactly 0 for
  anyone who never played.
- The endpoint returns 37 actives and 20 legends at `MinGames` 5.
- The frontend falls back to the six placeholder legends when the route 404s, so
  `npm start` with no backend still behaves as it did all through phase 1.
- **Avatar and silhouette coverage is 100%** — 20/20 legends and 37/37 actives
  have both a real photo (not the `empty-avatar.jpg` fallback) and a generated
  mask. This was the open risk under it and it is gone: the icoon card is
  photo-led, inactive players are exactly the ones least likely to have a portrait
  on disk, and placeholders had been hiding the question. It also closes phase-1
  verification step 8, which had never been run. Note it was checked against the
  `T:\` read path; `PlayerService.SaveAvatar` writes to a `C:\` path, so a *newly
  uploaded* avatar may still land somewhere it is not read from.

Still open: judging the icoon face itself against 20 real portraits rather than
placeholder names — in particular the 9 silver and bronze icoons, which are what
the "tier moves the metal and nothing else" rule was written for and has never
been tested on.
