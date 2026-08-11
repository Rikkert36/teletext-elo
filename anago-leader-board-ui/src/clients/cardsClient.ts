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
  Tier,
  toCard,
} from '../mock/cardMock';
import { CoverId } from '../utils/albumLeather';
import { getSpeed, setSpeed } from '../utils/animationSpeed';
import { isMuted, setMuted } from '../utils/sounds';

/** The album as an object: which leather, and since when. Null until one is chosen. */
export interface AlbumBinding {
  cover: CoverId;
  createdAt: string;
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
  legendsUnlocked: boolean;
  /** The full pool, so missing cards can render as silhouettes. */
  pool: CardPlayer[];
  /** Legend pool, empty until unlocked. */
  legends: CardPlayer[];
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
 * carries the pool and the legends itself, because the book is one object and cannot be
 * drawn from a partial response. This survives as the cheap way to look at the pool on
 * its own, and both call the same service so the two cannot disagree.
 */
export interface CardPoolResponse {
  minGames: number;
  actives: CardPlayer[];
  legends: CardPlayer[];
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
   * one whether it filled an empty slot.
   *
   * The pack is claimed for the player named here whoever asked, so this cannot steal
   * anybody's cards — only the surprise of their reveal.
   */
  revealPack(playerId: string, packId: string): Promise<RevealedCard[]>;
  /**
   * Everyone who can be signed in as.
   *
   * Deliberately **not** filtered to the games gate: a name that simply is not there
   * cannot explain itself, whereas one that appears and says "nog 2 wedstrijden" can.
   * The gate is applied by the page, off `eligible`.
   */
  getSelectablePlayers(): Promise<SelectablePlayer[]>;
  /**
   * Flips the legends latch by hand. **Development only**, and the test panel is its
   * only caller: earning it means completing the active set, which is a three-month
   * proposition, so there would otherwise be no way to look at an icoon in a book.
   */
  setLegendsUnlocked(playerId: string, unlocked: boolean): Promise<CollectionState>;
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
    const drawn = await request<RevealedCardResponse[]>(
      `/api/collections/${playerId}/packs/${encodeURIComponent(packId)}/claim`,
      { method: 'POST' },
    );

    return drawn.map((card) => ({
      ...toCard(card.player),
      isNew: card.isNew,
      copies: card.copies,
    }));
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

  async setLegendsUnlocked(playerId, unlocked) {
    return request<CollectionState>(
      `/api/collections/${playerId}/legends?unlocked=${unlocked}`,
      { method: 'PUT' },
    );
  },
};

/**
 * What it takes to hand somebody a pack.
 *
 * Nothing implements this yet — packs are derived from real games, so the only way to
 * conjure one is a row that says so, and `POST api/collections/gifts` is the next slice.
 * The shape is here because the test panel's buttons are already written against it and
 * because it is the contract that slice has to honour: a size, a reason for the wrapper,
 * and the guarantees that make a ceremony level reachable on demand instead of on a ~3%
 * roll. `PackService.Roll` is where the guarantees have to land.
 */
export interface GrantOptions {
  size: number;
  reason: string;
  guaranteeTier?: Tier;
  guaranteePlayerId?: string;
  guaranteeLevel?: number;
  doubledPlayerIds?: string[];
}

/* ------------------------------------------------------------------ *
 * Debug controls.
 *
 * What is left of the test panel's back end. Granting a pack used to live here,
 * writing into a session-local sandbox; packs are the server's now, so the panel's
 * pack buttons are gone until the endpoint that hands somebody a specific pack
 * exists. Emptying a collection and flipping the legends latch are both real calls
 * on `CardsClient`, because both are rows.
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
