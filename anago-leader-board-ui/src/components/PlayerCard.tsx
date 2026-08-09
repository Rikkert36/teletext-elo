import React, { useEffect, useState } from 'react';
import { Card, avatarUrl, initialsFor, silhouetteUrl, splitName } from '../mock/cardMock';
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
  /**
   * Loads and decodes the portrait up front instead of lazily.
   *
   * **Set this wherever the card is the thing being looked at.** `loading="lazy"`
   * never paints on the element's first frame — not even from cache, because the
   * lazy-load steps run after layout — and `decoding="async"` can cost another.
   * With no photo, the masked portrait shows the bare tier metal under
   * `.card__portrait::after`'s multiply tint, so the card dulls and the name band
   * ends up on empty metal: it reads as a placeholder for a frame.
   *
   * That was visible in the pack opener, where the card handed down into the row
   * is a *fresh* element — the FLIP inverts it onto the hero's rect rather than
   * moving the hero itself — so it blinked at the start of every descent.
   *
   * Left off by default because the album renders the whole pool at once and most
   * of it is off-screen, which is the case lazy loading is for.
   */
  eager?: boolean;
  /**
   * The pack opener's silhouette beat: hold back *who* it is after the flip has
   * already said how good it is, and then write it on.
   *
   * Absent everywhere else, and that is the normal card. When set, the mask and
   * the photo are both mounted and stacked, and the name is rendered as its
   * individual groups so they can be lit one at a time.
   *
   * **This is deliberately not `empty`.** An empty slot wears the album's grey
   * colourway with `??` where the overall goes, and resolving a gold ceremony
   * into something that looks common is a bug that has already been fixed once
   * (see "the glow survives the turn" in docs/trading-cards.md). Everything the
   * flip earned stays on the card; only the identity is withheld.
   */
  reveal?: CardReveal;
  className?: string;
  onClick?: () => void;
}

const sizeClass: Record<CardSize, string> = { sm: 'card--sm', md: '', lg: 'card--lg' };

/**
 * How far through the pack opener's reveal beat a card is.
 *
 * Both fields are driven from `PackOpener`, not from here, because the same
 * clock drives the sound: a tick is played for each character as it lands, and a
 * component that timed its own writing would put the two on separate clocks.
 * That is the same argument `animationSpeed.ts` makes for one multiplier across
 * JS and CSS.
 */
export interface CardReveal {
  /**
   * True once the sweep has begun and the name and the face are coming in.
   *
   * One flag, because it is now one event. It was a word counter, a cooling
   * duration and a per-blow knock, driving a name that arrived a word at a time —
   * see the note over `.card__name` for why that came back out.
   */
  revealed: boolean;
}

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
const Portrait: React.FC<{ card: Card; empty: boolean; eager: boolean }> = ({
  card,
  empty,
  eager,
}) => {
  const [failed, setFailed] = useState(false);

  return (
    <div className="card__portrait card__portrait--photo">
      {failed ? (
        <div className="card__initials">{initialsFor(card.player.name)}</div>
      ) : (
        <img
          src={avatarUrl(card.player.id)}
          alt={empty ? '' : card.player.name}
          onError={() => setFailed(true)}
          loading={eager ? 'eager' : 'lazy'}
          /*
           * Both halves are needed. `eager` only settles when the *load* starts;
           * the decode is still deferred by default, which is a second frame the
           * card can spend without a photo.
           */
          decoding={eager ? 'sync' : 'async'}
        />
      )}
    </div>
  );
};

/**
 * The slot for a card you do not own: the player's own outline, in the tier ink.
 *
 * The mask is a separate asset rather than something derived from the photo at render
 * time, because deriving it is the hard part — see `tools/silhouette` and
 * `docs/silhouet-model-vergelijking.html`. A luminance threshold over the photo only
 * works on a plain-backdrop headshot, which is about a third of the pool.
 *
 * **The photo is not loaded at all here.** The empty card used to render the avatar and
 * black it out with a filter, which downloaded the full-size image — some of them are
 * megabytes — to produce a flat rectangle. The mask is ~30 kB.
 *
 * A CSS mask cannot report a failed load, so the image is fetched up front and the
 * result decides which of the two states renders. Without a mask this falls back to the
 * bare plate, which is exactly what the card did before.
 *
 * `eager` skips that probe, for the same reason the portrait has one: the probe cannot
 * resolve before the element's first frame — not even from cache — so the card spends at
 * least one frame on the bare plate. The album can afford that and the pack opener cannot,
 * because there the mask *is* the beat, and it is mounted fresh for every card. Every
 * player in the pool has a mask, so the eager path simply trusts that; a mask that 404s
 * degrades to a fully-masked-out layer, which is the bare plate again.
 */
