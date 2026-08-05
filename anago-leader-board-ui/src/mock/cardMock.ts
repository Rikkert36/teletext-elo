/**
 * Phase 1 mock data for the trading-card feature.
 *
 * Everything in this file is throwaway. Once the backend exists, `cardsClient`
 * swaps its mock implementation for the HTTP one and this module is deleted.
 * The rating scale and ticket weighting get ported to C#
 * (`Services/Calculators/CardRatingCalculator.cs`) at that point — keep the two
 * in sync until the swap happens.
 *
 * Player ids, names, ratings and game counts are real, copied from
 * GET /api/leaderboard, so avatars resolve against the deployed API and the
 * rarity distribution feels exactly the way it will in production.
 */

export type Tier = 'brons' | 'zilver' | 'goud' | 'goudZeldzaam';

export interface CardPlayer {
  id: string;
  /** Full name as stored, nickname and all. */
  name: string;
  visibleRating: number;
  /** Only used for the >= 10 games pool and eligibility gate — never on the card. */
  numberOfGames: number;
  isLegend: boolean;
}

/** A card as the UI renders it: player plus derived, live presentation values. */
export interface Card {
  player: CardPlayer;
  overall: number;
  tier: Tier;
}

/** How many cards of a given player you hold. */
export interface OwnedCard extends Card {
  count: number;
}

/**
 * A card as it comes out of a pack.
 *
 * Whether a pull filled an empty slot is only knowable at the moment of the
 * draw, so it has to be reported alongside the card — the collection has already
 * been updated by the time the UI sees it. The phase-2 reveal endpoint needs to
 * return the same two fields.
 */
export interface RevealedCard extends Card {
  /** True when this pull filled a slot you did not have. */
  isNew: boolean;
  /** How many copies you hold after this pull. */
  copies: number;
}

export interface Pack {
  id: string;
  /** 1, 3 or 5. */
  size: number;
  /** Why it was granted, shown on the wrapper. */
  reason: string;
  /** Opponents whose tickets are doubled for this pack's draw. */
  doubledPlayerIds: string[];
  /**
   * Debug only — real packs are never tier- or player-guaranteed, the only
   * choice is size. These exist so the ceremony can be exercised on demand
   * instead of waiting on a ~3% roll.
   */
  guaranteeTier?: Tier;
  guaranteePlayerId?: string;
  guaranteeLevel?: number;
}

/* ------------------------------------------------------------------ *
 * The pool: active players with >= 10 games.
 * ------------------------------------------------------------------ */

const active = (
  id: string,
  name: string,
  visibleRating: number,
  numberOfGames: number,
): CardPlayer => ({ id, name, visibleRating, numberOfGames, isLegend: false });

