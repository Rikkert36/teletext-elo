import React from 'react';
import '../styles/hourglass.css';

interface HourglassProps {
  /**
   * The line engraved under it, in Dutch. Say what is being waited *for* — the object
   * already says that something is.
   *
   * Optional, and the caption is left out entirely rather than defaulted: an hourglass
   * with a stock line under it ("laden…") says less than one with nothing under it.
   */
  caption?: string;
}

/**
 * A small brass hourglass standing on the table, sand running, turning itself over when
 * it empties. The page's waiting state.
 *
 * The design reasoning — why an object rather than a spinner, why it turns rather than
 * resets, and why it is invisible for the first 420ms — is at the top of
 * [hourglass.css](../styles/hourglass.css). Two things about it belong here, because
 * they are properties of how it is *used* rather than of how it is drawn:
 *
 * **Render it in the same slot as whatever it is waiting for.** The delay before it
 * appears is a CSS `animation-delay`, so it restarts whenever the element is mounted —
 * which means two waits in a row, each in a different branch of the same ternary, cost
 * one delay rather than two *only if* React can reconcile them into the same DOM node.
 * On the collection page they are the same element type in the same child position, so
 * a returning visitor's two round trips (the player list, then the collection) read as
 * one continuous wait with the sand never restarting. Moving either branch to a
 * different position in the tree quietly breaks that.
 *
 * **It is a live region.** `role="status"` with `aria-live="polite"` announces the
 * caption when it appears and again if it changes, which is the only part of this a
 * screen reader gets — the glass is `aria-hidden`, because a described hourglass is a
 * description of a decoration.
 */
const Hourglass: React.FC<HourglassProps> = ({ caption }) => (
  <div className="hourglass" role="status" aria-live="polite">
    <div className="hourglass__stand" aria-hidden="true">
      <span className="hourglass__shadow" />
      <div className="hourglass__glass">
        {/* The frame first, so the glass and the sand paint over its inner edge. */}
        <span className="hourglass__post hourglass__post--left" />
        <span className="hourglass__post hourglass__post--right" />

        <span className="hourglass__bulb hourglass__bulb--top">
          <span className="hourglass__sand hourglass__sand--top" />
        </span>
        <span className="hourglass__bulb hourglass__bulb--bottom">
          <span className="hourglass__sand hourglass__sand--bottom" />
        </span>

        {/*
          Two streams, one per side of the waist, each lit while its side is the lower
          one. Outside the bulbs rather than inside either, since a stream belongs to
          the throat and not to a bulb — and the funnel clip would cut it in half.
        */}
        <span className="hourglass__pour hourglass__pour--down" />
        <span className="hourglass__pour hourglass__pour--up" />

        {/* The caps last: nothing may paint over brass. */}
        <span className="hourglass__cap hourglass__cap--top" />
        <span className="hourglass__cap hourglass__cap--bottom" />
      </div>
    </div>

    {caption ? <span className="hourglass__caption">{caption}</span> : null}
  </div>
);

export default Hourglass;
