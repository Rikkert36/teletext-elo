# Trading cards for teletext-elo

## Where this stands (last updated 2026-08-15)

**The cover is written, not stamped, and the voorwoord has a versal.** The owner's name
goes onto the leather in gilt from a pen you watch move, stroke by stroke, instead of
being blocked in hot foil a letter at a time — which took the emboss, the uppercase and
the letter-spacing with it, because ink displaces nothing and a cursive has to join. It is
drawn from **vendored Hershey script simplex** (`hersheyScriptData.ts`, generated from the
`.jhf`, never hand-typed), and *simplex* is the load-bearing word: complex script and any
ordinary outline font animate as the pen tracing the letter's silhouette rather than
writing it. Timing comes from path length, so the pen holds one speed; the sound is one
`playPenStroke` per stroke, and `playFoilStamp` is retired. Facing it, the voorwoord moved
to a book face (Palatino, Georgia behind it) and took a three-line brass versal on "Er",
with the following words in small capitals — the versal is what makes the type change
load-bearing rather than a preference. All of it is under "The name is written, not
stamped" and "The voorwoord is set in a book face, and carries a versal".

**Not yet checked in a browser.** The build is green and the geometry was verified by
rasterising `writeName`'s real output, but the two numbers that want eyes are the versal's
`font-size`/`line-height` pair and the pen's `stroke-width` on cognac's highlight corner.

**A slots page has a head band, and it is the book's own leather.** The head is now a
printed band bled to three trims with the rating range reversed out of it, on rebuilt
paper, between two hairlines set on the card block's measure. Two candidates that
coloured it by the tiers on the leaf were built, switched from the test panel, and
dropped — the switch went with the decision. The band's colour, the four reasons the
tiers lost, and what the bleed did to the fore-edge are under "The head band, and what
colours it"; the spreads it was designed on are `docs/album-headband.html` and
`docs/album-band-colours.html`.

**The reveal ends on a count, written in over the cards.** The row waiting is right and is not
on its own an *ending* — the last card lands, nothing changes state, and it reads as a page
that has hung, worst of all on the last packet of a pile where there is not even a shelf
brightening beside it. Two wordless endings were built for it and both are deleted: a 5px
lift of the row, which is invisible for a reason worth knowing, and the whole row travelling
up into the stage's reserved space, which is the pre-`PutAway` ending restored and still did
not carry it. What is there now is `.opener__tally`, on the line **between the stage and the
row** — how many new cards the **sitting** has produced, spelled out in words, set in the
book's face in roman lower case, and *written on* left to right by a mask with the light of a
nib riding at its edge. It earns the place four captions under the row did not because it is
the one fact about a sitting the table cannot show you. It takes the reserved box
`.opener__hint` used to hold, so the column's geometry is unchanged, and that element is gone.
See "The tally, written in over the cards".

**The last button on the table is gone, and the cards do its job.** A reveal ends with the
row of cards still lying there and the shelf live over it, so there are two things on the
table: another packet — which **adds its cards to the same row** — or this row, which you
click to file. Filing drops the doubles off the bottom, stands the keepers aside, brings the
book back, and puts them in **one at a time, lowest rated first**, turning to each card's
page and leaving each slot alone for a beat before the book moves again. It ends open on the
best card on the table.

**The row waits because it is the record of what you opened**, and that took four goes to
arrive at: a clickable results grid, a fore-edge compromise, a fully automatic version with a
count under it, and this. The live shelf is what makes the click a decision rather than a
"continue". Two things then make the filing read as one continuous thing rather than a screen
change: **the cards never leave the screen** between the packet and the album, and **nothing
resizes** — a card in the row is exactly `--album-card-w`, a slot's width, so the whole
sequence is translation. The row scrolls once it outgrows the book. A sealed packet you have
changed your mind about goes back on the shelf by clicking the wood beside it — or files the
row, if there is one, because putting the packet down is the same decision.

**The book also stopped snapping.** `goToPage` set `flipped` in one go, so a move of more
than one leaf rotated every leaf in between on the same frame — which is not a page turn.
It **riffles** now: one leaf at a time, each with its own sound, quicker per leaf
(`RIFFLE_MS`, published as `--leaf-ms`) when several are queued. It only ever mattered once
something walked the book across pages in view, which is what putting a pack away does.

`PutAway` and `putaway.css` are new; `Album` gained `openAtPlayerId`, `turnToPlayerId`,
`onTurned` and `holdSlots`; the opener gained `table` and renders one row across every phase;
`.game-button--away`, `.opener__results` and `opener-settle` are deleted. The pacing is
deliberate — about nine seconds for three new cards. See "Putting the pack away, and the last
button on the table", which records all four versions and why the row belongs to the sitting
rather than to the packet, and "Riffling" under the album.

**The table stopped negotiating its own sizes.** Three things on this page were sized by
picking a number and letting whatever depended on it give way, and all three now run the
other direction — the thing that matters is stated and the thing that can afford to move
is solved for. See "The table is one object, and the book is solved against it".

- **A packet on the shelf is exactly as wide as a card in the book, at every viewport and
  every zoom** — so its coloured panel is exactly a card tall, which is what `--pack-h`
  always claimed. It was only true where the margin happened to be generous: on a
  1080-tall window a packet was 114px against a 153px card, on a 1440-tall one 100px
  against 163px. The three-way `min()` that did that is deleted.
- **Two packets stay side by side.** Both that and the parity above are now fixed
  requirements, and `--page-w` takes a third term solved from them: the widest page whose
  own margin still holds the pile. `--stage-w` went 1740 → 1860 to pay for it, which is
  the "wooden wall" line the notes said to stay behind, crossed deliberately.
- **The test panel moved off the bottom of the table and into the right margin**, under
  the register. It was the last horizontal band under the book, and the book is sized off
  viewport *height* first, so that row was coming straight out of the spread: the album's
  height term went 63vh → 70vh on the strength of it. The panel is inside `.album-layout`
  now, so it is absent on the four states that are not the album — where every button on
  it was disabled anyway.
- **The slab is one size in every state.** It was `min-height: 78vh` plus whatever the
  content came to, so the ledger, the hourglass, the padlock, the five shut albums, the
  book and the opener were each a differently-shaped piece of furniture. `--album-room`
  reserves the book's footprint once and everything lies inside it — including the opener,
  which gave up its own `62vh`.
- **The stack breakpoint went 1150 → 1450**, and the two triggers collapsed into one. The
  old tests asked whether the margin could hold a packet, which it now always can; what
  gives instead is the book, and below ~1450 it gives too much.

Net: the book is ~7% wider at 1920×960 and the packets are 8–44% wider, depending on how
badly the window used to disagree with itself.

**The icons are earned rather than granted, and the word is settled.** Two things landed
together.

First, **"legend" is retired: an out-of-service player's card is an *icoon*.** The term had
been argued both ways and the codebase had split down the middle — the presentation layer
already said `icoon` (`card--icoon`, `--icoon-wash`, `isIcoon`) while the data layer still
said `legend` (`IsLegend`, `LegendsUnlockedAt`, `CardPool.Legends`). It is icon everywhere
now, in C#, TypeScript, the routes, the columns, the copy and this document — including a
migration that renames two columns, which has to be run by hand against both databases like
every other one here. The presentation names were right all along and keep their spelling.
`.card__legend` and the `legende` pill keep theirs too: they are deleted things, and
renaming history makes it wrong.

Second, and the substance: **completing the active set no longer unlocks the icons. It puts
a packet on the shelf.** The claim used to latch `IconsUnlockedAt` the instant the last active
card was filed, which spent the biggest milestone in a three-month collection silently,
inside a pack reveal, with the reader watching a card come out of a packet rather than their
album. Now the set going complete puts **a packet with one guaranteed icoon** on the shelf;
opening it re-binds the album and then hands you the card. Two ceremonies in the only order
they can go in, because the book has to be able to hold an icoon before one can come out of
a packet. See "Earning the icons: the packet and the re-binding" — including why an abstract
object was built for this first and then replaced, and
[rebind-object.html](rebind-object.html), which is the record of the ten candidates that
were drawn before it was.

**Presents also stopped expiring, and "everybody" stopped being a null.** A gift stood open
for seven days and a gift to everybody was a single row with no recipient — which meant "the
roster at claim time", so with the deadline gone it would have been a present for whoever
joins next year. Both are fixed at the root instead of with a calendar: nothing expires, and
`GiveGift` expands "everybody" into one addressed row per player when the gift is given. The
convenience stays in the call; the table only ever holds addressed presents.

The unlock flag also **moved off the root of `CollectionState` and into `AlbumBinding`**, so
`album: null` cannot carry a stale one and the latch is unreachable without a book — which
is correct, because there is nothing for it to be a property of until there is one.

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

**The claim answers with the collection, not just the cards**, and the dependency
direction is what makes that cheap. Opening a pack used to cost **two** full leaderboard
replays — one inside the claim, one in the `refresh()` the page fired when the reveal
ended — which is the same trap `POST .../create` had already avoided by returning the
whole page. So:

- **`CollectionService` owns the single replay and orchestrates.** It checks the player,
  the album and the gate, hands the roster, the pool and the games to `PackService`, and
  builds the resulting state from the *same* replay via a `Build` overload — the trick
  `CardPoolService.GetPool(IReadOnlyList<DynamicRatingPlayer>)` already existed for.
- **`PackService` does not replay anything, and must not learn how.** It lost
  `LeaderBoardService` and `CardPoolService` from its constructor entirely. Injecting
  either back is a convenient-looking change that silently doubles the cost of opening a
  pack, which is why the constructor says so.
- Reusing the replay across the write is safe because opening a pack cannot move
  anybody's rating. It also means the state is built from the same counts the claim just
  added to, so a packet that fills the last empty active slot reports
  the set-completion packet in the very response that revealed the card — so it is on the
  shelf by the time the reveal ends, with no refetch. (This bullet used to say the claim *latched* the
  unlock on the tracked `collection`; it no longer writes it — see "Earning the icons".)
- On the page, the state is parked in a ref until the reveal ends rather than applied on
  arrival, or the book would quietly gain its new cards while you were still watching
  them come out of the packet. It carries the player id it belongs to, and **every** path
  that ends a reveal applies it — including the exit, which previously left a claimed
  packet on the shelf that 404'd when clicked. (That exit was a button then. There is no
  exit at all now — the reveal runs on into the cards being put in the book, see "Putting
  the pack away" — and the guarantee is unchanged and load-bearing in a new way: the cards
  have to be in the collection *before* they are flown into it.)

**And the tear no longer waits for it.** The claim being a network call meant the packet
sat in your hand for the length of a leaderboard replay before anything moved, which reads
as a dropped click rather than as a wait. The tear now plays on the click and the roll runs
underneath it; if the roll is still out when the tear ends, the first card rises anyway and
stands there **face down** until there is something to turn it into. Only the flip waits,
because the flip is the only beat that needs to know what the card is. `PackOpener` gained
a `waiting` phase, a required `onFailed` — a refusal used to strand the page silently — and
nothing else. See "The tear does not wait for the roll".

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
- **`PUT api/collections/{playerId}/icons`** exists because the latch is real now. It is
  no longer development-only — it is how the unlock is *earned*, and the only thing that
  writes the latch. Its two bypasses (`force=true`, and `unlocked=false` to relock) stay
  development-only, because earning it legitimately is a three-month proposition and
  without them there is no way to look at an icoon in a book at all.

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

**Presents are real, and with them phase 2 is complete.** `PackGift`,
`POST api/collections/gifts` and a floor on the draw are in, so the last grant-shaped
thing in the design exists and the test panel's pack buttons are wired to it. The whole
of it:

- **A gift is a row, and it is the only exception to derivation there is.** Nothing else
  writes a pack into existence, and a present is the one pack nothing *can* be derived
  from — nobody played a game to earn it. What keeps that honest is how little `GiveGift`
  does: it writes a `PackGift` and stops. The packet then appears on the shelf and the
  ordinary claim opens it, so there is no second draw and no second mint to keep in step,
  and the panel's buttons exercise the real path rather than a debug one beside it.
- **Two axes, and the second is exclusive.** Who: a list of players, or — by leaving the
  list out — everybody. What: either *n* ordinary cards or a floor on the overall, never
  both. A request setting neither or both is a 400 rather than a guess.
- **The guarantee is a minimum overall, not a tier and not a ceremony level.** It is the
  form both of those reduce to (75 is "goud or better"; the ceremony's steps *are*
  75/80/85/90), it says things neither can — a tier cannot separate 75–79 from 80–84,
  since both are goud — and it is what the wrapper prints, so the print is by construction
  the number the draw was made against. This **replaces `guaranteeTier`,
  `guaranteePlayerId` and `guaranteeLevel`**, which are deleted: `Pack.minimumOverall` is
  the whole of it now, on the wire and in the browser.
- **A floor narrows the candidates and changes nothing else**, so the weighting still
  applies inside the band and 75+ hands out far more 75s than 90s. If nobody clears it an
  ordinary weighted draw happens — an empty packet is worse than a broken promise.
- **"Everybody" is expanded into one addressed row per player, at gift time.** It used to be
  a single row with a null recipient, which resolved the recipients at *claim* time and so
  also reached whoever crossed the games gate later — and that was the only reason gifts
  carried a deadline at all. Both are gone: **presents do not expire**, and the word
  "everybody" is a convenience in the call rather than a shape in the table. Every row has a
  recipient, so a present is addressed to the office as it stood on the day it was given.
- **A gift claim is the one claim not keyed on the day.** `Derive` narrows game and daily
  claims to today and reads gift claims in full, because a present outlives the day it was
  opened on — key it on the date and the same packet is handed over every morning. There
  is a test for exactly that, across three days.
- **Presents sit on top of the pile**, above the game packs and the daily: the unusual
  thing on the shelf, and the only one nobody played for.
- The unique index is `(PlayerId, GiftId)` and needs neither a filter nor a date — `GiftId`
  is null on every other claim and SQLite treats those NULLs as distinct. Withdrawing a
  gift by deleting the row takes its claims and their cards with it, the same rule as a
  deleted game.

Two things worth knowing about how it landed:

- **The rule lives in `Derive`, not in the query.** The first pass filtered gifts by
  recipient in SQL only, so `Derive` would hand somebody a present addressed to a
  colleague. A test caught it. Who a present is for, whether it has run out and whether it
  is already claimed are all decided in `Derive` now, beside the day window, with the query
  narrowing rows purely as a read optimisation.
- **`AvailablePack.MinimumOverall` serialises as `null`, not as an absent field**, so
  `=== undefined` reads every *earned* packet as guaranteed — printing `null+` in orange
  foil on all of them. `packFloor` in `cardMock.ts` is now the single test both the print
  and the foil go through, and its note says why.

**The test panel stays**, against what this document used to say, and everything on it is
real: the pack buttons hand the **signed-in player** a present, so nothing on the panel
fakes state the server does not have. It deliberately does not offer the other two
shapes — a button that quietly gave the whole office a packet is not a thing to have one
click away from a button that gives you one, so a named list and "everybody" are reachable
from the API only.

**And it is development-only, compiled out rather than hidden.** `SHOW_DEBUG` is
`process.env.NODE_ENV === 'development'`, which webpack inlines at build time, so a
production build eliminates the branch and the panel is not in the bundle at all — no
markup, no strings, nothing to unhide. A runtime flag was rejected for exactly that: the
panel gifts packs and deletes albums, and a flag is one devtools line away from being on.
It is the outer layer of two, and the inner one is the real fence — `collections/gifts` is
`[AdminOnly]` (which waves Development through and asks everybody else for a key), while
`DELETE collections/{playerId}` and the icons `force` path both return 404 outside
Development. So the buttons are gone *and* the calls behind them are refused; either alone
would have been enough to be safe, and the pair is what makes it hard to undo by accident.
One consequence worth knowing: `NODE_ENV` is `test` under jest, so the panel is absent in
tests too. Nothing asserts on it today, and a test that wants it should render the panel's
contents rather than flip the flag.

**It now lies at the foot of the right margin**, under the register, rather than on a
full-width plate beneath the table. That was not about the panel: the book is sized off
viewport height before anything else, so the ~83px band under it was coming straight out
of the spread, and the album's height term went 63vh → 70vh when it left. It moved
*inside* `.album-layout` to get there, so it is gone on the error notice, the ledger, the
hourglass and the padlock — every button on it needs a player *and* an album, so on all
four the whole panel was disabled anyway. It keeps `--debug`, which makes it the one thing
in either margin that is not an object lying on the wood.

The one cost, accepted: giving answers with the gift ids rather than a collection, because
a present to everybody has no single collection to answer with and the giver is usually
not the recipient. So the panel **refetches**, paying the leaderboard replay the claim
route works so hard to avoid. That is the right trade for something clicked by hand a few
times a month rather than a thousand times a year, and it is why the shelf takes a beat.

Gone with the mock: the `kansen (console)` button, which drew a few thousand packs in
the browser to check the observed frequencies. That check is now
`InclusionProbabilitiesSumToThePackSize` in `UnitTests/PackTests.cs`, where it runs on
every build rather than when somebody remembers to press a button.

**The first backend slice was `GET /api/cards/pool`.** Read-only — no migration, no
tables, nothing persisted — and it existed because an icoon is rated on their
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
gate and the icon pool alike. Four players join (Yannick, Sevda, Dmitry,
Sandra), the set is 38 cards, and everyone's per-pack rate falls ~15%. `DHigh`
stays at 2.5 — the slower completion is accepted, not compensated. See
"Why ≥5 games".

Also since: **the games gate moved off the ledger** (2026-08-11). Every name on the
register can be signed now, no line carries a game count, and an under-gate player lands
on a shut, padlocked album that tells them how many games are left — `LockedAlbum` plus
`locked.css`. See "The ledger lists everybody, and every line can be signed" and "The
album that will not open yet".

Most recently: the **icoon card was rebuilt** (2026-08-10). It keeps its premise —
icons wear a colourway rather than a black `legende` pill — and changes almost
everything else: **one ground for every icoon instead of one per tier**, the shard
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

**Phase 2 has nothing left in it.** The gift endpoint was the last item and is built; the
only open work above this line is the silhouette beat, which is presentation.

Two smaller things still open:
- Whether first-name-only is acceptable now that two Daans and two Jeroens read
  identically on their cards.
- Whether the ceremony should enter at 80+ rather than 75+ (18% of cards rather
  than 28%).

The `src/mock/` directory now holds no mocks — `cardMock.ts` is the card domain the
UI needs and nothing else. Renaming it is ten import sites of churn for no behaviour,
so it is worth doing on its own rather than smuggled into a slice.

`Pack.minimumOverall` is what reaches a ceremony level on demand instead of on a ~3% roll,
and the gift endpoint is what sets it. It replaced three options — `guaranteeTier`,
`guaranteePlayerId` and `guaranteeLevel` — that sat on `Pack` for a phase with nothing
setting them; one number says everything all three could and needs no lookup table to be
read against. `window.cardDebug` is down to the animation speed and the mute setting, both
of which are genuinely client-side.

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
sized by how well they did, and collections build toward a icons unlock.

## Settled decisions

