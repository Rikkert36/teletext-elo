/**
 * Pack-opening sound, synthesised with WebAudio.
 *
 * Generated rather than loaded from files: no binary assets to author, host or
 * cache-bust. The AudioContext is created lazily on first playback, and every
 * call site is downstream of a click, so autoplay policy is satisfied without an
 * unlocking dance.
 *
 * Two techniques do most of the work:
 *
 *  - **Granular noise** for the physical sounds. A tear or a page turn is dozens
 *    of tiny irregular crackles, not one filtered sweep — a single noise burst
 *    with a smooth decay is exactly what "fake" sounds like.
 *  - **Formant filtering** for the payoffs. Parallel bandpass filters at vowel
 *    frequencies over a detuned saw stack reads as a choir, which is what makes
 *    the big pulls feel monumental rather than merely loud.
 */

const MUTE_KEY = 'tafelvoetbal.cards.muted';

let context: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let reverbSend: GainNode | null = null;
let master: GainNode | null = null;

/** Sound is on by default; the toggle persists per browser. */
export const isMuted = (): boolean => {
  try {
    return window.localStorage.getItem(MUTE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setMuted = (muted: boolean): void => {
  try {
    window.localStorage.setItem(MUTE_KEY, String(muted));
  } catch {
    /* private browsing — sound stays on for this session */
  }
};

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

const getContext = (): AudioContext | null => {
  if (isMuted()) return null;

  if (!context) {
    const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }

  if (context.state === 'suspended') void context.resume();

  return context;
};

const getNoise = (ctx: AudioContext): AudioBuffer => {
  if (!noiseBuffer) {
    const length = Math.floor(ctx.sampleRate * 3);
    noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
};

/** Single output stage — sustained swells overlap and would otherwise clip. */
const getMaster = (ctx: AudioContext): GainNode => {
  if (!master) {
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  return master;
};

/** Shared reverb from a decaying noise impulse. Dry stacks sound thin. */
const getReverbSend = (ctx: AudioContext): GainNode => {
  if (!reverbSend) {
    const seconds = 4;
    const length = Math.floor(ctx.sampleRate * seconds);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6) * Math.min(1, t * 80);
      }
    }

    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;

    reverbSend = ctx.createGain();
    reverbSend.gain.value = 1;
    reverbSend.connect(convolver);

    const wet = ctx.createGain();
    wet.gain.value = 0.95;
    convolver.connect(wet).connect(getMaster(ctx));
  }
  return reverbSend;
};

/* ------------------------------------------------------------------ *
 * Granular physical sounds
 * ------------------------------------------------------------------ */

/**
 * One crackle. Randomised playback rate, buffer offset and filter frequency, so
 * no two grains are alike — that irregularity is what stops it sounding
 * synthetic.
 */
const grain = (
  ctx: AudioContext,
  at: number,
  duration: number,
  frequency: number,
  q: number,
  gain: number,
): void => {
  const source = ctx.createBufferSource();
  source.buffer = getNoise(ctx);
  source.playbackRate.value = 0.65 + Math.random() * 1.1;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = frequency;
  filter.Q.value = q;

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.linearRampToValueAtTime(gain, at + 0.0015);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  source.connect(filter).connect(amp);
  amp.connect(getMaster(ctx));

  source.start(at, Math.random() * 2, duration + 0.02);
  source.stop(at + duration + 0.03);
};

interface GrainCloudOptions {
  count: number;
  /** Seconds the cloud is spread over. */
  spread: number;
  grainMs: [number, number];
  hz: [number, number];
  gain: number;
  q?: number;
  /** >1 clusters grains toward the end, <1 toward the start. */
  bias?: number;
  /**
   * Seconds to hold the cloud back, so it can be scheduled *ahead* of the beat it
   * belongs to. A forge blow needs its anticipation before the contact, and the
   * caller only knows the moment of contact.
   */
  delay?: number;
}

const playGrains = ({
  count,
  spread,
  grainMs,
  hz,
  gain,
  q = 1.4,
  bias = 1,
  delay = 0,
}: GrainCloudOptions): void => {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  for (let i = 0; i < count; i++) {
    const progress = Math.pow((i + Math.random()) / count, bias);
    const at = now + delay + progress * spread;
    const duration = (grainMs[0] + Math.random() * (grainMs[1] - grainMs[0])) / 1000;
    const frequency = hz[0] + Math.random() * (hz[1] - hz[0]);
    // Envelope across the cloud, plus per-grain variation.
    const shape = 0.45 + 0.55 * Math.sin(Math.PI * progress);
    grain(ctx, at, duration, frequency, q, gain * shape * (0.5 + Math.random()));
  }
};

/** A filtered noise band — still useful under the grains. */
const playNoise = (
  duration: number,
  fromHz: number,
  toHz: number,
  gain: number,
  type: BiquadFilterType = 'lowpass',
  delay = 0,
): void => {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime + delay;
  const source = ctx.createBufferSource();
  source.buffer = getNoise(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = 0.7;
  filter.frequency.setValueAtTime(fromHz, now);
  filter.frequency.exponentialRampToValueAtTime(Math.max(toHz, 40), now + duration);

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(filter).connect(amp);
  amp.connect(getMaster(ctx));
  source.start(now);
  source.stop(now + duration);
};

/** Low end. The short pitch drop is what gives weight, not volume. */
const playBoom = (frequency: number, duration: number, gain: number, delay = 0): void => {
  const ctx = getContext();
  if (!ctx) return;

  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency * 1.7, start);
  osc.frequency.exponentialRampToValueAtTime(frequency, start + 0.14);

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(amp);
  amp.connect(getMaster(ctx));
  osc.start(start);
  osc.stop(start + duration + 0.05);
};

/** The thud at the moment of impact — dark, no top end. */
const playImpact = (gain: number, duration = 0.55): void => {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = getNoise(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(900, now);
  filter.frequency.exponentialRampToValueAtTime(110, now + duration);

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(filter).connect(amp);
  amp.connect(getMaster(ctx));

  const send = ctx.createGain();
  send.gain.value = 0.55;
  amp.connect(send).connect(getReverbSend(ctx));

  source.start(now);
  source.stop(now + duration);
};

/* ------------------------------------------------------------------ *
 * Tonal layers
 * ------------------------------------------------------------------ */

interface LayerOptions {
  attack: number;
  sustain: number;
  release: number;
  gain: number;
  space?: number;
  delay?: number;
}

/** Filtered saw stack: the strings-and-brass bed. */
const playSwell = (
  frequencies: number[],
  opts: LayerOptions & { cutoffFrom: number; cutoffTo: number },
): void => {
  const ctx = getContext();
  if (!ctx) return;

  const { attack, sustain, release, gain, cutoffFrom, cutoffTo, space = 0.6, delay = 0 } = opts;
  const start = ctx.currentTime + delay;
  const end = start + attack + sustain + release;

  frequencies.forEach((frequency) => {
    [-8, 8].forEach((detune) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = frequency;
      osc.detune.value = detune;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 0.6;
      filter.frequency.setValueAtTime(cutoffFrom, start);
      filter.frequency.linearRampToValueAtTime(cutoffTo, start + attack + sustain * 0.6);

      const amp = ctx.createGain();
      amp.gain.setValueAtTime(0.0001, start);
      // Linear rise, not exponential — that is what makes it a swell.
      amp.gain.linearRampToValueAtTime(gain, start + attack);
      amp.gain.setValueAtTime(gain, start + attack + sustain);
      amp.gain.exponentialRampToValueAtTime(0.0001, end);

      osc.connect(filter).connect(amp);
      amp.connect(getMaster(ctx));

      const send = ctx.createGain();
      send.gain.value = space;
      amp.connect(send).connect(getReverbSend(ctx));

      osc.start(start);
      osc.stop(end + 0.1);
    });
  });
};

/** Vowel formants for an "aah". F1/F2/F3 of a sung open vowel. */
const FORMANTS: Array<[number, number, number]> = [
  [720, 9, 1],
  [1240, 11, 0.55],
  [2680, 13, 0.28],
];

/**
 * A choir. Detuned saws through parallel formant bandpasses, with slow vibrato
 * per voice.
 *
 * This is the layer that makes the big pulls feel sacred rather than just big —
 * a human vowel is the one timbre that reads as voices rather than synthesiser.
 */
const playChoir = (frequencies: number[], opts: LayerOptions): void => {
  const ctx = getContext();
  if (!ctx) return;

  const { attack, sustain, release, gain, space = 0.85, delay = 0 } = opts;
  const start = ctx.currentTime + delay;
  const end = start + attack + sustain + release;

  frequencies.forEach((frequency, index) => {
    [-11, 11].forEach((detune) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = frequency;
      osc.detune.value = detune;

      // Vibrato: slightly different rate per voice so they drift apart.
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 4.3 + index * 0.42 + Math.random() * 0.3;
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = 7;
      lfo.connect(lfoDepth).connect(osc.detune);

      const amp = ctx.createGain();
      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.linearRampToValueAtTime(gain, start + attack);
      amp.gain.setValueAtTime(gain, start + attack + sustain);
      amp.gain.exponentialRampToValueAtTime(0.0001, end);

      FORMANTS.forEach(([hz, q, level]) => {
        const band = ctx.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = hz;
        band.Q.value = q;
        const trim = ctx.createGain();
        trim.gain.value = level;
        osc.connect(band).connect(trim).connect(amp);
      });

      amp.connect(getMaster(ctx));
      const send = ctx.createGain();
      send.gain.value = space;
      amp.connect(send).connect(getReverbSend(ctx));

      osc.start(start);
      lfo.start(start);
      osc.stop(end + 0.1);
      lfo.stop(end + 0.1);
    });
  });
};

/**
 * A struck bell, built from inharmonic partials.
 *
 * The ratios are a tubular bell's, not a harmonic series — that inharmonicity is
 * what makes it read as cast metal rather than as a sine.
 */
const playBell = (fundamental: number, gain: number, delay = 0): void => {
  const ctx = getContext();
  if (!ctx) return;

  /*
   * Ratio, level, decay. Decays lengthened by about a third — the bell is the only
   * sustaining voice at level 1, so its ring is what stopped that level from
   * feeling cut off.
   */
  const partials: Array<[number, number, number]> = [
    [1, 1, 5.6],
    [2, 0.6, 4.5],
    [2.76, 0.42, 3.7],
    [5.4, 0.22, 2.5],
    [8.93, 0.12, 1.6],
  ];

  const start = ctx.currentTime + delay;

  partials.forEach(([ratio, level, decay]) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = fundamental * ratio;

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.linearRampToValueAtTime(gain * level, start + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + decay);

    osc.connect(amp);
    amp.connect(getMaster(ctx));

    const send = ctx.createGain();
    send.gain.value = 0.9;
    amp.connect(send).connect(getReverbSend(ctx));

    osc.start(start);
    osc.stop(start + decay + 0.1);
  });
};

