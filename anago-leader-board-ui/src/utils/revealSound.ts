/**
 * Which sound the face reveal makes — the candidates for `playNameReveal`.
 *
 * Temporary, exactly like `revealStyle.ts` was: this exists so the options can
 * be heard on real pulls rather than argued about. Once one is chosen, fold it
 * into `playNameReveal` as the only body, delete the rest and this module, and
 * take the switcher row out of the test panel.
 *
 * **Only the id and the label live here.** The sounds themselves are in
 * `sounds.ts`, because they are built from that module's private helpers —
 * `playNoise`, `playGrains`, `playPing`, `playBoom`, `playImpact`, `playBell` —
 * and exporting those purely to let a switcher reach them would be a wider hole
 * than the switcher is worth.
 *
 * ---------------------------------------------------------------------------
 * What prompted this: **the sound is pointing the wrong way.**
 *
 * `playNameReveal`'s main layer is a bandpass climbing 700 → 7200 Hz, and its
 * own note says a filter sweeping *up* "is the sound of something widening,
 * which is exactly what the burst is doing". That was written for candidate A,
 * the expanding circle. D does not expand. D resolves by **subtraction**: the
 * figure charges to white-hot, holds, and then the light *drains* and a face is
 * underneath it. The gesture the sound was shaped for no longer exists.
 *
 * D's shape, in fractions of `revealMs` — every candidate below is timed
 * against these, and `rim` (0.62) is the only one passed in:
 *
 *   0    → 0.52   the charge: tier ink to green to white-hot
 *   0.52 → 0.62   the hold: nothing moves at all
 *   0.62 → 0.84   the drain: the light leaves
 *   0.60 → 0.86   the photo and the name come up underneath it
 *
 * At the settled ×2 that is 853ms of charge, 164ms of hold and 361ms of drain,
 * with the face fully up at 1410ms.
 *
 * ---------------------------------------------------------------------------
 * **The first version of this row was not an audition, and the mistake is the
 * most useful thing on this page.**
 *
 * It held eight entries, and all eight ended on the same two tubular-bell
 * partials at D6 and D5 — six of them on the *identical* pair. So the loudest
 * layer in the sound, five sine partials with a full reverb send and a 5.6s
 * tail, was common to every option, and everything that actually differed sat
 * underneath it. Eight variations of garnish on a centre that was never in
 * question. They all sounded the same because they nearly were.
 *
 * Worse, that centre was **inherited rather than chosen**. D6 over D5 sits two
 * and three octaves above the payoff's D4 bell so it stays tonic and cannot
 * argue with a D-minor chord — a constraint that only exists on the ~28% of
 * cards that get a ceremony at all, applied to every new card.
 *
 * So: one rule, and it is the only one.
 *
 * - **Something marks the accent** — the rim, the sound and the last visual
 *   change are one event. *What* marks it is entirely open, and each candidate
 *   below brings its own. A bell is one answer out of an enormous space.
 *
 * Anything pitched should still land on D minor, but that is a courtesy to the
 * rare case rather than a reason to be pitched at all.
 */

export interface RevealSound {
  id: string;
  label: string;
}

export const REVEAL_SOUNDS: RevealSound[] = [
  /*
   * The shipped sound, kept as the thing to beat: rising air over glass grains,
   * then two tubular-bell partials at D6 and D5 held back to the accent.
   */
  { id: 'nu', label: '0 · nu' },

  /*
   * **Chest, not ears** — *FIFA Ultimate Team*.
   *
   * A sine dropping 88 → 52 Hz on the accent, a dark thud under it, a bright
   * narrow sweep over the top so something cuts through, and a crowd wash that
   * starts fractionally *early* because that is what crowds do.
   *
   * It breaks this module's most explicit rule about the reveal — no low end
   * anywhere, because a boom is mass and what happens to the card is light. That
   * was reasoned about a bloom bursting outward, and nothing bursts any more.
   * FUT's reveal is famous for being felt rather than heard, and the question is
   * whether a face arriving wants that.
   */
  { id: 'walkout', label: '1 · walkout' },

  /*
   * **No attack anywhere** — *MTG Arena, and a real foil card in the light*.
   *
   * Nothing is struck and nothing lands: a surface is turned and you hear the
   * sheen travel across it. Two narrow bands sweeping the same span, detuned and
   * offset, so what you actually hear is the beating between them moving — a
   * flanger built out of two filters rather than a delay line. It resolves on a
   * thin high ping, the sheen reaching the far edge.
   *
   * The one candidate that reveals a *texture* instead of announcing an event,
   * which suits a card whose whole face is tier metal.
   */
  { id: 'folie', label: '2 · folie' },

  /*
   * **Shameless** — *Pokémon TCG, and every gacha ever made*.
   *
   * Four short glassy notes 45ms apart rising *into* the accent, then a sparkle
   * tail. The difference between hearing "note" and hearing "yes", and the
   * reason every collectable game in existence does something like it.
   *
   * D5 · F5 · A5 · D6 — a D-minor arpeggio, the same chord the payoff ladder is
   * built on, so it cannot argue with a rare card's chord for free. That was the
   * only part of the old chime's reasoning worth keeping.
   */
  { id: 'arp', label: '3 · arpeggio' },
];

const KEY = 'tafelvoetbal.cards.revealSound';

const byId = (id: string | null): RevealSound | undefined =>
  REVEAL_SOUNDS.find((sound) => sound.id === id);

const load = (): RevealSound => {
  try {
    return byId(window.localStorage.getItem(KEY)) ?? REVEAL_SOUNDS[0];
  } catch {
    return REVEAL_SOUNDS[0];
  }
};

let current = load();

export const getRevealSound = (): RevealSound => current;

export const setRevealSound = (id: string): RevealSound => {
  current = byId(id) ?? REVEAL_SOUNDS[0];
  try {
    window.localStorage.setItem(KEY, current.id);
  } catch {
    /* private browsing — applies for this session only */
  }
  return current;
};
