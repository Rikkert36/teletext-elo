import logo from '../assets/rik-dev-logo.png';
import wordmark from '../assets/rik-dev-wordmark.png';

/**
 * The rik-dev badge, as a URL.
 *
 * One module owns the import so the wrapper and the card back cannot end up pointing
 * at different files, and so the asset's shape is documented once. It is trimmed to
 * the artwork's own alpha bounds — no transparent margin — which is why anything
 * drawing it needs `aspect-ratio: 320 / 256` rather than a square box.
 *
 * The file is 640×512; the ratio below is that same 5:4 written in the numbers the
 * layout was built against, so it needs no change if the asset is re-cut at another
 * size. 640 is not decorative — the badge reaches 201.6 CSS px on a large packet
 * (84% of a 240px `--pack-w`), and anything smaller upscales on a HiDPI screen. See
 * "One binary asset" in `docs/trading-cards.md` before replacing it.
 */
export const rikDevMark = logo;

/** The trimmed asset's aspect ratio, for anyone laying out a box for it. */
export const RIK_DEV_MARK_RATIO = '320 / 256';

/**
 * The rik-dev wordmark — the name alone, raked italic, gold face on a neon-green
 * shoulder, with the ball and its trail running out of the "v".
 *
 * The badge above and this are **not interchangeable**. The badge is 5:4 and reads as a
 * crest; the wordmark is 3:1 and reads as a band, so anything that swaps one for the
 * other has to re-lay out its box, not just re-point the URL. The card back uses this
 * one (see `.card--back__mark` in card.css); the packet still uses the badge.
 *
 * The file is **642×214**, which is exactly 3:1, and is trimmed horizontally to the
 * artwork's alpha bounds. There are ~4 transparent rows top and bottom (the true bounds
 * at threshold 8 are 642×207, or 3.10:1), which is under 2% and deliberately left in: the
 * ratio below is then the file's own, so `contain` fills the box exactly and the artwork
 * sits where the percentages say.
 *
 * **642 is a ceiling, not a round number, and going bigger made it worse.** The back is
 * only ever rendered by the opener, where the card is `--pack-w` — 240px at the clamp's
 * ceiling — so the mark tops out at 187 CSS px, or 561 device px at DPR 3. The delivered
 * artwork was 2172×724, which had to be minified 6–9× on the way to the screen, and
 * because the mark sits inside the flip's `preserve-3d` layer that reduction is the
 * compositor's bilinear one: four source texels sampled where fifty should contribute.
 * It read as visibly soft before the card turned. Resampled to 642 with Lanczos-3 on
 * premultiplied alpha — premultiplied because the neon glow's fringe otherwise picks up
 * the colour of fully transparent pixels — it is 1.6 MB down to 175 KiB and sharp.
 */
export const rikDevWordmark = wordmark;

/** The wordmark file's aspect ratio, for anyone laying out a box for it. */
export const RIK_DEV_WORDMARK_RATIO = '3 / 1';
