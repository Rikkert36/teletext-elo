import { CSSProperties } from 'react';
import { Pack } from '../mock/cardMock';
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
 * Anything not 1, 3 or 5 — the test panel can grant any size. Spread over the wheel
 * by size so two odd sizes do not collide, and kept clear of the four real hues.
 */
const fallbackHue = (size: number): number => (168 + size * 37) % 360;

/** The flame. Debug-only forced packets, and nothing else, are allowed this. */
const FORCED_HUE = 34;

/** A pack with any guarantee on it came from the test panel or the console. */
export const isForcedPack = (pack: Pack): boolean =>
  pack.guaranteeLevel !== undefined ||
  pack.guaranteeTier !== undefined ||
  pack.guaranteePlayerId !== undefined;

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
    /* A printed edge line down both sides. */
    '--edge': `hsla(${hue}, 85%, 60%, 0.45)`,
    /* The numeral, at LED brightness. */
    '--ink': `hsl(${hue}, 95%, 72%)`,
    '--pack-mark': `url(${rikDevMark})`,
  } as CSSProperties;
};
