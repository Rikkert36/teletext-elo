import React from 'react';
import { Pack, packPrint } from '../mock/cardMock';

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

const PackFace: React.FC<PackFaceProps> = ({ pack }) => (
  <>
    {/* Decorative: it is the brand, and it says nothing a screen reader needs that
        PackTile's aria-label does not already say. */}
    <span className="pack__mark" aria-hidden="true" />
    <span className="pack__size">{packPrint(pack)}</span>
  </>
);

export default PackFace;
