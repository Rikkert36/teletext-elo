import React, { useEffect, useLayoutEffect, useState } from 'react';

/**
 * The owner's name on the cover, lit rather than written.
 *
 * **This replaced four attempts at making an outline font look hand-written, and why each
 * failed is worth keeping, because each one will otherwise be proposed again.** An outline
 * glyph cannot be drawn on: `stroke-dashoffset` walks a path, and a filled contour
 * animated that way traces its own silhouette. Masking it with a pen-route fails
 * differently — a Hershey centreline is the wrong *shape* for a Florilane letter, so the
 * mask wanders off the ink and only a very fat stroke still covers it, which uncovers
 * round blobs several letters wide. Computing Florilane's **own** centreline (Zhang-Suen
 * thinning on the rasterised glyph, width from a distance transform) fixed the shape and
 * still fell short, because stroke *order* cannot be recovered from an outline — a hand
 * has one and the algorithm can only guess at it.
 *
 * The way out was to stop imitating. Florilane is a high-contrast face — its stems are
 * over three times its hairlines — and that contrast is exactly what makes any reveal read
 * as revealing rather than as drawing. A *monoline* script would genuinely draw, its
 * letter being a stroke already; two were measured (Grand Hotel at 1.36, Sacramento at
 * 1.50, against Florilane's 3.33) and neither was the right letter for this book.
 *
 * So the name is not written at all now. It is **lit** — the album's own silhouette beat
 * from `card.css`, in the gold variant an icoon uses. The shape of it is in
 * `.written__glyphs--lighting` in album.css.
 *
 * All that survives here is the measurement, and it exists to size the box: the name is an
 * SVG so it auto-fits the cover the way a drawing does, rather than being set at a
 * font-size that only ever suits one name length.
 */

/** Measured at this size and then scaled by the viewBox, so nothing recomputes on resize. */
const NOMINAL = 100;

/**
 * Resolve `--cover-hand` to a real family string.
 *
 * Read off the root, where album.css declares it as a constant. It used to be set from JS,
 * and a variable that arrives one render late is a measurement taken against the fallback
 * face — which is a mask, or a box, built for the wrong letters.
 */
const resolveHand = (): string => {
  if (typeof window === 'undefined') return 'cursive';
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--cover-hand')
    .trim();
  return value.length > 0 ? value : 'cursive';
};

interface Measured {
  viewBox: string;
  width: number;
  height: number;
  /** Cap height, which the glow radii are proportional to. */
  cap: number;
}

interface WrittenTypeProps {
  name: string;
  /** Play the reveal. False on the album's own cover — see `WrittenName`. */
  writing: boolean;
  /**
   * Measured, but not on the cover yet.
   *
   * **A third state, because two were not enough and the missing one was visible.** The
   * album's own cover is `writing: false` and shows the name at rest, which is right —
   * but the ceremony passes through the same state on its way *to* the reveal, so the
   * name sat there in finished gold from the moment the book came up, and the light then
   * bloomed over a name that was already present.
   *
   * Kept mounted rather than rendered later, so the font is loaded and the box is
   * measured before the beat starts. Mounting it at the downbeat instead would spend the
   * first frames of the reveal measuring.
   */
  pending?: boolean;
  durationMs: number;
}

const WrittenType: React.FC<WrittenTypeProps> = ({ name, writing, pending, durationMs }) => {
  const fontFamily = resolveHand();
  const [ready, setReady] = useState(false);
  const [measured, setMeasured] = useState<Measured | null>(null);

  /*
   * Wait for the webfont before measuring. Without this the box is sized from the fallback
   * face and the name is laid out to a width it will not have.
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
     * Measured on a throwaway probe rather than on the rendered text.
     *
     * The component shows plain text until it has a viewBox, so measuring the rendered
     * `<text>` would deadlock: no measurement without the element, no element without the
     * measurement. The probe has to be *in the document* — `getBBox` reports zero for a
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

    const bbox = el.getBBox();

    /* Cap height from a canvas — the one measurement SVG will not give directly, and the
       one place kerning cannot interfere, being a single glyph's ascent. */
    let cap = NOMINAL * 0.7;
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) {
      ctx.font = `${NOMINAL}px ${fontFamily}`;
      cap = ctx.measureText('H').actualBoundingBoxAscent || cap;
    }

    document.body.removeChild(probe);
    if (bbox.width === 0) return;

    /*
     * A modest pad only. The glow reaches far beyond this and is **not** contained by
     * growing the box — `.album__cover-title .written-type` sets `overflow: visible`
     * instead. Padding the viewBox enough to hold the bloom would shrink the letters
     * inside a fixed-width box; clipping it draws a bright rectangle on the cover, which
     * is what an SVG does at its viewport by default.
     */
    const pad = cap * 0.18;
    setMeasured({
      viewBox: `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`,
      width: bbox.width + pad * 2,
      height: bbox.height + pad * 2,
      cap,
    });
  }, [ready, name, fontFamily]);

  /*
   * Plain text until the font has loaded and the name has been measured — an SVG with no
   * viewBox cannot size itself. This is also the failure mode if measurement never
   * succeeds: a cover mid-measurement shows its name in the right typeface at roughly the
   * right size, rather than showing nothing.
   */
  if (!measured) {
    return (
      <span
        className={`written__type${pending ? ' written__type--pending' : ''}`}
        style={{ fontFamily }}
      >
        {name}
      </span>
    );
  }

  const style = {
    fontFamily,
    fontSize: NOMINAL,
    /* The glow radii scale with the type, so the beat reads the same on a phone as on a
       desk. The keyframes read these rather than hard-coding pixel sizes. */
    '--glow-near': `${(measured.cap * 0.3).toFixed(1)}px`,
    '--glow-far': `${(measured.cap * 0.8).toFixed(1)}px`,
    '--bloom-far': `${(measured.cap * 0.85).toFixed(1)}px`,
    '--bloom-near': `${(measured.cap * 0.35).toFixed(1)}px`,
    ...(writing ? { animationDuration: `${durationMs}ms` } : {}),
  } as React.CSSProperties;

  return (
    <svg
      className="written-type"
      viewBox={measured.viewBox}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={name}
      style={{ aspectRatio: `${measured.width} / ${measured.height}` }}
    >
      {/*
        The bloom: the same name under a blur wide enough that no letter can be read in it,
        so what arrives first is *light* rather than lettering.

        **This layer is why the beat works on leather at all.** One layer fading from
        invisible to white cannot: white at low opacity over warm brown blends to tan,
        which is the colour of the gilt — so the ramp read as nothing → gold → white →
        gold, with a phantom gold phase before any light had arrived. Every interpolation
        from transparent to white over a warm ground goes through it. Formless light first,
        with letters that resolve quickly once inside it, is the way out.

        Rendered only while lighting. An invisible filtered element is still a rasterised
        one, and there is no reason to carry it at rest.
      */}
      {writing ? (
        <text className="written__bloom" x={0} y={0} style={style}>
          {name}
        </text>
      ) : null}

      <text
        className={`written__glyphs${writing ? ' written__glyphs--lighting' : ''}${
          pending ? ' written__glyphs--pending' : ''
        }`}
        x={0}
        y={0}
        style={style}
      >
        {name}
      </text>
    </svg>
  );
};

export default WrittenType;
