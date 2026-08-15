import { JHF, JHF_FIRST_CHAR } from './hersheyScriptData';

/**
 * Setting a name in Hershey script simplex, as strokes a pen can be watched making.
 *
 * **Why a stroke font at all, when the cover could just set text in a script webfont.**
 * Because the cover is written, and writing is a thing that happens *over time*. You
 * cannot animate the drawing of a text glyph: `stroke-dashoffset` needs a path, and text
 * is not one. The obvious workaround — take a script webfont and convert its glyphs to
 * paths — is a trap that looks correct right up until it runs: font outlines are filled
 * **contours**, so a dash offset walks the letter's silhouette and the result reads as
 * the letter being circled rather than written. Hershey simplex glyphs are **centrelines**.
 * One stroke is one movement of a pen, so drawing them in order simply is handwriting.
 *
 * The data and the licence live in `hersheyScriptData.ts`; the simplex/complex choice is
 * argued there too, because it is a property of the data rather than of this layout code.
 *
 * **Coordinates are used as they come, with no vertical flip.** Hershey y increases
 * downward and so does SVG's, so the two agree. Negating y is the first thing anyone
 * tries and it renders every name upside down.
 */

/** One pen movement: the points it passes through, in order. */
interface Glyph {
  /** Left and right bearings. The advance is `right - left`. */
  left: number;
  right: number;
  strokes: number[][][];
}

/** Hershey packs coordinates as ASCII offset from 'R'. */
const ORIGIN = 'R'.charCodeAt(0);

const parseGlyph = (line: string): Glyph => {
  const left = line.charCodeAt(8) - ORIGIN;
  const right = line.charCodeAt(9) - ORIGIN;
  const body = line.slice(10);

  const strokes: number[][][] = [];
  let current: number[][] = [];

  for (let i = 0; i + 1 < body.length; i += 2) {
    /* " R" is pen-up: end the stroke and start a new one. It is a *coordinate slot*
       holding a sentinel, not a separator between them, so it has to be read on the
       same two-character stride as everything else. */
    if (body[i] === ' ' && body[i + 1] === 'R') {
      if (current.length > 0) strokes.push(current);
      current = [];
      continue;
    }
    current.push([body.charCodeAt(i) - ORIGIN, body.charCodeAt(i + 1) - ORIGIN]);
  }
  if (current.length > 0) strokes.push(current);

  return { left, right, strokes };
};

/** Parsed once at module load — the data is fixed and small. */
const GLYPHS: readonly Glyph[] = JHF.map(parseGlyph);

/**
 * Cap height in Hershey units — baseline at 0, capitals reaching to -14.
 *
 * Used to fit a Hershey pen-route into another font's letter box; see `hersheyGlyph`.
 */
export const HERSHEY_CAP = 14;

/**
 * The dash length to hide a path of this length with, which is deliberately **more** than
 * the path measures.
 *
 * **This is the fix for stray marks appearing on letters that had not been written yet.**
 * The idiom is `stroke-dasharray: L; stroke-dashoffset: L`, which puts the whole path in
 * the pattern's gap and hides it — but only if `L` is at least the path's true rendered
 * length. Lengths here are summed at full precision while the `d` attribute is emitted at
 * two decimals, so the browser's path is a hair *longer* than `L` and its tail lands back
 * inside the following dash.
 *
 * That tail is a fraction of a pixel, which sounds harmless and is not: with `round` caps
 * a sub-pixel dash renders as a **dot the full width of the stroke**, so on a mask whose
 * stroke is most of a cap height it appeared as a fat blob sitting on a letter several
 * places ahead of the pen. Overshooting costs nothing — the offset animates to zero either
 * way, and a dash longer than the path it covers still covers it exactly once.
 */
export const dashLength = (length: number): number => length * 1.02 + 1;

/**
 * One glyph's pen-route, for use as a **mask over a different typeface**.
 *
 * This is the part of the stroke font that survives choosing an outline face for the
 * cover. An outline glyph is a filled contour and cannot be drawn on — but the question
 * "where does a pen travel through the letter a" has an answer independent of which
 * typeface draws the a, and this is that answer. Scaled into a Florilane letter's own
 * advance box, it sweeps through that letter the way a hand would.
 *
 * Returns coordinates in Hershey units with the glyph's left bearing already removed, so
 * the caller only has to scale and translate. Null for anything the font has no glyph for.
 */
export const hersheyGlyph = (
  char: string,
): { advance: number; strokes: number[][][] } | null => {
  const index = char.charCodeAt(0) - JHF_FIRST_CHAR;
  if (index < 0 || index >= GLYPHS.length) return null;
  const glyph = GLYPHS[index];
  return {
    advance: glyph.right - glyph.left,
    strokes: glyph.strokes.map((stroke) => stroke.map(([x, y]) => [x - glyph.left, y])),
  };
};

/**
 * A pen lift costs this many coordinate units of "travel".
 *
 * Timing is driven by path length so the pen holds a constant speed (see `writeName`),
 * and a lift draws nothing — so without an allowance the pen teleports between strokes
 * and the dot of an i lands in the same instant as the stem it belongs to. Charging the
 * lift against the same budget buys the hesitation back and keeps one clock for the
 * whole name.
 *
 * Deliberately smaller than a typical letter's own length: a lift is quicker than a
 * stroke, it is just not free.
 */
const PEN_LIFT_COST = 9;