const ACTIVE_POOL: CardPlayer[] = [
  active('27d01eda-dc90-4a81-891a-6d00f91ef79d', 'Petar "beetje gepiel" Drandarov', 1851, 1210),
  active('2724f764-4837-4623-a48f-b204014b8769', 'Ton "ooit eerste gestaan" Pastoor', 1578, 846),
  active('08548a49-477a-405c-b742-40e6de5bb7af', 'Mark "heeft ooit tweede gestaan" Razenberg', 1551, 684),
  active('2fbf1b87-6fcd-460d-8a2a-c3a34318e95c', 'Rik "Dev-stagiair" Maas', 1463, 1746),
  active('8d4f0a6c-5b94-4bba-b5b5-fecf043e64ad', 'Luuk "grote schaapje" Heijmans', 1362, 1107),
  active('28ab44a8-1d9d-4d7c-a5b8-d62c0da2610b', 'Casper "ooit vijfde gestaan" Keijsers', 1327, 301),
  active('91aa9d7c-8186-4242-b957-52924df4e4f9', 'Gijs "Hypno" Janssen', 1201, 51),
  active('86e7fbb5-2d7c-4b58-a227-bdc732accc5d', 'Anneloes "De trein" Ernest', 1179, 662),
  active('f20b169b-aec5-4462-822f-e378326dbb79', 'Nadia "NEEEEEEEEEE" Cissen', 1144, 736),
  active('f2cf0132-0bd9-4113-bb91-971cc65d3482', 'Ridho "Return Of The King" Hidayat', 1135, 278),
  active('4319b84e-eb01-42b4-b1e3-3d4faa03bfbb', 'Jeroen "devops" Mens', 1098, 35),
  active('44ec2c75-25a7-4ab4-ab2b-afa5d5bcda4c', 'Daan "Diagonaldo" van der Beek', 1066, 346),
  active('808d23eb-10e5-4d07-851c-3902aaba1cda', 'Daan "Vinci" Verkade', 1051, 485),
  active('9a159b0b-bae4-4b74-ad24-54dbee09b618', 'Laura "Miedema" Ackermans', 1046, 65),
  active('0f2376d6-2c45-4f64-bea6-bcb27352850e', 'Mathijs', 1035, 29),
  active('1e55c518-674f-4f55-8107-c9a6a96bbc31', 'Max "Paarse slip" Smedts', 981, 49),
  active('cfb66496-4e21-446b-8ff4-c44fdd7d0234', 'Niek "Nikos"', 952, 14),
  active('44c8a599-1faa-486e-939e-e3afcd90d334', 'Tanny', 919, 36),
  active('527c421f-d0ee-49c8-b87c-7340b71b0e96', 'Marie "Harde schreeuwer" Versteeg', 864, 388),
  active('32ff155d-cf56-44b1-88f3-10f234aaf2ec', 'Bo "IJskoud"', 829, 95),
  active('966faa86-037d-4666-832f-5d0b15c28d0e', 'Simon', 828, 44),
  active('3eddd710-ce41-4225-b722-4107f3450074', '"Juf" Nynke Koornstra', 811, 284),
  active('a70cf550-1ed4-4551-8106-78556e5dee6a', 'Ewan "Bradley Cooper" Deeley', 782, 14),
  active('f9e220a1-2290-46ad-9bac-fd3c65e5738f', "Rianne 'GIFjeskoningin' Meiberg", 767, 282),
  active('d77771b6-b714-4bb5-98d6-61511e50c123', 'Jeroen "Jerry" van Geel', 764, 35),
  active('8094ad42-794b-4d98-8228-a0894b59e762', 'Esther "Vrijwilliger"', 759, 113),
  active('1b6d918c-d0c6-4419-a286-ad6f94d49e89', 'Karin " Tijgah"', 740, 20),
  active('ab29240b-32d7-423f-b5ac-bb9f4ecbc682', 'Tim "Schuurmachine" Houthuijs', 732, 10),
  active('0a9a2736-30f5-477f-899c-368901dd0a63', 'Ida', 716, 179),
  active('5eb57dc9-4aac-42d8-818c-a670543ea5c4', 'Lotte "Functioneel doucher" Wesselman', 688, 26),
  active('0b242a31-3aa5-4595-907b-965ba6369c2c', 'Fraser', 616, 27),
  active('e01b2a10-e1cf-40ce-9b37-946cb91436fe', 'Jasper "Kebabman" van Buul', 582, 112),
  active('3db685db-ae5f-4b79-b0a6-455c1d8634c4', 'Evie "Ik wil worst" Wijnhoven', 519, 103),
  active('068ae7c1-9818-47ee-ac41-07a7ca9430b2', 'Daria', 342, 76),
];

/**
 * PLACEHOLDER legends. The real list is inactive players with >= 10 games,
 * rated on their all-time-high visibleRating — which only the backend can
 * compute, since it needs the full game replay. These exist purely so the
 * legends pages have something to render; replace wholesale in phase 2.
 */
const LEGEND_POOL: CardPlayer[] = [
  { id: 'legend-placeholder-1', name: 'Legende — placeholder A', visibleRating: 1690, numberOfGames: 520, isLegend: true },
  { id: 'legend-placeholder-2', name: 'Legende — placeholder B', visibleRating: 1420, numberOfGames: 310, isLegend: true },
  { id: 'legend-placeholder-3', name: 'Legende — placeholder C', visibleRating: 1180, numberOfGames: 244, isLegend: true },
  { id: 'legend-placeholder-4', name: 'Legende — placeholder D', visibleRating: 1075, numberOfGames: 190, isLegend: true },
  { id: 'legend-placeholder-5', name: 'Legende — placeholder E', visibleRating: 960, numberOfGames: 122, isLegend: true },
  { id: 'legend-placeholder-6', name: 'Legende — placeholder F', visibleRating: 845, numberOfGames: 88, isLegend: true },
];

