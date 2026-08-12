# The look of the album page — nine proposals

**Status: 3 and 6 are built** (see "The mount is a recess" and "The fore-edge" in
[trading-cards.md](trading-cards.md), which is where they now live as decisions). The
other seven are still proposals. This file stays separate from that one on purpose:
mixing undecided proposals into the record of decisions blurs the one thing that
document is good for.

**Visual companion:** <https://claude.ai/code/artifact/b46eac69-c8e7-44b6-aa10-37e9ce98e6ba>
— every proposal below rendered at real scale on the mahogany, with one switch that
flips all of them between the current printing and the proposed one. The reasoning is
here; the showing is there.

## Where this starts

The slots page was stripped to paper, mounts, cards and the folio — see "The page is
bare" in trading-cards.md for the three things that came off and why. That was the
right call, and it leaves a specific opportunity: **the mount is now very nearly the
only piece of furniture left on the page.** It appears six times per spread and it
frames every card, so proposals 3–5 are where the leverage is.

Two constraints apply to everything below, both inherited:

- **Nothing decorative goes behind a card.** That was the monogram's failure, and it
  generalises.
- **No drop shadow under a card in the album.** A card is stuck down, not hovering.
  Note that proposal 2 is *light on the card*, which does not touch this; if it ever
  becomes a `box-shadow`, it does.

## The plaatje

**1 · Crooked stickers.** Half a degree of rotation per card, **hashed from the player
id** rather than `Math.random()` — the same hash the checklist ticks use, because a
sticker that picks a new angle on every render is an animation, not a sticker. The
mount stays exact and the sticker does not, and that difference is what reads as a
hand. Cheapest real "album" signal available. *Small · no data · no decision
reopened.*

**2 · Gloss on stuck-in cards only.** One static angled highlight. Stickers are glossy
and album paper is not; that contrast is the strongest "real material" cue per line of
CSS on offer. Light, not shadow — see the constraint above. *Small · no data.*

## The mount

**3 · A die-cut recess, not a dashed line — BUILT.** The mount was a 2px dashed rule.
A dashed rule is a *drawing of* a place; a hairline with a faint inner shadow and a lit
bottom lip **is** a place. Same footprint, same corner radius, still completely hidden
under a filled card — the rule that the mount is exactly the card's box and never
larger survives untouched. Only the manner of drawing changes. *Small · no data.*

**4 + 5 · Name and number printed in the slot.** What a real sticker album does: the
space says who belongs in it. A gap becomes an **entry with no picture yet**, which is
the thing that made the museum-catalogue mockup the only one of ten that felt like a
*collection*. The number is also the missing half of the checklist: the list numbers,
the book does not, so `№ 14` is currently only findable at the back.

> **This is the one proposal that reopens the bare page.** Printed text returns to a
> page it was deliberately removed from. The distinction from the old running head is
> that the head repeated what the cover already said, and this sits on the mount and
> says something found nowhere else. Keeping it small is the whole job — a numeral in
> the mount, not a caption.

*Small/medium · needs numbering · reopens: the bare page.*

## The book as an object

**6 · Thickness at the fore-edge — BUILT**, and it ended up carrying information as
well: the two stacks are unequal and the thickness crosses the spine as you read. A
few hairlines of stacked leaf edges along the
outer trim. Biggest jump in perceived quality per line of code here: the book stops
being two sheets and becomes an object with a spine and a thickness. **Watch
`.album__turn`** — the turn strip is exactly the page's margin on that side, and the
edge must sit outside the book or under it without taking a pixel of that hit area.
That overlap has been expensive once already. *Medium · no data.*

**7 · The folio to the outer corner.** Books put the folio where a thumb finds it while
turning; centred at the foot is a report's convention. It also takes the last mark out
of the middle of the page — the monogram's argument again. Left and right must mirror,
and the classes exist (`.album__face--front` / `--back`). *Small · no data.*

**8 · Paper tone varying by page.** One shift of warmth per *page index*,
deterministic. Twelve identical sheets is exactly what "flat" meant about the original
page, and this is the cheapest fix that prints nothing on it. Keep it tiny: this should
be noticed while **turning**, not while looking. Two percent, not five. *Small · no
data.*

**9 · A thumb index on the fore-edge — parked.** Coloured tabs, one per section. It is
listed because it is **an object and not a heading**, so it could bring sections back
without reopening the bare page. But there is only one section now that the icons are
interleaved among the actives. Parked rather than rejected: this is the answer for the
day a second series exists — a season, a set — not something to build for now.

## Suggested order

1. **Crooked stickers, gloss, recess.** All three pure CSS, no data, nothing reopened.
   Together they change how the leaf feels, and they can be judged in one sitting.
2. **The fore-edge.** Independent of the page, so it cannot collide with the above.
3. **Folio to the corner, and paper tone.** Two small things you only see properly once
   the above is in.
4. **Name and number in the slot.** Last, deliberately — it is the only one that puts
   printed text back on a page that was emptied on purpose, and that trade is best
   judged against the finished version of everything else.
5. **Thumb index.** Only once a second section exists.
