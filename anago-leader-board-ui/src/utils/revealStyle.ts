/**
 * Which shape the silhouette beat takes — the shard family, plus the one
 * survivor of the first round.
 *
 * Temporary, exactly like `stageTheme.ts` and `albumStyle.ts`: this exists so
 * the candidates can be compared on real pulls rather than argued about. Once
 * one is chosen, fold its rules into card.css / packopen.css, bring its timings
 * back into `PackOpener.tsx` as constants, and delete this module, `reveal.css`
 * and `cardPieces.ts` along with the switcher.
 *
 * Applied as a class on <html>, so a single swap re-times the card's reveal and
 * the light over it together. The durations have to live here rather than in the
 * CSS because the same numbers schedule the rim, the chime and the hold — see
 * `PackOpener.tsx`, which is the only reader.
 *
 * ---------------------------------------------------------------------------
 * Round one, settled
 *
 * Six candidates were compared: the shipped expanding circle (A), a photographic
 * develop (B), a teletekst line paint (C), a charge-and-cool inside the
 * silhouette (D), a three-stage fracture (E) and a long wait resolved by one cut
 * (F). **D won and is kept.** A, B, C and F are deleted rather than parked — the
 * shard family below is the direction, and a switcher with ten entries is a
 * switcher nobody uses.
 *
 * What round one established, and what everything below inherits:
 *
 * - **Something must accumulate.** An even gesture has no payoff in it, which is
 *   what was wrong with the circle. Build slow, land fast: 60–80% of the length
 *   goes almost nowhere and it resolves in the last fifth.
 * - **The card recoils.** Under 200ms, never more than 3%, on `.card` so the
 *   rim's `box-shadow` pops with it. Independent of which candidate wins, and
 *   the single largest improvement of the round.
 * - **The accent is single.** `rimAt` is the frame a candidate discharges on,
 *   and the rim, the chime and the last visual change all land there together.
 * - **The eyes are the payoff.** Nothing may make the face nameable before the
 *   discharge.
 * - Nothing here is level-aware; the gold build runs entirely before the flip.
 *
 * ---------------------------------------------------------------------------
 * Round two: the shard family
 *
 * The card breaks into seven to eleven cells that tile it exactly, and their
 * skins take their shapes one at a time. Shape, count and order are generated
 * per card from the player id.
 *
 * Three attempts got this wrong, and each mistake is worth keeping written down
 * because all three look reasonable on paper:
 *
 * - **Pieces flew onto the surface.** First from off-card, then from behind the
 *   figure. Both read as objects being placed rather than as a card resolving.
 *   **Nothing travels now** — a skin takes its shape where the shape already is,
 *   and any future version that moves a cell across the card is this again.
 * - **Every card broke into the same arrangement.** A jittered grid moves seams
 *   a few percent and never changes the picture. Seeds are now placed by one of
 *   three break modes with a per-card cell count — see `cardPieces.ts`.
 * - **The seams were a glow around each filled piece.** A `drop-shadow` can only
 *   halo something already there, so it can never draw the edge *between* two
 *   states, and every internal edge stayed drawn on a finished card. A seam is
 *   now the **frontier**: a stroked line that exists exactly where revealed
 *   meets unrevealed, lighting when the first of its two cells fills and dying
 *   when the second does. Two filled neighbours have no line between them, and
 *   at the end there is no frontier anywhere, so nothing is left to remove.
 *
 * The gaps accelerate: the first cell is alone for the best part of a second and
 * every wait after it is shorter. That makes the beat ~3.4s real at the settled
 * ×2, or about 4.4s post-flip for a new card. **Deliberate**, and the trade is
 * the one already recorded for the silhouette beat: click-to-skip covers the
 * impatient case, and the long version gets rarer on its own as the album fills.
 *
 * **Every shard gets the same tick as it lands**, scheduled in `PackOpener` off
 * the same `at` fractions the CSS animates from, so a sound cannot drift off the
 * shape it belongs to. One sound at the start and silence after it made the
 * opening shard the event and every other one decoration, which is backwards.
 *
 * ---------------------------------------------------------------------------
 * Round three, settled: the only visible axis is granularity
 *
 * Five shard candidates were compared and **four were cut for being
 * indistinguishable** from the plain snap: a skin pulling tight onto its shape,
 * a skin flooding it from the centre, and two that announced shapes one and
 * three fills ahead of their skins.
 *
 * That is a general result and not a verdict on those four. The seizing is over
 * inside a frame and the eye is on the card rather than on any one cell, so
 * anything that varies *how a single cell resolves* cannot be seen. What can be
 * seen is **how many cells there are and how fast they come** — which is why the
 * two survivors differ on exactly that and on nothing else.
 */

