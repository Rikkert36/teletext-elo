import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardPlayer, toCard } from '../mock/cardMock';
import PlayerCard, { ownedLabel } from './PlayerCard';
import useIsMobile from '../hooks/useIsMobile';
import { albumLeather } from '../utils/albumLeather';
import { playCoverTurn, playPageTurn } from '../utils/sounds';
import '../styles/album.css';

const SLOTS_PER_PAGE = 6;

/**
 * Where the reader left off, so the album reopens where they closed it.
 *
 * Stored as a leaf index — what the desktop book is in terms of — with mobile
 * converting either way, so switching between the two layouts lands on roughly
 * the same spread instead of resetting.
 *
 * Absent means a first visit, which is deliberately the closed book (leaf 0).
 *
 * **Keyed per owner.** It used to be one global key, which meant two things: opening a
 * colleague's album landed you on *your* page in it, and — worse — an album that had
 * just been bound in the opening sequence opened halfway through, at the one moment the
 * shut cover is the entire point. A fresh owner has no entry and so starts closed,
 * which is exactly what the ceremony hands over to.
 */
const leafKey = (owner?: string): string =>
  `tafelvoetbal.cards.albumLeaf${owner ? `.${owner}` : ''}`;

const readLeaf = (owner?: string): number => {
  try {
    const stored = window.localStorage.getItem(leafKey(owner));
    if (stored === null) return 0;
    const leaf = parseInt(stored, 10);
    return Number.isFinite(leaf) && leaf >= 0 ? leaf : 0;
  } catch {
    return 0;
  }
};

const writeLeaf = (leaf: number, owner?: string): void => {
  try {
    window.localStorage.setItem(leafKey(owner), String(leaf));
  } catch {
    /* private browsing — the position just will not survive the session */
  }
};

export interface AlbumSection {
  title: string;
  /** Everything collectable in this section, in display order. */
  players: CardPlayer[];
  /** How many of each you hold. Absent or 0 renders a silhouette. */
  counts: Map<string, number>;
}

interface Slot {
  card: Card;
  count: number;
}

/** A slot plus which page it is printed on, for anything navigating the book. */
export interface AlbumSlotRef extends Slot {
  page: number;
}

interface AlbumPage {
  kind: 'cover' | 'slots';
  title: string;
  subtitle?: string;
  /** Cover only: the line above the name. */
  kicker?: string;
  slots: Slot[];
}

/* ------------------------------------------------------------------ *
 * Page building
 * ------------------------------------------------------------------ */

/**
 * Page 0 is the front cover, so leaf 0 carries [cover | first page of players].
 *
 * That gives the book a genuinely closed state at `flipped === 0` — which is
 * where a first-time visitor starts, and which the back arrow can always return
 * to. Without a cover page, `flipped === 0` already showed an open spread and
 * there was nothing to open.
 *
 * No blank inside-cover behind it, deliberately: it would cost a page, and on
 * mobile (one page per swipe) it would be an empty swipe between the cover and
 * the first players.
 */