/* ------------------------------------------------------------------ *
 * The rating scale: piecewise-linear interpolation, 40..99.
 * ------------------------------------------------------------------ */

/** [visibleRating, overall] anchors. Lives in appsettings.json in phase 2. */
const SCALE_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [0, 40],
  [200, 47],
  [400, 54],
  [600, 61.5],
  [800, 70],
  [1000, 80],
  [1250, 84],
  [1500, 87],
  [1851, 90],
  [2200, 92],
  [2600, 94],
  [3200, 96],
  [4000, 98],
];

const OVERALL_CAP = 99;

export const overallFor = (visibleRating: number): number => {
  const first = SCALE_ANCHORS[0];
  const last = SCALE_ANCHORS[SCALE_ANCHORS.length - 1];

  if (visibleRating <= first[0]) return first[1];
  if (visibleRating >= last[0]) return OVERALL_CAP;

  for (let i = 1; i < SCALE_ANCHORS.length; i++) {
    const [hiRating, hiOverall] = SCALE_ANCHORS[i];
    if (visibleRating > hiRating) continue;

    const [loRating, loOverall] = SCALE_ANCHORS[i - 1];
    const t = (visibleRating - loRating) / (hiRating - loRating);
    return Math.round(loOverall + t * (hiOverall - loOverall));
  }

  return OVERALL_CAP;
};

/** Gold is the top — there is no Icoon tier, so the 90s are simply gold. */
export const tierFor = (overall: number): Tier => {
  if (overall >= 85) return 'goudZeldzaam';
  if (overall >= 75) return 'goud';
  if (overall >= 65) return 'zilver';
  return 'brons';
};

export const TIER_LABELS: Record<Tier, string> = {
  goudZeldzaam: 'goud zeldzaam',
  goud: 'goud',
  zilver: 'zilver',
  brons: 'brons',
};

/**
 * Reveal ceremony, graduated across the whole gold band rather than a single
 * 85+ threshold.
 *
 * Each step is a longer build than the one below it, so **the length of the
 * build-up tells you the tier before the card turns** — a faint shimmer for a
 * low gold, a drawn-out swell for the top of the board. `build` is a fraction of
 * `getCeremonyMs()`.
 *
 * Level 0 (below 75) gets no ceremony at all: straight to the flip.
 */
/**
 * The build has two phases: a shimmer pass, then radiation.
 *
 * The shimmer comes first and is identical for everyone. Level 1 turns over
 * exactly when it ends, so a 75 shows the shimmer and **no radiation at all** —
 * radiation only begins once the 75 cutoff has passed.
 */
const CEREMONY_SHIMMER = 0.34;

const CEREMONY_STEPS: ReadonlyArray<{ from: number; build: number }> = [
  { from: 75, build: CEREMONY_SHIMMER },
  { from: 80, build: 0.56 },
  { from: 85, build: 0.78 },
  { from: 90, build: 1 },
];

/** Fraction of the build spent on the shimmer, before any radiation. */
export const ceremonyShimmerRatio = (): number => CEREMONY_SHIMMER;

/** 0 = no ceremony, 1 = faintest, 4 = the full thing. */
export const ceremonyLevelFor = (overall: number): number => {
  let level = 0;
  CEREMONY_STEPS.forEach((step, index) => {
    if (overall >= step.from) level = index + 1;
  });
  return level;
};

/** Fraction of the configured build-up length this level runs for. */
export const ceremonyBuildRatio = (level: number): number =>
  level <= 0 ? 0 : CEREMONY_STEPS[Math.min(level, CEREMONY_STEPS.length) - 1].build;

/**
 * The longest build any level runs for.
 *
 * Every level ramps its glow toward the same target over this same span — the
 * card simply turns earlier at lower levels, freezing the glow wherever it got
 * to. That is what makes the build identical at any given moment regardless of
 * tier: you can only tell a 90 from an 80 by how long it keeps going.
 */