/* ------------------------------------------------------------------ *
 * Physical effects
 * ------------------------------------------------------------------ */

/** Foil ripping: a dense crackle cloud that intensifies, over a low rip. */
export const playTear = (): void => {
  playGrains({
    count: 54,
    spread: 0.42,
    grainMs: [5, 22],
    hz: [900, 6200],
    gain: 0.09,
    q: 1.1,
    bias: 0.75,
  });
  playNoise(0.4, 700, 180, 0.1);
  playBoom(90, 0.22, 0.1, 0.34);
};

/** A card turning: paper snap plus the soft slap of it landing. */
export const playFlip = (): void => {
  playGrains({
    count: 9,
    spread: 0.05,
    grainMs: [4, 12],
    hz: [1600, 4600],
    gain: 0.1,
    q: 2.2,
  });
  playBoom(160, 0.1, 0.08, 0.015);
};

/** Paper flexing and dropping — longer, softer, no bright edge. */
export const playPageTurn = (): void => {
  playGrains({
    count: 28,
    spread: 0.34,
    grainMs: [8, 30],
    hz: [520, 3000],
    gain: 0.055,
    q: 1.1,
    bias: 1.35,
  });
  playNoise(0.32, 420, 150, 0.05);
  playBoom(120, 0.14, 0.055, 0.26);
};