export interface RevealPieces {
  /**
   * Ratio between one wait and the next. Always below 1: the first cell sits
   * alone for the best part of a second and is a single deliberate event, and
   * every wait after it is shorter, so the sequence ends in a rush.
   */
  ease: number;
  /**
   * How many cells a card breaks into, inclusive, drawn per card from the id.
   *
   * The only axis that turned out to be visible, so it is the one the two shard
   * candidates differ on. Doubling it roughly halves a cell's area — and `ease`
   * has to move with it, or the extra cells are all spent in a tail where the
   * last ones land inside a single frame.
   */
  count: [number, number];
  /**
   * Where the last cell fills. 0.94 leaves just a settle; the silhouette-first
   * variant lands it far earlier, because everything after it is a further beat.
   */
  lastAt: number;
}

export interface RevealStyle {
  id: string;
  label: string;
  /** The silhouette alone, before anything starts happening to it. */
  leadMs: number;
  /**
   * The whole reveal motion. Published to CSS as `--reveal-ms`, which every rule
   * in reveal.css phrases itself in fractions of, so the two cannot drift.
   */
  revealMs: number;
  /**
   * Where in the motion it discharges, as a fraction. The green rim lights here
   * and the chime is delayed to it. **Not a taste figure** — it is the frame the
   * candidate lands on, and for the shard family that is the last piece.
   */
  rimAt: number;
  /**
   * Present on the shard candidates only. Its absence is what tells `PlayerCard`
   * to render a single portrait rather than a broken one.
   */
  pieces?: RevealPieces;
  /**
   * **Silhouette-first**: the flip lands on bare metal and the overall, with no
   * figure at all, and what the effect reveals is a *glowing silhouette*. The
   * face and the name arrive after that, as a separate final beat.
   *
   * Three stages rather than two — how good → who's shape → who — against the
   * settled beat's how good → it's new → who. The silhouette stops being the
   * thing that is in the way and becomes the thing that is being delivered, so
   * the effect gets something to do that is not just uncovering a photo.
   *
   * Drives a `card--via` class in `PlayerCard`, which is what puts a silhouette
   * inside each shard instead of a portrait.
   */
  viaSilhouette?: boolean;
  /**
   * Renders the reveal's own **full-screen bloom and vignette**, the pair the
   * gold ceremony already uses — but green, on the reveal's clock, and with the
   * vignette's clear centre sized to the card.
   *
   * The point is emphasis rather than output. Every card-sized glow tried so far
   * failed the same way: a soft gradient with nothing dark next to it just makes
   * the screen faintly green, and the layer sits over the card washing out the
   * figure it is supposed to be dramatising. Darkening everything that is *not*
   * the card costs no light at all and cannot wash it out — which is the note
   * already written over `.opener__dim` in packopen.css, in gold.
   */
  stageBloom?: boolean;
}

