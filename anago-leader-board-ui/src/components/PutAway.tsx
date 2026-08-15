import React, { useEffect, useRef, useState } from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { RevealedCard } from '../mock/cardMock';
import PlayerCard from './PlayerCard';
import { ms, prefersReducedMotion } from '../utils/animationSpeed';
import { playPageTurn, playSlot } from '../utils/sounds';
import '../styles/putaway.css';

/**
 * A card out of the packet and not yet put away.
 *
 * `from` is where it was lying when the pack was handed over, in viewport pixels —
 * measured by the opener before it went, because by the time anything here runs the row it
 * was lying in has been replaced by the album.
 *
 * `page` is which page its slot is printed on. Not used here: it is how the page works out
 * the order the new ones go in.
 */
export interface Placing {
  card: RevealedCard;
  from: DOMRect;
  page: number;
}

/**
 * Clearing the table, and it is **one gesture with two readings**: the doubles go off the
 * bottom and the keepers move aside, at the same time, as the book comes back underneath.
 *
 * The two used to be serial — the doubles tossed inside the opener, then the hand-over,
 * then the keepers parked — which cost ~600ms and read as two tidyings. They are together
 * here because the album mounts in the same commit that unmounts the opener, so an overlay
 * that outlives both is the only thing that can animate across that seam.
 */
const CLEAR_MS = 420;
/** Between one card and the next, so they go as a handful rather than as a block. */
const CLEAR_STAGGER_MS = 70;
/** A double falls further and faster than a keeper travels, and fades on the way. */
const TOSS_MS = 520;

/**
 * How long one card takes to cross from beside the book into its slot.
 *
 * Deliberately the pack opener's `SETTLE_MS`: this **is** that motion, one step further
 * on. A revealed card travels from the middle of the stage down into the row, and then
 * from beside the book into its slot — the same card, the same hand, the same curve, so
 * the two must not be tuned apart.
 */
const FLIGHT_MS = 460;

/** Vertical offset between two parked cards. A hand held slightly fanned. */
const PARK_FAN = 34;
/** Kept off the edges of the window by at least this much. */
const PARK_EDGE = 10;

const EASING = 'cubic-bezier(0.32, 0.72, 0.28, 1)';
/** A double is dropped rather than placed, so it leaves on a curve that accelerates. */
const TOSS_EASING = 'cubic-bezier(0.4, 0, 0.9, 0.4)';

interface PutAwayProps {
  /** Every card on the table, in row order — however many packets that spans. */
  cards: Placing[];
  /**
   * Which card may go into the book now, **as a position in that row**, or null while none
   * may. A position rather than a player id, because a row spanning two packets can hold
   * the same player twice: new in the first, a double in the second.
   *
   * The page owns the pacing, because the beat before a card is the *book's* — the page it
   * is printed on has to be turned to and landed before anything is flown at it.
   */
  flying: number | null;
  /** The table is clear: the doubles are gone and the keepers are standing by. */
  onCleared: () => void;
  /** The flying one has arrived in its slot. */
  onLanded: () => void;
}

/**
 * The cards after the packet: where they wait, and how they get into the book.
 *
 * The end of opening a pack, and the reason the page has no exit button — the reveal runs
 * on into this and the album is simply what is there when it finishes.
 *
 * **The cards never leave the screen.** They come out of the packet, stand aside while the
 * book is put back in front of you, and then go in one at a time. So the pack you opened
 * and the cards in the album are the same objects the whole way through, and nothing has to
 * be taken on trust. An earlier version flew them straight from the row into the slots as
 * the book arrived, which put the one moment the reader most wants to follow on top of the
 * one moment the whole middle of the screen changes.
 *
 * **Fixed-position clones, not the slots themselves.** `.album` carries `perspective` and
 * `.album__book` is `preserve-3d`, so a card animated inside the book joins the leaves'
 * depth sort and a translate across the table is projected through the perspective on the
 * way. A fixed overlay outside the book is flat viewport space, which is the space every
 * rect here was measured in.
 *
 * **Nothing is resized.** A card in the opener's finished row is exactly `--album-card-w` —
 * the width of a slot in the book — so the whole sequence is translation. That is worth
 * more than it sounds: the flight is not a card *becoming* an album card, it is a card
 * being put where it goes.
 */