/** A card sliding into its slot: brief friction, then a tiny stop. */
export const playSlot = (): void => {
  playGrains({
    count: 11,
    spread: 0.1,
    grainMs: [5, 16],
    hz: [700, 2400],
    gain: 0.05,
    q: 1.6,
  });
  playBoom(130, 0.08, 0.05, 0.085);
};

/* ------------------------------------------------------------------ *
 * The reveal
 *
 * One sound, for the one moment the beat exists for: the flash goes off and the
 * card stops being a silhouette.
 *
 * This was a run of per-word strikes, and the run was the problem. A name is one
 * fact split into grammar — "Jasper / van / Buul" spends three dramatic beats,
 * and one of them is "van". Splitting it padded the beat instead of building it,
 * and each fragment was too small to carry a sound heavy enough to matter, so the
 * sound was always louder than the thing it was happening to. One event, once.
 * ------------------------------------------------------------------ */

/**
 * The card resolving: light, not impact.
 *
 * **No low end at all, and that is the whole change.** This was a struck plate —
 * contact grains over a 94 Hz body with a clang on top — and it was wrong for what
 * is now on screen. A boom is *mass*, and the thing that happens to the card is a
 * bloom of light expanding out of its centre; the two disagreed, and the sound
 * kept reading as heavier than the picture. Nothing here goes below about 700 Hz.
 *
 * Three layers, all of them upward:
 *
 * 1. **Air opening.** A bandpass climbing 700 → 7200 Hz. A filter sweeping *up*
 *    is the sound of something widening, which is exactly what the burst is
 *    doing; the same sweep pointed down would be something closing.
 * 2. **Sparkle.** Sparse high grains at a high Q, so each one rings for a moment
 *    instead of clicking. Biased toward the start so the glitter arrives with the
 *    light rather than trailing it.
 * 3. **The chime**, held back to land when the light reaches the border and the
 *    rim comes up — so what the ear hears arriving at the edge is what the eye
 *    sees arriving there.
 *
 * D6 over D5, two and three octaves above the payoff's D4 bell. High enough to
 * read as light rather than as metal, and still the tonic, so it cannot argue
 * with a D-minor chord that may still be ringing on a rare card.
 *
 * @param rimAtMs Real ms from now until the light meets the border — the same
 * number `PackOpener` uses to fire the rim, passed in rather than re-derived.
 */
