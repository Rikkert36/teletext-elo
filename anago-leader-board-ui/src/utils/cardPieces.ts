/**
 * The card, broken into pieces — geometry, seams and schedule for the shard
 * reveal.
 *
 * A card breaks into seven to eleven cells that **tile it exactly**: no gaps, no
 * overlaps, and together they are the whole card. That is what makes them read
 * as one object coming apart rather than as fragments piled on top of each
 * other, and it is also what lets the finished state be pixel-identical to a
 * plain card — nine opaque skins that tile *are* the photo.
 *
 * **Voronoi, by half-plane clipping.** Each cell is the region closer to its own
 * seed than to any other, built by starting from the whole card and clipping it
 * against the perpendicular bisector of every other seed in turn
 * (Sutherland–Hodgman). It cannot produce a gap or an overlap, which a
 * hand-drawn set of polygons absolutely would.
 *
 * Everything is deterministic from the player id: a card always breaks the same
 * way, and no two players break alike. `Math.random()` would re-roll on every
 * render, and since these end up as custom properties that animations read, a
 * cell mid-fill would jump to a new shape each time any state in the opener
 * changed.
 *
 * ---------------------------------------------------------------------------
 * The seams are the frontier, not a per-cell decoration
 *
 * **A seam exists exactly where revealed meets unrevealed.** When two
 * neighbouring cells are both filled, the line between them stops existing — it
 * is not cooled off or faded for effect, it is *consumed*, because there is no
 * longer an unrevealed side for it to be the edge of. By the end the whole card
 * is revealed, so there is no frontier anywhere and the network is simply gone.
 *
 * That is why this module returns an **edge list** and not just polygons. Every
 * internal edge knows its two cells, so its life is fully determined: it lights
 * when the first of them fills and dies when the second does. Stroking each cell
 * separately would draw every internal edge twice and leave a permanent web of
 * lines across a finished card, which is the opposite of the rule.
 *
 * Edges against the card's own border are **not** returned. The outside of the
 * card is not unrevealed territory, it is not territory at all, and a green line
 * hugging the border would fight the rim that lives there.
 *
 * ---------------------------------------------------------------------------
 * Why the seeds are not on a grid
 *
 * An earlier version jittered a 3×4 grid, and every card broke into the same
 * *arrangement* — one roughly central cell ringed by the rest. The jitter moved
 * the seams a few percent and changed nothing you could see.
 *
 * Two changes fix that, and both are needed: a **break mode** per card, so seeds
 * are placed on genuinely different principles, and a **piece count** per card,
 * because count is the coarsest thing the eye reads.
 *
 * Seeds are placed by **best-candidate sampling**: each new seed is the farthest
 * of twelve tries from everything already placed. Uniform random points clump,
 * and a clump means a sliver — a cell whose fill is invisible, which costs a
 * beat. Best-candidate always terminates, which rejection sampling does not.
 */

/** Card proportions. Seeds, bisectors and the seam SVG all use this space. */
const W = 100;
const H = 140;

/**
 * How far past the card the starting rectangle reaches.
 *
 * The edge cells have to over-cover, or antialiasing along the card's own border
 * leaves a hairline of ground showing between the outermost skin and the card
 * edge. Costs nothing: everything outside is clipped by the card anyway.
 */
const BLEED = 3;

/** Tries per seed for best-candidate sampling. */
const CANDIDATES = 12;

/** Below this, in card units, an edge is a rounding artefact rather than a seam. */
const MIN_EDGE = 0.6;

/** Marks an edge of the starting rectangle: no neighbour on the other side. */
const FRAME = -1;

export interface CardCell {
  /** Ready for `clip-path`. The shape the skin snaps to. */
  clip: string;
  /**
   * When this cell's skin takes the shape, as a fraction of the reveal motion.
   * Published as `--at`.
   */
  at: number;
  /**
   * The gap to the next cell, same units. Candidates whose skin takes the shape
   * over time rather than in one frame scale their motion by this, so the first
   * cell's take is as unhurried as its wait and the last few are as quick.
   */
  gap: number;
  /** Centre of the cell, in percent of the card. For fills that grow outward. */
  cx: number;
  cy: number;
  /** The cell that fills last. Carries the accent. */
  last: boolean;
}

export interface CardSeam {
  /** Endpoints in the seam SVG's viewBox, which is card space. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /**
   * The two moments of a seam's life, as fractions of the motion.
   *
   *   front  one of its cells has filled, so this edge is now the boundary
   *          between revealed and unrevealed. It is drawn.
   *   gone   the other cell has filled too. There is no unrevealed side left,
   *          so the seam stops existing.
   *
   * There is deliberately no third moment for announcing a shape ahead of its
   * skin. Two candidates did that — one shape pending, then three — and neither
   * was distinguishable from this on a real pull, so both were cut.
   */
  front: number;
  gone: number;
}

