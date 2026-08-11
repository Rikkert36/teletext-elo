/**
 * The seam between the card UI and its data.
 *
 * Two implementations of one interface. `httpCardsClient` is what the page uses:
 * `GET api/collections/{playerId}` and `POST api/collections/{playerId}/create` are
 * real, and the pack half is still a session-local sandbox because the claim endpoint
 * does not exist yet — see `packSandbox` below. `mockCardsClient` is kept beside it as
 * the no-backend fallback the whole of phase 1 was built against.
 *
 * Components import `CardsClient` and never either implementation, so finishing the
 * backend touches this file only.
 *
 * Deliberately hand-written rather than regenerated: `server.generated.ts` is
 * 1727 NSwag lines and its .nswag config embeds a stale swagger snapshot, so
 * regenerating would risk the existing calls.
 */

import {
  CardPlayer,
  MIN_GAMES,
  MOCK_PACKS,
  OwnedCard,
  Pack,
  RevealedCard,
  Tier,
  activePool,
  drawPack,
  legendPool,
  setActivePool,
  setLegendPool,
  startingCollection,
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
  /** Only players you hold at least one of. */
  owned: OwnedCard[];
  /** Unrevealed packs, newest first. Expire at end of day. */
  packs: Pack[];
  legendsUnlocked: boolean;
  /** The full pool, so missing cards can render as silhouettes. */
  pool: CardPlayer[];
  /** Legend pool, empty until unlocked. */
  legends: CardPlayer[];
}

/**
 * `GET /api/cards/pool` — every player a pack can contain.
 *
 * The first piece of the card feature to exist server-side, and the only one so far:
 * it is read-only, persists nothing, and needs no migration. It is here because a
 * legend is rated on their all-time-high visible rating, which is computable only
 * inside the leaderboard's full game replay — so icoon cards could not show a real
 * person until this endpoint existed.
 *
 * `actives` is fetched too but deliberately not used yet: the mock roster is a frozen
 * snapshot that the odds table, the seeded starting collection and every completion
 * estimate in docs/trading-cards.md were computed against, and swapping in live
 * ratings would move several overalls out from under all of them. Separate decision.
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
   * Here rather than in `mockDebug` because it is the one debug action that cannot be done
   * client-side: the album is a row on the server, and `mockDebug` writing to module state
   * would leave the real one in place and the two disagreeing. Idempotent.
   */
  emptyCollection(playerId: string): Promise<CollectionState>;
  /**
   * Rolls the pack, files the cards into the collection, and reports for each
   * one whether it filled an empty slot.
   */
  revealPack(playerId: string, packId: string): Promise<RevealedCard[]>;
  /**
   * Everyone who can be signed in as.
   *
   * Deliberately **not** filtered to the games gate: a name that simply is not there
   * cannot explain itself, whereas one that appears and says "nog 2 wedstrijden" can.
   * The gate is applied by the page, off `eligible`.
   */
  getSelectablePlayers(): Promise<CardPlayer[]>;
}

/* ------------------------------------------------------------------ *
 * Mock implementation. Module-level state so reveals persist while the
 * tab is open, and reset on reload.
 * ------------------------------------------------------------------ */

interface MockState {
  counts: Map<string, number>;
  packs: Pack[];
  legendsUnlocked: boolean;
  album: AlbumBinding | null;
}

const state: MockState = {
  counts: startingCollection(),
  packs: [...MOCK_PACKS],
  legendsUnlocked: false,
  /*
   * Starts null so `npm start` with no backend still walks the opening sequence — that
   * is the state the ledger and the cover choice exist for, and having to reach for a
   * debug button to see them would mean they were never looked at.
   */
  album: null,
};

let packSequence = 0;

const settle = <T,>(value: T, ms = 120): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

/**
 * Fetch the real legends once, and never let a failure take the page down with it.
 *
 * Phase 1's premise is that `npm start` alone is enough, and that has to survive the
 * arrival of the first endpoint: with no API reachable — or one deployed before this
 * route existed — the placeholders stay and everything else behaves exactly as it did.
 * Cached as a promise rather than a flag so concurrent callers share one request and a
 * failure is not retried on every reveal.
 */
let poolRequest: Promise<void> | null = null;

/** Where the legends on screen came from. Read by the debug panel. */
let legendSource = 'niet geladen';

