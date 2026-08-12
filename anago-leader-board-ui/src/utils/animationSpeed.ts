/**
 * Animation pacing. Two settled constants, published to CSS.
 *
 * Timings are split across two layers that must agree: JS constants sequence the
 * reveal (when to flip, when to advance), and CSS durations do the actual
 * movement. Tuning them separately desyncs the two — a flip that starts before
 * the card has finished arriving, or a dwell that ends mid-transition.
 *
 * Both layers therefore derive from the values here:
 *   - JS goes through `ms()`
 *   - CSS multiplies by `var(--anim)`, which this module writes to :root
 *
 * Both were dialled in on sliders in the test panel and then baked in. The
 * sliders are gone and **so is the localStorage persistence they wrote to** —
 * with no UI left to correct it, a value stored during that tuning would have
 * silently overridden the constant below forever, on that browser only, with no
 * way back short of devtools. The constants are now the only source of truth.
 *
 * The setters remain because `window.cardDebug` still exposes them, but they
 * apply for the session only.
 */

/**
 * Duration multiplier: 1 is as designed, 1.5 is 50% slower, 0.5 twice as fast.
 *
 * **Settled at 2.** Every base timing in `PackOpener.tsx` and every duration in
 * the CSS is therefore written at half its real length — `FLIP_MS = 320` turns in
 * 640ms, `SETTLE_MS = 460` travels in 920ms. Read those constants with that in
 * mind before "fixing" one.
 */
export const DEFAULT_SCALE = 2;

const MIN_SCALE = 0.4;
const MAX_SCALE = 4;

const clamp = (value: number): number =>
  Number.isFinite(value) ? Math.min(Math.max(value, MIN_SCALE), MAX_SCALE) : DEFAULT_SCALE;

let scale = DEFAULT_SCALE;

/** Publishes the multiplier to CSS. Every duration reads `var(--anim, 1)`. */
const publish = (): void => {
  document.documentElement.style.setProperty('--anim', String(scale));
};

publish();

export const getSpeed = (): number => scale;

/** Session-only; nothing persists it. */
export const setSpeed = (value: number): number => {
  scale = clamp(value);
  publish();
  return scale;
};

/**
 * Scales a base duration. Call at animation time rather than at module load, so
 * a change to the multiplier takes effect without a reload.
 */
export const ms = (base: number): number => Math.round(base * scale);

/**
 * Whether the reader has asked for less motion.
 *
 * Lives here with the other pacing controls because it is the third knob, and because
 * every sequence on this page has to agree about it: the pack opener, the album's
 * re-binding and anything after them.
 *
 * **What it means here is "land on the finished state", never "play it stilled".** A
 * ceremony held at a mid-point is worse than no ceremony — it reads as a hang. So callers
 * check this and jump to the end, and the CSS kills the transitions to match.
 *
 * Read at animation time rather than once at module load, so toggling it in the OS takes
 * effect on the next sequence instead of on the next reload. The `?.` is for jsdom and
 * older browsers, where the absence of the API is not a preference for less motion.
 */
export const prefersReducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/* ------------------------------------------------------------------ *
 * Build-up length
 *
 * How long a rare card glows before it turns. Separate from `scale` because it is
 * a dramatic choice rather than a pacing one.
 *
 * Deliberately one number for both the sound and the visual. Slowing only the
 * audio would drift out of step with the glow — the riser has to end exactly when
 * the card turns, so they must derive from the same value.
 * ------------------------------------------------------------------ */

/**
 * Length of the *longest* build (level 4). Every other level is a fraction of it
 * — see CEREMONY_STEPS in mock/cardMock.ts — so raising this slows the shimmer,
 * the radiation and every cutoff point together.
 *
 * **Settled at 2660**, which is 5320ms real at the ×2 multiplier: a 1360ms shimmer
 * and then up to 3960ms of radiation. The lower tiers cut that short at
 * 0.256 / 0.504 / 0.752 of it, giving 1360 / 2680 / 4000ms real.
 *
 * This is not a free-standing number — it is `CEREMONY_SHIMMER_MS +
 * CEREMONY_RADIATE_MS` from mock/cardMock.ts, which is where the shimmer and
 * radiation lengths are actually decided. Change it there and mirror it here, or
 * the printed pacing in the debug panel stops matching what plays.
 */
export const DEFAULT_CEREMONY_MS = 2660;

const MIN_CEREMONY_MS = 350;
/** Comfortably above the settled 2660, so the debug slider can still overshoot it. */
const MAX_CEREMONY_MS = 4200;

const clampCeremony = (value: number): number =>
  Number.isFinite(value)
    ? Math.min(Math.max(Math.round(value), MIN_CEREMONY_MS), MAX_CEREMONY_MS)
    : DEFAULT_CEREMONY_MS;

let ceremonyMs = DEFAULT_CEREMONY_MS;

/** Published unitless so CSS can do `calc(var(--ceremony) * 1ms * var(--anim))`. */
const publishCeremony = (): void => {
  document.documentElement.style.setProperty('--ceremony', String(ceremonyMs));
};

publishCeremony();

export const getCeremonyMs = (): number => ceremonyMs;

/** Session-only; nothing persists it. */
export const setCeremonyMs = (value: number): number => {
  ceremonyMs = clampCeremony(value);
  publishCeremony();
  return ceremonyMs;
};
