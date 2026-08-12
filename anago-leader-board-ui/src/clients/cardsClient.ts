/**
 * The seam between the card UI and its data.
 *
 * Every call is real now. The session-local `packSandbox` that stood in for the
 * claim endpoint is gone, and with it `mockCardsClient` and the whole of
 * `cardMock`'s fixture half — so `npm start` with no API behind it no longer
 * renders a collection, which is the honest state of a feature whose pool, odds,
 * draw and cards all live on the server.
 *
 * Components import `CardsClient` and never the implementation, so this file is
 * still the only one a change of transport touches.
 *
 * Deliberately hand-written rather than regenerated: `server.generated.ts` is
 * 1727 NSwag lines and its .nswag config embeds a stale swagger snapshot, so
 * regenerating would risk the existing calls.
 */

import {
  CardPlayer,
  Pack,
  RevealedCard,
  SelectablePlayer,
  toCard,
} from '../mock/cardMock';
import { CoverId } from '../utils/albumLeather';
import { getSpeed, setSpeed } from '../utils/animationSpeed';
import { isMuted, setMuted } from '../utils/sounds';

/**
 * The album as an object: how it is bound, and what it is bound to hold. Null until one
 * has been chosen off the table.
 *
 * The icons latch lives here rather than on `CollectionState` because it is a fact about
 * *this binding* — a half-bound book is the visible record of it. So emptying the
 * collection takes the unlock with the album, and `album: null` cannot carry a stale one.
 */
export interface AlbumBinding {
  cover: CoverId;
  createdAt: string;
  /** Whether this book holds the icons. Drives the half-binding and `icons` shipping. */
  iconsUnlocked: boolean;
}

export interface CollectionState {
  playerId: string;
  /**
   * Null when this player has never started a collection.
   *
   * The single flag the page branches on to decide between the opening sequence and the
   * book, and it is server truth rather than a guess from localStorage — so clearing
   * the browser does not offer you a second album, and a colleague's laptop shows your
   * real one.
   */
  album: AlbumBinding | null;
  /** Whether this player is over the games gate. */
  eligible: boolean;
  numberOfGames: number;
  /** From `Cards:MinGames` on the server, so the gate copy cannot drift from the gate. */
  minGames: number;
  /**
   * Only players you hold at least one of, as counts rather than cards.
   *
   * A card is live and wholly derivable from its pool entry, and the page only builds a
   * lookup from this anyway — embedding the player twice would just invite the two
   * copies to drift.
   */
  owned: OwnedCardCount[];
  /**
   * Unrevealed packs: today's games you took part in, plus the daily freebie, less
   * whatever you have already opened. Derived on the server rather than stored, and
   * gone at midnight because "today's games" is the query.
   */
  packs: Pack[];
  /** The full active pool, so missing cards can render as silhouettes. */
  pool: CardPlayer[];
  /**
   * The icon pool, empty until unlocked — not a secret, but sending it early would put
   * icoons in the album's slot order, which is built from exactly this list.
   */
  icons: CardPlayer[];
}

/** How many copies of one player's card the collector holds. */
export interface OwnedCardCount {
  playerId: string;
  count: number;
}

/**
 * `GET /api/cards/pool` — every player a pack can contain.
 *
 * Read-only, and no longer needed by the collection page: `GET /api/collections/{id}`
 * carries the pool and the icons itself, because the book is one object and cannot be
 * drawn from a partial response. This survives as the cheap way to look at the pool on
 * its own, and both call the same service so the two cannot disagree.
 */
export interface CardPoolResponse {
  minGames: number;
  actives: CardPlayer[];
  icons: CardPlayer[];
}