export const legendPoolSource = (): string => legendSource;

const loadLegends = (): Promise<void> => {
  if (poolRequest) return poolRequest;

  poolRequest = fetch(`${window.TAFELVOETBAL_SERVER_URL}/api/cards/pool`)
    .then((response) => {
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response.json() as Promise<CardPoolResponse>;
    })
    .then((pool) => {
      setLegendPool(pool.legends ?? []);
      legendSource = `api (${pool.legends?.length ?? 0})`;
    })
    .catch((error) => {
      legendSource = 'placeholders';
      /*
       * Loud on purpose. A silent fall back to six invented legends is
       * indistinguishable from the endpoint working, and that has already cost one
       * round of confusion — the API deployed on the configured URL simply predates
       * the route and answers 404.
       */
      // eslint-disable-next-line no-console
      console.warn(
        `[kaarten] GET /api/cards/pool mislukt (${String(error)}). ` +
          'De zes nep-legendes blijven staan — herstart de API met de nieuwe build ' +
          'om de echte legendes te zien.',
      );
    });

  return poolRequest;
};

const buildOwned = (): OwnedCard[] => {
  const byId = new Map<string, CardPlayer>();
  for (const player of [...activePool(), ...legendPool()]) byId.set(player.id, player);

  const owned: OwnedCard[] = [];
  state.counts.forEach((count, id) => {
    const player = byId.get(id);
    if (!player) return;
    owned.push({ ...toCard(player), count });
  });

  return owned.sort((a, b) => b.overall - a.overall);
};

export const mockCardsClient: CardsClient = {
  async getCollection(playerId) {
    // Awaited here rather than at module load so the legends are guaranteed present
    // before the album is built from them — the book is drawn in one pass and cannot
    // grow a section afterwards without shifting every card viewer index behind it.
    await loadLegends();

    return settle({
      playerId,
      album: state.album,
      eligible: true,
      numberOfGames: MIN_GAMES,
      minGames: MIN_GAMES,
      owned: buildOwned(),
      packs: [...state.packs],
      legendsUnlocked: state.legendsUnlocked,
      pool: activePool(),
      legends: state.legendsUnlocked ? legendPool() : [],
    });
  },

  async createAlbum(playerId, cover) {
    state.album = { cover, createdAt: new Date().toISOString() };
    return this.getCollection(playerId);
  },

  async emptyCollection(playerId) {
    state.album = null;
    state.counts = new Map();
    state.packs = [];
    state.legendsUnlocked = false;
    return this.getCollection(playerId);
  },

  async revealPack(_playerId, packId) {
    // Also awaited here: a reveal can be the first thing that draws from the legend
    // pool, and drawing from the placeholders and then rendering the real ones would
    // hand you a card that is not in your book.
    await loadLegends();

    const pack = state.packs.find((p) => p.id === packId);
    if (!pack) throw new Error(`Onbekend pakje: ${packId}`);

    const drawn = drawPack(pack.size, {
      doubledPlayerIds: pack.doubledPlayerIds,
      legendsUnlocked: state.legendsUnlocked,
      guaranteeTier: pack.guaranteeTier,
      guaranteePlayerId: pack.guaranteePlayerId,
      guaranteeLevel: pack.guaranteeLevel,
    });

    // Read the count before incrementing — that is the only point at which
    // "did this fill an empty slot" can still be answered.
    const revealed: RevealedCard[] = drawn.map((card) => {
      const id = card.player.id;
      const before = state.counts.get(id) ?? 0;
      state.counts.set(id, before + 1);
      return { ...card, isNew: before === 0, copies: before + 1 };
    });

    state.packs = state.packs.filter((p) => p.id !== packId);

    return settle(revealed, 0);
  },

  async getSelectablePlayers() {
    return settle(activePool());
  },
};

/* ------------------------------------------------------------------ *
 * HTTP implementation.
 * ------------------------------------------------------------------ */

const api = (path: string): string => `${window.TAFELVOETBAL_SERVER_URL}${path}`;

/**
 * Every card request goes through here so a failure is one shape and one message.
 *
 * Loud rather than silent, for the reason `loadLegends` is: a card page that quietly
 * degrades to something plausible is indistinguishable from a working one, and that has
 * already cost a round of confusion. The page has an error state, and this is what feeds
 * it — a rejected promise, never a half-built collection.
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
 */
