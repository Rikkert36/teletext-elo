import { CSSProperties } from 'react';
import { Pack, isIconPack, packFloor } from '../mock/cardMock';
import { rikDevMark } from './brand';
import packArt1 from '../assets/pack-1.png';
import packArt3 from '../assets/pack-3.png';
import packArt5 from '../assets/pack-5.png';
import packArt75 from '../assets/pack-75.png';
import packArt80 from '../assets/pack-80.png';
import packArt85 from '../assets/pack-85.png';
import packArt90 from '../assets/pack-90.png';
import packArtIcoon from '../assets/pack-icoon.png';

/**
 * What colour a packet is printed in.
 *
 * **One colour per type of packet, not per packet.** A 3-card packet is always the
 * same green, every time, for everyone — colour is a property of the product, the way
 * it is on a shelf of real ones, so you learn to recognise a five before you have
 * read the number on it. An earlier version hashed the pack id, which gave every
 * single packet its own hue and meant the colour told you nothing and never repeated.
 *
 * **Nearly every packet is printed artwork now** — see `PACK_ART_SIZE`, `PACK_ART_FLOOR`
 * and `PACK_ART_ICOON`. What is left here is the paint for the one case with no front:
 * a gift of an odd size, or a floor nobody has drawn a wrapper for. That is a near-black
 * foil with the type colour pooled in the middle of it and glowing off the edges, chrome
 * seals, and the count set in the colour of the logo's LED scoreboard.
 *
 * Fixed saturation and lightness across all of them; only the hue moves. That is what
 * keeps them a product line rather than a set of unrelated objects.
 */

/**
 * Hue per pack size — **read off the artwork**, not chosen.
 *
 * These are the median hue of the field either side of the numeral on each printed
 * front. They stopped being a free choice the moment the packets became photographs of
 * themselves, because the only thing the hue still drives on those is the neon bleeding
 * off the edges, and a green halo around a blue packet is worse than no halo at all.
 *
 * They are the dominant hue over the whole panel, which is a histogram rather than an
 * average down a couple of columns — and that distinction earned itself. Sampling two
 * strips either side of the numeral read the five as *green*, because that render throws
 * yellow-green confetti down both edges and the strips landed in it. The field always
 * wins on area; nothing else reliably does.
 */
const SIZE_HUES: Record<number, number> = {
  1: 122,
  3: 232,
  5: 2,
};

/**
 * The printed fronts.
 *
 * A photograph of the real thing — foil, crimps, holographic confetti and all — in
 * place of the four gradients and two pseudo-elements that used to approximate one.
 * Everything the paint was reaching for is in the render: the pinked ends, the seals,
 * the bulge over the cards, the badge and the numeral. So `.pack--art` turns all of it
 * off (see packopen.css), `PackFace` prints nothing over it, and the packet is one image
 * with an alpha channel.
 *
 * **Three families, and they are looked up in this order**, because a packet can satisfy
 * more than one of them and only the first answer is right:
 *
 * 1. **The set-completion packet** — white board with gold seals and the hexagon on it.
 *    It is sized 1, so testing the size first would hand the rarest wrapper in the game a
 *    green one-card front.
 * 2. **A floor** — the four gold ceremony wrappers, `75+` through `90+`. Also usually
 *    sized 1, and the same argument applies. The floors are exactly the four the game
 *    issues; see the test panel in CollectionPage, which is the only thing that mints
 *    them.
 * 3. **A size** — the one, the three and the five, which is everything anybody earns.
 *
 * **What is left painted is a gift of an odd size, and a floor with no wrapper drawn for
 * it.** `GiftForm.MinimumOverall` is a nullable int, so the API will take a 70+ that the
 * UI cannot mint and nothing has printed — that falls through to the flame orange rather
 * than to a blank packet, which is why `PACK_ART_FLOOR` is a lookup with a fallback and
 * not an assertion. An ordinary gift of three is *not* in that category, deliberately: it
 * is a real packet of three drawn on the real odds, and printing it like one is the whole
 * reason a three from a colleague looks like a three.
 *
 * **Every asset is stored already laid out on the packet's box, and that is the one thing
 * to know before replacing one.** Each is 480 × 816 — the `--pack-w × --pack-h` box at 480
 * wide, which is twice the largest a packet is ever drawn — with the render placed so that
 * *its own coloured panel* falls on the box's panel: 0.15 down from the top, 1.40 tall,
 * leaving 0.15 of seal at each end. In whole pixels at 480 wide that is 72 / 672 / 72; the
 * renders are commissioned at 1000 × 1700, where it is 150 / 1400 / 150.
 *
 * That is the load-bearing measurement, because the panel is the part with a card behind
 * it, and a packet on the table has to hold a card from the book. Get it right in the
 * asset and the CSS can draw it at a flat `100% 100%` and be right by construction. The
 * alternative — stretch a raw render to the box — is what the first pass did, and it put
 * the panel 4% out and the seals 20% shallow, which reads as a packet with too much front
 * and not enough end.
 *
 * **Every front is now commissioned on the box**, so preparing one is a downscale and
 * nothing else. It must be a *premultiplied* downscale: scaling straight RGBA blends the
 * colour of fully transparent pixels into the edge and fringes every tooth with whatever
 * the background happened to be.
 */
