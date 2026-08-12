import { CSSProperties } from 'react';

/**
 * What leather an album is bound in.
 *
 * **One product line in five dyes.** The brass edge, the gold foil and the rule are
 * identical on all five, and only the stain moves — the same reasoning as the packet
 * hues in [packFoil.ts](./packFoil.ts): five books lying side by side have to read as
 * five of the same thing in different colours, not as five unrelated objects. So the
 * board edge stays brass rather than being tinted per stain, even though that would be
 * more "designed"; a green book with a green edge stops being an album from this series.
 *
 * The album has always been bordeaux. It is still the first entry here, unchanged down
 * to the hex, so nothing about an existing book moves when this lands.
 *
 * Applied by spreading the result onto an element as `style`, the same way `packFoil`
 * is. Read from a prop on every render rather than frozen at mount, so a cover that
 * changes re-stains in place — see the note on transitions below.
 */

export type CoverId = 'oxblood' | 'forest' | 'navy' | 'tan' | 'charcoal';

interface Stain {
  id: CoverId;
  /** Dutch, because it is UI copy. */
  label: string;
  /** Top-left of the cover, where the light falls. */
  hi: string;
  /** The body of the leather. */
  mid: string;
  /** The far corner, in shadow. */
  lo: string;
}

/**
 * Ordered light to dark within their own families rather than by hue, so the row on the
 * table reads as a spread of choices rather than a colour wheel. Bordeaux first because
 * it is the incumbent.
 */
export const COVERS: readonly Stain[] = [
  { id: 'oxblood', label: 'bordeaux', hi: '#5a4526', mid: '#35270f', lo: '#4a3820' },
  { id: 'tan', label: 'cognac', hi: '#8a6134', mid: '#5b3c1b', lo: '#754f27' },
  { id: 'forest', label: 'bosgroen', hi: '#2f4a2c', mid: '#182c17', lo: '#274023' },
  { id: 'navy', label: 'marineblauw', hi: '#2b3a55', mid: '#151f33', lo: '#233149' },
  { id: 'charcoal', label: 'antraciet', hi: '#3a3a3c', mid: '#1c1c1e', lo: '#2e2e30' },
];

const BY_ID = new Map<string, Stain>(COVERS.map((stain) => [stain.id, stain]));

export const coverLabel = (cover: string | null | undefined): string =>
  (cover ? BY_ID.get(cover)?.label : undefined) ?? COVERS[0].label;

/**
 * The custom properties the book paints its outside with — the cover face, the binding
 * behind it and the board edge of the shut leaf, which all have to agree or the book
 * comes apart at the spine.
 *
 * Falls back to bordeaux for an unknown id rather than trusting the value: this comes
 * off the wire, and returning nothing would leave every token unset and the cover
 * transparent. Same reason `packFoil` has a fallback hue.
 *
 * The gold is deliberately *not* derived from the stain. `--foil` is the printing, and
 * a book's blocking does not change colour with its leather.
 *
 * A `background` built out of custom properties cannot be transitioned — which is exactly
 * why `.album__binding` is its own element rather than a background on `.album__book`.
 * Changing the cover therefore cuts rather than fades. The icon re-bind works around it
 * with a second cover element that is revealed by a transitioned `clip-path` instead; see
 * `.album__cover-icons` in album.css.
 */
export const albumLeather = (cover: string | null | undefined): CSSProperties => {
  const stain = (cover ? BY_ID.get(cover) : undefined) ?? COVERS[0];

  return {
    '--leather-hi': stain.hi,
    '--leather-mid': stain.mid,
    '--leather-lo': stain.lo,
    /* Brass, on every stain. */
    '--board-edge': '#6b5325',
    '--foil': '#e6c98a',
    '--foil-rule': '#a9853c',
    /* The emboss under the blocked title. Dark and warm, so it reads as pressed into
       the leather rather than as a drop shadow floating over it. */
    '--foil-emboss': '#241a05',
    /*
     * The boards of the icon binding — a half-bound book, so these are the paper-covered
     * boards and the stain above stays on as its spine and corners.
     *
     * Warm rather than white. A true white next to brass reads as paper stock, and the
     * object has to stay a book; ivory keeps it bound in something. Identical on all five
     * stains for the same reason `--board-edge` is: five upgraded books have to read as
     * five of the same thing, and a green book with green-tinted boards leaves the series.
     *
     * Emitted unconditionally rather than behind a flag. There is no second code path to
     * fall out of step, and an unused custom property costs nothing — the half-binding is
     * composed in CSS out of tokens that are always here.
     */
    '--board-hi': '#f4efe2',
    '--board-mid': '#e6dfcd',
    '--board-lo': '#d8cfb8',
    /*
     * The ink the boards are lettered in — and it is ink, not foil.
     *
     * `--foil` is `#e6c98a`, picked to glow on near-black leather, and on an ivory board it
     * has almost no contrast at all: it is what made "Verzamelalbum van" nearly invisible
     * on the first re-bound cover. The answer is not a brighter gold but the right medium.
     * A half-bound book's boards are paper, paper takes printed ink, and the hot foil stays
     * where it belongs — on the leather spine, which still reads `--foil`.
     *
     * Deep bronze rather than black, so it still belongs to the same warm family as the
     * brass; and identical on all five stains, for the same reason `--board-edge` is.
     */
    '--board-ink': '#6a5124',
    '--board-rule': '#a98b4c',
  } as CSSProperties;
};
