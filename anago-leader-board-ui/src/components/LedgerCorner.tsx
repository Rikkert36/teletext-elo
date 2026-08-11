import React, { useEffect, useRef, useState } from 'react';
import { ms } from '../utils/animationSpeed';
import { playPageTurn } from '../utils/sounds';
import '../styles/ledger.css';

/** The strike being drawn through the name. */
const STRIKE_MS = 220;
/** Held after it lands, so the crossing-out is seen rather than inferred. */
const REST_MS = 200;

interface LedgerCornerProps {
  /** Whose line this is. Already display-shortened by the caller. */
  name: string;
  /** The name has been struck through; this browser should forget who it is. */
  onSignOut: () => void;
}

/**
 * The register, still lying on the table.
 *
 * The way back out of a collection, and deliberately not a button. You got in by writing
 * your name in a ledger, so you get out by crossing it out again — the same object, the
 * same gesture reversed. Nothing else on this table would have to be invented for it.
 *
 * It replaced the header's type-ahead, which was doing two jobs badly. It was the last
 * undisguised control on the table, and it made looking through a colleague's collection a
 * matter of typing a different name into a box that was already open — which the design
 * has always accepted as *possible* (there is no authentication and never will be) while
 * not wanting to actively invite. Signing out and signing back in as somebody else is the
 * same number of clicks and reads as a deliberate act rather than a casual one.
 *
 * It sits in the right margin of the table, opposite the packet shelf. Symmetric on
 * purpose: the two things lying beside the book are what you came for and how you leave.
 */
const LedgerCorner: React.FC<LedgerCornerProps> = ({ name, onSignOut }) => {
  const [striking, setStriking] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    },
    [],
  );

  const signOut = () => {
    if (striking) return;
    setStriking(true);

    /*
     * The page-turn sound rather than a new one: closing the register is paper moving, and
     * it is the same weight of event as turning a leaf. Adding an eleventh synthesised
     * sound for it would be inventing a noise nobody asked about.
     */
    playPageTurn();

    timers.current.push(window.setTimeout(onSignOut, ms(STRIKE_MS + REST_MS)));
  };

  return (
    <button
      type="button"
      className={`ledger-corner ledger-paper${striking ? ' ledger-corner--striking' : ''}`}
      onClick={signOut}
      disabled={striking}
      title="Streep je naam door en schrijf iemand anders in"
    >
      <span className="ledger-corner__label">Ingeschreven</span>

      <span className="ledger-corner__line">
        <span className="ledger__nib" aria-hidden="true" />
        <span className="ledger-corner__name">{name}</span>
      </span>

      {/*
        Named rather than left to the object alone. The turn strips get away with no caption
        because a page edge under a cursor can only mean one thing; a ledger with your name
        on it could as easily mean "look at this" as "leave", and guessing wrong here costs
        you the page you were on.
      */}
      <span className="ledger-corner__action">uitschrijven</span>
    </button>
  );
};

export default LedgerCorner;
