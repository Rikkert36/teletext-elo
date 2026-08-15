import React, { useEffect, useRef, useState } from 'react';
import { Pack } from '../mock/cardMock';
import { packFoil } from '../utils/packFoil';
import { PackGrab, grabPack } from '../utils/packGrab';
import PackFace from './PackFace';
import PackNote from './PackNote';
import '../styles/packopen.css';

/**
 * One unopened packet on the shelf beside the album.
 *
 * Deliberately the same `.pack` element the opener tears apart, at `--pack-w`
 * quarter size — see the `.pack--mini` block in packopen.css for why rendering
 * the actual packet beats a button that describes one.
 *
 * The tilt and the sheen offset are derived from the pack's **id** rather than
 * random, so a re-render never reshuffles the pile — the same three packets keep
 * lying the same way, which is what makes them read as objects.
 *
 * It used to be the array index, which was stable only for as long as the shelf
 * outlived nothing: the opener now runs *beside* the pile rather than replacing it,
 * so a packet leaves the middle of the list while the rest stay on screen. Every
 * packet below it would have inherited its neighbour's tilt and visibly settled into
 * a new position — the pile rearranging itself because one was picked up. Lying
 * still is a property of the packet, so it has to key off the packet.
 *
 * The colour comes from the pack's *type*, not its id or its place — see `packFoil`.
 */

const TILTS = [-3.4, 2.6, -1.4, 4.1, -2.2, 1.8];

/** Cheap stable string hash. Only has to be well spread, not well distributed. */
const hash = (id: string): number => {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
};

interface PackTileProps {
  pack: Pack;
  /**
   * Picked up. The second argument is **where from** — the packet on the stage is flown
   * out of this tile's place in the pile rather than cut to, so the click has to carry
   * the geometry with it; see `PackGrab`. Null only if the element has gone, which it
   * cannot have while its own handler is running.
   */
  onOpen: (pack: Pack, grab: PackGrab | null) => void;
  /**
   * Handed to the shelf, so the pile can close up behind a packet that leaves it.
   *
   * The tiles are the shelf's to measure and this component's to render, and only the
   * shelf knows a packet has been taken — so it keeps the refs and this passes them out.
   * Same construction as `setSlotRef` in `PackOpener`, and re-registered on every render
   * for the same reason: the callback is fresh each time, which costs a Map delete and a
   * Map set and cannot go stale.
   */
  elementRef?: (id: string, el: HTMLButtonElement | null) => void;
  /**
   * This packet is still in the air — so the tile **holds its place and shows nothing**.
   * What the reader watches land is a clone in viewport space; see `returning` in
   * CollectionPage for a packet going back onto the pile, and `dealing` for the whole pile
   * being brought over after the binding. Both land on a tile that was already here.
   *
   * `visibility` rather than not rendering it, because the place is the whole point: the
   * packets either side move aside for it at the start of the flight rather than jumping
   * when it lands, and the clone needs a real box to be flown to.
   */
  held?: boolean;
}

const PackTile: React.FC<PackTileProps> = ({ pack, onOpen, elementRef, held }) => {
  const seed = hash(pack.id);
  const tilt = TILTS[seed % TILTS.length];
  const tileRef = useRef<HTMLButtonElement | null>(null);
  /**
   * Where this packet is lying while its docket is out, and the docket's whole state:
   * null is "no docket". A rect rather than a boolean because `PackNote` is portalled
   * to the body and so has no way of its own to find the tile — see PackNote.
   *
   * Measured on the way in, on the frame the pointer arrives, which is a frame before
   * `.pack--mini:hover`'s 4px lift. That is deliberate: the docket stays where it was
   * put rather than being nudged by the packet twitching under the cursor.
   */
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const showNote = () => setAnchor(tileRef.current?.getBoundingClientRect() ?? null);
  const hideNote = () => setAnchor(null);

  /*
   * A docket is placed in viewport coordinates once and never re-solved, so anything
   * that moves the packet underneath it has to take it away. The pile is a scroll
   * container tall enough to need it, hence `capture` — a scroll inside `.pack-shelf`
   * does not bubble to the window, and this has to see it.
   *
   * Taking it away rather than following: a slip of paper that keeps station with a
   * packet sliding out from under it is a UI element, and the pointer is about to leave
   * the tile anyway.
   */
  useEffect(() => {
    if (!anchor) return undefined;
    /* Its own handle rather than `hideNote`, which is a fresh closure on every render
       and would have this re-subscribe on all of them. */
    const drop = () => setAnchor(null);
    window.addEventListener('scroll', drop, true);
    window.addEventListener('resize', drop);
    return () => {
      window.removeEventListener('scroll', drop, true);
      window.removeEventListener('resize', drop);
    };
  }, [anchor]);

  const vars = {
    ...packFoil(pack),
    '--tilt': `${tilt}deg`,
    '--sheen-delay': `${-(seed % 4) * 0.65}s`,
    ...(held ? { visibility: 'hidden' as const } : null),
  } as React.CSSProperties;

  return (
    <>
      <button
        type="button"
        className="pack pack--mini"
        style={vars}
        ref={(el) => {
          tileRef.current = el;
          elementRef?.(pack.id, el);
        }}
        onClick={() => {
          /* The tile is about to leave the pile with the packet; the docket goes first,
             so it cannot outlive the thing it labels by a frame. */
          hideNote();
          onOpen(pack, tileRef.current ? grabPack(tileRef.current, tilt) : null);
        }}
        onMouseEnter={showNote}
        onMouseLeave={hideNote}
        onFocus={showNote}
        onBlur={hideNote}
        /*
         * **No `title`.** The docket says this, immediately and in the book's own ink;
         * leaving the native one on would pop a second, worse copy of the same sentence
         * over the top of it a second later.
         *
         * The label is the docket's own line and the count the wrapper prints, which are
         * two separate things a reader gets to see at once and a listener does not. It is
         * also the only route to the reason on touch, where there is no hover to open a slip.
         */
        aria-label={`Pakje openen — ${pack.size} ${
          pack.size === 1 ? 'kaart' : 'kaarten'
        }. ${pack.reason}`}
      >
        <PackFace pack={pack} />
      </button>
      {anchor && !held ? <PackNote pack={pack} anchor={anchor} /> : null}
    </>
  );
};

export default PackTile;
