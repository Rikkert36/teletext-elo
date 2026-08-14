import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { Card, CardPlayer, splitName, toCard } from '../mock/cardMock';
import PlayerCard, { ownedLabel } from './PlayerCard';
import useIsMobile from '../hooks/useIsMobile';
import { albumLeather } from '../utils/albumLeather';
import { ms, prefersReducedMotion } from '../utils/animationSpeed';
import { playCoverTurn, playPageTurn, playRarePayoff, playRebind } from '../utils/sounds';
import '../styles/album.css';

const SLOTS_PER_PAGE = 6;

/**
 * Lines per checklist page, in two columns of twenty.
 *
 * **A fixed count, and it has to be.** Page composition cannot depend on the
 * viewport: the reading position is stored as a leaf index, so if a phone
 * paginated the list differently from a desktop, the same stored position would
 * land on a different page on each. So this is sized to the *smaller* of the two
 * pages — a short phone gets `--page-h` down around 386px — and the desktop book
 * simply sets the same forty lines more airily, via a line height derived from
 * the page height in album.css.
 *
 * Twenty per column rather than the ~23 that would fit is deliberate slack: names
 * are Dutch and a long one wrapping would push a column past the trim.
 */
const CHECKLIST_ROWS_PER_PAGE = 40;

/**
 * Ticks drawn by hand, three of them, so the list is not forty identical marks.
 *
 * Paths rather than a glyph, and **deliberately not a handwriting font**: the
 * stacks that look right on Windows (`Segoe Script`) fall back through generic
 * `cursive`, which is Comic Sans on most of the machines this runs on. A stroke
 * with round caps is a pencil mark in any browser and needs no font at all.
 */
const TICKS = [
  'M1.5 5.8 L4.2 8.6 L10.8 1.4',
  'M1 6.4 L4.6 9 L11.2 1',
  'M2 5.4 L4 8.8 L10.4 1.8',
];

/**
 * Which tick a card gets, and how far off square it sits.
 *
 * Hashed from the player id, so it is **stable**: the same card carries the same
 * mark across re-renders and reloads. `Math.random()` here would have the ticks
 * twitching every time the page turned, which is the one thing a mark made once
 * in pencil cannot do.
 */
const handMark = (id: string): { tick: string; tilt: number } => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const seed = Math.abs(hash);
  return { tick: TICKS[seed % TICKS.length], tilt: ((seed >> 3) % 9) - 4 };
};

/* ------------------------------------------------------------------ *
 * The re-binding ceremony
 *
 * The book being taken away and returned bound in the icon edition: it shuts, the
 * new binding is drawn across the board out of the hinge, and it settles. Four beats
 * and no words — see `RebindPhase`.
 *
 * **Every number here is HALF its real length**, because `--anim` is 2 and every
 * duration in album.css multiplies by it, exactly as `ms()` does to these timers.
 * Getting that wrong is the standing failure on this page — a ceremony at twice the
 * speed of the book it hands back to reads as a glitch rather than a sequence.
 *
 * This lives inside `Album` rather than in a component swapped in beside it, the way
 * `AlbumChoice` is. Three reasons, and the first is decisive: the book has to be seen
 * to *shut*, and only the real one can do that — it owns the leaf state, the
 * `.album--closed` transform and the cover's own turn sound. A stand-in would have to
 * reproduce a shut book's exact 3D state to hand back motionlessly, which `AlbumChoice`
 * only gets away with because it never has to match an *open* book. And the new cover
 * layer has to live on the real cover regardless, since the book keeps that binding
 * afterwards; building it twice is how the two drift apart.
 * ------------------------------------------------------------------ */

/** The board going over. Matches `.album__leaf`'s own transition, which does the work. */
/**
 * The cover and the leaves, both ways.
 *
 * Exported because the pack put-away sequences against it: a card is flown into its slot
 * *after* the page carrying that slot has landed, and the page's own clock is this. A
 * second copy of the number on the page would drift the moment this one was tuned.
 */
export const SHUT_MS = 620;

/**
 * Per leaf while **riffling** — walking several leaves in a row, which is what a card being
 * put away on a page some distance off asks for.
 *
 * Under half a deliberate turn, because the leaves come one after another and three of them
 * at `SHUT_MS` is nearly four seconds of paper. It is still a turn you can follow: the point
 * of walking at all is that no page is ever arrived at without being turned to.
 *
 * Published to the CSS as `--leaf-ms`, which `.album__leaf`'s transition reads — the walk's
 * own timer and the transition are therefore the same number by construction.
 */
const RIFFLE_MS = 280;
/** Held shut, nothing moving. A press has a pause before it. */
const REBIND_SETTLE_MS = 200;
/**
 * The room going dark and the book running up to full light.
 *
 * The ramp only. It was 2700 and did the ramp *and* the wait in one beat, on a curve slow
 * enough to fill the length — which meant the book spent most of the build dim. Splitting
 * the wait out let this go back to being a rise, and put the waiting somewhere it can have
 * something in it.
 */
const CHARGE_MS = 900;

/**
 * Held at full light, and **this is where the rings come on, one at a time.**
 *
 * The longest beat in the ceremony, and the one doing the work the ramp used to be asked to
 * do. A build needs something to accumulate; brightness alone tops out and then has nowhere
 * left to go, so the accumulation is the orbits arriving rather than the light rising.
 *
 * The three land at 0, 0.5 and 1.0 seconds and take 0.42 to fade in, so the last one is up
 * by about 1.4 — and the rest of this beat is the pause with all three turning, which is the
 * thing the climax breaks. That pause is why this is 2200 rather than 1600: at the shorter
 * length the third ring had barely arrived before the bloom took it.
 *
 * Nothing about the cover changes across it — `charging` and `holding` set the same filter,
 * so the transition runs once and the peak simply stays.
 */
const HOLD_MS = 2200;
/**
 * The whole page blooming white. The book changes inside this.
 *
 * **Half again as long, and it is the hold that got longer, not the arrival.** The two
 * transitions that run inside this beat — the cover's last push to white at 180ms and the
 * page bloom's own fade-in at 200ms — are deliberately left alone. They are the "land fast"
 * half of the rule the charge obeys the other half of: the flash has to arrive quickly, and
 * then it is worth holding. Stretching them instead would have softened the climax rather
 * than extended it.
 *
 * So the white now arrives in the same ~200ms and sits for roughly 310 rather than 160.
 */
const BLOOM_MS = 900;
/** The bloom fading off what it left behind. */
const RESOLVE_MS = 1100;
/** The bound book, sitting on the table. */
const REBIND_REST_MS = 520;
/** Fading off, so the pack opener does not cut in on the last frame. */
const HAND_MS = 320;

/**
 * The re-binding, as an evolution rather than a wipe.
 *
 * The first version drew the new binding across the board with a `clip-path`, which was
 * honest about *what* was happening and far too small for *when* it happens — once in a
 * collection's life. The room goes dark, the book goes white, gold flies around it in
 * orbits, the whole page blooms, and the book is lying there bound when the bloom clears.
 *
 * **There is no alternating flicker**, and the reason is worth keeping because it is the
 * obvious thing to reach for. In the games the flicker works because the two forms have
 * *different silhouettes*; here they are the same rectangle — a leather book and a
 * half-bound one have identical outlines — so there would be nothing to alternate, and a
 * white silhouette hides the only thing that actually changes. The rings carry that energy
 * instead.
 *
 * **The change itself is hidden.** The icon binding is simply present from `blooming`
 * onward, with no transition, because by then the whole page is white and there is nothing
 * to see it happen against. That deletes the entire `clip-path` mechanism the wipe needed —
 * a swap you cannot see needs no animation, and hiding the cut is what the bloom is for.
 */
type RebindPhase =
  | 'shutting'
  | 'settling'
  | 'charging'
  | 'holding'
  | 'blooming'
  | 'resolving'
  | 'resting'
  | 'handing'
  /**
   * Over. The book is bound, visible, and the reader's again.
   *
   * **A terminal phase rather than clearing the state back to null**, because null would take
   * the icon binding off the cover with it — `showBinding` reads the phase, and on the paths
   * where nothing was written to the server (the test panel's, and a failed claim) `icons` is
   * still false. So the ceremony has to end somewhere that means "bound" rather than
   * "nothing happening".
   *
   * And it has to be its own phase rather than resting on `handing`, which is the bug this
   * fixed: `handing` fades the album to nothing on its way to the pack opener, so an album
   * left sitting in it is an album that has vanished. Nobody saw that on the real path,
   * where the opener replaces the book on the next frame anyway.
   */
  | 'done';

/**
 * From here on the book *is* the icon edition — dark ink on ivory boards.
 *
 * Not before `blooming`, and that is not cosmetic: the printing goes bronze with the binding,
 * and bronze type on the leather cover it has not replaced yet is dark on dark. The light is
 * what makes the swap invisible, so the swap has to wait for the light.
 */
const BOUND_PHASES = new Set<RebindPhase>([
  'blooming',
  'resolving',
  'resting',
  'handing',
  'done',
]);

/**
 * The rings of gold that fly around the book.
 *
 * Three of them, each tilted and yawed differently so they read as orbits rather than as
 * three circles drawn on top of each other — `.album` already carries `perspective`, so a
 * ring turned out of the page really is foreshortened rather than faked.
 *
 * One runs the other way. Two rings both spinning clockwise look like one thick ring; a
 * counter-rotation is what makes the space between them legible.
 *
 * Radii are fractions of `--page-w` — the **shut** book, which is what is on the table for
 * the whole ceremony — so the orbits scale with it rather than being pinned to a pixel size
 * that only suits a desktop. Above 0.5 is an orbit that clears the cover's edge, so all
 * three of these pass outside the book at their widest.
 *
 * `in` is when each one arrives, in seconds, applied as a `transition-delay`. They come on
 * **one at a time, and only during the hold** — all three appearing together read as a light
 * being switched on rather than as something gathering, and the hold is the beat that has to
 * do the gathering now that the brightness tops out before it.
 */
const REBIND_RINGS = [
  { tilt: 74, yaw: 0, radius: 0.72, spin: 1.5, beads: 16, size: 5, reverse: false, in: 0 },
  { tilt: 62, yaw: 58, radius: 0.92, spin: 2.1, beads: 20, size: 4, reverse: true, in: 0.5 },
  { tilt: 84, yaw: -34, radius: 0.66, spin: 1.1, beads: 12, size: 6, reverse: false, in: 1 },
] as const;

/**
 * The top of the payoff ladder — the full D-minor chord, all four voices.
 *
 * `playRarePayoff` clamps to its own range, so this is a statement of intent rather than a
 * bound: nothing in the game is rarer than the moment this plays under, so nothing should
 * out-sound it. The card that comes out of the packet a few seconds later gets its own
 * payoff at whatever level it earns, which will usually be less.
 */
