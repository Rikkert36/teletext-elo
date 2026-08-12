import { CSSProperties } from 'react';
import { Pack, isIconPack, packFloor } from '../mock/cardMock';
import { rikDevMark } from './brand';

/**
 * What colour a packet is printed in.
 *
 * **One colour per type of packet, not per packet.** A 3-card packet is always the
 * same blue, every time, for everyone — colour is a property of the product, the way
 * it is on a shelf of real ones, so you learn to recognise a five before you have
 * read the number on it. An earlier version hashed the pack id, which gave every
 * single packet its own hue and meant the colour told you nothing and never repeated.
 *
 * The palette is the logo's: near-black foil with the type colour pooled in the
 * middle of it and glowing off the edges, chrome seals, and the count set in the
 * colour of the logo's LED scoreboard. Hues are taken straight off the badge — its
 * green, its blue man, its red man, the flame — so four packets side by side still
 * look like four things from the same place.
 *
 * Fixed saturation and lightness across all four; only the hue moves. That is what
 * keeps them a product line rather than four unrelated objects.
 */

/** Hue per pack size, from the badge. Green, blue man, red man. */
const SIZE_HUES: Record<number, number> = {
  1: 96,
  3: 214,
  5: 356,
};

/**
 * Anything not 1, 3 or 5 — a gift can be any size up to ten. Spread over the wheel
 * by size so two odd sizes do not collide, and kept clear of the four real hues.
 */
const fallbackHue = (size: number): number => (168 + size * 37) % 360;

/** The flame. Guaranteed packets, and nothing else, are allowed this. */
const FORCED_HUE = 34;

/**
 * The set-completion packet is **white with a gold edge**, and so it has no hue at all.
 *
 * It is the one wrapper in the game that is not a pool of colour on near-black, and that is
 * the point: it is printed like the card it contains. An icoon's ground is a near-white
 * two-zone field with a 1px gold rule on the edge, so the packet is the same three
 * materials — ivory board, gold rule, gold mark — and the promise is legible before it is
 * opened. It was briefly gold-hued instead, which made it a yellow packet rather than a
 * white one, and read as a fourth size colour rather than as a different product.
 *
 * The values come from the icoon card. The ground is its `linear-gradient(154deg, #fdfcf8,
 * #eeeae1 26%, #cfcdc4 62%, #f6f4ee)` flattened to three stops, and the edge is exactly
 * `.card--icoon::before`'s rule — the same line, on the wrapper.
 */
const ICON_FOIL = {
  hi: '#fdfcf8',
  mid: '#f3f0e7',
  lo: '#e2ded2',
  /*
   * The gold rule down the sides, from inside.
   *
   * `.card--icoon::before`'s colour at **full strength** rather than its literal
   * `rgba(176, 142, 66, 0.85)`. On the card that alpha sits over a near-white ground and
   * lands around `#bd9d5c`; here the same declaration had to hold its own against a hard
   * luminance edge and came out invisible. Same hue, same intent, no transparency to lose.
   */
  edge: '#b08e42',
  /* The hexagon and its ball. Olive-bronze, the icoon card's own ink family. */
  ink: '#b08e42',
  /* Warm and faint. A white packet needs no neon bleeding off it — the glow is what makes
     the coloured ones look lit, and on this one it would only fog the gold rule. */
  glow: 'rgba(214, 178, 108, 0.34)',
  /*
   * The bulge, warm and faint instead of near-black.
   *
   * The shared values are `rgba(0,0,0,0.55)` at the edges, which is a highlight model for
   * dark foil and turns a white board into a white stripe between two almost-black ones.
   * These keep the same shape — dark down both sides, light left of centre, so it still
   * reads as foil over a few cards — at a strength a board can carry.
   */
  bulgeStrong: 'rgba(122, 102, 62, 0.22)',
  bulgeSoft: 'rgba(122, 102, 62, 0.06)',
} as const;