const buildPages = (sections: AlbumSection[], owner?: string): AlbumPage[] => {
  const pages: AlbumPage[] = [];

  if (sections.length > 0) {
    const total = sections.reduce((sum, s) => sum + s.players.length, 0);
    const owned = sections.reduce(
      (sum, s) => sum + s.players.filter((p) => (s.counts.get(p.id) ?? 0) > 0).length,
      0,
    );
    /*
     * The cover carries whose album it is, which is why the page header above the
     * stage no longer repeats it. On a real album that line is the whole front.
     */
    pages.push({
      kind: 'cover',
      kicker: owner ? 'Verzamelalbum van' : undefined,
      title: owner ?? 'Verzamelalbum',
      subtitle: `${owned} / ${total} spelers`,
      slots: [],
    });
  }

  sections.forEach((section, sectionIndex) => {
    const owned = section.players.filter((p) => (section.counts.get(p.id) ?? 0) > 0).length;

    /*
     * The running head names the album and its owner, not the section. A section
     * name on every page was a heading for a distinction the reader cannot act on.
     * So it survives only as a qualifier on the counter, and only where it is not
     * the default.
     *
     * As of the legends interleave the collection page passes a single section, so
     * the qualifier never renders. The machinery is kept because it costs nothing
     * and a second section is a plausible future — a set, a season — but nothing
     * here should be tuned for a case that does not currently occur.
     */
    const head = owner ? `Verzamelalbum · ${owner}` : 'Verzamelalbum';
    const tally =
      sectionIndex === 0
        ? `${owned}/${section.players.length}`
        : `${section.title} ${owned}/${section.players.length}`;

    /*
     * Start each section at the left of a spread, so two sections never share one —
     * a spread with a different heading on each side looks like a mistake. Inert
     * while there is only one section, which is the case since legends were
     * interleaved rather than appended.
     *
     * Leaf i holds [page 2i, page 2i+1], and at `flipped = f` the spread shows
     * page 2f-1 on the left and 2f on the right — so a section must begin on an
     * ODD index. The cover at page 0 is what makes that the odd case: it leaves
     * `pages.length` at 1 here, so the first section already starts correctly and
     * only later ones can need padding.
     */
    if (pages.length % 2 === 0) {
      pages.push({ kind: 'slots', title: '', slots: [] });
    }

    for (let i = 0; i < section.players.length; i += SLOTS_PER_PAGE) {
      const chunk = section.players.slice(i, i + SLOTS_PER_PAGE);
      const slots = chunk.map((player) => ({
        card: toCard(player),
        count: section.counts.get(player.id) ?? 0,
      }));
      pages.push({
        kind: 'slots',
        title: head,
        subtitle: tally,
        slots,
      });
    }
  });

  /*
   * No padding to an even page count. A half-empty last leaf renders its missing
   * back as a blank page anyway, and padding to fill it only ever added a spread
   * you could turn to that had nothing on either side. What keeps that spread
   * unreachable is `maxFlipped`, not the page count being even.
   */
  return pages;
};

/**
 * Every slot in the book, in printed order, placeholders included.
 *
 * For the card viewer, whose left/right must land on the next slot *as printed* —
 * so it has to be built from the same `buildPages` the album renders from rather
 * than from the sections directly, or the two orders drift the moment a section
 * gets a padding page.
 */
export const albumSlotOrder = (sections: AlbumSection[], owner?: string): AlbumSlotRef[] =>
  buildPages(sections, owner).flatMap((page, index) =>
    page.slots.map((slot) => ({ ...slot, page: index })),
  );

/**
 * The leaf count at which a given page is on screen.
 *
 * Leaf `i` holds page `2i` on its front and `2i+1` on its back, and at
 * `flipped = f` the spread shows `2f-1` on the left and `2f` on the right. Both
 * solve to `ceil(page / 2)`.
 */
const flippedForPage = (page: number): number => Math.ceil(page / 2);

/* ------------------------------------------------------------------ *
 * Page rendering
 * ------------------------------------------------------------------ */