| Decision | Choice |
| --- | --- |
| Storage | Server-side (SQLite/EF Core). Sole source of truth. |
| Identity | `PlayerId`, entered via type-ahead (not a dropdown). Browser remembers the last pick. |
| Signing in | A **ruled ledger** lying open on the table, not a searchbar. Still a type-ahead — you write your name on the line. |
| Signing out | The **register stays on the table**, small, in the margin opposite the packet shelf. Clicking it crosses your name out. There is no player picker anywhere. |
| Sound | Synthesised, **on, and no mute button** — the browser and the OS both already have one. Reachable from `cardDebug`. |
| Starting a collection | A **ceremony, not an absence**. Shut albums lie on the table, you pick one up, and your name is **written** into the cover in gilt — stroke by stroke, by a pen you watch move — before the shelf and the empty book appear. |
| Album cover | Five leather stains — bordeaux, cognac, bosgroen, marineblauw, antraciet — brass edge and gold foil on all five. **Chosen once**, with no preview. |
| Access gate | Collection page unlocks once that player has **≥5 games** — symmetric with the card pool. **Signing in is never refused**; an under-gate name lands on a shut, padlocked album that says how many games are left. |
| Pack recipients | **All four participants** of a game. |
| Pack size | 1 for playing, **+2** for winning, **+2** for beating expected margin by ≥3. So 1, 3 or 5. |
| Opponent bonus | Winning *or* beating expected margin by ≥3 doubles both opponents' tickets in that pack. Flat 2×, does not stack to 4×. Flavour, not balance. |
| Within a pack | Each player at most once — draw **without replacement**. |
| Free pack | One 1-card pack per player per day. |
| Gifts | A pack handed out rather than earned, and the **only** grant-shaped thing in the design. To named players, or to everybody — which is expanded into one addressed row each when the gift is given. Either *n* ordinary cards **or** one card at a floor on the overall, never both. |
| Gift expiry | **None.** A present stands open until it is opened. |
| Pack expiry | **Hard.** Unrevealed at end of day = gone. Gifts and the set-completion packet excepted. |
| Contents rolled | At reveal time. |
| Duplicates | **Not** shown on the card at all — but in the tooltip and the card viewer, which are off-face surfaces. New cards are marked instead, with a glow at reveal. No conversion economy. |
| Card rating | **Live**, computed on read from `visibleRating`. No stat columns on the card. |
| Card sub-stats | **Dropped.** Not worth it for ~15 active players. |
| Rarity axis | Rating alone — no foils, no serials, one card per player. |
| Card pool | **Active** players with ≥5 games. |
| The word | An out-of-service player's card is an **icoon** (plural *iconen*), never a "legend". Settled 2026-08-12, after being live both ways for a while; the data layer was renamed to match the presentation layer, which had it right. |
| Icons | Inactive players with ≥5 games, drawable alongside actives once unlocked. Rated on all-time-high, and **interleaved into the book by rating** rather than given their own pages. |
| Earning them | Completing the active set makes the unlock **claimable, not automatic** — it puts a packet with one guaranteed icoon on the shelf. Opening it re-binds the album and then reveals the card. The latch is still permanent once pulled. |
| That packet | **Derived** like the daily freebie, never granted: offered while the set is complete and its claim does not exist, so it follows the set both ways. One card, normal weighting narrowed to the icons, and a guarantee axis of its own rather than a very high overall floor. |
| Presents | **Never expire.** And a gift to "everybody" is expanded into one addressed row per player at gift time, so every row has a recipient and next year's joiners are not still owed a present. |
| The icon binding | A **half-bound** book: ivory boards with the chosen stain kept as the spine and the four corners. Brass edge and gold foil unchanged, so the five stains stay one product line. The only re-bind that exists. |
| Cards ↔ games | `CardInstance.GameId` FK with cascade delete. |
| Cards ↔ players | `SubjectPlayerId` FK, **also cascade**. Player deletion only ever happens for accidentally-created players, so losing their cards is correct. |
| Presentation | Not a screen: a **mahogany table** seen from above, with the book, the packets and the controls as objects lying on it. No OS chrome, token-driven. Chosen from ten candidates in two families — five screens, five timbers. |
| Album | Hand-rolled stiff CSS 3D page flip. No new dependency. |
| Card face | **Panini**: photo near-full-bleed and masked into the metal, no plates, first name only, DIN type, no stats. |
| Icoon | The colourway an out-of-service player's card wears, not a fifth tier: monochrome photo warmed back up, one near-white two-zone ground for **every** icoon, a 1px gold rule on the edge, no shards. Replaces the `legende` pill. **The tier no longer moves anything.** No effect on rarity. |
| Sound | Fully **synthesised** (WebAudio, no assets). On, with no in-page toggle. |
| Pacing | Two knobs — `DEFAULT_SCALE` (2) and `DEFAULT_CEREMONY_MS` (2000). Both settled by ear on the sliders and baked in. |
| Reveal ceremony | Graduated over four levels at 75/80/85/90 overall. Identical at any timestamp `t`; only the *length* differs. |

Deferred: trading between collections.

Still open: **which stage direction to use** — the last remaining visual decision.

## The icon pool

The `Active` flag is maintained — the database holds a healthy number of
inactive players already, so the icon pool has content on day one. (The
47-player list used for the numbers below came from `GET /api/leaderboard`,
which filters on `Active` via `GetCurrentLeaderBoard()`, so it is the active
roster only.)

Icons are inactive players with ≥5 games, rated on their **all-time-high**
`visibleRating`. Unlock is a permanent latch: once you have completed the active
set you keep the icons forever, so new joiners and players crossing 5 games do
not un-complete it.

**There are 20 of them**, now that `GET /api/cards/pool` can say so, and they
spread across every tier: 4 goud zeldzaam, 7 goud, 7 zilver, 2 brons. That spread
is the thing to keep — it is the whole argument for the icoon carrying its tier's
metal rather than being uniformly gold, and it is now demonstrated rather than
asserted.

### One sequence, not an annexe

Icons are **shuffled in among the actives by rating**, not appended as a block of
icon pages. The book is one ascending sequence and an icoon turns up on the
spread its rating earns it.

The original design appended them, on the reasoning that the album should *grow*
rather than split in two. Interleaving serves that better: unlocking makes every
spread you already knew denser instead of adding a section at the back that reads
as a separate collection with its own completion. It also puts the rarest card in
the album — Roel Loonen at overall 91 — on the last page, past the best active
player, which is where the book was always building toward.

Consequences, both accepted:

- An empty slot no longer tells you whether it is an active or an icoon. See the
  icoon section for why that is kept.