/**
 * The packet's sealed ends, struck in gold instead of chrome.
 *
 * **This is where the top and bottom edge lives, and there was no alternative.** An outline
 * around the silhouette was tried first, as four zero-blur drop-shadows — the standard trick,
 * and the one `.pack--mini:focus-visible` appears to use. It renders nothing at any offset:
 * `filter` is applied *before* `mask` on a single element, so a hard-edged shadow lying
 * entirely outside the shape is drawn and then masked straight off again. The focus ring only
 * survives because a blur bleeds inward as well as outward. Raising the offset does not help;
 * it moves the shadow further outside. It was taken out rather than left looking plausible.
 *
 * The crimp strips are painted *within* the mask and **are** the serrated ends, so colouring
 * them is the whole of a top-and-bottom edge. Same six-stop rolled-edge form as the chrome —
 * bright lip, hard dark turn, second highlight — so it still reads as folded metal foil and
 * not as a flat yellow band.
 */
const ICON_SEAL = `linear-gradient(
    to bottom,
    #fbf1d6 0%,
    #e0c78d 22%,
    #a5883f 46%,
    #7a6229 52%,
    #cdb075 74%,
    #f5e8c4 100%
  )`;

/**
 * A packet with a floor on it — so a gift, since nothing earned ever carries one.
 *
 * An ordinary gift is deliberately *not* forced: it is a real packet of n cards drawn
 * on the real odds, and colouring it by size is what makes a three from a colleague
 * look like a three. Only the guarantee changes the product.
 *
 * Through `packFloor` rather than testing the field, because the server sends it as
 * null on every earned pack — see its note.
 */
export const isForcedPack = (pack: Pack): boolean => packFloor(pack) !== undefined;

/**
 * The custom properties `.pack` paints itself with. Set on the packet element by
 * both PackTile and PackOpener, so the tile, the sealed wrapper and the torn halves
 * are all the same packet.
 *
 * The foil stays close to black — the field is a pool of colour in the middle of a
 * dark surface, not a coloured surface — because that is how the badge is lit, and
 * because the badge has to sit on top of this without competing with it.
 */
export const packFoil = (pack: Pack): CSSProperties => {
  /*
   * The set-completion packet takes no hue at all — it is white board with a gold rule, the
   * same three materials as the card inside it. Every other packet is a hue on near-black.
   *
   * Checked before `isForcedPack`, which it also satisfies: testing the floor first would
   * paint the rarest wrapper in the game the same orange as an 80+ test packet.
   */
  if (isIconPack(pack)) {
    return {
      '--foil-hi': ICON_FOIL.hi,
      '--foil-mid': ICON_FOIL.mid,
      '--foil-lo': ICON_FOIL.lo,
      '--glow': ICON_FOIL.glow,
      '--ink': ICON_FOIL.ink,
      /* The two halves of the gold edge: the straight sides, and the serrated ends. */
      '--pack-edge': ICON_FOIL.edge,
      '--seal-image': ICON_SEAL,
      '--bulge-strong': ICON_FOIL.bulgeStrong,
      '--bulge-soft': ICON_FOIL.bulgeSoft,
      '--pack-mark': `url(${rikDevMark})`,
    } as CSSProperties;
  }

  const hue = isForcedPack(pack)
    ? FORCED_HUE
    : SIZE_HUES[pack.size] ?? fallbackHue(pack.size);

  return {
    /* The pool of colour in the middle of the front. */
    '--foil-hi': `hsl(${hue}, 62%, 26%)`,
    '--foil-mid': `hsl(${hue}, 52%, 13%)`,
    '--foil-lo': `hsl(${hue}, 45%, 6%)`,
    /* The neon bleeding off the edges, and the halo under the numeral. */
    '--glow': `hsla(${hue}, 90%, 52%, 0.5)`,
    /* The numeral, at LED brightness. */
    '--ink': `hsl(${hue}, 95%, 72%)`,
    '--pack-mark': `url(${rikDevMark})`,
  } as CSSProperties;
};