export interface CardsClient {
  getCollection(playerId: string): Promise<CollectionState>;
  /**
   * Fetches this player an album in the given leather, and returns the page as it now
   * stands so the caller needs no follow-up read.
   *
   * Idempotent on the server: calling it for a player who already has an album returns
   * their existing one rather than failing, so a double click is harmless.
   */
  createAlbum(playerId: string, cover: CoverId): Promise<CollectionState>;
  /**
   * Puts the album back on the table and empties the collection, so the opening sequence
   * can be watched again. **Development only**, and the test panel is its only caller.
   *
   * It takes the cards and the claims with it, so today's packets come back too.
   */
  emptyCollection(playerId: string): Promise<CollectionState>;
  /**
   * Opens the pack: rolls it, files the cards into the collection, and reports for each
   * one whether it filled an empty slot — **together with the collection they landed
   * in**, so no refetch is needed.
   *
   * That is not only a saved round trip. A refetch is a second full leaderboard replay
   * inside one user action, and it leaves a window in which the reveal has finished but
   * the shelf still shows a packet that no longer exists.
   *
   * The pack is claimed for the player named here whoever asked, so this cannot steal
   * anybody's cards — only the surprise of their reveal.
   */
  revealPack(playerId: string, packId: string): Promise<PackReveal>;
  /**
   * Everyone who can be signed in as.
   *
   * Deliberately **not** filtered to the games gate: a name that simply is not there
   * cannot explain itself, whereas one that appears and says "nog 2 wedstrijden" can.
   * The gate is applied by the page, off `eligible`.
   */
  getSelectablePlayers(): Promise<SelectablePlayer[]>;
  /**
   * Claims the icons: the collector has the whole active set and has picked up the packet
   * that comes with it.
   *
   * A real call in every environment, and the only thing that latches the unlock. **It has
   * to land before the packet is claimed**, or the roll has no icons to draw from — which
   * is why the page fires this first and opens the packet on the ceremony's end rather
   * than doing both at once.
   *
   * The server re-checks the set rather than trusting the client, so this rejects with 409
   * if the page has gone stale; treat that as "refetch", not as "retry".
   */
  claimIcons(playerId: string): Promise<CollectionState>;
  /**
   * Sets the latch without earning it. **Development only**, and the test panel is its
   * only caller: earning it means completing the active set, which is a three-month
   * proposition, so there would otherwise be no way to look at an icoon in a book.
   *
   * Separate from `claimIcons` on purpose. They are not the same act — one is the feature
   * and the other is a bypass that 404s in production — and one method taking a `force`
   * flag would let a UI path reach the bypass by passing the wrong argument.
   */
  forceIcons(playerId: string, unlocked: boolean): Promise<CollectionState>;
  /**
   * Presents a pack to named players, or to everybody.
   *
   * The one call that brings a pack into existence rather than deriving one, and the
   * only place it is allowed: a present is the one pack nothing can be derived from,
   * because nobody played a game to earn it.
   *
   * It answers with the gift ids and **not** a collection, for two reasons. A gift to
   * everybody has no single collection to answer with, and the giver is usually not the
   * recipient. So a page that has just given *itself* a packet has to refetch — which
   * costs a leaderboard replay, and is the right trade for something done by hand a few
   * times a month rather than a thousand times a year.
   */
  giftPack(options: GrantOptions): Promise<GiftResult>;
}

const api = (path: string): string => `${window.TAFELVOETBAL_SERVER_URL}${path}`;

/**
 * Every card request goes through here so a failure is one shape and one message.
 *
 * Loud rather than silent: a card page that quietly degrades to something plausible is
 * indistinguishable from a working one, and that has already cost a round of confusion.
 * The page has an error state, and this is what feeds it — a rejected promise, never a
 * half-built collection.
 */
const request = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(api(path), init);

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`${response.status} ${response.statusText}${body ? ` — ${body}` : ''}`);
  }

  return (await response.json()) as T;
};

/**
 * A player, as the leaderboard hands them over.
 *
 * `GET api/players?activeOnly=true` is reused rather than a new card-specific route:
 * the type-ahead wants every active player including the ones under the gate, which is
 * exactly what that already returns, and a second endpoint could only disagree with it.
 *
 * Note that a player with **no games at all** is absent from it — the leaderboard builds
 * its stats per game, so someone who has never played exists in the Players table and
 * nowhere else. Accepted: the ledger's empty state says as much rather than us reshaping
 * PlayerService for the newest colleague's first week.
 *
 * It carries no `overall`, because it is not the card pool — which is why what comes back
 * is a `SelectablePlayer` rather than a `CardPlayer`. The ledger needs the name and the
 * game count and nothing else, and the scale that would produce an overall lives on the
 * server precisely so a second copy of it cannot disagree with the odds.
 */
interface LeaderboardPlayer {
  id: string;
  name: string;
  numberOfGames: number;
}

/** A revealed card on the wire: the subject, plus the two facts about the pull. */
interface RevealedCardResponse {
  player: CardPlayer;
  isNew: boolean;
  copies: number;
}

interface PackRevealResponse {
  cards: RevealedCardResponse[];
  state: CollectionState;
}

/** What opening a pack answers: the cards, and the collection they landed in. */
export interface PackReveal {
  cards: RevealedCard[];
  state: CollectionState;
}