const REBIND_PAYOFF = 4;

/*
 * The scattered grains that used to be here are gone.
 *
 * They were thrown outward from the book on individual bearings, which is a firework — it
 * happens once and it is over, and nothing about it says the book is being worked on. Rings
 * that keep going round say it for as long as they are turning, which is what the beat before
 * the bloom needs to fill.
 */

/**
 * How long a just-bound book lies shut before it opens itself. See `justBound`.
 *
 * **Half its real length**, like every timing on this page — `--anim` is 2 and `ms()`
 * doubles it, so this is 840ms of a book on the table. Long enough to be a pause and not so
 * long that the reader reaches for the cover first, which would be the ceremony and the
 * reader turning the same page at once.
 */
const JUST_BOUND_OPEN_MS = 420;

/**
 * Where the reader left off, so the album reopens where they closed it.
 *
 * Stored as a leaf index — what the desktop book is in terms of — with mobile
 * converting either way, so switching between the two layouts lands on roughly
 * the same spread instead of resetting.
 *
 * Absent means a first visit, which is deliberately the closed book (leaf 0).
 *
 * **Keyed per owner.** It used to be one global key, which meant two things: opening a
 * colleague's album landed you on *your* page in it, and — worse — an album that had
 * just been bound in the opening sequence opened halfway through, at the one moment the
 * shut cover is the entire point. A fresh owner has no entry and so starts closed, which is
 * exactly what the ceremony hands over to — and `justBound` opens it from there, so the
 * first spread is arrived at rather than restored.
 */
const leafKey = (owner?: string): string =>
  `tafelvoetbal.cards.albumLeaf${owner ? `.${owner}` : ''}`;

const readLeaf = (owner?: string): number => {
  try {
    const stored = window.localStorage.getItem(leafKey(owner));
    if (stored === null) return 0;
    const leaf = parseInt(stored, 10);
    return Number.isFinite(leaf) && leaf >= 0 ? leaf : 0;
  } catch {
    return 0;
  }
};

const writeLeaf = (leaf: number, owner?: string): void => {
  try {
    window.localStorage.setItem(leafKey(owner), String(leaf));
  } catch {
    /* private browsing — the position just will not survive the session */
  }
};

export interface AlbumSection {
  title: string;
  /** Everything collectable in this section, in display order. */
  players: CardPlayer[];
  /** How many of each you hold. Absent or 0 renders a silhouette. */
  counts: Map<string, number>;
}

interface Slot {
  card: Card;
  count: number;
}

/* ------------------------------------------------------------------ *
 * The head band
 *
 * **It takes the book's own leather, and that is settled.** Two candidates that
 * coloured it by the tiers on the leaf were built and dropped; the reasoning is
 * recorded in album.css above `.album__band`, and it is worth reading before anyone
 * colours this from the collection again.
 *
 * Nothing is computed on this side any more. The band is `.album__band`, its colour
 * is mixed from `--leather-mid` in CSS, and a page only has to print it.
 * ------------------------------------------------------------------ */

/**
 * One printed line of the checklist at the back.
 *
 * `number` is the card's place in the book counted over slots only, so padding
 * pages never shift it. There was a `page` here too — where that slot is printed,
 * for when a row was a button that turned the book to it; it went with the button.
 */
interface ChecklistEntry {
  playerId: string;
  name: string;
  number: number;
  count: number;
}

/** A slot plus which page it is printed on, for anything navigating the book. */
export interface AlbumSlotRef extends Slot {
  page: number;
}

interface AlbumPage {
  kind: 'cover' | 'endpaper' | 'foreword' | 'slots' | 'checklist';
  /**
   * Cover only, both of them — a slots page prints nothing but its cards and its
   * page number, so it sets neither. Optional for that reason: `title` was
   * required back when every page carried a running head.
   *
   * There was a `subtitle` too, carrying the cover's tally. It went with the
   * tally; nothing else ever set it.
   */
  title?: string;
  /** The line above the name. */
  kicker?: string;
  slots: Slot[];
  /**
   * Slots pages only: the lowest and highest overall printed on this leaf, for the
   * head — see `.album__list-range`.
   *
   * Per page rather than per section on purpose. The book is one section sorted
   * ascending by rating, so a page can straddle two tiers and a tier name in the
   * head would sometimes be false; the range never is. Absent on a padding page,
   * which has no cards to have a range of.
   */
  range?: { lo: number; hi: number };
  /** Checklist pages only: the lines printed on this one. */
  entries?: ChecklistEntry[];
  /**
   * Set on the **last** checklist page only, which is where the tally is written.
   *
   * `total` is printed with the list (it is how many there are, which the press
   * knows) and `owned` is the figure a hand fills into the blank.
   */
  tally?: { owned: number; total: number };
}

/* ------------------------------------------------------------------ *
 * Page building
 * ------------------------------------------------------------------ */

/**
 * Page 0 is the front cover, so leaf 0 is the front **board**: cover on the front,
 * endpaper on the back.
 *
 * That gives the book a genuinely closed state at `flipped === 0` — which is
 * where a first-time visitor starts, and which the back arrow can always return
 * to. Without a cover page, `flipped === 0` already showed an open spread and
 * there was nothing to open.
 *
 * **Leaf 0 used to carry [cover | first page of players], and that was the bug.**
 * Opening the book landed you on a spread whose left-hand side was the *back of the
 * cover* with six card slots printed on it — one physical sheet doing duty as both
 * the board and the first page, which is a thing no book does. The reason given for
 * it was that an inside cover costs a page and would be an empty swipe on mobile.
 * That reason was sound and the fix answers it: the page is not empty, it carries
 * the **voorwoord**. So:
 *
 *     0  cover          leaf 0 front   the board, outside
 *     1  endpaper       leaf 0 back    the board, inside — no print on it
 *     2  foreword       leaf 1 front   the voorwoord
 *     3  first slots    leaf 1 back    cards start on a spread of their own
 *     …
 *     E  endpaper       last leaf      the back board, inside
 *
 * Both endpapers are the leather of the binding rather than paper, which is what
 * makes the boards read as boards at every spread — see `.album__endpaper`.
 *
 * The final endpaper has to land on an **even** index so it is a leaf *front*: that
 * puts it on the right-hand side of the last spread, which is where the inside of a
 * back board is. An odd `pages.length` therefore takes one blank sheet first, and a
 * blank leaf at the end of the text block is what a real book has there too.
 */
const buildPages = (sections: AlbumSection[], owner?: string): AlbumPage[] => {
  const pages: AlbumPage[] = [];

  if (sections.length > 0) {
    /*
     * The cover carries whose album it is, which is why the page header above the
     * stage no longer repeats it. On a real album that line is the whole front.
     *
     * **And it carries nothing else — the tally is gone.** It used to read
     * "<owned> / <total> spelers" under the name, which is a number that changes
     * every time a packet is opened, blocked into a cover in gold foil. Foil is
     * struck once when the book is bound and never rewritten, so a live figure
     * there was the least physically defensible thing in the whole album. A count
     * belongs where a hand can write it: the checklist at the back.
     */
    pages.push({
      kind: 'cover',
      kicker: owner ? 'Verzamelalbum van' : undefined,
      title: owner ?? 'Verzamelalbum',
      slots: [],
    });

    /* The other side of the same board, and then the voorwoord facing it. */
    pages.push({ kind: 'endpaper', slots: [] });
    pages.push({ kind: 'foreword', slots: [], title: owner });
  }

  /*
   * The checklist's lines, gathered as the slots pages are laid out rather than
   * walked again afterwards. Same reason `albumSlotOrder` is built from
   * `buildPages`: two passes over the roster are two things that can disagree,
   * and here they would disagree about which number is against which name.
   */
  const entries: ChecklistEntry[] = [];

  /*
   * Nothing else is computed per section any more.
   *
   * There used to be a running head ("Verzamelalbum · <naam>") and a tally, with
   * the section title folded into the tally as a qualifier for the second and
   * later sections. The page no longer prints a head at all — see `PageFace` for
   * why — so the owner, the section title and the owned count are all unused
   * here, and `section.title` now only reaches the reader via the cover.
   */
  sections.forEach((section) => {
    /*
     * Start each section at the left of a spread, so two sections never share one —
     * a spread with a different heading on each side looks like a mistake. Inert
     * while there is only one section, which is the case since icons were
     * interleaved rather than appended.
     *
     * Leaf i holds [page 2i, page 2i+1], and at `flipped = f` the spread shows
     * page 2f-1 on the left and 2f on the right — so a section must begin on an
     * ODD index. The cover at page 0 is what makes that the odd case: it leaves
     * `pages.length` at 1 here, so the first section already starts correctly and
     * only later ones can need padding.
     */
    if (pages.length % 2 === 0) {
      pages.push({ kind: 'slots', slots: [] });
    }

    for (let i = 0; i < section.players.length; i += SLOTS_PER_PAGE) {
      const chunk = section.players.slice(i, i + SLOTS_PER_PAGE);
      const slots = chunk.map((player) => ({
        card: toCard(player),
        count: section.counts.get(player.id) ?? 0,
      }));

      slots.forEach((slot) => {
        entries.push({
          playerId: slot.card.player.id,
          /*
           * The name without the nickname.
           *
           * Stored names carry one in quotes (`Petar "beetje gepiel" Drandarov`),
           * and a checklist is a column of forty lines about 90px wide — the one
           * place in the album with the least room for the longest part of a name.
           * `splitName` is the same helper the card face and the initials use, so
           * the list cannot start disagreeing with them about what a name is.
           *
           * The nickname is not lost: it is on the back of the card, which is
           * where it was put for this reason.
           */
          name: splitName(slot.card.player.name).display,
          /* Counted over slots, so a padding page cannot shift a number. */
          number: entries.length + 1,
          count: slot.count,
        });
      });

      const overalls = slots.map((slot) => slot.card.overall);
      pages.push({
        kind: 'slots',
        slots,
        range: { lo: Math.min(...overalls), hi: Math.max(...overalls) },
      });
    }
  });

  /* ---------------------------------------------------------------- *
   * The checklist at the back
   *
   * The conventional last page of a sticker album: every collectable listed and
   * numbered, ticked off as you get it. It is also the one page in the book where
   * a number that changes is physically honest — see the tally in `PageFace`.
   *
   * It starts on a LEFT-hand page for the same reason a section does: a spread
   * with cards on one side and a list on the other reads as a mistake. An odd
   * index is the left-hand page, so an even `pages.length` needs one blank first.
   * ---------------------------------------------------------------- */
  if (entries.length > 0) {
    if (pages.length % 2 === 0) {
      pages.push({ kind: 'slots', slots: [] });
    }

    const owned = entries.filter((entry) => entry.count > 0).length;

    for (let i = 0; i < entries.length; i += CHECKLIST_ROWS_PER_PAGE) {
      const rows = entries.slice(i, i + CHECKLIST_ROWS_PER_PAGE);
      const last = i + CHECKLIST_ROWS_PER_PAGE >= entries.length;
      pages.push({
        kind: 'checklist',
        slots: [],
        entries: rows,
        /* One tally for the whole album, at the foot of the final page of it. */
        tally: last ? { owned, total: entries.length } : undefined,
      });
    }
  }

  /* ---------------------------------------------------------------- *
   * The back board
   *
   * The inside of the back cover, closing the book the way the endpaper at page 1
   * opens it. It must be a leaf **front** — an even index — so it lands on the
   * right-hand side of the last spread, which is the side a back board is on.
   *
   * The blank that an odd count needs is the last sheet of the text block, which is
   * blank in a real book too. It replaces the older "no padding to an even page
   * count" rule: that rule existed because padding bought a spread with nothing on
   * either side, and this pads *toward* something rather than for symmetry.
   * ---------------------------------------------------------------- */
  if (pages.length > 0) {
    if (pages.length % 2 === 1) {
      pages.push({ kind: 'slots', slots: [] });
    }
    pages.push({ kind: 'endpaper', slots: [] });
  }

  return pages;
};