const PACK_ART_SIZE: Record<number, string> = {
  1: packArt1,
  3: packArt3,
  5: packArt5,
};

/** The four gold ceremony wrappers, by the floor printed on them. */
const PACK_ART_FLOOR: Record<number, string> = {
  75: packArt75,
  80: packArt80,
  85: packArt85,
  90: packArt90,
};

/** White board, gold seals, the hexagon and its ball. */
const PACK_ART_ICOON = packArtIcoon;

/**
 * Anything not 1, 3 or 5 — a gift can be any size up to ten. Spread over the wheel
 * by size so two odd sizes do not collide, and kept clear of the four real hues.
 */
const fallbackHue = (size: number): number => (168 + size * 37) % 360;

/**
 * Gold. Guaranteed packets, and nothing else, are allowed this.
 *
 * It was the flame orange (34) while those packets were painted. The four printed
 * ceremony wrappers came back gold and sample at 37–45, so this is the middle of them —
 * one value for all four, because they are one product with four numbers on it and the
 * glow is the only thing it still drives. It also still paints a floor with no wrapper.
 */
const FORCED_HUE = 40;

/**
 * The neon the set-completion packet bleeds onto the table: warm, and faint.
 *
 * A white packet needs no glow of its own — the halo is what makes the coloured ones look
 * lit, and at full strength on this one it would only fog the gold. It is the single value
 * that survived the painted icoon wrapper.
 *
 * **The rest of that wrapper is gone**, and deliberately: the ivory ground, the gold rule
 * down the sides, the gold-struck seal gradient and the drawn hexagon were an approximation
 * of a printed packet, and there is now a photograph of the printed packet. Leaving them
 * would have left a second icoon wrapper that nothing can ever render. The reasoning behind
 * each is in docs/trading-cards.md if it is ever needed again.
 */
const ICOON_GLOW = 'rgba(214, 178, 108, 0.34)';

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
 * Which printed front this packet wears, or `undefined` if it has none and must be
 * painted. **The order of the three tests is the whole of it** — see `PACK_ART_SIZE`:
 * the set-completion packet and every guaranteed packet are also sized 1, so asking
 * about the size first would put a green one-card front on both of them.
 */
const packArt = (pack: Pack): string | undefined => {
  if (isIconPack(pack)) return PACK_ART_ICOON;

  const floor = packFloor(pack);
  if (floor !== undefined) return PACK_ART_FLOOR[floor];

  return PACK_ART_SIZE[pack.size];
};

/** Whether this packet has a printed front, rather than a painted one. */
export const isArtPack = (pack: Pack): boolean => packArt(pack) !== undefined;

/**
 * The class list for a packet, which is `pack` and — if it has artwork — `pack--art`.
 *
 * It exists so that the flag travels with `packFoil` rather than beside it. A packet is
 * rendered in five places (the shelf tile, the sealed wrapper, both torn halves through
 * their parent, and the two flights home), every one of which already calls `packFoil`,
 * and a site that took the paint but not the class would draw the painted wrapper *and*
 * the printed one on top of each other.
 */
export const packClass = (pack: Pack): string =>
  isArtPack(pack) ? 'pack pack--art' : 'pack';

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

  /*
   * A printed packet takes two properties and no paint at all.
   *
   * `--pack-art` is the front, which `.pack--art` uses twice — once as the background
   * and once as the mask, so the element is shaped by the render's own alpha and the
   * sheen that travels over it is clipped to the silhouette rather than showing in the
   * notches between the teeth.
   *
   * `--glow` stays because it is not paint: it is the neon the packet bleeds onto the
   * table, and the filter that draws it hangs off `.pack` for every packet alike. It is
   * the one reason the hues above still have to agree with the artwork — and the one
   * thing the set-completion packet overrides, because a white wrapper wants a warm,
   * faint halo rather than a coloured one.
   */
  const art = packArt(pack);
  if (art !== undefined) {
    return {
      '--pack-art': `url(${art})`,
      '--glow': isIconPack(pack) ? ICOON_GLOW : `hsla(${hue}, 90%, 52%, 0.5)`,
    } as CSSProperties;
  }

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
