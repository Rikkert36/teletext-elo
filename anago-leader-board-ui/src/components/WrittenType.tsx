import React, { useEffect, useId, useLayoutEffect, useState } from 'react';
import { HERSHEY_CAP, dashLength, hersheyGlyph } from '../utils/hersheyScript';

/**
 * A name in a real typeface, revealed as though it were being written.
 *
 * **Why this exists.** An outline font cannot be drawn on: `stroke-dashoffset` walks a
 * path, and a glyph is a filled contour, so animating it traces the letter's silhouette
 * and reads as the letter being circled. The glyphs here are the real typeface and never
 * move — what moves is a **mask**, driven by the route a pen takes through each letter,
 * which is exactly what a Hershey centreline is. The stroke font stopped being the thing
 * you see and became the thing that decides what you see when.
 *
 * Two faults in the first version are worth keeping written down, because both are
 * invisible in review and obvious on screen.
 *
 * **Widths were summed per character with `measureText`, and that is wrong for a script.**
 * Connecting faces carry large *negative* side bearings so the letters join, which makes
 * the sum of individual advances substantially wider than the kerned string really is.
 * The mask spread rightward while the text stayed compact: early letters roughly aligned,
 * later ones missed entirely. Horizontal placement now comes from `getExtentOfChar` on the
 * rendered `<text>` — the authoritative answer, because it measures the very element being
 * masked rather than a canvas approximation of it.
 *
 * **A centreline cannot cover a swash.** A pen-route runs through the skeleton of a
 * letter; Florilane's flourishes reach well outside it. Any ink beyond the stroke's width
 * was therefore never uncovered — permanently, since the animation ends with the mask
 * fully drawn, which is why the finished name was missing pieces rather than merely
 * arriving oddly. So the route no longer covers on its own: each character also gets a
 * **wipe** across its own column, union'd into the same mask and on the same clock. The
 * route leads and describes the hand; the wipe follows and guarantees the letter is whole.
 */

/**
 * How fat the revealing stroke is, as a fraction of cap height.
 *
 * This is about how much of the letter the *pen* uncovers ahead of the wipe, not about
 * coverage — coverage is the wipe's job now. Too thin and the route stops reading as a
 * nib; too fat and it swallows the wipe and the whole thing flattens into a bar crossing
 * the name.
 */
const MASK_WIDTH = 0.62;

/**
 * How far the wipe trails the pen, as a fraction of each character's own duration.
 *
 * Zero would put the two exactly in step, and the wipe — being a solid column — would then
 * be all you ever saw. Trailing it lets the route get into the letter first, so a flourish
 * arrives as the hand reaches it rather than before.
 */
const WIPE_LAG = 0.35;

interface CharPiece {
  routes: { d: string; length: number }[];
  wipe: { d: string; length: number; width: number };
  /** Fraction of the whole name written before this character starts. */
  start: number;
  /** Fraction of the whole name this character takes. */
  span: number;
}

interface Measured {
  pieces: CharPiece[];
  viewBox: string;
  width: number;
  height: number;
  cap: number;
}

const lengthOf = (points: number[][]): number => {
  let total = 0;
  for (let i = 0; i + 1 < points.length; i++) {
    total += Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
  }
  return total;
};

/**
 * Resolve `--cover-hand` to a real family string.
 *
 * Canvas needs a resolved shorthand — handing it `var(--cover-hand)` silently leaves the
 * context on its default face, and the cap height would then describe the wrong font.
 */
const resolveHand = (): string => {
  if (typeof window === 'undefined') return 'cursive';
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--cover-hand')
    .trim();
  return value.length > 0 ? value : 'cursive';
};

const NOMINAL = 100;

interface WrittenTypeProps {
  name: string;
  writing: boolean;
  durationMs: number;
}

