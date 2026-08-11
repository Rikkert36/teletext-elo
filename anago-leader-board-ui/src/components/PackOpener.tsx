import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import {
  Pack,
  RevealedCard,
  avatarUrl,
  ceremonyBuildRatio,
  ceremonyLevelFor,
  ceremonyMaxBuildRatio,
  ceremonyShimmerRatio,
  silhouetteUrl,
} from '../mock/cardMock';
import PlayerCard, { CardBack } from './PlayerCard';
import PackFace from './PackFace';
import { packFoil } from '../utils/packFoil';
import {
  playFlip,
  playNameReveal,
  playRarePayoff,
  playRareRise,
  playShimmerSweep,
  playSlot,
  playTear,
} from '../utils/sounds';
import { getCeremonyMs, ms } from '../utils/animationSpeed';
import '../styles/packopen.css';

/*
 * Base timings, at a pacing multiplier of 1. Multiply by DEFAULT_SCALE (2) for
 * real figures.
 *
 * A duplicate costs a flat 180 + 320 + 340 = 840ms, so a 3-card pack of
 * duplicates lands at 420 + 3×840 = 2.94s. A rare pull adds its held build on
 * top of whichever it is.
 *
 * A new card costs the flip plus the silhouette beat, which is
 * `REVEAL_LEAD_MS + REVEAL_MS + READABLE_MS` — see `holdFor`. **One number for
 * every new card**, whatever their name: it was briefly name-dependent, back
 * when the name arrived a word at a time, and that made the pacing of a pack
 * vary with whose card came out of it.
 *
 * So 320 + 140 + 820 + 340 = 1620 base, about **3.2s real** at the settled ×2,
 * against a duplicate's 1.68s. Past the "under two seconds" target the design
 * started with, and a deliberate trade for a reveal worth watching:
 * click-to-skip keeps it tolerable at roughly a thousand openings a year, and
 * the trade unwinds on its own as the album fills and fewer cards are new.
 *
 * For the record, because it is the reason the trade was worth arguing about at
 * all: the shard family that lost ran 2340 base — **4.7s** per new card and
 * ~24s for a five-new-card pack.
 *
 * These are passed through `ms()` at animation time, not at module load, so the
 * multiplier can be changed live and stays in lockstep with the CSS durations —
 * see utils/animationSpeed.ts.
 */
const TEAR_MS = 420;
/**
 * Face-down beat before a normal flip. Matches the 180ms entrance animation, so
 * the card finishes arriving before it starts turning rather than doing both at
 * once.
 */
const FLIP_LEAD_MS = 180;
/** Must match the `.opener__flip` transition in packopen.css. */
const FLIP_MS = 320;
/**
 * Gap between the outgoing card leaving for the row and the next one arriving.
 *
 * Without it both occupy the centre at once — the outgoing card's slot flies from
 * exactly where the incoming card mounts — and a face-up player appears to turn
 * back into a card back.
 */
const HANDOFF_MS = 200;
/**
 * How long the card sits *fully revealed* before the next one comes up.
 *
 * Deliberately counted from the end of the flip, not the start. The previous
 * single "dwell" constant was measured from the moment the turn began, so the
 * flip consumed all but ~40ms of it and the card was gone almost the instant you
 * could read it.
 */
const HOLD_MS = 340;
/**
 * The held beat *before* a rare card turns over. This is where rarity is
 * expressed — in the anticipation, not in how long the revealed card lingers.
 */
/**
 * A rare card arrives looking like any other, holds for this long, and only then
 * starts to glow — so the suspense comes from something *beginning to happen*
 * rather than from the card announcing itself on arrival.
 */
const CEREMONY_LEAD_MS = 320;
/** How long the revealed card takes to travel down into the row. */
const SETTLE_MS = 460;

/* ------------------------------------------------------------------ *
 * The silhouette beat
 *
 * A new card turns over into its tier metal and its overall, with the player
 * still their own outline. The silhouette is allowed to register, and then light
 * bursts from the centre of the card, opening the name and the face outwards
 * behind it — and settling at the border as the green "new" rim.
 *
 * **One event.** This went through a long detour: the name arriving a character
 * at a time, then a word at a time, each word struck on with its own blow and
 * cooling from white-hot afterwards. All of it came out, for two reasons worth
 * keeping written down.
 *
 * A name is a *single fact*, and splitting it spends its beats on grammar — one
 * of "Jasper / van / Buul"'s three dramatic moments was the word "van". And each
 * fragment was far too small to carry a sound heavy enough to matter, so the
 * sound was permanently louder than the thing it was happening to. That mismatch
 * is what read as silly, and no amount of tuning the blow fixed it, because the
 * problem was never the blow.
 *
 * Everything below is measured **from the flip landing**, not from the turn —
 * the same convention `HOLD_MS` uses, and for the same reason.
 *
 *   0                       the card lands: metal, overall, silhouette
 *   SILHOUETTE_LEAD_MS      the flash goes off; the clang; the card opens
 *   + REVEAL_MS             the light reaches the border and becomes the rim
 *   + READABLE_MS           fully readable, then the card goes to the row
 * ------------------------------------------------------------------ */

/*
 * **D · gloeien**, and the three numbers it runs on. Ten candidates were
 * compared live from the test panel over four rounds — an expanding circle, a
 * photographic develop, a teletekst line paint, a long wait resolved by one cut,
 * a family that broke the card into shards, and silhouette-first twins of both
 * mechanics — and this is what is left. `utils/revealStyle.ts`, `cardPieces.ts`
 * and `styles/reveal.css` were deleted with the rest of them.
 *
 * What D is: the silhouette is the actor rather than the obstacle. It lights
 * from within — tier ink to green to white-hot — holds at the top with nothing
 * else moving, and then the light **drains** and a face is left behind it. The
 * only candidate that resolved by subtraction, and the reason it won: every
 * other one answered "when does the face arrive", and this one answers "where
 * did the light go".
 *
 * What the rounds established, all of which the rules in card.css still depend
 * on:
 *
 * - **Something must accumulate.** An even gesture has no payoff in it, which
 *   was what was wrong with the circle. Build slow, land fast.
 * - **The card recoils**, under 200ms and never more than 3%, on `.card` so the
 *   rim's `box-shadow` pops with it. The single largest improvement of round one
 *   and independent of which candidate won.
 * - **The accent is single.** `REVEAL_RIM_AT` is the frame the beat discharges
 *   on, and the rim, the chime and the last visual change all land there
 *   together.
 * - **The eyes are the payoff.** Nothing may make the face nameable before the
 *   discharge.
 * - Nothing here is level-aware; the gold build runs entirely before the flip.
 */