export const REVEAL_STYLES: RevealStyle[] = [
  /*
   * Round one's winner. The silhouette charges from within — tier ink to green
   * to white-hot — holds at the top with nothing else moving, and then the light
   * drains and leaves a face behind it. The only candidate that resolves by
   * subtraction.
   *
   * Still here because it may not be an either/or: the open idea is **glow up to
   * 84 and shards from 85**, so the break becomes what the top of the scale gets
   * rather than what every new card gets. Nothing has been built for that — both
   * are whole-beat candidates today and the switcher picks one for all cards.
   */
  { id: 'd', label: 'D · gloeien', leadMs: 140, revealMs: 820, rimAt: 0.62 },

  /*
   * **D, with one value changed.** The card turns over into bare metal and its
   * overall — no figure at all — and the charge is what brings the figure in.
   * Every timing is D's, every keyframe is D's, and the whole difference in the
   * animation is the silhouette's opacity at 0%: `0.8` on D, `0` here. See
   * `reveal-charge-via` in reveal.css.
   *
   * At 0.8 the figure was already sitting there in tier ink, so the charge only
   * lit something you had been looking at for a second. From nothing, the same
   * ramp is a reveal. That is the entire idea and it needed nothing else.
   *
   * **It had a great deal else, and all of it came out.** A bespoke ramp with a
   * readable-green plateau, nine keyframes instead of five, a much larger
   * three-shadow bloom, its own stage bloom and vignette, and a longer
   * `revealMs` to fit them. Each was reasoned from "the charge has an extra job
   * now — it must deliver a figure legibly before burning it out", which is not
   * a silly thought. But every one of them made E harder to compare against the
   * thing it is a variant *of*, and the comparison is the only reason it exists.
   * The plateau in particular played as a dead 300ms freeze.
   *
   * **One variable.** If E is ever to beat D it has to be because of where the
   * ramp starts, and nothing else may be in the way of seeing that.
   */
  { id: 'e', label: 'E · silhouet uit gloed', leadMs: 140, revealMs: 820, rimAt: 0.62 },

  /*
   * A shape lights and its skin is simply there with it, whole, on that frame.
   * No motion of any kind — the card is one shape more revealed than it was, and
   * the seams around it are the proof.
   *
   * **Five alternatives to this were cut**, and the reasons split cleanly in two.
   *
   * Four were cut for being *indistinguishable*: a skin pulling tight onto its
   * shape, a skin flooding it from the centre, and two that announced shapes one
   * and three fills ahead of their skins. The seizing is over inside a frame and
   * the eye is on the card rather than on any one cell, so anything that varies
   * *how a single cell resolves* cannot be seen. Do not propose a sixth.
   *
   * The fifth was the coarse break — the same thing at seven to eleven cells
   * rather than fourteen to twenty-two. That one was perfectly visible and lost
   * on its merits: how many cells there are and how fast they come is the only
   * axis that reads, and the finer break is the better answer to it.
   *
   * **`ease` moves with the count and is not a free choice.** The gaps are a
   * geometric series, so at the coarse break's 0.76 the sum barely grows as
   * cells are added — doubling the count at that ratio would spend every extra
   * shard in a tail where the last ones land inside a single frame. At 0.87 an
   * eighteen-cell card opens on a ~690ms wait and closes on ~75ms, which stays
   * legible the whole way down.
   *
   * **2400 is derived from that, not chosen.** It is what puts the opening cell
   * alone for the best part of a second at the settled ×2, which is the weight
   * the whole beat is built around. Change `ease` or `count` and it has to be
   * re-derived or the weight goes.
   *
   * Costs ~4.8s of motion, so about 6.2s post-flip per new card and ~32s for a
   * five-new-card pack. Deliberate; see the trade recorded in `PackOpener`.
   */
  {
    id: 'h',
    label: 'H · scherven',
    leadMs: 180,
    revealMs: 2400,
    /* The last cell filling. `LAST_AT` in cardPieces.ts is the same number. */
    rimAt: 0.94,
    pieces: { ease: 0.87, count: [14, 22], lastAt: 0.94 },
  },

  /*
   * H, silhouette-first. The card turns over into bare metal and its overall,
   * and what the break delivers is a **glowing silhouette, one shard at a time**
   * — the figure assembling out of nothing. Then it dissolves and the face is
   * underneath it.
   *
   * The shards are exactly H's: same geometry, same schedule, same frontier
   * seams. Only what is inside them changed, from a fragment of the photo to a
   * fragment of the lit figure.
   *
   * **The face arrives with the last shard, not after it.** There was a held
   * beat here — `lastAt` 0.78 against a face at 0.88, so the assembled figure
   * stood complete for ~580ms first. It read as a stall. The reasoning was that
   * three stages need three slots, and it was wrong: the last shard *is* the
   * figure completing, so anything after it is the card waiting rather than
   * resolving. 0.88 and 0.90 are ~100ms apart, which is close enough to be one
   * event and far enough that the last shard is seen.
   *
   * **I and J differ only in where the bloom comes from**, which is the one
   * thing left to decide about this shape.
   *
   * **Watch the empty cells.** A silhouette covers maybe half the card, so a
   * shard out at a corner delivers nothing but its own seams. That may read as
   * the figure emerging within a spreading crack network, or as half the shards
   * doing nothing — it is the one thing about this that cannot be reasoned out.
   */
  {
    id: 'i',
    /*
     * **The light comes out of the figure.** One bloom on the shard layer,
     * tracing the alpha of everything landed so far — so it is shaped like the
     * person, exists only around the parts that have arrived, and grows for free
     * as more of them do. A ramp on top of that makes it intensify.
     *
     * One filter rather than one per shard, which is both cheaper and more
     * correct: the union of the landed shards is exactly "the figure so far",
     * and twenty-two separate glows cannot add up to a single light source.
     */
    label: 'I · gloed uit het figuur',
    leadMs: 180,
    /* 0.88 of this is the shard run, which puts it within ~5% of H's absolute
       pacing — the two are comparable as breaks, not just as ideas. */
    revealMs: 2550,
    /* The face landing. The accent belongs to whatever ends the reveal. */
    rimAt: 0.9,
    pieces: { ease: 0.87, count: [14, 22], lastAt: 0.88 },
    viaSilhouette: true,
  },
  /*
   * The same break, lit the way the gold ceremony lights a card: a **full-screen
   * bloom with a vignette under it**, the surround pulled down as the green
   * comes up, so the card is the bright clear thing in a darkened room.
   *
   * Every card-sized glow tried before this failed identically — a soft gradient
   * with nothing dark beside it just tints the screen, and painted over the card
   * it erases the figure it is meant to dramatise. This is the one shape of
   * answer already proven in this codebase, and it is proven precisely because
   * it spends contrast instead of light.
   *
   * The trade is that it dims the whole page on every new card, not just on a
   * rare one. That is the thing to judge, and it is why this is a candidate
   * rather than simply the fix.
   */
  {
    id: 'j',
    label: 'J · kaart uitgelicht',
    leadMs: 180,
    revealMs: 2550,
    rimAt: 0.9,
    pieces: { ease: 0.87, count: [14, 22], lastAt: 0.88 },
    viaSilhouette: true,
    stageBloom: true,
  },
];

const KEY = 'tafelvoetbal.cards.revealStyle';

const byId = (id: string | null): RevealStyle | undefined =>
  REVEAL_STYLES.find((style) => style.id === id);

const load = (): RevealStyle => {
  try {
    /* A stored id from round one no longer resolves, and falls through here. */
    return byId(window.localStorage.getItem(KEY)) ?? REVEAL_STYLES[0];
  } catch {
    return REVEAL_STYLES[0];
  }
};

let current = load();

const publish = (): void => {
  const root = document.documentElement;
  REVEAL_STYLES.forEach((style) => root.classList.remove(`reveal-${style.id}`));
  root.classList.add(`reveal-${current.id}`);
};

publish();

export const getRevealStyle = (): RevealStyle => current;

export const setRevealStyle = (id: string): RevealStyle => {
  current = byId(id) ?? REVEAL_STYLES[0];
  try {
    window.localStorage.setItem(KEY, current.id);
  } catch {
    /* private browsing — applies for this session only */
  }
  publish();
  return current;
};
