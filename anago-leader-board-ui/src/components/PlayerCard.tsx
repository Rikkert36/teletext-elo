import React, { useState } from 'react';
import { Card, avatarUrl, firstNameOf, initialsFor, splitName } from '../mock/cardMock';
import '../styles/card.css';

type CardSize = 'sm' | 'md' | 'lg';

interface PlayerCardProps {
  card: Card;
  size?: CardSize;
  /** Renders as a silhouette: you do not own this one yet. */
  empty?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeClass: Record<CardSize, string> = { sm: 'card--sm', md: '', lg: 'card--lg' };

/**
 * Portrait with a graceful fallback. Avatars live as loose files on the server
 * and the write path is known to disagree with the read path, so a missing
 * image is an expected state rather than an error.
 */
const Portrait: React.FC<{ card: Card; empty: boolean }> = ({ card, empty }) => {
  const [failed, setFailed] = useState(false);

  return (
    <div className="card__portrait">
      {failed ? (
        <div className="card__initials">{initialsFor(card.player.name)}</div>
      ) : (
        <img
          src={avatarUrl(card.player.id)}
          alt={empty ? '' : card.player.name}
          onError={() => setFailed(true)}
          loading="lazy"
        />
      )}
    </div>
  );
};

const PlayerCard: React.FC<PlayerCardProps> = ({
  card,
  size = 'md',
  empty = false,
  className = '',
  onClick,
}) => {
  const { display, nickname } = splitName(card.player.name);
  // Card shows the first name only; the full name and nickname live in the title.
  const cardName = firstNameOf(card.player.name);

  const classes = [
    'card',
    empty ? 'card--empty' : `card--${card.tier}`,
    sizeClass[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      onClick={onClick}
      title={nickname ? `${display} — "${nickname}"` : display}
    >
      <div className="card__inner">
        {card.player.isLegend ? <span className="card__legend">legende</span> : null}

        <div className="card__header">
          <span className="card__overall">{empty ? '??' : card.overall}</span>
        </div>

        <Portrait card={card} empty={empty} />

        <div className="card__name">{cardName}</div>
      </div>
    </div>
  );
};

/** Face-down card, used while a pack is being revealed. */
export const CardBack: React.FC<{ size?: CardSize; className?: string }> = ({
  size = 'md',
  className = '',
}) => (
  <div className={['card', 'card--back', sizeClass[size], className].filter(Boolean).join(' ')}>
    <span className="card--back__mark">T7</span>
  </div>
);

export default PlayerCard;