/** The silhouette alone, before anything starts happening to it. */
const REVEAL_LEAD_MS = 140;
/**
 * The whole reveal motion. Published to CSS as `--reveal-ms`, which every rule
 * in the beat phrases itself in fractions of, so the two cannot drift.
 */
export const REVEAL_MS = 820;
/**
 * Where in the motion it discharges, as a fraction. The green rim lights here
 * and the chime is delayed to it.
 *
 * **Not a taste figure** — it is the frame the beat lands on, and for D that is
 * the drain rather than the peak: the rim is the residue of the light leaving.
 * The same argument that moved it off the end of the old burst.
 */
export const REVEAL_RIM_AT = 0.62;

/**
 * How long the finished card is simply left alone, once the flash has burned out.
 *
 * Deliberately `HOLD_MS` — exactly what a duplicate gets. The new card's extra
 * time is spent on the reveal, not on lingering afterwards, which is the same
 * argument that keeps rarity in the anticipation rather than in the dwell.
 */
const READABLE_MS = HOLD_MS;

/**
 * How long a card stays up once revealed, measured from the end of the flip.
 *
 * A duplicate is unchanged and unchanging: `HOLD_MS`, nothing else. It skips the
 * beat entirely, which is what makes the beat mean "new".
 *
 * **Constant again.** It was briefly name-dependent, because the name arrived a
 * word at a time and a long name therefore took longer — which meant the pacing
 * of a pack varied with whose card came out of it. One flash is one duration for
 * everybody.
 *
 * The three terms are the whole of a new card's beat: the silhouette alone, the
 * motion, and the settled card left to be read.
 */
const holdFor = (card: RevealedCard): number =>
  card.isNew ? REVEAL_LEAD_MS + REVEAL_MS + READABLE_MS : HOLD_MS;

/**
 * Whether the ceremony hands its darkened room over to the reveal instead of
 * giving it back at the turn.
 *
 * **Every rare new card, whatever the candidate.** The room belongs to the
 * ceremony, not to the reveal: the question is only whether the build's surround
 * recedes when the card turns, and on a card that still has a reveal to play it
 * should not. What the reveal does inside that room — a charge, a break, a green
 * stage light of its own — is a separate matter.
 *
 * What it fixes, at its worst on a candidate that lights the stage as well: the
 * gold vignette faded over 620ms from the end of the flip while the green one
 * climbed from *nothing* over the whole reveal, so the room recovered to about
 * four fifths of full brightness roughly a second after the turn and then
 * darkened all over again. Two builds with a hole between them — and the hole
 * landed on the card at its emptiest and on the opening shards, which are the
 * slowest and most deliberate of the run.
 *
 * On this path there is only ever **one vignette**. A candidate that brings its
 * own does not mount it (see the render); what crosses at the turn is the
 * *light* — gold bloom out, green bloom in — over a surround that never moves.
 *
 * The other combinations keep exactly what they had: a common new card has no
 * gold room to inherit, and a duplicate has no reveal to hand it to.
 */
const handsOver = (card: RevealedCard, level: number): boolean => card.isNew && level > 0;

/**
 * How much shallower the carried vignette is than the ceremony's own.
 *
 * `.opener__dim--carry` swaps in `stage-dim`'s gradient — 0.58 at the edge
 * against the build's 0.88 — because the two are dimming for opposite reasons.
 * The build's room surrounds a card that is face down and has nothing to show;
 * the reveal's surrounds the card you are reading, and at the build's depth it
 * stops being a room and becomes a black field with a circle cut in it. That is
 * exactly what the first version of the hand-over produced, by carrying the
 * build's gradient to full: a depth nothing had ever held for more than the
 * instant of the turn, now held for seconds on every card from 75 up.
 *
 * So the ceiling drops and **continuity is kept by the start value instead**.
 * Multiplying the frozen fraction by this ratio gives the opacity at which the
 * shallower gradient is the same darkness the deeper one had reached, so the
 * surround does not change across the turn. Above level 2 it clamps at 1, which
 * simply means the build had already gone past the reveal's ceiling and the
 * carry holds there rather than climbing.
 *
 * **Both numbers live in packopen.css and this is the only copy.** Lower the
 * alphas there and this has to be re-derived, or the room will step at the turn.
 */
const DIM_CARRY_MATCH = 0.88 / 0.58;

const PARTICLE_COUNT = 24;

/**
 * Motes drawn inward during the build. Still sparse on screen — the outward burst is
 * a single payoff frame, this runs for seconds under a card you are meant to be
 * watching.
 *
 * Higher than it looks, because only `MOTE_FLIGHT` of a mote's cycle is spent flying:
 * about 7 of these 24 are visible at any moment. The count has to rise whenever the
 * flight fraction falls, or making the motes faster just thins the stream out.
 */
const MOTE_COUNT = 24;

/**
 * Fraction of its cycle a mote spends flying; the rest it sits landed and invisible.
 *
 * **Mirrored in `opener-mote-in` in packopen.css**, which does the actual work — the
 * travel keyframes finish at this percentage and the opacity stops are scaled to it.
 * The two must move together, and `MOTE_DRAIN_MS` derives from this as well.
 *
 * This is the lever that makes flight speed and cycle length independent. Velocity is
 * distance over *flight time*, so lowering this speeds the motes up while leaving the
 * cycle — which governs how often the stream repeats — where it is.
 */
const MOTE_FLIGHT = 0.3;

/**
 * How fast a mote flies, in card widths per second of nominal time. Velocity is set
 * here and the duration derived from it, rather than the other way round.
 *
 * Drawing cycle length and distance independently is what made some motes visibly lag
 * the others: a long cycle paired with a short distance crawls, and the spread reached
 * 1.5× between slowest and fastest, which reads as a few stragglers rather than as
 * variety. Fixing the speed and solving for the duration keeps the spread inside the
 * ±8% jitter below, while distances still differ — so cycles are still all distinct
 * and the stream still never repeats.
 *
 * Raising this scales the cycle down with it, so the *density* of the stream is
 * unaffected — the same ~30% of the motes are in the air, they just cross faster
 * and set out again sooner. That is the knob to turn for speed; `MOTE_FLIGHT` is
 * the one that trades density for it.
 */
const MOTE_SPEED = 12.4;

/**
 * Where a mote's flight ends, in card widths from the centre. **Must match
 * `--mote-near` in packopen.css**, which is what actually positions it; this copy
 * exists so the flight distance can be worked out here.
 */
const MOTE_NEAR_K = 0.72;

/**
 * Cheap deterministic hash, 0..1. The classic `fract(sin(n) * large)` trick.
 *
 * Deterministic on purpose, and computed once at module load rather than per render.
 * `Math.random()` in the render would hand out new values on every state change —
 * and since these end up as custom properties that keyframes read, a mote mid-flight
 * would jump to a new angle and distance each time `faceUp` or `motesOut` flipped.
 */
