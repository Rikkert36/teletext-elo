import logo from '../assets/rik-dev-logo.png';

/**
 * The rik-dev badge, as a URL.
 *
 * One module owns the import so the wrapper and the card back cannot end up pointing
 * at different files, and so the asset's shape is documented once. It is trimmed to
 * the artwork's own alpha bounds — no transparent margin — which is why anything
 * drawing it needs `aspect-ratio: 320 / 256` rather than a square box.
 */
export const rikDevMark = logo;

/** The trimmed asset's aspect ratio, for anyone laying out a box for it. */
export const RIK_DEV_MARK_RATIO = '320 / 256';
