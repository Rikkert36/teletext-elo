# Trading cards for teletext-elo

## Where this stands (last updated 2026-08-05)

**Phase 1 (frontend on mock data) is essentially complete.** Everything below the
"Presentation layer" heading has been built and iterated on at length; the
`## Architecture` and `## Backend changes` sections are still entirely unwritten
design.

Done and signed off: the mock data module, the `cardsClient` seam, the Panini card
face, the album's stiff 3D flip, the pack opener's five beats, the FLIP travel,
the new-card marking, the four-level ceremony, and the D-minor payoff ladder.

**The one open visual decision:** which of the five stage directions to use
(`utils/stageTheme.ts`, switchable live from the test panel — see the table under
"Framing"). Once picked, fold its tokens into `.game-stage` and delete the other
four, `stageTheme.ts`, and the switcher.

**Then:** phase 2, the backend. Nothing in `AnagoLeaderboard/` has been touched.

Two smaller things still open:
- Whether first-name-only is acceptable now that two Daans and two Jeroens read
  identically on their cards.
- Whether the ceremony should enter at 80+ rather than 75+ (18% of cards rather
  than 28%).

A `mock/` directory, the `guarantee*` debug options, and `window.cardDebug` all
exist only for phase 1 and are deleted in phase 2.

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
| Access gate | Collection page unlocks once that player has **≥10 games** — symmetric with the card pool. |
| Pack recipients | **All four participants** of a game. |
| Pack size | 1 for playing, **+2** for winning, **+2** for beating expected margin by ≥3. So 1, 3 or 5. |
| Opponent bonus | Winning *or* beating expected margin by ≥3 doubles both opponents' tickets in that pack. Flat 2×, does not stack to 4×. Flavour, not balance. |
| Within a pack | Each player at most once — draw **without replacement**. |
| Free pack | One 1-card pack per player per day. |
| Pack expiry | **Hard.** Unrevealed at end of day = gone. |
| Contents rolled | At reveal time. |
| Duplicates | **Not** shown on the card at all. New cards are marked instead, with a glow at reveal. No conversion economy. |
| Card rating | **Live**, computed on read from `visibleRating`. No stat columns on the card. |
| Card sub-stats | **Dropped.** Not worth it for ~15 active players. |
| Rarity axis | Rating alone — no foils, no serials, one card per player. |
| Card pool | **Active** players with ≥10 games. |
| Legends | Completing the active set permanently unlocks inactive (≥10 games) players in packs, alongside actives. Rated on all-time-high. |
| Cards ↔ games | `CardInstance.GameId` FK with cascade delete. |
| Cards ↔ players | `SubjectPlayerId` FK, **also cascade**. Player deletion only ever happens for accidentally-created players, so losing their cards is correct. |
| Presentation | Full-bleed 2002 **PC-game** screen, no OS chrome. Token-driven; **five directions still being chosen between**. |
| Album | Hand-rolled stiff CSS 3D page flip. No new dependency. |
| Card face | **Panini**: photo near-full-bleed and masked into the metal, no plates, first name only, DIN type, no stats. |
| Sound | Fully **synthesised** (WebAudio, no assets). Default on, persisted mute. |
| Pacing | Two knobs — `DEFAULT_SCALE` (2) and `DEFAULT_CEREMONY_MS` (1500). Everything derives from them. |
| Reveal ceremony | Graduated over four levels at 75/80/85/90 overall. Identical at any timestamp `t`; only the *length* differs. |

Deferred: trading between collections.

Still open: **which of the five stage directions to use** — the last remaining
visual decision.

## The legends pool

The `Active` flag is maintained — the database holds a healthy number of
inactive players already, so the legends pool has content on day one. (The
47-player list used for the numbers below came from `GET /api/leaderboard`,
which filters on `Active` via `GetCurrentLeaderBoard()`, so it is the active
roster only.)

