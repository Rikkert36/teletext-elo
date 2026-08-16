import React, { useEffect, useMemo, useRef, useState } from 'react';
import { COVERS, CoverId, albumLeather } from '../utils/albumLeather';
import { ms, prefersReducedMotion } from '../utils/animationSpeed';
import { playRebind } from '../utils/sounds';
import WrittenName, { durationFor } from './WrittenName';
import CoverOrnament from './CoverOrnament';
import { writeName } from '../utils/hersheyScript';
/*
 * The finished book's face is the album's own `.album__cover`, so those rules have to be
 * loaded even though the album itself is not mounted during the ceremony — this component
 * is what stands in its place. Webpack dedupes the import against Album's.
 */
import '../styles/album.css';
import '../styles/albumchoice.css';

/*
 * Beat lengths, base — so every number here is HALF its real duration, because `--anim`
 * is 2 and every duration in albumchoice.css multiplies by it, exactly as `ms()` does to
 * these timers. Getting this wrong is the classic failure on this page: the ceremony runs
 * at twice the speed of the book it hands over to and reads as a glitch rather than a
 * sequence.
 */

/**
 * The nine unchosen books leaving, each one `CLEAR_STEP` behind the last.
 *
 * `CLEAR_STEP` went from 55 to 26 when the shelf went from five books to ten, so that the
 * sweep still takes about the same half second end to end — at 55 it ran 735ms base,
 * which is 1.5s real against `--anim`, and a table being cleared for that long stops
 * reading as a beat and starts reading as a wait. The stagger is by index, so it runs
 * left to right and top to bottom, which is the order the books are laid out in.
 */
const CLEAR_MS = 240;
const CLEAR_STEP = 26;
/** The survivor sliding to the middle of the table. */
const CENTRE_MS = 300;
/** The book coming up to full size in front of you, as the row fades out under it. */
const LIFT_MS = 380;
/** Held still before the pen touches down. A hand pauses before it writes. */
const SETTLE_MS = 200;
/**
 * How long the writing takes when the name cannot be set as strokes.
 *
 * A name outside the font falls back to printed type — see `writeName` — so there is
 * nothing to draw and nothing to listen to. It still gets a beat rather than appearing
 * under the settle: the ceremony's rhythm belongs to the ceremony, not to whether this
 * particular name happened to be spellable in a script hand.
 */
const PRINTED_MS = 520;
/** After the name is finished, before handing the book to the album. */
const REST_MS = 460;

/*
 * **There is no accent constant here any more, and that is the design.**
 *
 * `COOL_AT = 0.6` stood here — `album-name-lit`'s 60% keyframe, the frame the light starts
 * to leave the letters on — because a chord was scheduled against it. Nothing is scheduled
 * against it now: the build simply runs the length of the beat and its own arc crests
 * inside the cool-off. One less number that has to be kept in step with a keyframe.
 */

/**
 * The shape of the shelf, and it has to be the same five as `grid-template-columns` in
 * albumchoice.css — the grid states the columns and this states which one is the middle,
 * and a disagreement slides the survivor to the wrong place rather than failing.
 *
 * `COVERS.length` is 10, so the rows work out at two. The horizontal target is the middle
 * column; the vertical one is `(rows − 1) / 2`, which is the seam between the two rows
 * rather than a row — there is no middle row and the centre of the table is between them.
 * That is where `.choice__stage` brings the full-size book up, so it is the right target
 * even though it is a half-integer.
 */
const COLUMNS = 5;
const CENTRE_COL = (COLUMNS - 1) / 2;
const CENTRE_ROW = (Math.ceil(COVERS.length / COLUMNS) - 1) / 2;

/**
 * **`splitIntoWords` lived here and is gone, along with the whole per-letter apparatus.**
 *
 * The cover was blocked in hot foil a letter at a time, so the name had to be one
 * inline-block per character; that in turn allowed a line break between any two of them,
 * which wrapped "Anneloes Ernest" as "ANNELOES ERNES / T" until this function grouped the
 * characters into unbreakable words. All of it existed to serve a press indexing along a
 * line.
 *
 * The name is **written** now, as one drawing — see `hersheyScript.ts`. There are no
 * character boxes to break between, so there is nothing to group; the line break moved
 * into `writeName`, which decides it from the name's measured width because an SVG cannot
 * reflow. `.choice__word` and `.choice__letter` went with this.
 */

type Phase = 'choosing' | 'clearing' | 'centring' | 'lifting' | 'writing' | 'resting';