export const playNameReveal = (rimAtMs = 250): void => {
  const rim = rimAtMs / 1000;

  playNoise(0.34, 700, 7200, 0.05, 'bandpass');

  playGrains({
    count: 14,
    spread: 0.2,
    grainMs: [30, 130],
    hz: [4200, 11000],
    gain: 0.03,
    q: 8,
    bias: 0.7,
  });

  playBell(D6, 0.03, rim);
  playBell(D5, 0.02, rim + 0.014);
};

/* ------------------------------------------------------------------ *
 * Payoffs
 *
 * Open fifths and octaves with NO THIRD. A major triad is inherently cheerful;
 * root/fifth/octave is what reads as scale rather than happiness.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * The build-up
 *
 * A reverse cymbal: a highpass noise swell and nothing else — no pitch movement
 * whatsoever. Picked by ear from ten candidates. Everything that climbed read as
 * either thin or busy, and the layered ones fought the payoff; pure air turned
 * out to be the one that builds without announcing itself.
 * ------------------------------------------------------------------ */

const route = (ctx: AudioContext, node: AudioNode, space = 0): void => {
  node.connect(getMaster(ctx));
  if (space > 0) {
    const send = ctx.createGain();
    send.gain.value = space;
    node.connect(send).connect(getReverbSend(ctx));
  }
};


/**
 * The build under a rare card's glow.
 *
 * Takes its length from the caller so it tracks the visual build, pacing
 * multiplier included — a musical hit should not stretch, but a build must. The
 * length itself is `getCeremonyMs()` in utils/animationSpeed.ts.
 */
