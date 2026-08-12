import React, { useEffect, useRef, useState } from 'react';
import { COVERS, CoverId, albumLeather } from '../utils/albumLeather';
import { ms } from '../utils/animationSpeed';
import { playCoverTurn, playFoilStamp } from '../utils/sounds';
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

/** The four unchosen books leaving, each one `CLEAR_STEP` behind the last. */
const CLEAR_MS = 240;
const CLEAR_STEP = 55;
/** The survivor sliding to the middle of the table. */
const CENTRE_MS = 300;
/** The book coming up to full size in front of you, as the row fades out under it. */
const LIFT_MS = 380;
/** Held still before the first letter. A press has a pause before it. */
const SETTLE_MS = 200;
/** Per letter. */
const STAMP_STEP_MS = 45;
/** After the last letter, before handing the book to the album. */
const REST_MS = 460;

/** Which slot the row centres on. Five books, so the middle one is index 2. */
const CENTRE_INDEX = 2;

/**
 * The name, cut into words, each letter keeping the position it has in the whole name —
 * that position is what the stamping run counts, so it has to survive the split.
 *
 * Split rather than laid out as a flat run of letters because every letter is its own
 * inline-block, and a line break is allowed between any two of them: "Anneloes Ernest"
 * wrapped as "ANNELOES ERNES / T" while the name was going on and only snapped to the
 * right break once the album took the cover over and set it as plain text.
 */
const splitIntoWords = (name: string): { char: string; index: number }[][] => {
  const words: { char: string; index: number }[][] = [];
  let word: { char: string; index: number }[] = [];

  Array.from(name).forEach((char, index) => {
    if (char.trim().length === 0) {
      if (word.length > 0) words.push(word);
      word = [];
      return;
    }
    word.push({ char, index });
  });

  if (word.length > 0) words.push(word);
  return words;
};

type Phase = 'choosing' | 'clearing' | 'centring' | 'lifting' | 'stamping' | 'resting';

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
 * Getting your album: five of them lying on the table, and you pick one up.
 *
 * This exists because an album that is simply *there* has never been acquired. The page
 * used to go straight from typing a name to a fully-formed book, which made the start of
 * a collection the one thing on this screen with no moment attached to it — and a
 * collection is entirely built out of moments.
 *
 * Five books rather than a swatch row, and **no preview**: choosing is picking an object
 * up off a table, and a control that restains a book in place is a settings widget with
 * leather printed on it. The cost is that you commit before seeing your name on it, which
 * is the same deal a real shop gives you.
 *
 * The blank covers carry no name and their captions are set *outside* the scaled book, so
 * nothing on the shelf depends on being readable at 33% — which is what makes a single
 * row of five work on a phone as well as on a desk.
 */
const AlbumChoice: React.FC<AlbumChoiceProps> = ({ stampName, onChoose, onDone }) => {
  const [phase, setPhase] = useState<Phase>('choosing');
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  /** How many characters of the name have taken the block. */
  const [stamped, setStamped] = useState(0);

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

  // The flat run still drives the timing — one beat per character, spaces included.
  const letters = stampName ? Array.from(stampName) : [];
  const words = stampName ? splitIntoWords(stampName) : [];
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
      setPhase('stamping');

      if (letters.length === 0) {
        after(ms(REST_MS), onDone);
        return;
      }

      /*
       * One timer per letter rather than one interval: the run has to end on a known
       * beat, and an interval that drifts a frame per letter is most of a beat out by the
       * end of "Daan van der Beek".
       *
       * A space takes no block and makes no sound — it is the gap between two words, and
       * ticking on it is what made the first pass sound like a machine running.
       */
      letters.forEach((letter, index) => {
        after(ms(SETTLE_MS + STAMP_STEP_MS * index), () => {
          setStamped(index + 1);
          if (letter.trim().length > 0) playFoilStamp();
        });
      });

      const written = ms(SETTLE_MS + STAMP_STEP_MS * letters.length);
      // The book settling onto the table: the one heavy sound here, and it lands *after*
      // the name rather than under it so the letters stay small and dry.
      after(written + ms(120), playCoverTurn);
      after(written + ms(REST_MS), () => {
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
        The row slides so that whichever book was picked ends up where the middle one was.
        Done here rather than by re-ordering, because the books must not move at the moment
        of the click — only afterwards, and only the one that is left.
      */
      style={
        pickedIndex === null
          ? undefined
          : ({ '--picked-offset': String(CENTRE_INDEX - pickedIndex) } as React.CSSProperties)
      }
    >
      {/* Keeps its box for the whole sequence: this is the album's nav-label row, and
          losing it would shift the book up by its height at the handover. */}
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
                  {/* Blocked blind — a rule and no name. Putting the name on all five
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
              <div className="album__cover-kicker">Verzamelalbum van</div>
              <div className="album__cover-title">
                {words.map((word, wordIndex) => (
                  <React.Fragment key={wordIndex}>
                    {/* An ordinary space, and the only place the line is allowed to
                        break — the word itself is one unbreakable box. */}
                    {wordIndex > 0 ? ' ' : null}
                    <span className="choice__word">
                      {word.map(({ char, index }) => (
                        <span
                          // Position is the identity: the same letter turns up twice in
                          // plenty of names, so it cannot be the key.
                          key={index}
                          className={`choice__letter${
                            index < stamped ? ' choice__letter--set' : ''
                          }`}
                        >
                          {char}
                        </span>
                      ))}
                    </span>
                  </React.Fragment>
                ))}
              </div>
              <div className="album__cover-rule" />
              <div className="album__cover-sub">nog geen kaarten</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AlbumChoice;
