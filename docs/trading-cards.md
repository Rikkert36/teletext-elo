# Trading cards for teletext-elo

## Where this stands (last updated 2026-08-06)

**Phase 1 (frontend on mock data) is essentially complete.** Everything below the
"Presentation layer" heading has been built and iterated on at length; the
`## Architecture` and `## Backend changes` sections are still entirely unwritten
design.

Done and signed off: the mock data module, the `cardsClient` seam, the Panini card
face, the album's stiff 3D flip, the pack opener's five beats, the FLIP travel,
the new-card marking, the four-level ceremony, and the D-minor payoff ladder.

Newest: the **games gate dropped from 10 to 5**, for the card pool, the access
gate and the legends pool alike. Four players join (Yannick, Sevda, Dmitry,
Sandra), the set is 38 cards, and everyone's per-pack rate falls ~15%. `DHigh`
stays at 2.5 — the slower completion is accepted, not compensated. See
"Why ≥5 games".

Before that: the **icoon card** — legends no longer wear a black `legende` pill, they
get their own colourway: monochrome photo, pale ground, shards, and deliberately no
frame. Tier moves the metal, rarity is untouched. See "The icoon card".

Before that: the **card viewer** — click any slot, including an empty one, and the card
fills the screen with its full name, nickname, tier and duplicate count, browsable
left and right through the whole book. The count also reaches the album's tooltip.
The page-turn strips narrowed to the page margin to make room for the click.

**The one open visual decision:** which stage direction to use
(`utils/stageTheme.ts`, switchable live from the test panel — see the tables under
"Framing"). Ten candidates in two families: **A–E** treat the stage as a screen the
book is displayed on, **F–J** as a table it is lying on. Once one is picked, fold
its tokens into `.game-stage` and delete the other nine, `stageTheme.ts`,
`tabletop.css` and the switcher.

A book style is being chosen separately and independently (`utils/albumStyle.ts`) —
that is the book, this is what it lies on.

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
| Legends | Completing the active set permanently unlocks inactive (≥5 games) players in packs, alongside actives. Rated on all-time-high. |
| Cards ↔ games | `CardInstance.GameId` FK with cascade delete. |
| Cards ↔ players | `SubjectPlayerId` FK, **also cascade**. Player deletion only ever happens for accidentally-created players, so losing their cards is correct. |
| Presentation | 2002 **PC-game** screen, no OS chrome. Token-driven; **ten directions still being chosen between**, in two families — five screens (A–E) and five wooden tabletops (F–J). |
| Album | Hand-rolled stiff CSS 3D page flip. No new dependency. |
| Card face | **Panini**: photo near-full-bleed and masked into the metal, no plates, first name only, DIN type, no stats. |
| Icoon | The **legend** colourway, not a fifth tier: monochrome photo, pale ground, shards, **no frame**. Replaces the `legende` pill. Tier moves the metal. No effect on rarity. |
| Sound | Fully **synthesised** (WebAudio, no assets). Default on, persisted mute. |
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

The legend gate is held symmetric with the card pool deliberately, but it is the
one place where 5 is arguable: it means somebody who played five games and left
is an icoon forever. No inactive player currently sits in the 5–9 band, so this
costs nothing today — but it is the gate to reconsider first if the legends
pages start filling with people nobody remembers.

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

Everything up to **1851 is fixed** and must stay so. It is the highest rating ever
recorded (Petar, over 1746 games), it is pinned to exactly 90, and every player
sits at or below it — and since overall also feeds the ticket weighting, moving
any anchor in that range silently re-balances rarity.

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
  permanent latch, so new joiners and players crossing 5 games don't
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

#### The tabletop family (F–J)

A second, later premise, in `styles/tabletop.css` and marked with an extra
`stage-tabletop` class: A–E treat the stage as a **screen the book is displayed
on**; F–J treat it as a **wooden table the book is lying on**, seen from straight
above. Which changes far more than the background, and is why they are a family
rather than five more themes.

All five are **bare wood**, and differ only in the timber. Three rules the family
follows, each of them arrived at by getting it wrong first:

1. **The table is a table-sized object, not a background.** `width: min(1520px,
   97vw)`, centred, with a chamfered edge that catches the light and a shadow on
   the floor; the site's black is the room around it. Bleeding the wood to the
   edges of the viewport made it a texture behind a page. The figure has to clear
   the album, which sizes itself from the *viewport* rather than from its
   container — at 1920×1080 the spread and the shelf cost ~1364px.