export interface WrittenStroke {
  /** An SVG path — polyline only, since that is all a Hershey glyph is. */
  d: string;
  /** Drawn length, in the same units as the viewBox. Feeds `stroke-dasharray`. */
  length: number;
  /** Fraction of the whole name already written when this stroke starts, 0..1. */
  start: number;
  /** Fraction of the whole name this stroke takes to draw. */
  span: number;
}

export interface WrittenName {
  strokes: WrittenStroke[];
  viewBox: string;
  /** Box aspect, so a caller can size the SVG without measuring it. */
  width: number;
  height: number;
  /** Drawn length only — lifts are excluded, so this is what a dasharray sums to. */
  totalLength: number;
}

/**
 * Strip diacritics rather than reject the name that carries them.
 *
 * The font is ASCII 32..126 and nothing else. Dutch rosters are mostly plain, but a
 * "José" or a "Björn" must not lose a letter — decomposing and dropping the combining
 * mark gives "Jose", which is the same name in a plainer hand and is what a binder with
 * one set of dies would have done anyway. Anything still unrepresentable after that
 * returns null, and the caller prints the name as ordinary text instead. **Never render
 * a name with characters silently missing.**
 */
const foldToAscii = (text: string): string =>
  /* Escaped rather than written as a literal range of combining marks. Those are
     invisible characters in the source, and this file is edited by tools that have
     already been warned about non-ASCII once. */
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const glyphFor = (char: string): Glyph | undefined => {
  const index = char.charCodeAt(0) - JHF_FIRST_CHAR;
  return index >= 0 && index < GLYPHS.length ? GLYPHS[index] : undefined;
};

/** Width in coordinate units, without laying anything out. */
const advanceOf = (text: string): number =>
  Array.from(text).reduce((sum, char) => {
    const glyph = glyphFor(char);
    return glyph ? sum + (glyph.right - glyph.left) : sum;
  }, 0);

/**
 * Set a name, wrapping onto a second line only if one line would be absurdly wide.
 *
 * **Wrapping is kept because the old blocked cover had it**, and losing it would be a
 * regression rather than a simplification: the per-letter version wrapped mid-word until
 * it was made to break on spaces only, and a cover that sets "Anneloes Ernest" as one
 * hairline nine ems wide has the same illegibility by another route. An SVG cannot
 * reflow, so the break has to be decided here.
 *
 * Returns null when the name cannot be set at all — see `foldToAscii`.
 */
export const writeName = (text: string, maxAspect = 7): WrittenName | null => {
  const folded = foldToAscii(text).trim();
  if (folded.length === 0) return null;
  if (Array.from(folded).some((char) => glyphFor(char) === undefined)) return null;

  /* Break on spaces only, and only when one line is too wide to be read. A name is one
     or two words in practice, so this picks the single best break rather than running a
     general greedy fill nobody would ever exercise. */
  const words = folded.split(/\s+/).filter(Boolean);
  let lines = [words.join(' ')];

  const capHeight = 21; /* Hershey's nominal cap-to-baseline; only used to judge width. */
  if (words.length > 1 && advanceOf(lines[0]) > maxAspect * capHeight) {
    let best = 1;
    let bestDelta = Infinity;
    for (let split = 1; split < words.length; split++) {
      const delta = Math.abs(
        advanceOf(words.slice(0, split).join(' ')) - advanceOf(words.slice(split).join(' ')),
      );
      if (delta < bestDelta) {
        bestDelta = delta;
        best = split;
      }
    }
    lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
  }

  /* Line spacing in coordinate units. Hershey's em is about 32 units tall including
     descenders, and script wants a little more air than that between baselines or the
     descenders of one line collide with the ascenders of the next. */
  const lineStep = 38;

  const widest = Math.max(...lines.map(advanceOf));
  const raw: { points: number[][] }[] = [];

  lines.forEach((line, lineIndex) => {
    /* Centre each line against the widest, so a two-line name is not ragged left. */
    let penX = (widest - advanceOf(line)) / 2;
    const penY = lineIndex * lineStep;

    Array.from(line).forEach((char) => {
      const glyph = glyphFor(char);
      if (!glyph) return;
      glyph.strokes.forEach((stroke) => {
        raw.push({
          points: stroke.map(([x, y]) => [penX + x - glyph.left, penY + y]),
        });
      });
      penX += glyph.right - glyph.left;
    });
  });

  if (raw.length === 0) return null;

  /* The box, from what is actually drawn rather than from the nominal em — a name with
     no descender should not carry an empty band under it on the cover. */
  const xs = raw.flatMap((s) => s.points.map((p) => p[0]));
  const ys = raw.flatMap((s) => s.points.map((p) => p[1]));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  /* Room for the stroke itself, which is centred on the path and would otherwise be
     clipped in half along every edge of the box. */
  const pad = 2;

  const lengthOf = (points: number[][]): number => {
    let total = 0;
    for (let i = 0; i + 1 < points.length; i++) {
      total += Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
    }
    return total;
  };

  const lengths = raw.map((s) => lengthOf(s.points));
  const totalLength = lengths.reduce((a, b) => a + b, 0);
  /* The clock every stroke is timed against: ink plus the lifts between. */
  const budget = totalLength + PEN_LIFT_COST * Math.max(0, raw.length - 1);

  let elapsed = 0;
  const strokes: WrittenStroke[] = raw.map((stroke, index) => {
    const length = lengths[index];
    const start = elapsed / budget;
    elapsed += length + PEN_LIFT_COST;
    return {
      d: stroke.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
        .join(' '),
      length,
      start,
      span: length / budget,
    };
  });

  return {
    strokes,
    viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
    totalLength,
  };
};