export interface CardBreak {
  cells: CardCell[];
  seams: CardSeam[];
}

interface Point {
  x: number;
  y: number;
}

/**
 * A polygon vertex that also carries the identity of the edge *starting* at it.
 *
 * Tagging the edges during clipping is the only cheap way to recover which cell
 * is on the other side of each one. Deriving it afterwards would mean matching
 * floating-point endpoints between cells, which is exactly the kind of thing
 * that works on eleven cards and fails on the twelfth.
 */
interface Vertex extends Point {
  /** Index of the neighbouring cell across this edge, or `FRAME`. */
  across: number;
}

/**
 * Deterministic 0..1 from a string and a salt. FNV-1a, then the classic
 * `fract(sin(n) * large)` on the result — the hash alone is well distributed
 * across ids but consecutive salts land in visible stripes, and the sine breaks
 * that up.
 */
const hash = (id: string, salt: number): number => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const x = Math.sin((h >>> 0) / 4294967296 + salt * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Clips a tagged polygon to the half-plane of points at least as close to `keep`
 * as to `drop`, tagging every edge it creates with `dropIndex`.
 *
 * The bisector test is linear and needs no square roots: for
 * `f(p) = 2(drop - keep)·p + |keep|² - |drop|²`, `f(p) <= 0` is exactly the set
 * of points nearer `keep`.
 */
const clipToBisector = (
  poly: Vertex[],
  keep: Point,
  drop: Point,
  dropIndex: number,
): Vertex[] => {
  const ax = 2 * (drop.x - keep.x);
  const ay = 2 * (drop.y - keep.y);
  const c = keep.x * keep.x + keep.y * keep.y - (drop.x * drop.x + drop.y * drop.y);
  const f = (p: Point): number => ax * p.x + ay * p.y + c;

  const out: Vertex[] = [];
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const fa = f(a);
    const fb = f(b);

    if (fa <= 0) out.push(a);

    if ((fa <= 0) !== (fb <= 0)) {
      const s = fa / (fa - fb);
      const p = { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s };
      /*
       * Which edge starts at the crossing decides the tag. Leaving the region,
       * the next edge runs *along the bisector* and so belongs to the neighbour;
       * entering it, the next edge is the surviving remainder of `a→b` and keeps
       * whatever that already was.
       */
      out.push({ ...p, across: fa <= 0 ? dropIndex : a.across });
    }
  }
  return out;
};

const centroid = (poly: Point[]): Point => {
  const sum = poly.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / poly.length, y: sum.y / poly.length };
};

/** `x` is already a percentage of the width; `y` has to come back out of card space. */
const toClip = (poly: Point[]): string =>
  `polygon(${poly
    .map((p) => `${p.x.toFixed(2)}% ${((p.y / H) * 100).toFixed(2)}%`)
    .join(', ')})`;

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

/* ------------------------------------------------------------------ *
 * Break modes
 *
 * Three ways of proposing where a seed might go. The arrangement of a break —
 * even fragments, or fine debris against slabs, or bands across an axis — is
 * decided entirely here, and it is the only thing that makes one card's break
 * look unrelated to the next one's.
 * ------------------------------------------------------------------ */

type BreakMode = 'scatter' | 'cluster' | 'strata';

const MODES: BreakMode[] = ['scatter', 'cluster', 'strata'];

const propose = (
  mode: BreakMode,
  id: string,
  salt: number,
  focus: Point,
  axis: number,
): Point => {
  const a = hash(id, salt);
  const b = hash(id, salt + 0.37);

  if (mode === 'cluster') {
    /* Distance biased hard toward the focus (`^1.9`), so the break is fine where
       it happened and coarse away from it. Angle is free. */
    const ang = a * Math.PI * 2;
    const r = b ** 1.9 * H * 0.78;
    return {
      x: clamp(focus.x + Math.cos(ang) * r, 4, W - 4),
      y: clamp(focus.y + Math.sin(ang) * r, 5, H - 5),
    };
  }

  if (mode === 'strata') {
    /* Strung along one axis with a little lateral spread: seeds in a line give
       cells that are bands across it. */
    const along = (a - 0.5) * H * 1.15;
    const across = (b - 0.5) * W * 0.42;
    return {
      x: clamp(W / 2 + Math.cos(axis) * along - Math.sin(axis) * across, 4, W - 4),
      y: clamp(H / 2 + Math.sin(axis) * along + Math.cos(axis) * across, 5, H - 5),
    };
  }

  return { x: 4 + a * (W - 8), y: 5 + b * (H - 10) };
};

