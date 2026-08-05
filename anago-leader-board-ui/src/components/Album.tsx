import React, { ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { Card, CardPlayer, toCard } from '../mock/cardMock';
import PlayerCard from './PlayerCard';
import useIsMobile from '../hooks/useIsMobile';
import { playPageTurn } from '../utils/sounds';
import '../styles/album.css';

const SLOTS_PER_PAGE = 6;

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

interface AlbumPage {
  kind: 'cover' | 'slots';
  title: string;
  subtitle?: string;
  slots: Slot[];
}

/* ------------------------------------------------------------------ *
 * Page building
 * ------------------------------------------------------------------ */

const buildPages = (sections: AlbumSection[]): AlbumPage[] => {
  const pages: AlbumPage[] = [];

  for (const section of sections) {
    const owned = section.players.filter((p) => (section.counts.get(p.id) ?? 0) > 0).length;

    for (let i = 0; i < section.players.length; i += SLOTS_PER_PAGE) {
      const chunk = section.players.slice(i, i + SLOTS_PER_PAGE);
      pages.push({
        kind: 'slots',
        title: section.title,
        subtitle: `${owned}/${section.players.length}`,
        slots: chunk.map((player) => ({
          card: toCard(player),
          count: section.counts.get(player.id) ?? 0,
        })),
      });
    }
  }

  // Leaves carry two faces, so an odd page count would leave a blank back.
  if (pages.length % 2 === 1) {
    pages.push({ kind: 'slots', title: '', slots: [] });
  }

  return pages;
};

/* ------------------------------------------------------------------ *
 * Page rendering
 * ------------------------------------------------------------------ */

const PageFace: React.FC<{ page: AlbumPage | undefined; index: number }> = ({ page, index }) => {
  if (!page) return <div className="album__page" />;

  if (page.kind === 'cover') {
    return (
      <div className="album__cover">
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

      <div className="album__slots">
        {page.slots.map((slot) => (
          <PlayerCard
            key={slot.card.player.id}
            card={slot.card}
            empty={slot.count === 0}
          />
        ))}
      </div>

      <div className="album__page-number">{index + 1}</div>
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * Album
 * ------------------------------------------------------------------ */

interface AlbumProps {
  sections: AlbumSection[];
  /** Rendered under the book, e.g. the page controls' surroundings. */
  footer?: ReactNode;
}

const Album: React.FC<AlbumProps> = ({ sections, footer }) => {
  const isMobile = useIsMobile();
  const pages = useMemo(() => buildPages(sections), [sections]);

  const leafCount = Math.ceil(pages.length / 2);
  /** Number of leaves currently turned to the left. */
  const [flipped, setFlipped] = useState(0);
  /** The leaf mid-rotation, which must sit above both stacks. */
  const [moving, setMoving] = useState<number | null>(null);

  /** Mobile page index and the direction it arrived from. */
  const [mobilePage, setMobilePage] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const turn = useCallback(
    (delta: number) => {
      if (isMobile) {
        setMobilePage((current) => {
          const next = Math.min(Math.max(current + delta, 0), pages.length - 1);
          if (next !== current) playPageTurn();
          return next;
        });
        return;
      }

      setFlipped((current) => {
        const next = Math.min(Math.max(current + delta, 0), leafCount);
        if (next === current) return current;
        // The leaf that moves is the one being turned, in either direction.
        setMoving(delta > 0 ? current : next);
        playPageTurn();
        return next;
      });
    },
    [isMobile, leafCount, pages.length],
  );

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
  const atEnd = isMobile ? mobilePage >= pages.length - 1 : flipped >= leafCount;

  /**
   * With nothing flipped, only the right-hand page is a real page (the left is
   * the inside cover), so the label is a single number. After that a spread
   * shows two, and the final flip can leave a single page again.
   */
  const spreadLabel = (): string => {
    if (flipped === 0) return `pagina 1 / ${pages.length}`;
    const low = flipped * 2;
    const high = Math.min(flipped * 2 + 1, pages.length);
    return low === high
      ? `pagina ${low} / ${pages.length}`
      : `pagina ${low}–${high} / ${pages.length}`;
  };

  const label = isMobile ? `pagina ${mobilePage + 1} / ${pages.length}` : spreadLabel();

  return (
    <>
      <div className="album__nav-label">{label}</div>

      {/* Controls flank the book so nothing lands below the fold. */}
      <div className="album-row">
        <button
          type="button"
          className="game-button album__arrow"
          onClick={() => turn(-1)}
          disabled={atStart}
          aria-label="Vorige pagina"
        >
          ◀
        </button>

        <div
          className={`album${isMobile ? ' album--mobile' : ''}`}
          onTouchStart={isMobile ? onTouchStart : undefined}
          onTouchEnd={isMobile ? onTouchEnd : undefined}
        >
        <div className="album__book">
          {!isMobile ? (
            <>
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
                    <PageFace page={page} index={index} />
                  </div>
                );
              })
            : Array.from({ length: leafCount }, (_, leaf) => (
                <div
                  key={leaf}
                  className={`album__leaf${leaf < flipped ? ' album__leaf--flipped' : ''}`}
                  style={{ zIndex: leafZ(leaf) }}
                  onTransitionEnd={() => setMoving((m) => (m === leaf ? null : m))}
                >
                  <div className="album__face album__face--front">
                    <PageFace page={pages[leaf * 2]} index={leaf * 2} />
                  </div>
                  <div className="album__face album__face--back">
                    <PageFace page={pages[leaf * 2 + 1]} index={leaf * 2 + 1} />
                  </div>
                </div>
              ))}
          </div>
        </div>

        <button
          type="button"
          className="game-button album__arrow"
          onClick={() => turn(1)}
          disabled={atEnd}
          aria-label="Volgende pagina"
        >
          ▶
        </button>
      </div>

      {footer}
    </>
  );
};

export default Album;
