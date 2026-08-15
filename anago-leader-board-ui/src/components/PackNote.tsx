import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pack } from '../mock/cardMock';

/**
 * The docket that comes with a packet: one line saying where it came from.
 *
 * The shelf shows you three packets and nothing about them. Their colour says what
 * size they are and their print says how many cards, but not one of them says why it
 * is lying there — and "why" is the half of a packet that is actually about you: the
 * game you won this morning, the free one for turning up, a present from a colleague.
 * That was reachable only through a native `title`, which is a second of waiting for
 * five words of unstyled tooltip in the corner of the cursor.
 *
 * **One line, and it is `pack.reason` verbatim.** There is no heading, no second line
 * and nothing about the contents: the wrapper already prints the number of cards, and
 * a slip that repeats it and then explains it is three layers of label on an object
 * that only ever had one thing left to say. The sentence is written whole by
 * `PackService` — the game line needs the other three players' names, which live on
 * the replayed game row and reach no client, so all four kinds are written there
 * rather than one there and three here.
 *
 * **It is a slip of paper, not a panel.** game.css's third rule — everything on the
 * table is an object or it is engraved, nothing gets a panel — leaves exactly two ways
 * to say this, and a floating dark box with a hairline border is neither of them. So
 * the docket is the book's own stock: `.album__page`'s cream, `.album__page`'s ink and
 * two layers of its sheet, with `--drop` under it, as if it had been in the packet — the
 * first pass was flat colour in a browser face and looked it. The other reading — type cut
 * into the timber — was passed over because the slip has to be legible over the *book*
 * as often as over bare wood, and engraving that crosses onto paper stops being it.
 *
 * **It is square to the screen and lands on whole pixels**, which is the one place this
 * departs from everything else on the table: the packets lie at an angle, and a rotated
 * or half-pixel box costs small type its subpixel antialiasing. See the `.pack-note`
 * block in packopen.css for the whole of that argument.
 *
 * **Portalled to the body, and it has to be.** `.pack-shelf` is `overflow-y: auto`
 * (packopen.css), so it clips on both axes — a docket rendered beside the tile would
 * be cut off at the pile's edge, which is the same thing that forced `returning`'s
 * flying clone out to the shell in CollectionPage. Nor can it be `position: fixed`
 * inside the tile: `.pack--mini` carries a `transform`, which makes it the containing
 * block for fixed descendants and puts them back under the scroller's clip.
 */

/** The gap between the packet and its docket, and the closest it comes to a viewport edge. */
const GAP = 14;
const EDGE = 10;

interface PackNoteProps {
  pack: Pack;
  /** Where the packet is lying, in viewport coordinates. Measured by the tile on hover. */
  anchor: DOMRect;
}

interface Placement {
  left: number;
  top: number;
}

const PackNote: React.FC<PackNoteProps> = ({ pack, anchor }) => {
  const noteRef = useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);

  /*
   * Placed from the docket's own measured size, which is the only way round now that it
   * is one line: a slip is as wide as its sentence, so "Cadeaupakje" and a four-name
   * game line are different objects and neither can be positioned from a number written
   * in the stylesheet.
   *
   * `useLayoutEffect` and not `useEffect`: this runs on the commit that mounted it, and
   * the state it sets is flushed before the browser paints — so the first frame anyone
   * sees is already in the right place. On `useEffect` the docket would paint once at
   * the top-left of the window and then jump.
   *
   * `offsetWidth`/`offsetHeight` rather than a rect, because those are integers: the
   * anchor is a `DOMRect` off a rotated packet and so is fractional in both axes, and a
   * box of text landing on x.4 is rasterised between two columns of pixels. That is the
   * other half of what made this look soft — see the `.pack-note` block in packopen.css
   * for the first half, which was the slip's own 1.1° lean.
   */
  useLayoutEffect(() => {
    const el = noteRef.current;
    if (!el) return;

    const { offsetWidth: w, offsetHeight: h } = el;
    /* Toward the book by default — the shelf is in a margin, so the table is that way.
       It flips only when the window has left it nowhere to go. */
    const fitsRight = anchor.right + GAP + w + EDGE <= window.innerWidth;
    const left = fitsRight ? anchor.right + GAP : anchor.left - GAP - w;
    /* Centred on the packet, then held inside the window: the pile scrolls, so its top
       and bottom tiles can be close enough to an edge for a wrapped docket not to fit. */
    const centred = anchor.top + anchor.height / 2 - h / 2;
    const top = Math.max(EDGE, Math.min(centred, window.innerHeight - h - EDGE));

    /* Whole pixels, for the reason above. A packet lying at 4.1° is what makes this
       necessary and it is cheap enough to do unconditionally. */
    setPlacement({ left: Math.round(left), top: Math.round(top) });
  }, [anchor]);

  return createPortal(
    <div
      ref={noteRef}
      className={`pack-note ${placement ? 'pack-note--placed' : 'pack-note--measuring'}`}
      style={placement ? { left: placement.left, top: placement.top } : undefined}
      /* The tile's `aria-label` already says this, and a slip of paper that follows the
         cursor is not a thing to put in the accessibility tree twice. */
      aria-hidden="true"
    >
      {pack.reason}
    </div>,
    document.body,
  );
};

export default PackNote;
