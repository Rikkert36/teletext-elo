import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Pack,
  RevealedCard,
  avatarUrl,
  ceremonyBuildRatio,
  ceremonyLevelFor,
  ceremonyMaxBuildRatio,
  ceremonyShimmerRatio,
} from '../mock/cardMock';
import PlayerCard, { CardBack } from './PlayerCard';
import {
  playFlip,
  playRarePayoff,
  playRareRise,
  playShimmerSweep,
  playSlot,
  playTear,
} from '../utils/sounds';
import { getCeremonyMs, ms } from '../utils/animationSpeed';
import '../styles/packopen.css';

/*
 * Base timings, at a pacing multiplier of 1. A duplicate costs
 * 180 + 320 + 340 = 840ms and a new card 1180ms, so a 3-card pack of duplicates
 * lands at 420 + 3x840 = 2.94s and one of all-new cards at 3.96s. A rare pull
 * adds its 600ms held beat on top. Multiply by DEFAULT_SCALE for real figures.
 *
 * That is past the "under two seconds" target the design started with. It is a
 * deliberate trade for a hold long enough to actually read the card, and the
 * click-to-skip is what keeps it tolerable at roughly a thousand openings a year.
 *
 * These are passed through `ms()` at animation time, not at module load, so the
 * multiplier can be changed live and stays in lockstep with the CSS durations —
 * see utils/animationSpeed.ts.
 */
const TEAR_MS = 420;
/**
 * Face-down beat before a normal flip. Matches the 180ms entrance animation, so
 * the card finishes arriving before it starts turning rather than doing both at
 * once.
 */
const FLIP_LEAD_MS = 180;
/** Must match the `.opener__flip` transition in packopen.css. */
const FLIP_MS = 320;
/**
 * Gap between the outgoing card leaving for the row and the next one arriving.
 *
 * Without it both occupy the centre at once — the outgoing card's slot flies from
 * exactly where the incoming card mounts — and a face-up player appears to turn
 * back into a card back.
 */
const HANDOFF_MS = 200;
/**
 * How long the card sits *fully revealed* before the next one comes up.
 *
 * Deliberately counted from the end of the flip, not the start. The previous
 * single "dwell" constant was measured from the moment the turn began, so the
 * flip consumed all but ~40ms of it and the card was gone almost the instant you
 * could read it.
 */
const HOLD_MS = 340;
/**
 * The held beat *before* a rare card turns over. This is where rarity is
 * expressed — in the anticipation, not in how long the revealed card lingers.
 */
/**
 * A rare card arrives looking like any other, holds for this long, and only then
 * starts to glow — so the suspense comes from something *beginning to happen*
 * rather than from the card announcing itself on arrival.
 */
const CEREMONY_LEAD_MS = 320;
/**
 * Extra time a card stays up when it filled an empty slot.
 *
 * A pleasant side effect: as the album fills, fewer cards are new, so packs get
 * quicker on their own — the pacing follows how much there is to look at.
 */
const HOLD_NEW_BONUS_MS = 340;
/** How long the revealed card takes to travel down into the row. */
const SETTLE_MS = 460;

/**
 * How long a card stays up once revealed. Depends on newness only — a rare
 * duplicate held as long as a rare new card, which made every 85+ pull feel
 * equally significant whether or not it changed the album.
 */
const holdFor = (isNew: boolean): number => HOLD_MS + (isNew ? HOLD_NEW_BONUS_MS : 0);

const PARTICLE_COUNT = 24;

type Phase = 'sealed' | 'tearing' | 'revealing' | 'done';

interface PackOpenerProps {
  pack: Pack;
  /** Rolls the cards. Called once, when the wrapper is clicked. */
  onOpen: () => Promise<RevealedCard[]>;
  /** Fired after the last card has settled. */
  onFinished: (cards: RevealedCard[]) => void;
  fastMode: boolean;
}

const prefersReducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const PackOpener: React.FC<PackOpenerProps> = ({ pack, onOpen, onFinished, fastMode }) => {
  const [phase, setPhase] = useState<Phase>('sealed');
  const [cards, setCards] = useState<RevealedCard[]>([]);
  const [flagged, setFlagged] = useState(false);
  const [cursor, setCursor] = useState(0);
  /** How many cards have been handed off to the row. Trails `cursor`. */
  const [landed, setLanded] = useState(0);
  /** False during the hand-off gap, so the centre is briefly empty. */
  const [heroVisible, setHeroVisible] = useState(true);
  const [faceUp, setFaceUp] = useState(false);
  const [glowing, setGlowing] = useState(false);
  /**
   * The full-screen bloom, tracked separately from `glowing`.
   *
   * `glowing` deliberately survives the turn so the card keeps its rim — but the
   * screen-filling glow must not, or it hangs there while the card is already
   * travelling to the row, lighting up an empty stage.
   */
  const [blooming, setBlooming] = useState(false);

  const timers = useRef<number[]>([]);
  const cardsRef = useRef<RevealedCard[]>([]);

  /* --- FLIP: carrying the revealed card down into the row ---------------- *
   *
   * The card used to be destroyed while a separate small card popped into the
   * row, so nothing actually travelled — two discrete events and a 240px to
   * 100px size jump.
   *
   * Instead: record the big card's rect before advancing, then once the new slot
   * has been laid out, invert it onto the old position and size and release it.
   * The slot itself does the travelling, so the motion is continuous and lands
   * exactly where the layout puts it — which matters, because the row re-centres
   * every time a card is added.
   */
  const heroRef = useRef<HTMLDivElement | null>(null);
  const heroRect = useRef<DOMRect | null>(null);
  const slotRefs = useRef(new Map<number, HTMLDivElement>());
  const pendingFlip = useRef<number | null>(null);
  /** Where the already-landed slots were before the row grew. */
  const prevRects = useRef(new Map<number, DOMRect>());

  const setSlotRef = (index: number) => (el: HTMLDivElement | null) => {
    if (el) slotRefs.current.set(index, el);
    else slotRefs.current.delete(index);
  };

  useLayoutEffect(() => {
    const arriving = pendingFlip.current;
    if (arriving === null) return;
    pendingFlip.current = null;

    if (prefersReducedMotion()) {
      prevRects.current.clear();
      return;
    }

    const duration = ms(SETTLE_MS);
    const easing = 'cubic-bezier(0.32, 0.72, 0.28, 1)';

    slotRefs.current.forEach((el, index) => {
      const to = el.getBoundingClientRect();
      if (to.width === 0) return;

      let dx: number;
      let dy: number;
      let scale = 1;

      if (index === arriving) {
        // The new card travels from the big reveal card's position and size.
        const from = heroRect.current;
        if (!from) return;
        dx = from.left + from.width / 2 - (to.left + to.width / 2);
        dy = from.top + from.height / 2 - (to.top + to.height / 2);
        scale = from.width / to.width;
      } else {
        // Everything already in the row slides, because the row is centred and
        // re-centres on every addition. Without this the existing cards jump.
        const from = prevRects.current.get(index);
        if (!from) return;
        dx = from.left - to.left;
        dy = from.top - to.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      }

      if (index === arriving) {
        /*
         * Only the arriving slot is scaled, and `transform: scale()` scales
         * box-shadows with it — its glow is drawn at 100px then blown up 2.4x, so
         * the ring and halo arrive far fatter than the hero card's were. That
         * shows as the card puffing up for an instant before it travels.
         *
         * Suppressed for the flight and restored on landing, where the existing
         * box-shadow transition fades the glow in.
         */
        el.classList.add('opener__slot--flying');
        timers.current.push(
          window.setTimeout(() => el.classList.remove('opener__slot--flying'), duration + 20),
        );
      }

      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      // Force the inverted position to be committed before releasing it.
      void el.offsetWidth;
      el.style.transition = `transform ${duration}ms ${easing}`;
      el.style.transform = '';
    });

    prevRects.current.clear();
  });

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  /** Schedules `fn` after a base duration, scaled by the pacing multiplier. */
  const after = useCallback((base: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms(base)));
  }, []);

  const finish = useCallback(() => {
    clearTimers();
    setPhase('done');
    setGlowing(false);
    playSlot();
    onFinished(cardsRef.current);
  }, [clearTimers, onFinished]);

  /**
   * Mutual recursion between the two halves of the reveal, held in a ref so
   * neither needs to be a dependency of the other.
   */
  const stepRef = useRef<(index: number) => void>(() => {});

  /** Brings card `index` on and plays it through to its hold. */
  const playCard = (index: number) => {
    const card = cardsRef.current[index];
    if (!card) return;

    setCursor(index);
    setHeroVisible(true);
    setFaceUp(false);
    setFlagged(false);
    setGlowing(false);
    setBlooming(false);
    setPhase('revealing');

    const advance = () => {
      after(FLIP_MS, () => setFlagged(true));
      after(FLIP_MS + holdFor(card.isNew), () => stepRef.current(index + 1));
    };

    const level = ceremonyLevelFor(card.overall);

    if (level > 0) {
      // Arrives as an ordinary card, then the glow creeps in.
      after(CEREMONY_LEAD_MS, () => {
        setGlowing(true);
        setBlooming(true);

        /*
         * Shimmer first, then radiation. The build length is the only tell: the
         * riser's envelope is shaped for the *longest* radiation window and simply
         * stopped early, so at any given moment it sounds the same whatever the
         * tier — exactly like the glow ramp.
         */
        const base = getCeremonyMs();
        const shimmerMs = Math.round(base * ceremonyShimmerRatio());
        const buildMs = Math.round(base * ceremonyBuildRatio(level));
        const maxRadiateMs = Math.round(
          base * (ceremonyMaxBuildRatio() - ceremonyShimmerRatio()),
        );
        const radiateMs = Math.max(0, buildMs - shimmerMs);

        playShimmerSweep(ms(shimmerMs));

        // Level 1 turns as the shimmer ends, so it never radiates at all.
        if (radiateMs > 0) {
          after(shimmerMs, () => playRareRise(ms(maxRadiateMs), ms(radiateMs)));
        }

        after(buildMs, () => {
          setFaceUp(true);
          // The glow deliberately survives the turn and the hold. Killing it here
          // meant all that build-up resolved into a card that looked exactly like
          // a common one the instant you could finally see who it was.
          // `playCard` clears it when the next card comes on.
          playRarePayoff(level);
          // Bloom freezes at the turn (via --held) and then recedes as the card
          // becomes readable — rather than cutting out or overstaying.
          after(FLIP_MS, () => setBlooming(false));
          advance();
        });
      });
      return;
    }

    after(FLIP_LEAD_MS, () => {
      setFaceUp(true);
      playFlip();
      if (card.isNew) playSlot();
      advance();
    });
  };

  /** Hands the current card off to the row, then brings on card `index`. */
  const revealFrom = (index: number) => {
    if (index >= cardsRef.current.length) {
      finish();
      return;
    }

    if (index === 0) {
      playCard(0);
      return;
    }

    // Measure everything before the row grows: the outgoing card, and every slot
    // already in the row so they can slide to their new positions rather than
    // snapping.
    prevRects.current.clear();
    slotRefs.current.forEach((el, i) => prevRects.current.set(i, el.getBoundingClientRect()));
    heroRect.current = heroRef.current?.getBoundingClientRect() ?? null;
    pendingFlip.current = index - 1;
    setLanded(index);
    setHeroVisible(false);

    after(HANDOFF_MS, () => playCard(index));
  };

  stepRef.current = revealFrom;

  const start = async () => {
    if (phase !== 'sealed') return;

    const drawn = await onOpen();
    cardsRef.current = drawn;
    setCards(drawn);

    // Beat 2 doubles as cover for loading the portraits.
    drawn.forEach((card) => {
      const img = new Image();
      img.src = avatarUrl(card.player.id);
    });

    if (fastMode || prefersReducedMotion()) {
      setLanded(drawn.length);
      finish();
      return;
    }

    playTear();
    setPhase('tearing');
    after(TEAR_MS, () => revealFrom(0));
  };

  /** Clicking anywhere mid-animation lands immediately on the end state. */
  const skip = () => {
    if (phase === 'tearing' || phase === 'revealing') {
      setLanded(cardsRef.current.length);
      finish();
    }
  };

  const current = cards[cursor];
  const level = current === undefined ? 0 : ceremonyLevelFor(current.overall);
  /** The very top of the scale keeps the sweep and the particle burst. */
  const isPeak = level >= 4;

  /*
   * Published to CSS so the glow's swell and the bloom match this card's build
   * length, which differs per level.
   */
  const stageStyle = {
    '--shimmer-ms': `${ms(Math.round(getCeremonyMs() * ceremonyShimmerRatio()))}ms`,
    /*
     * The longest radiation window, not this card's. Every level ramps at the
     * same rate toward the same target after the same delay; only the moment of
     * the turn differs.
     */
    '--radiate-ms': `${ms(
      Math.round(getCeremonyMs() * (ceremonyMaxBuildRatio() - ceremonyShimmerRatio())),
    )}ms`,
  } as React.CSSProperties;

  /** Only the new ones actually changed the album, so that is what gets reported. */
  const newCount = cards.filter((card) => card.isNew).length;
  const outcome =
    newCount === 0
      ? 'geen nieuwe kaarten — allemaal dubbel'
      : `${newCount === 1 ? '1 nieuwe kaart' : `${newCount} nieuwe kaarten`} toegevoegd aan je album`;

  return (
    <div className="opener" onClick={skip}>
      {phase === 'sealed' ? (
        <>
          <div
            className="pack"
            onClick={start}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') void start();
            }}
          >
            <div className="pack__size">
              {pack.size}
              <small>{pack.size === 1 ? 'kaart' : 'kaarten'}</small>
            </div>
            <div className="pack__label">openen</div>
            <div className="pack__reason">{pack.reason}</div>
          </div>
          <div className="opener__hint">klik op het pakje</div>
        </>
      ) : null}

      {phase === 'tearing' ? (
        <>
          <div className="pack pack--tearing">
            <div className="pack__half pack__half--top" />
            <div className="pack__half pack__half--bottom" />
          </div>
          <div className="opener__hint">&nbsp;</div>
        </>
      ) : null}

      {phase === 'revealing' && current ? (
        <>
          <div className="opener__stage" style={stageStyle}>
            {/* Stays mounted for the whole reveal so the class change can transition
                both ways — unmounting it would cut the glow dead. */}
            {glowing ? (
              <div
                className={[
                  'opener__bloom',
                  faceUp ? 'opener__bloom--held' : '',
                  blooming ? '' : 'opener__bloom--out',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="opener__bloom-inner" />
              </div>
            ) : null}

            {faceUp && isPeak ? (
              <div className="opener__particles">
                {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
                  <span
                    key={i}
                    className="opener__particle"
                    style={{ '--angle': `${(360 / PARTICLE_COUNT) * i}deg` } as React.CSSProperties}
                  />
                ))}
              </div>
            ) : null}

            {/* Keyed on cursor so each card gets a fresh element — a reused one
                would animate its rotation back to face-down. */}
            <div
              key={cursor}
              ref={heroRef}
              className={`opener__riser opener__riser--${cursor === 0 ? 'first' : 'next'}`}
              style={heroVisible ? undefined : { visibility: 'hidden' }}
            >
              <div
                className={[
                  'opener__flip',
                  faceUp ? 'opener__flip--up' : '',
                  // One shared ramp; `--held` freezes it at the turn, so a low
                  // tier keeps a faint glow and a high one a bright one.
                  glowing ? 'opener__flip--building' : '',
                  glowing && faceUp ? 'opener__flip--held' : '',
                  flagged && current.isNew ? 'opener__flip--new' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="opener__face">
                  <CardBack />
                </div>
                <div className="opener__face opener__face--front">
                  <PlayerCard card={current} />
                  {isPeak && faceUp ? <div className="opener__sweep" /> : null}
                </div>
              </div>

              {/* Outside the flip, so it stays flat while the card turns. Only
                  during the build — once face up, the card speaks for itself. */}
              {glowing && !faceUp && level > 0 ? <div className="opener__shimmer" /> : null}
            </div>
          </div>

          <div className="opener__revealed">
            {cards.slice(0, landed).map((card, i) => (
              <div
                key={`${card.player.id}-${i}`}
                ref={setSlotRef(i)}
                className={`opener__slot${card.isNew ? ' opener__slot--new' : ''}`}
              >
                <PlayerCard card={card} />
              </div>
            ))}
          </div>

          <div className="opener__hint">
            {cursor + 1} / {cards.length} — klik om over te slaan
          </div>
        </>
      ) : null}

      {phase === 'done' ? (
        <>
          <div className="opener__results">
            {cards.map((card, i) => (
              <div
                key={`${card.player.id}-${i}`}
                className={`opener__result opener__slot${card.isNew ? ' opener__slot--new' : ''}`}
                style={{ animationDelay: `${i * 55}ms` }}
              >
                <PlayerCard card={card} />
              </div>
            ))}
          </div>
          <div className="opener__hint">{outcome}</div>
        </>
      ) : null}
    </div>
  );
};

export default PackOpener;