const Silhouette: React.FC<{ playerId: string; eager?: boolean }> = ({
  playerId,
  eager = false,
}) => {
  const [ready, setReady] = useState(eager);
  const url = silhouetteUrl(playerId);

  useEffect(() => {
    if (eager) return undefined;

    let live = true;
    const probe = new Image();
    probe.onload = () => { if (live) setReady(true); };
    probe.onerror = () => { if (live) setReady(false); };
    probe.src = url;
    return () => { live = false; };
  }, [url, eager]);

  if (!ready) return <div className="card__portrait card__portrait--mask" />;

  return (
    <div className="card__portrait card__portrait--mask">
      <div
        className="card__silhouette"
        style={{ '--silhouette': `url(${url})` } as React.CSSProperties}
      />
    </div>
  );
};

const PlayerCard: React.FC<PlayerCardProps> = ({
  card,
  size = 'md',
  empty = false,
  count,
  eager = false,
  reveal,
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

  /*
   * Legends render as icoon cards: pale ground, monochrome photo, shards. See
   * the `.card--icoon` block in card.css for what it is and why there is no
   * frame on it.
   *
   * `card--icoon` sits *alongside* `card--{tier}` rather than replacing it —
   * icoon is not a fifth tier, and the colourway selectors are written as
   * `.card--icoon.card--zilver` so the tier still moves the metal.
   *
   * Not applied to empty slots. A silhouette's job is to be identically blank,
   * and legends have their own pages in the album anyway.
   */
  const icoon = !empty && card.player.isLegend;

  /*
   * Two classes rather than one, because the dissolve has to be declared on a
   * selector that survives the state change: `card--reveal` carries the
   * transition and is present for the whole beat, `card--withheld` carries the
   * withheld values and is what comes off.
   */
  const classes = [
    'card',
    empty ? 'card--empty' : `card--${card.tier}`,
    icoon ? 'card--icoon' : '',
    reveal ? 'card--reveal' : '',
    reveal && !reveal.revealed ? 'card--withheld' : '',
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
    <div
      className={classes}
      onClick={onClick}
      /*
       * Nothing at all while the identity is being withheld — a tooltip naming
       * the player is exactly what the beat is holding back, and the cursor is
       * already sitting on the card because that is where the packet was.
       */
      title={reveal ? undefined : title}
    >
      <div className="card__inner">
        {/* Before the portrait, so the shards sit behind it and show only where
            the mask has cleared the photo. */}
        {icoon ? <span className="card__shards" aria-hidden="true" /> : null}

        <div className="card__header">
          <span className="card__overall">{empty ? '??' : card.overall}</span>
        </div>

        {empty ? (
          <Silhouette playerId={card.player.id} />
        ) : (
          <>
            {/*
              Under the photo, not instead of it. Both layers are mounted for the
              whole beat and the photo dissolves in on top — so nothing of the
              card's ground is exposed at the halfway point, which is what a
              two-element cross-fade at 50/50 would do. The mask never has to
              fade out: the photo covers it exactly, since the two carry the same
              portrait masks.
            */}
            {reveal ? <Silhouette playerId={card.player.id} eager /> : null}
            <Portrait card={card} empty={empty} eager={eager} />
          </>
        )}

        {/*
          One text node, everywhere, including the reveal.

          It was briefly one span per word so they could be lit one at a time. The
          name went back to arriving whole because splitting it split *one fact*
          into grammar — and a beat spent on the word "van" is a beat spent on
          nothing. The sweep reveals the name and the face together now, so there
          is nothing left to address individually.
        */}
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
