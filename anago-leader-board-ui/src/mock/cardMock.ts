/**
 * The card domain, as the UI needs it.
 *
 * **Nothing here is mock data any more.** This started life as phase 1's fixture
 * module — a frozen 38-player roster, a seeded starting collection, canned packs
 * and a TypeScript port of the rating scale and the draw — and all of that is
 * gone, deleted the moment `POST …/packs/{packId}/claim` landed. The server owns
 * the pool, the scale, the weighting and the roll; a browser with its own copy of
 * any of them could only disagree with the odds a card was actually drawn at.
 *
 * What survives is what was always presentation: the types the components pass
 * around, the tier cutoffs, the ceremony's timing arithmetic and a handful of name
 * and URL helpers. Those are pure functions of an `overall` the server sent, so
 * there is no second source of truth left to keep in step.
 *
 * It still lives under `src/mock/` only because moving it is ten import sites of
 * churn for no behaviour. That rename is worth doing on its own.
 */

export type Tier = 'brons' | 'zilver' | 'goud' | 'goudZeldzaam';

export interface CardPlayer {
  id: string;
  /** Full name as stored, nickname and all. */
  name: string;
  /** For a legend this is their all-time high, not their current rating. */
  visibleRating: number;
  /** Only used for the MIN_GAMES gate copy — never on the card. */
  numberOfGames: number;
  isLegend: boolean;
  /**
   * The 40-99 number printed in the corner, as the server computed it.
   *
   * The scale lives in C# (`CardRatingCalculator`) because it also drives the
   * raffle weighting, so moving an anchor silently re-balances rarity. It arrives
   * on every player the API sends, which is now every player there is.
   */
  overall: number;
}

/** A card as the UI renders it: player plus derived, live presentation values. */
export interface Card {
  player: CardPlayer;
  overall: number;
  tier: Tier;
}

/**
 * Somebody you can sign in as.
 *
 * Deliberately not a `CardPlayer`: the ledger lists everybody, including the players
 * under the games gate who are not in the card pool at all and so have no overall.
 * Inventing one for them would put a number into the type system that nothing on the
 * server ever computed.
 */
export interface SelectablePlayer {
  id: string;
  name: string;
  numberOfGames: number;
}

/**
 * A card as it comes out of a pack.
 *
 * Whether a pull filled an empty slot is only knowable at the moment of the
 * draw, so the claim endpoint reports it alongside the card — by the time the UI
 * sees this, the collection has already been written.
 */
export interface RevealedCard extends Card {
  /** True when this pull filled a slot you did not have. */
  isNew: boolean;
  /** How many copies you hold after this pull. */
  copies: number;
}

export interface Pack {
  /** Synthetic and stable: `game:{gameId}` or `daily:{yyyy-MM-dd}`. */
  id: string;
  /** 1, 3 or 5. */
  size: number;
  /** Why it is owed, shown on the wrapper. */
  reason: string;
  /** Opponents whose tickets are doubled for this pack's draw. */
  doubledPlayerIds: string[];
  /**
   * Never set by the server today — real packs are never tier- or
   * player-guaranteed, the only choice is size.
   *
   * Kept because the packet still knows how to print and colour a forced one (see
   * `packPrint` and `packFoil`), and the gift endpoint that hands somebody a
   * specific pack is the next thing to be built.
   */
  guaranteeTier?: Tier;
  guaranteePlayerId?: string;
  guaranteeLevel?: number;
}

/**
 * Games needed both to appear on a card and to own a collection. The gate is
 * deliberately symmetric — crossing it makes you collectable and a collector in
 * the same moment.
 *
 * The server's `Cards:MinGames` is authoritative and arrives on every collection
 * response; this is the fallback for copy rendered before one has landed.
 *
 * Lowered from 10 to 5. The floor exists because `visibleRating` is
 * `rating − 1000·e^(−0.2303·games)`, so a short record reports attendance rather
 * than skill; but that deduction is continuous and still ~316 at five games,
 * which is enough to keep a three-game hot streak well away from the top of the
 * scale. See "Why >= 5 games" in docs/trading-cards.md.
 */
export const MIN_GAMES = 5;

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
 *
 * The cutoffs deliberately do not follow the rating scale onto the server: they
 * are thresholds the card CSS and the pack opener key off directly, and they are
 * pure functions of an overall, so there is no second source of truth here.
 */