const PageFace: React.FC<{
  page: AlbumPage | undefined;
  index: number;
  /**
   * Whether this page is the one on screen.
   *
   * Every leaf is rendered at all times, and a face rotated away from the reader is
   * still in the document and still focusable — so without this, tabbing walks the
   * cards of every page in the book, most of them invisible.
   */
  visible: boolean;
  onCardOpen?: (playerId: string) => void;
}> = ({ page, index, visible, onCardOpen }) => {
  if (!page) return <div className="album__page" />;

  if (page.kind === 'cover') {
    return (
      <div className="album__cover">
        {page.kicker ? <div className="album__cover-kicker">{page.kicker}</div> : null}
        <div className="album__cover-title">{page.title}</div>
        <div className="album__cover-rule" />
        <div className="album__cover-sub">{page.subtitle}</div>
      </div>
    );
  }

  return (
    <div className="album__page">
      <div className="album__page-header">
        <span className="album__page-title">{page.title}</span>
        {page.subtitle ? <span className="album__page-sub">{page.subtitle}</span> : null}
      </div>

      {/*
        Each card sits in its own slot rather than directly in the grid. The slot
        is what the page is designed *around*: it draws the mount the card is
        held by — a die-cut outline, a chalked position, a stone niche — at
        exactly the grid position, which artwork in the background SVG cannot do
        because that layer is scaled to cover and does not share the grid.

        The slot is also the click target: it is the card's exact box, and putting
        the handler on it rather than on the card means an empty position opens too.
        A silhouette is the one card you most want to look at.
      */}
      <div className="album__slots">
        {page.slots.map((slot) => {
          const empty = slot.count === 0;
          return (
            <button
              key={slot.card.player.id}
              type="button"
              className={`album__slot${empty ? ' album__slot--empty' : ''}`}
              tabIndex={visible ? 0 : -1}
              /* How the card viewer finds this slot again to hand focus back. */
              data-slot-player={slot.card.player.id}
              onClick={() => onCardOpen?.(slot.card.player.id)}
              aria-label={`${slot.card.player.name} — ${ownedLabel(slot.count)}`}
            >
              <PlayerCard card={slot.card} empty={empty} count={slot.count} />
            </button>
          );
        })}
      </div>

      {/* The cover is page 0, so a content page's number is its index, not +1. */}
      <div className="album__page-number">{index}</div>
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * Album
 * ------------------------------------------------------------------ */

/**
 * The cover is a board on a glued spine and sounds nothing like a sheet, so the
 * two moves get different sounds — see `playCoverTurn`.
 *
 * The move that turns the cover is the one between the shut book and the first
 * spread, in either direction: leaf 0 on the desktop book, page 0 on mobile.
 * Everything else is paper.
 */
const playTurnSound = (from: number, to: number): void => {
  if (Math.min(from, to) === 0) playCoverTurn();
  else playPageTurn();
};

interface AlbumProps {
  sections: AlbumSection[];
  /** Whose album this is. Printed on the cover. */
  owner?: string;
  /**
   * The owner's player id, used only to key the saved reading position.
   *
   * Separate from `owner` because that is a display name and display names are not
   * unique — there are two Daans and two Jeroens on the board, and they would share a
   * page position.
   *
   * The component does not re-read the position when this changes, so the collection
   * page mounts the album with `key={playerId}`; switching owner is a different book,
   * not the same book showing something else.
   */
  ownerId?: string;
  /**
   * Which leather the book is bound in — one of `utils/albumLeather.ts`'s ids.
   *
   * Read on every render rather than resolved once, so a cover that changes re-stains
   * in place. Undefined falls back to bordeaux, the binding the album had before there
   * was a choice.
   */
  cover?: string;
  /**
   * Replaces the label above the book while it is shut and has not been opened yet.
   *
   * For the end of the opening ceremony. The sequence hands over a shut book — which is
   * right, a book being bound is a closed object — but that leaves a new owner looking at
   * something with no visible way in, and this album deliberately has **no chrome**: no
   * arrows beside it, and nothing drawn on the page-turn strips. The line above the book is
   * the one place that carries discoverability, so it is where the invitation goes.
   *
   * Clears itself the moment the book is opened, rather than on a timer or a flag from
   * above: the hint exists to get you in, and once you are in it is answered.
   */
  hint?: string;
  /** Rendered under the book, e.g. the page controls' surroundings. */
  footer?: ReactNode;
  /** A card was clicked. Opens it in the viewer. */
  onCardOpen?: (playerId: string) => void;
  /**
   * Turn to the spread this card is printed on, **silently**.
   *
   * Set to whatever the card viewer is showing, so browsing left and right behind
   * the scrim leaves the book open on the right spread when the viewer closes. No
   * separate close-time handling, and the 620ms leaf transition is never seen.
   */
  focusPlayerId?: string | null;
}

const Album: React.FC<AlbumProps> = ({
  sections,
  owner,
  ownerId,
  cover,
  hint,
  footer,
  onCardOpen,
  focusPlayerId,
}) => {
  const isMobile = useIsMobile();
  const pages = useMemo(() => buildPages(sections, owner), [sections, owner]);

  const leafCount = Math.ceil(pages.length / 2);
  /**
   * The furthest the book opens.
   *
   * Not `leafCount`: the last leaf's back is often empty, and turning to it gave
   * a spread with nothing on either side. The last real page is `pages.length-1`,
   * and it is on screen at `flipped = ceil(that / 2)` — as the right-hand page
   * when even, the left-hand one when odd.
   */
  const maxFlipped = Math.max(0, Math.ceil((pages.length - 1) / 2));
  /**
   * Number of leaves currently turned to the left. 0 is the closed book.
   *
   * Restored from the last visit, which is why the stored value is a leaf rather
   * than a page: it is the thing the desktop book is actually in terms of. A
   * first-time visitor has nothing stored and so starts at 0 — closed.
   */
  const [flipped, setFlipped] = useState(() => readLeaf(ownerId));
  /** The leaf mid-rotation, which must sit above both stacks. */
  const [moving, setMoving] = useState<number | null>(null);

  /** Mobile page index and the direction it arrived from. */
  const [mobilePage, setMobilePage] = useState(() => readLeaf(ownerId) * 2);

  /**
   * Whether this book has been open at any point since it was mounted.
   *
   * Only the `hint` uses it, and only to stop the invitation coming back when a reader
   * shuts the book again. A one-way latch rather than a check on the current position,
   * because "you have not worked out how to open this" is not a thing that can become true
   * again once it has been false.
   */
  const [everOpened, setEverOpened] = useState(() => readLeaf(ownerId) > 0);
  const touchStartX = useRef<number | null>(null);

  /*
   * The album grows when legends unlock, and could shrink if the pool did, so a
   * restored position can point past the end. Clamp after the pages are known
   * rather than at read time.
   */
  useEffect(() => {
    if (pages.length === 0) return;
    setFlipped((f) => Math.min(f, maxFlipped));
    setMobilePage((p) => Math.min(p, pages.length - 1));
  }, [maxFlipped, pages.length]);

  useEffect(() => {
    writeLeaf(isMobile ? Math.floor(mobilePage / 2) : flipped, ownerId);
  }, [isMobile, flipped, mobilePage, ownerId]);

  /*
   * Latch the hint off as soon as the book is open, by any route — the cover click, a turn
   * strip, an arrow key, a swipe, or the card viewer turning to a card. Watching the
   * position rather than hooking `turn()` is what makes that "any route" rather than a list
   * of routes somebody has to remember to extend.
   */
  useEffect(() => {
    if (isMobile ? mobilePage > 0 : flipped > 0) setEverOpened(true);
  }, [isMobile, flipped, mobilePage]);

  /*
   * Follow the card viewer: whatever it is showing, the book turns to.
   *
   * Deliberately *not* via `turn()`, which plays `playPageTurn()`. This turn happens
   * behind the viewer's scrim, where a page-turn sound with no page visible to turn
   * is unexplained noise; the reader is browsing cards, not pages.
   */
  useEffect(() => {
    if (!focusPlayerId) return;
    const page = pages.findIndex((p) =>
      p.slots.some((slot) => slot.card.player.id === focusPlayerId),
    );
    if (page < 0) return;

    if (isMobile) {
      setMobilePage((current) => (current === page ? current : page));
      return;
    }

    const target = Math.min(flippedForPage(page), maxFlipped);
    setFlipped((current) => {
      if (current === target) return current;
      setMoving(target > current ? current : target);
      return target;
    });
  }, [focusPlayerId, pages, isMobile, maxFlipped]);

  const turn = useCallback(
    (delta: number) => {
      if (isMobile) {
        setMobilePage((current) => {
          const next = Math.min(Math.max(current + delta, 0), pages.length - 1);
          if (next !== current) playTurnSound(current, next);
          return next;
        });
        return;
      }

      setFlipped((current) => {
        const next = Math.min(Math.max(current + delta, 0), maxFlipped);
        if (next === current) return current;
        // The leaf that moves is the one being turned, in either direction.
        setMoving(delta > 0 ? current : next);
        playTurnSound(current, next);
        return next;
      });
    },
    [isMobile, maxFlipped, pages.length],
  );

  /*
   * Left and right turn the page — the keyboard equivalent of the turn strips,
   * clamped at both ends exactly as they are.
   *
   * On the window rather than on the book, and for the same reason the card viewer
   * does it: the strips are the only focusable thing on the book, they go dead at
   * either end, and nothing hands the book focus when the page loads — so a
   * listener on the element would only respond after a click somewhere on it.
   *
   * The two listeners must not both be live, or an arrow turns a page *and* steps
   * the viewer. A `focusPlayerId` means a card is open, which is when the viewer's
   * arrows own the book, so the album's stand down for as long as one is showing.
   */
  useEffect(() => {
    if (focusPlayerId) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      /* Browser and OS shortcuts (back, word-wise motion, selection) stay theirs. */
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

      /* The name type-ahead needs its own arrows — and a caret needs to move. */
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (target?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return;
      }

      event.preventDefault();
      turn(event.key === 'ArrowLeft' ? -1 : 1);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusPlayerId, turn]);

  /**
   * Unflipped leaves stack lowest-index-on-top so leaf `flipped` shows on the
   * right; flipped leaves stack highest-index-on-top so leaf `flipped - 1` shows
   * on the left. The leaf in motion outranks both.
   */
  const leafZ = (index: number): number => {
    if (moving === index) return leafCount + 2;
    return index < flipped ? index + 1 : leafCount - index;
  };

  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 45) turn(dx < 0 ? 1 : -1);
  };

  const atStart = isMobile ? mobilePage === 0 : flipped === 0;
  const atEnd = isMobile ? mobilePage >= pages.length - 1 : flipped >= maxFlipped;

  /** Content pages, excluding the cover at index 0. */
  const sheetCount = Math.max(pages.length - 1, 0);

  /**
   * At `flipped === 0` the book is shut and there is no page to name. Otherwise
   * the spread shows pages 2f-1 and 2f, and the last one can be a single page.
   */
  const spreadLabel = (): string => {
    if (flipped === 0) return '';
    const low = flipped * 2 - 1;
    const high = Math.min(flipped * 2, sheetCount);
    return low === high
      ? `pagina ${low} / ${sheetCount}`
      : `pagina ${low}–${high} / ${sheetCount}`;
  };

  /** Shut, showing only the front cover. Where a first visit starts. */
  const closed = isMobile ? mobilePage === 0 : flipped === 0;

  /*
   * The line above the book, and the only chrome the album has.
   *
   * Three things can be there, in order of precedence:
   *
   *   hint      an invitation, while a book that has never been opened is shut
   *   gesloten  the shut book, once it has been opened at least once
   *   pagina …  where you are
   *
   * `gesloten` on its own was fine for a returning reader and useless for a new one: it
   * names the state instead of offering the way out of it, in front of an album that
   * deliberately has no arrows and nothing drawn on its turn strips. The hint is answered
   * by opening the book, which is the only thing it asks for — so it cannot linger, and a
   * reader who shuts the book again gets the plain label rather than being told twice.
   */
  const pageLabel = isMobile
    ? mobilePage === 0
      ? 'gesloten'
      : `pagina ${mobilePage} / ${sheetCount}`
    : spreadLabel();

  const label = hint && closed && !everOpened ? hint : pageLabel;

  return (
    <>
      <div className="album__nav-label">{label}</div>

      <div className="album-row">
        <div
          className={[
            'album',
            isMobile ? 'album--mobile' : '',
            closed && !isMobile ? 'album--closed' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          /*
            The binding, the cover face and the board edge all read their colours from
            here, so the outside of the book agrees with itself. The pages inside do
            not — paper is paper in every stain.
          */
          style={albumLeather(cover)}
          onTouchStart={isMobile ? onTouchStart : undefined}
          onTouchEnd={isMobile ? onTouchEnd : undefined}
          /* Clicking the cover opens it, which is what one does to a book. */
          onClick={closed ? () => turn(1) : undefined}
        >
        <div className="album__book">
          {!isMobile ? (
            <>
              <div className="album__binding" />
              <div className="album__backing album__backing--left" />
              <div className="album__backing album__backing--right" />
            </>
          ) : null}

          {isMobile
            ? pages.map((page, index) => {
                const state =
                  index === mobilePage
                    ? 'album__slide--current'
                    : index < mobilePage
                      ? 'album__slide--out-left'
                      : 'album__slide--out-right';
                return (
                  <div key={index} className={`album__slide ${state}`}>
                    <PageFace
                      page={page}
                      index={index}
                      visible={index === mobilePage}
                      onCardOpen={onCardOpen}
                    />
                  </div>
                );
              })
            : Array.from({ length: leafCount }, (_, leaf) => (
                <div
                  key={leaf}
                  className={[
                    'album__leaf',
                    leaf < flipped ? 'album__leaf--flipped' : '',
                    leaf === 0 ? 'album__leaf--cover' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ zIndex: leafZ(leaf) }}
                  onTransitionEnd={() => setMoving((m) => (m === leaf ? null : m))}
                >
                  {/* The spread is page 2f-1 on the left and 2f on the right, so the
                      two faces on screen are leaf f's front and leaf f-1's back. */}
                  <div className="album__face album__face--front">
                    <PageFace
                      page={pages[leaf * 2]}
                      index={leaf * 2}
                      visible={leaf === flipped}
                      onCardOpen={onCardOpen}
                    />
                  </div>
                  <div className="album__face album__face--back">
                    <PageFace
                      page={pages[leaf * 2 + 1]}
                      index={leaf * 2 + 1}
                      visible={leaf === flipped - 1}
                      onCardOpen={onCardOpen}
                    />
                  </div>
                </div>
              ))}
          </div>

          {/*
            The page turn lives on the book itself: a strip down the outer edge of
            each open page, which is where a hand goes to turn one. Clicking the
            cover already opened the album, so the same gesture now carries the
            whole navigation instead of two buttons parked beside the furniture.

            No arrow drawn on it, deliberately — the edge lights under the cursor
            and that is the whole affordance. A glyph printed on the paper is a
            control the book does not have.

            A sibling of `.album__book` rather than a child of it: `.album__book`
            is `preserve-3d`, so anything inside it becomes part of the 3D scene
            and gets sorted by depth against the turning leaves. Out here it is a
            flat overlay pinned to the book's edges via `--book-w`.

            Not rendered while shut, where the whole cover is the target and an
            arrow floating over it would only compete with that.
          */}
          {!closed ? (
            <>
              <button
                type="button"
                className="album__turn album__turn--prev"
                onClick={() => turn(-1)}
                disabled={atStart}
                aria-label="Vorige pagina"
              />
              <button
                type="button"
                className="album__turn album__turn--next"
                onClick={() => turn(1)}
                disabled={atEnd}
                aria-label="Volgende pagina"
              />
            </>
          ) : null}
        </div>
      </div>

      {footer}
    </>
  );
};

export default Album;
