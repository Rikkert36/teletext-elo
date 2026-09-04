import React, { useCallback, useEffect, useRef } from 'react';
import { AVATAR_WIDTH_VIEWER, splitName, TIER_LABELS } from '../mock/cardMock';
import PlayerCard, { ownedLabel } from './PlayerCard';
import { AlbumSlotRef } from './Album';
import '../styles/viewer.css';

interface CardViewerProps {
  /** Every slot in the book, in printed order — see `albumSlotOrder`. */
  slots: AlbumSlotRef[];
  index: number;
  onIndex: (next: number) => void;
  onClose: () => void;
}

/**
 * A card lifted out of the album and held up to the light.
 *
 * A card in the book is ~144px wide on a 1920 screen, and the photo is what
 * disambiguates two Daans — so the album can be browsed without ever really
 * *seeing* a card. This is where you see one, and where the two things the face
 * deliberately has no room for get said: the full name with its nickname, and how
 * deep the duplicate pile is.
 *
 * Placeholders are in the sequence and can be opened directly. The order is the
 * printed one, so left and right land on the next slot as it appears on the page
 * rather than skipping the gaps — and a silhouette blown up large is the whole
 * reason the album beats a grid.
 */
const CardViewer: React.FC<CardViewerProps> = ({ slots, index, onIndex, onClose }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const slot = slots[index];

  /*
   * Which card is on screen, for the focus restore below. A ref because the
   * cleanup that reads it runs on unmount, where a captured value would be
   * whichever card the viewer *opened* on rather than the one it closed on.
   */
  const shownId = useRef(slot?.card.player.id);
  shownId.current = slot?.card.player.id;

  /** Clamped rather than wrapped: a book has ends, and its turn strips go dead at them. */
  const step = useCallback(
    (delta: number) => {
      const next = Math.min(Math.max(index + delta, 0), slots.length - 1);
      if (next !== index) onIndex(next);
    },
    [index, slots.length, onIndex],
  );

  /*
   * A window-level key listener, not one on the overlay — the arrows have to work
   * wherever focus happens to be inside it, including on a disabled chevron at
   * either end.
   *
   * The album has one too, on the same two keys, and it stands itself down while a
   * card is open so only one of them acts on a press. See `Album`.
   */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        step(event.key === 'ArrowLeft' ? -1 : 1);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, step]);

  /*
   * Focus in on open, and back out to the slot of the card you were *last* looking
   * at rather than the one you clicked — the album has followed along behind the
   * scrim, so the card you opened may well be on a spread that is no longer open.
   */
  useEffect(() => {
    rootRef.current?.focus();

    return () => {
      const id = shownId.current;
      if (!id) return;
      const slotEl = document.querySelector<HTMLElement>(`[data-slot-player="${id}"]`);
      slotEl?.focus();
    };
  }, []);

  if (!slot) return null;

  const empty = slot.count === 0;
  const { display, nickname } = splitName(slot.card.player.name);

  /* Same threshold and shape as the album's own swipe. */
  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 45) step(dx < 0 ? 1 : -1);
  };

  return (
    <div
      ref={rootRef}
      className="viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`${slot.card.player.name} — kaart ${index + 1} van ${slots.length}`}
      tabIndex={-1}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/*
        The scrim carries the close click on its own rather than the root doing it
        with the panel stopping propagation. It is painted behind everything and
        covers the viewport, so a click anywhere that is not the card or the controls
        lands here by hit-testing alone — no event plumbing to get wrong.
      */}
      <div className="viewer__scrim" onClick={onClose} aria-hidden="true" />

      <div className="viewer__panel">
        {/*
          `eager`, for the reason the prop documents: this is the one place the card
          *is* the thing being looked at. Lazy loading never paints on the first
          frame even from cache, so every step left or right would flash the bare
          tier metal — and here that is a card at 380px, not a thumbnail.
        */}
        <div className="viewer__card">
          {/* The one surface that asks for the larger photo — see `portraitWidth`. */}
          <PlayerCard
            card={slot.card}
            empty={empty}
            eager
            portraitWidth={AVATAR_WIDTH_VIEWER}
          />
        </div>

        {/*
          Everything the face does not carry, typeset beside it. On the card itself
          this would be exactly the statistics block the design settled against — off
          the card it is the caption a display case has.
        */}
        <div className="viewer__detail">
          <div className="viewer__name">{display}</div>
          {nickname ? <div className="viewer__nick">“{nickname}”</div> : null}

          <div className="viewer__rule" />

          <div className="viewer__stat">
            <span className="viewer__stat-value">{empty ? '??' : slot.card.overall}</span>
            <span className="viewer__stat-label">overall</span>
          </div>

          {/*
            No tier for a card you do not hold. The face shows `??` for its overall
            and greys its frame for the same reason: what a missing card is worth is
            part of what you are hunting for.
          */}
          {empty ? null : (
            <div className="viewer__stat">
              <span className="viewer__stat-value viewer__stat-value--small">
                {TIER_LABELS[slot.card.tier]}
              </span>
              <span className="viewer__stat-label">reeks</span>
            </div>
          )}

          {slot.card.player.isIcon ? <div className="viewer__flag">icoon</div> : null}

          <div className={`viewer__owned${empty ? ' viewer__owned--none' : ''}`}>
            {ownedLabel(slot.count)}
          </div>
        </div>
      </div>

      {/*
        The chevrons and the position in one line. A counter is information — where
        you are in a book of 34 is something the album itself cannot tell you — and
        that is what earns the two arrows attached to it their place on a page that
        otherwise refuses drawn controls.
      */}
      <div className="viewer__nav">
        <button
          type="button"
          className="viewer__step"
          onClick={() => step(-1)}
          disabled={index === 0}
          aria-label="Vorige kaart"
        >
          ‹
        </button>
        <span className="viewer__count">
          {index + 1} / {slots.length}
        </span>
        <button
          type="button"
          className="viewer__step"
          onClick={() => step(1)}
          disabled={index >= slots.length - 1}
          aria-label="Volgende kaart"
        >
          ›
        </button>
      </div>
    </div>
  );
};

export default CardViewer;