/*
 * Expressed as a nominal millisecond split and then divided, rather than as four
 * hand-written fractions.
 *
 * Everything downstream needs *fractions* of `getCeremonyMs()`, because the debug
 * panel can retune the total at runtime and the proportions have to survive that.
 * But the thing anyone actually wants to change is "how long is the shimmer" and
 * "how long is the radiation" — and with bare decimals those two are impossible to
 * adjust independently: stretching the radiation means raising the total *and*
 * lowering the shimmer fraction by exactly the compensating amount, then re-spacing
 * every step. Deriving them keeps that arithmetic honest.
 *
 * The 680/1980 split is the settled one and matches `DEFAULT_CEREMONY_MS` (2660)
 * in utils/animationSpeed.ts — at the ×2 multiplier, a 1360ms shimmer and up to
 * 3960ms of radiation. Radiation was stretched 1.5× from an earlier 1320 with the
 * shimmer held where it was: the shimmer is a single pass across the card and
 * slowing it just made the highlight crawl, while the radiation is the part that
 * carries the suspense.
 */
const CEREMONY_SHIMMER_MS = 680;
const CEREMONY_RADIATE_MS = 1980;
const CEREMONY_TOTAL_MS = CEREMONY_SHIMMER_MS + CEREMONY_RADIATE_MS;

/**
 * The build has two phases: a shimmer pass, then radiation.
 *
 * The shimmer comes first and is identical for everyone. Level 1 turns over
 * exactly when it ends, so a 75 shows the shimmer and **no radiation at all** —
 * radiation only begins once the 75 cutoff has passed.
 */
const CEREMONY_SHIMMER = CEREMONY_SHIMMER_MS / CEREMONY_TOTAL_MS;

/**
 * Levels 2–4 split the radiation window into equal thirds; level 1 gets none, so
 * it lands exactly on the end of the shimmer.
 *
 * Even spacing is the point — the gap between consecutive tiers is what you are
 * reading when the build fails to end, and an uneven one would make some tiers
 * easier to tell apart than others.
 */
const ceremonyStepRatio = (level: number): number =>
  (CEREMONY_SHIMMER_MS + (CEREMONY_RADIATE_MS * (level - 1)) / 3) / CEREMONY_TOTAL_MS;

const CEREMONY_STEPS: ReadonlyArray<{ from: number; build: number }> = [
  { from: 75, build: ceremonyStepRatio(1) },
  { from: 80, build: ceremonyStepRatio(2) },
  { from: 85, build: ceremonyStepRatio(3) },
  { from: 90, build: ceremonyStepRatio(4) },
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

export const toCard = (player: CardPlayer): Card => ({
  player,
  overall: player.overall,
  tier: tierFor(player.overall),
});

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

/**
 * The silhouette mask for a card you do not own yet.
 *
 * A PNG whose alpha channel is the mask and whose colour is meaningless — the card
 * fills it with its own ink, so the tier decides the colour, not the file.
 *
 * Generated offline from the avatar by `tools/silhouette`, so the route **404s when
 * there is no mask**: not every photo yields a silhouette, and the card needs to know
 * that so it can fall back to the flat plate.
 */
export const silhouetteUrl = (playerId: string): string =>
  `${window.TAFELVOETBAL_SERVER_URL}/api/player/${playerId}/silhouette`;

/**
 * The one thing printed on the front of a packet: how many cards are in it.
 *
 * Nothing else. Not "kaarten", not why it was granted — the wrapper carries the
 * badge and this number and that is all, so the number has to stand on its own.
 *
 * A forced packet shows its guarantee instead (`80+` for `guaranteeLevel: 2`);
 * those are always single cards, so no count is lost. They are the only ones that
 * ever print anything but a number, and the only orange ones (see `packFoil`) — a
 * wrapper that is lying to you about the odds should look like it. Nothing sets
 * those fields today; the gift endpoint is what brings them back.
 *
 * The thresholds come from `CEREMONY_STEPS`, so the print cannot drift from the
 * levels a guarantee actually targets.
 */
export const packPrint = (pack: Pack): string => {
  const floor =
    pack.guaranteeLevel === undefined ? undefined : CEREMONY_STEPS[pack.guaranteeLevel - 1]?.from;

  if (floor !== undefined) return `${floor}+`;
  if (pack.guaranteeTier) return TIER_LABELS[pack.guaranteeTier];
  if (pack.guaranteePlayerId) return '1';

  return `${pack.size}`;
};

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
