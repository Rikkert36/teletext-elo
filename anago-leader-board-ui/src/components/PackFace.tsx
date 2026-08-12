import React from 'react';
import { Pack, isIconPack, packPrint } from '../mock/cardMock';

/**
 * What is printed on the front of a packet: the badge, and how many cards are in it.
 *
 * Deliberately nothing else. It also carried "OPENEN" and the grant reason
 * ("testpakje", "gewonnen") for a while; neither is printing. A wrapper does not
 * caption itself with the instruction for opening it, and the reason is metadata
 * about the grant rather than about the product — both are still reachable through
 * PackTile's `title` and `aria-label`, which is where that kind of thing belongs.
 *
 * One component for all four places it appears — the tile on the shelf, the sealed
 * wrapper on the opener, and *both torn halves*. The halves are the reason this is
 * shared rather than written twice: they sit at `inset: 0` over the same box, so
 * giving each of them the whole face and letting its `clip-path` cut through means
 * the printing tears along with the foil. While the print lived only on the parent,
 * it blinked out the instant you clicked and the two halves flew off blank.
 *
 * Spans, not divs: on the shelf the packet is a `<button>`, and the CSS positions
 * these absolutely anyway.
 */

interface PackFaceProps {
  pack: Pack;
}

/**
 * The set-completion packet's mark, in place of a count.
 *
 * A hexagon in gold outline with a gold ball in it, on the white board the rest of the
 * wrapper is. Drawn rather than printed for the reason nothing else on a packet is captioned:
 * the word `icoon` was in this slot first and read as a label stuck on the product — the same
 * objection that removed the `legende` pill from the card face.
 *
 * Pointy-top, and the geometry is a radius-42 hexagon on a 100-unit box: vertices every 60°
 * from straight up, so `0.866 × 42` gives the 36.4 either side of centre. Written out rather
 * than computed because it never changes and a reader can check it against the picture.
 *
 * `stroke` and `fill` come from the packet's own tokens, so the mark cannot drift from the
 * rule around the wrapper — both are the icoon card's gold. `vectorEffect` keeps the outline
 * one weight whatever size the packet is drawn at, which matters because it appears on the
 * shelf tile and on the full-size opener wrapper.
 */
const IcoonMark: React.FC = () => (
  <span className="pack__icoon" aria-hidden="true">
    <svg viewBox="0 0 100 100" role="presentation">
      <path
        d="M50 8 L86.4 29 L86.4 71 L50 92 L13.6 71 L13.6 29 Z"
        fill="var(--foil-hi, #fdfcf8)"
        stroke="var(--ink, #b08e42)"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="50" r="14" fill="var(--ink, #b08e42)" />
    </svg>
  </span>
);

const PackFace: React.FC<PackFaceProps> = ({ pack }) => (
  <>
    {/* Decorative: it is the brand, and it says nothing a screen reader needs that
        PackTile's aria-label does not already say. */}
    <span className="pack__mark" aria-hidden="true" />
    {isIconPack(pack) ? <IcoonMark /> : <span className="pack__size">{packPrint(pack)}</span>}
  </>
);

export default PackFace;