interface LeaderboardPlayer {
  id: string;
  name: string;
  visibleRating: number;
  numberOfGames: number;
}

/**
 * Cards revealed this session, and packs granted by the test panel.
 *
 * **Temporary, and the whole of it goes when `POST …/packs/{packId}/claim` lands.** The
 * server has no CardInstance or PackClaim table yet, so it answers `owned: []` and
 * `packs: []` and there is nothing to persist into. Without this the opener, the shelf
 * and every button on the test panel would be dead on arrival — a grant would write to
 * state that nothing reads back — and none of the reveal work could be exercised against
 * the real pool.
 *
 * So: packs live here, counts accumulate here, and they are merged over whatever the
 * server says. The consequence is honest and visible — a reload loses them.
 */
const packSandbox = {
  packs: [] as Pack[],
  counts: new Map<string, number>(),
  legendsUnlocked: false,

  reset() {
    this.packs = [];
    this.counts = new Map();
    this.legendsUnlocked = false;
  },
};

/** Merges the sandbox's session-local cards over the server's (currently empty) list. */
const withSandbox = (state: CollectionState): CollectionState => {
  const byId = new Map<string, CardPlayer>();
  for (const player of [...state.pool, ...state.legends]) byId.set(player.id, player);

  const counts = new Map<string, number>();
  state.owned.forEach((card) => counts.set(card.player.id, card.count));
  packSandbox.counts.forEach((count, id) => counts.set(id, (counts.get(id) ?? 0) + count));

  const owned: OwnedCard[] = [];
  counts.forEach((count, id) => {
    const player = byId.get(id);
    if (player) owned.push({ ...toCard(player), count });
  });

  const legendsUnlocked = state.legendsUnlocked || packSandbox.legendsUnlocked;

  return {
    ...state,
    owned: owned.sort((a, b) => b.overall - a.overall),
    packs: [...packSandbox.packs, ...state.packs],
    legendsUnlocked,
    legends: legendsUnlocked ? state.legends : [],
  };
};

/**
 * Hands the server's pool to the draw.
 *
 * Not cosmetic: the album's slots are built from `pool` and `legends`, so a reveal that
 * drew from the frozen mock snapshot could produce a card with no slot to land in. The
 * two lists have to be the same list.
 */
const adoptPool = (state: CollectionState): CollectionState => {
  setActivePool(state.pool);
  if (state.legends.length > 0) setLegendPool(state.legends);
  return state;
};

