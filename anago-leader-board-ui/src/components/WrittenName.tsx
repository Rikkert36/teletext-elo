import React, { useMemo } from 'react';
import { writeName } from '../utils/hersheyScript';
import WrittenType from './WrittenType';

/**
 * A name written on a cover, in ink, by a pen that can be watched moving.
 *
 * Used in two places that have to agree exactly, because the opening ceremony hands the
 * book over to the album with a hard swap: `AlbumChoice` writes the name during the
 * binding, and `Album` prints the same name on the same cover forever after. One
 * component, so there is no second copy of the geometry to drift — the same rule the
 * cover's leather already follows by living in `albumLeather.ts`.
 *
 * **The letters are Florilane Cardillac; the Hershey stroke font is still here, but only
 * as the thing that decides what you see when.** An outline glyph cannot be drawn on, so
 * the reveal is a mask following the route a pen takes through each letter — see
 * `WrittenType`. This component used to render *both* a Hershey drawing and the type, with
 * CSS choosing between them for a test-panel switch; the switch is gone and so is the
 * duplicate.
 *
 * **Ink is `currentColor`.** The cover sets its own: gold (`--ink`) on leather, deep bronze
 * (`--board-ink`) once the book is re-bound in the icon binding, because paper boards take
 * ink rather than gilt. Inheriting the colour means the existing `.album--icons
 * .album__cover` rule re-inks the name for free.
 */

/** Rough seconds-per-unit of pen travel — see `durationFor`. */
const PEN_SPEED = 0.0042;

/**
 * How long a name takes to write, from how far the pen has to travel.
 *
 * Length rather than letter count, so the pen holds one speed across the whole name and a
 * wide letter genuinely takes longer than a narrow one. Letter-count timing was what the
 * foil stamp used, and it was right for a press indexing along a line; a hand does not
 * move that way.
 *
 * Measured off the **Hershey** layout even though Florilane is what gets drawn, and that is
 * deliberate: it is a measure of how far a pen travels through the name, which is a
 * property of the name rather than of the typeface it is set in. It also keeps the number
 * available synchronously to `AlbumChoice`, which has to schedule the rest of the ceremony
 * against it before anything has been rendered or measured.
 *
 * Clamped at both ends. A one-letter name still has to read as a gesture rather than a
 * flicker, and a long double-barrelled name must not hold the ceremony open past the point
 * where the reader has stopped watching the pen and started waiting for it.
 */
export const durationFor = (totalLength: number): number =>
  Math.round(Math.min(2600, Math.max(700, totalLength * PEN_SPEED * 1000)));

interface WrittenNameProps {
  name: string;
  /**
   * Draw it on, rather than showing it already written.
   *
   * False everywhere except the binding ceremony. The album itself must never animate
   * this: a reload is not a re-binding, and a cover that rewrites its own name every time
   * the page mounts is a book performing rather than a book.
   */
  writing?: boolean;
  /** Measured but not yet on the cover — see WrittenType. */
  pending?: boolean;
  /** Total time the writing takes. Ignored unless `writing`. */
  durationMs?: number;
  className?: string;
}

const WrittenName: React.FC<WrittenNameProps> = ({
  name,
  writing = false,
  pending,
  durationMs,
  className,
}) => {
  /* Only for the default duration — the drawing itself is `WrittenType`'s. Memoised
     because it walks the glyph table, and the name rarely changes. */
  const written = useMemo(() => writeName(name), [name]);

  if (name.trim().length === 0) {
    return <span className={className} />;
  }

  const total = durationMs ?? durationFor(written?.totalLength ?? 0);

  return <WrittenType name={name} writing={writing} pending={pending} durationMs={total} />;
};

export default WrittenName;