Legends are inactive players with ≥10 games, rated on their **all-time-high**
`visibleRating`. Unlock is a permanent latch: once you have completed the active
set you keep legends forever, so new joiners and players crossing 10 games do
not un-complete it.

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
| 2200 | 92 |
| 2600 | 94 |
| 3200 | 96 |
| 4000 | 98 |
| above | clamp 99 |

Slope rises monotonically to a peak of `.05` in the 800–1000 band then falls
monotonically — an S-curve inflecting exactly where the anchors demand. 99 is
unreachable in practice.

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

**There is no Icoon tier** — gold is the top, so the 90s are simply gold. The
reveal ceremony is driven by the **overall**, not by tier, and steps at 75 / 80 /
85 / 90 — so a 90+ pull still escalates well past an 85 even though the card
itself shows no distinction above 85. See "The rare ceremony" below.

### Why ≥10 games

`visibleRating = rating − 1000·e^(−0.2303·games)`, so the deduction is ~794 at
one game and ~100 at ten. Without a floor the scale reports attendance, not
skill: Ninette's real rating is 1003 but she scores 47; Thomas, Nino and Angela
all sit at exactly 40 and are indistinguishable. Crossing 10 games becomes a
small event — you become both collectable and able to collect.

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
smaller than the pack size, though 34 vs 5 makes it theoretical.

### Opponent bonus

A qualifying player (won, or beat expected margin by ≥3) has **both opponents'
tickets doubled** for that pack's draw. Flat 2× even if both conditions are met —
a dominant win already pays 5 cards, and compounding to 4× would let blowouts
dominate collections.

**This is flavour, not balance, and should be treated as such.** Doubling 2 of 34
players shifts only ~6% of the ticket mass, lifting Petar's season rate ~8%. The
intent is that it circulates as an urban legend — *you can pack someone more
easily if you beat them* — which happens to be true, and happens to mean that
collecting the best player is easiest for whoever beats the best player. Do not
tune it as an economy lever.

### Per-player odds at DHigh = 2.5

Mix assumption for the last column: 42.5% × 1-card, 35% × 3-card, 22.5% × 5-card,
from P(win) = 0.5 and P(bonus) ≈ 0.30.

| Player | rating | ovr | 1-pack | 3-pack | 5-pack | avg packs to first |
|---|--:|--:|--:|--:|--:|--:|
| Petar | 1851 | 90 | 0.20% | 0.61% | 1.1% | 187 |
| Ton | 1578 | 88 | 0.34% | 1.1% | 1.8% | 108 |
| Mark, Rik | 1551, 1463 | 87 | 0.45% | 1.4% | 2.4% | 82 |
| Luuk, Casper | 1362, 1327 | 85 | 0.78% | 2.4% | 4.2% | 47 |
| Gijs, Anneloes | 1201, 1179 | 83 | 1.4% | 4.2% | 7.2% | 27 |
| Nadia, Ridho, Jeroen Mens | 1144–1098 | 82 | 1.8% | 5.5% | 9.4% | 21 |
| Daan vd Beek, Daan Verkade, Laura, Mathijs | 1066–1035 | 81 | 2.4% | 7.2% | 12% | 16 |
| Max | 981 | 79 | 3.2% | 9.7% | 16% | 11.9 |
| Niek | 952 | 78 | 3.3% | 9.9% | 17% | 11.7 |
| Tanny | 919 | 76 | 3.4% | 10% | 17% | 11.2 |
| Marie | 864 | 73 | 3.7% | 11% | 18% | 10.4 |
| Bo, Simon, Nynke | 829–811 | 71 | 3.9% | 12% | 19% | 10.0 |
| Ewan, Rianne | 782, 767 | 69 | 4.0% | 12% | 20% | 9.6 |
| Jeroen van Geel, Esther | 764, 759 | 68 | 4.1% | 12% | 20% | 9.4 |
| Karin, Tim | 740, 732 | 67 | 4.2% | 13% | 21% | 9.2 |
| Ida | 716 | 66 | 4.3% | 13% | 21% | 9.0 |
| Lotte | 688 | 65 | 4.4% | 13% | 22% | 8.8 |
| Fraser | 616 | 62 | 4.7% | 14% | 23% | 8.2 |
| Jasper | 582 | 61 | 4.9% | 14% | 24% | 8.0 |
| Evie | 519 | 58 | 5.2% | 15% | 25% | 7.5 |
| Daria | 342 | 52 | 6.0% | 18% | 29% | 6.6 |

