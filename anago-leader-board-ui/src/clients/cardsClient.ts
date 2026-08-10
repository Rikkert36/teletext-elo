/**
 * The seam between the card UI and its data.
 *
 * Phase 1 ships `mockCardsClient`. Phase 2 adds an HTTP implementation of the
 * same interface hitting `GET /api/collection/{playerId}` and
 * `POST /api/collection/packs/{id}/reveal`, and `mock/cardMock.ts` is deleted.
 * Components import `CardsClient` and never the mock, so that swap touches this
 * file only.
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
  setLegendPool,
  startingCollection,
  toCard,
} from '../mock/cardMock';
import { getSpeed, setSpeed } from '../utils/animationSpeed';

export interface CollectionState {
  playerId: string;
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
   * Rolls the pack, files the cards into the collection, and reports for each
   * one whether it filled an empty slot.
   */
  revealPack(playerId: string, packId: string): Promise<RevealedCard[]>;
  /** Players eligible to own a collection (>= MIN_GAMES games). */
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
}

const state: MockState = {
  counts: startingCollection(),
  packs: [...MOCK_PACKS],
  legendsUnlocked: false,
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
      owned: buildOwned(),
      packs: [...state.packs],
      legendsUnlocked: state.legendsUnlocked,
      pool: activePool(),
      legends: state.legendsUnlocked ? legendPool() : [],
    });
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
    return settle(activePool().filter((p) => p.numberOfGames >= MIN_GAMES));
  },
};

/* ------------------------------------------------------------------ *
 * Debug controls, phase 1 only.
 *
 * These back the on-screen dev panel and cover verification steps that are
 * otherwise unreachable: forcing an Icoon pull to see the ceremony, forcing an
 * 84 to confirm the ceremony does NOT fire, and unlocking legends without
 * grinding a full set.
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
    return pack;
  },

  setLegendsUnlocked(unlocked: boolean) {
    state.legendsUnlocked = unlocked;
  },

  clearCollection() {
    state.counts = new Map();
  },

  resetCollection() {
    state.counts = startingCollection();
  },

  /** Animation pacing multiplier: 1 as designed, higher is slower. */
  setSpeed,
  getSpeed,

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