export const ceremonyMaxBuildRatio = (): number =>
  CEREMONY_STEPS.reduce((max, step) => Math.max(max, step.build), 0);

export const toCard = (player: CardPlayer): Card => {
  const overall = overallFor(player.visibleRating);
  return { player, overall, tier: tierFor(overall) };
};

/* ------------------------------------------------------------------ *
 * Ticket weighting: 2^-E, with the halving rate accelerating above 80.
 * ------------------------------------------------------------------ */

/** Overall points per halving below the hinge. Flat by design. */
const D_LOW = 30;
/** Overall points per halving above the hinge. The tuning knob. */
const D_HIGH = 2.5;
/** Where the rate changes. Overall 80 == visibleRating 1000. */
const HINGE = 80;

export const ticketsFor = (overall: number): number => {
  const exponent =
    overall <= HINGE
      ? (overall - 40) / D_LOW
      : (HINGE - 40) / D_LOW + (overall - HINGE) / D_HIGH;

  return Math.pow(2, -exponent);
};

/* ------------------------------------------------------------------ *
 * The draw: weighted sampling WITHOUT replacement.
 * ------------------------------------------------------------------ */

export interface DrawOptions {
  /** Opponents from the game that earned this pack: tickets doubled, flat 2x. */
  doubledPlayerIds?: string[];
  /** Include legends alongside actives. */
  legendsUnlocked?: boolean;
  /**
   * Debug only: force the first card to a given tier so the ceremony and the
   * no-ceremony paths can both be exercised on demand.
   */
  guaranteeTier?: Tier;
  /** Debug only: force a specific player into the pack. */
  guaranteePlayerId?: string;
  /**
   * Debug only: force a card whose ceremony level is exactly this.
   *
   * Tier cannot express it — 75-79 and 80-84 are both Goud but are levels 1 and 2,
   * so a tier guarantee cannot target either one.
   */
  guaranteeLevel?: number;
  /** Defaults to Math.random. Injected for the seeded starting collection. */
  random?: () => number;
}

const pickWeighted = (
  candidates: Array<{ card: Card; tickets: number }>,
  random: () => number,
): number => {
  const total = candidates.reduce((sum, c) => sum + c.tickets, 0);
  let roll = random() * total;

  for (let i = 0; i < candidates.length; i++) {
    roll -= candidates[i].tickets;
    if (roll <= 0) return i;
  }

  return candidates.length - 1;
};

export const drawPack = (size: number, options: DrawOptions = {}): Card[] => {
  const {
    doubledPlayerIds = [],
    legendsUnlocked = false,
    guaranteeTier,
    guaranteePlayerId,
    guaranteeLevel,
    random = Math.random,
  } = options;

  const pool = legendsUnlocked ? [...ACTIVE_POOL, ...LEGEND_POOL] : ACTIVE_POOL;

  let candidates = pool.map((player) => {
    const card = toCard(player);
    const doubled = doubledPlayerIds.includes(player.id);
    return { card, tickets: ticketsFor(card.overall) * (doubled ? 2 : 1) };
  });

  const drawn: Card[] = [];

  if (guaranteePlayerId) {
    const index = candidates.findIndex((c) => c.card.player.id === guaranteePlayerId);
    if (index >= 0) {
      drawn.push(candidates[index].card);
      candidates.splice(index, 1);
    }
  }

  if (guaranteeLevel !== undefined && drawn.length === 0) {
    const matching = candidates.filter(
      (c) => ceremonyLevelFor(c.card.overall) === guaranteeLevel,
    );
    if (matching.length > 0) {
      const forced = matching[Math.floor(random() * matching.length)];
      drawn.push(forced.card);
      candidates = candidates.filter((c) => c.card.player.id !== forced.card.player.id);
    }
  }

  if (guaranteeTier && drawn.length === 0) {
    const matching = candidates.filter((c) => c.card.tier === guaranteeTier);
    if (matching.length > 0) {
      const forced = matching[Math.floor(random() * matching.length)];
      drawn.push(forced.card);
      candidates = candidates.filter((c) => c.card.player.id !== forced.card.player.id);
    }
  }

  // Without replacement: a player can appear at most once per pack.
  const target = Math.min(size, drawn.length + candidates.length);
  while (drawn.length < target) {
    const index = pickWeighted(candidates, random);
    drawn.push(candidates[index].card);
    candidates.splice(index, 1);
  }

  return drawn;
};