export const playRareRise = (fullMs: number, actualMs = fullMs): void => {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  /*
   * The envelope is shaped for the longest possible build; `actual` is when this
   * card's build actually ends.
   *
   * That is what makes the build identical at any timestamp regardless of tier —
   * scaling the envelope to each level's length instead would make a short build
   * reach full brightness sooner, and you could hear the difference immediately.
   */
  const full = Math.max(0.2, fullMs / 1000);
  const actual = Math.max(0.12, Math.min(actualMs / 1000, full));

  /*
   * Ramp only as far as the cutoff, but at the full-length *rate*.
   *
   * `peak * (actual / rampEnd)` is where a full-length ramp would have got to by
   * the cutoff, so the slope is identical at every level and the sound matches the
   * glow. Computing it is also the only correct way: reading `gain.value` to hold
   * the current level returns the param's value *now*, not the ramp's future
   * value, so it pinned the gain to the wrong level entirely.
   */
  const ramped = (peak: number, rampEnd: number): number =>
    peak * Math.min(1, actual / rampEnd);

  const source = ctx.createBufferSource();
  source.buffer = getNoise(ctx);

  // Highpass climbing rather than a bandpass sweeping: the band stays wide open
  // above the cutoff, so it reads as air rather than as a whistle.
  const high = ctx.createBiquadFilter();
  high.type = 'highpass';
  high.frequency.setValueAtTime(400, now);
  high.frequency.exponentialRampToValueAtTime(3000, now + full);

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.linearRampToValueAtTime(ramped(0.34, full * 0.97), now + actual);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + actual + 0.12);

  source.connect(high).connect(amp);
  route(ctx, amp, 0.5);
  source.start(now);
  source.stop(now + actual + 0.18);

  // Same treatment for the sub.
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(30, now);
  sub.frequency.exponentialRampToValueAtTime(58, now + full);

  const subAmp = ctx.createGain();
  subAmp.gain.setValueAtTime(0.0001, now);
  subAmp.gain.linearRampToValueAtTime(ramped(0.13, full * 0.92), now + actual);
  subAmp.gain.exponentialRampToValueAtTime(0.0001, now + actual + 0.12);

  sub.connect(subAmp);
  route(ctx, subAmp);
  sub.start(now);
  sub.stop(now + actual + 0.18);
};

/**
 * The shimmer phase, under the visual sweep. Airy and quiet — it is the same for
 * every gold card, and for a 75 it is the entire build.
 */
export const playShimmerSweep = (durationMs: number): void => {
  const ctx = getContext();
  if (!ctx) return;

  const duration = Math.max(0.15, durationMs / 1000);
  const now = ctx.currentTime;

  // Sparkle, spread across the pass.
  playGrains({
    count: 22,
    spread: duration * 0.94,
    grainMs: [5, 20],
    hz: [2600, 12000],
    gain: 0.034,
    q: 1.9,
  });

  // A soft breath underneath, so the phase is not near-silence for a full second.
  const source = ctx.createBufferSource();
  source.buffer = getNoise(ctx);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 0.8;
  band.frequency.setValueAtTime(900, now);
  band.frequency.exponentialRampToValueAtTime(4200, now + duration);

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.linearRampToValueAtTime(0.05, now + duration * 0.55);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(band).connect(amp);
  route(ctx, amp, 0.6);
  source.start(now);
  source.stop(now + duration + 0.05);
};

/* ------------------------------------------------------------------ *
 * The payoff at the moment the card turns
 *
 * One chord in D, gaining a voice per level, so each tier is audibly the previous
 * one plus something. The four payoffs used to be unrelated sounds in three
 * different keys — G, then A, then D — which is why they read as separate events
 * rather than as one thing growing.
 *
 * The chord builds **downward**: level 1 is a bright single D4 and the tiers above
 * add weight beneath it, which is what makes them feel bigger rather than merely
 * louder. Level 4 also adds an octave on top.
 *
 * Open fifths and octaves only — no thirds anywhere. (Level 2 previously had a
 * bell on C4 over an A bed: a minor third, the one interval excluded everywhere
 * else.)
 * ------------------------------------------------------------------ */

/* D minor: the third is F natural, not F#. */
const D1 = 36.71;
const D2 = 73.42;
const F2 = 87.31;
const A2 = 110;
const D3 = 146.83;
const F3 = 174.61;
const A3 = 220;
const D4 = 293.66;
const F4 = 349.23;
const A4 = 440;
const D5 = 587.33;
/** Only the reveal reaches this high — see `playNameReveal`. */
const D6 = 1174.66;

interface PayoffSpec {
  /** The chord itself. Each level is the one above it plus a voice. */
  voices: number[];
  swellGain: number;
  sustain: number;
  release: number;
  cutoffTo: number;
  impact: number;
  /** [frequency, duration, gain] */
  booms: Array<[number, number, number]>;
  bellGain: number;
  sparkle: number;
  choir?: number[];
  /** Level 4 only: a second choir, an octave up and late. */
  choirLate?: number[];
}