export const httpCardsClient: CardsClient = {
  async getCollection(playerId) {
    return request<CollectionState>(`/api/collections/${playerId}`);
  },

  async createAlbum(playerId, cover) {
    return request<CollectionState>(`/api/collections/${playerId}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cover }),
    });
  },

  async emptyCollection(playerId) {
    return request<CollectionState>(`/api/collections/${playerId}`, { method: 'DELETE' });
  },

  async revealPack(playerId, packId) {
    // Encoded because a pack id carries a colon and, for a game pack, a GUID. Safe in a
    // path segment either way, but the id is constructed rather than opaque and the next
    // source of one need not be.
    const reveal = await request<PackRevealResponse>(
      `/api/collections/${playerId}/packs/${encodeURIComponent(packId)}/claim`,
      { method: 'POST' },
    );

    return {
      cards: reveal.cards.map((card) => ({
        ...toCard(card.player),
        isNew: card.isNew,
        copies: card.copies,
      })),
      state: reveal.state,
    };
  },

  async getSelectablePlayers() {
    const players = await request<LeaderboardPlayer[]>('/api/players?activeOnly=true');

    return players
      .map((player) => ({
        id: player.id,
        name: player.name,
        numberOfGames: player.numberOfGames,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'nl'));
  },

  async claimIcons(playerId) {
    return request<CollectionState>(`/api/collections/${playerId}/icons`, { method: 'PUT' });
  },

  async forceIcons(playerId, unlocked) {
    return request<CollectionState>(
      `/api/collections/${playerId}/icons?unlocked=${unlocked}&force=true`,
      { method: 'PUT' },
    );
  },

  async giftPack(options) {
    // Sent as given, including the absences: an omitted `playerIds` is what says "everybody"
    // and an omitted `size` is what says "this is a guaranteed single", so filling either in
    // here would take the choice away from the caller and make the server's refusal of an
    // ambiguous request unreachable.
    return request<GiftResult>('/api/collections/gifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
  },
};

/**
 * What it takes to hand somebody a pack. `POST api/collections/gifts`.
 *
 * Two axes and no more. **Who** is a list of players, or — by leaving the list out —
 * everybody. **What** is either a count of ordinary cards or a floor on the overall, never
 * both: those are the two products, and a guaranteed packet is always a single card. The
 * server refuses a request that sets neither or both rather than picking one, because either
 * choice would be a guess about which the caller meant.
 */
export interface GrantOptions {
  /** The recipients. Omitted or empty means the whole office. */
  playerIds?: string[];
  /** How many ordinary cards. Exactly one of this and `minimumOverall`. */
  size?: number;
  /**
   * A floor on the overall of the single card in it — 75 for "goud or better", and
   * 75/80/85/90 for the four ceremony levels.
   *
   * A floor rather than a target: the weighting still applies inside the qualifying band,
   * so 75+ hands out far more 75s than 90s. If nobody clears it the draw falls through to
   * the whole pool rather than failing.
   */
  minimumOverall?: number;
  /** Shown on the wrapper. Optional; presents get a default rather than a blank label. */
  reason?: string;
}

/** What giving answers with: the rows that were written. */
export interface GiftResult {
  /** One per named recipient, or a single id when it went to everybody. */
  giftIds: string[];
  /**
   * Whether it went to the whole office. Worth having explicitly — `giftIds` has one entry
   * either way when a single player was named, so its length is not a headcount.
   */
  everybody: boolean;
}

/* ------------------------------------------------------------------ *
 * Debug controls.
 *
 * What is left of the test panel's back end, and it is down to the two things that
 * genuinely are client-side. Granting a pack used to live here, writing into a
 * session-local sandbox; it is `giftPack` on `CardsClient` now, alongside emptying a
 * collection and forcing the icons latch — all three are rows, so none of them can be
 * faked in the browser without the real state and the fake one drifting apart.
 * ------------------------------------------------------------------ */

export const mockDebug = {
  /** Animation pacing multiplier: 1 as designed, higher is slower. */
  setSpeed,
  getSpeed,

  /**
   * Silence, for a development session in an open-plan office.
   *
   * The header's speaker button is gone — the browser already has a tab mute and the
   * computer already has a volume knob, and a speaker icon on a mahogany table was the last
   * piece of OS chrome on the page. The persisted setting still works, so this keeps it
   * reachable from `cardDebug` rather than deleting the only way to set it.
   */
  isMuted,
  setMuted,
};

// Reachable from the browser console.
(window as unknown as { cardDebug: typeof mockDebug }).cardDebug = mockDebug;