export interface BreakOptions {
  /** Deterministic seed. The player id, so a card always breaks the same way. */
  id: string;
  /**
   * Ratio between one gap and the next. Always below 1: the first cell sits
   * alone for about a second, and every wait after it is shorter, so the
   * sequence ends in a rush.
   */
  ease: number;
  /**
   * How many cells a card breaks into, inclusive. Drawn per card from the id.
   *
   * **Count is the coarsest thing the eye reads**, so it has to move per card or
   * every break looks related whatever the seeds do — and it is also the knob
   * that decides how fine the break is overall. Doubling it roughly halves the
   * area of a cell.
   */
  count: [number, number];
}

/** Where the last cell fills. The rest of the motion is the card settling. */
const LAST_AT = 0.94;

export const breakFor = ({ id, ease, count: range }: BreakOptions): CardBreak => {
  const mode = MODES[Math.floor(hash(id, 3.1) * MODES.length)];
  const count = range[0] + Math.floor(hash(id, 5.7) * (range[1] - range[0] + 1));
  const focus = { x: 8 + hash(id, 11.3) * (W - 16), y: 10 + hash(id, 13.9) * (H - 20) };
  const axis = hash(id, 17.5) * Math.PI;

  const seeds: Point[] = [];
  for (let i = 0; i < count; i += 1) {
    let best: Point | null = null;
    let bestD = -1;
    for (let k = 0; k < CANDIDATES; k += 1) {
      const c = propose(mode, id, i * 31 + k * 7 + 101, focus, axis);
      const d = seeds.reduce(
        (m, s) => Math.min(m, (s.x - c.x) ** 2 + (s.y - c.y) ** 2),
        Infinity,
      );
      if (d > bestD) {
        bestD = d;
        best = c;
      }
    }
    seeds.push(best as Point);
  }

  const frame: Vertex[] = [
    { x: -BLEED, y: -BLEED, across: FRAME },
    { x: W + BLEED, y: -BLEED, across: FRAME },
    { x: W + BLEED, y: H + BLEED, across: FRAME },
    { x: -BLEED, y: H + BLEED, across: FRAME },
  ];

  const cells = seeds.map((seed, i) => {
    let poly = frame;
    seeds.forEach((other, j) => {
      if (i !== j) poly = clipToBisector(poly, seed, other, j);
    });
    return poly;
  });

  /* ---------------------------------------------------------------- *
   * The schedule
   *
   * Gaps accelerate: the first cell sits alone for about a second and is a
   * single deliberate event, and every wait after it is `ease` times shorter, so
   * the sequence ends in a rush.
   *
   * Normalised to the motion afterwards, so a seven-cell card and an eleven-cell
   * card take exactly as long as each other. That is the same rule that made the
   * beat's length independent of the name: one duration for everybody, whatever
   * they broke into.
   * ---------------------------------------------------------------- */
  const order = cells.map((_, i) => i);
  /* Fisher–Yates on the deterministic hash. A plain `sort` by hash value is
     biased by the comparator, and the bias is visible as a diagonal. */
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(hash(id, i + 197) * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const raw: number[] = [0];
  for (let p = 1; p < order.length; p += 1) raw[p] = raw[p - 1] + ease ** (p - 1);
  const span = raw[raw.length - 1] || 1;
  /** Fill time by *position in the sequence*, not by cell. */
  const atByPosition = raw.map((r) => (r / span) * LAST_AT);

  const outCells: CardCell[] = new Array(cells.length);
  const positionOf: number[] = new Array(cells.length);

  order.forEach((cell, position) => {
    const poly = cells[cell];
    const c = centroid(poly);
    positionOf[cell] = position;
    outCells[cell] = {
      clip: toClip(poly),
      at: atByPosition[position],
      gap:
        position + 1 < atByPosition.length
          ? atByPosition[position + 1] - atByPosition[position]
          : /* The last cell has no successor; give it the previous gap so a
               candidate that scales its take by the gap still has a number. */
            atByPosition[position] - atByPosition[position - 1] || LAST_AT,
      cx: c.x,
      cy: (c.y / H) * 100,
      last: position === cells.length - 1,
    };
  });

  /* ---------------------------------------------------------------- *
   * The seams
   *
   * One entry per *internal* edge, deduplicated by taking it from the
   * lower-indexed of its two cells — every internal edge is produced twice, once
   * from each side, and drawing both would double every line on the card.
   * ---------------------------------------------------------------- */
  const seams: CardSeam[] = [];

  cells.forEach((poly, i) => {
    poly.forEach((a, k) => {
      const j = a.across;
      if (j === FRAME || j < i) return;

      const b = poly[(k + 1) % poly.length];
      if (Math.hypot(b.x - a.x, b.y - a.y) < MIN_EDGE) return;

      const ai = outCells[i].at;
      const aj = outCells[j].at;

      seams.push({
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        front: Math.min(ai, aj),
        gone: Math.max(ai, aj),
      });
    });
  });

  return { cells: outCells, seams };
};

/** The seam SVG's viewBox, so the markup and this module cannot disagree. */
export const SEAM_VIEWBOX = `0 0 ${W} ${H}`;