const moteHash = (n: number): number => {
  const x = Math.sin(n) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Per-mote scatter. Everything that was uniform here is now varied, because uniform
 * is what produced the wheel.
 *
 * The previous version gave all 14 motes one of two durations and spaced their phase
 * offsets evenly across the cycle. That configuration *repeats*: the same ring of
 * motes at the same radii comes round again every cycle, which the eye reads as a
 * rotating pattern rather than as drifting light. Dealing the angles out in coprime
 * strides did not help, because every angle was still used exactly once — the ring
 * was always evenly covered, which is the problem itself.
 *
 * - **Golden angle** (137.508°) rather than even spacing: never lands on a regular
 *   polygon at any count, and puts consecutive-in-time motes far apart in angle, so
 *   there is no sequence for the eye to follow round.
 * - **No two motes share a cycle length.** This is what actually kills the
 *   periodicity — with 14 different durations the whole configuration only repeats
 *   at their common multiple, which is to say never within a build.
 * - **Varied start distance**, so they do not all appear out of one ring.
 * - **Jittered phase**, so they do not set out in an even procession.
 */
const MOTES = Array.from({ length: MOTE_COUNT }, (_, i) => {
  /*
   * Distance is capped by the viewport, not by taste. A mote is fully faded in less
   * than a third of the way along its path, and past ~2.8 card widths that point
   * falls outside a 1080-tall window — so motes travelling vertically stopped fading
   * in at all and popped into view at the screen edge instead. An earlier attempt at
   * buying speed through distance alone ran to 4.2 and did exactly that.
   */
  const farK = 2.25 + moteHash(i + 19.1) * 0.55;
  /* ±8%: enough that they are not in lockstep, little enough that none straggles. */
  const speed = MOTE_SPEED * (0.92 + moteHash(i + 7.3) * 0.16);
  const flightMs = ((farK - MOTE_NEAR_K) / speed) * 1000;

  return {
    angle: (i * 137.508 + moteHash(i + 1) * 16) % 360,
    farK,
    /*
     * Derived, not drawn: distance and speed decide it. Lands at a mean of ~465 —
     * short, because the stream is deliberately quick now; the flight fraction keeps
     * the number in the air the same however far this moves.
     */
    cycle: Math.round(flightMs / MOTE_FLIGHT),
    /*
     * Spread across the whole cycle, so at any instant roughly `MOTE_FLIGHT` of them
     * are in the air and the stream is steady. Confining these to the flight window
     * would put every mote on screen at once on the first frame and then leave a gap
     * behind them — a pulse rather than a stream.
     */
    t: -moteHash(i + 31.7),
  };
});

/**
 * How much the in-flight motes speed up once the stream drains, which begins on the
 * turn itself.
 *
 * Delaying the drain was tried twice and abandoned both times. At the *end* of the
 * flip it collided with the bloom's recession and was never really seen — worst at
 * level 2, where the ramp only reaches about a third to begin with. At the flip's
 * midpoint it was still late enough to read as an afterthought.
 *
 * The reason an early drain first felt like it sped the flip up was the *contrast*
 * between a slow stream and a sudden rush, not the timing. The motes are fast in the
 * build now, so the gap is narrow and the drain reads as the stream tightening rather
 * than as a jolt.
 *
 * Worst case is a mote that has only just set out on the longest flight in `MOTES`
 * (~183): at ×3 that is 61, so everything visible has landed well inside the 660 a
 * duplicate stays up for.
 */
const MOTE_DRAIN_RATE = 3;

/**
 * When the motes' own fade starts, measured from the turn: the longest *flight*
 * remaining at the drain rate, rounded up from 61.
 *
 * Flight, not cycle — a mote already in the idle tail of its cycle is invisible, so
 * there is nothing to wait for. Both figures depend on `MOTE_FLIGHT` and the matching
 * percentage in `opener-mote-in` (packopen.css); all three move together.
 *
 * The fade is a safety net behind the drain rather than the thing that removes the
 * motes: each keyframe already ends at zero opacity and `fill: 'forwards'` holds it
 * there, so a drained layer empties itself. It does the real work only on the
 * fallback path, where nothing drains and the loop would otherwise run on.
 */
const MOTE_DRAIN_MS = 70;

type Phase = 'sealed' | 'tearing' | 'revealing' | 'done';

interface PackOpenerProps {
  pack: Pack;
  /** Rolls the cards. Called once, when the wrapper is clicked. */
  onOpen: () => Promise<RevealedCard[]>;
  /**
   * Fired the moment the wrapper is clicked, before the roll is even awaited.
   *
   * The shelf stays on screen beside the opener, and it has to go inert for the
   * duration — you cannot pick up a second packet with your hands full. Paired with
   * `onFinished`, which is the other end of the same window. Not derivable from
   * outside: the packet spends an unbounded time lying there sealed, and the pile is
   * still live for all of it, so mounting the opener is not the start of anything.
   */
  onStart?: () => void;
  /** Fired after the last card has settled. */
  onFinished: (cards: RevealedCard[]) => void;
  fastMode: boolean;
}

const prefersReducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const PackOpener: React.FC<PackOpenerProps> = ({
  pack,
  onOpen,
  onStart,
  onFinished,
  fastMode,
}) => {
  const [phase, setPhase] = useState<Phase>('sealed');
  const [cards, setCards] = useState<RevealedCard[]>([]);
  const [flagged, setFlagged] = useState(false);
  const [cursor, setCursor] = useState(0);
  /** How many cards have been handed off to the row. Trails `cursor`. */
  const [landed, setLanded] = useState(0);
  /** False during the hand-off gap, so the centre is briefly empty. */
  const [heroVisible, setHeroVisible] = useState(true);
  const [faceUp, setFaceUp] = useState(false);
  /**
   * How many characters of the name have been written, and whether the portrait
   * has started dissolving in. Both only ever move for a *new* card — a duplicate
   * turns straight into its full face, which is the whole point: the beat is what
   * "new" looks like.
   *
   * The counter lives here rather than inside `PlayerCard` because it also drives
   * the ticks: one sound per character, on the same timer that lights it. A card
   * that wrote itself would put the sound and the writing on two clocks, which is
   * the drift `animationSpeed.ts` exists to prevent.
   */
  const [portraitIn, setPortraitIn] = useState(false);
  /** The reveal flash is burning. Mounted for its length and no longer. */
  const [flashing, setFlashing] = useState(false);
  const [glowing, setGlowing] = useState(false);
  /**
   * The full-screen bloom, tracked separately from `glowing`.
   *
   * `glowing` deliberately survives the turn so the card keeps its rim — but the
   * screen-filling glow must not, or it hangs there while the card is already
   * travelling to the row, lighting up an empty stage.
   */
  const [blooming, setBlooming] = useState(false);
  /**
   * The ceremony's vignette is carrying the reveal, rather than receding at the
   * turn like it does on every other card.
   *
   * A third flag on the gold pair, which is otherwise held to one rule: the two
   * halves move together or they drift by a frame. This is the single case where
   * they genuinely part company, and the reason is what each of them *is*. The
   * bloom is light on the card, and it has to hand over to the green one. The
   * vignette is the room, and the room has no business changing colour or coming
   * back up just because the card turned. So the bloom still fades on `blooming`
   * and the vignette ignores it, picking up its own frozen ramp and running it
   * out to full dark at the face.
   *
   * See `handsOver`. Set at the *end* of the flip rather than at the turn: the
   * freeze while the card is actually turning is still right, because a room
   * holding still is what lets the turn be seen.
   */
  const [carrying, setCarrying] = useState(false);
  /**
   * The mote layer's fade, tracked separately from `blooming` for the same kind of
   * reason `blooming` is separate from `glowing`.
   *
   * The bloom and the vignette have to recede as soon as the card turns or they
   * hang over an empty stage. The motes are the opposite case: they need to outlive
   * that recession long enough to finish travelling and be absorbed. Sharing
   * `blooming` put the fade directly on top of the drain, which at level 2 — where
   * the ramp only ever reaches about a third — left it barely visible at all.
   */
  const [motesOut, setMotesOut] = useState(false);
  /**
   * True when the results grid was arrived at by the final FLIP rather than by a
   * skip. Suppresses the grid's own entrance animation, which would fight it.
   */
  const [settledByFlip, setSettledByFlip] = useState(false);

  const timers = useRef<number[]>([]);
  const cardsRef = useRef<RevealedCard[]>([]);
  /**
   * Where the card is on screen, in viewport pixels, for the stage bloom and
   * vignette to centre themselves on.
   *
   * They are `position: fixed`, so a percentage centre is a percentage of the
   * *window* — which put the clear hole and the bloom at the middle of the page
   * rather than on the card, and the card sits well above that. The gold pair
   * has the same construction and the same bug; it is simply less obvious under
   * a glow that is already card-shaped.
   *
   * Measured once, in the callback that starts the motion: the card has landed
   * and is stationary by then, and it stays put until the hand-off. A ref rather
   * A ref rather than state because it is set before the state change that
   * renders it, so the values are always this card's.
   */
  const cardCentre = useRef<{ x: number; y: number } | null>(null);
  /** The mote layer, so the turn can reach its elements and drain the stream. */
  const motesRef = useRef<HTMLDivElement | null>(null);

  /* --- FLIP: carrying the revealed card down into the row ---------------- *
   *
   * The card used to be destroyed while a separate small card popped into the
   * row, so nothing actually travelled — two discrete events and a 240px to
   * 100px size jump.
   *
   * Instead: record the big card's rect before advancing, then once the new slot
   * has been laid out, invert it onto the old position and size and release it.
   * The slot itself does the travelling, so the motion is continuous and lands
   * exactly where the layout puts it — which matters, because the row re-centres
   * every time a card is added.
   */
  const heroRef = useRef<HTMLDivElement | null>(null);
  const heroRect = useRef<DOMRect | null>(null);
  const slotRefs = useRef(new Map<number, HTMLDivElement>());
  const pendingFlip = useRef<number | null>(null);
  /** Where the already-landed slots were before the row grew. */
  const prevRects = useRef(new Map<number, DOMRect>());

  const setSlotRef = (index: number) => (el: HTMLDivElement | null) => {
    if (el) slotRefs.current.set(index, el);
    else slotRefs.current.delete(index);
  };

  useLayoutEffect(() => {
    const arriving = pendingFlip.current;
    if (arriving === null) return;
    pendingFlip.current = null;

    if (prefersReducedMotion()) {
      prevRects.current.clear();
      return;
    }

    const duration = ms(SETTLE_MS);
    const easing = 'cubic-bezier(0.32, 0.72, 0.28, 1)';

    slotRefs.current.forEach((el, index) => {
      const to = el.getBoundingClientRect();
      if (to.width === 0) return;

      /*
       * The arriving card travels from the big reveal card. Everything already in
       * the row travels too, because the row is centred and re-centres on every
       * addition — and on the final hand-off the row becomes the results grid,
       * which is a different layout at a different card size, so they all move.
       */
      const from = index === arriving ? heroRect.current : prevRects.current.get(index);
      if (!from) return;

      // Centre-based, because transform-origin is the centre — offsetting by the
      // top-left corner only agrees with that while the scale is exactly 1.
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      const scale = from.width / to.width;

      const still =
        Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(scale - 1) < 0.005;
      if (still && index !== arriving) return;

      /*
       * `transform: scale()` scales box-shadows with it, so a glow authored at the
       * slot's final size arrives inflated by the scale factor — the card visibly
       * puffs up before it travels.
       *
       * This used to be solved by dropping the glow for the flight, which took the
       * green "new" rim with it: a card would lose the one marking that said it
       * had actually filled a hole in the album at exactly the moment it flew into
       * it. Instead the factor is published and the CSS divides every offset and
       * blur by it. `--flip-scale` is registered with `@property` so it
       * interpolates in step with the transform, holding the *apparent* glow
       * constant across the whole flight.
       */
      el.classList.add('opener__slot--flying');
      timers.current.push(
        window.setTimeout(() => {
          el.classList.remove('opener__slot--flying');
          el.style.removeProperty('--flip-scale');
        }, duration + 20),
      );

      el.style.transition = 'none';
      el.style.setProperty('--flip-scale', String(scale));
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      // Force the inverted position to be committed before releasing it.
      void el.offsetWidth;
      el.style.transition = `transform ${duration}ms ${easing}, --flip-scale ${duration}ms ${easing}`;
      if (!el.style.transition) {
        /*
         * One invalid item invalidates a whole comma-separated declaration, so a
         * browser that will not transition a custom property would drop the
         * transform with it and the FLIP would snap. The glow then steps rather
         * than interpolating, which is only a degradation.
         */
        el.style.transition = `transform ${duration}ms ${easing}`;
      }
      el.style.transform = '';
      el.style.setProperty('--flip-scale', '1');
    });

    prevRects.current.clear();
  });

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  /*
   * Draining the mote stream at the turn.
   *
   * Up to the turn the motes loop forever, which is what keeps the build identical
   * at any timestamp regardless of level. At the turn the stream has to *resolve*
   * rather than evaporate: no new mote sets out, and the ones already travelling
   * finish their run into the card and are absorbed. Before this they simply faded
   * out mid-flight, which threw away the one thing the layer is about — light
   * gathering *into* the card.
   *
   * Not expressible in CSS. Letting an in-flight iteration finish means capping the
   * count at "however many have elapsed, plus this one", and CSS cannot read how
   * far along a running animation is. Changing `animation-duration` instead is
   * actively wrong: it preserves elapsed *time*, not progress, so every mote jumps
   * to a new position on the path. Hence the Web Animations API, which is a browser
   * API rather than an animation library — nothing is added to the bundle.
   *
   * `fill: 'forwards'` is not optional. Without it a finished mote reverts to its
   * un-animated state — no transform, so every one of them snaps to the centre of
   * the card, and with nothing driving opacity they land there as a heap of solid
   * dots. `.opener__mote` carries `opacity: 0` as a second guard on the same thing.
   */
  useEffect(() => {
    if (!faceUp) return undefined;
    const root = motesRef.current;
    if (!root) return undefined;

    const drain = () => {
      root.querySelectorAll<HTMLElement>('.opener__mote').forEach((mote) => {
        // Absent on older browsers: the motes just keep looping and fade as before.
        if (typeof mote.getAnimations !== 'function') return;

        mote.getAnimations().forEach((animation) => {
          const timing = animation.effect?.getComputedTiming();
          if (!timing) return;

          /*
           * 0-based, so `+ 1` is the count that *includes* the current pass — an
           * animation 3.4 iterations in gets a cap of 4 and runs out the remaining
           * 0.6 rather than stopping where it stands.
           */
          const elapsed = timing.currentIteration ?? 0;
          animation.effect?.updateTiming({ iterations: elapsed + 1, fill: 'forwards' });
          animation.playbackRate = MOTE_DRAIN_RATE;
        });
      });
    };

    /*
     * Where the browser cannot drain, fall back to the old behaviour rather than
     * leaving the motes looping: without the iteration cap they never end on their
     * own, so the fade has to be what removes them.
     */
    const canDrain = typeof Element.prototype.getAnimations === 'function';

    // On the turn, not after it. Nothing to schedule — the effect *is* the turn.
    if (canDrain) drain();

    /*
     * The fade trails the drain instead of running under it, which is the whole
     * reason it is not on `blooming` any more. It is only a safety net — a drained
     * mote is already at zero opacity and held there — so waiting for the last one
     * to land costs nothing and keeps the drain visible.
     *
     * Its own timer rather than the shared `after` helper: scoped to the effect, so
     * the cleanup cancels it on a skip or an unmount without touching the reveal's
     * timeline.
     */
    const timer = window.setTimeout(
      () => setMotesOut(true),
      ms(canDrain ? MOTE_DRAIN_MS : FLIP_MS),
    );

    return () => window.clearTimeout(timer);
    /*
     * `faceUp` alone is enough to re-arm this per card, and `cursor` would be an
     * unnecessary dependency: every card sets `faceUp` back to false on the way in,
     * and its motes are a fresh set of elements because `glowing` goes false with it
     * and unmounts the layer.
     */
  }, [faceUp]);

  /** Schedules `fn` after a base duration, scaled by the pacing multiplier. */
  const after = useCallback((base: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms(base)));
  }, []);

  /**
   * Notes where the card is on screen, for the fixed light layers to centre on.
   *
   * **Called immediately before the state change that turns a layer on**, never
   * on a timer of its own: the ref has to be written before the render that
   * reads it, and the moment a layer appears is also the moment the card is
   * guaranteed to be sitting still. There are two such moments and they are far
   * apart — the ceremony's build begins seconds before the flip, and the
   * reveal's light begins after it — so measuring once per card would leave one
   * of them centred on the previous card's position or on nothing at all.
   *
   * Not recomputed on resize. A reveal is a few seconds and the window is not
   * going to move; if that ever stops being true this is where a listener goes.
   */
  const measureCard = useCallback(() => {
    const rect = heroRef.current?.getBoundingClientRect();
    cardCentre.current = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : null;
  }, []);

  const finish = useCallback(() => {
    clearTimers();
    setPhase('done');
    setGlowing(false);
    playSlot();
    onFinished(cardsRef.current);
  }, [clearTimers, onFinished]);

  /**
   * Mutual recursion between the two halves of the reveal, held in a ref so
   * neither needs to be a dependency of the other.
   */
  const stepRef = useRef<(index: number) => void>(() => {});

  /** Brings card `index` on and plays it through to its hold. */
  const playCard = (index: number) => {
    const card = cardsRef.current[index];
    if (!card) return;

    setCursor(index);
    setHeroVisible(true);
    setFaceUp(false);
    setFlagged(false);
    setPortraitIn(false);
    setFlashing(false);
    setGlowing(false);
    setBlooming(false);
    setCarrying(false);
    setMotesOut(false);
    setPhase('revealing');

    /*
     * Hoisted above `advance`, which needs it: the lead and the hand-over both
     * depend on the level now, so the plain path and the ceremony path can no
     * longer each work it out for themselves.
     */
    const level = ceremonyLevelFor(card.overall);

    /* Called at the turn itself, by both the ceremony path and the plain one. */
    const advance = () => {
      if (card.isNew) {
        /*
         * One event. The silhouette is allowed to register, then light bursts out
         * of the centre and opens the card behind it.
         *
         * This was a build: the name arrived a word at a time, each word struck on
         * with its own blow, cooling from white-hot afterwards. It came out. A name
         * is a single fact, and splitting it spent its beats on grammar — one of
         * "Jasper / van / Buul"'s three dramatic moments was the word "van". And
         * each fragment was far too small to carry a blow heavy enough to matter,
         * so the sound was permanently louder than the thing it was happening to,
         * which is what read as silly rather than as weighty.
         */
        const flashAt = FLIP_MS + REVEAL_LEAD_MS;

        after(flashAt, () => {
          measureCard();
          setFlashing(true);
          setPortraitIn(true);
          /* The chime inside it waits for the accent; same number as the rim. */
          playNameReveal(ms(REVEAL_MS * REVEAL_RIM_AT));
        });

        /*
         * The rim lights **on the accent** — partway through the motion, never
         * at the end of it. For D that is the drain: the rim is the residue of
         * the light leaving. See `REVEAL_RIM_AT`.
         *
         * It used to come up with the turn, which made it something the card
         * arrived already wearing. Now the reveal deposits it: the glow is the
         * light's residue rather than a second green thing that happened to be
         * there anyway.
         */
        after(flashAt + REVEAL_MS * REVEAL_RIM_AT, () => setFlagged(true));

        after(flashAt + REVEAL_MS, () => setFlashing(false));
      } else {
        /*
         * A duplicate has no reveal to conclude, so there is nothing to wait for.
         * (The rim only renders on a new card anyway — see `opener__flip--new` —
         * but the flag is set on both paths so the two cannot drift.)
         */
        setFlagged(true);
      }

      after(FLIP_MS + holdFor(card), () => stepRef.current(index + 1));
    };

    if (level > 0) {
      // Arrives as an ordinary card, then the glow creeps in.
      after(CEREMONY_LEAD_MS, () => {
        /*
         * The gold bloom and vignette are fixed layers too, so they need the
         * card's position for the same reason the reveal's pair does — and they
         * need it *here*, because this build runs entirely before the flip and
         * is long finished by the time the reveal measures. The riser's 180ms
         * entrance is over well before this lead expires, so the rect is final.
         */
        measureCard();
        setGlowing(true);
        setBlooming(true);

        /*
         * Shimmer first, then radiation. The build length is the only tell: the
         * riser's envelope is shaped for the *longest* radiation window and simply
         * stopped early, so at any given moment it sounds the same whatever the
         * tier — exactly like the glow ramp.
         */
        const base = getCeremonyMs();
        const shimmerMs = Math.round(base * ceremonyShimmerRatio());
        const buildMs = Math.round(base * ceremonyBuildRatio(level));
        const maxRadiateMs = Math.round(
          base * (ceremonyMaxBuildRatio() - ceremonyShimmerRatio()),
        );
        const radiateMs = Math.max(0, buildMs - shimmerMs);

        playShimmerSweep(ms(shimmerMs));

        // Level 1 turns as the shimmer ends, so it never radiates at all.
        if (radiateMs > 0) {
          after(shimmerMs, () => playRareRise(ms(maxRadiateMs), ms(radiateMs)));
        }

        after(buildMs, () => {
          setFaceUp(true);
          // The glow deliberately survives the turn and the hold. Killing it here
          // meant all that build-up resolved into a card that looked exactly like
          // a common one the instant you could finally see who it was.
          // `playCard` clears it when the next card comes on.
          playRarePayoff(level);
          /*
           * Both halves freeze at the turn (via --held), and what happens to
           * them at the end of the flip is where the two paths part.
           *
           * Ordinarily they simply recede together — the card is readable and a
           * screen-filling glow over it has nothing left to do.
           *
           * On the hand-over path the *bloom* still goes, because the reveal is
           * bringing its own green one and two lights on one card is the thing
           * being fixed. The vignette does not: it picks up where it froze and
           * keeps darkening the room through the whole break. Nothing about the
           * surround should change at the turn, because the turn is not what the
           * room is about.
           */
          after(FLIP_MS, () => {
            setBlooming(false);
            if (handsOver(card, level)) setCarrying(true);
          });
          advance();
        });
      });
      return;
    }

    after(FLIP_LEAD_MS, () => {
      setFaceUp(true);
      /*
       * **The flip only. `playSlot()` used to double it on a new card, and it
       * read as a balloon popping.**
       *
       * Both sounds end in a short low sine with a falling pitch — `playFlip`
       * sweeps 272 → 160 Hz over 100ms, `playSlot` 221 → 130 Hz over 80ms,
       * seventy milliseconds behind it. Separately each is the small thump of a
       * card being handled; overlapped they stop being two events and become one
       * dull hollow pop, which is very close to how you would synthesise a
       * balloon on purpose.
       *
       * It was inaudible for as long as it was the only thing there and on a
       * rare card it still is — `playRarePayoff` lands on the same frame and
       * buries it — which is why it only ever showed on the lower tiers, and
       * only once the reveal had a real sound of its own to be heard against.
       *
       * The extra `playSlot` was there to give a new card *something* at the
       * turn back when the beat after it was silent. The beat is not silent now,
       * and this is the redundancy the design doc predicted would have to go.
       */
      playFlip();
      advance();
    });
  };

  /** Hands the current card off to the row, then brings on card `index`. */
  const revealFrom = (index: number) => {
    if (index === 0) {
      playCard(0);
      return;
    }

    const isLast = index >= cardsRef.current.length;

    // Measure everything before the layout changes: the outgoing card, and every
    // slot already in the row so they can slide to their new positions rather than
    // snapping.
    prevRects.current.clear();
    slotRefs.current.forEach((el, i) => prevRects.current.set(i, el.getBoundingClientRect()));
    heroRect.current = heroRef.current?.getBoundingClientRect() ?? null;
    pendingFlip.current = index - 1;

    /*
     * `index.tsx` mounts with legacy `ReactDOM.render`, which does **not** batch
     * state updates inside a timeout — each one commits on its own and runs the
     * FLIP layout effect on its own. Everything here therefore has to land in a
     * single commit.
     *
     * For the last card that was fatal. `setLanded` alone committed while the phase
     * was still `revealing`, so the effect flew the card into the row it was about
     * to leave and nulled `pendingFlip`; `setPhase('done')` then threw that DOM
     * away and mounted the results grid with no FLIP pending. Every other card
     * survived because its flight runs on elements that persist across the
     * following commits — the last card is the only one whose flight spans a
     * subtree swap, which is exactly why it was the only one that never moved.
     *
     * `--settled` then turns the grid's entrance animation off: a CSS animation
     * outranks an inline style, so `opener-settle` would beat the inverted
     * transform and nothing would move even once the FLIP does survive.
     */
    unstable_batchedUpdates(() => {
      setLanded(index);
      setHeroVisible(false);
      if (isLast) {
        setSettledByFlip(true);
        finish();
      }
    });

    if (!isLast) after(HANDOFF_MS, () => playCard(index));
  };

  stepRef.current = revealFrom;

  const start = async () => {
    if (phase !== 'sealed') return;

    // Before the await, not after: the roll is a network call in phase 2, and the
    // pile must not stay clickable across it.
    onStart?.();

    const drawn = await onOpen();
    cardsRef.current = drawn;
    setCards(drawn);

    // Beat 2 doubles as cover for loading the portraits.
    drawn.forEach((card) => {
      const img = new Image();
      img.src = avatarUrl(card.player.id);

      /*
       * And the masks, for the cards that will use one. The hero renders its
       * silhouette eagerly — it cannot afford the probe the album uses — so the
       * tear is the only cover there is for fetching it.
       */
      if (card.isNew) {
        const mask = new Image();
        mask.src = silhouetteUrl(card.player.id);
      }
    });

    if (fastMode || prefersReducedMotion()) {
      setLanded(drawn.length);
      finish();
      return;
    }

    playTear();
    setPhase('tearing');
    after(TEAR_MS, () => revealFrom(0));
  };

  /** Clicking anywhere mid-animation lands immediately on the end state. */
  const skip = () => {
    if (phase === 'tearing' || phase === 'revealing') {
      setLanded(cardsRef.current.length);
      finish();
    }
  };

  /** This packet's colourway. Derived from the pack id, so it matches its tile. */
  const foil = packFoil(pack);

  const current = cards[cursor];
  const level = current === undefined ? 0 : ceremonyLevelFor(current.overall);

  /** The very top of the scale keeps the sweep and the particle burst. */
  const isPeak = level >= 4;

  /*
   * An icoon's reveal light is gold rather than green. The card carries
   * `card--icoon` itself, but the flash field is a sibling of the flip and cannot
   * see it, so the stage — their nearest common ancestor — carries the flag for
   * it. Nothing about the ceremony changes: icoon is still not a tier.
   */
  const isIcoon = current !== undefined && current.player.isLegend;

  /*
   * Published to CSS so the glow's swell and the bloom match this card's build
   * length, which differs per level.
   */
  const stageStyle = {
    '--shimmer-ms': `${ms(Math.round(getCeremonyMs() * ceremonyShimmerRatio()))}ms`,
    /*
     * The longest radiation window, not this card's. Every level ramps at the
     * same rate toward the same target after the same delay; only the moment of
     * the turn differs.
     */
    '--radiate-ms': `${ms(
      Math.round(getCeremonyMs() * (ceremonyMaxBuildRatio() - ceremonyShimmerRatio())),
    )}ms`,
    /*
     * The reveal's clock, on the stage rather than on the riser.
     *
     * It was on the riser, whose only readers were the card and the flash. The
     * full-screen bloom and vignette are `position: fixed` siblings *outside*
     * the riser — they have to be, or the stage's own clip would cut them — so
     * the property has to hang off their nearest common ancestor instead. The
     * riser is inside the stage, so nothing that read it before stops.
     *
     * Already through `ms()`, so no rule may multiply it by `--anim` again.
     */
    '--reveal-ms': `${ms(REVEAL_MS)}ms`,
    /*
     * Where the candidate discharges, as a fraction of its own motion. The
     * carried vignette is darkest here rather than at a fixed point, because
     * "darkest room" and "the accent" are the same moment by definition — and
     * the candidates do not agree on when that is: J lands its face at 0.9 while
     * D and E drain at 0.62. A room still closing in after the payoff is
     * building toward something that has already happened.
     *
     * Keyframe percentages cannot read a custom property, so the *duration* is
     * scaled instead — see `opener__dim--carry`.
     */
    '--rim-at': `${REVEAL_RIM_AT}`,
    /*
     * The carried ramp is delayed by the candidate's lead, because the carry
     * begins at the end of the flip and the reveal it is timed against begins
     * one lead later. Without it the room peaks early by exactly that much —
     * 280ms real on D and E, which land their accent at 0.62 where it shows.
     *
     * The animation is `both`, not `forwards`, and that is load-bearing: through
     * the delay it holds its own 0% frame, which is `--dim-carry-from` — where
     * the ramp froze. With `forwards` alone the base rule's `opacity: 0` would
     * apply instead and the room would snap to full brightness for the length of
     * the lead, which is a worse version of the thing this whole path removes.
     */
    '--carry-delay': `${ms(REVEAL_LEAD_MS)}ms`,
    /*
     * The opacity `opener__dim--carry` picks up from, so the surround is the
     * same darkness on the frame before the turn and the frame after it.
     *
     * Two steps, and the second is easy to miss. First: how far the build's ramp
     * had got when the card turned, as a fraction. Then `DIM_CARRY_MATCH`, which
     * converts that into the *carried* gradient's scale — the carry is a third
     * shallower, so the same darkness is a higher opacity on it. Without the
     * conversion the room would visibly lift at the turn, which is the whole
     * thing the hand-over exists to prevent.
     *
     * Derived from the same three ratios the freeze itself is, rather than read
     * back off the element. `opener-dim-grow` is linear over the *longest*
     * window, so the fraction of that window a level consumed is also the
     * fraction of the ramp it rendered — which is only true while that animation
     * stays linear. If it ever gets a curve, this has to gain the same one.
     *
     * Level 4 lands on 1: a 90+ has already taken the room fully dark, so the
     * carry has nothing left to give and simply holds it there until the face.
     */
    '--dim-carry-from': Math.min(
      1,
      Math.max(
        0,
        (ceremonyBuildRatio(level) - ceremonyShimmerRatio()) /
          (ceremonyMaxBuildRatio() - ceremonyShimmerRatio()),
      ) * DIM_CARRY_MATCH,
    ).toFixed(4),
    /*
     * The card's centre in viewport pixels, for the fixed stage layers. Absent
     * until the motion starts, and the CSS falls back to the middle of the
     * window — which is only ever seen on a frame where nothing is drawn yet.
     */
    ...(cardCentre.current
      ? {
          '--card-cx': `${Math.round(cardCentre.current.x)}px`,
          '--card-cy': `${Math.round(cardCentre.current.y)}px`,
        }
      : null),
  } as React.CSSProperties;

  /** Only the new ones actually changed the album, so that is what gets reported. */
  const newCount = cards.filter((card) => card.isNew).length;
  const outcome =
    newCount === 0
      ? 'geen nieuwe kaarten — allemaal dubbel'
      : `${newCount === 1 ? '1 nieuwe kaart' : `${newCount} nieuwe kaarten`} toegevoegd aan je album`;

  return (
    <div className="opener" onClick={skip}>
      {/*
        The wrapper lives *in* the stage, and the empty revealed row is rendered
        under it — so the sealed, tearing and revealing phases are all the same
        three-row column at the same heights.

        Without both of those the column re-laid itself out at the tear: the
        wrapper phase was shorter and had no row beneath it, so `justify-content:
        center` put the packet lower than the stage it was about to become, and the
        first card rose several dozen pixels above where you had just clicked. The
        stage's fixed `--pack-h` is the other half of this — see packopen.css.
      */}
      {phase === 'sealed' ? (
        <>
          <div className="opener__stage">
            <div
              className="pack"
              style={foil}
              onClick={start}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') void start();
              }}
            >
              <PackFace pack={pack} />
            </div>
          </div>
          <div className="opener__revealed" />
          <div className="opener__hint">klik op het pakje</div>
        </>
      ) : null}

      {phase === 'tearing' ? (
        <>
          <div className="opener__stage">
            {/* Each half carries the whole face and its own `clip-path` cuts it,
                so the printing tears with the foil instead of blinking out the
                moment the wrapper is clicked. */}
            <div className="pack pack--tearing" style={foil}>
              <div className="pack__half pack__half--top">
                <PackFace pack={pack} />
              </div>
              <div className="pack__half pack__half--bottom">
                <PackFace pack={pack} />
              </div>
            </div>
          </div>
          <div className="opener__revealed" />
          <div className="opener__hint">&nbsp;</div>
        </>
      ) : null}

      {phase === 'revealing' && current ? (
        <>
          <div
            className={`opener__stage${isIcoon ? ' opener__stage--icoon' : ''}`}
            style={stageStyle}
          >
            {/* Stays mounted for the whole reveal so the class change can transition
                both ways — unmounting it would cut the glow dead. */}
            {/* Driven by the same three flags as the bloom, deliberately — it is
                the other half of the same effect, and a state of its own could
                drift out of step with it by a frame at the freeze or the fade. */}
            {glowing ? (
              <div
                className={[
                  'opener__dim',
                  /* The freeze ends when the carry begins; they are the same
                     ramp, and it cannot be both paused and running. */
                  faceUp && !carrying ? 'opener__dim--held' : '',
                  carrying ? 'opener__dim--carry' : '',
                  blooming || carrying ? '' : 'opener__dim--out',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="opener__dim-inner" />
              </div>
            ) : null}

            {glowing ? (
              <div
                className={[
                  'opener__bloom',
                  faceUp ? 'opener__bloom--held' : '',
                  blooming ? '' : 'opener__bloom--out',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="opener__bloom-inner" />
              </div>
            ) : null}

            {/* Third layer of the build, same three flags again. Inside the stage
                rather than fixed, because the motes converge on the card and so
                have to be positioned from it. */}
            {glowing ? (
              <div
                className={[
                  'opener__motes',
                  faceUp ? 'opener__motes--held' : '',
                  motesOut ? 'opener__motes--out' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="opener__motes-inner" ref={motesRef}>
                  {MOTES.map((mote, i) => (
                    <span
                      key={i}
                      className="opener__mote"
                      style={
                        {
                          '--angle': `${mote.angle.toFixed(1)}deg`,
                          /*
                           * Through `ms()` like every other JS-side duration, so the
                           * pacing multiplier still reaches it — the CSS cannot apply
                           * `--anim` itself now that the value arrives from here.
                           */
                          '--mote-cycle': `${ms(mote.cycle)}ms`,
                          /* Unitless multiplier; the CSS scales it by the card width. */
                          '--mote-far-k': `${mote.farK.toFixed(2)}`,
                          /* Unitless fraction of a cycle, multiplied in the CSS. */
                          '--mote-t': `${mote.t.toFixed(3)}`,
                        } as React.CSSProperties
                      }
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {faceUp && isPeak ? (
              <div className="opener__particles">
                {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
                  <span
                    key={i}
                    className="opener__particle"
                    style={{ '--angle': `${(360 / PARTICLE_COUNT) * i}deg` } as React.CSSProperties}
                  />
                ))}
              </div>
            ) : null}

            {/* Keyed on cursor so each card gets a fresh element — a reused one
                would animate its rotation back to face-down. */}
            <div
              key={cursor}
              ref={heroRef}
              className={`opener__riser opener__riser--${cursor === 0 ? 'first' : 'next'}`}
              style={heroVisible ? undefined : { visibility: 'hidden' }}
            >
              <div
                className={[
                  'opener__flip',
                  faceUp ? 'opener__flip--up' : '',
                  flagged && current.isNew ? 'opener__flip--new' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {/*
                  Inside the flip, so it turns with the card and its halo tracks
                  the card's foreshortened silhouette all the way round.
                  Outside it, the layer stayed flat while the card went edge-on,
                  and for those frames you saw straight through to the layer
                  itself — first as a hard-edged hole, then as a gold panel once
                  that hole was filled. Neither is a glow; both are the light
                  source becoming visible.

                  Still not on `.card`: that element's box-shadow belongs to the
                  green "new" rim, and a filled animation would own it outright.
                */}
                {glowing ? (
                  <div
                    className={`opener__radiance${faceUp ? ' opener__radiance--held' : ''}`}
                  />
                ) : null}

                <div className="opener__face">
                  <CardBack />
                </div>
                <div className="opener__face opener__face--front">
                  {/*
                    A new card turns over into everything except a face: metal,
                    overall and the green rim are all there, and the player is
                    their own outline until the name is written on them. A
                    duplicate is passed nothing and renders as it always did.
                  */}
                  <PlayerCard
                    card={current}
                    eager
                    reveal={
                      current.isNew
                        ? {
                            revealed: portraitIn,
                          }
                        : undefined
                    }
                  />
                  {isPeak && faceUp ? <div className="opener__sweep" /> : null}
                </div>
              </div>

              {/* Outside the flip, so it stays flat while the card turns. Only
                  during the build — once face up, the card speaks for itself. */}
              {glowing && !faceUp && level > 0 ? <div className="opener__shimmer" /> : null}

              {/*
                And the pass that reveals a new card, after the flip rather than
                before it — the other end of the same idea. Green, not gold: see
                the block in packopen.css. Outside the flip for the same reason
                the ceremony shimmer is.
              */}
              {flashing ? <div className="opener__flash" /> : null}
            </div>
          </div>

          <div className="opener__revealed">
            {cards.slice(0, landed).map((card, i) => (
              <div
                key={`${card.player.id}-${i}`}
                ref={setSlotRef(i)}
                className={`opener__slot${card.isNew ? ' opener__slot--new' : ''}`}
              >
                {/*
                  `eager` is load-bearing here, not a precaution. The slot is a
                  *fresh* element — the FLIP inverts it onto the hero's rect rather
                  than moving the hero itself — so a lazy portrait misses the first
                  frame of the descent and the card blinks to bare metal. See the
                  prop's note in PlayerCard.
                */}
                <PlayerCard card={card} eager />
              </div>
            ))}
          </div>

          <div className="opener__hint">
            {cursor + 1} / {cards.length} — klik om over te slaan
          </div>
        </>
      ) : null}

      {phase === 'done' ? (
        <>
          <div
            className={`opener__results${settledByFlip ? ' opener__results--settled' : ''}`}
          >
            {cards.map((card, i) => (
              <div
                key={`${card.player.id}-${i}`}
                ref={setSlotRef(i)}
                className={`opener__result opener__slot${card.isNew ? ' opener__slot--new' : ''}`}
                style={settledByFlip ? undefined : { animationDelay: `${i * 55}ms` }}
              >
                {/* Same again: reached by the final FLIP, so these mount fresh too. */}
                <PlayerCard card={card} eager />
              </div>
            ))}
          </div>
          <div className="opener__hint">{outcome}</div>
        </>
      ) : null}
    </div>
  );
};

export default PackOpener;