/* ------------------------------------------------------------------ *
 * Canned state: packs waiting to be opened, and a part-built collection.
 * ------------------------------------------------------------------ */

/** Small seeded PRNG so the starting collection is stable across reloads. */
const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** How many of the highest-rated players are held back from the start. */
const MISSING_AT_START = 5;

/**
 * Simulated history so the album opens looking lived-in: most commons owned
 * with duplicate piles, the top few still missing.
 *
 * The top players are then removed explicitly rather than left to chance. The
 * seeded run happened to complete the entire set, which hid every silhouette and
 * showed 34/34 on the page headers — the two states the album most needs to
 * demonstrate.
 */
const buildStartingCollection = (): Map<string, number> => {
  const random = mulberry32(20260805);
  const counts = new Map<string, number>();
  const sizes = [1, 3, 5];

  for (let i = 0; i < 100; i++) {
    const size = sizes[Math.floor(random() * sizes.length)];
    for (const card of drawPack(size, { random })) {
      const id = card.player.id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  // ACTIVE_POOL is ordered by rating, so this removes the top of the board.
  ACTIVE_POOL.slice(0, MISSING_AT_START).forEach((player) => counts.delete(player.id));

  return counts;
};

export const MOCK_PACKS: Pack[] = [
  {
    id: 'pack-1',
    size: 5,
    reason: 'gewonnen — 10-3 tegen de verwachting in',
    doubledPlayerIds: [ACTIVE_POOL[0].id, ACTIVE_POOL[4].id],
  },
  {
    id: 'pack-2',
    size: 3,
    reason: 'gewonnen',
    doubledPlayerIds: [ACTIVE_POOL[7].id, ACTIVE_POOL[18].id],
  },
  {
    id: 'pack-3',
    size: 1,
    reason: 'gespeeld',
    doubledPlayerIds: [],
  },
  {
    id: 'pack-daily',
    size: 1,
    reason: 'dagelijks pakje',
    doubledPlayerIds: [],
  },
];

export const activePool = (): CardPlayer[] => ACTIVE_POOL;
export const legendPool = (): CardPlayer[] => LEGEND_POOL;
export const startingCollection = buildStartingCollection;

/** Who the mock treats as "you" until the type-ahead picker is wired up. */
export const MOCK_CURRENT_PLAYER_ID = '2fbf1b87-6fcd-460d-8a2a-c3a34318e95c';

/* ------------------------------------------------------------------ *
 * Display helpers.
 * ------------------------------------------------------------------ */

/**
 * Splits a stored name into card-sized pieces. Names carry nicknames in quotes
 * (`Petar "beetje gepiel" Drandarov`), which are far too long for a card face
 * but too good to throw away — so they land on the back of the card instead.
 */
export const splitName = (name: string): { display: string; nickname?: string } => {
  const match = name.match(/["'](.+?)["']/);
  const nickname = match?.[1]?.trim();
  const display = name.replace(/["'].+?["']/, '').replace(/\s+/g, ' ').trim();

  return { display: display || name, nickname };
};

/**
 * First name only, for the card face.
 *
 * Full names run to two lines for some players and one for others, which makes
 * the name band a different height on every card. A single word keeps every card
 * identical.
 */
export const firstNameOf = (name: string): string => {
  const { display } = splitName(name);
  return display.split(' ').filter(Boolean)[0] ?? display;
};

export const avatarUrl = (playerId: string): string =>
  `${window.TAFELVOETBAL_SERVER_URL}/api/player/${playerId}/avatar`;

/** Initials for the fallback portrait when a player has no avatar on disk. */
export const initialsFor = (name: string): string => {
  const { display } = splitName(name);
  return display
    .split(' ')
    .filter((w) => w.length > 1)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
};