const PutAway: React.FC<PutAwayProps> = ({ cards, flying, onCleared, onLanded }) => {
  /**
   * Which cards are in the book, by row position. Their clone goes as the slot fills — see
   * `land`. Positions rather than player ids, for the reason `flying` is one.
   */
  const [landed, setLanded] = useState<ReadonlySet<number>>(new Set());
  const refs = useRef(new Map<number, HTMLDivElement>());
  const timers = useRef<number[]>([]);

  const setRef = (index: number) => (el: HTMLDivElement | null) => {
    if (el) refs.current.set(index, el);
    else refs.current.delete(index);
  };

  useEffect(
    () => () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    },
    [],
  );

  /*
   * Clearing the table. One effect, on mount.
   *
   * Inside a `requestAnimationFrame` because the clones have to be *painted* at their
   * start boxes before a transition can run from them, or the browser coalesces the two
   * and the cards simply appear where they were going.
   */
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      /*
       * The keepers stand beside the book, in the margin the shelf and the register live in
       * — both of which are set aside for the whole of this, because your hands are full.
       * Measured from the book rather than from the window so they stand *next to* it at any
       * width, and clamped so they cannot end up off the edge on a stacked layout where the
       * book is nearly as wide as the screen.
       */
      const book = document
        .querySelector<HTMLElement>('.album__book')
        ?.getBoundingClientRect();

      const keepers = cards.filter((placing) => placing.card.isNew);
      const width = cards[0]?.from.width ?? 0;
      const height = cards[0]?.from.height ?? 0;
      const right = book ? book.right : window.innerWidth * 0.72;
      const gap = Math.max(12, (window.innerWidth - right - width) / 2);
      const x = Math.min(right + gap, window.innerWidth - width - PARK_EDGE);

      /* The fan is centred on the book, so the hand sits at the height of the pages. */
      const fanned = height + PARK_FAN * Math.max(0, keepers.length - 1);
      const middle = book ? book.top + book.height / 2 : window.innerHeight / 2;
      const top = Math.max(PARK_EDGE, middle - fanned / 2);

      /*
       * One sound for the handful rather than one per card: paper moving, and the same
       * weight of event as a leaf turning, which is the argument the register already
       * borrows it on. Five of these inside half a second is a rustle nobody authored.
       */
      playPageTurn();

      /*
       * Every transform here is written against the element's own layout box, which is the
       * rect the card came out of the packet in — so a translate is simply "where it should
       * be now, less where it started". The flight below is written the same way, and the
       * transition carries it from wherever the clearing left it.
       */
      let keeper = 0;
      cards.forEach((placing, index) => {
        const el = refs.current.get(index);
        if (!el) return;

        const delay = ms(CLEAR_STAGGER_MS * index);

        if (placing.card.isNew) {
          const to = top + PARK_FAN * keeper;
          keeper += 1;
          el.style.transition = `transform ${ms(CLEAR_MS)}ms ${EASING} ${delay}ms`;
          el.style.transform = `translate(${Math.round(x - placing.from.left)}px, ${Math.round(
            to - placing.from.top,
          )}px)`;
          return;
        }

        /*
         * A double is not waste and nothing here treats it as rubbish: what the book keeps
         * of one is a numeral beside its tick on the checklist, and a checklist is also a
         * swap list. There is no second slot for it, so off the table is where it goes —
         * turning slightly as it drops, which is the whole of the tell that it is being
         * dropped rather than filed.
         */
        const drift = (index % 2 === 0 ? -1 : 1) * (14 + index * 8);
        const spin = (index % 2 === 0 ? -1 : 1) * (9 + index * 3);
        el.style.transition = `transform ${ms(TOSS_MS)}ms ${TOSS_EASING} ${delay}ms, opacity ${ms(
          TOSS_MS,
        )}ms linear ${delay}ms`;
        el.style.transform = `translate(${Math.round(drift)}px, ${Math.round(
          placing.from.height * 1.5,
        )}px) rotate(${spin}deg) scale(0.86)`;
        el.style.opacity = '0';
      });

      /* The table is clear when the last thing to leave has left. */
      timers.current.push(
        window.setTimeout(
          onCleared,
          ms(Math.max(CLEAR_MS, TOSS_MS) + CLEAR_STAGGER_MS * Math.max(0, cards.length - 1)),
        ),
      );
    });

    return () => window.cancelAnimationFrame(frame);
    /*
     * Mount only, deliberately. The cards are a snapshot of one packet and they are
     * already moving; re-running this would send them off again from boxes nothing is
     * lying in.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* And putting one in. Runs when the page says this card's page is open and landed. */
  useEffect(() => {
    if (flying === null) return undefined;

    const placing = cards[flying];
    const el = refs.current.get(flying);
    const duration = ms(FLIGHT_MS);

    const land = () => {
      /*
       * The card being put in its place — the album's own sound for exactly this.
       *
       * The clone leaving and the slot filling are **one commit**: this runs from a
       * timeout, and `index.tsx` mounts with legacy `ReactDOM.render`, which does not
       * batch those. Unbatched, the clone goes one frame before the book draws the card,
       * and the hole blinks.
       */
      playSlot();
      unstable_batchedUpdates(() => {
        setLanded((current) => new Set(current).add(flying));
        onLanded();
      });
    };

    /*
     * The slot, but only if the reader can actually see it. Every leaf of the book is in
     * the document at all times, so the element existing proves nothing —
     * `data-slot-shown` is the album saying this one is on the page in front of you. A
     * zero-width rect is refused for the same reason the opener's FLIP refuses one.
     */
    const slot = placing
      ? document
          .querySelector<HTMLElement>(
            `[data-slot-player="${placing.card.player.id}"][data-slot-shown="1"]`,
          )
          ?.getBoundingClientRect()
      : undefined;

    /*
     * Nothing to fly, or nowhere to fly it. The card is already in the collection, so all
     * that is owed is the report: the slot fills without a card being seen to arrive in
     * it, which is a beat lost rather than a state that is wrong.
     */
    if (!placing || !el || !slot || slot.width === 0) {
      const timer = window.setTimeout(land, duration);
      return () => window.clearTimeout(timer);
    }

    /*
     * **The same sound the card made getting here.** Standing aside and going in are one
     * gesture in two steps — a hand moving cards, the same distance, on the same curve, at
     * the same `FLIGHT_MS` — so the travel sounds the same both times and only the *ending*
     * differs: nothing at the margin, `playSlot` in the book.
     *
     * One per flight is not the rustle the clearing note refuses. Those five went at once
     * and had to be one sound; these are strictly sequential, paced by the page turning
     * between them, so they are never within half a second of each other.
     *
     * Below the early return above, deliberately: with no slot on screen there is no flight
     * to hear, and a swish over a card that does not move is worse than a beat of silence.
     */
    playPageTurn();

    /*
     * Pure translation — see the note on the component. The card in the row was already a
     * slot's width, so there is no scale to interpolate and no `--flip-scale` to keep the
     * rim honest through one.
     */
    el.style.transition = `transform ${duration}ms ${EASING}`;
    el.style.transform = `translate(${Math.round(slot.left - placing.from.left)}px, ${Math.round(
      slot.top - placing.from.top,
    )}px)`;

    const timer = window.setTimeout(land, duration);
    return () => window.clearTimeout(timer);
    /*
     * `flying` only. The cards and the callbacks are fixed for the life of the sequence,
     * and re-running this on a new callback identity would restart the flight.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flying]);

  /*
   * A reader who has asked for less motion never gets here — the opener reports nothing to
   * clear and the page simply puts the book back, which is landing on the finished state
   * rather than playing it stilled. This is for the setting being turned on *during* a
   * sequence, where the alternative is a hand of cards parked in the margin with no
   * transition left to carry them anywhere. The timers still run, so the slots still fill.
   */
  if (prefersReducedMotion()) return null;

  return (
    <div className="putaway" aria-hidden="true">
      {cards.map((placing, index) => {
        if (landed.has(index)) return null;

        return (
          <div
            key={index}
            ref={setRef(index)}
            /*
              `.opener__slot--new` for the green rim, and only on the keepers: these are
              new cards until they are in the book, and the rim is the whole of what says
              so. No `--flying`, which exists to divide that rim by a live scale factor —
              nothing here scales.
            */
            className={`putaway__flight opener__slot${
              placing.card.isNew ? ' opener__slot--new' : ''
            }`}
            style={{
              left: `${Math.round(placing.from.left)}px`,
              top: `${Math.round(placing.from.top)}px`,
              width: `${Math.round(placing.from.width)}px`,
              height: `${Math.round(placing.from.height)}px`,
              /* First out of the packet on top, so the hand reads in the order it was dealt. */
              zIndex: cards.length - index,
            }}
          >
            {/*
              `eager`, like every card that mounts mid-motion: this element is a fresh one
              and a lazy portrait would miss the first frame and blink to bare metal. See
              the prop's note in PlayerCard.
            */}
            <PlayerCard card={placing.card} eager />
          </div>
        );
      })}
    </div>
  );
};

export default PutAway;
