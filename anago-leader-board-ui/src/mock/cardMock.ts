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
  /** For an icoon this is their all-time high, not their current rating. */
  visibleRating: number;
  /** Only used for the MIN_GAMES gate copy — never on the card. */
  numberOfGames: number;
  /**
   * Drives the icoon colourway.
   *
   * Read off the live pool, so it follows the subject's *current* standing — a
   * player going out of service turns the card already in your book into an
   * icoon, the same way a zilver card becomes goud when their form improves.
   */
  isIcon: boolean;
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
  /** Synthetic and stable: `game:{gameId}`, `daily:{yyyy-MM-dd}` or `gift:{giftId}`. */
  id: string;
  /** 1, 3 or 5 for anything earned; a gift may be any size up to 10. */
  size: number;
  /** Why it is owed, shown on the wrapper. */
  reason: string;
  /** Opponents whose tickets are doubled for this pack's draw. */
  doubledPlayerIds: string[];
  /**
   * A floor on the overall of the one card in it, or absent for an ordinary draw —
   * which is every earned pack, since the only choice a game makes is the size.
   * Only a gift ever carries one.
   *
   * The number itself, not a tier and not a ceremony level. It is the form both of
   * those reduce to (75 is "goud or better", and the ceremony's steps *are*
   * 75/80/85/90), it says things neither can — a tier cannot separate 75–79 from
   * 80–84 — and it means the wrapper prints the same number the draw was made
   * against rather than one looked up from a table that could drift.
   *
   * The packet prints it instead of a count and is foiled orange for it: a wrapper
   * that is lying to you about the odds should look like it. See `packPrint` and
   * `packFoil`.
   *
   * **`null` on the wire, not absent.** Every earned pack carries it explicitly as
   * null, so `=== undefined` is not the test — read it through `packFloor`, which is
   * the one place that decides whether a packet has a floor at all. Getting this
   * wrong prints `null+` on every game packet and foils them all orange.
   */
  minimumOverall?: number | null;
  /**
   * The one card in it is drawn from the icons rather than from the actives.
   *
   * True for the set-completion packet and nothing else. It is not a floor and cannot be
   * expressed as one — icoons run right across the tiers, so any `minimumOverall` that
   * caught all of them would catch most of the actives too.
   *
   * Two things read it: the wrapper prints `icoon` and is foiled gold rather than orange,
   * and `CollectionPage` runs the album's re-binding *before* opening it, because the
   * book has to be able to hold an icoon before one can come out of a packet.
   */
  guaranteesIcon?: boolean;
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
 * Every way a stored name can carry a nickname: `"…"`, `'…'` or `:…:`.
 *
 * **Matched pairs, one alternative each, rather than one character class for both
 * ends.** `/["':](.+?)["':]/` would have accepted `"beetje gepiel:` — a name typed
 * with one delimiter changed halfway would still parse, and would parse *wrongly*
 * on the day somebody fixed only one of the two.
 *
 * `[^"]+` rather than `.+?` for the same reason: the body of a nickname cannot
 * contain the delimiter that ends it, and saying so is what stops a name with two
 * separate quoted parts being read as one long nickname spanning the gap.
 *
 * **Global, because a name can carry more than one.** `Petar "beetje gepiel" :de
 * muur: Drandarov` is two marks in two notations, and a non-global regex strips the
 * first and leaves the second sitting in the display name — where it would then be
 * printed on the card face and in the checklist, which is the whole thing this
 * helper exists to prevent. No capture groups: with `g` they are unavailable from
 * `String.match` anyway, and the body is recovered by dropping the one-character
 * delimiter from each end.
 *
 * Sharing one `g` regex across calls is safe *here* — both `String.match` and
 * `String.replace` reset `lastIndex` when the flag is set. It would not be with
 * `test` or `exec`, which carry the index between calls.
 *
 * Known limit, unchanged by adding `:` — an apostrophe inside a surname is a
 * delimiter as far as this is concerned, so `Sean O'Neill Jan O'Brien` reads
 * `Neill Jan O` as a nickname. It needs two of them in one name to go wrong, which
 * is why it has never bitten; the fix is to require whitespace before the opening
 * mark, and it should be made deliberately rather than as a side effect of this.
 */
const NICKNAME = /"[^"]+"|'[^']+'|:[^:]+:/g;

/**
 * Splits a stored name into card-sized pieces. Names carry nicknames in quotes or
 * colons (`Petar "beetje gepiel" Drandarov`, `Petar :beetje gepiel: Drandarov`),
 * which are far too long for a card face but too good to throw away — so they land
 * on the back of the card instead.
 *
 * Everything that needs a name without its nickname goes through here — the card
 * face, the initials, the checklist at the back of the album — so there is one
 * answer to "what is this player called" and adding a delimiter is a one-line
 * change in one place.
 */
export const splitName = (name: string): { display: string; nickname?: string } => {
  /*
   * Every mark, in the order they were written, with its delimiters dropped. More
   * than one is joined rather than the extras being thrown away: somebody who has
   * earned two nicknames has earned two nicknames, and the card back is the one
   * surface with room for them.
   */
  const nickname =
    (name.match(NICKNAME) ?? [])
      .map((mark) => mark.slice(1, -1).trim())
      .filter(Boolean)
      .join(' · ') || undefined;

  /*
   * Replaced with a SPACE, not nothing: `Petar"beetje gepiel"Drandarov` typed
   * without spaces around the mark would otherwise come out as `PetarDrandarov`.
   * The `\s+` collapse then takes care of the doubles that leaves behind.
   */
  const display = name.replace(NICKNAME, ' ').replace(/\s+/g, ' ').trim();

  /* A name that is *only* a nickname keeps the original, so nothing ever renders a
     blank card face. */
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
 * A gift with a floor shows that instead (`80+`); those are always single cards, so
 * no count is lost. They are the only ones that ever print anything but a number,
 * and the only orange ones (see `packFoil`) — a wrapper that is lying to you about
 * the odds should look like it.
 *
 * The floor arrives as the overall itself rather than as a level to be looked up, so
 * what is printed here is by construction the number the server drew against.
 */
/*
 * The set-completion packet prints **no number and no word.** It carries a hexagon mark
 * instead — see `PackFace`.
 *
 * A first pass printed `icoon` here. It was the only word on any wrapper, it needed its own
 * smaller type size to fit five letters where the others put one to three characters, and it
 * ran into the objection that removed the `legende` pill from the card face: a label rather
 * than material. Nothing else on a packet spells out what is inside it, and this should not
 * either. There is also no number that would do the job — `1` is the daily freebie and a
 * floor would be a lie, since an icoon can be brons.
 */
export const packPrint = (pack: Pack): string => {
  const floor = packFloor(pack);
  return floor === undefined ? `${pack.size}` : `${floor}+`;
};

/**
 * The set-completion packet, and the single test for it.
 *
 * Its own predicate rather than a `=== true` at each site, for the same reason
 * `packFloor` exists: three things branch on it — the print, the foil and the page's
 * decision to re-bind first — and they must not come to different answers.
 */
export const isIconPack = (pack: Pack): boolean => pack.guaranteesIcon === true;

/**
 * The floor on a packet, if it has one. The single test for "is this guaranteed".
 *
 * It exists because the answer is not `=== undefined`: the server sends
 * `minimumOverall: null` on every earned pack rather than leaving the field out, so a
 * strict check reads every game packet as guaranteed. Both callers — the print and the
 * foil — go through here so there is one place to get that right.
 */
export const packFloor = (pack: Pack): number | undefined =>
  pack.minimumOverall ?? undefined;

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