interface AlbumChoiceProps {
  /**
   * The name to block into the cover, or undefined to skip that beat entirely.
   *
   * Optional because a re-bind does not re-stamp the name — the book is already yours —
   * so the beat has to be skippable without disturbing the ones around it.
   */
  stampName?: string;
  /**
   * The leather was picked. Fires at the **start** of the ceremony, so the write can be
   * in flight while the book travels and the name goes on.
   */
  onChoose: (cover: CoverId) => void;
  /**
   * The ceremony is over and the book is ready to be handed to the album.
   *
   * Separate from `onChoose` deliberately: the page must swap this component out when the
   * *sequence* says so and not when the request resolves, or a fast server unmounts the
   * stamping halfway through a name.
   */
  onDone: () => void;
}

/**
 * Getting your album: ten of them lying on the table, and you pick one up.
 *
 * This exists because an album that is simply *there* has never been acquired. The page
 * used to go straight from typing a name to a fully-formed book, which made the start of
 * a collection the one thing on this screen with no moment attached to it — and a
 * collection is entirely built out of moments.
 *
 * Books rather than a swatch row, and **no preview**: choosing is picking an object up
 * off a table, and a control that restains a book in place is a settings widget with
 * leather printed on it. The cost is that you commit before seeing your name on it, which
 * is the same deal a real shop gives you.
 *
 * **Ten is where the objects stop being objects, and the layout is what pays for it.**
 * Five in a row was one shelf; ten in a row would be a swatch strip in all but name, at
 * 27% of a real book. Laid out five by two it stays a display of things on a table, and
 * the cost is a scale of 0.40 rather than 0.55 — see the budget in albumchoice.css.
 *
 * The blank covers carry no name and their captions are set *outside* the scaled book, so
 * nothing on the shelf depends on being readable at 20% — which is what makes ten of them
 * work on a phone as well as on a desk.
 */