The scarcity spread is deliberately not Petar-only: Ton at 108 packs, the 87s at
82 and the 85s at 47 are all genuinely hard, while the bottom two-thirds sits in
a tight 6.6–12 band. Top-to-bottom range is 28×.

Sanity check for the implementation: these inclusion probabilities must sum to
**2.600** across all 34 players — exactly the average pack size, as required when
no player can repeat within a pack. Worth asserting in a unit test.

Excluded from the pool (under 10 games): Yannick, Sevda, Dmitry, Sandra, Inge,
Ancella, Molly, Ninette, Sylvia, Lianne, Thomas, Nino, Angela.

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

Completing the 34-card active set at `DHigh = 2.5`, with no-duplicates-per-pack
and the opponent bonus both folded in:

| | 3-game days | weeks | months | games | packs | cards |
|---|---:|---:|---:|---:|---:|---:|
| Median | ~64 | ~13 | ~3 | ~192 | ~256 | ~563 |
| 90% confidence | ~140 | ~28 | ~6.5 | ~420 | ~560 | ~1,232 |

Completion is essentially *"when do you first pull Petar"* — every other card
arrives long before, which is why the median and the 90th percentile are more
than 2× apart. Half of collectors finish inside a quarter; the unlucky tail is
still hunting at six or seven months.

Because duplicates are shown but never converted, a collector at median
completion holds roughly **34 Darias, 29 Evies, 27 Jaspers** — and double that by
the 90th percentile. The collection grid must handle three-digit counts
gracefully.

## Architecture

```
POST /api/game ─► insert Game
                └─► for each of 4 players: size pack, roll cards, insert rows

POST /api/collection/packs/{id}/reveal   ─► marks revealed, returns cards
GET  /api/collection/{playerId}          ─► cards + unrevealed packs, live overalls
```

### Roll at reveal

A pack belongs to a player, so the reveal endpoint credits that player
regardless of who clicked it — the cards cannot be stolen either way. Rolling at
reveal therefore costs nothing in safety and avoids writing card rows for packs
that expire unopened. With a same-day expiry window, ratings cannot drift
meaningfully between grant and reveal.

### Hard daily expiry

Unrevealed at end of day = gone. Absence from the office means you were not
playing and so earned no game packs anyway, and the free daily pack is a reward
for visiting, so there is nothing to lose by not visiting. The one real case is
an end-of-day game, which is the player's own call — and the app is now mobile
friendly, so opening on a phone is quick.

"Day" = server-local date, consistent with `DateTime.Now` used throughout.

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

A failure anywhere in pack granting must **not** roll back the game insert.
Wrap and log; a lost pack is acceptable, a lost game is not.

### Anti-farming

Packs only come from game creation, so farming means polluting the leaderboard
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

- **`PackGrant`** — `Id`, `PlayerId`, `GameId` (nullable for daily freebies,
  cascade delete), `Reason`, `Size`, `OpponentBonus` (bool — the draw needs to
  know, and the grant outlives the reveal), `CreatedAt`, `RevealedAt` (nullable).
- **`CardInstance`** — `Id`, `PlayerId` (owner), `SubjectPlayerId` (who's on the
  card, cascade delete), `PackGrantId`, `GameId` (cascade delete), `IsLegend`,
  `MintedAt`.