/**
 * Every slot in the book, in printed order, placeholders included.
 *
 * For the card viewer, whose left/right must land on the next slot *as printed* —
 * so it has to be built from the same `buildPages` the album renders from rather
 * than from the sections directly, or the two orders drift the moment a section
 * gets a padding page.
 */
export const albumSlotOrder = (sections: AlbumSection[], owner?: string): AlbumSlotRef[] =>
  buildPages(sections, owner).flatMap((page, index) =>
    page.slots.map((slot) => ({ ...slot, page: index })),
  );

/**
 * The leaf count at which a given page is on screen.
 *
 * Leaf `i` holds page `2i` on its front and `2i+1` on its back, and at
 * `flipped = f` the spread shows `2f-1` on the left and `2f` on the right. Both
 * solve to `ceil(page / 2)`.
 */
const flippedForPage = (page: number): number => Math.ceil(page / 2);

/**
 * Which page a player's slot is printed on, or -1.
 *
 * Found rather than computed, for the same reason `justBound` finds the voorwoord:
 * `buildPages` pads, so a page index worked out from a position in `sections` is one
 * composition change away from naming the wrong leaf.
 */
const pageOfPlayer = (pages: AlbumPage[], playerId: string): number =>
  pages.findIndex((p) => p.slots.some((slot) => slot.card.player.id === playerId));

/* ------------------------------------------------------------------ *
 * Page rendering
 * ------------------------------------------------------------------ */

