import React from 'react';
import { Pack, packPrint } from '../mock/cardMock';
import { isArtPack } from '../utils/packFoil';

/**
 * What is printed on the front of a packet: the badge, and how many cards are in it.
 *
 * **On nearly every packet this renders nothing at all**, because the printing is in the
 * photograph — see the `PACK_ART_*` tables in `utils/packFoil.ts`. Drawing over a render
 * would put a second badge on a wrapper that already has one.
 *
 * What is left is the packet with no front: a gift of an odd size, or a floor nobody has
 * drawn a wrapper for. It gets the badge and its count, which is the painted wrapper's
 * own printing and the reason this component still exists.
 *
 * **The set-completion packet used to have a branch here** — a gold hexagon with a ball
 * in it, drawn as an SVG in the numeral's slot. It is printed on its wrapper now, and an
 * icoon packet always has that wrapper, so the branch could not be reached. It went with
 * the painted icoon foil in `packFoil`; docs/trading-cards.md keeps the reasoning.
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

const PackFace: React.FC<PackFaceProps> = ({ pack }) =>
  isArtPack(pack) ? null : (
    <>
      {/* Decorative: it is the brand, and it says nothing a screen reader needs that
          PackTile's aria-label does not already say. */}
      <span className="pack__mark" aria-hidden="true" />
      <span className="pack__size">{packPrint(pack)}</span>
    </>
  );

export default PackFace;