const AlbumChoice: React.FC<AlbumChoiceProps> = ({ stampName, onChoose, onDone }) => {
  const [phase, setPhase] = useState<Phase>('choosing');
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);

  const timers = useRef<number[]>([]);

  const after = (delay: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, delay));
  };

  useEffect(
    () => () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    },
    [],
  );

  /*
   * The same layout the cover is drawn from, used here only to time the sound.
   *
   * Calling `writeName` twice — once here, once inside `WrittenName` — is deliberate and
   * safe in a way a second copy of the *timings* would not be: it is a pure function of
   * the name, so the two calls cannot disagree about where the strokes are. What must not
   * be recomputed is the total duration, because that is the number the ear and the eye
   * share; it is worked out once below and handed to the component.
   */
  const written = useMemo(() => (stampName ? writeName(stampName) : null), [stampName]);
  /* Through `ms()` like every other duration on this page, so the speed control moves the
     pen along with the rest of the ceremony. */
  const writeMs = ms(written ? durationFor(written.totalLength) : PRINTED_MS);
  const picked = pickedIndex === null ? null : COVERS[pickedIndex];

  const choose = (cover: CoverId, index: number) => {
    if (phase !== 'choosing') return;

    setPickedIndex(index);
    onChoose(cover);
    setPhase('clearing');

    // The others are off the table before the survivor moves, so nothing slides behind
    // anything else.
    const cleared = ms(CLEAR_MS + CLEAR_STEP * (COVERS.length - 1));
    after(cleared, () => setPhase('centring'));

    const centred = cleared + ms(CENTRE_MS);
    after(centred, () => setPhase('lifting'));

    const lifted = centred + ms(LIFT_MS);
    after(lifted, () => {
      setPhase('writing');

      if (!stampName) {
        after(ms(REST_MS), onDone);
        return;
      }

      /*
       * **The binding sound: the re-binding's build, across the whole beat, and nothing
       * lands at the end of it.**
       *
       * The light gathering on the cover and the icon binding closing over the boards are
       * the same event at two scales, so the album's build does both — but only the build.
       * This ends on `playRarePayoff` for a while and it was wrong twice over. At
       * `REBIND_PAYOFF` it was the full four-voice chord, which is the rarest moment in the
       * game played over a book that has no cards in it yet. And *any* level is wrong here
       * on a stricter reading: every pitch in `sounds.ts` belongs to the D-minor payoff
       * ladder, which is the cards' ladder — `playRebind` is unpitched precisely so it
       * cannot argue with it — so a chord on a beat with no card in it is borrowed weight.
       *
       * **The build ends the beat by itself, which is why it runs the full `writeMs`.**
       * `playRebind`'s arc crests at 0.82 and falls; over the whole lighting beat that puts
       * its brightest moment inside the 60–100% cool-off, decaying out as the gilt settles.
       * So the light leaving and the sound leaving are the same movement. Ending the build
       * early instead — at the accent, with a hit after it — is what made this need a hit.
       *
       * If the beat ever does read as unfinished, the fallback is `playRarePayoff(1)`: bell
       * only, no impact and no booms, the smallest thing on the ladder. Not the full chord.
       *
       * Silent under reduced motion, where album.css drops the lighting animation entirely
       * and the name is simply present: a build under a static cover is a build under
       * nothing.
       */
      if (!prefersReducedMotion()) playRebind(writeMs);

      const finished = ms(SETTLE_MS) + writeMs;
      after(finished + ms(REST_MS), () => {
        setPhase('resting');
        onDone();
      });
    });
  };

  const busy = phase !== 'choosing';

  return (
    <div
      className={`choice choice--${phase}`}
      /*
        The grid slides so that whichever book was picked ends up in the middle of the
        table. Done here rather than by re-ordering, because the books must not move at the
        moment of the click — only afterwards, and only the one that is left.
      */
      style={
        pickedIndex === null
          ? undefined
          : ({
              '--picked-cols': String(CENTRE_COL - (pickedIndex % COLUMNS)),
              '--picked-rows': String(CENTRE_ROW - Math.floor(pickedIndex / COLUMNS)),
            } as React.CSSProperties)
      }
    >
      {/*
        Keeps its box for the whole sequence: this is the album's nav-label row, and losing
        it would shift the book up by its height at the handover.

        That is a non-breaking space rather than an ordinary one, which would collapse. It
        no longer decides the height — `.choice__label` reserves a full line box now, so an
        empty row and a filled one come out the same on both sides of the handover, which
        the album needs regardless: its own copy of this row carries no text at all any more,
        so it is empty in every state. Kept because a row whose height depends on
        whether its content collapses is one that will go short again the next time either
        reserve is touched, and this is the cheap half of not learning that from a 2px jump.
        The same character, for the same reason, as the hint line the pack opener renders
        during the tear.
      */}
      <div className="choice__label">{busy ? ' ' : 'Kies je album'}</div>

      <div className="choice__well">
        <div className="choice__row">
          {COVERS.map((stain, index) => {
            const chosen = pickedIndex === index;
            const gone = pickedIndex !== null && !chosen;

            return (
              <div className="choice__slot" key={stain.id}>
                <button
                  type="button"
                  className={[
                    'choice__book',
                    chosen ? 'choice__book--chosen' : '',
                    gone ? 'choice__book--gone' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    ...albumLeather(stain.id),
                    /* Staggers the exit, so four books do not leave as one object. */
                    ['--leave-delay' as string]: `calc(${index} * ${CLEAR_STEP}ms * var(--anim, 1))`,
                  }}
                  onClick={() => choose(stain.id, index)}
                  disabled={busy}
                  aria-label={`Album in ${stain.label}`}
                >
                  {/* Blocked blind — a rule and no name. Putting the name on all ten
                      would spend the payoff before it happens. */}
                  <span className="choice__face">
                    <span className="choice__face-kicker">Verzamelalbum</span>
                    <span className="choice__face-rule" />
                  </span>
                </button>

                {/* Outside the book, so it is legible at any scale. The only reason the
                    caption is not printed on the cover. */}
                <span className="choice__caption">{stain.label}</span>
              </div>
            );
          })}
        </div>

        {/*
          The finished book, at exactly the size and place the album's own shut cover will
          appear — `--page-w` by `--page-h`, centred in the same well. Its own element
          rather than the shelf book growing into it, because the shelf book is a small
          flat approximation and the handover has to land on the real geometry or the book
          jumps at the swap.
        */}
        {picked ? (
          <div className="choice__stage" style={albumLeather(picked.id)}>
            <div className="album__cover">
              {/*
                The same ornament as the album's own cover, in the same place — this is the
                face the book is handed over with, so anything missing here would appear out
                of nowhere at the swap.
              */}
              <CoverOrnament />
              <div className="album__cover-kicker">Verzamelalbum van</div>
              {/*
                The name going onto the cover.

                **`writing` is keyed to the phase, so the pen only moves once.** Before the
                book is lifted there is no name to write; from `writing` onward the strokes
                carry their own delays and the CSS animation's `both` fill-mode holds the
                finished name in place through `resting` and across the handover. That last
                part is what makes the swap to the real album invisible: the album draws the
                same strokes from the same layout, already complete.
              */}
              <div className="album__cover-title">
                <WrittenName
                  name={stampName ?? ''}
                  writing={phase === 'writing' || phase === 'resting'}
                  /* Everything before the downbeat: the book is on the table but the
                     name has not gone on it yet. */
                  pending={phase !== 'writing' && phase !== 'resting'}
                  durationMs={writeMs}
                />
              </div>
              <div className="album__cover-rule" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AlbumChoice;