const PageFace: React.FC<{
  page: AlbumPage | undefined;
  index: number;
  /**
   * Whether this page is the one on screen.
   *
   * Every leaf is rendered at all times, and a face rotated away from the reader is
   * still in the document and still focusable — so without this, tabbing walks the
   * cards of every page in the book, most of them invisible.
   */
  visible: boolean;
  onCardOpen?: (playerId: string) => void;
  /**
   * Draw the icon binding.
   *
   * **Not the same question as "is this book bound in it".** It has to be true for the
   * length of the re-binding as well, while the server's answer is still parked in the
   * page's ref and `iconsUnlocked` is therefore still false. Rendering it off the unlocked
   * flag alone was the bug that made the ceremony invisible: the layer only appeared once
   * the state landed, which is *after* the wipe that was supposed to bring it in, so all
   * that ever played was the book shutting.
   */
  binding?: boolean;
  /**
   * Slots to draw as still empty although the card is already in the collection,
   * because it is at this moment flying across the table towards them.
   *
   * The one place the book is knowingly drawn behind the truth, and the whole of what
   * makes the landing a landing: the card is applied before the flight starts — it has
   * to be, or there would be nothing for the slot to fill with — so without this the
   * hole is already filled by the time the card arrives at it. See `PutAway`.
   */
  held?: ReadonlySet<string>;
}> = ({ page, index, visible, onCardOpen, binding, held }) => {
  if (!page) return <div className="album__page" />;

  if (page.kind === 'cover') {
    return (
      <div className="album__cover">
        {/*
          The icon binding: ivory boards, with the chosen stain kept as the four corners.

          A half-bound book, so the leather it was bound in is still what carries the
          spine — which `.album__binding` behind the book already draws, and is why there
          is no strip down this face. There was one, at 18%, and it was wrong twice over:
          it doubled the spine the book already has, and it merged with the two left-hand
          corners into a single brown mass that read as a letter strip rather than as a
          binding.

          **Its own element, and revealed by a transitioned `clip-path`.** A `background`
          built out of custom properties cannot be transitioned (see albumLeather.ts),
          which is the same trap that made `.album__binding` a separate element rather than
          a background on the book. Clipping sidesteps it entirely, and a wipe out of the
          hinge reads as the book being re-cased rather than as one cover dissolving into
          another — which is what an opacity crossfade would have given.
        */}
        {binding ? <div className="album__cover-icons" /> : null}

        {page.kicker ? <div className="album__cover-kicker">{page.kicker}</div> : null}
        <div className="album__cover-title">{page.title}</div>
        {/*
          The rule now closes the cover instead of dividing it: it used to have the
          tally under it (see `buildPages`), so with that gone it reads as a
          flourish under the name, which is what foil rules do on real bindings.

          Nothing prints below it on any cover any more: `.album__cover-sub` was the
          last holdout, a static "nog geen kaarten" on the freshly bound book in
          AlbumChoice, and it said out loud what an empty album already says.
        */}
        <div className="album__cover-rule" />

        {/*
          **Nothing says "iconen" on the cover, and nothing should.** A blocked word was
          tried and removed: the binding is what tells you the book holds them, and a
          caption under it is the cover explaining itself. It is the same objection that
          removed the `legende` pill from the card face — a label rather than material —
          and the reason nothing here prints the word "icoon" either.
        */}
      </div>
    );
  }

  /*
   * The inside of a board: leather, and **nothing printed on it at all**.
   *
   * It is the one face in the book that is not paper, which is exactly its job — it
   * is what tells you the thing you just opened has boards. Both ends use it: page 1
   * behind the cover, and the last page as the inside of the back board.
   */
  if (page.kind === 'endpaper') {
    return <div className="album__endpaper" aria-hidden="true" />;
  }

  /*
   * The voorwoord, facing the front endpaper.
   *
   * It exists to pay for the endpaper. An inside cover on its own would have cost a
   * page and, on mobile, been a swipe with nothing on it — which is precisely why
   * there was no inside cover before. A voorwoord is the page a real album puts
   * exactly here, so the spread earns itself: board on the left, a word on the right.
   */
  if (page.kind === 'foreword') {
    return (
      <div className="album__page album__page--foreword">
        <div className="album__foreword">
          <h2 className="album__foreword-title">Voorwoord</h2>
          <p>
            Er hoeft maar iemand “potje?” te zeggen en het ritueel begint vanzelf.
            Vier mensen verzamelen, de optocht richting de tafel, Chwazi openen, vingers erop en kijken wie met wie
            opgescheept zit. Daarna volgt meestal precies waarvoor je gekomen bent:
            een paar minuten tafelvoetbal, een hoop onzin en iets meer fanatisme dan
            strikt noodzakelijk.
          </p>
          <p>
            Wie vaak genoeg meespeelt, weet dat de leukste momenten lang niet altijd op het scorebord terechtkomen.
            Er zijn goals die met echte doelpalen nooit hadden gezeten, 
            ballen die via de achterwand en vervolgens via de pumba van de keeper alsnog binnenvallen, 
            ‘Pietjes’, ‘Mark-ies’ en langzaam rollende ballen die met “psst psst” en driftig wijzen 
            de juiste hoek in worden gewenst. Zelfs een bal die uit de tafel vliegt, 
            krijgt soms op wonderbaarlijke wijze een tweede leven wanneer hij hooghoudend weer het spel in wordt gewerkt. 
            Aan het einde van de dag groeit “nog één potje” bovendien verrassend makkelijk uit tot een complete rotatie.
          </p>
          <p>
            Na genoeg wedstrijden krijgt bijna iedere speler vanzelf een eigen
            verhaal. Een favoriete positie, een beruchte signature-move, een twijfelachtige gewoonte
            of simpelweg een reputatie die groter is geworden dan de resultaten
            rechtvaardigen. Al die spelers, verhalen en eigenaardigheden verdienen
            eigenlijk een plek bij elkaar.
          </p>
          <p>
            En precies daar is dit verzamelalbum voor. Door te spelen vul je het
            stukje bij beetje met de mensen die de tafel maken tot wat hij is. Bekende
            gezichten verschijnen, lege silhouetten verdwijnen en langzaam ontstaat er
            een verzameling van iedereen die ooit rond de tafel stond en zijn sporen
            heeft achtergelaten.
          </p>
          <p>
            Of een compleet album ook betekent dat je beter bent geworden aan tafel,
            laten we in het midden.
          </p>
          <p>Veel verzamelplezier.</p>
          <p className="album__foreword-sign">Het Tafelvoetbalcomité</p>
        </div>

        <div className="album__page-number">{index}</div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- *
   * The checklist
   *
   * The one page in the album that legitimately carries a heading: it is a
   * printed list, and a list without a head is not a list. That does not reopen
   * the bare slots page — the argument there was that the head repeated what the
   * cover already said, and "CHECKLIST" says something the cover does not.
   *
   * Two hands on this page, and keeping them apart is the whole idea:
   *
   *   the press   numbers, names, the leader dots, the empty boxes, the total
   *   the reader  the ticks, the doubles figures, the tally in the blank
   *
   * The press's marks are the paper's own brown ink. The reader's are graphite.
   * Nothing here claims printed ink rewrote itself — the marks appear because you
   * put them there, in your own book.
   * ---------------------------------------------------------------- */
  if (page.kind === 'checklist') {
    const rows = page.entries ?? [];

    return (
      <div className="album__page album__page--list">
        <div className="album__list-head">
          {/*
            The head is the word and nothing else. It used to carry "<n> spelers"
            in the far margin, and the figure was already on the page twice over —
            once per row in the count column, and once as the total in the tally
            below the list. Three copies of one number is two too many, and the
            tally is the one that belongs, since it is the reader's own sum.
          */}
          <span className="album__list-title">Checklist</span>
        </div>

        <ol className="album__list">
          {rows.map((entry) => {
            const has = entry.count > 0;
            const { tick, tilt } = handMark(entry.playerId);
            return (
              <li key={entry.playerId} className="album__entry">
                {/*
                  A printed line and nothing else. The row used to be a button
                  that turned the book to the page that slot is printed on, and
                  it came out: a name on this paper that lights up and answers a
                  click is the one thing on the page reading as a control rather
                  than as print, which is the argument that keeps the rest of the
                  album bare. Looking a card up is what turning pages is for.
                */}
                <div className="album__entry-row">
                  <span className="album__entry-nr">{entry.number}</span>
                  <span className="album__entry-name">{entry.name}</span>
                  {/* Leader dots, as a printed list has between name and mark. */}
                  <span className="album__entry-leader" />
                  <span className="album__entry-box">
                    {has ? (
                      <svg
                        className="album__tick"
                        viewBox="0 0 12 10"
                        style={{ transform: `rotate(${tilt}deg)` }}
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path d={tick} />
                      </svg>
                    ) : null}
                  </span>
                  {/*
                    Doubles, noted beside the tick the way you would note them in
                    a book you were keeping — and the reason a checklist is also a
                    swap list. Only past one: "1" written next to a tick would be
                    saying the same thing twice.
                  */}
                  <span className="album__entry-dupe">
                    {entry.count > 1 ? entry.count : ''}
                  </span>
                  {/*
                    The mark is a drawn tick and the doubles figure is a bare
                    numeral, so the row's state was carried by the button's
                    `aria-label`. With the button gone it is spelled out here
                    instead — printed off-screen, the same `ownedLabel` the card
                    and the viewer use, so the three cannot start disagreeing.
                  */}
                  <span className="album__entry-state">
                    {ownedLabel(entry.count)}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        {/*
          The tally, and the one number in the album that is allowed to change.
          It works because the page is printed as a FORM: "Verzameld: ____ van 24"
          comes off the press with the blank empty, and the figure in the blank is
          written in. That is why this had to come off the cover, where the same
          number was blocked in gold foil — foil is struck once and never rewritten.

          Only the current figure is written. A lineage of struck-through earlier
          figures is the honest way to show a tally being kept, but it is real data
          or it is nothing: inventing plausible past numbers would be fabricating a
          history. The genuine one is derivable from `CardInstance` timestamps, and
          that is a backend errand, not a render.
        */}
        {page.tally ? (
          <div className="album__tally">
            <span className="album__tally-label">Verzameld:</span>
            <span className="album__tally-written">{page.tally.owned}</span>
            <span className="album__tally-label">van {page.tally.total}</span>
          </div>
        ) : null}

        <div className="album__page-number">{index}</div>
      </div>
    );
  }

  /*
   * **A head band, the mounts and the folio.**
   *
   * The head is the checklist's, reused: `.album__list-head` with "COLLECTIE" and
   * this leaf's rating range set in the title beside it — now reversed out of a
   * printed band bled to three trims. See `.album__band` in album.css for what the
   * band takes off the head (its rule and its margins) and what it adds (a ground),
   * and why the type itself is untouched.
   *
   * **This is not the running head coming back, and the difference is the range.**
   * The old one read "Verzamelalbum · <naam>" with the tally opposite, and every
   * word of it was already on the cover — so it repeated, twelve times, a line the
   * reader had just read. A range is true of this page and no other, and since the
   * book is sorted ascending by rating it also says where in the book you are,
   * which nothing else on a slots page does. That is a heading naming its page,
   * which is the same test the checklist's head passes.
   *
   * `title` and `subtitle` survive on `AlbumPage` for the **cover only** — do not
   * take a slots page's word for either being set. `range` is this page's own.
   */
  /* A padding page has no cards, so it has no range, no band and no rules — and it
     keeps the plain page's top margin rather than paying for a band it does not
     print. */
  const banded = page.range !== undefined;

  return (
    <div className={`album__page${banded ? ' album__page--slots' : ''}`}>
      {banded ? (
        <>
          <div className="album__band">
            <div className="album__list-head">
              <span className="album__list-title">Collectie</span>
              <span className="album__list-sep">·</span>
              <span className="album__list-range">
                {page.range?.lo} – {page.range?.hi}
              </span>
            </div>
          </div>
          <div className="album__page-rule album__page-rule--head" />
        </>
      ) : null}

      {/*
        Each card sits in its own slot rather than directly in the grid. The slot
        is what the page is designed *around*: it draws the mount the card is
        held by — a die-cut outline, a chalked position, a stone niche — at
        exactly the grid position, which artwork in the background SVG cannot do
        because that layer is scaled to cover and does not share the grid.

        The slot is also the click target: it is the card's exact box, and putting
        the handler on it rather than on the card means an empty position opens too.
        A silhouette is the one card you most want to look at.
      */}
      <div className="album__slots">
        {page.slots.map((slot) => {
          const empty = slot.count === 0 || held?.has(slot.card.player.id) === true;
          return (
            <button
              key={slot.card.player.id}
              type="button"
              className={`album__slot${empty ? ' album__slot--empty' : ''}`}
              tabIndex={visible ? 0 : -1}
              /* How the card viewer finds this slot again to hand focus back. */
              data-slot-player={slot.card.player.id}
              /*
               * And how a card being put away finds out whether its own slot is on the
               * page in front of the reader — the book renders every leaf at all times,
               * so the element existing says nothing about it being in view. Stamped
               * from `visible`, which is the only thing that knows, and so covers the
               * mobile book (one page) and the desktop spread (two) without either
               * having to be re-derived outside this component.
               */
              data-slot-shown={visible ? '1' : undefined}
              onClick={() => onCardOpen?.(slot.card.player.id)}
              aria-label={`${slot.card.player.name} — ${ownedLabel(slot.count)}`}
            >
              <PlayerCard card={slot.card} empty={empty} count={slot.count} />
            </button>
          );
        })}
      </div>

      {/* The foot rule, on the same measure as the head's — see `.album__page-rule`.
          Only on a page that prints something, for the same reason the band is. */}
      {banded ? <div className="album__page-rule album__page-rule--foot" /> : null}

      {/*
        The cover is page 0, so a content page's number is its index, not +1.

        **A blank leaf is not numbered.** `buildPages` pads with an empty slots page so a
        section or the checklist can start on a left-hand page, and that sheet has no
        cards, no band and no rules — but it was still printing a folio, which is what
        made it read as a page that had failed to render rather than as a blank leaf. A
        bound book does contain blank leaves and a press never numbers one; the count
        does not shift either, because the folio IS the page index.
      */}
      {page.slots.length > 0 ? <div className="album__page-number">{index}</div> : null}
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * Album
 * ------------------------------------------------------------------ */

/**
 * The cover is a board on a glued spine and sounds nothing like a sheet, so the
 * two moves get different sounds — see `playCoverTurn`.
 *
 * The move that turns the cover is the one between the shut book and the first
 * spread, in either direction: leaf 0 on the desktop book, page 0 on mobile.
 * Everything else is paper.
 */
const playTurnSound = (from: number, to: number): void => {
  if (Math.min(from, to) === 0) playCoverTurn();
  else playPageTurn();
};

interface AlbumProps {
  sections: AlbumSection[];
  /** Whose album this is. Printed on the cover. */
  owner?: string;
  /**
   * The owner's player id, used only to key the saved reading position.
   *
   * Separate from `owner` because that is a display name and display names are not
   * unique — there are two Daans and two Jeroens on the board, and they would share a
   * page position.
   *
   * The component does not re-read the position when this changes, so the collection
   * page mounts the album with `key={playerId}`; switching owner is a different book,
   * not the same book showing something else.
   */
  ownerId?: string;
  /**
   * Which leather the book is bound in — one of `utils/albumLeather.ts`'s ids.
   *
   * Read on every render rather than resolved once, so a cover that changes re-stains
   * in place. Undefined falls back to bordeaux, the binding the album had before there
   * was a choice.
   */
  cover?: string;
  /**
   * This book was bound a moment ago and the reader watched it happen.
   *
   * The book then **opens itself on the voorwoord**, after a beat lying shut — see
   * `JUST_BOUND_OPEN_MS`. The caller says what just happened; which page that lands on is
   * the album's business, because page composition is (`buildPages` can pad, and a page
   * index handed in from outside would be a second thing to keep in step with it).
   *
   * It replaces an invitation line that used to sit above the shut book. The argument for
   * that line was real — the album has **no chrome**, so nothing on screen says the cover is
   * a button — and the answer is that the ceremony now performs the gesture instead of
   * describing it: the cover turn a new owner sees here is the same one their click makes.
   * What it opens onto is the voorwoord, which is the page that explains the album, and
   * which existed for exactly this spread.
   */
  justBound?: boolean;
  /** Rendered under the book, e.g. the page controls' surroundings. */
  footer?: ReactNode;
  /** A card was clicked. Opens it in the viewer. */
  onCardOpen?: (playerId: string) => void;
  /**
   * Turn to the spread this card is printed on, **silently**.
   *
   * Set to whatever the card viewer is showing, so browsing left and right behind
   * the scrim leaves the book open on the right spread when the viewer closes. No
   * separate close-time handling, and the 620ms leaf transition is never seen.
   */
  focusPlayerId?: string | null;
  /**
   * The spread the book is **already open on** when it mounts, named by a card printed
   * on it. Overrides the saved reading position for that one mount.
   *
   * For the cards being put away after a pack: they fly into their own slots, so the
   * page they are printed on has to be the page in front of the reader. Not
   * `focusPlayerId`, which turns a book that is already on screen — the album is
   * unmounted for the whole of the opener, so arriving open on the right spread costs
   * nothing, where turning to it would cost the `SHUT_MS` leaf and a card would have to
   * hang in the air waiting for the paper to land.
   *
   * Read at mount only, like the saved position it replaces. The page it lands on is
   * then written back as the reading position by the ordinary effect, which is right:
   * the book is left open where the card went.
   */
  openAtPlayerId?: string;
  /**
   * Turn to this card's page, **audibly**, because the reader is watching the book.
   *
   * The other half of `openAtPlayerId`: a pack being put away walks its new cards in
   * rating order, and the ones that are not printed on the page in front of you need the
   * page turned to them. That is a page turn the reader is looking straight at, so unlike
   * `focusPlayerId` — which turns the book behind the card viewer's scrim — it gets the
   * sound. `goToPage` does nothing when the page is already on screen, so cards sharing a
   * page cost no turn.
   */
  turnToPlayerId?: string | null;
  /**
   * The book has **arrived** at `turnToPlayerId`'s page and is standing still.
   *
   * The placing sequence waits for this rather than timing the turn itself, and that is not
   * a convenience: how long a move takes is a property of the distance — one leaf, three
   * leaves, or none at all — so a caller guessing it either flies a card at a page still in
   * the air or pays a turn's worth of beat for a turn that never happened. Fires on every
   * path, including the ones with nothing to do, or a sequence waiting on it stalls.
   */
  onTurned?: (playerId: string) => void;
  /**
   * Cards that are in the collection but still in the air on their way to their slots.
   * Those slots draw empty until they land. See `PageFace`'s `held`.
   */
  holdSlots?: readonly string[];
  /**
   * Bound in the icon edition — ivory boards with the chosen stain at the corners.
   *
   * Server truth off `album.iconsUnlocked`, read on every render like `cover`, so a book
   * that was re-bound in a previous session is simply drawn that way with no ceremony and
   * nothing to persist here.
   */
  icons?: boolean;
  /**
   * Run the re-binding ceremony: shut the book, draw the new binding on, block the word.
   *
   * Raise it at the moment the claim is sent, not when it answers — the beats are what the
   * reader is watching, and a fast server must not be able to finish the sequence early.
   */
  rebinding?: boolean;
  /**
   * Whether something replaces the album when the ceremony ends.
   *
   * True on the real path, where the pack opener takes over — and the closing fade exists
   * for exactly that, so the opener does not cut in at full brightness on the frame after
   * the last one.
   *
   * False when the ceremony is being watched on its own, and then the fade is **skipped
   * rather than played**: with nothing replacing the book, fading it out only to leave it
   * there means fading it straight back in, which reads as a fault rather than as an ending.
   */
  handsOver?: boolean;
  /**
   * The ceremony is over and the book is shut in its new binding.
   *
   * The page's cue to apply the collection the claim answered with, which is why this is
   * separate from the request resolving. The set roughly grows by half on unlock, and
   * applying it here means that happens behind a closed cover — so the book is never seen
   * to gain cards, and the cover's own tally never changes in view.
   */
  onRebound?: () => void;
}

const Album: React.FC<AlbumProps> = ({
  sections,
  owner,
  ownerId,
  cover,
  justBound,
  footer,
  onCardOpen,
  focusPlayerId,
  openAtPlayerId,
  turnToPlayerId,
  onTurned,
  holdSlots,
  icons,
  rebinding,
  handsOver = true,
  onRebound,
}) => {
  const isMobile = useIsMobile();
  const pages = useMemo(() => buildPages(sections, owner), [sections, owner]);

  const leafCount = Math.ceil(pages.length / 2);
  /**
   * The furthest the book opens.
   *
   * Not `leafCount`: the last leaf's back is often empty, and turning to it gave
   * a spread with nothing on either side. The last real page is `pages.length-1`,
   * and it is on screen at `flipped = ceil(that / 2)` — as the right-hand page
   * when even, the left-hand one when odd.
   */
  const maxFlipped = Math.max(0, Math.ceil((pages.length - 1) / 2));
  /**
   * Number of leaves currently turned to the left. 0 is the closed book.
   *
   * Restored from the last visit, which is why the stored value is a leaf rather
   * than a page: it is the thing the desktop book is actually in terms of. A
   * first-time visitor has nothing stored and so starts at 0 — closed.
   *
   * **Except on a book you just watched being bound, which always starts shut.** The
   * saved position is keyed per owner and outlives the album it describes — `leegmaken`
   * destroys the book and not the bookmark — so binding a second album under the same
   * name mounted it already open, somewhere in the middle of the *previous* one. The
   * ceremony then handed a shut cover over to a book lying open at page nine, and
   * `justBound`'s whole beat, the cover turning itself, had nothing left to do.
   *
   * Read at mount only, which is all that is needed: the flag is raised in the same
   * handler that swaps this component in, so it is already true on the first render.
   */
  /**
   * The page a card is being put away on, if that is why this book is being mounted.
   * Outranks both the saved position and `justBound`'s shut cover — a card cannot land
   * in a slot on a page that is not there. -1 when there is no such card.
   */
  const openAtPage = openAtPlayerId ? pageOfPlayer(pages, openAtPlayerId) : -1;

  /** Undefined rather than an empty set, so the common render passes nothing at all. */
  const held = useMemo(
    () => (holdSlots && holdSlots.length > 0 ? new Set(holdSlots) : undefined),
    [holdSlots],
  );

  const [flipped, setFlipped] = useState(() =>
    openAtPage >= 0
      ? Math.min(flippedForPage(openAtPage), maxFlipped)
      : justBound
        ? 0
        : readLeaf(ownerId),
  );
  /** The leaf mid-rotation, which must sit above both stacks. */
  const [moving, setMoving] = useState<number | null>(null);

  /** Mobile page index and the direction it arrived from. */
  const [mobilePage, setMobilePage] = useState(() =>
    openAtPage >= 0 ? openAtPage : justBound ? 0 : readLeaf(ownerId) * 2,
  );

  const touchStartX = useRef<number | null>(null);

  /*
   * The album grows when the icons unlock, and could shrink if the pool did, so a
   * restored position can point past the end. Clamp after the pages are known
   * rather than at read time.
   */
  useEffect(() => {
    if (pages.length === 0) return;
    setFlipped((f) => Math.min(f, maxFlipped));
    setMobilePage((p) => Math.min(p, pages.length - 1));
  }, [maxFlipped, pages.length]);

  useEffect(() => {
    writeLeaf(isMobile ? Math.floor(mobilePage / 2) : flipped, ownerId);
  }, [isMobile, flipped, mobilePage, ownerId]);

  /* ---------------------------------------------------------------- *
   * The re-binding ceremony
   * ---------------------------------------------------------------- */

  const [rebindPhase, setRebindPhase] = useState<RebindPhase | null>(null);
  const rebindTimers = useRef<number[]>([]);

  const clearRebindTimers = useCallback(() => {
    rebindTimers.current.forEach(window.clearTimeout);
    rebindTimers.current = [];
  }, []);

  useEffect(() => clearRebindTimers, [clearRebindTimers]);

  /**
   * Jump to the end: shut, bound, handed back.
   *
   * Both the reduced-motion path and the click-to-skip path, because they want the same
   * thing. **The end state, never a mid-point** — a ceremony frozen part-way reads as a
   * hang rather than as a shorter ceremony, which is the rule the pack opener already
   * follows.
   *
   * Guarded on the phase so it cannot fire twice: the skip click and the last timer can
   * both land, and `onRebound` applying a collection twice would be harmless but the
   * second `playCoverTurn` would not.
   */
  const finishRebind = useCallback(() => {
    if (rebindPhase === null || rebindPhase === 'done') return;

    clearRebindTimers();
    /* Straight to the end, skipping the hand-over fade with it: a reader who clicked to cut
       the ceremony short does not then want to watch the book dissolve. */
    setRebindPhase('done');
    onRebound?.();
  }, [rebindPhase, clearRebindTimers, onRebound]);

  useEffect(() => {
    if (!rebinding) {
      /* Nothing to unwind: the phase only ever ends on a finished state, and the classes it
         adds are inert. Clearing it here would un-bind the cover for a frame if the parent
         lowered the flag before the state landed. */
      return;
    }

    /*
     * Shut it first, whatever else happens. `setMoving(0)` is what puts the cover leaf
     * above the stack for its rotation — without it the board turns *behind* the pages it
     * is closing over.
     */
    setFlipped(0);
    setMoving(0);
    setMobilePage(0);

    if (prefersReducedMotion()) {
      setRebindPhase('done');
      playCoverTurn();
      onRebound?.();
      return;
    }

    const at = (delay: number, run: () => void) => {
      rebindTimers.current.push(window.setTimeout(run, delay));
    };

    setRebindPhase('shutting');
    playCoverTurn();

    const shut = ms(SHUT_MS);
    at(shut, () => setRebindPhase('settling'));

    /*
     * The build: the room goes dark, the book goes white, and the rings spin up around it.
     *
     * One sound across the charge *and* the bloom rather than one per beat, because they are
     * one gesture — the thing gathering and then letting go — and two sounds would put a seam
     * exactly where it must not be. `ms()` is applied here and not inside, so the build
     * tracks the multiplier the visual is running at.
     */
    const settled = shut + ms(REBIND_SETTLE_MS);
    at(settled, () => {
      setRebindPhase('charging');
      /* One sound across the rise, the hold *and* the bloom — they are one gesture, and a
         seam anywhere in it would be audible exactly where it must not be. */
      playRebind(ms(CHARGE_MS + HOLD_MS + BLOOM_MS));
    });

    at(settled + ms(CHARGE_MS), () => setRebindPhase('holding'));

    /*
     * The accent, and it is single: the whole page blooms white and the chord lands on the
     * same frame. The book becomes the icon edition here too — inside the bloom, where there
     * is nothing to see it happen against, which is the entire reason the bloom is here
     * rather than a wipe on the cover.
     */
    const bloomed = settled + ms(CHARGE_MS) + ms(HOLD_MS);
    at(bloomed, () => {
      setRebindPhase('blooming');
      playRarePayoff(REBIND_PAYOFF);
    });

    at(bloomed + ms(BLOOM_MS), () => setRebindPhase('resolving'));

    /* The board settling, as the bloom lets go of it. */
    const resolved = bloomed + ms(BLOOM_MS) + ms(RESOLVE_MS);
    at(resolved, () => {
      setRebindPhase('resting');
      playCoverTurn();
    });

    /*
     * A beat of the bound book on an ordinary table, and then the album fades rather than
     * being cut away. Handing straight over from `resting` is what made this land as a
     * snap: the pack opener mounted on the frame after the last one of the ceremony, so
     * the book was replaced at full brightness with no gap at all.
     */
    const rested = resolved + ms(REBIND_REST_MS);

    /* Nothing follows, so nothing fades: end on the bound book rather than dissolving it and
       putting it straight back. See `handsOver`. */
    if (!handsOver) {
      at(rested, () => {
        setRebindPhase('done');
        onRebound?.();
      });

      return clearRebindTimers;
    }

    at(rested, () => setRebindPhase('handing'));
    at(rested + ms(HAND_MS), () => {
      /*
       * Both in the same tick, and React batches them into one render — which is what stops
       * the album flashing back to full opacity for a frame on its way out. On the real path
       * `onRebound` mounts the pack opener, so that render has no album in it at all; on the
       * test panel's path nothing else changes and `done` is what leaves the bound book on
       * the table instead of the invisible one `handing` would have left.
       */
      setRebindPhase('done');
      onRebound?.();
    });

    return clearRebindTimers;
    /* `onRebound` is deliberately not a dependency: the page rebuilds it on most renders,
       and re-running this would restart the ceremony from the top mid-sequence. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rebinding, clearRebindTimers, handsOver]);

  /**
   * The ceremony is running and the book is not the reader's.
   *
   * `resting` and `handing` count as running: the book is still shut, still being handed
   * over, and a click on it should still skip rather than turn a page. Only `done` is out.
   */
  const rebindingNow = rebindPhase !== null && rebindPhase !== 'done';


  /**
   * Whether the cover is the icon edition yet.
   *
   * Two things have to be true of this and they pull in opposite directions. `icons` alone is
   * not enough — it comes off the server's answer, which is parked until the ceremony ends,
   * so during the re-binding it is still false and the book would change only *after* the
   * light that is supposed to hide the change. But "any phase" is too eager: this class also
   * carries the cover's ink, which goes bronze, and bronze type on the leather cover it has
   * not replaced yet is dark on dark.
   *
   * So: from the bloom, when the whole page is white and there is nothing to see the
   * swap against. See `BOUND_PHASES`.
   */
  const showBinding =
    icons === true || (rebindPhase !== null && BOUND_PHASES.has(rebindPhase));

  /*
   * Follow the card viewer: whatever it is showing, the book turns to.
   *
   * Deliberately *not* via `turn()`, which plays `playPageTurn()`. This turn happens
   * behind the viewer's scrim, where a page-turn sound with no page visible to turn
   * is unexplained noise; the reader is browsing cards, not pages.
   */
  useEffect(() => {
    if (!focusPlayerId) return;
    const page = pageOfPlayer(pages, focusPlayerId);
    if (page < 0) return;

    if (isMobile) {
      setMobilePage((current) => (current === page ? current : page));
      return;
    }

    const target = Math.min(flippedForPage(page), maxFlipped);
    setFlipped((current) => {
      if (current === target) return current;
      setMoving(target > current ? current : target);
      return target;
    });
  }, [focusPlayerId, pages, isMobile, maxFlipped]);

  /**
   * Turn straight to a page. The first opening is what uses it — the checklist's
   * rows used to as well, before they went back to being print.
   *
   * **With the page-turn sound**, unlike the `focusPlayerId` effect above: that
   * one turns the book behind the card viewer's scrim, where a turn nobody can see
   * is unexplained noise. Here the reader is looking at the book and asked for a
   * page, so the book should sound like it is turning to it.
   */
  const goToPage = useCallback(
    (page: number) => {
      if (isMobile) {
        setMobilePage((current) => {
          const next = Math.min(Math.max(page, 0), pages.length - 1);
          if (next !== current) playTurnSound(current, next);
          return next;
        });
        return;
      }

      const target = Math.min(flippedForPage(page), maxFlipped);
      setFlipped((current) => {
        if (current === target) return current;
        setMoving(target > current ? current : target);
        playTurnSound(current, target);
        return target;
      });
    },
    [isMobile, maxFlipped, pages.length],
  );

  /* ---------------------------------------------------------------- *
   * Riffling: several leaves, one at a time
   *
   * `goToPage` sets `flipped` to the target in one go, and for its two original callers
   * that was right — the voorwoord is one leaf from a shut book, and the card viewer's
   * turns happen behind a scrim where nothing is seen. **A jump of more than one leaf in
   * view is not a page turn**: every leaf in between changes class on the same frame, so
   * they all rotate at once and `setMoving` can only mark one of them, leaving the others
   * carrying the fore-edge hairline it exists to suppress. It reads as one turn and then an
   * arrival.
   *
   * So a card being put away on a page several leaves off walks there, a leaf at a time,
   * each one a real turn with its own sound. Quicker per leaf than a single deliberate
   * turn (`RIFFLE_MS` against `SHUT_MS`, published to the CSS as `--leaf-ms`), because
   * three full turns in a row is four seconds of paper.
   *
   * Strictly sequential — one leaf in flight at any moment. Overlapping them would put the
   * book back in the state described above, where `moving` and the pile-splitting maths
   * can only describe a single leaf.
   * ---------------------------------------------------------------- */

  /** `flipped` for the walker, which must read it without being re-created per step. */
  const flippedRef = useRef(flipped);
  flippedRef.current = flipped;

  /**
   * The per-leaf duration in force, published as `--leaf-ms` so the CSS transition and the
   * walk's own timer are the same number.
   */
  const [leafMs, setLeafMs] = useState(SHUT_MS);

  /**
   * Latest `onTurned`, so the walk does not restart every time the page hands down a new
   * callback identity. It is a report, not an input.
   */
  const onTurnedRef = useRef(onTurned);
  onTurnedRef.current = onTurned;

  /*
   * A card is being put away, and this is the book going to meet it — with the sound,
   * because it is a turn the reader is looking straight at.
   *
   * Reports when the book has **arrived**, which is what the placing sequence waits for:
   * how long a move takes is a property of the distance, and a caller guessing it either
   * flies a card at a page still in the air or pays for a turn that never happened. Fires
   * on every path, including the ones with nothing to do, or the sequence stalls.
   */
  useEffect(() => {
    if (!turnToPlayerId) return undefined;

    const arrived = () => onTurnedRef.current?.(turnToPlayerId);
    const page = pageOfPlayer(pages, turnToPlayerId);

    /* No slot in this book — an icoon behind a shut latch. Nothing to turn to. */
    if (page < 0) {
      arrived();
      return undefined;
    }

    if (isMobile) {
      let landed = false;
      setMobilePage((current) => {
        const next = Math.min(Math.max(page, 0), pages.length - 1);
        if (next === current) landed = true;
        else playTurnSound(current, next);
        return next;
      });
      if (landed) {
        arrived();
        return undefined;
      }
      /* One slide, whatever the distance: the pages are not stacked here. */
      const timer = window.setTimeout(arrived, ms(SHUT_MS));
      return () => window.clearTimeout(timer);
    }

    const target = Math.min(flippedForPage(page), maxFlipped);
    const distance = Math.abs(target - flippedRef.current);

    if (distance === 0) {
      arrived();
      return undefined;
    }

    /*
     * One number for the whole walk rather than per step, so the leaves of one riffle all
     * turn at the same rate — and so the duration is committed before the first leaf moves
     * rather than in the same breath as it.
     */
    const stepMs = distance > 1 ? RIFFLE_MS : SHUT_MS;
    setLeafMs(stepMs);

    let timer: number | undefined;

    const step = () => {
      const from = flippedRef.current;
      if (from === target) {
        arrived();
        return;
      }

      const to = from + (target > from ? 1 : -1);
      /*
       * One commit. These run from a timeout and `index.tsx` mounts with legacy
       * `ReactDOM.render`, which does not batch those — unbatched, the leaf's class change
       * can commit a frame before it is marked as moving, which is a frame of a page in
       * flight carrying a pile's worth of edge.
       */
      unstable_batchedUpdates(() => {
        setMoving(Math.min(from, to));
        setFlipped(to);
      });
      playTurnSound(from, to);

      timer = window.setTimeout(step, ms(stepMs));
    };

    step();

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
    /*
     * `onTurned` is deliberately absent — it is read through a ref. Everything else here
     * either identifies the destination or bounds it.
     */
  }, [turnToPlayerId, pages, isMobile, maxFlipped]);

  /* ---------------------------------------------------------------- *
   * The first opening
   *
   * A book that was just bound opens itself on the voorwoord. See `justBound` for why the
   * invitation line it replaces went.
   * ---------------------------------------------------------------- */

  /**
   * Whether the cover has already been turned by this, so it happens once.
   *
   * A ref rather than state: nothing drawn depends on it, and a re-render here would be one
   * in the middle of the cover's own transition. It has to outlive the effect because
   * `goToPage` changes identity whenever the pages do — without it, a collection landing a
   * tick later would re-run this and turn a book that is already open.
   */
  const opened = useRef(false);

  useEffect(() => {
    if (!justBound || opened.current) return;

    /*
     * Found rather than assumed to be page 2. It is page 2 today, but `buildPages` is allowed
     * to pad and the page it pads with is a blank `slots` one, so a hard-coded index is one
     * composition change away from opening the book on nothing.
     */
    const page = pages.findIndex((p) => p.kind === 'foreword');
    if (page < 0) return;

    opened.current = true;

    /* Land on it, never play it stilled — the rule every sequence on this page follows. */
    if (prefersReducedMotion()) {
      goToPage(page);
      return;
    }

    /*
     * A beat of the shut book on the table before the cover moves — the same pause a press
     * has before it, and what keeps this a gesture of its own rather than the binding
     * ceremony running straight on into a page turn.
     */
    let turned = false;
    const timer = window.setTimeout(() => {
      turned = true;
      goToPage(page);
    }, ms(JUST_BOUND_OPEN_MS));

    /*
     * Unlatched again only if the turn never happened, which is what makes the latch safe to
     * set before the wait: a re-run inside the beat starts it over rather than dropping it,
     * and one after the turn finds the book already opened and leaves it alone.
     */
    return () => {
      window.clearTimeout(timer);
      if (!turned) opened.current = false;
    };
  }, [justBound, pages, goToPage]);

  const turn = useCallback(
    (delta: number) => {
      /*
       * A hand on the paper is always a full turn, whatever the last riffle left behind.
       *
       * `leafMs` is state and outlives the walk that set it, so without this every page the
       * reader turned after a pack had been put away would keep the riffle's shorter clock —
       * for the rest of the session. Reset *here* rather than at the end of the walk: the
       * stack's own settle timer is keyed on `leafMs`, and re-arming it the moment the last
       * leaf lands would leave the pile edges a beat behind the paper.
       */
      setLeafMs(SHUT_MS);

      if (isMobile) {
        setMobilePage((current) => {
          const next = Math.min(Math.max(current + delta, 0), pages.length - 1);
          if (next !== current) playTurnSound(current, next);
          return next;
        });
        return;
      }

      setFlipped((current) => {
        const next = Math.min(Math.max(current + delta, 0), maxFlipped);
        if (next === current) return current;
        // The leaf that moves is the one being turned, in either direction.
        setMoving(delta > 0 ? current : next);
        playTurnSound(current, next);
        return next;
      });
    },
    [isMobile, maxFlipped, pages.length],
  );

  /*
   * Left and right turn the page — the keyboard equivalent of the turn strips,
   * clamped at both ends exactly as they are.
   *
   * On the window rather than on the book, and for the same reason the card viewer
   * does it: the strips are the only focusable thing on the book, they go dead at
   * either end, and nothing hands the book focus when the page loads — so a
   * listener on the element would only respond after a click somewhere on it.
   *
   * The two listeners must not both be live, or an arrow turns a page *and* steps
   * the viewer. A `focusPlayerId` means a card is open, which is when the viewer's
   * arrows own the book, so the album's stand down for as long as one is showing.
   */
  useEffect(() => {
    if (focusPlayerId) return;
    /* The book is being re-bound and is not the reader's to turn until it is handed back. */
    if (rebindingNow) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      /* Browser and OS shortcuts (back, word-wise motion, selection) stay theirs. */
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

      /* The name type-ahead needs its own arrows — and a caret needs to move. */
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (target?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return;
      }

      event.preventDefault();
      turn(event.key === 'ArrowLeft' ? -1 : 1);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    /* `rebindingNow` has to be here, not just read in the body: the listener is torn down
       and rebuilt when it changes, which is what gives the reader their arrows back the
       moment the book is handed over. */
  }, [focusPlayerId, turn, rebindingNow]);

  /**
   * Unflipped leaves stack lowest-index-on-top so leaf `flipped` shows on the
   * right; flipped leaves stack highest-index-on-top so leaf `flipped - 1` shows
   * on the left. The leaf in motion outranks both.
   */
  const leafZ = (index: number): number => {
    if (moving === index) return leafCount + 2;
    return index < flipped ? index + 1 : leafCount - index;
  };

  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 45) turn(dx < 0 ? 1 : -1);
  };

  const atStart = isMobile ? mobilePage === 0 : flipped === 0;
  const atEnd = isMobile ? mobilePage >= pages.length - 1 : flipped >= maxFlipped;

  /** Content pages, excluding the cover at index 0. */
  const sheetCount = Math.max(pages.length - 1, 0);

  /**
   * At `flipped === 0` the book is shut and there is no page to name. Otherwise
   * the spread shows pages 2f-1 and 2f, and the last one can be a single page.
   */
  const spreadLabel = (): string => {
    if (flipped === 0) return '';
    const low = flipped * 2 - 1;
    const high = Math.min(flipped * 2, sheetCount);
    return low === high
      ? `pagina ${low} / ${sheetCount}`
      : `pagina ${low}–${high} / ${sheetCount}`;
  };

  /** Shut, showing only the front cover. Where a first visit starts. */
  const closed = isMobile ? mobilePage === 0 : flipped === 0;

  /* ---------------------------------------------------------------- *
   * The fore-edge: how thick the block is on each side
   *
   * Two numbers, handed to the CSS as `--edge-l` / `--edge-r` on the book, which draws
   * them as a shaded hairline at each page's own trim (`.album__page::after`).
   *
   * **It is at the trim and not in the board overhang, and that is the whole history of
   * this feature.** It lived in the overhang three times — as elements outside the book
   * box, the same elements at a staggered depth, then a band on the boards' faces — and
   * every one of those was putting page edges on a strip that is *board*. A pastedown is
   * page-sized like every other sheet, so beyond the trim there is nothing but leather,
   * and every version read as one more pale page lying under the one you were on. What
   * the top page can honestly show is its own edge, so that is where the drawing went.
   * ---------------------------------------------------------------- */

  /**
   * `EDGE_MIN` is the thinnest a stack that *exists* may be; `+ EDGE_RANGE` is the widest
   * it ever gets, so 6px at most.
   *
   * The old cap was 7px because the stack had to fit inside `--board-out`. That
   * constraint went with the overhang; what bounds it now is `--page-pad-x` (22px of
   * margin with nothing printed in it) and the fact that an edge reads as an edge only
   * while it is narrow. Six is comfortably inside both.
   */
  const EDGE_MIN = 2;
  const EDGE_RANGE = 4;

  /**
   * The leaf count the stack is drawn from, one page turn behind `flipped`.
   *
   * A pile gains its leaf when the leaf *lands*, and CSS cannot say that here: the
   * obvious `transition: width 0s linear <flip>` never fires, because a width that
   * changes only because a `var()` it references changed does not reliably start a
   * transition. Holding the state back instead is exact and depends on nothing.
   *
   * `leafMs` is the leaf's own transition — `SHUT_MS`, or `RIFFLE_MS` while the book is
   * walking several of them — and `ms()` scales it by the same `--anim` knob the CSS
   * multiplies by, so the two cannot drift. It has to be *that* rather than a literal
   * `SHUT_MS`, or a riffle's stack would settle two leaves behind the paper.
   *
   * Rapid clicks restart the timer, so the stack settles once after the last turn rather
   * than stepping through the ones it missed — which is what a handful of pages dropped in
   * quick succession does anyway, and which is also what makes a riffle land in one piece.
   */
  const [settledFlipped, setSettledFlipped] = useState(flipped);

  useEffect(() => {
    /* No flip to wait for, so no wait — or the stack freezes a turn behind. */
    if (prefersReducedMotion()) {
      setSettledFlipped(flipped);
      return undefined;
    }

    const timer = window.setTimeout(() => setSettledFlipped(flipped), ms(leafMs));
    return () => window.clearTimeout(timer);
  }, [flipped, leafMs]);

  /*
   * **Counted over the paper leaves only — the two boards are not pages.** Leaf 0 is the
   * front board and the last leaf is the back board, so the text block is
   * `leafCount - 2`, and the first turn that puts paper on the left is the second one.
   * Counting the boards is what once drew page edges on the left of the very first
   * spread, where nothing made of paper had moved.
   */
  const paperLeaves = Math.max(leafCount - 2, 0);

  /*
   * **A leaf leaves its pile at once and joins the other on landing.** Three beats: the
   * pile it is lifted off loses it immediately, the page travels, the pile it lands on
   * gains it. So the two sides are read at different moments — `flipped` is where the
   * book is going, `settledFlipped` where the last page actually came down.
   *
   * `min` on the left and `max` on the right is the whole of that, in both directions
   * and with no test for which way we are turning. Going forward `flipped` runs ahead,
   * so `min` holds the left until the page lands while `max` drops the right at once;
   * going back `settledFlipped` is the higher one and the two roles swap by themselves.
   *
   * **Mid-flight the two sum to one less than `paperLeaves`, and that is correct** — the
   * leaf in the air is on neither pile. Making them add up puts the beats back in
   * lockstep, which is the thing this exists to avoid.
   */
  const liveLeft = Math.min(Math.max(flipped - 1, 0), paperLeaves);
  const settledLeft = Math.min(Math.max(settledFlipped - 1, 0), paperLeaves);
  const leftLeaves = Math.min(liveLeft, settledLeft);
  const rightLeaves = paperLeaves - Math.max(liveLeft, settledLeft);

  /**
   * **No leaves, no stack.** A side holding nothing but a board gets zero, not
   * `EDGE_MIN`: there are no page edges to show, and zero is a real state at both ends
   * of the book's travel rather than a degenerate one.
   */
  const stackWidth = (leaves: number): number =>
    leaves === 0 || paperLeaves === 0 ? 0 : EDGE_MIN + EDGE_RANGE * (leaves / paperLeaves);

  /**
   * Does this sheet carry a head band on either of its faces?
   *
   * Either, because a sheet has one cut edge and the band bleeds to it from both sides:
   * a leaf with a slots page on one face and the voorwoord on the other still shows
   * colour at the trim.
   */
  const leafBanded = (leaf: number): boolean =>
    pages[leaf * 2]?.range !== undefined || pages[leaf * 2 + 1]?.range !== undefined;

  /**
   * A pile, as two fractions of itself: how much of it is white before the band starts,
   * and how much of it then carries the band. The fore-edge draws colour over the second
   * one, offset by the first — see the note on the pile's head bands in album.css.
   *
   * **Fractions rather than a per-sheet drawing, and they are enough**, because the
   * banded pages are one contiguous run in the middle of the book: boards, endpaper and
   * voorwoord in front of them, padding and the checklist behind. So a pile is at most
   * `white | banded | white` from its near end, and two numbers describe it exactly.
   *
   * The leading white run is what makes the ends of the book read right. Turn to the last
   * spread and the sheets under the right-hand leaf are the padding sheet, the checklist
   * and the board: `white` is 1, `cover` is 0, and the strip carries no colour at all
   * rather than a proportion of it.
   *
   * `leaves` runs NEAR to FAR, which is why the caller builds it rather than passing a
   * range: the two piles count in opposite directions.
   *
   * Anything banded beyond the first banded run is ignored, which cannot happen while the
   * book is one ascending section — and if it ever does, an approximate stack drawing is
   * the right thing to lose.
   */
  const pileBands = (leaves: number[]): { white: number; cover: number } => {
    if (leaves.length === 0) return { white: 0, cover: 0 };

    let white = 0;
    while (white < leaves.length && !leafBanded(leaves[white])) white += 1;

    let banded = 0;
    while (white + banded < leaves.length && leafBanded(leaves[white + banded])) banded += 1;

    return { white: white / leaves.length, cover: banded / leaves.length };
  };

  /*
   * Both piles, near sheet first — and **the leaf on screen is left out of its own**.
   *
   * The strip is a drawing of the sheets you can see the edges of, which are the ones
   * UNDER the top one: of the top sheet you see the face, and its edge is where that face
   * stops. Counting it was wrong twice over. On the first slots spread the left pile is a
   * single sheet — the leaf carrying the voorwoord and the first slots page — so the strip
   * reported that leaf's own band back to it, with nothing but boards underneath. And on
   * the checklist spread it made the top sheet's whiteness worth a fraction of the strip
   * when the page it belongs to is the whole of what the reader is looking at.
   *
   * The widths above still count it, and that is not an inconsistency: a pile of one sheet
   * has a thickness, and it is the colour, not the thickness, that describes what is under
   * the top leaf.
   *
   * The left pile is the paper leaves already turned, so its top is the highest-numbered
   * one and it counts DOWN toward leaf 1 — leaf 0 being the board. The right pile is the
   * last `rightLeaves` paper leaves and counts up, ending one short of `leafCount` for the
   * same reason. Both start one sheet in.
   */
  const leftPile = pileBands(
    Array.from({ length: Math.max(leftLeaves - 1, 0) }, (_, i) => leftLeaves - 1 - i),
  );
  const rightPile = pileBands(
    Array.from({ length: Math.max(rightLeaves - 1, 0) }, (_, i) => leafCount - rightLeaves + i),
  );

  const edgeStyle = {
    '--edge-l': `${stackWidth(leftLeaves)}px`,
    '--edge-r': `${stackWidth(rightLeaves)}px`,
    '--band-l': `${leftPile.cover}`,
    '--band-r': `${rightPile.cover}`,
    '--white-l': `${leftPile.white}`,
    '--white-r': `${rightPile.white}`,
  } as React.CSSProperties;

  /*
   * The line above the book, and the only chrome the album has. It says where you are and
   * nothing else — `gesloten` for the shut book, `pagina …` for a spread.
   *
   * **There used to be an invitation in front of both**, shown while a just-bound book had
   * never been opened, on the argument that the album has no arrows and nothing drawn on its
   * turn strips so the line is the only place discoverability can live. That argument was
   * answered by doing rather than saying: the book now opens itself on the voorwoord the
   * first time, which performs the cover turn instead of describing it. See `justBound`.
   */
  const pageLabel = isMobile
    ? mobilePage === 0
      ? 'gesloten'
      : `pagina ${mobilePage} / ${sheetCount}`
    : spreadLabel();

  /*
   * Blank for the length of the ceremony: a book that shuts itself and changes colour with
   * the label still reading "gesloten" reads as a fault. It keeps its box either way, so
   * nothing shifts when it changes.
   */
  const label = rebindingNow ? '' : pageLabel;

  return (
    <>
      {/*
        The room going dark around the book.

        **Outside `.album`, and it has to be.** `.album` carries `perspective`, which makes it
        a containing block for `position: fixed` descendants — a vignette rendered inside it
        would be pinned to the book rather than to the window, and then clipped by the stage's
        `overflow: hidden` on top of that. Out here its only ancestors are ordinary flow.

        Kept mounted for the whole ceremony rather than swapped in and out, so the fade has
        something to transition from; `--dark` on the phase classes is what moves.
      */}
      {rebindingNow ? (
        <>
          <div className={`rebind-dim rebind-dim--${rebindPhase}`} aria-hidden="true" />
          {/*
            The climax: the whole page blooms white, not just the book.

            Out here with the dim and fixed for the same two reasons — `.album` carries
            `perspective`, which would make it the containing block and pin a full-screen
            layer to the book, and the stage's `overflow: hidden` would clip whatever was
            left. It has to cover the window, because the point is that everything goes.

            It also does the work: the binding swaps underneath this, so the change happens
            in the one frame where there is nothing to see it against.
          */}
          <div className={`rebind-bloom rebind-bloom--${rebindPhase}`} aria-hidden="true" />
        </>
      ) : null}

      <div className="album__nav-label">{label}</div>

      <div className={`album-row${rebindingNow ? ' album-row--rebinding' : ''}`}>
        <div
          className={[
            'album',
            isMobile ? 'album--mobile' : '',
            closed && !isMobile ? 'album--closed' : '',
            /*
              `showBinding`, not `icons`: the class carries the cover's ink as well as the
              settled clip, and the ink has to be right for the whole ceremony — the wipe
              is putting ivory under type that was coloured for leather. The phase rules
              out-specify the settled clip on purpose; see album.css.
            */
            showBinding ? 'album--icons' : '',
            /*
              Two separate classes doing two separate jobs, and splitting them is what let
              the CSS drop a growing chain of `:not()`s.

              `album--rebind` means **running** — it is what makes the book inert and the
              cursor a pointer, so it comes off at `done`. The phase class is just which
              beat, and stays on afterwards because `done` is a real state the cover is
              drawn from.
            */
            rebindingNow ? 'album--rebind' : '',
            rebindPhase ? `album--rebind-${rebindPhase}` : '',
          ]
            .filter(Boolean)
            .join(' ')}
          /*
            The binding, the cover face and the board edge all read their colours from
            here, so the outside of the book agrees with itself. The pages inside do
            not — paper is paper in every stain.
          */
          /*
            Plus the leaf's own clock, which is `SHUT_MS` for a single turn and shorter
            while the book is riffling several. `.album__leaf` reads it; the walk times
            itself against the same state, so the paper and the timer cannot disagree.
          */
          style={{ ...albumLeather(cover), '--leaf-ms': `${leafMs}ms` } as React.CSSProperties}
          onTouchStart={isMobile ? onTouchStart : undefined}
          onTouchEnd={isMobile ? onTouchEnd : undefined}
          /*
            Clicking the cover opens it, which is what one does to a book — except during
            the re-binding, where the click skips to the end instead. Same contract as the
            pack opener: a ceremony must always be escapable, and the way out lands on the
            finished state rather than stopping where it was.
          */
          onClick={
            rebindingNow ? finishRebind : closed ? () => turn(1) : undefined
          }
        >
        {/*
          `edgeStyle` rides on the book, not on the pages that use it: every page face
          draws its own trim hairline, and a custom property here is the one place all of
          them can read the two widths from.
        */}
        <div className="album__book" style={edgeStyle}>
          {!isMobile ? (
            <>
              <div className="album__binding" />
              <div className="album__backing album__backing--left" />
              <div className="album__backing album__backing--right" />

              {/*
                The inside of the spine — the hollow the two halves bend down into.
                Last of the three, because it is the only one drawn *over* the pages:
                there is no gap at the gutter to put it in, so it lands on the 22px
                inner margin where nothing is printed. See album.css for why widening
                the book to open a real gap is not on the table.
              */}
              <i className="album__spine" aria-hidden="true" />

              {/*
                The caps: the head and tail of the spine, sitting in the board overhang.

                Everything that is a hard edge lives here rather than on `.album__spine`
                — the hinge grooves, the hollow, the headband. The overhang is the only
                place an open book lets you see past the paper into the case, so it is
                the only place that hardware can be drawn without it becoming a line
                ruled across a page.
              */}
              <i className="album__spinecap album__spinecap--head" aria-hidden="true">
                <i className="album__headband album__headband--head" />
              </i>
              <i className="album__spinecap album__spinecap--tail" aria-hidden="true">
                <i className="album__headband album__headband--tail" />
              </i>
            </>
          ) : null}

          {isMobile
            ? pages.map((page, index) => {
                const state =
                  index === mobilePage
                    ? 'album__slide--current'
                    : index < mobilePage
                      ? 'album__slide--out-left'
                      : 'album__slide--out-right';
                return (
                  <div key={index} className={`album__slide ${state}`}>
                    <PageFace
                      page={page}
                      index={index}
                      visible={index === mobilePage}
                      onCardOpen={onCardOpen}
                      binding={showBinding}
                      held={held}
                    />
                  </div>
                );
              })
            : Array.from({ length: leafCount }, (_, leaf) => (
                <div
                  key={leaf}
                  className={[
                    'album__leaf',
                    leaf < flipped ? 'album__leaf--flipped' : '',
                    /*
                      The two boards, which are bigger leaves than the pages: leaf 0
                      carries the cover and its pastedown, the last one carries the back
                      board. Both take the overhang that used to be drawn on the binding
                      — see `.album__leaf--cover` in album.css for why it has to belong
                      to the thing that rotates.
                    */
                    leaf === 0 ? 'album__leaf--cover' : '',
                    leaf === leafCount - 1 ? 'album__leaf--back' : '',
                    /*
                      In the air, and therefore not on either pile.

                      Only this suppresses the trim hairline (see album.css): the fore-edge
                      is drawn by every page face, so without it the leaf mid-rotation
                      carries a pile's worth of edge across the gutter with it — the stack
                      arriving on the flipped page before the page has landed. A sheet in
                      flight has one sheet's thickness, which is nothing.

                      Gated on motion being on. `moving` is cleared by the leaf's own
                      `transitionend`, which never fires when the leaf has no transition —
                      so under reduced motion the class would latch on for good and that
                      leaf's pages would lose their edge permanently.
                    */
                    moving === leaf && !prefersReducedMotion()
                      ? 'album__leaf--moving'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ zIndex: leafZ(leaf) }}
                  onTransitionEnd={() => setMoving((m) => (m === leaf ? null : m))}
                >
                  {/* The spread is page 2f-1 on the left and 2f on the right, so the
                      two faces on screen are leaf f's front and leaf f-1's back. */}
                  <div className="album__face album__face--front">
                    <PageFace
                      page={pages[leaf * 2]}
                      index={leaf * 2}
                      visible={leaf === flipped}
                      onCardOpen={onCardOpen}
                      binding={showBinding}
                      held={held}
                    />
                  </div>
                  <div className="album__face album__face--back">
                    <PageFace
                      page={pages[leaf * 2 + 1]}
                      index={leaf * 2 + 1}
                      visible={leaf === flipped - 1}
                      onCardOpen={onCardOpen}
                      held={held}
                    />
                  </div>
                </div>
              ))}
          </div>

          {/*
            The page turn lives on the book itself: a strip down the outer edge of
            each open page, which is where a hand goes to turn one. Clicking the
            cover already opened the album, so the same gesture now carries the
            whole navigation instead of two buttons parked beside the furniture.

            No arrow drawn on it, deliberately — the edge lights under the cursor
            and that is the whole affordance. A glyph printed on the paper is a
            control the book does not have.

            A sibling of `.album__book` rather than a child of it: `.album__book`
            is `preserve-3d`, so anything inside it becomes part of the 3D scene
            and gets sorted by depth against the turning leaves. Out here it is a
            flat overlay pinned to the book's edges via `--book-w`.

            Not rendered while shut, where the whole cover is the target and an
            arrow floating over it would only compete with that.
          */}
          {!closed ? (
            <>
              <button
                type="button"
                className="album__turn album__turn--prev"
                onClick={() => turn(-1)}
                disabled={atStart}
                aria-label="Vorige pagina"
              />
              <button
                type="button"
                className="album__turn album__turn--next"
                onClick={() => turn(1)}
                disabled={atEnd}
                aria-label="Volgende pagina"
              />
            </>
          ) : null}

          {/*
            The book going white, and the gold flying around it.

            Siblings of `.album__book` for exactly the reason the turn strips above are: the
            book is `preserve-3d`, so anything inside it joins the 3D scene and gets depth
            sorted against the turning leaves — the flare would end up *between* the pages.
            Out here they are overlays pinned to the book's own box via `--book-w`.

            The rings genuinely are orbits rather than circles drawn on top of each other:
            `.album` already carries `perspective`, so tilting one out of the page
            foreshortens it, and each ring's beads pass behind the book as well as in front.
          */}
          {rebindingNow ? (
            <>
              <div className="album__rings" aria-hidden="true">
                {REBIND_RINGS.map((ring, r) => (
                  <div
                    key={r}
                    className={`album__ring${ring.reverse ? ' album__ring--reverse' : ''}`}
                    style={
                      {
                        '--tilt': `${ring.tilt}deg`,
                        '--yaw': `${ring.yaw}deg`,
                        '--radius': ring.radius,
                        '--spin': `${ring.spin}s`,
                        '--ring-in': `${ring.in}s`,
                      } as React.CSSProperties
                    }
                  >
                    {Array.from({ length: ring.beads }, (_, b) => (
                      <span
                        key={b}
                        className="album__bead"
                        style={
                          {
                            '--bead-at': `${(360 / ring.beads) * b}deg`,
                            '--bead-size': `${ring.size}px`,
                          } as React.CSSProperties
                        }
                      />
                    ))}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {footer}
    </>
  );
};

export default Album;
