/**
 * The single knob for animation pacing.
 *
 * Timings are split across two layers that must agree: JS constants sequence the
 * reveal (when to flip, when to advance), and CSS durations do the actual
 * movement. Tuning them separately desyncs the two — a flip that starts before
 * the card has finished arriving, or a dwell that ends mid-transition.
 *
 * Both layers therefore derive from `scale` here:
 *   - JS goes through `ms()`
 *   - CSS multiplies by `var(--anim)`, which this module writes to :root
 *
 * `scale` is a *duration multiplier*: 1 is as designed, 1.5 is 50% slower, 0.5
 * twice as fast. It persists per browser so it can be dialled in at runtime
 * without a rebuild, then baked into DEFAULT_SCALE once it feels right.
 */

const KEY = 'tafelvoetbal.cards.animSpeed';

/** Change this to bake in a new default. */
export const DEFAULT_SCALE = 2;

const MIN_SCALE = 0.4;
const MAX_SCALE = 4;

const clamp = (value: number): number =>
  Number.isFinite(value) ? Math.min(Math.max(value, MIN_SCALE), MAX_SCALE) : DEFAULT_SCALE;

const load = (): number => {
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored === null ? DEFAULT_SCALE : clamp(parseFloat(stored));
  } catch {
    return DEFAULT_SCALE;
  }
};

let scale = load();

/** Publishes the multiplier to CSS. Every duration reads `var(--anim, 1)`. */
const publish = (): void => {
  document.documentElement.style.setProperty('--anim', String(scale));
};

publish();

export const getSpeed = (): number => scale;

export const setSpeed = (value: number): number => {
  scale = clamp(value);
  try {
    window.localStorage.setItem(KEY, String(scale));
  } catch {
    /* private browsing — applies for this session only */
  }
  publish();
  return scale;
};

/**
 * Scales a base duration. Call at animation time rather than at module load, so
 * a change to the multiplier takes effect without a reload.
 */
export const ms = (base: number): number => Math.round(base * scale);

/* ------------------------------------------------------------------ *
 * Build-up length
 *
 * How long a rare card glows before it turns. Separate from `scale` because it is
 * a dramatic choice rather than a pacing one.
 *
 * Deliberately one knob for both the sound and the visual. A slider that only
 * slowed the audio would drift out of step with the glow — the riser has to end
 * exactly when the card turns, so they must derive from the same number.
 * ------------------------------------------------------------------ */

const CEREMONY_KEY = 'tafelvoetbal.cards.ceremonyMs';

/**
 * Length of the *longest* build (level 4). Every other level is a fraction of it
 * — see CEREMONY_STEPS in mock/cardMock.ts — so raising this slows the shimmer,
 * the radiation and every cutoff point together.
 *
 * Note this is the base: at the ×2 pacing multiplier the top build runs 3000ms.
 */
export const DEFAULT_CEREMONY_MS = 1500;

const MIN_CEREMONY_MS = 350;
const MAX_CEREMONY_MS = 3200;

const clampCeremony = (value: number): number =>
  Number.isFinite(value)
    ? Math.min(Math.max(Math.round(value), MIN_CEREMONY_MS), MAX_CEREMONY_MS)
    : DEFAULT_CEREMONY_MS;

let ceremonyMs = (() => {
  try {
    const stored = window.localStorage.getItem(CEREMONY_KEY);
    return stored === null ? DEFAULT_CEREMONY_MS : clampCeremony(parseInt(stored, 10));
  } catch {
    return DEFAULT_CEREMONY_MS;
  }
})();

/** Published unitless so CSS can do `calc(var(--ceremony) * 1ms * var(--anim))`. */
const publishCeremony = (): void => {
  document.documentElement.style.setProperty('--ceremony', String(ceremonyMs));
};

publishCeremony();

export const getCeremonyMs = (): number => ceremonyMs;

export const setCeremonyMs = (value: number): number => {
  ceremonyMs = clampCeremony(value);
  try {
    window.localStorage.setItem(CEREMONY_KEY, String(ceremonyMs));
  } catch {
    /* private browsing — applies for this session only */
  }
  publishCeremony();
  return ceremonyMs;
};
