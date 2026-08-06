import React, { useState } from 'react';
import { Card, avatarUrl, initialsFor, splitName } from '../mock/cardMock';
import { rikDevMark } from '../utils/brand';
import '../styles/card.css';

type CardSize = 'sm' | 'md' | 'lg';

interface PlayerCardProps {
  card: Card;
  size?: CardSize;
  /** Renders as a silhouette: you do not own this one yet. */
  empty?: boolean;
  /**
   * How many copies you hold. **Reaches the tooltip only, never the face.**
   *
   * The settled decision is that a card carries no count — a mature collection
   * holds ~34 of the commonest player, so printing it would turn most of the album
   * into a tally. The tooltip is a different surface, and it already carries the
   * full name and the nickname for the same reason: things worth knowing that the
   * face has no room to say. Passing it here does not put it on the card.
   *
   * Omitted where the number would be noise — the pack opener, for one, where the
   * card you just pulled is marked new or not and the pile size is beside the point.
   */
  count?: number;
  className?: string;
  onClick?: () => void;
}

const sizeClass: Record<CardSize, string> = { sm: 'card--sm', md: '', lg: 'card--lg' };

/**
 * How deep the pile is, in words. Shared with the card viewer so the tooltip and
 * the enlarged card cannot end up phrasing the same fact two ways.
 */
export const ownedLabel = (count: number): string =>
  count === 0 ? 'nog niet in bezit' : `${count}× in bezit`;

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
  count,
  className = '',
  onClick,
}) => {
  const { display, nickname } = splitName(card.player.name);
  /*
   * The full name minus the nickname. It fits on one line for every player in the
   * pool — see the note on `.card__name` for the measurements — so the name band
   * stays a fixed height and the divider never moves. The nickname is the only
   * part that lives in the title.
   */
  const cardName = display;

  const classes = [
    'card',
    empty ? 'card--empty' : `card--${card.tier}`,
    sizeClass[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  /*
   * Everything the face has no room for, in one native tooltip: the full name, the
   * nickname, and how many you hold. A native `title` rather than a floating panel
   * on purpose — a card in the album lives inside `.album__face`, which is
   * `overflow: hidden`, under an `.album` that carries `perspective`, so a tooltip
   * rendered in the page is both clipped and depth-sorted against the leaves; one
   * rendered outside the book is the only piece of chrome on a page that has none.
   *
   * The price is the browser's ~1s delay and no tooltip at all on touch. Accepted:
   * the card viewer is the real surface for this, and it is one click away.
   */
  const title = [
    nickname ? `${display} — "${nickname}"` : display,
    count === undefined ? '' : ownedLabel(count),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={classes} onClick={onClick} title={title}>
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

/**
 * Face-down card, used while a pack is being revealed.
 *
 * Deliberately **the back of the wrapper it came out of** — the same near-black foil,
 * the same chrome, the same badge. See the `.card--back` block in card.css for why.
 * It carries no player, no tier and no colour, because every card in the game has this
 * same back and it must give nothing away before the turn.
 */
export const CardBack: React.FC<{ size?: CardSize; className?: string }> = ({
  size = 'md',
  className = '',
}) => (
  <div className={['card', 'card--back', sizeClass[size], className].filter(Boolean).join(' ')}>
    {/* The badge and nothing else. Inline url, because it is webpack's hashed filename. */}
    <span
      className="card--back__mark"
      style={{ backgroundImage: `url(${rikDevMark})` }}
      aria-hidden="true"
    />
  </div>
);

export default PlayerCard;