const WrittenType: React.FC<WrittenTypeProps> = ({ name, writing, durationMs }) => {
  const fontFamily = resolveHand();
  const maskId = useId().replace(/:/g, '');
  const [ready, setReady] = useState(false);
  const [measured, setMeasured] = useState<Measured | null>(null);

  /*
   * Wait for the webfont before measuring anything.
   *
   * Without this the first measurement runs against the fallback face and every route is
   * placed on the wrong letters. `load` is called explicitly because `ready` alone can
   * settle before a font nothing has requested yet has been fetched.
   */
  useEffect(() => {
    let live = true;
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fonts) {
      setReady(true);
      return undefined;
    }
    fonts
      .load(`${NOMINAL}px ${fontFamily}`, name)
      .then(() => fonts.ready)
      .then(() => {
        if (live) setReady(true);
      })
      .catch(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, [fontFamily, name]);

  useLayoutEffect(() => {
    if (!ready) return;

    /*
     * Measured on a **probe** rather than on the rendered text, and that is not incidental.
     *
     * The component shows plain text until it has a viewBox (see below), so measuring the
     * rendered `<text>` would deadlock: no measurement without the element, no element
     * without the measurement. A throwaway SVG breaks the cycle and costs one layout.
     *
     * It has to be *in the document* — `getBBox` and `getExtentOfChar` report zero for a
     * detached tree — so it is attached off-screen and removed in the same effect.
     */
    const probe = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    probe.setAttribute(
      'style',
      'position:absolute;left:-99999px;top:0;width:4000px;height:600px;visibility:hidden',
    );
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    el.setAttribute('x', '0');
    el.setAttribute('y', '0');
    el.setAttribute('style', `font-family:${fontFamily};font-size:${NOMINAL}px`);
    el.textContent = name;
    probe.appendChild(el);
    document.body.appendChild(probe);

    const done = () => document.body.removeChild(probe);

    /*
     * Cap height from a canvas: the one measurement SVG will not give directly, and the
     * one place kerning cannot interfere because it is a single glyph's ascent. Everything
     * horizontal comes from the text element itself.
     */
    let cap = NOMINAL * 0.7;
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) {
      ctx.font = `${NOMINAL}px ${fontFamily}`;
      cap = ctx.measureText('H').actualBoundingBoxAscent || cap;
    }

    const bbox = el.getBBox();
    if (bbox.width === 0) {
      done();
      return;
    }

    const chars = Array.from(name);
    const raw: { routes: number[][][]; x: number; w: number }[] = [];

    chars.forEach((char, index) => {
      if (char.trim().length === 0) return;
      let ext: DOMRect;
      try {
        ext = el.getExtentOfChar(index);
      } catch {
        return;
      }
      const glyph = hersheyGlyph(char);
      if (!glyph || glyph.advance <= 0 || ext.width <= 0) return;

      /* Fit this letter's pen-route into the box the letter actually occupies. Per
         character, so nothing accumulates: the route over the fourth letter is over the
         fourth letter however much the two fonts disagree about widths. */
      const sx = ext.width / glyph.advance;
      const sy = cap / HERSHEY_CAP;
      raw.push({
        routes: glyph.strokes.map((stroke) => stroke.map(([x, y]) => [ext.x + x * sx, y * sy])),
        x: ext.x,
        w: ext.width,
      });
    });

    if (raw.length === 0) {
      done();
      return;
    }

    /* Budget the whole name by pen travel, so a wide letter genuinely takes longer. */
    const travel = raw.map((c) => c.routes.reduce((sum, s) => sum + lengthOf(s), 0));
    const lift = cap * 0.5;
    const budget = travel.reduce((a, b) => a + b, 0) + lift * Math.max(0, raw.length - 1);

    /* The wipe spans the full height of the drawn name rather than each glyph's own box:
       swashes and descenders routinely leave their character's column vertically, and a
       wipe short by a few units leaves a hairline of the flourish behind. */
    const wipeY = bbox.y + bbox.height / 2;
    const wipeH = bbox.height * 1.06;

    let elapsed = 0;
    const pieces: CharPiece[] = raw.map((piece, index) => {
      const start = elapsed / budget;
      const span = (travel[index] + lift) / budget;
      elapsed += travel[index] + lift;

      /* A little overlap either side, so consecutive columns cannot leave a seam of
         unrevealed ink where two letters join. */
      const bleed = piece.w * 0.12;
      const x0 = piece.x - bleed;
      const x1 = piece.x + piece.w + bleed;

      return {
        routes: piece.routes.map((stroke) => ({
          d: stroke
            .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
            .join(' '),
          length: lengthOf(stroke),
        })),
        wipe: {
          d: `M${x0.toFixed(2)} ${wipeY.toFixed(2)} L${x1.toFixed(2)} ${wipeY.toFixed(2)}`,
          length: x1 - x0,
          width: wipeH,
        },
        start,
        span,
      };
    });

    done();

    

    const pad = cap * 0.28;
    setMeasured({
      pieces,
      viewBox: `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`,
      width: bbox.width + pad * 2,
      height: bbox.height + pad * 2,
      cap,
    });
  }, [ready, name, fontFamily]);

  const masking = writing && measured !== null;

  /*
   * Before the font has loaded and the name has been measured there is no viewBox, and an
   * SVG without one cannot size itself — so the name is set as ordinary text until then.
   *
   * This is also the failure mode if measurement never succeeds at all (no `document.fonts`,
   * a `getBBox` of zero in a detached tree). A cover that has not finished measuring shows
   * its name in the right typeface at roughly the right size; it does not show nothing.
   * `font-display: block` means the face is never the wrong one, only briefly unsized.
   */
  if (!measured) {
    return (
      <span className="written__type" style={{ fontFamily }}>
        {name}
      </span>
    );
  }

  return (
    <svg
      className="written-type"
      viewBox={measured?.viewBox}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={name}
      style={measured ? { aspectRatio: `${measured.width} / ${measured.height}` } : undefined}
    >
      {masking && measured ? (
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="-9999" y="-9999" width="19998" height="19998">
            {/* Black hides, white uncovers. Deliberately enormous: the mask has to cover
                every part of the text box whatever the viewBox turns out to be. */}
            <rect x="-9999" y="-9999" width="19998" height="19998" fill="black" />
            {measured.pieces.map((piece, index) => (
              <g key={index}>
                {/* The wipe: trails the pen and guarantees the letter ends up whole,
                    swashes included. Butt cap, so a column does not bleed into the next
                    letter's before that letter has been reached. */}
                <path
                  d={piece.wipe.d}
                  className="written__nib written__nib--wipe"
                  strokeWidth={piece.wipe.width}
                  style={
                    {
                      '--len': dashLength(piece.wipe.length),
                      animationDuration: `${Math.max(
                        1,
                        Math.round(piece.span * (1 - WIPE_LAG) * durationMs),
                      )}ms`,
                      animationDelay: `${Math.round(
                        (piece.start + piece.span * WIPE_LAG) * durationMs,
                      )}ms`,
                    } as React.CSSProperties
                  }
                />
                {/* The pen: leads, and is what makes this read as a hand rather than as a
                    bar crossing the name. */}
                {piece.routes.map((route, routeIndex) => (
                  <path
                    key={routeIndex}
                    d={route.d}
                    className="written__nib"
                    strokeWidth={measured.cap * MASK_WIDTH}
                    style={
                      {
                        '--len': dashLength(route.length),
                        animationDuration: `${Math.max(1, Math.round(piece.span * durationMs))}ms`,
                        animationDelay: `${Math.round(piece.start * durationMs)}ms`,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </g>
            ))}
          </mask>
        </defs>
      ) : null}

      <text
        x={0}
        y={0}
        className="written__glyphs"
        style={{ fontFamily, fontSize: NOMINAL }}
        mask={masking ? `url(#${maskId})` : undefined}
      >
        {name}
      </text>
    </svg>
  );
};

export default WrittenType;