- **`PlayerCollectionState`** — `PlayerId`, `LegendsUnlockedAt` (nullable). A
  permanent latch, so new joiners and players crossing 10 games don't
  un-complete an existing unlock.

Cascade on `GameId` for **both** `CardInstance` and `PackGrant`, so deleting a
game removes its cards *and* any still-unrevealed packs it granted. This is not
tidiness — pack size depends on the score, so a mis-entered 10-2 mints 5 cards
where 10-9 mints 3, and deleting the game to correct it must take the
illegitimate rewards with it. Accepted gap: `PUT /api/game/{id}` edits do **not**
re-roll already-granted packs.

Generate with `dotnet ef migrations add AddCardCollection` — `dotnet-ef 8.0.0`
is pinned in `.config/dotnet-tools.json`.

### Services

- `Services/Calculators/CardRatingCalculator.cs` — the piecewise scale and the
  ticket weighting. Pure functions, unit-testable, alongside the existing
  [RatingCalculator.cs](AnagoLeaderboard/AnagoLeaderboard/Services/Calculators/RatingCalculator.cs).
- `Services/PackService.cs` — sizing, rolling, granting, revealing, daily freebie.
- `Services/CollectionService.cs` — a player's cards with live overalls, and the
  legends completion check.
- `Services/GameService.cs` — duplicate guard plus the grant hook in
  [`CreateGame`](AnagoLeaderboard/AnagoLeaderboard/Services/GameService.cs#L17).
- `Services/LeaderBoardService.cs` — track a running per-player max
  `visibleRating` inside the existing replay loop, for legend ratings.

Both rolling and reading a collection need current ratings via
`GetCurrentLeaderBoard()` — an O(all games) replay, already the cost of every
existing GET.

### Controller

`Controllers/CollectionController.cs`, `[Route("api")]` to match existing style.

## Presentation layer

The teletext theme is deliberately minimal and cannot carry a card collection, so
the collection is **not** teletext. It is a 2002-era PC game screen — and the
palette collision is made intentional rather than accidental by framing it that
way.

No animation library is used (no framer-motion, react-spring or GSAP — only
`@emotion/react` via MUI and plain CSS), and none was added. Everything is plain
CSS plus a hand-written FLIP.

### Framing: a game screen, not an OS window

The first attempt took "Windows XP aesthetic" literally and built a Luna dialog
with a title bar and window buttons. Wrong read — the reference is the era's
**games**, not its dialogs.

`/collectie` is full-bleed with no width cap. Nav, leaderboard, games and player
pages stay pure teletext, untouched.

The stage is **fully token-driven** — one set of custom properties covers the
header, footer, plates, buttons, tabs, input, meter, readouts *and* the book's
inside covers (`--book-inside`), so a visual direction is a block of overrides
plus a background.

**Still choosing between five directions** (`utils/stageTheme.ts`, switchable
live from the test panel). They differ in geometry and depth model, not just
palette:

| | | character |
| --- | --- | --- |
| A | teletekst | zero depth — no gradients, shadows or radii; Mode-7 font, solid RGB colour blocks. Matches the rest of the site. |
| B | sportuitzending | everything sheared — `clip-path` parallelogram buttons and plates, skewed rules, huge italic DIN |
| C | plakboek | cut-paper labels rotated a fraction of a degree, tape across the corners, nothing square to the page |
| D | vitrine | no textures, gradients or shadows at all; hairlines, wide tracking, controls are text with a rule under them |
| E | arcade | dithered checkerboard instead of gradients, hard 2px pixel bevels that invert on press |

If **A** wins, the album itself needs rethinking — a leather-and-brass book on
flat teletext black shares no visual language with it.

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

Page controls **flank the book** rather than sitting under it, with the page label
as a single line above. Disabled buttons keep a brass outline — a flat dark fill
vanished against the stage.

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
- No statistics anywhere, no duplicate count, no tier text. Tier reads from the
  frame and the name plate colour.

### Pack opening

Five beats: wrapper → tear → the card arrives → reveal → hand-off to the row.

- **Tear.** The jagged edge is baked into a `clip-path` on two halves and never
  animates; only the halves move. Only the **top** strip comes off — both halves
  flying apart read as an explosion, not an opening. `.pack--tearing` must strip
  the parent's own background, or the halves fly away over a fully intact
  wrapper and no wrapper ever appears to come off.
- **Entrance and flip are on separate elements.** Both animate `transform`, and a
  running animation always beats a class-driven value — on one element the
  rotation was suppressed for the whole entrance and then snapped.
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

### New, not duplicate

Duplicates are the majority within a couple of months, so **new** cards are
marked rather than duplicates dimmed — dimming would make almost every pack read
as a failure. A cool green rim glow, distinct from the warm gold rarity glow
because new and rare are independent facts. `revealPack` returns `isNew` and
`copies`, captured before the count is incremented; the phase-2 endpoint must
return the same.

The results line reports **new** cards only ("3 nieuwe kaarten toegevoegd"), since
counting all five claimed additions the album never got.

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

1. **Shimmer** — a single golden pass across the card, `CEREMONY_SHIMMER` (0.34)
   of the full build. Identical at every level, including level 1, which is
   shimmer *only*.
2. **Radiation** — light building out from the card's own edge, starting the
   instant the shimmer ends. Levels 2–4 differ only in where they cut off
   (`CEREMONY_STEPS` in `mock/cardMock.ts`: 0.34 / 0.56 / 0.78 / 1).

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
- The glow **survives the turn**. Switching it off at reveal meant all that
  build-up resolved into a card that looked exactly like a common one.
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
  currently **2**. Published to CSS as `--anim`; every CSS duration is
  `calc(Xms * var(--anim, 1))` and every JS timing goes through `ms()`. The two
  layers cannot drift apart, which they would if tuned separately — a flip
  starting before the card finished arriving, a dwell ending mid-transition.
- **`DEFAULT_CEREMONY_MS`**, currently **1500** (so 3000ms at ×2). This is the
  length of the *longest* build, level 4; every other level and both phase
  boundaries are fractions of it, so raising it slows the shimmer, the radiation
  and all four cutoffs together. Published unitless as `--ceremony` so CSS can do
  `calc(var(--ceremony) * 1ms * var(--anim))`.

One knob for both sound and visual is deliberate: a slider that only slowed the
audio would drift out of step with the glow, and the riser has to *end* exactly
as the card turns.

Both are exposed as sliders in the phase-1 test panel. `prefers-reduced-motion` is
honoured throughout.

### Pacing: two knobs, and everything derives from them

At three games a day this plays ~1,000 times a year, so it must be skippable and
brisk. A click anywhere always jumps to the end state.

- **`DEFAULT_SCALE`** (`utils/animationSpeed.ts`) is a duration multiplier,
  currently **2**. Published to CSS as `--anim`; every CSS duration is
  `calc(Xms * var(--anim, 1))` and every JS timing goes through `ms()`. The two
  layers cannot drift apart, which they would if tuned separately — a flip
  starting before the card finished arriving, a dwell ending mid-transition.
- **`DEFAULT_CEREMONY_MS`**, currently **1100** (so 2200ms at ×2). The riser, the
  glow's CSS transition, the bloom and the timeout before the card turns all
  derive from it. A slider that only slowed the audio would drift out of step with
  the glow — the riser has to *end* as the card turns.

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
- **The shimmer phase has its own sound** (`playShimmerSweep`), scaled to the
  shimmer length so it lands on the phase boundary.
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

## Frontend changes

All under `anago-leader-board-ui/src/`.

### Styles in plain CSS, not JSS

`src/styles/game.css` (game-screen shell), `card.css`, `album.css` (book and
flip), `packopen.css` (the five beats). Deliberately **not** `@mui/styles` — JSS
is deprecated and unpleasant for multi-step keyframe sequences, and plain CSS is
already an established pattern via `App.css`.

New components: `components/GameShell.tsx`, `Album.tsx`, `PlayerCard.tsx`,
`PackOpener.tsx`, `PlayerPicker.tsx`.

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
- Gate on ≥10 games for the picked player.
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

- The 34 pool players with real names and ratings, pasted from
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

Avatars need no mock. `public/config.js` already points at the deployed API, so
`/api/player/{id}/avatar` serves real photos while everything else is fake.

Order within phase 1: `XpWindow` → `PlayerCard` → `Album` with the flip →
`PackOpener` last, since its feel is what needs the most iterating.

### Phase 2 — backend

1. `CardRatingCalculator` — the piecewise scale and ticket weighting as pure C#
   functions, with unit tests against the anchors and the 2.600 sum check.
   Port from the phase-1 TypeScript.
2. Migration, `PackService`, `CollectionService`, `CollectionController`.
3. Swap the mock client implementation for the HTTP one. Delete the mock.

## Verification

### Phase 1 — `npm start` only, no backend running

1. `/collectie` renders full-bleed with no OS chrome and no width cap; nav,
   leaderboard, games and player pages are untouched teletext.
2. Flip forward and backward through all 4 spreads — z-index stays correct
   mid-flip, no flicker, no leaf showing through another.
3. Missing cards are silhouettes; a duplicate occupies no second slot and shows
   no count anywhere.
4. Open a mock common pack: **stopwatch it under 2 seconds**, and a click
   mid-animation lands immediately on the end state.
5. Force each ceremony level via `guaranteeLevel` and **screen-record two levels,
   then compare frames at the same `t`** — they must be indistinguishable until
   the shorter one stops. This is the one check that catches a regression of the
   governing rule, and eyeballing it is not enough.
6. Force a 74-rated pull — no shimmer, no radiation, nothing at all.
7. Force a 75-rated pull — shimmer only, and **no gold edge**.
8. Hit `/api/player/{id}/avatar` for all 34 pool players against the deployed API
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

1. `cd AnagoLeaderboard && dotnet test` — existing xUnit suite
   (`GameUploadTests`, `RatingChangeTests`) must stay green; the new server-side
   duplicate guard is the likeliest thing to break them.
2. Unit-test `CardRatingCalculator` against the anchors: 1851→90, 1000→80,
   800→70, 0→40, and confirm the clamp never exceeds 99.
3. Unit-test pack sizing: a win gives 3, a win beating expected margin by 3+
   gives 5, a loss beating expected margin by 3+ gives 3, a plain loss gives 1.
4. Unit-test the opponent bonus: a qualifying pack doubles exactly the two
   opponents' tickets and no one else's, and a win *plus* margin bonus still
   doubles only 2×.
5. Unit-test the draw: no player appears twice in a 5-card pack, and summed
   inclusion probabilities over the pack mix equal the average pack size (2.600
   for the current roster).
6. `dotnet run` the API, `npm start` the UI (proxy via `public/config.js`).
7. Submit a game → all four participants each have a pack of the right size →
   reveal → cards persist across a hard reload.
8. Confirm cards are live: push a held player over 1000 rating and verify an
   already-owned card moves from Zilver to Goud.
9. Confirm a player under 10 games never appears in a pack and cannot open the
   collection page.
10. Delete a game via `DELETE /api/game/{id}` and confirm both its cards and its
    unrevealed packs vanish.
11. Roll the clock past midnight and confirm unrevealed packs are gone.
12. Confirm inactive ≥10-game players appear only for collectors who have
    unlocked legends, rated on their all-time-high.
13. Complete an active set on a test collector and confirm the legends latch
    survives a new player later crossing 10 games.
14. After swapping the mock client for the HTTP one, re-run the phase-1 visual
    checks — no component should have needed changing.