2. **Nothing is spread on it.** An earlier pass put a felt blotter, a paper
   placemat, a baize inlay and a café cloth under the book. Covering the wood with
   a mat defeats the only thing these five are for. Bare wood, the book, the
   packets and the keys.
3. **Everything is an object or it is engraved.** There is no chrome to hang things
   on, so a control is either a physical thing lying on the wood — a key, a packet,
   a slot cut into the surface — or it is type cut into it. Nothing gets a panel:
   the header, the footer and the packet shelf have no background at all, and the
   shelf's label is simply engraved above the packets. Buttons become keys with a
   light face, a hard bottom edge and 2px of travel.

Hence `--table-ink` rather than a single ink token: it has to read against the
actual timber, so it is light on walnut and dark on pine, and every text token maps
to it. `--drop` and `--vignette` are the other two — the shadow everything casts
and how far the light falls off. Objects disagreeing about where the light is kills
it instantly. There are also no rules (`.game-rule` is hidden): a brass divider is
screen furniture, and the space between two objects on a table is the divider.

The test panel is deliberately exempt (`.game-plate--debug`): it is scaffolding,
and it has to stay readable rather than in character.

| | | timber | boards | light |
| --- | --- | --- | --- | --- |
| F | eiken | mid-warm quarter-sawn oak, real flake | 138px | lamp above left; coffee ring |
| G | grenen | scrubbed pale pine, knots, no flake | 208px | flat daylight, almost no falloff |
| H | mahonie | deep red-brown, ribbon figure, french-polished | none — one glued top | specular streak, hard corner vignette |
| I | beuken | pale-to-mid beech, very tight, heavy fleck | 116px | even and neutral, no lamp |
| J | noten | dark walnut, the strongest figure | 124px | lamp hung low, everything else dark |

**The wood is real noise, not gradients.** The first pass faked grain with
`repeating-linear-gradient` and read as corduroy — grain is noise stretched along
one axis, irregular and self-similar at several scales, and a repeating gradient is
by definition none of those. So the five share three inline `feTurbulence` layers
as data URIs (`--grain-figure`, `--grain-tight`, `--grain-flake`) with
`baseFrequency` stretched hard along x so the noise elongates into grain running
the table's length, blended `overlay`/`soft-light` over a base tone, plus board
seams and the lamp's sheen. No asset is fetched and nothing animates.

Two details that are load-bearing:

- Each grain layer is **stretched over the whole slab** (`100% 100%`), never tiled:
  turbulence does not tile, and a stretched instance has no seam either.
- **Strength is baked into each layer's colour matrix**, because CSS has no
  per-layer background opacity. The matrix maps luminance into a band around
  mid-grey, which is exactly the value `overlay` and `soft-light` leave untouched.

A species is then a base colour, which of the three layers it uses, the board
width and its light. Eight layers in a fixed order, so an unused one is spelt
`none` rather than left out — the parallel `background-size` / `-repeat` /
`-blend-mode` lists have to stay aligned.

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
threshold. `tierFor()`, `ticketsFor()`, `DHigh`, `drawPack()` and the ceremony are
all unchanged.

Four parts and no more:

1. **The photo is graded to monochrome and warmed back up** (`grayscale(1)
   sepia(.34) contrast(1.06) brightness(1.03)`), instead of being tinted toward a
   tier colour. This is the whole idea; the other two exist to support it. The
   tier tint becomes the *wash* that puts the grey photo back onto the card's own
   material, at 0.5 rather than the coloured tiers' 0.42 — a grey image takes far
   more multiply before anything breaks.
2. **A pale ground**, so an icoon reads from the far side of a spread.
3. **Shards of light** from a point below the card, one `conic-gradient` in a
   single div. They fill the two areas the portrait mask clears — the bottom strip
   and the top-left corner — which on the coloured tiers are filled by the metal
   and on a pale ground would otherwise be blank stock with the name hanging in
   it. Not decoration: they are what gives the cleared area something to be.
4. **The type is a dark olive-bronze**, `#594D2C`, where the tiers use a
   near-black. The reference sets its number, name and rules in metal, and that
   is most of why those cards read as pressed rather than printed.

Two things about the ink that are easy to undo by accident:

- **The name divider goes metal with the type, and the engraved highlight warms
  up with it.** A bronze number over a black hairline is just a card with a
  bronze number on it, and a white highlight under a bronze rule reads as a line
  lying on white paper rather than one cut into a warm card. The rule is the ink
  at 62% rather than a separately chosen brown, so the two cannot drift.
- **It is one colour for all three colourways**, declared on `.card--icoon`. A
  bronze per tier was tried: it made the ink a second thing the tier moves, when
  the colourway rule is that the tier moves the metal and *nothing else* — and
  three inks that are all nearly the same brown is a distinction nobody can make
  while being three values to keep in step. The colourway blocks outrank
  `.card--icoon` on specificity, so re-adding `--tier-ink` to one of them is
  exactly how this would get quietly reversed.

Also not a saturated gold, which was the first attempt. Gold type competes with
the metal it is printed on and loses, because the ground is already the gold; it
has to read as ink that happens to be metallic, not as more metal. The darker
brown also recovers the contrast a gold ink cost the overall — which is the one
hard fact on the face, so it is the last thing that may go quiet.

**The tier moves the metal and nothing else.** Not one gold for every legend,
because legends are rated on their all-time high and that spreads — an inactive
player who managed ten games and peaked at 780 is an icoon at overall 69, and a
gold card would lie about him. That is the mistake `.card--zilver` once made with
its white tint. The icoon reading is carried by the *structure*, which stays
constant, so a silver icoon is still obviously an icoon. Both gold tiers share one
colourway; 85+ already differs from 75–84 exactly as much as it does on the
ordinary cards, and restating it is not this card's job.

Silver and bronze cool the **metal** only. The wash over the photo stays warm: a
cool wash cancels the sepia and leaves a grey silver card.

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

Also rejected along the way: a sepia version of the existing gold (a gold card with
a grey photo is a gold card, and icoons lie among rare golds in the album); a
near-black obsidian card matching the wrapper and card back (the strongest runner-up
— the only one equally good on teletext black and on the wooden tabletops — but it
will not bend to the tiers, since black-with-silver is the same object with a
different accent); and a banknote engraving with guilloche (the only candidate
carrying a *pattern*, which is exactly the argument that killed the striped and
checkerboard card backs).

Empty slots are deliberately **not** marked as icoons. A silhouette's job is to be
identically blank, and legends have their own pages in the album.

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

So `--stage-w` joins `--stage-pad` on `:root`, `.game-stage` and the tabletop override
both read their `width` and `padding` from the tokens, and `--shelf-room` subtracts the
tokens rather than a literal. The rule the original comment was reaching for, stated
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
      Worst case is the longest cycle in `MOTES` (760) on a mote that has just set
      out — 253 at ×3 — so the layer empties about as the flip lands, well inside the
      660 a duplicate stays up for. `MOTE_DRAIN_MS` (260) has to stay above that
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
    are separate numbers.** A mote flies over the first **45%** of its cycle
    (`opener-mote-in`) and spends the remaining 70% landed and invisible. Velocity is
    distance over *flight time*, so the flight can be shortened — making a mote fly
    faster — without touching the cycle, which is what governs how often the stream
    repeats. Currently ~3× the original velocity at a cycle mean of ~1160, which is
    exactly where the cycle started.
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
flip), `packopen.css` (the five beats), `viewer.css` (the enlarged card).
Deliberately **not** `@mui/styles` — JSS is deprecated and unpleasant for
multi-step keyframe sequences, and plain CSS is already an established pattern via
`App.css`.

New components: `components/GameShell.tsx`, `Album.tsx`, `PlayerCard.tsx`,
`PackOpener.tsx`, `PackTile.tsx`, `PackFace.tsx`, `PlayerPicker.tsx`,
`CardViewer.tsx`.

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
9. Confirm a player under 5 games never appears in a pack and cannot open the
   collection page — and that one *on* 5 does both.
10. Delete a game via `DELETE /api/game/{id}` and confirm both its cards and its
    unrevealed packs vanish.
11. Roll the clock past midnight and confirm unrevealed packs are gone.
12. Confirm inactive ≥5-game players appear only for collectors who have
    unlocked legends, rated on their all-time-high.
13. Complete an active set on a test collector and confirm the legends latch
    survives a new player later crossing 5 games.
14. After swapping the mock client for the HTTP one, re-run the phase-1 visual
    checks — no component should have needed changing.