const PAYOFFS: PayoffSpec[] = [
  {
    /*
     * 75–79 · the bell carries the single note; no swell at all.
     *
     * A one-voice swell here read as a flute — a lone sustained sawtooth through
     * an opening filter is exactly that. This level's instrumentation is a struck
     * bell and sparkle, nothing sustained.
     */
    voices: [],
    swellGain: 0,
    sustain: 0,
    release: 0,
    cutoffTo: 2400,
    impact: 0,
    booms: [],
    bellGain: 0.028,
    sparkle: 9,
  },
  {
    /*
     * 80–84 · the swell enters, in the register it was already in (A2·D3). Voicing
     * it an octave higher made it noticeably thinner than the version that was
     * approved, so the ladder builds downward from here and the bell keeps the
     * bright D4 on top at every level.
     */
    voices: [A2, D3],
    swellGain: 0.019,
    sustain: 0.8,
    release: 1.9,
    cutoffTo: 1900,
    impact: 0.13,
    booms: [
      //[D2, 0.85, 0.17]
      ],
    bellGain: 0.034,
    sparkle: 6,
  },
  {
    /*
     * 85–89 · adds the octave below, the third, the choir and a fuller bell.
     *
     * The third is what makes this a chord rather than a stack of Ds and fifths.
     * It is F natural, so the chord is D *minor* — a major third was part of why
     * an earlier version read as cheerful, and minor gives the richness without
     * the brightness.
     */
    voices: [D2, F2, A2, D3],
    swellGain: 0.021,
    sustain: 1.4,
    release: 2.8,
    cutoffTo: 2200,
    impact: 0.24,
    booms: [[D2, 1.3, 0.26]],
    bellGain: 0.045,
    sparkle: 0,
    choir: [F3, A3, D4],
  },
  {
    // 90+ · an octave below and above, and a sub beneath the whole triad.
    voices: [D1, D2, F2, A2, D3, D4],
    swellGain: 0.017,
    sustain: 2.4,
    release: 3.8,
    cutoffTo: 2600,
    impact: 0.36,
    booms: [
      //[D1, 2.2, 0.32],
      [D2, 1.5, 0.2],
    ],
    bellGain: 0.07,
    sparkle: 0,
    choir: [D3, F3, A3, D4],
    choirLate: [D4, F4, A4, D5],
  },
];

export const playRarePayoff = (level: number): void => {
  const spec = PAYOFFS[Math.min(Math.max(level, 1), PAYOFFS.length) - 1];
  if (!spec || level < 1) return;

  if (spec.impact > 0) playImpact(spec.impact, level >= 4 ? 0.8 : 0.5);
  spec.booms.forEach(([frequency, duration, gain], i) =>
    playBoom(frequency, duration, gain, i * 0.02),
  );

  // Always on D4, so the struck note is the same one at every level.
  playBell(D4, spec.bellGain, 0.02);

  if (spec.sparkle > 0) {
    playGrains({
      count: spec.sparkle,
      spread: 0.3,
      grainMs: [4, 14],
      hz: [3200, 10000],
      gain: 0.03,
      q: 2,
      bias: 1.6,
    });
  }

  if (spec.voices.length > 0) {
    playSwell(spec.voices, {
      attack: 0.14 + level * 0.04,
      sustain: spec.sustain,
      release: spec.release,
      gain: spec.swellGain,
      cutoffFrom: 300,
      cutoffTo: spec.cutoffTo,
      space: 0.5 + level * 0.04,
    });
  }

  if (spec.choir) {
    playChoir(spec.choir, {
      attack: 0.42,
      sustain: level >= 4 ? 2.2 : 1.6,
      release: level >= 4 ? 3.4 : 3.0,
      gain: level >= 4 ? 0.026 : 0.028,
      space: 0.88,
      delay: 0.14,
    });
  }

  if (spec.choirLate) {
    playChoir(spec.choirLate, {
      attack: 0.7,
      sustain: 1.8,
      release: 3.2,
      gain: 0.018,
      space: 0.95,
      delay: 0.85,
    });
  }
};