- The set roughly grows by half on unlock (38 → 58 at today's roster), all of it in
  the middle of the book rather than after it.

The unlock gate still counts **actives only** — icons are the reward for finishing
that set, so they must not dilute the thing they are awarded for. (The completion
meter that used to count alongside it is gone with the footer; see "There is no
footer".)

The icon gate is held symmetric with the card pool deliberately, but it is the
one place where 5 is arguable: it means somebody who played five games and left
is an icoon forever. **This has stopped being hypothetical.** Two icons sit at
exactly five games (overall 64 and 58) and three more in the 8–10 band, so the
bottom of the pool is now people who passed through. Whether that reads
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
assume: icons are rated on peaks, and the best icoon is above every active
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

**No player's overall changed** — 0 of 38 actives and 0 of the icoon
placeholders — so the odds table, the completion estimates and `DHigh` all stand
untouched. That is the whole reason this change was safe to make on its own.

Still open, and independent of this: the worst kink on the scale remains **3.13×
at rating 1000**, where the slope snaps from 20 to 62.5 rating per point. Monotone
cubic (PCHIP) interpolation over the same anchors would smooth it to 1.50× while
passing through every anchor exactly; it moves four of forty cards by +1 and
crosses no tier or ceremony boundary.

Icons use the same scale applied to their **all-time-high** `visibleRating`.
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

Icoon exists, but on a **different axis**: it is what an icoon's card looks like,
not a rung above gold. An icoon has a tier like everyone else, and it moves the
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

**Earned** packs are also never guaranteed: the only choice a game makes is the pack
size (1, 3 or 5), and every card in every one of them is drawn on the odds below. A
**gift** is the single exception and it is not a tier guarantee either — it is a floor on
the overall, it narrows the candidates without touching the weighting inside them, and
nothing that comes out of a game can carry one. See the gift notes at the top.

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
leaderboard. If Petar goes inactive he moves to the icon pool and the
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

Icons join the same pool with no special rarity. Their all-time-high overalls
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
| `GET` | `api/cards/pool` | **Built.** Every player a pack can contain: actives on their current rating, icons on their all-time high. |
| `GET` | `api/collections/{playerId}` | **Built.** The whole page in one response — pool, icons, owned counts, available packs, unlock state, eligibility, and the album's binding. |
| `POST` | `api/collections/{playerId}/create` | **Built.** Fetches the player an album in the leather they picked. Idempotent; returns the same payload as the `GET`. |
| `POST` | `api/collections/{playerId}/packs/{packId}/claim` | **Built.** Rolls, files the cards, and returns them with `isNew` and `copies` **together with the whole collection they landed in** — so the page never refetches. 409 for an already-claimed pack, for a player with no album and for one under the gate; 404 for an unknown player and for a pack that is not currently derived, which covers an invented id, somebody else's game and yesterday's packet alike. A refusal carries no state, because nothing changed. |
| `DELETE` | `api/collections/{playerId}` | **Built, development only.** Puts the album back on the table so the opening sequence can be watched again, and takes the cards and the claims with it. Idempotent; 404s outside Development rather than 403, because a route that is not meant to exist should not announce that it does. |
| `PUT` | `api/collections/{playerId}/icons` | **Built, and a real endpoint in every environment** — this is how the icons are earned, and the only thing that writes the latch. The page calls it when the set-completion packet is picked up, **before** claiming that packet, because the draw reads the latch. Checks the active set itself rather than trusting the caller: 409 if it is not complete, because the only way to reach that is a stale page. Idempotent, and a second claim does not move the date. 404 for an unknown player and for one with no album. Two bypasses stay **development only** and 404 outside it: `force=true` skips the check, `unlocked=false` relocks. |
| `PUT` | `api/collections/{playerId}/cover` | Later, and only if wanted. A re-bind. Reserved rather than built — see "The album is chosen once". |
| `POST` | `api/collections/gifts` | **Built.** Presents a pack to named players or to everybody — the one grant-shaped route in the design, and the only one that brings a pack into existence rather than deriving one. Either a size or a floor on the overall, never both: 400 for neither or both, for a size outside 1–10 and for a floor off the scale; 404 for a name that does not exist. It answers with the gift ids rather than a collection, because a present to everybody has no single collection to answer with. **Not** development-only — handing out packs is a real thing to want, and this app has no authentication anywhere by design, so an environment gate would remove the feature while protecting nothing. |

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
    + gift rows addressed to them             minus  a claim for each
    + one icoon packet, if the active         minus  its claim, which is once
      set is complete                                per player and never per day
```

The gift line is the one exception, and it is the exception that shows the rule: a present
is the only pack nothing can be derived from, because nothing happened to entitle anybody to
it. So it needs a row — and the subtraction is still a claim table, and `CreateGame` still
writes nothing.

The last line is emphatically **not** an exception, and that is the point of it. Finishing
the set is a fact about the collection, and a readable one, so it is read — rather than
written as a gift row at the moment the last card landed, which would have been the
`CreateGame` mistake wearing a different hat. It follows the set in both directions as a
result: somebody crossing the games gate takes the packet off the shelf until they are
collected too.

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

- **`PackClaim`** — **built.** `Id`, `PlayerId`, `Source` (`Game` | `Daily` | `Gift`),
  `GameId` (nullable, cascade), `GiftId` (nullable, cascade), `ClaimDate`,
  `ClaimedAt`. Unique on `(PlayerId, Source, GameId)`, on `(PlayerId, ClaimDate)`
  for dailies, and on `(PlayerId, GiftId)`. **Those indexes are the double-claim guard** —
  two tabs racing means one insert fails, and that failure is the 409. There is no separate
  check to forget.
  - The daily index **must be filtered** (`WHERE "Source" = 'Daily'`). As written
    here it was `(PlayerId, Source, ClaimDate)`, which is fine, but the obvious
    unfiltered `(PlayerId, ClaimDate)` forbids a player claiming two *game* packs on
    one day — the normal case for anyone who plays twice in an afternoon. There is a
    test for exactly that.
  - SQLite treats NULLs as distinct in a unique index, so the first index does not
    accidentally cover the dailies either. The three are genuinely separate rules — and
    the same NULL semantics are why the gift index needs no filter, since `GiftId` is null
    on every game and daily claim.
  - **The gift index carries no date, deliberately.** A present stands open for days, so
    keying its claim on the day would let it be opened again every morning. That is also
    why `Derive` narrows game and daily claims to today but reads gift claims in full,
    and why `ClaimDate` is stored on a gift claim as a record rather than as a key.
  - `Source` is stored as a **string**, via `HasConversion<string>()`. EF maps enums
    to `int`, and an added source would then silently renumber the existing ones. `Gift`
    was exactly that added source, and it cost nothing.
- **`CardInstance`** — **built.** `Id`, `PlayerId` (owner), `SubjectPlayerId` (who's
  on the card, cascade delete), `PackClaimId` (cascade), `GameId` (cascade delete),
  `IsIcon`, `MintedAt`, indexed on `(PlayerId, SubjectPlayerId)` because every read
  of a collection is "how many of each subject".
  - Deleting a game therefore reaches its cards **two ways** — directly, and through
    the claim — which SQLite is happy to have. The direct one is kept because it is
    the one that states the rule.
  - `IsIcon` is frozen at mint time, and it is **history only — nothing reads it to
    decide what a card looks like.** This bullet used to reason that freezing it stopped
    somebody going inactive from "retroactively handing you an icoon", which reads as
    though the column governs the face. It does not, and the opposite is true: cards are
    live, so **a card you already hold turns into an icoon the moment its subject goes out
    of service**, because the album draws its slots and its colourway from the current
    pool. That is the same rule as a zilver card becoming goud when someone's form
    improves. What this column answers is "what came out of the packet", which is a
    question about history rather than about presentation — wiring it into rendering would
    freeze a card's face at mint and quietly contradict the live-card rule.
- **`PlayerCollection`** — **built**, and the only table so far. `PlayerId` (PK
  *and* FK to `Players`, cascade), `Cover`, `CreatedAt`, `IconsUnlockedAt`
  (nullable — a permanent latch, so new joiners and players crossing 5 games don't
  un-complete an existing unlock; written **only** by the claim endpoint when the
  collector presses the seal, never by opening a pack).
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
- **`PackGift`** — **built.** `Id`, `PlayerId` (nullable: null means everyone), `Size`,
  `MinimumOverall` (nullable), `Reason`, `CreatedAt`, `ExpiresAt` (nullable). The only
  grant-shaped table in the design, because a present cannot be derived from anything that
  happened.
  - `MinimumOverall` was not in the original sketch and is the second half of the
    feature: a gift is either *n* ordinary cards or **one** card at a floor. `Create`
    forces `Size` to 1 whenever a floor is set, so the two cannot disagree — two
    guaranteed golds in one packet is a different product and nothing has asked for one.
  - **`PlayerId` is required: every present is addressed.** It was nullable, where null was
    the whole of "everybody" — one row rather than one per player, resolving the recipients
    at *claim* time. `GiveGift` now expands the word into one row per player on the roster,
    so the convenience lives in the call and the table holds only addressed presents. The
    migration that tightened the column expands any existing unaddressed rows the same way
    and re-points their claims first, so no cards are lost — see `AddressEveryGift`, which
    was hand-written because EF's scaffold would have defaulted the column to `""`.
  - **`ExpiresAt` is null: presents do not expire.** They stood open for seven days, as the
    deliberate exception to hard same-day expiry — a present that vanishes overnight is a
    mean present, and unlike a game pack there is no "you were not here, so you earned
    nothing" to fall back on. The deadline only ever existed to stop an *unaddressed* gift
    reaching next year's joiners, and expanding "everybody" removes that reason at the root.
    The column stays, and `Derive` still honours it, so a kind of gift that wants a deadline
    can have one without a migration.
  - The player FK cascades, so a player deleted as a mistake leaves no presents addressed
    to them. Deleting a gift row is how a mistaken present is withdrawn, and it takes the
    claims and their cards with it — the same rule as a deleted game, for the same reason.

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

Generated as `20260811121556_AddPackClaimAndCardInstance` and
`20260811133444_AddPackGift` — `dotnet-ef 8.0.0` is pinned in
`.config/dotnet-tools.json`. Note that `dotnet ef` builds the project, so a running dev
API locks `bin\Debug` and the build fails on the exe copy; `--configuration Release`
sidesteps it without stopping the API.

Note also that `dotnet ef` **picks its database from the environment, and defaults to
Development** — not to Production the way a plain `Host.CreateDefaultBuilder` app does, since
the tools set `ASPNETCORE_ENVIRONMENT=Development` themselves when it is unset. So a bare
`dotnet ef database update` moves `C:\tafelvoetbal-data\`, and production needs
`ASPNETCORE_ENVIRONMENT=Production` or an explicit `--connection`.

**`dotnet ef migrations list` cannot tell "not applied" from "cannot reach the database".**
With an unreachable path it reports *every* migration as `(Pending)`, silently — no warning,
not even under `--verbose`. Reading that as the truth about production is a trap worth
knowing about, because `newInitial (Pending)` against a database the app is plainly serving
looks like a catastrophe and is in fact a connection failure. The `T:\` share is not mapped
on the dev machine at all, so this is the *normal* result there rather than a corner case.

The gift migration adds a column to `PackClaims`, which SQLite cannot do while keeping a
new foreign key — so EF rebuilds the table and recreates its indexes. Additive and safe,
but worth knowing it is not the one-line `ALTER` it reads as.

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
- **`Services/CardPoolService.cs`** — actives and icons. Knows nothing about
  collections or packs; it is the set, not anyone's state over it, which is what
  lets `CollectionService` call straight into it rather than build its own list.

- **`Services/PackService.cs`** — deriving, sizing, rolling, claiming, the daily
  freebie, and giving. `Derive`, `PackForGame`, `DailyPack`, `GiftPack` and `Roll` are all
  **static**: they are pure functions of the arguments handed to them, which is what lets
  the tests drive them without a database, and `Roll` takes an injectable `Random` for the
  same reason.
  - `GiveGift` is the exception and has to be — it is the one write in this design that
    brings a pack into existence. It writes a `PackGift` and nothing else: no roll, no
    mint, no collection touched, so from the tear onwards a present and an earned pack are
    the same object. `ReadDerivationInputs` is the shared read behind `GetAvailable` and
    `Claim`, so the shelf and the claim cannot come to different answers.
  - `Roll` takes a nullable `minimumOverall` **before** the `Random`, which is why the
    tests pass `random:` by name. It narrows the candidates and touches nothing else, and
    falls through to the whole pool when nobody clears the floor.
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
and it returns the whole page in one response — `pool`, `icons`, `owned`,
`packs`, `iconsUnlocked`, `eligible`.

**Not split into collection / pool / icons routes.** The book is one object:
`CollectionPage` builds its sections from pool + icons + counts together and
`albumSlotOrder` walks the result, so three routes would mean either an album that
cannot draw until all three land, or one that draws and then *grows a section* —
which shifts every card-viewer index behind it, underneath an open viewer. The
same argument rules out splitting the pool into ordinary cards and icoons.

**That argument does not cover `packs`, and it is worth saying so** rather than leaving
somebody to notice the gap and conclude the shape was an accident. The shelf is a
separate object in the opposite margin; it could arrive a beat late and shift no card
index at all. `packs` is on this response for a different reason, and this is the one to
keep:

> **Deriving a pack needs the replayed games**, because `OldRating` only exists inside
> `GetLeaderBoard()` — and the collection read is already paying for that replay to
> produce the pool. A standalone `GET /packs` would pay for a **second** full replay of
> every game ever played, in order to return two or three small objects. Splitting
> duplicates the single most expensive thing on the request.

What it costs, both accepted: packs are suppressed when there is no album, a rule that
exists only because they share a payload with one; and there is no cheap route to poll
if the shelf should ever want to notice a colleague logging a game while you are looking
at it. Neither is worth a second endpoint — and if the second ever does become real, the
thing to fix is caching the replay, not splitting the route.

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
plates, buttons, input, meter, readouts *and* the book's inside covers
(`--book-inside`). The header and the footer are both gone from the album page
now, but `GameShell` still takes them and the tokens still dress them.

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

1. **The table is a table-sized object, not a background.** `width: min(1740px,
   97vw)`, centred, with an edge that catches the light and a shadow on the floor.
   Bleeding the wood to the edges of the viewport made it a texture behind a page.
   The figure has to clear the album, which sizes itself from the *viewport*
   rather than from its container — see "The shelf was overlapping the book" for
   where the number comes from, and "The footer's space went into the spread" for
   why it is 1740 rather than 1660.
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

- **At the top of the margin opposite the packet shelf**, and out of flow for the same
  reason: the book is centred on the table and neither margin can move it. The two things
  lying beside the album are what you came for and how you leave.
  - It no longer has that margin to itself — the test panel lies at the foot of the same
    column now (`bottom: 0`, so it needs to know nothing about the register's height).
    The register keeps its 210px cap rather than stretching to match the plate: a ledger
    widened to a 340px slab stops reading as one sheet of the book you signed.
- **The strike is drawn, not switched on.** A pen crossing out a name is a stroke with a
  direction and a duration; `line-through` appearing all at once is a state change, and the
  difference is the whole beat. A `scaleX` on a pseudo-element, so it costs no layout.
- **It carries no caption.** It was captioned (`uitschrijven`) on the reasoning that a
  ledger with your name on it could as easily mean "look at this" as "leave". The caption
  was dropped: it was the one piece of interface copy left on a table that otherwise
  explains itself, and the hover title carries the same sentence for anyone who waits.
  The pen nib that sat on the line went with it, here and on the signing ledger — a
  CSS triangle reads as a UI marker, not as a pen, and the handwriting already says
  "someone wrote this".
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

#### There is no footer either

It carried four readouts in a row under the table: `n/m actieve spelers`, a 24-chunk
completion meter, a card count, and a line that read `verzamel alles voor de iconen` /
`de set is compleet` / `iconen ontgrendeld`. All four are gone, and `CollectionPage`
passes no `footer` at all.

They were a second, worse copy of what the book already says. An empty slot *is* the
missing player, forty of them side by side *are* the meter, and the gold seal beside the
book already announces a complete set — louder than a line of type ever did, and in the
place the reader is already looking. Keeping the row meant every one of those facts had
two renderings that could disagree, pinned to the one strip of table where nothing else
in the design lives.

`ownedActive`, `totalActive`, `totalCards`, `filledChunks` and `METER_CHUNKS` went with
it. `.game-footer`, `.game-meter` and `.game-readout` are still in `game.css` and
`GameShell` still takes a `footer` — nothing on the album page uses them.

#### The ledger lists everybody, and every line can be signed

Including players under the games gate — and **the ledger says nothing about the gate
at all**, which is the second version of this and the right one.

Filtering under-gate names out was the first version and it is the worst: a name that
is simply not there cannot explain itself, and the players this affects are exactly the
newest colleagues — the ones with least reason to assume the page is working. This is
why the type-ahead is backed by `GET api/players?activeOnly=true` rather than by the
card pool, which excludes them by definition.

Listing them **struck through, with "nog 2 wedstrijden" beside them**, was the second,
and it is what the third replaced. Three things were wrong with it:

- It put the gate on the one page whose entire job is asking who you are. The gate is
  not a property of the signature; it is a property of the album behind it.
- A greyed-out, unclickable line is a dead end shown to the four people on the list who
  are least sure the page works. It explains itself only in the sense that a disabled
  button does.
- The games count in the right-hand column — printed for **everybody**, not just the
  short ones — turned a register into a standings table. There is a leaderboard two
  clicks away for that, and one register that reads as one is a register nobody trusts.

So: every line signs, the count column is gone, and the gate is `LockedAlbum` — a place
you arrive at, with your own numbers on it. See "The album that will not open yet".

One hole, accepted: `LeaderBoardService` builds its stats map per game, so a player
with **no games at all** is absent from that route entirely — they exist in `Players`
and nowhere else. The ledger's empty state says as much rather than us reshaping
`PlayerService` for somebody's first week.

#### The album that will not open yet

Where an under-gate player lands **after** signing in: their album, shut, with a brass
strap down the fore-edge and a padlock on it. Under the book, the number of games still
to play; under that, one pip per game the gate asks for with the played ones filled in;
under that, the register.

- **An object, not a notice.** The gate is not an error — there is an album waiting and
  the only missing ingredient is games. A padlocked book says that in one look, where a
  centred paragraph of Dutch on bare timber says "something went wrong". It is also the
  only thing on this table that would not have to be invented: `albumLeather` already
  paints a shut book, and brass is already the metal on every cover.
- **The leather is bordeaux and it is not a choice.** No cover has been picked — that
  ceremony is on the far side of the gate — so it takes the incumbent stain.
- **The cover is blocked blind**, a kicker and a rule, exactly like the five books on the
  choosing table. Printing the owner's name on it would spend the payoff `AlbumChoice`
  exists to deliver. The name is on the register instead, where it means "you are signed
  in as this person" rather than "this book is yours".
- **The number is the biggest thing after the book**, because "how many more" is the only
  question anybody arrives here with. The total played and the rule behind it are context
  set underneath it.
- **The pips are not `.game-meter`.** That is a completion readout for a collection, and
  borrowing it here would say the album is partly full when it is not open.
- **Smaller than `--page-w`.** A shut book at full page height leaves no room under it for
  the number, the pips and the register, so it has its own size tokens.
- **The register comes along, and that is load-bearing.** The pick is remembered in this
  browser, so a screen with no way out pins the page to a mistyped colleague's gate until
  localStorage is cleared by hand. It sits centred *under* the book rather than in the
  right margin: there is no packet shelf opposite it here, and the margins are the pair
  "what you came for / how you leave" — one sheet alone in one of them looks mislaid.

The number is quoted from `collection.minGames`, the server's value, not from `MIN_GAMES`
— so the copy cannot drift from the rule that is actually enforced. The games-left figure
is clamped at zero for exactly that reason: the page branches on the client constant and
prints the server's, and a disagreement between the two would otherwise land here as a
negative.

#### Choosing the album

Five shut albums lying side by side, blank covers, one per stain. Click one: the other
four are taken off the table, the survivor slides to the middle, comes up to full size,
and the owner's name is **written** into the cover in gilt, stroke by stroke, by a pen
you watch moving. Then the shelf and the book appear.

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
- **The finished book is its own element**, drawing the shut album's box rather than
  growing the shelf book into it — that one is a small flat approximation, and the
  handover has to land on the real geometry or the book jumps at the swap.
- **The swap is hard: nothing crossfades and nothing is measured.** `AlbumChoice` simply
  stops existing and `Album` renders in its place, so every box in the ceremony has to be
  the album's own *to the pixel*, derived in CSS from the same tokens. Three of them, and
  all three have been wrong:
  - **The shut book is a board, not a page.** `--page-w + --board-out` wide and
    `--page-h + 2 × --board-out` tall, centred on its first `--page-w` so the overhang
    falls on the fore-edge, and sitting `--board-out` above the book's own top — which is
    where a shut `.album` puts `.album__leaf--cover`. It was the paper's box, so the cover
    grew 9px on three sides and rose 9px at the swap. This is what put `--board-out` on
    `:root` rather than on `.album`: the ceremony has to draw the album's box while the
    album is not mounted.
  - **The label row above it** has to match `.album__nav-label` in every declaration, and
    it got this wrong twice. First `min-height: 1.2em` against the label's
    `calc(1.35em + 6px)` — 8px of reserve the album had and the ceremony did not, and the
    book dropped 8px. Then both at `calc(1.35em + 6px)`, which is **24.891px, shorter than
    a line box**: `line-height` inherits 1.5 from MUI's `CssBaseline`, so a filled row is
    `1.5 × 14px + 6px` = 27px. That only matters because **a shut desktop book's label is
    genuinely empty** — `spreadLabel()` returns `''` at `flipped === 0` (`gesloten` is the
    mobile branch) — so it collapsed to the reserve while the ceremony's row, which carries
    a non-breaking space, stood at a full line. The book jumped **up** 2.1px.
    - The same 2.1px was in the album on its own, and had been all along: opening a shut
      book gave the row `pagina 1 / …` and pushed the book back down. Nobody had spotted it
      because it coincides with the cover swinging open.
    - Both rules now state `line-height: 1.5` and reserve `calc(1.5em + 6px)`, so empty and
      filled are the same height. The `line-height` is stated rather than inherited on
      purpose: a reserve derived from a figure that lives in another package is a reserve
      that silently goes short again.
    - The album's row **carries no text at all now** — the page counter was dropped, see
      below — so it is empty in every state and the reserve is the only thing setting its
      height. The element stays for exactly that reason.
    - **Neither figure was found by reading the CSS**, and the second one survived a careful
      read that "proved" the rows matched. They came out of a harness that renders both DOMs
      against the real stylesheets and diffs `getBoundingClientRect()` — the discrepancy is
      nowhere near the book, and 2px is small enough to disbelieve. Reach for the harness
      earlier next time.
  - **The well** reserves the album's footprint: `--page-h + 8px`, which is `.album`'s own
    `padding: 4px 0` around a page. The padding is *inside* that figure because MUI's
    `CssBaseline` puts the whole app in `box-sizing: border-box` — worth knowing before
    "correcting" it, since it reads like a rule counting its padding twice. The boards
    overhang out of the well, as they do out of `.album`.
  - On a phone all of this is the paper's box again, because `.album--mobile` slides one
    page at a time and has no board leaves at all.
- **The cover is set unkerned, on both sides, and that lives on `.album__cover`.** The
  ceremony renders the name as one inline-block per character — it has to, each letter
  arrives on its own beat — and inline-blocks cannot kern across their boxes. So the
  ceremony is unkerned whatever the album does, and `font-kerning: none` scoped to the
  ceremony meant the album re-kerned the same name at the swap and every letter past the
  first pair shifted. At `letter-spacing: 2px` on Georgia caps there is very little kerning
  left to do, which is why it took a while to see.
- **The stage carries no `border-radius`.** `.album__leaf--cover` has none — the brass
  hairline is a box-shadow on a square board — while `.album__cover` inside it is rounded
  `0 3px 3px 0`. A shut album is rounded leather with a square hairline just outside it. A
  radius on the stage rounded the hairline too, and those two corners popped square.
- **Nothing here makes a sound, and `AlbumChoice` imports nothing from `sounds.ts`.** Two
  designs were tried and both are deleted — see "The name is written, not stamped" below.
  The rejection that killed the first of them still stands and is why nothing per-letter
  comes back: `playSlot` per letter is eleven grains over 100ms plus a 130Hz boom, so the
  grains smear into a wash and the booms become a pitched pulse train. Per *stroke* was no
  better in the end — it read as smacking.

#### The name is written, not stamped

The cover used to be blocked in hot foil, a letter at a time, with a 2px emboss under the
type because a die dents the leather it strikes. It is now **written in gilt with a pen**,
and the change is not a restyle: a shop that letters a book by hand is a better account of
a personal album than a press that somehow knew your name in advance.

- **Nothing about the old emboss was salvageable, and softening it was the wrong instinct.**
  It described displaced leather, and ink displaces nothing. On a monoline hairline a 2px
  offset does not read as depth at all — it detaches from the stroke and becomes precisely
  the drop shadow the old comment on that rule existed to warn against. It is gone rather
  than reduced. `--foil-emboss` survives for the kicker only.
- **Uppercase and letter-spacing went with it.** A script hand has to join, and caps is the
  one setting that guarantees it cannot; tracking a cursive is pulling the joins apart by
  definition. `font-kerning: none` stays but now means much less — it was there because the
  ceremony set one inline-block per character, and there are no character boxes any more.
- **You cannot animate the drawing of text, and this is the whole reason for a stroke
  font.** `stroke-dashoffset` needs a path; text is not one. The obvious escape — take a
  script webfont and convert its glyphs to paths — is a trap that looks right until it
  runs, because font outlines are filled **contours**: a dash offset walks the letter's
  silhouette, so it reads as the letter being circled rather than written.
- **Hershey script simplex, vendored, and simplex is load-bearing.** `scriptc.jhf`
  (complex) draws every stem as two parallel strokes to fake weight, which under a dash
  offset animates as the pen going up one side of the letter and back down the other — the
  same silhouette failure by another route. Simplex glyphs are true centrelines: one stroke
  is one movement of a pen, so drawing them in order simply *is* handwriting. The data is
  in `hersheyScriptData.ts`, **generated from the `.jhf` and never hand-typed** — ninety-six
  lines of packed coordinates is exactly where a transcription slip hides, and one wrong
  character is one malformed letter in somebody's name that nothing would ever surface.
  The Hershey licence requires its acknowledgement to travel with the data, so it lives in
  that file.
- **Timing comes from path length, not letter count.** The pen holds one speed across the
  whole name, so a wide letter genuinely takes longer than a narrow one. Letter-count
  timing was right for a press indexing along a line and is wrong for a hand. Pen *lifts*
  are charged against the same budget (`PEN_LIFT_COST`), because otherwise the pen
  teleports between strokes and the dot of an i lands in the same instant as its stem.
- **The ceremony is silent, and it is the third sound design here rather than the absence
  of one** (2026-08-15). It went foil tick per letter → grain cloud per stroke
  (`playPenStroke`) → nothing. The per-stroke version was right about *what* to follow —
  one long scratch would keep scratching through every lift, including the one between two
  words where the pen is demonstrably off the leather — and still wrong in the ear: the
  strokes are short and the lifts shorter, so the clouds ran together into a series of
  smacks rather than into a nib. `playPenStroke` is deleted along with its last caller.
  The `playCoverTurn` that laid the finished book down at the end went at the same time —
  with the name already written there is nothing on screen for a rustle to belong to. What
  remains is a hand drawing a name in silence, which is what the picture always was.
- **`--ink` is its own token, and shares `--foil`'s hex today.** Sharing the *value* is
  right — one shop, one pot of gilt. Sharing the *token* is not: `--foil` means hot foil
  blocking, which still has a job (the rule, and the spine on the icon binding), and the
  name is no longer struck. This is the same trap `--foil-rule` already exists to avoid.
- **One gold on all ten stains.** Measured, rather than assumed: gold runs from about
  6.2:1 on cognac, the lightest, to 9.6:1 on petrol, so there is no stain where it fails
  and no case for a second ink. The one genuinely soft spot is cognac's *highlight corner*
  at ~3.5:1, which is one corner of one book, and the fix there is stroke weight or a dark
  sister-stroke — not colour. A per-stain ink was considered and rejected: it would make
  the shelf ten different products rather than one line in ten dyes, which is the rule
  `albumLeather.ts` is built on.
- **The album's own cover never animates this.** `writing` is false there unconditionally.
  A mount is not a re-binding, and a cover that re-wrote its own name on every reload — or
  every time you turned back to leaf 0 — would be a book performing rather than a book.
  The handover is invisible because both sides draw the same strokes from the same pure
  function; `AlbumChoice` computes the duration once and hands it to the component so the
  ear and the eye cannot disagree.
- **A name the font cannot set falls back to printed type.** `writeName` folds diacritics
  (José → Jose, which is what a binder with one set of dies would have done) and returns
  null for anything left over. The fallback is set in italic Palatino and is deliberately
  *not* given the old foil treatment back — a blocked title beside a written one would be
  two different books. **A name is never rendered with characters missing.**
- **The wrap moved into the layout.** An SVG cannot reflow, so `writeName` decides the
  break from the measured width. This is kept rather than dropped: the per-letter version
  wrapped "Anneloes Ernest" as "ANNELOES ERNES / T" until it was made to break on spaces,
  and a cover setting that name as one hairline nine ems wide is the same illegibility by
  another route. `.choice__word` and `.choice__letter` are gone.

#### The sequence ends by opening the book on the voorwoord

The ceremony hands over a **shut** book, it lies on the table for `JUST_BOUND_OPEN_MS`
(420 base, 840ms real), and then the cover swings open onto the voorwoord and stops there.

**This reverses the invitation line that used to be here, and the argument it was made
against is worth keeping**, because it is the thing this has to answer. The album's whole
navigation is undiscoverable by design — no arrows beside the book, nothing drawn on the
page-turn strips — so a new owner has to *learn* that the cover is the button, and the
objection to opening the book automatically was that it spends the cover turn at a moment
the reader did not ask for it and teaches nothing. The answer is that a gesture performed
in front of you is not nothing: the turn the book makes here is the same one a click makes,
on the same hinge, with the same `playCoverTurn` under it, and having watched the cover open
once is a better account of "the cover opens" than a sentence about it. The old line is gone
along with `hint`, `everOpened` and the effect that latched it.

- **It opens onto the voorwoord specifically**, which is the page that exists for this — it
  was added to pay for the front endpaper, and this is the spread it was written to be
  found on. Landing on the first page of cards instead would open the book on a grid of
  silhouettes, which is a book saying you have nothing.
- **The page is found by `kind`, never assumed to be page 2.** `buildPages` pads with blank
  `slots` pages, so a hard-coded index is one composition change away from opening the book
  on nothing.
- **The album decides where it opens; the page only says what happened.** `justBound` is a
  boolean, not a page index — page composition belongs to `buildPages`, and an index handed
  in from `CollectionPage` would be a second thing to keep in step with it.
- **`CollectionPage` lowers `justBound` when a packet is opened**, and that is load-bearing
  rather than tidiness: the opener *unmounts* the album, so a book still marked just-bound
  would open itself on the voorwoord again on the way back and throw away the page you were
  on. The album's own guard is a ref, and a ref does not survive the remount.
- **Reduced motion turns to it with no wait**, per the rule the rest of this page follows:
  land on the finished state, never play it stilled.
- **A just-bound book ignores the saved reading position and mounts at leaf 0.** The
  bookmark is keyed per owner and *outlives the album it describes* — `leegmaken` destroys
  the book and not the bookmark — so binding a second album under the same name mounted it
  already open, somewhere in the middle of the previous one. The ceremony handed a shut
  cover over to a book lying open at page nine, and the beat this whole section is about
  had nothing left to do. Read at mount only, which is enough: `justBound` is raised in the
  same handler that swaps the ceremony out, so it is already true on the first render.
- Somebody returning tomorrow to a book they never opened is a different case and gets a
  shut book, because `justBound` is session state and their saved position is leaf 0. That
  is deliberate — the ceremony is what earns the automatic opening, and there is none on a
  reload.
- `.album__nav-label` still reserves a line's height, which now matters only as a spacer —
  see below.

**The album has no label at all any more.** The row above the book said `gesloten` shut and
`pagina 3–4 / 18` on a spread; both are gone, and the album now presents as a book and
nothing else. Two things it is worth knowing:

- **The `<div>` stays, empty.** `.choice__label` is the same row during the opening ceremony
  and does carry text ("Kies je album"), the handover between the two is a hard swap with
  nothing crossfading, and `--stage-h` in game.css budgets the album's height with this row
  counted in. Removing the element shifts the book up by a line at the handover and puts the
  height arithmetic out by the same amount, so what went is the words alone.
- **Nothing replaced it as a "where am I" indicator**, and that is the point rather than an
  omission. The fore-edge already shows the pile thinning on the left and thickening on the
  right, which is how a real book tells you, and a book that also prints its own page count
  above itself is a UI wearing a book costume.

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

#### Earning the icons: the packet and the re-binding

The re-bind arrived, and it is not a cover swap. **It is the icons unlock**, which is the
one thing a book could legitimately be taken away and rebound for — so the paragraph above
still holds: there is no `PUT .../cover`, and choosing your leather is still a one-time
ceremony. All five pieces of groundwork it lists paid off unchanged.

**Completing the set is an offer, not an unlock.** `PackService.Claim` used to latch
`IconsUnlockedAt` the instant the last active card was filed. That put the payoff for three
months of collecting inside a pack reveal, at the moment the reader's attention was on a
card coming out of a packet — and it made the milestone unmarkable, because by the time
anything could have been shown it had already happened. So the claim writes nothing, and
re-introducing a write there is how it comes back: the offer would close before it could be
taken. It is the same shape of mistake as granting packs inside `CreateGame` — a write
bolted onto the nearest passing transaction, taking a moment away from the place built to
give it.

**The predicate moved to where icon-ness is decided.** `CardPoolService.ActiveSetComplete`
is a pure static next to the code that sorts the roster into actives and icons, in the
`PackService.Roll` / `Derive` idiom. One file now answers "who is an icoon, and when do you
get them". It is *not* on `PackService`, and being inline in `Claim` is precisely what let
the unlock become a side effect of opening a pack. An empty roster is deliberately not a
completed set: vacuous truth would hand the icons to the first person to open a packet on a
fresh database, which is the state every test fixture starts in.

##### The offer is a packet with one guaranteed icoon

**A first pass made the affordance an abstract object** — a gold foil seal lying in the
margin, which you pressed to re-bind the book. It was built, and then replaced, and the
argument that replaced it is worth keeping: the ceremony ended on a book that had just grown
about twenty **empty** slots. The payoff for three months of collecting was "your album got
bigger and emptier". Ten candidate objects were drawn at real size on the real tabletop
first — see [rebind-object.html](rebind-object.html), which is still the record of that, and
of the two findings worth keeping (a run-out hourglass is unusable because
`Hourglass.tsx` is the loading indicator; a date stamp has the best gesture of the ten and
fails on perspective, reading as a knob from above).

So the offer is **a packet**, and opening it hands you your first icoon. It is one object
instead of two, one click instead of two, and it fills a slot in the book it just made room
for.

**It is derived, not granted.** Writing a `PackGift` row when the last active card landed
would have been easy and is the `CreateGame` mistake a third time. Nothing entitles anyone
to this except the state of their collection, that state is readable, so it is read:
`PackSource.Icons`, offered while `ActiveSetComplete` holds and no `Icons` claim exists,
exactly the shape the daily freebie already had. The claim is guarded by a filtered unique
index on the player **alone** — no date, because keying it on the day would offer a fresh
guaranteed icoon every morning.

Three decisions on it, all asked rather than assumed:

- **Normal weighting**, narrowed to the icons. Not flat — a flat draw would make the rarest
  card in the game a one-in-twenty on a packet everybody eventually gets, and Roel Loonen at
  91 should stay something to chase.
- **It follows the set.** A new player crossing the games gate takes it off the shelf until
  they are collected too. That is what "derived" means, and there is nothing to reconcile;
  the alternative needed a row to remember it had been earned.
- **`GuaranteesIcon` is its own axis, not a very high `MinimumOverall`.** An icoon is not a
  rating band — they run right across the tiers — so any floor catching all of them would
  catch most of the actives.

There is **no `IconsClaimable` flag** anywhere, and an earlier version of this section
argued for one. The packet being on the shelf is the whole of the offer; a boolean saying
the same thing is a second thing to keep in step with the derivation, and the two would
eventually disagree about whether the affordance should be on screen.

##### Two ceremonies, and the order is forced

The packet cannot *contain* an icoon until the unlock has landed — the draw reads the latch
— so there is exactly one legal order, and it is not a matter of taste:

```
click packet → PUT .../icons  → book shuts, re-binds   (call 1, Album's ceremony)
             → claim the pack → reveal, first icoon    (call 2, PackOpener's ceremony)
```

Two calls rather than one, and that is what keeps the latch out of `Claim`. `openPack`
recognises the packet, fires the unlock, plays the re-binding while it is in flight, and
`handleRebound` hands the packet to the opener when the book is back. `PackOpener` needed no
change at all — it is handed a pack like any other.

The unlock's response is applied **immediately** rather than parked, which is the opposite
of the pack-reveal rule and deliberate: the claim about to follow depends on it. Growing the
album by half at the same moment is free, because the book is shut.

Skipped entirely when the book is already bound — the test panel's `force` path — because
re-binding a book already in its icon binding is a ceremony with nothing to show.

**The ceremony lives inside `Album`, not beside it.** `AlbumChoice` is the precedent for the
*timing* — a phase enum driving a phase class, base constants at half length, `after()`
timers cleared on unmount, the write fired at the start and `onDone` at the end — but not
for the placement. Three reasons, and the first decides it: the book has to be seen to
**shut**, and only the real one can do that, because it owns the leaf state, the
`.album--closed` transform and `playCoverTurn`. A stand-in would have to reproduce a shut
book's exact 3D state to hand back motionlessly, which `AlbumChoice` only gets away with
because it never has to match an *open* book. And the new cover layer has to live on the
real cover regardless, since the book keeps that binding forever afterwards; building it
twice is how the two drift.

Five beats, base (so half their real length at `--anim = 2`), ≈2450 total — close enough to
`DEFAULT_CEREMONY_MS` that the pacing was already known-good on this stage:

| beat | base | what moves | sound |
|---|---|---|---|
| `shutting` | 620 | `flipped` forced to 0; the existing closed-book transform and leaf flip do the work | `playCoverTurn` |
| `settling` | 200 | held shut, nothing moving — a press has a pause before it | — |
| `binding` | 900 | the build: the new binding drawn across the board from the spine | `playRebind(900)` |
| `resting` | 460 | the board settles — **the accent** | `playCoverTurn` at +120 |

> **A `blocking` beat used to sit between `binding` and `resting`**, foil-blocking `ICONEN`
> across the new boards a letter at a time with `playFoilStamp` under each one. Both the
> beat and the word are gone — the binding is what tells you the book holds icons, and a
> caption under it is the cover explaining itself, the same objection that removed the
> `legende` pill from the card face. `playFoilStamp` itself has since been retired
> altogether: the album cover is written rather than stamped now, and the function's last
> caller went with it. See "The name is written, not stamped".

What accumulates is one continuous quantity, the binding travelling across the board, so the
build looks identical at any timestamp — the load-bearing rule. The single accent is the last
letter landing together with the board. `playRebind` takes its length from the caller like
`playRareRise`, and is friction and air with **no pitch and no low end**: every note in
`sounds.ts` belongs to the D-minor payoff ladder, so a pitched riser would either join that
chord or fight it, and a boom would spend the arrival early.

> **And there is now no boom in the ceremony at all.** `playCoverTurn` used to end on a
> landing — an impact plus a 76 Hz boom at a fixed +0.55s — and it is deleted (2026-08-15).
> One delay cannot suit four callers: no cover animation here is 550ms long, so the thud
> never arrived *with* the board. It read as a stray *dook* after the move was over, and the
> two places it was worst are the two where the book is already lying still — this `resting`
> accent, and the finished album being laid down at the end of the choosing ceremony. The
> arc's own decay ends the turn. `playImpact` and `playBoom` both survive for the payoffs.

**Half-bound, and that is what makes the spine free.** Ivory boards with the chosen stain
kept as the spine strip and four corner triangles. `albumLeather.ts` warns that the cover,
the binding and the shut leaf's board edge must agree or the book comes apart at the spine —
and on a half-bound book the spine *is* the leather, so `.album__binding` and `--board-edge`
needed no new rules at all. The boards are warm ivory rather than white (`--board-hi/-mid/
-lo`), because a true white next to brass reads as paper stock and the object has to stay a
book, and they are identical on all five stains for the same reason the brass edge is.
Emitted unconditionally from `albumLeather`, so there is no second code path to fall out of
step.

**The leather runs along all four edges, at the height the corners already arrive at.** Four
corner pieces on a bare board read as four marks printed on it rather than as covering
material, and the corners were already asking for the band: a `13% 13%` box on a board taller
than it is wide is a tall rectangle, so the 45° cut cannot reach either far corner of it and
leaves a flat run of leather standing at both ends of the head and the tail. That run is
`6.5% × (H − W)` — 8.3px at a 420px page, 10.9px at 560px — and `--board-band: 10px` is it as
a literal, since CSS cannot mix the two axes in one length and a band a pixel or two proud of
the corners is invisible where a band a pixel or two shy of them is a step. Same `--leather-lo`
as the corners, because a band even a shade off puts a seam exactly where the two meet.

The band is on the cover's face, and the first attempt was **not**: a pseudo-element at
`inset: -2px` on the shut cover leaf, turning the brass rule to stain for the length of each
corner, on the reading that a corner piece wraps the board's edge. That is a real thing a
binder does and it is invisible — 2px of leather inside an already dark olive rule, on a book
500px wide. Worth knowing before reaching for it again: the note above `.album--icons
.album__cover-icons` is what is left of it.

**The brass is a hairline between the stain and the ivory, and nowhere else on this binding.**
The 2px rule round the outside of the shut board came from the leather cover, where it is an
edge of brass on a board covered in stain. Once the leather moved to the trim that same rule
boxed in the outside of the very material it exists to edge — two lines a few pixels apart
saying the same thing. So `.album--icons.album--closed .album__leaf--cover` restates the drop
shadows without it, and the brass goes where a finisher would run a gilt line: along the inner
edge of the covering material. **Drawn as an underlay, not as a frame** — the boundary is the
band's inner edge on all four sides *and* the hypotenuse of every corner piece, so each of the
eight leather layers is repeated beneath itself in `--board-edge`, grown by `--board-rule-w`
(2px) and anchored to the same trim. What escapes at each edge *is* the outline, corners
included, and it cannot drift out of step with the leather because it is the same eight
shapes. **The corner boxes grow by `√2` more than the edges**, because growing a box by `n`
moves a 45° edge only `n / √2` perpendicular to itself while a straight edge moves the whole
`n` — without it the corners are drawn a lighter weight than the head and tail. This is not an
exception to brass-on-every-stain: all five leather bindings have the rule, all five icon
bindings have the hairline, and both sets are identical across the five.

**The wipe is a `clip-path`, not the opacity crossfade the note above predicted.**
`.album__cover-icons` is its own element painting the finished binding as one un-transitioned
`background` of stacked layers, revealed by `clip-path: inset(0 100% 0 0)` → `inset(0)`.
`clip-path` is transitionable and `inset()` interpolates, so none of the custom-property
problem applies. It is also better than a crossfade on its own terms: a wipe travelling out
of the hinge reads as the book being **re-cased**, where a dissolve reads as one cover
becoming another. The curve spends most of its length crossing the first third and resolves
in the last fifth — build slow, land fast; a linear wipe reads as a progress bar.

Two traps here, both worth naming because both are the *opposite* of what the surrounding
code taught. `.album__face` does **not** set `transform-style: preserve-3d`, so its contents
are flattened and a `translateZ(1px)` on the new layer buys nothing — the 3D trap documented
on `.album__face` applies to the face, not to what is inside it. And because ordinary 2D
painting order governs in there, an absolutely positioned layer paints over the cover's
in-flow text: the printing needs `position: relative` or **the wipe erases the owner's name
off their own cover on its way across**.

**The book grows behind a shut cover.** The claim's response is parked in
`pendingCollection` and applied on `onRebound`, the same ref the pack reveal uses — so the
roughly-half-again more slots arrive when the book is closed and there is nothing on screen
to shift. Strictly easier than the reveal case it borrows from. The leaf is 0 by then, so the
clamp in `Album` has nothing to do; it still earns its keep on reload.

If the `PUT` fails the ceremony **finishes anyway** — a book that stops halfway through being
rebound is a worse artefact than one that completes and then reports a problem. `onRebound`
finds nothing parked, reopens the book, leaves the seal, and refetches.

Reduced motion and a click both land on the **finished** state, never a mid-point: a ceremony
frozen part-way reads as a hang rather than as a shorter ceremony. `prefersReducedMotion`
moved to `utils/animationSpeed.ts` for this, since it is the third pacing knob and both
sequences on the page have to agree about it.

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

Sizing is driven by viewport **height** first: `min(40vw, 63vh × 0.78, 560px)`. A
purely width-driven book grew taller than the viewport on shorter screens and
pushed the controls below the fold. The height term is deliberately written so it
cancels into "the page is exactly Xvh tall", which makes X spendable against
anything else on the stage — see "The footer's space went into the spread".

#### The page is bare, and that took four rounds to arrive at

**A slots page now carries the paper, the mounts, the cards and the page number.
Nothing else.** Three things were taken off it, and none of them should come back
without reading this:

- **The running head.** "Verzamelalbum · \<naam>" with the tally opposite, above a
  2px rule. Every word of it was already known — the cover carries whose album it
  is, which is the same argument that took the owner off the header above the
  stage — so the head repeated a line the reader had just read, on every page,
  twelve times over.
- **The keyline.** A hairline inset 8px from the trim with a companion rule, as on
  a plate book. It drew a box around a page whose content already sits in a grid,
  inside a frame the binding was already providing.
- **The ghosted monogram.** A serif "T" at 42% of the page width, centred at 5%
  opacity. **It sat directly behind the middle column of cards**, which is the
  generalisable part: nothing decorative goes behind a card. A page mark is not
  forbidden, but it belongs in a margin — and if it is ever wanted large, the
  editorial trick is to set it in the margin and let the trim crop it, so it
  cannot reach the grid.

The bareness is a deliberate endpoint, not a lack of ideas. Twenty alternatives
were mocked up as standalone spreads first — a works-drawing of the table with the
gutter as the halfway line and the rods running through the card rows; photo
corners with pencilled names and the ghost of a card pulled out years ago; gilt
tooling with marbled paper in the gutter; a passe-partout with engraved brass
nameplates; black velvet; a mahogany tray; a printer's proof; a teletekst
supplement; a herbarium sheet; and ten modern ones from a Swiss grid through a
progress rail to a contact sheet. **Every one of them was more page than the cards
needed.** That is the finding worth keeping: on this page the collection is the
content, and each layer of furniture was competing with it rather than framing it.

#### The head band, and what colours it

**The bareness above is superseded at the head, and only there.** A slots page now
opens with a **printed band bled to head, fore-edge and fold**, with `COLLECTIE ·
68 – 72` reversed out of it in cream; under it a hairline, the mounts, a second
hairline, and the folio centred on the same measure. The mounts, the cards and the
bareness of everything below the head are untouched, and the argument that took the
running head off still holds — what is in the band is the **rating range**, which is
true of that leaf and no other. The band is `.album__band`; the design was worked out
as a standalone spread first, in `docs/album-headband.html`.

Three things about it that will otherwise be undone:

- **It takes the book's own leather**, mixed from `--leather-mid` toward the paper's
  cream. Not `--leather-hi`: across the five stains `mid` sits in a much tighter band
  of lightness, so one mix serves all five, where a mix off `hi` leaves cognac too pale
  to hold the reversed type and antraciet nearly black. It is ink on paper, so it is a
  step lighter than the hide — a raw stain at 13% of a leaf reads as a swatch of the
  cover pasted onto the page.
- **`--band` cannot be declared on `:root`.** `albumLeather` puts `--leather-*` on
  `.album` as an inline style, and a `var()` inside a custom property is substituted on
  the element that declares it — so a `--band` at the root mixes the bordeaux fallback
  for ever and every book prints the same band. It is declared on `.album`. The same
  trap costs the page geometry nothing only because `--page-h` and the band's own
  fractions are both on `:root`, where the media queries that restate `--page-h` are
  picked up correctly.
- **The type sits below the band's optical centre**, by a fourteenth of its depth. The
  eye puts the centre of a mass of colour a little high, so a line on the true centre
  of a band this deep looks like it has slipped up.

**The band is not coloured by the tiers on the leaf, and this was decided with both
alternatives built.** They are still standing in `docs/album-band-colours.html`: the
metal of the leaf's ratings, cut at the tier boundary or ramped across it. The album is
one section sorted ascending by rating, so it was real information — you would learn to
thumb straight to the gold end — and it lost anyway, on four counts. **The cut lands in
the head type**, because its position is data and not layout: on a leaf running 73–81
the silver/gold boundary falls exactly where the numerals are set, and the next leaf
puts it somewhere else. **Bronze, silver and gold are the collection's language**, not
the press's. **The ink would become a second thing the tier moves** — the card's own ink
had that bug once, see "a bronze per tier was tried" in card.css. And **the fore-edge
cannot state a pile of mixed metals**. What the leather buys instead is the thing a
running head band is for: it is architecture, not information, and its sameness on every
leaf is what makes a stack of sheets read as one manufactured object. It also pays off
the one-time stain ceremony on all sixteen pages instead of on the cover and the
endpapers alone.

If the thumb-index is ever wanted, the candidate worth reviving is the third one in that
file: the stain band with a **three-pixel metal rule along its foot**, which carries the
tier without a gold field on cream and without touching the type.

**The fore-edge reports the pile's bands, and it took four goes to get right.** The
hairline at the trim moved to `z-index: 3`, *above* the band: it stands for the edges of
the sheets underneath, and ink printed on the top sheet cannot cover them. It then
carries the band's colour a shade darker for the band's own depth. Three things about
how much colour, and they were each arrived at by getting it wrong first:

- **It comes down in three 2px steps**, not as a level rectangle. A block is fanned, so
  each sheet sits a hair lower than the one above and the band's foot cannot be level
  across the pile. A smooth slope is the obvious fix and is wrong: over six pixels a
  diagonal reads as a wedge of colour rather than a stack.
- **It draws the sheets UNDER the top one, which is left out of its own pile.** Of the
  leaf on screen you see the face; its edge is where that face stops. Counting it made
  the first slots spread — where the left pile is the single sheet carrying the voorwoord
  and the first slots page — report that leaf's own band back to it with nothing but
  boards underneath. The stack *widths* still count it: a pile of one sheet has a
  thickness, and it is the colour that describes what is beneath.
- **A page with a white head has a white stack**, unconditionally, and this one is a
  trade rather than a refinement. `--band-l` / `--band-r` and `--white-l` / `--white-r`
  describe each pile truthfully as `white | banded | white` — see `pileBands` — and on the
  voorwoord and checklist spreads the truth is inconvenient: the sheets a little way down
  are slots pages, so an honest strip puts the band's brown a few pixels from a head that
  plainly has none. A bare tenth at the far end and then a dropped innermost tread both
  failed to fix it, because the pile really is banded and seven pixels is not enough to
  say so quietly. So the drawing gives way to the page it is printed on. The cost is
  real: on those two spreads the book stops reporting that its other leaves are banded.

The fractions are still computed and still used everywhere else — it is how the last
spread comes out white without a special case, and how the middle of the book carries
colour nearly to the trim.

The paper was rebuilt for the band's sake as well: **formation, fibre, flecks and
tooth**, in that order of importance, multiplying into the leaf's own lighting. A single
fine noise is what it was, and it gives a surface no photograph of paper has, because it
is uniform and paper never is. The base cream was lightened three points to pay back
what four multiplying layers take out; move one and the other has to follow.

#### The cover carries a name and nothing else

**The tally is off the cover too.** It read `<owned> / <total> spelers` under the
name, and it was the least physically defensible thing in the album: a figure that
changes every time a packet is opened, blocked into a binding **in gold foil**.
Foil is struck once when the book is bound and is never rewritten. So the cover now
carries the kicker, the name, and the rule that used to divide the two — which
closes the cover as a flourish rather than dividing it, the way a foil rule does on
a real binding.

`AlbumPage.subtitle` went with it; nothing else ever set it. `.album__cover-sub`
**stays in album.css**, because `AlbumChoice` uses it for the static "nog geen
kaarten" on the unbound books — a printed line, not a counter. One consequence
worth knowing: that line therefore disappears between the ceremony's cover and the
bound album's. If the discontinuity reads badly, the fix is a line that is true
forever — an edition ("seizoen 2026"), which is exactly what a real album cover
carries — not the tally coming back.

**Where a count belongs is the checklist at the back**, because that is the one
page in an album a hand writes on. See "The checklist at the back" below.

#### Boards, endpapers and the voorwoord

**Leaf 0 used to carry `[cover | first page of players]`, and that was wrong.** Opening
the book landed you on a spread whose left-hand side was the *back of the cover* with
six card slots printed on it — one physical sheet doing duty as both the board and the
first page, which is a thing no book does.

The old comment gave a real reason for it: an inside cover costs a page, and on mobile
(one page per swipe) it would be a swipe with nothing on it. **That reason is answered
rather than overruled** — the page is not empty, it carries the voorwoord:

```
 0  cover        leaf 0 front    the board, outside
 1  endpaper     leaf 0 back     the board, inside — nothing printed on it
 2  foreword     leaf 1 front    the voorwoord
 3  first slots  leaf 1 back     cards start on a spread of their own
 …
 E  endpaper     last leaf       the back board, inside
```

- **The back endpaper must land on an even index**, because that is a leaf *front*,
  which puts it on the right-hand side of the last spread — the side the inside of a
  back board is on. An odd `pages.length` takes one blank sheet first, and a blank
  leaf at the end of the text block is what a real book has there too. This replaces
  the older "no padding to an even page count" rule: that existed because padding
  bought a spread with nothing on either side, and this pads *toward* something.
- Verified across roster sizes 20 / 24 / 30 / 44: first spread is always
  endpaper|voorwoord, cards always start on an odd index, the checklist always starts
  on an odd index, and the back board is always even and always reachable at
  `maxFlipped`. At 44 the final spread comes out `(blank) | endpaper`, which is the
  parity case and is also what a real book does there.
- **Endpapers are leather, from the same `--leather-*` tokens as the cover.** A stain
  chosen for the outside has to be the stain inside, or the board is two different
  objects front and back. The gradient runs the other way (330deg against the cover's
  150deg) because it *is* the other side of the same board, and the hinge shadow comes
  from `.album__face--front` / `--back` rather than from the page number, so it is on
  the gutter side whichever half the face lands on.
- **The boards stand proud of the paper by `--board-out` (9px)** — a binding's
  *squares* — and **they are leaves**: leaf 0 and the last leaf are `--board-out` wider
  and that much taller at each end than a page.
  - This was first done by growing `.album__binding` instead, on the grounds that one
    static rectangle behind everything cannot be caught mid-rotation being the wrong
    shape and covers the back board for free. **That was wrong, and the reason is worth
    keeping**: the overhang belongs to two objects that *move*, so drawing it on
    something that does not left a shut book with no squares at all and forced the whole
    case to appear once the cover had landed. Fading it in only turned a pop into a
    smear — the mismatch was structural, not a timing problem. The cover's edge has to
    be part of the object that rotates.
  - A leaf sits at `left: 50%` with its origin on the spine, so a board spans `[W, 2W + O]`
    unflipped and mirrors to `[-O, W]` flipped. Verified on both sides.
  - **Every face stays at `translateZ(1px)`, boards included.** They were briefly staggered
    to `0.25px`, to sit behind a fore-edge element they had started to overlap, and it broke
    the shut book at once: depth outranks `z-index` in a 3D rendering context, so the pages
    sorted in front of the cover and the first page showed straight through it. Depth cannot
    express this at all — a board is *on top of* the pile when shut and *underneath* it when
    open — which is what `leafZ` is for, and `leafZ` only works while the depths are equal.
  - `.album__binding` is back to `inset: 0`. What is left of its job is the leather at the
    gutter and the drop shadow the object throws on the table, both of which sit behind
    the text block — so when it returns after a shut is now invisible either way, and it
    shares the inside covers' discrete reveal again.
- **`--board-out` is read by three things and they have to agree**: the boards grow by it,
  the pastedowns are inset by it (a glued sheet is page-sized), and the spine caps sit in
  it. Nothing paper-coloured is drawn in that band — see the fore-edge note below for the
  three separate attempts that got that wrong.
- **The pastedown is paper. The leather is the frame around it.** On a cased book the
  covering skin wraps the board's edges and folds onto the inside, and a sheet of paper
  is pasted down *inside* that fold — only the turn-in is leather.
  - It went leather first, on the reading that the inside of the cover should be the
    colour of the cover, and that made the album's largest surface a dark slab. Two
    attempts to rescue it by lightening both failed, and instructively: `color-mix`
    toward cream takes the hue out along with the darkness (a near-black stain mixed
    toward pale cream lands on **grey**, so the half read as mount board), and a warm
    wash over the stain was lighter but still obviously hide. **The eye was not asking
    for lighter leather, it was asking for paper.** Lightness is not the same axis as
    saturation, and neither is the same as material.
  - It is a hair deeper than the text block. Endpapers are a heavier stock than the
    pages they protect, and that difference is what stops the front matter reading as a
    page that lost its printing.
- **What says *glued* is the turn-in**, not a shadow. On a cased book the covering
  leather wraps the board's edges, folds onto the inside, and the pastedown is glued
  down inside that fold — so a narrow leather frame runs all round it. A loose sheet
  has a shadow under it and no frame; this has a frame and casts nothing outward,
  because it is all one board.
  - A **4px border in `--leather-mid`**, not an inset ring. `inset 0 0 0 5px` plus a
    10px blur was a near-black frame with a soft black gutter inside it — a mount
    frame around a panel, and heavy enough to be most of what you saw on the spread.
  - **Open on the gutter side.** A pastedown runs into the hinge; there is no fold to
    see there, and drawing one boxed the paper in on the one side where a board is
    continuous. Which side that is comes off `.album__face--front` / `--back`.
- **The fore-edge is a hairline at the page’s own trim, and it took four homes to get
  there.** It shows how thick the block is on each side, so the edge thins on the right as
  it thickens on the left and you can see where you are without reading anything.
  - **It is not in the board overhang, and that is the whole history of the feature.** It
    lived there three times — as elements pinned outside the book box, the same elements
    at a staggered depth, then a band on the boards’ faces — and each one was drawing page
    edges on a strip that is *board*. A pastedown is page-sized like every other sheet, so
    beyond the trim there is leather and nothing else. Every version read as one more pale
    page lying under the one you were on, because that is what it was.
    - The dead ends are worth keeping because each is individually tempting. Elements
      outside the box work only while the boards are page-sized; once the boards took
      their overhang they covered them. Lowering the boards’ depth to get the strip back
      in front broke the shut book, since depth outranks `z-index` in a 3D context and the
      pages sorted straight through the closed cover. And a band on the boards’ own faces
      removed the ordering question but kept the wrong location.
  - **What the top page can honestly show is its own edge**, so `.album__page::after` draws
    it there. A deliberate cheat in the same category as the gutter shading — both are
    drawn over a page’s own margin — and bounded the same way: `--page-pad-x` guarantees
    22px with nothing printed in it, and 6px is the most this ever takes.
  - **Shadow, not paper.** The band was cream at `rgba(255,252,240,.92)`, brighter than the
    page beside it. At the trim what is actually there is the dark between one sheet and the
    next, so this darkens rather than lightens — which is also what stops the “extra white
    page” reading coming back.
  - **A leaf in the air draws nothing.** Every page face draws the hairline, which is what
    makes the top of each pile show one without anybody working out which page that is — so
    the leaf mid-rotation carried a full pile’s worth across the gutter with it, the stack
    appearing on the flipped page before it landed. `.album__leaf--moving` suppresses it:
    one sheet’s thickness is nothing. **The class is gated on motion being enabled**,
    because `moving` is cleared by the leaf’s own `transitionend`, which never fires when
    the leaf has no transition — under reduced motion it would latch on for good.
  - **Counted over paper leaves only, and it can be nothing.** It was `flipped / leafCount`,
    which counted the front board as a turned page and drew page edges on the left of the
    very first spread, where nothing made of paper had moved. The text block is
    `leafCount - 2`, and a side holding no leaves gets **zero**, not `EDGE_MIN`: zero is a
    real state at both ends of the book’s travel.
  - **`EDGE_MIN + EDGE_RANGE` is 6px.** The old cap was 7 because the stack had to fit
    inside `--board-out`; that constraint went with the overhang, and what bounds it now is
    the page margin and the fact that an edge reads as an edge only while it is narrow.
  - Not drawn on mobile: one page slides across, with no spine and no pile either side of
    it, so a hairline there would claim a thickness the book does not have.
- **The book is a cased hardcover, and the spine says so.** Worth settling in writing,
  because a sticker album is the one thing it is not: a Panini album is saddle-stitched
  card with no boards and nothing at the head of its spine. This album went the other
  way long before the spine existed — five leather stains, gold foil blocking, a
  binding ceremony — so the reference for the *case* is a cased book and the Panini
  reference lives in the cards and their mounts. Splitting the difference is the one
  option with nothing to recommend it: half a hardcover reads as a mistake, not as a
  third thing.
  - **All the hardware lives in the caps, and none of it on the paper.** The visible
    case of an open book is the head and tail overhang — that gap is the only place you
    can see past the paper into the hollow. So `.album__spinecap--head` / `--tail`
    carry the hinge grooves, the hollow and the headband, and `.album__spine` over the
    pages is **shading with no hard edge anywhere in it**.
    - This was learnt the hard way. The grooves and a 2px leather core started out on
      the full-height overlay, where they became two rules drawn down the paper beside
      the gutter on every card page — and the core ran on past the board's outline into
      the overhang, cutting across the very edge it was supposed to be part of. A
      gradient cannot make either mistake; a hard stop always can.
  - **A cap paints no leather of its own**, and this is the rule to keep. It had
    `linear-gradient(180deg, hi, mid)` as its ground, which looks harmless and is not:
    the binding runs that same gradient over the *whole book height*, so at the tail it
    has long since reached `--leather-mid` while a 9px cap runs the full `hi → mid`
    inside itself and arrives at its own top edge still on `--leather-hi`. A lighter
    patch on darker leather with a seam round it — the spine reading as something laid
    on top of the case's outline rather than as part of it. Painting nothing cannot go
    wrong: the binding shows through at whatever value its gradient has reached, on all
    five stains, and the cap only ever *removes* light. It also stops 1px short of the
    outer edge, so the outermost leather and the brass rule run unbroken across the
    head and the tail — the silhouette is never touched.
  - **22px wide, and the book now agrees with itself about its thickness.** The spine
    started at 40px, which made the gutter the *widest* dark thing on the spread when a
    fold is the narrowest — and its soft wings were duplicating a falloff every page
    already carries (`inset 12px 0 24px` toward the spine). Two soft falloffs stack into
    one broad wash with no defined edge anywhere in it. The division of labour now:
    **the pages own the falloff, the spine owns the fold**, with steep stops putting
    most of the alpha inside the middle ~2px so the crease has a core without a hard
    edge. Narrowing the caps to match moved the grooves from ±10px to ±5.5px, i.e. a
    spine ~11px across — the text block plus its two boards — against the 8px the
    fore-edge reports for the same leaves. At 40px they described a book two and a half
    times thicker than the fore-edge did, and the fore-edge is the one derived from the
    real leaf count.
  - **Hinge grooves**, at ±5.5px from the fold: the channel the covering leather is
    creased into where each board hinges on the spine. One dark line at the fold says
    "two sheets meet here"; a line with a groove either side says "a spine with boards
    on it", which is the whole difference between a case and a fold.
  - **Headbands**, the striped cord capping the hollow — the most recognisable tell of a
    cased book. They are **children of the caps**, so they cannot escape the overhang:
    it is the one element that would look worst floating on a page, and making that
    impossible beats remembering not to. Tucked against the text block (bottom of the
    head cap, top of the tail), which is where the cord is glued — over the folded
    sheets, under the turn-in.
- **The spine is drawn over the gutter**, because there is nowhere else to put it. The
  halves are exactly `--page-w` each and meet at the centre, so nothing behind them
  shows there; and the book cannot simply be widened to open a real gap, because
  `--page-w` is the term the card grid, the checklist and the shelf's packet width all
  derive from, and the leaf model rotates about a single origin, so a gap opened on one
  side closes on the other. The overlay reaches ~17px into each page, which is inside
  the 22px inner margin `--page-pad-x` guarantees — it darkens paper and never a card,
  the same bargain the turn strips struck on the outer margin. It is mostly gradient
  (a solid band would be a bar lying across the spread; darkness gathering at the fold
  is paper curving away from the light), with 2px of opaque leather for the fold itself
  and one hairline of sheen down it. **Known cheat:** a leaf turning through the gutter
  passes behind it. At the gutter a turning page is edge-on and a few pixels wide, so
  it barely shows; if it ever does, fade the spine out while `moving` is set rather
  than moving it behind the leaves, where it could not be seen at all.
- Two consequences worth knowing. The folio now starts at 2 on the voorwoord and 3 on
  the first card page, because the endpaper counts as a page in `sheetCount` even
  though it prints no number — a real book would set the front matter in roman
  numerals, and that is not solved. And a **stored reading position from before this
  change lands one leaf earlier** in content terms; it is clamped and harmless, so no
  migration.

#### The voorwoord is set in a book face, and carries a versal

Two changes to the one page in the album that is extended prose, and they depend on each
other: neither is worth doing alone.

- **Palatino, not Georgia — and the rest of the book stays Georgia.** Everything else here
  is Georgia and on every other page that is correct: it was drawn for small sizes on
  low-resolution screens, with a large x-height and low stroke contrast, which is exactly
  what a 9px checklist entry wants. The voorwoord is the only place those compromises turn
  into costs — the big x-height crowds a paragraph and the flat contrast makes the block go
  grey. This was never a decision before; it was a default that propagated.
  - The bill is a **size floor** the checklist does not pay. Palatino's finer strokes go
    thin below about 11px where Georgia stays solid: the same contrast that earns it the
    page costs it the bottom of the range. The floor is 11px on a phone and 9px elsewhere
    — see the next point for why those are the same number.
- **The type is a fixed fraction of the page, and that is a stricter rule here than
  anywhere else in the book.** Every page sizes its type off `--page-w`, but the others
  hold a grid and can afford to pin at the ends of the range; this one has six paragraphs
  that have to come in under the trim, and they only do that at every size if the type
  scales with the page. So the voorwoord has **no ceiling at all** and a floor that only
  binds on a genuinely small page.
  - What it replaced was `clamp(11px, page-w × 0.0245, 14px)`, live over page widths of
    449–571px — four whole-pixel steps, and the book is outside that band nearly
    everywhere. 1080p at 100% sits on the 14px cap, so zooming *out* grew the page and
    left the voorwoord behind at 14px, and zooming *in* shrank the page onto the 11px
    floor and pushed the last paragraphs through the bottom of the leaf.
  - **Palatino's floor is in device pixels, and a CSS pixel is only one of those at 100%
    zoom on an unscaled display.** Both of the things that drive the size down here —
    browser zoom, and the Windows display scaling that shrinks the CSS viewport the same
    way — make a CSS pixel *larger* than the one the limit was measured against. So 9px
    off the desktop rule and 11px off the phone rule are the same physical limit stated
    twice: the phone is the one viewport with no zoom behind it and no headroom to spend.
  - Everything else on the page is already in `em` and follows for free — the versal, the
    small caps, the title's tracking. The one length that does not scale is
    `--page-pad-x`, which is the whole book's margin and not this page's to change.
  - Georgia stays in the stack and that is not a defeat. Android has neither Palatino nor
    Book Antiqua and lands on it, which is precisely what this page rendered as before, so
    there is no viewport where this is worse than what it replaced.
- **A versal on the first paragraph, in brass.** The case *against* setting this page in a
  hand was two things, and a decorated initial answers both: six paragraphs of script at
  ~11px is unreadable, and a foreword in a real album is **printed** — struck with the same
  press as the checklist — so a written body would be the page claiming a medium it does
  not have. One letter at three lines deep is legible in any face, and an initial is not a
  second hand at all; it is a different sort in the same forme.
  - So the page keeps the **two hands** the checklist already runs on: the press sets the
    body, the title, the rule and this initial; a person signs the foot. The signature is
    the only mark on the page with someone behind it.
  - **Brass (`--board-rule`), not the paper's own brown.** This is the one moment the gold
    from the cover appears inside the book, which is what rubrication is for. Press brown
    would make it merely a big letter. Emitted on every stain unconditionally, so there is
    no icon-binding variant to keep in step.
  - **Contrast is not the constraint people reach for.** Brass on cream is around 3:1,
    which would be far too little for body copy and is ample at four ems — large type buys
    legibility with size, and a versal matching the body's weight stops being an ornament.
  - **Sized by eye against the cap, not by arithmetic off the line box.** The tempting
    formula is `3 lines × 1.55 = 4.65em` with `line-height: 1`, and it is wrong: that makes
    the em *box* three lines deep, and a serif cap fills only about 0.7 of its em, so the
    letter draws barely two lines tall with a line of air stacked over it. `font-size` and
    `line-height` move together here.
  - **Two lines on a phone, not three.** At the narrowest measure a three-line float stops
    being an ornament on a paragraph and becomes a column the paragraph has to get past.
  - **The words after it are small capitals** (`.album__foreword-open`). Without them the
    page jumps from a four-em brass E straight into 11px lowercase, which is the standard
    ugly seam at a drop cap. `font-variant-caps`, not `text-transform` — real small capitals
    where the face has them.
  - **The versal is what makes Palatino load-bearing rather than a preference.** A
    calligraphic initial over an even screen face has nothing in the body to belong to and
    reads as bolted on; over a face with real stroke contrast it reads as the same hand at
    a different size. It also rhymes with the cover, which is now written by a pen.

#### The mount is a recess, and the book has a thickness

Two of the nine proposals in [album-look.md](album-look.md) are in. Both are pure CSS
plus, in the second case, two numbers the book already had.

**The mount is die-cut, not drawn.** It was a 2px dashed gilt rule — chosen over
corner ticks because brackets plus a dashed rule read as two ideas competing on one
small rectangle, which still holds. But a dashed rule is a *drawing of* a place, and
with the page carrying nothing else the mount is very nearly the only furniture left
and can afford to be the real thing. Three layers, each doing one job: a **1px**
hairline where the cut meets the surface (2px is a stroke somebody chose; a cut edge
is a boundary), an inset shadow from **above** because the stage lights from above,
and a 1px lit **bottom lip**, which is what stops the whole thing reading as a grey
smudge. The shadow stays tight deliberately — a wider blur greys the silhouette
underneath, and the silhouette is the entire point of an empty slot. Everything else
is unchanged: same footprint, same 6px radius, still completely hidden under a filled
card, so the rule that the mount is exactly the card's box and never larger survives.

**The fore-edge, and it tells you where you are.** A stack of leaf edges down the
outer trim of each half, one element a side: two hairline sets per 2px for the leaves,
plus a vertical falloff so it does not read as a flat ribbon of stripes.

- **The two sides are deliberately unequal**, driven by `--edge-l` / `--edge-r` from
  `flipped / leafCount`. A fixed equal stack would actively **lie**: at the last
  spread there is nothing left to turn, and a fat stack still on the right would say
  otherwise. So the thickness crosses the spine as you read — the one thing a real
  book does that no printed page can — and it needs no new state.
- `EDGE_MIN` keeps the thin side from vanishing: one leaf is still a leaf, and a side
  at zero reads as the effect failing rather than as a book nearly read.
- **A sibling of `.album__book`, not a child**, for the same reason the turn strips
  are: the book is `preserve-3d`, so anything inside it joins the 3D scene and gets
  depth-sorted against the turning leaves.
- **It must not cost the turn strip a pixel.** The fore-edge paints over the page's
  outer margin, and that margin *is* the strip's 22px hit area — the one column a hand
  lands on, and an overlap there has been expensive once already. So it sits under the
  button (z-index 39 against 40) with `pointer-events: none`, and the check is
  automated rather than eyeballed: a harness probes four screen points across the
  strip with `elementFromPoint` and asserts every one resolves to the button.
- **Not rendered while shut**, like the turn strips: a closed book slides half a page
  left and these are pinned to `.album`, so they would stay behind at the open book's
  edges. A shut book *does* have a visible fore-edge and it would be worth having —
  that needs the stack to live on the cover leaf inside the 3D scene, which is a
  different job.
- **A leaf leaves its pile at once and joins the other one on landing.** Three beats:
  the pile it is lifted off loses it immediately, the page travels, the pile it lands on
  gains it. Both sides changing together — at either end of the flip — is wrong in the
  same way a page teleporting would be.
  - The two sides are therefore read at different moments: `leftLeaves =
    min(live, settled)` and `rightLeaves = paperLeaves − max(live, settled)`, where
    `live` comes from `flipped` and `settled` from `settledFlipped`. `min`/`max` covers
    both directions with no test for which way the book is turning — going forward
    `flipped` runs ahead, so `min` holds the left until landing while `max` drops the
    right at once; going back `settledFlipped` is the higher one and the roles swap.
  - **Mid-flight the two sum to one less than `paperLeaves`, and that is correct** —
    the leaf in the air is on neither pile. Anyone "fixing" that sum will put the beats
    back in lockstep.
- **The gain waits for the landing, and getting that to happen took two goes because
  CSS cannot express it here.**
  - It first interpolated the width across the flip on the leaf's own 620ms curve, on
    the reasoning that the thickness should move while the page moves. That reads
    wrong: the new line appears the instant you click, so the pile has grown by a page
    still in the air.
  - The obvious fix was `transition: width 0s linear <flip duration>` — a discrete
    change on a delay, exactly the idiom `.album__binding` uses to wait out the cover
    fall. **It does not fire on this property.** The width comes from a custom property
    (`--edge-w`), and a property that changes because a `var()` it references changed
    does not reliably start a transition, so the width went on snapping at click.
  - So `settledFlipped` in Album.tsx holds the *state* back by one flip instead, on a
    `setTimeout(ms(leafMs))` — the leaf's own live duration, which `.album__leaf` reads as
    `--leaf-ms` and which the riffle shortens (see "Riffling" below). It was a literal
    `SHUT_MS`, which is right for a single turn and two leaves behind during a riffle.
    `ms()` scales both by the same `--anim` the CSS multiplies by, so the two cannot
    drift. Reduced motion sets it straight through, or the stack would freeze a turn
    behind a flip that never animates. **Do not add a width transition back on top of
    this** — the two compose into a double delay.

#### Riffling: several leaves, one at a time

**`goToPage` sets `flipped` in one go, and a jump of more than one leaf in view is not a
page turn.** Every leaf in between changes class on the same frame, so they all rotate at
once, and `setMoving` can only mark one of them — the rest keep the fore-edge hairline it
exists to suppress. It reads as one turn and then a snap to the destination.

That went unnoticed for as long as it did because `goToPage`'s only two callers could not
hit it: the **first opening** is one leaf from a shut book, and `focusPlayerId` turns the
book behind the card viewer's scrim, where nothing is seen. Putting a pack away is the
first thing that walks the book across several pages **in view**.

So `turnToPlayerId` walks: one leaf at a time, each a real turn with its own sound, and
strictly sequential — one leaf in flight at any moment, because `moving` and the
pile-splitting maths above can only describe one. Per leaf it uses `RIFFLE_MS` (280)
rather than `SHUT_MS` (620) whenever more than one leaf is left to go, published to the
CSS as `--leaf-ms` so the transition and the walk's own timer are the same number by
construction. Three leaves are then ~1.7s rather than ~3.7s.

- **One duration for the whole walk**, decided before the first leaf moves, so the leaves
  of one riffle all turn at the same rate.
- **`turn()` resets it to `SHUT_MS`.** A hand on the paper is always a full turn, and
  `leafMs` is state that outlives the walk that set it — without the reset, every page the
  reader turned after a pack had been put away would keep the riffle's clock for the rest
  of the session. It is reset *there* rather than at the end of the walk because
  `settledFlipped`'s timer is keyed on `leafMs`, and re-arming it the moment the last leaf
  lands would leave the pile edges a beat behind the paper.
- **The album reports arrival** (`onTurned`), and the placing sequence waits for that
  instead of timing the turn. How long a move takes is a property of the distance — none,
  one leaf, or five — so any caller guessing it either flies a card at a page still in the
  air or pays a turn's worth of beat for a turn that never happened. It fires on every
  path, including the ones with nothing to do, or a sequence waiting on it stalls.

#### The checklist at the back — built

The conventional back-of-album page: every collectable listed and numbered, ticked
off as you get it. It is also the one place in the book where a **mutable number is
physically honest**, which is the whole reason it exists here — and the reasoning is
what makes it so.

**Two hands on one page, and every rule in `album.css` belongs to one of them:**

| | who | what |
| --- | --- | --- |
| `#6b5325` brown | the press | numbers, names, leader dots, the empty boxes, the total |
| `--graphite` | the reader | the ticks, the doubles figures, the tally figure |

Keeping the two inks apart is what lets this page carry a changing number. **Do not
unify the palette**: a tick in the paper's own brown would read as *printed* to mean
"you have this one", which is a printing press that knows what is in your album.

- **The book prints the empty list; the reader adds the marks.** Numbers and names
  are factory ink and never change. A tick appearing when a card arrives is your
  own hand in your own book, so nothing pretends printed ink rewrote itself.
- **Pencil, not ink**, to keep the two hands distinguishable. Note that **nothing is
  ever erased**: there is no trading cards away in this design, so a tick once made
  is permanent. A player going **inactive** needs no mechanism at all — a printed
  album cannot un-print a slot, the place stays in the book, and you do still own
  the card.
- **The tally is set as a form**: `Verzameld: ____ van 24` comes off the press with
  the blank empty, and only the figure in the blank is written in. That is precisely
  what the cover could not do, where the same number was blocked in gold foil.
  - **Only the current figure is written.** A lineage of struck-through earlier
    figures is the honest way to show a tally being kept, but it is real data or it
    is nothing: inventing plausible past numbers would be fabricating a history the
    reader would read as true. The genuine one is derivable from `CardInstance`
    timestamps — the tally on each earlier day a first copy landed — and that is a
    backend errand, not a render.
  - The figure is **counted client-side** from the sections already in hand. It is
    the same number the cover used to print; no endpoint was added for it.
- **The list prints the name without the nickname**, via the same `splitName` the
  card face and the initials use — so the list cannot start disagreeing with them
  about what a name is. Stored names carry a nickname in quotes (`Petar "beetje
  gepiel" Drandarov`), and a checklist column is ~90px wide: the least room in the
  album for the longest part of a name. The nickname is not lost, it is on the back
  of the card, which is why it was put there.
- **Numbering is gathered while the slots pages are laid out**, not by walking the
  roster a second time — the same reason `albumSlotOrder` is built from
  `buildPages`. Numbers count over *slots only*, so a padding page cannot shift
  them. Note the numbers are so far printed **only in the list**: putting one in the
  mount is the follow-up that makes them fully useful, and it is the one part of
  this that touches the deliberately bare slots page.
- **The ticks are drawn, not typed.** Two strokes with round caps, the variant and a
  degree of tilt from a **hash of the player id** so a card's mark is identical
  across reloads and re-renders — `Math.random()` would have forty ticks twitching
  every time the page turned. Explicitly **no handwriting font**: the stacks that
  look right on Windows fall back through generic `cursive`, which is Comic Sans on
  most machines this runs on.
  - The tick is drawn **124% of its box and offset**, so it breaks the printed edge.
    A mark that fits neatly inside a printed box was printed with it.
- **The rows are not clickable, and that is settled.** They were: a row was a
  `<button>` that turned the book to that card's page, on the reasoning that a
  checklist is a thing you look things up in. It came out. A name that warms and
  underlines under the cursor and answers a click is the one thing in the album
  reading as a *control* rather than as print, and that is the same argument that
  keeps the slots page bare and the page turns on the book's own edge. Looking a card
  up is what turning pages is for. What went with the button: `onGoToPage` on
  `PageFace`, `page` on `ChecklistEntry`, and the hover/focus rules plus the button
  resets on `.album__entry-row`. `goToPage` itself stays — the **first opening** uses
  it, and it is still the one page turn that plays the sound, unlike the
  `focusPlayerId` effect which turns the book behind the card viewer's scrim where an
  unseen turn is unexplained noise.
- **It starts on a left-hand page**, by the same padding trick sections use, because
  a spread with cards on one side and a list on the other reads as a mistake.
- **Real content, so real semantics**: an `<ol>`, with the mark `aria-hidden` and the
  state carried in a clipped `.album__entry-state` span via the shared `ownedLabel` —
  a tick and a bare numeral say nothing to a reader who cannot see them, and with no
  button there is no `aria-label` to hang it on. Nothing on the page is focusable any
  more, so the `visible`-gated `tabIndex` the rows used to need is gone with them (the
  slots still need theirs).

The three open questions from the plan all resolved without new plumbing:
`maxFlipped` already derives from `pages.length` so appended pages are reachable;
`albumSlotOrder` flatMaps `page.slots` so checklist pages contribute nothing to the
card viewer's order; and the tally is counted client-side as above.

**Two layout decisions worth not re-deriving:**

- **Forty lines per page is a fixed number, and has to be.** Page composition cannot
  depend on the viewport: the reading position is stored as a *leaf index*, so a
  phone paginating the list differently from a desktop would land the same stored
  position on a different page on each. `CHECKLIST_ROWS_PER_PAGE` is therefore sized
  to the smaller page — a short phone gets `--page-h` down around 386px.
- **The list is a `grid` of twenty `1fr` rows, not multicol, and specifically to
  avoid a magic number.** The first attempt derived a row height as
  `(var(--page-h) - 96px) / 20`, and the constant was wrong: the head, tally and
  folio come to ~104px on a desktop leaf and ~94px on a phone, so twenty rows
  overflowed and `.album__page`'s `overflow: hidden` quietly clipped the last one.
  `1fr` rows size themselves from whatever height the list actually gets, so it is
  correct at every page size by construction. **The `20` in the CSS is
  `CHECKLIST_ROWS_PER_PAGE / 2`** — they have to agree.
  - A short last page leaves the remaining cells empty, which is what the back of a
    real album looks like, and the rows stay on a full page's pitch because `1fr`
    sizes a track whether anything is in it or not.
- On a phone the two columns stay, and the space comes out of the furniture rather
  than the name: tighter gutter, smaller number column, and **the leader dots are
  dropped** — they are the most decorative element on the row and the only one
  carrying no information.
- The **ruled grid comes off this page**. Its three bands are spaced for the card
  grid, and behind a dense two-column list they are ruling that lines up with
  nothing; the list brings its own.

**Whole-pixel type, because the first cut read as blurry.** `--page-w` is a `min()`
of viewport terms and so is almost always fractional — 442.3px on a 1440×900 window
— and every size on the page was a ratio of it, which produced font sizes like
9.29px. Fractional sizes are invisible on a card title and are exactly where 8–11px
serif body text goes soft, and the page is resampled a second time by the leaf's 3D
context. So:

- **One rounded size lives on `.album__page--list`**, snapped with
  `clamp(8px, round(down, calc(var(--page-w) * 0.023), 1px), 13px)`, and everything
  else on the page is a **whole-number `em` multiple of it** (`1em`, `2em`) rather
  than carrying its own ratio. Anything added here should follow that: **no
  `1.15em`**. The plain `font-size: 10px` before it is a fallback, not a leftover —
  `round()` is CSS Values 4, and a browser without it drops the declaration at parse
  time and would otherwise inherit Tahoma at 16px.
- **The tally figure is lifted a pixel, not rotated.** A `rotate(-1.4deg)` said the
  same thing about a hand not lining up with the printing and made the one figure
  the reader is meant to *read* the blurriest text on the page, because rotating a
  glyph resamples it. A whole-pixel `translateY(-1px)` does not resample at all.

**The thinnest part of the illusion** is the two numeric marks — the doubles figure
and the tally — which are a graphite italic rather than handwriting. That is the
honest limit of having no script face available. If it ever matters enough, the
answer is hand-drawn SVG digits, not a font.

Two notes for whoever picks this up:

- **The rows still use `align-content: start`**, so the vertical slack — which was
  always there, and is now ~40px larger — collects below the cards. Centring them
  was considered and not done: rows should fill a printed page from the top, and a
  partly filled last page would otherwise float its single row mid-leaf.
- The **faint ruled grid survives** in the page's background stack. It is a
  background layer rather than printed matter, it cannot paint over a card, and
  it is the last thing keeping the paper from being a flat tint. It is one
  `repeating-linear-gradient` to delete if it ever reads as clutter.

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
  - **…but the hit area now reaches `--turn-reach` (18px) *outward*, past the trim.**
    Bounding the box on the page margin also bounded it on the trim, which put the
    hitbox's outer wall on the exact line a hand aims at: a click on the board's
    overhang — visually part of the book — or a few px into the felt beside it hit
    nothing, and the miss is in the direction where there is nothing else to hit.
    `--board-out` of the 18px is that overhang, the rest is slack. Outward only, so
    the inward boundary is still the card column and the paragraph above still holds.
    It cannot grow much further: `--shelf-room` is built to leave `--shelf-gap + 16px`
    (≥26px) between the book and whatever lies in either margin, so ~26px would start
    eating the first packet.
  - The *lit* band is still exactly the margin. The wash is on `::before`, inset back
    by the reach, or the light would spill onto the felt and stop reading as a page
    edge being lifted — and the focus ring moved onto that pseudo element for the same
    reason, since an inset ring on a box wider than the book is still drawn outside it.

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

**Icoon is not a fifth tier, it is the icoon.** The same axis FIFA's Icons sit on:
not *better than gold* but *a different kind of card* — who someone is rather than
how good they are now. That axis already existed here as `isIcon`, so this is
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
   reads from the far side of a spread. The same ground on every icoon.
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
[icoon-uniform.html](icoon-uniform.html), which renders the whole icoon pool.

**One colourway, not one per tier.** The three differed in exactly four values —
the ground, the coloured ray, the white ray and the photo wash. The white ray was a
compensation value rather than a choice. The wash was pinned warm at the top on
every tier (a cool top cancels the sepia), so it could only differ at a bottom stop
the portrait mask was already fading out. And the ground differed between bronze and
gold by *saturation alone*, in the same hue family, over the ~30% of the card the
mask clears. Only silver read as its own thing, and only because warm-versus-cool
survives at album size. Three colourways that read as two is not a system.

The old rule — the tier must follow the icoon down, because a gold ground on a
69-rated icoon lies about him — held while the grounds were *coloured*. This ground
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
  `opener__stage--icoon` off `current.player.isIcon` on their nearest common
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

This used to have a second half — "and icons have their own pages in the album",
so you could tell from *where you were* what a blank slot was. That stopped being
true when icons were interleaved by rating (see "One sequence, not an annexe"),
and the decision is kept anyway: an unmarked silhouette now genuinely does not say
whether it is an active or an icoon. Which is arguably better — an icoon-shaped
hole would advertise a card you have never seen — but it is now a real gap in the
album rather than a redundant one, and it is the thing to revisit first if the
icons half of the book turns out to be unreadable while empty.

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
  - **The parity was aspirational for a while, and is structural now.** For as long as
    the shelf took the room the book left over, a `min()` in `.album-side .pack-shelf`
    shrank the packets to whatever two of them could fit in it — so the sentence above
    held only on windows where that was generous. Both that width and that `min()` are
    gone; `.album-side` states its width and the book is solved against it. See "The
    table is one object, and the book is solved against it".

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
  - **That cost has since been paid back the other way round.** `--shelf-room` is still
    the formula, but it is now the *guard* rather than the mechanism: the shelf states the
    width two card-width packets need and `--page-w` is solved so the margin has it. See
    "The table is one object, and the book is solved against it", which supersedes the
    bullet below.
- ~~The packets shrink to keep the pile **two columns** where they can, down to a 96px
  floor, below which the shelf becomes one centred column at whatever size fits.~~ This
  was the ladder, and it is deleted. Two columns is what makes it read as a pile — that
  part stands and is now a requirement rather than a preference — but "a few percent off
  card parity is a cheaper price than a list" turned out to be 25–39% off it on a tall
  window, which is not a few percent and is not what the sentence was agreeing to.
- Below **1450px** the shelf goes back above the book in flow. One trigger, where there
  used to be two (`max-width: 1150px`, or `max-width: 1400px and min-height: 1000px`) —
  both of those asked whether the margin could still hold a packet, and it always can now.
  What gives instead is the book, and below ~1450 it gives more than the margin is worth:
  at 1200×800 the solve comes out at a 309px page against the 393px stacking allows.
  Stacking is symmetric, so the book stays centred there too. This replaces the old
  900px breakpoint and then the 1150px one.
- The shelf is capped to the **book's own height** (it was `min(56vh, --page-h)`): out of
  flow it contributes no height, so a shelf taller than the book would run down past it.
  It is a flex child of `.album-side`, so it gives way to the seal when both are out.
- Rejected: reserving a mirrored gutter on the right (keeps the book centred, but
  spends ~700px of layout width on furniture), and animating the collapse with a
  `grid-template-columns` transition (makes the jump graceful without removing it).
- **The print is the badge and the number. Nothing else.** It carried "OPENEN" and
  the grant reason ("testpakje", "gewonnen") too, and both are gone: a wrapper does
  not caption itself with the instruction for opening it, and the reason is metadata
  about the grant, not about the product. Both crowded the badge, which is the thing
  that makes these read as rik-dev packets at all. The reason still reaches anyone who
  wants it as the tile's `title`/`aria-label`; the opener's hint says what to do.
  - A guaranteed packet prints its floor instead of a count (`80+` for
    `minimumOverall: 80`) and is the only orange one. Those are always single cards, so
    no count is lost. The floor arrives as the overall itself rather than as a level to
    look up, so the print cannot drift from the draw — there is no table between them.
    Read it through `packFloor`, never off the field: the server sends `null` on every
    earned pack, so a strict `=== undefined` prints `null+` on all of them.
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

#### The tear does not wait for the roll

`onOpen` used to be awaited before anything moved, which was harmless while it was a
mock and wrong the moment it became `POST …/packs/{packId}/claim` — a full leaderboard
replay. The packet lay in your hand doing nothing for as long as the server took, and a
click with no consequence reads as a **dropped click**, not as a wait. It is the same
note the silhouette beat produced: held time on its own is latency, and the eye reads
latency as a fault.

So the tear plays on the click and the roll runs underneath it. The two meet whichever
way round they finish:

- **Cards first** — the ordinary case, since the tear alone is 840ms real at the settled
  pacing. Nothing waits and nothing about the reveal changes at all.
- **Tear first** — the first card still rises out of the wrapper and **stands there face
  down** until there is something to turn it into. Only the *flip* is withheld, because
  the flip is the only beat that needs to know what the card is. A face-down card is a
  card you are waiting on; a torn wrapper with nothing under it is a page that has hung.

Three things fell out of it, all of them in the component:

- **`waiting` shares the whole of `revealing`'s markup** rather than getting a branch of
  its own. A separate branch is a separate element, so the riser would unmount and
  remount when the cards landed and play its 180ms entrance a second time — a card
  rising out of a wrapper it is already out of. `current` is therefore allowed to be
  undefined for that window, and the front face simply is not rendered; it is turned away
  and back-face culled, so there is nothing there to draw.
- **A card that stood waiting spends both leads.** `playCard` takes a `standing` flag
  that zeroes them. `FLIP_LEAD_MS` exists to let the entrance finish and the entrance is
  long over; `CEREMONY_LEAD_MS` — the beat where a rare card sits looking like any other
  — has just been held for longer than it asks for, by the network. The turn is what
  happens next, which is the point: the flip *is* the answer arriving.
- **`onFailed` is now a required prop.** A refusal used to leave the packet sealed and the
  page stranded behind an exit button that hides itself for the length of a reveal —
  wrong, but invisibly so. Something has visibly begun now, so it has to visibly end: the
  page puts the packet away and **refetches**, because every refusal this endpoint issues
  means the shelf is out of date (409 for a packet opened in another tab, 404 for one that
  expired at midnight or whose game has been deleted). The refetch is both the explanation
  and the fix.

Deliberately *not* added: an idle float or breathe on the waiting card back. It would have
to be removed at the turn, and any animation removed mid-cycle snaps. The wait is usually
zero and rarely more than a few hundred ms, so a still card back is the honest reading. If
the claim ever gets slow enough that this stops being true, that is the fix to revisit —
and the pack shelf is the place it would show first.

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
  - **"terug naar het album" stood down with it**, and did not at first. (The exit is
    gone entirely now — see "Putting the pack away, and the last button on the table".
    What follows is why it had to hide, which is the argument its replacement inherits.)
    The exit sat
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

### Putting the pack away, and the last button on the table

**There is no "terug naar het album" any more, and no button anywhere on this page.** The
exit was the last undisguised control left — the register in the margin had already taken
the header's type-ahead, the turn strips had taken the page arrows, the cover click had
taken "open" — and it was the only one whose replacement had to be invented rather than
found. Everything above about hiding it for the length of a reveal (`.game-button--away`,
`visibility`, the row keeping its box) is history: the rule stands and the element it was
written for is gone.

What replaces it is the cards themselves:

1. the last card flies down into the row like every other one, and **the row stays**;
2. the shelf brightens, and there are now two things on the table — another packet, or
   this row. A second packet **adds its cards to the same row**;
3. clicking the row files it: the doubles drop off the bottom and the keepers move out of
   the middle to stand beside the book, together — **on a table with no book on it yet**;
4. the book fades in, now that the middle is empty, and nothing else moves while it does;
5. they go in **one at a time, lowest rated first** — the book turning to each card's page,
   however many leaves that takes, the card crossing to its slot only once the paper has
   landed, and the slot left alone for a beat before the book moves again;
6. a beat with the finished book, and then the shelf brightens again.

**The book is not on the table until step 4**, though it is mounted from step 3 — `PutAway`
measures it to know where to stand the cards, so it has to be in the document from the first
frame. It is `opacity: 0` until the middle is empty, because a book appearing underneath
cards that are still moving is two things happening in one place. The fade is on `.album`
and is a **group** fade: that element already carries `perspective`, so the whole book
composites and then goes transparent as one image, and a dozen stacked leaves never show
through each other. A transform would have been the nicer entrance and is not available — it
would make `.album` a containing block for the fixed layers the re-binding hangs inside it.

#### Why the row waits, which took four goes to get right

**The row is the record of what you opened**, and that is the whole argument for it. It is
static and it survives you looking away — a reader who was making coffee comes back to the
packet's contents laid out in front of them. Nothing else on this page provides that: once
the cards are in the book, the album marks nothing at all.

The four versions, because every one of them is easy to re-propose:

- **A results grid you clicked**, at a third card size after the hero and the row, with the
  shelf inert beside it. The size was wrong and the inert shelf was worse: a screen that
  waits for a click is a screen where something is on offer, so the one thing on offer was
  a control with a dimmed table around it. `.opener__results`, `.opener__result`,
  `opener-settle`, the `--settled` guard and `settledByFlip` all went with it — `done` now
  renders the same row `revealing` does, so the last card's flight no longer spans a subtree
  swap and nothing about the column changes at the moment the reveal ends.
- **One landing shown properly and the rest absorbed into the book's fore-edge**, to avoid
  paying for page turns. Deleted along with its `foreEdge` helper: the turns are the
  sequence, not its overhead.
- **Fully automatic**, filing itself the moment the reveal ended, with a held row and
  "2 nieuwe kaarten voor je album" under it. No chore — and no record either. The line was a
  receipt for a transaction the reader had just watched, and once the cards were in the book
  the only trace of the packet was a few seconds of motion that may not have been seen.
- **The row waits, and the shelf stays live over it.** Which is the version above, and the
  difference from the first two is the *live shelf*: the click stops being a "continue" and
  becomes a decision, because there is a real alternative next to it. Filing is what you do
  when you have stopped opening, not a step between packets.

So the shelf's own rule is what carries this, and it is worth restating: the pile brightening
is the invitation. It brightens when the reveal ends, which is what makes "another packet"
the peer of "file these".

**`revealing` is back, and `handsFull` is derived from it.** The guard over the shelf and the
register is `revealing || placing !== null` — two spans with a real pause between them, and a
single stored flag could not describe that. `revealing` means what it always did (the tear to
the last card settling); `placing` is non-null for the filing. Every path that unmounts the
opener still has to lower `revealing`, or the shelf stays dimmed and inert for the rest of
the session.

#### The tally, written in over the cards

The row waiting is right and it is not, on its own, an *ending*. The last card lands and the
column simply holds: nothing on screen changes state, and it reads as a page that has hung
rather than one that is waiting for you. It is worst on the last packet of a pile, where
`shelfPacks` excludes the packet in your hands so there is not even a shelf brightening
beside it — the case that turns up at the end of every session.

**Two wordless endings were built for it and both were thrown away**, and they are recorded
because both look obvious from a standing start:

- **The row lifts 5px and takes a shadow and a pointer**, a beat after the last card, on
  `.album-side`'s 320/420. It was invisible. A uniform displacement of a group has no
  reference to be seen against — every card moves the same vector at the same moment relative
  to nothing. To register, a move has to change the *sequence*, the *relationship between the
  cards*, or *where the group sits in the frame*, and that changed none of them.
- **The whole row travels up into the stage's reserved space**, which is the pre-`PutAway`
  ending restored: `.opener__results` was a grid the column centred once the reveal subtree
  unmounted, and the argument for it is real — the column reserves three boxes and at `done`
  fills two, so the ending is composed as a packet-sized hole above a row of cards. Built,
  including the detail that makes it work (`risen` set inside `revealFrom`'s batch for the
  last card, so the FLIP carries that card from the hero *straight to the middle* instead of
  down into the row and up out of it again). It still did not sell the ending, and it cost a
  reversal on every subsequent packet to give the middle back. Both are in the history at
  `0266a8e`'s parent if they are ever wanted again.

**So the count is written on instead**, and the reason it earns a place where four lines under
the row did not is that **it is the one fact about a sitting the table cannot show you**. A
duplicate and a new card lie there looking identical apart from a rim, and nothing else on
this page ever adds them up. "toegevoegd aan je album" narrated something you had just
watched; "klik op de kaarten…" explained a gesture; "2 nieuwe kaarten voor je album" was the
same figure as this one but printed *under* the cards it was counting, as a receipt for the
transaction rather than as the point of it. A total over them is what the sitting came to.

- **Words, not a numeral** — `COUNTED`, spelled out to twelve. A numeral on a table is a
  readout, and it belongs to a scoreboard; written out it is a sentence somebody would say.
  Past twelve it falls back to the figure, which is a sitting where the exact number has
  stopped mattering anyway. Zero gets a word of its own — "geen nieuwe kaarten" — because
  all-duplicates happens and is the one pull a reader is most likely to be puzzled by.
- **This packet's count is the sentence; the sitting's total is a second clause, and only
  from the second packet on.** `twee nieuwe kaarten — vijf in totaal`. It said the sitting's
  total alone for one build, and that is wrong for the reason the *entrance* is right: a line
  written on left to right at the end of a reveal narrates what just happened, and a total in
  that position is not merely the wrong register but sometimes false — a second packet would
  re-write the line to announce a figure that is mostly historical, and a packet yielding
  nothing new would still write on a number inherited from the one before it. The fuller a
  collection gets, the more often that is the case.
  - The total earns its clause from the second packet because that is when the row underneath
    stops being countable at a glance, which was the whole argument for having text here. On
    the first packet the two figures are identical, so `sittingNew` is null and the clause is
    not printed.
  - "geen nieuwe kaarten" therefore becomes a frequent ending rather than a rare one, and it
    should: it is the honest report of an all-duplicates pull and exactly what a running total
    papered over.
- **`told` is false at mount, always.** It was initialised from `table.length` so a second
  packet would inherit the previous line rather than blinking it out, and that cannot survive
  the line naming *this packet's* count: a fresh opener has no idea how many of the cards on
  the table came out of the packet before it, so it would have to print a figure it cannot
  know or a differently-worded line on the same frame. Picking up a packet clears the
  narration instead, which is right — the line describes what just happened, and reaching for
  the next packet is you doing something else. `start` has nothing to clear as a result.
- **Between the stage and the row, not at the top of the column.** It was put above the stage
  first, and on a tall window the stage is most of a packet's height — so the line ended up
  against the top of the screen and read as a banner rather than as a note about the cards
  under it. It is now the last thing above the things it counts. The cards fly through its
  box on the way down, which is empty for the whole of the reveal.
- **It takes the box the hint line used to hold**, so the column still has its three boxes and
  its geometry is unchanged. That box only ever existed to stop the layout changing at the
  tear, and it had been holding an `&nbsp;` since the last caption came off. `.opener__hint`
  is gone.
- **Set in the book's face, in roman lower case**, not Georgia at 13px — that was what this
  said when it was a caption under a row, and it read as one. Palatino is what everything
  printed in this world uses. Small capitals were tried for a build and are wrong here: caps
  are the checklist's and the head band's voice, for headings and ranges, and a sentence about
  what you have wants to be a sentence. The relief comes from game.css with every other piece
  of type on the timber, and the colour is a shade up from `--ink-dim` — the hint receded on
  purpose, and this does not.
- **It is written on, left to right, with the light of a nib at the leading edge.** Not a
  fade, and not the tracking-settle that was here for a build: a `mask-image` slid from one
  end of the line to the other, and a separate element carrying the light. **Two elements
  because a mask clips its own children** — a nib inside the masked box would be bisected by
  the very edge it is riding.
  - **What the nib tracks is the middle of the fade, not the opaque stop**, and getting that
    wrong is what kept it looking slow through two goes. The eye reads the ink's edge at about
    half alpha, and the fully-opaque boundary is a whole tail-width behind that. The stop was
    55% first — the boundary a tenth of a width ahead of the nib *and* a quarter-width tail on
    top of it — then 50%, which fixed the boundary and still left the nib half a tail behind.
  - So the fade is **centred** on 50% of the mask, and the stroke **over-travels at both
    ends**: the point starts left of the first letter with nothing showing, and finishes right
    of the last one with that letter solid rather than sitting mid-fade at half alpha.
  - **`mask-size: 250%`, position `90% → 10%`, and both halves of that are forced.** It was
    first written as `200%` with the position running `105% → −10%` — the same sweep, and
    broken. `mask-repeat: no-repeat` makes everything outside the mask image *transparent*,
    and with `offset = p × (W − 2W) = −pW` a negative `p` slides the image right and drops the
    leftmost `pW` of the element off it: at −10% the line rendered with its first tenth cut
    away, so "vijf nieuwe" wrote itself on as "jf nieuwe" and stayed that way. **`p` must stay
    inside `[0, 1]`.**
  - At `mask-size: k` the edge travels `(k − 1)W` over the full range of `p`, so `k = 2` can
    only ever move it exactly one width with nothing either side. `k = 2.5` buys 1.5 widths,
    of which the stroke spends 1.2 and keeps 0.3 as margin: at `p = 90%` the transparent end
    of the fade is at `x = −0.025W` so nothing shows, at `p = 10%` the opaque stop has reached
    `x = 1.025W` so the last letter is solid, and the element samples `[1.35W, 2.35W]` and
    `[0.15W, 1.15W]` at those ends — inside the image both times.
  - The nib's range is that same line evaluated at the two ends: `−10%` to `110%`. It starts a
    hair off the first letter and lifts off past the last, which is where a pen's point
    actually is. **Change any one of the size, the stops or the two positions and all of it
    has to be re-solved**, the nib included.
  - **Linear, deliberately.** A pen holds one speed, which is the principle the cover's name
    is written on and why its timing comes from path length. An ease-out here is a wipe
    pretending to be a hand.
  - **The nib is light, not a caret.** A hard block is a terminal's cursor, which is the one
    thing this page has spent four rounds refusing to look like. It is struck up at the start
    and spent by the end, so it reads as the stroke finishing rather than as a control
    blinking off — which is also why it is a keyframe: fading *out* at the end of its own
    travel is not something two ends of a transition can describe.
  - **`writing` mounts it and takes it away**, like the reveal's flash. A keyframe on an
    element nobody removes replays the next time anything re-renders it.
  - The opacity fade on the line is 130ms against the stroke's 400 — quick enough that the
    line is *there* to be written on. Much past a third and the two read as one dissolve, and
    the left-to-right stops registering at all.
- **`NIB_MS` is in three places** — the constant, the ink's transition and the keyframe's
  duration — because CSS cannot read the constant. All three scale by `--anim`, so the pacing
  slider cannot pull them apart.
- **`TALLY_MS` is 320**, the shelf's own beat, so where a packet is left on the pile the words
  and the pile arrive together. It has to be a beat rather than the last card's own frame: the
  card arriving and the count of them are two facts, and stacking them puts the second under a
  card that is still moving.
- **`told` starts true when there are already cards on the table** — the second packet of a
  sitting, where the previous opener left a count standing and this one replaces it in the
  same commit; starting false would blink it out and write it again. `start` clears it at the
  tear, or a total from before this packet would stand over a reveal of it.
- **Under reduced motion it is simply there**, with the mask taken off entirely and no nib.
  The mask has to be *removed* rather than left unanimated: with no transition it would sit
  at `100%` for ever and the line would never appear at all. The ending has to land, not be
  taken away.

#### The table, and who owns it

The row belongs to the **sitting**, not to the packet, which is the one structural
consequence of all this:

- **`table` on the page holds the cards from *earlier* packets only**, and the opener draws
  them ahead of its own. So nothing is ever counted twice, and the reveal's FLIP lands into a
  row that already has cards in it — the ones already there slide as it grows, exactly as
  they do within a single pack, because they are in `prevRects` like everything else.
- **`openerCards` is a ref**, holding what the packet on the stage turned over. It joins
  `table` at exactly one moment: when the reader reaches for the next packet. Moving it
  earlier would draw every card twice, because that opener is still mounted and still drawing
  them. Moving it later would lose them.
- **Slot refs are keyed by position in the row**, not by position in the pack (`rowIndex`),
  and so is `pendingFlip`.
- **The row is rendered once, outside the phase branches.** It used to be three separate
  elements that happened to look alike, one per phase; a row that survives a packet cannot be
  one of those.
- **`PutAway`'s `flying` is a row position, not a player id.** A row spanning two packets can
  hold the same player twice — new in the first, a double in the second — so an id does not
  identify a card on the table. It still identifies a *slot*, which is all the flight and
  `held` need.
- Every path that ends a row without filing it empties `table` (`stopPlacing`), or filed
  cards reappear on the table the next time a packet is opened. `openPack` is the single
  exception and says so.

**The row scrolls, but only once it has to.** Two or three packets outgrow the width of the
book, and the alternatives were wrapping — impossible inside a column whose height is reserved
to the pixel — and shrinking the cards, which is exactly what the size parity below exists to
prevent. So `.opener__revealed` is `var(--book-w)` wide (the shelf and the register are
absolutely positioned in the margins beside it, and a wider row would take their clicks), and
`.opener__hand` inside it carries `margin: auto`: that centres a row that fits and computes to
zero on one that does not. `justify-content: center` cannot do that job — a centred overflow
puts its own start before the scroll origin, where no browser will let you reach it. The reveal
scrolls the row to its end as each card lands, or a card would be flown at a position nobody
can see.

**`overflow-x: auto` is on a class, and it has to be.** A scroll container clips *both* axes —
`overflow-x: auto` computes `overflow-y` to `auto` as well, and CSS has no way to ask for a
horizontal clip alone — so a row that is permanently a scroller cuts the top off the card
descending into it from the stage. The reveal's FLIP starts that card at the hero's position,
well above the row, and it appeared from behind an invisible edge instead of travelling. One
packet never overflows (five cards at a slot's width fit inside the book), so the ordinary
reveal is clipped by nothing at all, and where the row *does* scroll the clip box is lifted
over the stage — see the bullets below. `PackOpener` measures the hand against the row in a
layout effect declared **above** the FLIP effect, so the class is settled before the flight is
measured, and toggles it imperatively — a state update would apply a commit too late.

- **And where it does scroll, the clip box is lifted over the stage.** `padding-top` grows it
  upward by the whole height of the packet stage and a negative `margin-top` hands that space
  straight back to the layout, so the row occupies exactly what it always did while clipping
  from far enough up that no descent is ever cut — including the case that made this necessary,
  a second packet opened onto a row that is already long. The cards and the scrollbar do not
  move a pixel when the class goes on: `content-box` sizing (there is no global `box-sizing`
  reset in this project) means `min-height` still describes one card, and in the flex column
  the item's outer size comes to exactly that.
  - **`.opener__stage` needs its `z-index` for this**, because the padding band lies over it
    and hit-testing follows paint order — without it the invisible band takes every click
    aimed at the packet or the wood beside it. Safe for the ceremony's fixed light layers:
    `.opener` is already a stacking context, so they were never resolved against the shelf.
  - **`.opener__hand` uses `margin-inline: auto`, not `margin: auto`.** Vertical autos would
    centre the cards in a box that is now a stage taller than they are, and they would drift
    up into the padding.
  - **`overflow-y: hidden` rather than left to compute**, so a card inverted up into the
    padding cannot be mistaken for scrollable content and earn the row a vertical bar.
  - The alternative was the descent escaping the scroller altogether — a fixed-position
    flight like `PutAway`'s — which is a rewrite of the reveal's FLIP for a clip that can be
    moved out of the way in five declarations.
- The scrollbar gets 16px of bottom padding and the same negative margin, so it cannot draw
  over the cards and cannot change the column's height when it appears.
- **It measures only when the row's contents change, and that is not an optimisation.** It
  ran on every render for one round, and reading `offsetWidth` forces a style and layout
  flush — see the trap below, which it walked straight into.

**A forced layout mid-reveal makes every unbatched commit real, and that is a bug waiting to
happen.** `playCard` resets ten pieces of state, one of which is the cursor the riser is keyed
on, and it runs from a timeout — which legacy `ReactDOM.render` does not batch. Normally that
costs nothing: the commits are all in one task, so the browser computes style once and sees
only the last of them, and the riser mounts already face-down. Put anything that flushes
layout between them and each intermediate state becomes observable — the new riser mounts
while `faceUp` and `portraitIn` still describe the card that has just gone, so the card being
brought on **visibly rotated from face-up back to face-down and landed on its silhouette**,
spoiling the pull it was about to make. It is the artefact `HANDOFF_MS` describes, one beat
earlier, and a layout effect added for the scroller was enough to bring it back.

`playCard` batches now, so it cannot recur whatever anybody measures later. The rule to carry
forward: **anything reading layout while the opener is running has to earn it**, and the
sequencing must not depend on the browser choosing to coalesce commits.

#### Nothing resizes

A card in the row is exactly `--album-card-w`, the width of a slot in the book, so the whole
sequence is translation — the flight applies no scale at all. The row was briefly a flat 100px,
smaller than a slot at every window size, so the cards ended the reveal too small to read and
then had to *inflate* into the album, which reads as a transition between two screens rather
than as a card being put where it goes. The row's `min-height` tracks the same variable, or it
silently clips.

**And the clone that flies has to size the card, not its wrapper.** `putaway.css` set
`--card-width: 100%` on `.putaway__flight`, and it did nothing: `.card` declares
`--card-width: 150px` on *itself*, and a custom property declared on an element beats one
inherited from its parent. So every clone rendered at a flat 150px — wider than a slot at most
window sizes — and the cards visibly grew as they left the table and shrank into their slots,
which is the one thing this section exists to prevent. The rule is `.putaway__flight .card`,
exactly as `.album__slots .card` is. **Anything that wants to size a card has to target the
card.**

#### One card at a time, and the book turns to each

**Lowest rated first, working up.** The sequence climbs to the best card on the table and
leaves the book open on it, which is the only ordering that ends on the thing worth ending
on. The sort is stable, so equal ratings keep the order they came out of the packet.

This is the expensive decision and it was taken deliberately. A page holds six slots, so
several new cards are usually spread over several pages, and every one of those pages is
turned to. The beats:

| beat | base | real | when |
| --- | --- | --- | --- |
| `CLEAR_MS` | 420 | 840ms | a keeper moving aside, staggered by 70 |
| `TOSS_MS` | 520 | 1040ms | a double dropping off the table, same stagger |
| `PLACE_ARRIVE_MS` | 420 | 840ms | the book fading in on the cleared table |
| the turn | — | 1240ms, or 560ms a leaf | reported by the album, not timed here |
| `FLIGHT_MS` | 460 | 920ms | the card crossing to its slot |
| `PLACE_SETTLE_MS` | 420 | 840ms | the card that just landed, left in its slot |
| `PLACE_REST_MS` | 520 | 1040ms | the finished book, before the shelf comes back |

So three new cards on three different pages run about nine seconds. **That is the intended
pace**, not a cost being tolerated: the placing is the part where the album gains something,
and the same argument that lets the reveal spend 3.2s on one card applies here. Nothing is
rushed and nothing overlaps that should not — in particular a card sets off **only after the
paper has landed**, and a card that has just landed is left in its slot before the book moves
again.

- **The turn is not timed by the page.** The album reports arrival through `onTurned`, and the
  sequence waits for it. It used to compare *pages* and then wait a fixed `SHUT_MS`, which was
  both conservative (two pages of one spread are already both on screen, so it paid for turns
  that never happened) and simply wrong once a move could take several leaves — see "Riffling"
  under the album. `PLACE_TURN_CAP_MS` is the net under it: a report that never came would
  strand the page with its table dimmed, which is the same class of bug as an opener that
  never reaches `onFinished`.
- **`openAtPlayerId` for the first card, `turnToPlayerId` for the rest.** The album is
  unmounted for the whole of the opener, so arriving already open on the first card's page is
  free — `openAtPlayerId` is read in the `flipped` initialiser and outranks both the saved
  reading position and `justBound`. `turnToPlayerId` is the audible sibling of
  `focusPlayerId`: the viewer's turns happen behind a scrim where a page-turn sound is
  unexplained noise, and these happen with the reader looking straight at the book. It is
  **null through `settling`**, which is what makes the next card's id a change the album acts
  on rather than a prop it has already seen.
- **`bookArrived` checks the id as well as the phase.** The album reports the page it was
  asked for, and a stale report — a turn finishing after the sequence has moved on — must not
  launch the next card early.
- **The page times only `settling` and `resting`**, one effect per beat, so its cleanup
  cancels whatever is pending when the sequence is interrupted. `clearing` and `flying` are
  `PutAway`'s and `turning` is the album's; all three report.
- **The index advances in the `settling` beat, not on landing**, so the card that has just
  arrived is still the current one for as long as it is being looked at.
- **A row of nothing but doubles still runs the sequence** — there is a table to clear even
  when there is nothing to place — and goes straight from `clearing` to `resting`. The only
  hand-over that skips out entirely is an empty one, which is what reduced motion and
  `snel openen` send.

#### The doubles, and what the book keeps of them

A double is not waste and nothing here calls it that: what the book keeps of one is a numeral
beside its tick on the checklist, and **a checklist is also a swap list**. There is no second
slot for it to go in, so off the table is where it goes — dropping, turning slightly and
fading, which is the whole of the tell that it is being *dropped* rather than filed, with one
`playPageTurn()` for the handful rather than one per card.

**They stay in the row until it is filed**, which is why they are still there to be seen: the
table is the record of what came out of the packets, doubles included. Tucking one behind the
card already in its slot was the alternative, and it has nothing to show — the slot draws no
count, so the card would fly into the book and simply cease to exist.

The drop is a clone in the overlay like everything else, on an accelerating curve rather than
the placing ease. It was an `opener-toss` keyframe inside the opener, which could not survive
the hand-over that unmounts it — and being out here is what lets the doubles leave at the same
moment the keepers move aside.

#### The hand beside the book

**Fixed-position clones, not the slots themselves.** This is the one real departure from the
FLIP inside the opener, and it is not a preference: `.album` carries `perspective` and
`.album__book` is `preserve-3d`, so a card animated inside the book joins the leaves' depth
sort and a translate across the table is projected through the perspective on the way. A fixed
overlay outside the book is flat viewport space, which is the space every rect in the sequence
was measured in. `PutAway` mounts as the last child of the shell next to the card viewer — the
same reasoning — and z-index 42 puts it over the turn strips (35) and under the viewer's scrim
(45).

- **Every transform is written against the clone's own layout box**, which is the rect the card
  was lying in on the table: "where it should be now, less where it started". The clearing and
  the flight are both written that way, so neither needs to know where the other left the card
  — the transition runs from whatever transform is on the element.
- **The starting rects are clamped into the row's box.** Once the row scrolls, a card can be
  sitting outside it — the row clips, so the reader cannot see it — and a fixed clone started
  from that rect would appear out over the margin where nothing was. Clamping starts it at the
  edge, which reads as a card coming off the end of the pile.
- **The hand is measured off the book, not the window.** The cards stand in the margin the
  shelf and the register live in, both of which are set aside for the whole sequence, and the
  fan is centred on the book's own middle so it sits at the height of the pages. Clamped to the
  window edge for the stacked layout, where the book is nearly as wide as the screen.
- **`FLIGHT_MS` is the opener's `SETTLE_MS`.** This *is* that motion one step further on: the
  same card, the same hand, the same curve. They must not be tuned apart.
- **The slots go on drawing as empty until their card arrives** (`Album`'s `holdSlots`,
  `PageFace`'s `held`) — the one place the book is knowingly drawn behind the truth. The cards
  are in the collection before the sequence starts and have to be, because a flight needs
  something to land *into*; without this the hole is already filled by the time the card gets
  there, and the beat is a card flying onto a copy of itself. **All of them are held from the
  start** and released one at a time, so a page turned *through* on the way to a later card
  does not show a card that is still in the hand.
- **`data-slot-shown` is how a card finds out whether its own slot is on screen.** Every leaf
  of the book is in the document at all times, so the element existing proves nothing. Stamped
  from `PageFace`'s `visible`, which is the only thing that knows, and so covers the mobile
  book (one page) and the desktop spread (two) without either being re-derived outside the
  album. A zero-width rect is refused for the same reason the opener's FLIP refuses one.
- **The clearing runs inside a `requestAnimationFrame`**: the clones have to be painted at
  their start boxes before a transition can run from them, or the browser coalesces the two and
  the cards simply appear where they were going.
- **Each hand-off is one commit.** The hand-over and every landing arrive from timeouts or
  callbacks, and `index.tsx` mounts with legacy `ReactDOM.render`, which does not batch those.
  Unbatched, the opener unmounts a frame before the book is open, or a clone leaves a frame
  before its slot fills and the hole blinks.
- **No new sound.** `playPageTurn` once as the table is cleared — paper moving, the same weight
  of event as a leaf turning, which is the argument the register already runs on — the book's
  own turn sounds per leaf, and `playSlot` for each landing, which is the sound of a card being
  put in its place.
- **The book is inert for the sequence** (`.album-layout--placing`), not dimmed: it is the
  thing being watched, it simply cannot be used while cards are going into it. What that stops
  is a page turned out from under a card already aimed at a slot on it.
- **Under reduced motion nothing is drawn here**, and `fastMode` takes the same door. The
  opener reports nothing to file and the page puts the book back with the cards already in it —
  landing on the finished state rather than playing it stilled, the rule every sequence here
  follows. `snel openen` skipping it too is the same argument in reverse: the putting-away is
  the last third of the ceremony, so a bypass has to bypass it.

#### The sealed packet: click the wood beside it

A packet you have picked up and changed your mind about still needs somewhere to go, and it is
not the row — the row is for cards. **Clicking the wood beside a sealed packet puts it back on
the shelf.**

- With cards already on the table, putting the packet down means "I have stopped opening", so
  it files them — the same decision as clicking the row, on the object you happen to be
  holding. See `putDown`.
- `.opener__stage--table` widens the row so the target is the table rather than the two inches
  either side of the packet — and it is **`var(--book-w)` wide, not the column**. `.album-main`
  is as wide as the whole layout, the shelf and the register are absolutely positioned asides
  inside it, and `.opener` is in game.css's `z-index: 1` list: a stretched opener therefore
  covers both margins and swallows every click aimed at a packet. That shipped for one
  iteration, and the pile looked live while being unclickable. `--book-w` is by construction
  the width that stops short of both.
- The packet's own click stops propagating, or the wood underneath would put down the packet it
  had just opened.
- **Only ever the sealed phase.** Past the tear there is nothing to put back, and a live click
  target across the middle of a reveal is the hole the old exit button left open.
- No cursor and no hover on the wood, deliberately: it is not a control disguised as wood, it
  is the table. The line under it is what says so, exactly as it is what says the packet can be
  opened at all. The row gets a pointer, because that one is a hand reaching for cards —
  scoped to `[role="button"]`, which the row carries only while there is something to file, so
  the cursor cannot drift from the handler.
- **Escape does both**, and the row takes Enter and Space. The exit was a real button and so
  was in the tab order for free; a stretch of table and a row of cards are not, and a keyboard
  reader must not lose the way out.

**There is no line under the row any more.** It went "toegevoegd aan je album" → "klik om ze
in je album te leggen" → "2 nieuwe kaarten voor je album" → "klik op de kaarten om ze in je
album te leggen" → nothing, and each step removed the same mistake: the page saying in words
something the reader either already knows or is about to be shown. The last of those was
briefly put back on the grounds that with an empty shelf nothing said the row was live, and
came straight out again — see "The tally, written in over the cards", which is where the words went
instead, and why the one thing worth saying is not down there at all.

One number moved with all this: `.opener`'s `min-height` was `min(62vh, --album-room − 30px)`,
the 30 being the exit row. It takes the whole of `--album-room` now.


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
columns of 111px packets. (The table is 1740 now — the formula is what moved it, see
below.)

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

#### The footer's space went into the spread

Deleting the footer left a strip of bare table at the bottom of the stage doing nothing,
and the book is what the page is for, so the book got it. **The page went 59vh → 63vh
and its cap 520 → 560, and the table went 1660 → 1740.**

The vertical arithmetic is the same accounting the 56 → 59 bump used, and it is the
whole reason `--page-w`'s height term is written as `Xvh × 0.78` against a `/ 0.78`
page height: the two cancel, so X *is* the page height in vh and can be compared
directly against anything else competing for the column. The footer was a 22px row plus
a 24px margin, ~46px, and 4vh is under 46px on every window up to 1080 tall — so the
spread is no taller than the spread-and-footer were, at any size, and the page controls
stay where they were relative to the fold. Above 1080 the 560px cap binds before 63vh
does (they cross at 1139px tall), so the page never exceeds 718px however tall the
window.

The width follows from the height, which is the part worth noticing: at 1920×1080 the
*height* term binds, so raising it widened the book too — 994 → 1062 — without touching
a width term. Raising the cap to 560 carries the same growth onto tall windows, where
the cap is what binds instead.

**The table's 1740 is derived, not measured: it is 1660 plus the 80px the book's cap
grew** (520 → 560 a page is 1040 → 1120 a book). Adding the book's growth to both sides
of the formula leaves the binding case untouched — the shelf's tall-window margin is
234px before and after — so the pile is provably the same pile rather than one that
happens to still fit. `min(1740px, 97vw)` is also never narrower than `min(1660px,
97vw)` at any width, so nothing below 1920 got tighter; the 1660-to-1740 band just
follows 97vw as it already did.

What it costs: card parity for the packets recedes, from 79% of a card to 75%, because
the cards grew with the page while the margin did not. Parity would now want ~1894 —
99vw at 1920, i.e. the wooden wall this design has refused twice. It stays refused.
(**It is refused no longer** — see the next section, which is what happens when the
recession above is followed to its end.)

The phone book took the same dividend, 58vh → 61vh, with its width terms untouched:
`80vw` is what binds on a phone, so that one only shows up on a portrait tablet — which
is the case that has the height to give.

#### The table is one object, and the book is solved against it

Three sizes on this page were arrived at by picking one number and letting whatever
depended on it absorb the consequences. Each time, the thing that absorbed them was the
thing the design cared most about, and each time nothing surfaced it — a percentage that
drifts with the window has no error state.

- The packets absorbed the shelf's width. A packet was "as wide as a card" only where the
  margin allowed two of them at that size: **114px against a 153px card at 1920×1080, and
  100px against 163px on a 1440-tall window.** Two sentences in this document and three
  comments in the CSS said the coloured panel is exactly one card tall, and on the common
  desktop it was 1.3 cards short of it.
- The book absorbed the vertical column. The test panel's plate under the table was ~83px
  of the one axis the book is sized on first.
- The slab absorbed its contents. `min-height: 78vh` plus content meant seven states and
  seven table sizes, on a stage whose whole premise is that it is an object rather than a
  page.

All three now run the other way. **What matters is stated; what can move is solved for.**

**The shelf states its width and the book is solved against it.** The chain is
`--album-card-w = (--page-w − 72px) / 3` from the album's grid, and

```
shelf column = 2 × --album-card-w + --pack-gap + 2 × --shelf-pad + --shelf-bar
(stage inner − 2 × --page-w) / 2   ≥   --shelf-gap + shelf column + 16px
```

Substituting and solving for `--page-w` gives a third term in its `min()` — the widest
page whose own margin still holds the pile — which lands a few px *inside* the margin
rather than on its edge, because at equality `flex-wrap` deciding whether 242.827px fits
in 242.827px is a coin toss, and at 1600×780 it came down tails. Everything in the solve
is on `:root` in game.css and is viewport-relative or a literal, so it resolves with
nothing measured. Nothing in it may ever be made to depend on `--page-w` or
`--album-card-w`: that closes the loop and CSS drops the property as invalid.

Two new tokens came out of it, `--shelf-pad` and `--shelf-bar`, both of them figures that
used to be literals inside `.pack-shelf`. The gutter is the more interesting one: `.pack`
is a fixed width, so a scrollbar appearing inside a scrolling shelf cannot narrow the
packets — it pushes the second column onto a row of its own, and it does that exactly
when the pile is deepest. So the gutter has to be *wider* than a scrollbar rather than
equal to one. 18px, against Windows' 15–17.

**`--stage-w` went 1740 → 1860, and the wooden wall is accepted.** At 1740 the solve
gives a 474px page, which is the book we already had: two card-width columns and no
growth at all. At 1860 it gives 502 and the album is ~7% wider. The surround goes from
90px of black a side at 1920 to 30px, which is the line "it stays refused" above was
drawing. It is crossed because the two things it was protecting — a pile of two, and
packets that match the cards — are worth more than the black, and because `98vw` still
keeps a surround on anything narrower.

**The height term went 63vh → 70vh, and the panel moved into the right margin.** 70 is a
ceiling rather than a round number: everything above and below the spread is fixed px
(navbar 80, stage padding 76, nav-label 25, `.album`'s 8) — about 227px — so fitting means
`k ≤ 1 − 227/H`, which is 0.70 at a 760px-tall viewport. That is a 1536×864 laptop at
Windows' 125% scaling, and it is the shortest window worth designing for; 72 would fit
1080 and overflow it.

**The slab is one size in every state.** `--album-room` is the book's footprint —
`--page-h` plus 40px for the nav-label row and `.album`'s padding — and `--stage-h` is
that plus the stage's own. `.album-layout` reserves it, which is also what stops the
panel in the margin riding up and down as the middle of the layout changes. The five shut
albums already came to the same figure within a pixel, deliberately; that was two
components agreeing and is now one box they sit in.

The opener is the occupant that had to give something up: its `min-height: 62vh` is now
`min(62vh, --album-room − 30px)`, the 30 being the "terug naar het album" row. (That row
is gone and the term with it — see "Putting the pack away". The solve below is why the
opener reads `--album-room` at all, which has not changed.) On a
960-tall window that still resolves to 62vh exactly, so the common case is untouched; the
`min()` only bites where 62vh overshot the book, which on a 2000-tall window was by 590px
of empty wood. **That was only safe because the ceremony's vignette and bloom centre on
`--card-cx` / `--card-cy`, the card's measured position** — the `50% 45%` in those
gradients is a fallback, and had it still been the alignment, moving the opener's box
would have slid the card out of its own spotlight.

**Below 1450px the whole thing stacks and every ceiling lifts** — `.game-stage` back to a
`min-height`, `.album-layout` back to no reserved footprint — because stacked there is no
fixed footprint to reserve and a fixed height would clip the register and the panel off
the bottom of an `overflow: hidden` slab.

One trap worth recording, found in the built CSS rather than the source: cssnano resolves
what it can inside a `calc()` and emits a literal declaration **in front of** the
var-based one. `--album-card-w` is itself a calc over a `min()`, which it cannot parse, so
with a `var(--album-card-w, 96px)` fallback in `.album-side`'s width it emitted
`width: min(244px, …)` above the real rule — a shelf built for 96px packets, one cascade
slip from applying. The fallback is dropped there; album.css and game.css are always in
the same bundle, so it was never protecting anything.

The lean figure from the section above survives with a different meaning. It is still ~6%
of the width per side and ~9.5px under the hover `scale(1.04)`, and `--shelf-pad`'s 13px
still absorbs it. What changed is what raising it costs: it used to be subtracted *twice*
out of a two-column packet width, so widening it silently dropped the pile to one column.
It is now a term in the book's own width, so widening it costs a couple of px of spread —
a thing that can be read off the formula rather than found by noticing the pile has
collapsed.

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
- **Reduced motion lands on the finished card.** It never enters the reveal:
  reduced motion and fast mode jump straight from the click to the finished row.
  Cards there carry no `reveal` prop at all, so they render exactly as they
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
original "under two seconds" target, and a deliberate trade. Nothing covers the
impatient case any more (see "The reveal is watched, not skipped"); the long
version simply gets rarer as the album fills.

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

`minimumOverall` on `Pack` exists so a level can be summoned on demand while tuning
rather than waited for on a ~3% roll. It is server truth now — a `PackGift` sets it — and
it replaced the mock-only `guaranteeTier` / `guaranteePlayerId` / `guaranteeLevel` trio,
which is deleted.

### Pacing: two knobs, and everything derives from them

At three games a day this plays ~1,000 times a year, so it must be brisk.

#### The reveal is watched, not skipped

**There is no click-to-skip, and no "n / 5" counter under the stage.** Both were
there and both came out: a click anywhere used to land on the finished row, and the
hint line counted the pack down while advertising the escape.

The counter went because it turns a reveal into a queue — you read "2 / 5" and start
waiting for 5 rather than looking at the card in front of you. The skip went with it
because the two were the same offer, and because an opening you are being invited to
cut short is one the pacing above cannot justify: every number in this section is
tuned for a beat that gets watched.

What this costs is real and was accepted: **a 90+ holds for over five seconds before
it turns and nothing shortens it.** If that ever stops being tolerable the answer is
to lower `DEFAULT_CEREMONY_MS`, not to put the click back.

`fastMode` — the test panel's `snel openen` — is the only remaining bypass, and it is
not reader-facing. Reduced motion still lands straight on the finished row. **Both skip
the putting-away as well**: the book comes back with the cards already in it and nothing
crosses the table. `snel openen` means "skip the ceremony", and the putting-away is the
last third of the ceremony — a bypass that skipped a 16-second reveal and then sat
through eleven seconds of page turns would not be one.

The hint element is kept for the revealing phase, rendering `&nbsp;`. It is a spacer
as much as a caption; removing it shortens the column at the tear and again at the
ending.

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
  something that plays ~1,000 times a year, and since the skip was removed there
  is nothing to shorten it — so **this is the first number to reconsider** if the
  wait ever stops being worth it.

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
- **The pen has its own sound** (`playPenStroke`), one call per stroke while the owner's
  name is written into the cover. It **takes its length from the caller**, the same
  contract as `playRebind` and `playRareRise`: a musical hit must not stretch, but a
  gesture must, or the pen is still moving after the sound has stopped. What is held
  constant is *density* rather than count — a fixed number of grains spread over a longer
  name thins out into separable ticks, which is the one artefact it exists to avoid.
  High, dry, no low end and no pitch, and among the quietest things in the module: it runs
  for the better part of a second under a sequence whose climax is the board landing.
  It replaced `playFoilStamp`, which is retired.
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
>
> **It was wanted again, and it paid for itself.** `playPenStroke` — the album cover being
> written — was built straight off the constraints below, and `playFoilStamp`, the sound
> this section produced the first time it was read as a spec, has now been retired by it.
> One constraint did *not* carry over and the difference is worth stating, because it is
> the thing that makes a pen not a press: these ticks are **per character**, and the pen is
> **per stroke**. A press indexes along a line and strikes once per letter; a hand lays ink
> while it is down and none while it is lifted, so the sound has to follow the strokes.
> The "granular, non-pitched, quietest in the module" constraints carried over intact.

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
`ledger.css` (the signing-in book), `albumchoice.css` (the five shut albums),
`locked.css` (the padlocked album behind the games gate).
Deliberately **not** `@mui/styles` — JSS is deprecated and unpleasant for
multi-step keyframe sequences, and plain CSS is already an established pattern via
`App.css`.

New components: `components/GameShell.tsx`, `Album.tsx`, `PlayerCard.tsx`,
`PackOpener.tsx`, `PackTile.tsx`, `PackFace.tsx`, `CardViewer.tsx`,
`SigningLedger.tsx`, `LedgerCorner.tsx`, `AlbumChoice.tsx`, `LockedAlbum.tsx`.

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
- Unrevealed packs, the pack opener, the album, icons progress — see the
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
  silhouettes, duplicates and icons progress all have something to render.

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
   die with it**, against what step 5 originally assumed: its pack buttons became the
   first caller for the gift endpoint, so they were kept rather than deleted and rewritten.
6. ~~`PackGift` and `POST api/collections/gifts` — present a pack to a named player or
   to everybody, and wire the test panel's buttons to it.~~ **Done**, and with it the panel's
   buttons, which now hand the signed-in player a real present. The guarantee found its home
   in `PackService.Roll` as a **minimum overall** rather than the three `guarantee*` options
   that were sketched for it — see "Where this stands" for why one number replaced all
   three. This is the only grant-shaped table in the design, because a present cannot be
   derived from anything that happened.

**That is all of phase 2.** What is left in this document is presentation: the silhouette
beat, and the two smaller open questions at the top.

Note what the collection slice cost that was not foreseen: `CardPoolService` needed a
second `GetPool` overload taking an already-replayed roster. `GetLeaderBoard()` is not
cached, and the collection endpoint needs the pool *and* the picked player's game
count — which cannot come from the pool, because the pool filters out exactly the
under-gate player the games gate has to describe. Without the overload every
collection read paid for two full replays.

Splitting 2 out ahead of the migration was worth it beyond the icoon pages: it put
the scale in front of real data early, which is what turned up the midpoint
rounding trap, the wrong "highest rating ever recorded" claim, and the fact that
the 5–9 games band in the icon pool is populated after all.

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
5. Force each ceremony level with the test panel's `75+`/`80+`/`85+`/`90+` buttons — a
   gift with a `minimumOverall` — and **screen-record two levels,
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
      all** and no footer. Every name on it is clickable and none of them carries a game
      count.
    - Sign in as a player with fewer than 5 games → the padlocked
      album, the games still to play, the pips, and a register that gets you back out.
      Reload on it → the same screen, not the ledger and not a cover choice.
    - The register lies in the right margin once signed in, opposite the packet shelf, and
      is present during the cover choice too — signing in as the wrong person and getting
      out again before binding a book has to work. Click it: the name is crossed through,
      then the ledger. It dims and goes inert during a reveal and during the stamping.
    - Below 1150px wide the margins collapse and the register stacks **below** the book
      while the shelf stacks above it.
    - Pick a leather → four books leave, one centres, the name foils in, the book lands
      **shut** on page one. Watch the handover frame: nothing under the table moves, and
      the book must not shift, resize or gain an edge as the album takes over — the
      ceremony's book is the shut album's box, squares and all.
    - Then `leegmaken` and bind a second one under the same name. It must land shut again:
      the reading position is keyed per owner and outlives the album, so this is the path
      that used to hand over to a book already lying open somewhere in the middle.
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
2b. **The gift slice.** Another `dotnet ef database update` per database — it applies every
    pending migration in order and is safe to re-run, so there is nothing to do beyond that
    one command. Mind which database it is: the tools default to **Development**, so
    production needs `ASPNETCORE_ENVIRONMENT=Production` or an explicit `--connection`. Then:
    - Every test-panel pack button puts a packet on **your own** shelf, above the game
      packs and the daily. The three sized ones are coloured by size; the four `n+` ones
      are orange and print `75+`…`90+` rather than a count. **No game packet prints
      `null+` or is orange** — that is the regression to watch, and it is what `packFloor`
      exists for.
    - Open a `90+` on today's roster, where nobody clears 90: one ordinary card comes out
      rather than an empty packet or an error. With the icons latch on, it can reach an
      icoon.
    - `POST api/collections/gifts` with `{"size":3}` and no `playerIds` → `everybody: true`
      and one gift id. Every player with an album now has that packet, and each of them can
      open it once.
    - `{"size":3,"minimumOverall":85}` → 400. `{}` → 400. `{"size":99}` → 400.
      `{"minimumOverall":120}` → 400. `{"playerIds":["nonsense"],"size":1}` → 404, and no
      row written by any of them.
    - Open a gift, then come back **tomorrow**: it must not be on the shelf again. This is
      the one thing the gift claim's missing date would break, and it cannot be seen on the
      day it is made.
    - Delete the `PackGifts` row for a present you have already opened → its cards and its
      claim go with it.
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
    `isNew: false` and `copies: 2`; deleting the game takes its cards; emptying a
    collection takes the cards and the claims; and packs are only offered once there is
    a book.
    - The one-player-pool helper is what makes any of the draw-dependent assertions
      possible: one player over the gate and nine under it means the roll has exactly
      one card it can produce.
    - **The icons claim**, in the same file, and the first assertion is a reversal:
      completing the active set *offers* the icons rather than latching them, and the row
      stays null. Then the claim end to end; an incomplete set refused with `SetIncomplete`
      and nothing written; a second claim idempotent **and not moving the date**; the
      `force` bypass skipping the check; no album and no player; and emptying the album
      taking the unlock with it — which cannot be asserted on the wire, because the flag
      lives on `Album` and there is no album left to carry it. That *is* the guarantee.
    - **`AHeldCardBecomesAnIconWhenItsSubjectGoesOutOfService`** pins the rule nothing
      pinned before, and the one two others are easy to mistake for: flip `Active` on a
      subject whose card you hold, and it leaves `Pool`, stays in `Owned`, is absent from
      `Icons` while locked — so it has no slot and quietly leaves the book — and comes back
      as an icoon, already collected, on unlock. `CardInstance.IsIcon` stays false
      throughout, because it is history.
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
    unlocked icons, rated on their all-time-high.
15. Complete an active set on a test collector. A packet printed `icoon` and foiled **gold**
    (not the orange of a floor packet) appears at the top of the shelf — it is the only
    thing that announces this. Clicking it shuts and re-binds the book, then opens and
    reveals an icoon, which is in the album's own slot afterwards. The latch then survives a
    new player later crossing 5 games.
    - Confirm the card really is an icoon and not an ordinary one — that is the ordering
      working: the unlock has to land before the packet is claimed.
    - Confirm the packet **leaves the shelf** once opened and does not come back tomorrow —
      its claim is keyed on the player, never on the day, which is what stops it being an
      unlimited supply of guaranteed icoons at one a night.
    - Let a new player cross 5 games *before* opening it, and confirm the packet disappears
      until they are collected too. It is derived, so it follows the set both ways.
    - Force the latch from the test panel first, then open the packet: no ceremony, because
      re-binding a book already in its icon binding has nothing to show.
    - In production configuration, `PUT .../icons` against an incomplete set is a 409, and
      `?force=true` is a 404.
    - Under `prefers-reduced-motion: reduce` the book lands shut and re-bound in one frame.
15a. **Run all four migrations by hand against both databases** — `C:\tafelvoetbal-data\`
    and `T:\tafelvoetbal-server\data\` — and confirm `GET /api/collections/{id}` returns
    200 on each. The unit tests build their schema with `EnsureCreated()` from the model,
    so **they pass whether or not the migrations have been applied**. This is the one step
    nothing else catches.
    - `AddressEveryGift` is the one to watch. It expands any existing unaddressed gift into
      one row per player and re-points that gift's claims before deleting the original, so
      nothing is lost — but it is hand-written, and worth reading before it is run anywhere
      with real presents in it.
15c. Give a present to everybody and confirm the receipt carries **one gift id per player**,
    that no row has a null recipient, and that somebody added afterwards is not offered one.
    Then confirm no present expires — a gift from last week is still on the shelf.
15b. Set a subject whose card you hold to inactive with the icons locked: the card leaves
    the book, `{totalCards} kaarten` is unchanged, and unlocking brings it back as an
    icoon, already collected. Then repeat with the icons *already* unlocked and confirm it
    turns into an icoon in place, immediately, with no ceremony.
16. After swapping the mock client for the HTTP one, re-run the phase-1 visual
    checks — no component should have needed changing.

### The pool slice — checked

- Peaks are ≥ the current visible rating for all 76 players, and exactly 0 for
  anyone who never played.
- The endpoint returns 37 actives and 20 icons at `MinGames` 5.
- The frontend falls back to the six placeholder icons when the route 404s, so
  `npm start` with no backend still behaves as it did all through phase 1.
- **Avatar and silhouette coverage is 100%** — 20/20 icons and 37/37 actives
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