export const httpCardsClient: CardsClient = {
  async getCollection(playerId) {
    return withSandbox(
      adoptPool(await request<CollectionState>(`/api/collections/${playerId}`)),
    );
  },

  async createAlbum(playerId, cover) {
    return withSandbox(
      adoptPool(
        await request<CollectionState>(`/api/collections/${playerId}/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cover }),
        }),
      ),
    );
  },

  async emptyCollection(playerId) {
    // The sandbox first, so a failed DELETE cannot leave session cards layered over a
    // collection the server still thinks exists.
    packSandbox.reset();

    return withSandbox(
      adoptPool(
        await request<CollectionState>(`/api/collections/${playerId}`, { method: 'DELETE' }),
      ),
    );
  },

  async revealPack(_playerId, packId) {
    const pack = packSandbox.packs.find((p) => p.id === packId);
    if (!pack) throw new Error(`Onbekend pakje: ${packId}`);

    const drawn = drawPack(pack.size, {
      doubledPlayerIds: pack.doubledPlayerIds,
      legendsUnlocked: packSandbox.legendsUnlocked,
      guaranteeTier: pack.guaranteeTier,
      guaranteePlayerId: pack.guaranteePlayerId,
      guaranteeLevel: pack.guaranteeLevel,
    });

    // Read the count before incrementing — that is the only point at which
    // "did this fill an empty slot" can still be answered.
    const revealed: RevealedCard[] = drawn.map((card) => {
      const id = card.player.id;
      const before = packSandbox.counts.get(id) ?? 0;
      packSandbox.counts.set(id, before + 1);
      return { ...card, isNew: before === 0, copies: before + 1 };
    });

    packSandbox.packs = packSandbox.packs.filter((p) => p.id !== packId);

    return revealed;
  },

  async getSelectablePlayers() {
    const players = await request<LeaderboardPlayer[]>('/api/players?activeOnly=true');

    return players
      .map((player) => ({
        id: player.id,
        name: player.name,
        visibleRating: player.visibleRating,
        numberOfGames: player.numberOfGames,
        isLegend: false,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'nl'));
  },
};

/* ------------------------------------------------------------------ *
 * Debug controls, until the claim endpoint lands.
 *
 * These back the on-screen dev panel and cover verification steps that are
 * otherwise unreachable: forcing an Icoon pull to see the ceremony, forcing an
 * 84 to confirm the ceremony does NOT fire, and unlocking legends without
 * grinding a full set.
 *
 * Each one writes to **both** stores — the mock's and the HTTP client's sandbox —
 * rather than branching on which client is in use. Only one of them is ever read, and
 * a debug button that silently does nothing because the seam was swapped underneath it
 * is worse than a redundant write.
 * ------------------------------------------------------------------ */

export interface GrantOptions {
  size: number;
  reason: string;
  guaranteeTier?: Tier;
  guaranteePlayerId?: string;
  guaranteeLevel?: number;
  doubledPlayerIds?: string[];
}

export const mockDebug = {
  grantPack({
    size,
    reason,
    guaranteeTier,
    guaranteePlayerId,
    guaranteeLevel,
    doubledPlayerIds = [],
  }: GrantOptions): Pack {
    packSequence += 1;
    const pack: Pack = {
      id: `debug-pack-${packSequence}`,
      size,
      reason,
      doubledPlayerIds,
      guaranteeTier,
      guaranteePlayerId,
      guaranteeLevel,
    };

    state.packs = [pack, ...state.packs];
    packSandbox.packs = [pack, ...packSandbox.packs];
    return pack;
  },

  setLegendsUnlocked(unlocked: boolean) {
    state.legendsUnlocked = unlocked;
    packSandbox.legendsUnlocked = unlocked;
  },

  /**
   * Console-only now: the panel's "leegmaken" goes through `client.emptyCollection`, which
   * also destroys the album on the server. This clears the cards and leaves the album, which
   * is occasionally what you want and has no button because it is a state the real app can
   * never be in.
   */
  clearCollection() {
    state.counts = new Map();
    packSandbox.counts = new Map();
  },

  /**
   * Back to the seeded, lived-in collection.
   *
   * Only meaningful against the mock: the seeded fixture is a hundred packs drawn from
   * the frozen snapshot, and the HTTP client has no such thing to return to — there it
   * clears, which is the truthful answer while nothing is persisted.
   */
  resetCollection() {
    state.counts = startingCollection();
    packSandbox.counts = new Map();
  },

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

  /**
   * Draws `packs` packs and logs observed frequencies against the odds table.
   * Verification step 11 — validates the TS weighting before it is ported to C#.
   */
  sampleOdds(packs = 2000) {
    const counts = new Map<string, number>();
    const sizes = [1, 3, 5];
    const weights = [0.425, 0.35, 0.225];
    let totalCards = 0;

    for (let i = 0; i < packs; i++) {
      const roll = Math.random();
      const size = roll < weights[0] ? sizes[0] : roll < weights[0] + weights[1] ? sizes[1] : sizes[2];
      for (const card of drawPack(size)) {
        counts.set(card.player.id, (counts.get(card.player.id) ?? 0) + 1);
        totalCards += 1;
      }
    }

    const rows = activePool().map((player) => {
      const card = toCard(player);
      const seen = counts.get(player.id) ?? 0;
      return {
        speler: player.name,
        overall: card.overall,
        'per kaart': `${((seen / totalCards) * 100).toFixed(2)}%`,
        'pakjes tot 1e': seen === 0 ? '—' : (packs / seen).toFixed(1),
      };
    });

    // eslint-disable-next-line no-console
    console.table(rows);
    // eslint-disable-next-line no-console
    console.log(`${packs} pakjes, ${totalCards} kaarten, ${(totalCards / packs).toFixed(3)} kaarten/pakje`);
  },
};

// Reachable from the browser console for the odds sampling check.
(window as unknown as { cardDebug: typeof mockDebug }).cardDebug = mockDebug;
