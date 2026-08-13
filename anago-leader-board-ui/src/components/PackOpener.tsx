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
import { getCeremonyMs, ms, prefersReducedMotion } from '../utils/animationSpeed';
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
 * started with, and a deliberate trade for a reveal worth watching. There is no
 * longer a way out of it mid-run — the click-to-skip this used to lean on is
 * gone — so the trade only unwinds on its own, as the album fills and fewer
 * cards are new. `fastMode` (the test panel's `snel openen`) is the one bypass
 * left, and it is not a reader-facing one.
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
 * Beat 6 — the row waits, and the reader decides
 *
 * **There is no exit button on this page.** The reveal ends and the cards stay on the
 * table, and what is then on offer is two things: another packet off the shelf — which
 * adds its cards to the same row — or filing what you have, which is a click on the
 * cards themselves.
 *
 * That the row *waits* is the whole point of it. **It is the record of what you
 * opened**, and it is static: a reader who looked away comes back to the packet's
 * contents laid out in front of them, which nothing else on this page provides — once
 * the cards are in the book, the album marks nothing. It also makes the click a
 * decision rather than a chore, because there is a real alternative next to it. Both
 * halves of that were arrived at the hard way:
 *
 * - **Automatic**, with the cards filing themselves the moment the reveal ended. No
 *   chore, but the only trace of a packet was a few seconds of motion.
 * - **A results grid** you clicked, at a third size, with the shelf inert beside it —
 *   so the one thing on offer was a control with a dimmed table around it. That is what
 *   the live shelf over the waiting row fixes: the pile brightening the moment the last
 *   card lands is what makes "another packet" the peer of "file these".
 * - **A held row with "2 nieuwe kaarten voor je album" under it**, which is the
 *   receipt-for-a-transaction-you-watched version of the same idea. The count is gone;
 *   the cards say it.
 *
 * Nothing leaves the row until it is filed — the doubles included, which is why they
 * are still there to be seen. A double is not waste: the book records it as a numeral
 * beside its tick on the checklist, and a checklist is also a swap list. Off the table
 * is where a swap lives, and that happens when the rest go into the book, in `PutAway`.
 * ------------------------------------------------------------------ */

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

/**
 * `waiting` is the tear having finished with the roll still out — the first card
 * standing on the stage, face down, because face down is the one thing that is true
 * about it whatever the server eventually says. See `start`.
 *
 * It shares the whole of `revealing`'s markup rather than getting a branch of its
 * own, and that is load-bearing: a separate branch is a separate element, so the
 * riser would unmount and remount at the moment the cards landed and play its 180ms
 * entrance a second time — the card rising out of a wrapper it is already out of.
 */
type Phase = 'sealed' | 'tearing' | 'waiting' | 'revealing' | 'done';

interface PackOpenerProps {
  pack: Pack;
  /**
   * Rolls the cards. Called once, when the wrapper is clicked — and **not awaited
   * before anything moves**. See `start`.
   */
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
  /**
   * The roll was refused, and there is nothing to reveal.
   *
   * Required rather than optional, unlike `onStart`: the wrapper is torn by the time
   * this can fire, so an opener whose caller ignores it is an opener stuck on a card
   * back that never turns over. `onFinished` cannot stand in for it — that one means
   * "here is what you got", and an empty pack is a different statement from a refusal.
   */
  onFailed: (reason: unknown) => void;
  /**
   * Cards already lying on the table from earlier packets in this sitting.
   *
   * The row survives one packet: it is what you have opened, not what this packet held.
   * Rendered ahead of this pack's own cards in the same row — see the render — so the
   * reveal's FLIP lands into a row that already has cards in it, and the ones that were
   * there slide as it grows, exactly as they do within a single pack.
   */
  table: RevealedCard[];
  /**
   * File the cards: **the reader's decision**, and one of two things on offer beside a
   * finished row — another packet off the shelf, or this.
   *
   * It hands over every card on the table, each with the box it is lying in **now**, in
   * viewport pixels, so the doubles can be seen leaving and the keepers can be flown into
   * their slots from where the reader last saw them.
   *
   * Empty is a real answer and means "nothing to file, just put the book back" — a reader
   * who has asked for less motion, or `snel openen`.
   */
  onPutAway: (placing: { card: RevealedCard; from: DOMRect }[]) => void;
  /**
   * The packet was put back down unopened. Only reachable while it is still sealed,
   * which is the whole point of it: up to the tear nothing has happened yet.
   */
  onPutBack: () => void;
  fastMode: boolean;
}

const PackOpener: React.FC<PackOpenerProps> = ({
  pack,
  onOpen,
  onStart,
  onFinished,
  onFailed,
  table,
  onPutAway,
  onPutBack,
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
  /*
   * No `putting` state any more. The cards leaving is `PutAway`'s, in an overlay that
   * outlives this component, so there is nothing here to be in the middle of.
   */

  const timers = useRef<number[]>([]);
  const cardsRef = useRef<RevealedCard[]>([]);
  /**
   * The wrapper has been clicked. Not derivable from `phase`, which stays `sealed`
   * across the whole roll on the fast path — so without this a second click there
   * fires a second claim, and the endpoint answers the second one with a 409.
   */
  const started = useRef(false);
  /**
   * The tear finished before the roll did, so the card back is standing on the stage
   * waiting to be told what it is. The half of the rendezvous `rollLanded` reads; the
   * other half is `cardsRef`, which the tear timer reads. See `start`.
   */
  const stalled = useRef(false);
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
  /**
   * Every card in the row, keyed by its position **in the row** — so the cards already
   * on the table from earlier packets occupy `0 .. table.length - 1` and this pack's own
   * start after them. See the render, and `rowIndex`.
   */
  const slotRefs = useRef(new Map<number, HTMLDivElement>());
  const pendingFlip = useRef<number | null>(null);
  /** Where the already-landed slots were before the row grew. */
  const prevRects = useRef(new Map<number, DOMRect>());
  /** The row itself, for the scroll it needs once it outgrows its width. */
  const rowRef = useRef<HTMLDivElement | null>(null);
  /** The cards inside it, which is what is measured against the row to decide that. */
  const handRef = useRef<HTMLDivElement | null>(null);

  const setSlotRef = (index: number) => (el: HTMLDivElement | null) => {
    if (el) slotRefs.current.set(index, el);
    else slotRefs.current.delete(index);
  };

  /** This pack's card `index`, as a position in the row. */
  const rowIndex = (index: number): number => table.length + index;

  /*
   * Whether the row has to scroll, decided by measurement on every render.
   *
   * **It must not scroll while it fits**, and that is not an optimisation: a scroll
   * container clips both axes — `overflow-x: auto` computes `overflow-y` to `auto` too — so a
   * row that is permanently one cuts the top off the card descending into it from the stage.
   * See `.opener__revealed--scrolls`.
   *
   * Imperative, and declared **above the FLIP effect** so it runs first: the class has to be
   * on the element before that effect measures where a card is landing, or the first card to
   * push the row past the book's width lands at a position the row no longer uses. A state
   * update could not do that — it would apply a commit later — and the FLIP already writes
   * classes directly for the same reason.
   *
   * **Only when the row's contents change, and that is not an optimisation.** Reading
   * `offsetWidth` forces a style and layout flush, and this ran on *every* render: the
   * reveal advances by ten separate commits inside one task (see `playCard`), which the
   * browser is otherwise free to collapse into a single style computation. Flushing between
   * them made the intermediate states real, and the card being brought on visibly rotated
   * from face-up back to face-down before its silhouette beat. `playCard` batches now so
   * that cannot recur, and this stays narrow anyway — nothing else here has any business
   * forcing layout mid-reveal.
   *
   * The card and the row both scale with the viewport, so whether the cards fit is very
   * nearly viewport-independent — a resize listener would earn nothing.
   */
  useLayoutEffect(() => {
    const row = rowRef.current;
    const hand = handRef.current;
    if (!row || !hand) return;

    /*
     * `offsetWidth` against `clientWidth`, so the comparison cannot flap: a horizontal
     * scrollbar takes height rather than width, so neither figure moves when the class goes
     * on, and the state it decides cannot flip-flop between commits.
     */
    row.classList.toggle('opener__revealed--scrolls', hand.offsetWidth > row.clientWidth);
  }, [table.length, landed]);

  useLayoutEffect(() => {
    const arriving = pendingFlip.current;
    if (arriving === null) return;
    pendingFlip.current = null;

    /*
     * Keep the newest card in view. The row scrolls once it holds more than a book's
     * width of cards — two or three packets — and a card that landed outside the visible
     * part of it would be flown at a position nobody can see.
     *
     * Before the measurement below and not after: this is a scroll, so it moves every
     * slot in the row, and `to` has to be where the card ends up *after* it. The cards
     * already in the row travel to their new positions like they do on any addition, so
     * the shift is animated rather than jumped.
     */
    if (rowRef.current) rowRef.current.scrollLeft = rowRef.current.scrollWidth;

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
       * addition — including the cards from earlier packets, which is what makes a
       * row that spans two packets grow as one row rather than two.
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
     * the cleanup cancels it on an unmount without touching the reveal's timeline.
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

  /**
   * Filing what is on the table: **every** card in the row, and the box it is lying in.
   *
   * Nothing moves here. The doubles leaving and the keepers standing aside happen
   * together and outside this component, because the album is mounted in the same commit
   * that unmounts the opener — so the one thing that can animate across that seam is the
   * overlay `PutAway` owns.
   *
   * The rects are read at the moment of the hand-over, with every card sitting still. A
   * card mid-transform has no box worth measuring, which is why nothing here is animated
   * first.
   *
   * **Clamped into the row's own box.** Once the row scrolls, a card can be sitting
   * outside it — the row clips, so the reader cannot see it — and a fixed clone started
   * from that rect would appear out over the margin where nothing was. Clamping starts it
   * at the edge instead, which reads as a card coming off the end of the pile.
   */
  const putAway = useCallback(() => {
    const row = [...table, ...cardsRef.current];

    /*
     * Land on the finished state, never play it stilled — the rule every sequence on this
     * page follows. With no motion there is nothing to animate, so the page is told there
     * is nothing to file and simply puts the book back with the cards already in it.
     *
     * `fastMode` takes the same door. `snel openen` means "skip the ceremony", and the
     * putting-away is the last third of the ceremony — a bypass that skipped a 16s reveal
     * and then sat through ten seconds of page turns would not be one.
     */
    if (fastMode || prefersReducedMotion()) {
      onPutAway([]);
      return;
    }

    const box = rowRef.current?.getBoundingClientRect();

    onPutAway(
      row.flatMap((card, index) => {
        const rect = slotRefs.current.get(index)?.getBoundingClientRect();
        if (!rect) return [];
        if (!box) return [{ card, from: rect }];

        const left = Math.min(Math.max(rect.left, box.left), box.right - rect.width);
        return [
          {
            card,
            from: new DOMRect(left, rect.top, rect.width, rect.height),
          },
        ];
      }),
    );
  }, [fastMode, onPutAway, table]);

  const finish = useCallback(() => {
    clearTimers();
    setPhase('done');
    setGlowing(false);
    playSlot();
    onFinished(cardsRef.current);
    /*
     * And that is the end of what this component does on its own. **Nothing is scheduled
     * here**: the cards stay on the table and what happens next is the reader's — another
     * packet, or filing them. See the beat 6 block.
     */
  }, [clearTimers, onFinished]);

  /**
   * Mutual recursion between the two halves of the reveal, held in a ref so
   * neither needs to be a dependency of the other.
   */
  const stepRef = useRef<(index: number) => void>(() => {});

  /**
   * Brings card `index` on and plays it through to its hold.
   *
   * `standing` means the card is already on the stage face down, having waited there
   * for the roll — which spends **both** leads before either is asked for. The
   * entrance `FLIP_LEAD_MS` exists to wait out is long over, and `CEREMONY_LEAD_MS`
   * — the beat where a rare card sits looking like any other — has just been held for
   * longer than it asks for, by the network. So the turn is what happens next, and
   * that is the point: the flip is the moment the answer arrives.
   */
  const playCard = (index: number, standing = false) => {
    const card = cardsRef.current[index];
    if (!card) return;

    /*
     * **One commit, and it is load-bearing.** `index.tsx` mounts with legacy
     * `ReactDOM.render`, which does not batch state set from a timeout — and this runs from
     * one. Unbatched, `setCursor` commits on its own: the riser is keyed on the cursor, so a
     * *new* element mounts while `faceUp` and `portraitIn` still describe the card that has
     * just gone, which is to say face up with its face showing. The next commit takes
     * `faceUp` away again, and `.opener__flip` has a transition on `transform` — so the card
     * being brought on rotates from face-up back to face-down and lands on its silhouette,
     * spoiling the pull it is about to make. It is the artefact `HANDOFF_MS` describes, one
     * beat earlier.
     *
     * It was invisible for as long as nothing forced style between those commits: they are
     * all in one task, and the browser is free to compute style once and see only the last
     * of them. A `useLayoutEffect` that read `offsetWidth` on every render was enough to
     * make every one of them real. Batching here does not depend on nobody ever doing that
     * again.
     */
    unstable_batchedUpdates(() => {
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
    });

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
      after(standing ? 0 : CEREMONY_LEAD_MS, () => {
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

    after(standing ? 0 : FLIP_LEAD_MS, () => {
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
    /* Row positions, not this pack's: the cards from earlier packets are ahead of ours. */
    pendingFlip.current = rowIndex(index - 1);

    /*
     * `index.tsx` mounts with legacy `ReactDOM.render`, which does **not** batch
     * state updates inside a timeout — each one commits on its own and runs the
     * FLIP layout effect on its own. Everything here therefore has to land in a
     * single commit.
     *
     * For the last card that was fatal while `done` was a separate results grid:
     * `setLanded` alone committed while the phase was still `revealing`, so the
     * effect flew the card into the row it was about to leave and nulled
     * `pendingFlip`; `setPhase('done')` then threw that DOM away and mounted the
     * grid with no FLIP pending. The grid is gone — `done` renders the same row, so
     * the last card's flight no longer spans a subtree swap — and the batching stays,
     * because two commits still means two runs of the layout effect.
     */
    unstable_batchedUpdates(() => {
      setLanded(index);
      setHeroVisible(false);
      if (isLast) finish();
    });

    if (!isLast) after(HANDOFF_MS, () => playCard(index));
  };

  stepRef.current = revealFrom;

  /**
   * The roll landed. Where it goes from here is whatever the tear did while it was
   * out — see `start`.
   */
  const rollLanded = (drawn: RevealedCard[]) => {
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

    /*
     * Only the stalled case has anything to do here. Otherwise the tear is still
     * running and its own timer brings the first card on, exactly as it always did —
     * the cards simply happen to be sitting in `cardsRef` by the time it fires.
     */
    if (stalled.current) playCard(0, true);
  };

  /**
   * The roll was refused. Nothing to reveal, and no ending to invent.
   *
   * Reachable in a way it was not before: the roll used to be awaited before anything
   * moved, so a refusal left the packet sealed and the page stuck behind an exit
   * button that hides itself for the reveal — wrong, but quietly. Something has
   * visibly begun now, so it has to visibly end, and the page is the only thing that
   * can put the packet away.
   */
  const failed = (reason: unknown) => {
    clearTimers();
    onFailed(reason);
  };

  /**
   * The claim and the tear, deliberately in that order and deliberately not awaited
   * in it.
   *
   * `onOpen` is a network call — one full leaderboard replay — and awaiting it before
   * playing anything meant the packet lay in your hand doing nothing for as long as
   * the server took. The click had no consequence until the response landed, which
   * reads as a click that was dropped rather than as a wait. So the tear plays on the
   * click and the roll runs underneath it.
   *
   * The two then meet in `rollLanded`, whichever way round they finish:
   *
   * - **Cards first** — the ordinary case, since the tear is 840ms real at the
   *   settled pacing. Nothing waits, and nothing about the reveal changes at all.
   * - **Tear first** — the first card still rises out of the wrapper and stands there
   *   face down until there is something to turn it into. Only the *flip* is
   *   withheld, because the flip is the only beat that needs to know what the card is.
   *
   * That split is what makes the wait legible: a face-down card is a card you are
   * waiting on, where a torn wrapper with nothing under it is a page that has hung.
   *
   * No longer `async`, because there is nothing left in it to await.
   */
  const start = () => {
    if (phase !== 'sealed' || started.current) return;
    started.current = true;

    // Before the roll, not after: the pile must not stay clickable across it.
    onStart?.();

    void onOpen().then(rollLanded, failed);

    // Nothing to tear through — `rollLanded` takes these straight to the results.
    if (fastMode || prefersReducedMotion()) return;

    playTear();
    setPhase('tearing');
    after(TEAR_MS, () => {
      if (cardsRef.current.length > 0) {
        revealFrom(0);
        return;
      }

      stalled.current = true;
      setPhase('waiting');
    });
  };

  /**
   * Whether there is anything on the table to be filed. Nothing is, mid-reveal: the cards
   * are still coming out of the packet and the row is not a finished thing to act on.
   */
  const canFile = (phase === 'sealed' || phase === 'done') && table.length + cards.length > 0;

  /**
   * Putting the packet down, which means two different things.
   *
   * With an empty table it is the way back to the album — the packet goes back on the
   * shelf and nothing has happened. With cards already on the table it is "I have stopped
   * opening", which is the same decision as clicking the cards, so it files them. Both are
   * the same gesture on the same object: the packet is put down.
   */
  const putDown = () => {
    if (table.length > 0) putAway();
    else onPutBack();
  };

  /*
   * The keyboard's half of both.
   *
   * The exit was a real button and so was in the tab order for free; a stretch of table
   * and a row of cards are not, and losing it must not cost a keyboard reader the way out.
   *
   * Registered per render rather than once, so `phase` is never stale. A listener that
   * still thought the packet was sealed would put back a packet that was already open.
   */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (phase === 'sealed') putDown();
      else if (canFile) putAway();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

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
  const isIcoon = current !== undefined && current.player.isIcon;

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

  /*
   * **The line under the row says what can be done and never what happened.**
   *
   * It read "2 nieuwe kaarten voor je album", and before that claimed "toegevoegd aan je
   * album" — the page saying in words what nothing on screen did, about a write the server
   * had made some time ago. Both are gone, and for the same reason: the reader has just
   * watched every one of these cards turn over, and the row in front of them *is* the count.
   * A line tallying it is a receipt for a transaction that was witnessed.
   *
   * What is left is the one thing the objects cannot say for themselves — that they can be
   * acted on, and how. An all-doubles row says nothing about being all doubles, which is the
   * right kind of silence: none of those cards got a reveal beat or a green rim, and that
   * beat is what *means* new — see "New, not duplicate" in the design doc.
   */

  return (
    <div className="opener">
      {/*
        Three rows in one column, always: the stage, the table, and the line under it. Only
        the stage changes with the phase — the other two are rendered once, below.

        The column re-laid itself out at the tear when the wrapper phase was shorter and had
        no row beneath it: `justify-content: center` put the packet lower than the stage it
        was about to become, and the first card rose several dozen pixels above where you had
        just clicked. The stage's fixed `--pack-h` is the other half of that, and the row's
        `min-height` — one card, whether it holds any or not — is the third; see packopen.css.
      */}
      {phase === 'sealed' ? (
        /*
          The stretch of table the packet is lying on, and it is the way to put it down:
          click the wood beside it and the packet goes back on the shelf — or, with cards
          already on the table, it files them, because putting the packet down when you
          have a row in front of you *is* "I have stopped opening". See `putDown`.

          **Only while it is sealed**, which is what makes it a coherent rule rather than
          an escape hatch — up to the tear nothing has happened, so putting the packet
          down is a real thing to do to it. Past the tear the cards are the thing to act
          on.

          `--table` stretches the row across the middle of the layout so the target is
          the table rather than the two inches either side of the packet; see
          packopen.css.
        */
        <div className="opener__stage opener__stage--table" onClick={putDown}>
          <div
            className="pack"
            style={foil}
            /* Or the wood underneath would put down the packet you just opened. */
            onClick={(e) => {
              e.stopPropagation();
              start();
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') start();
            }}
          >
            <PackFace pack={pack} />
          </div>
        </div>
      ) : null}

      {phase === 'tearing' ? (
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
      ) : null}

      {/*
        One branch for all three, and not for brevity.

        `waiting` is this same stage with `current` undefined — every light layer off,
        the flip not yet turned, and a card back that is simply the front face not
        knowing what it is yet. Splitting it out would remount the riser at the moment
        the cards landed and replay its entrance.

        `done` is this same stage, standing empty. **There is no results grid**: the row
        below is the ending, so the last card's flight lands where all the others did and
        nothing about the column changes at the moment the reveal finishes. The empty
        stage stays above it for the same reason it always did — `--pack-h` is reserved
        whatever is standing in it, and the row must not move — and it is also where the
        next packet appears if the reader reaches for one. See the beat 6 block.
      */}
      {phase === 'revealing' || phase === 'waiting' || phase === 'done' ? (
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
                  flagged && current?.isNew ? 'opener__flip--new' : '',
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
                  {/*
                    Absent for the whole of `waiting`, which costs nothing: the front
                    face is turned away and back-face culled, so there is nothing to
                    render there until the roll says what it is.
                  */}
                  {current ? (
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
                  ) : null}
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
        </>
      ) : null}

      {/*
        **The table, and it belongs to the sitting rather than to the packet.** One row for
        every phase: the cards from earlier packets first, then whatever this one has
        turned over so far. That is what makes a second packet add to the row instead of
        replacing it — and it is why the row is rendered here rather than inside the phase
        branches, where it was three separate elements that happened to look alike.

        Clicking it files everything on it. The row is the record of what you opened, so
        the click is a decision with a real alternative beside it — the shelf is live —
        rather than a "continue". See the beat 6 block.

        `role="button"` over a row of cards rather than a button element around them: it
        has to stay the flex row the reveal's FLIP lands in, and a button's own box would
        be a second layout for the cards to arrive in.
      */}
      <div
        className="opener__revealed"
        ref={rowRef}
        role={canFile ? 'button' : undefined}
        tabIndex={canFile ? 0 : undefined}
        aria-label={canFile ? 'Leg de kaarten in je album' : undefined}
        onClick={canFile ? putAway : undefined}
        onKeyDown={
          canFile
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  putAway();
                }
              }
            : undefined
        }
      >
        {/*
          An inner box, because the row scrolls once it holds more than a book's width of
          cards. `margin: auto` on it centres a short row and collapses to nothing on a
          long one, which is the one way to have both without a centred overflow clipping
          its own start. See `.opener__hand` in packopen.css.
        */}
        <div className="opener__hand" ref={handRef}>
          {[...table, ...cards.slice(0, landed)].map((card, i) => (
            <div
              key={`${card.player.id}-${i}`}
              ref={setSlotRef(i)}
              className={`opener__slot${card.isNew ? ' opener__slot--new' : ''}`}
            >
              {/*
                `eager` is load-bearing here, not a precaution. The slot is a *fresh*
                element — the FLIP inverts it onto the hero's rect rather than moving the
                hero itself — so a lazy portrait misses the first frame of the descent and
                the card blinks to bare metal. See the prop's note in PlayerCard.
              */}
              <PlayerCard card={card} eager />
            </div>
          ))}
        </div>
      </div>

      {/*
        Kept for its box, and empty except while a packet is lying there sealed: the line
        is a spacer as much as a caption, and dropping the element would shorten the column
        at the tear and again at the ending.

        It says what can be done and never what happened — the cards are the record of
        that. See the note above the return.
      */}
      <div className="opener__hint">
        {phase === 'sealed'
          ? canFile
            ? 'klik op het pakje, of op de kaarten om ze in je album te leggen'
            : 'klik op het pakje — of ernaast om het terug te leggen'
          : phase === 'done'
            ? 'klik op de kaarten om ze in je album te leggen'
            : ' '}
      </div>
    </div>
  );
};

export default PackOpener;
