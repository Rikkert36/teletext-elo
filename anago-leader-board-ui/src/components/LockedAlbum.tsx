import React from 'react';
import LedgerCorner from './LedgerCorner';
import { albumLeather } from '../utils/albumLeather';
import '../styles/locked.css';

interface LockedAlbumProps {
  /** Whose album this is. Already display-shortened by the caller. */
  name: string;
  /** Games this player has on the board. */
  games: number;
  /** How many they need before the album opens. The server's number, not the constant. */
  minGames: number;
  /** Cross the name out again and go back to the ledger. */
  onSignOut: () => void;
}

/**
 * The album you cannot open yet: shut, strapped, and with a brass padlock on the clasp.
 *
 * This is where an under-gate player lands **after** signing in, and that is the whole
 * point of it. The ledger used to refuse them at the line — struck-through names with
 * "nog 2 wedstrijden" beside them — which put the gate on the page whose only job is
 * asking who you are, and turned four of the newest colleagues into greyed-out rows on
 * a list everybody else can click. Signing in now always works. The gate is a *place*
 * you arrive at, with one number on it.
 *
 * A shut book rather than a notice, because the gate is not an error: there is an album
 * waiting, and the only thing missing is games. A padlocked object says that in one
 * look, where a centred paragraph of Dutch says "something went wrong".
 *
 * **The leather is tabak and it is not a choice yet.** No cover has been picked — that
 * ceremony is on the other side of the gate — so this uses the incumbent stain and blocks
 * the cover *blind*, exactly as the ten books on the choosing table do: a kicker and a
 * rule, no name. Printing the name on it would hand over the one beat `AlbumChoice`
 * exists to deliver.
 *
 * The id below is `tobacco`, which is the brown this stain has always been — it held the
 * id `oxblood` until that name was given to an actual oxblood. See the note in
 * `albumLeather.ts`, and keep it equal to `AlbumCovers.Default`: this book is what a
 * player sees before they have chosen anything, so it has to be the stain the server
 * would hand them.
 *
 * The register comes along, because this screen would otherwise be a dead end: the pick
 * is remembered in this browser, so without a way out a mistyped name locks the page to
 * somebody else's gate until localStorage is cleared by hand.
 */
const LockedAlbum: React.FC<LockedAlbumProps> = ({ name, games, minGames, onSignOut }) => {
  /*
   * Clamped, because the two numbers come from different places. `games` and the gate the
   * page branched on are the client's (`MIN_GAMES`), and `minGames` is the server's — the
   * copy quotes the server so the number cannot drift from the rule that is actually
   * enforced, which means a disagreement between the two lands here as a negative.
   */
  const togo = Math.max(0, minGames - games);

  return (
    <div className="locked">
      {/* The album's nav-label row, in the same place, so arriving here does not move
          the book relative to where an open one sits. */}
      <div className="locked__book" style={albumLeather('tobacco')}>
        <div className="locked__face">
          <span className="locked__kicker">Verzamelalbum</span>
          <span className="locked__rule" />
        </div>

        {/*
          The clasp: a brass strap over the fore-edge with the lock on it. Down the
          opening edge and not across the middle, which is where a diary's clasp
          actually is — a band across the face reads as a ribbon on a present.
        */}
        <div className="locked__strap" aria-hidden="true">
          <svg className="locked__lock" viewBox="0 0 24 24" role="presentation">
            {/* The shackle, drawn rather than filled, so it reads as bent metal. */}
            <path
              d="M7.5 10.5V7.6a4.5 4.5 0 0 1 9 0v2.9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
            />
            <rect x="4.4" y="10.2" width="15.2" height="11.3" rx="1.9" fill="currentColor" />
            {/* The keyhole, punched out of the body in the leather behind it. */}
            <circle cx="12" cy="15.2" r="1.5" fill="var(--leather-mid, #35270f)" />
            <rect
              x="11.25"
              y="15.6"
              width="1.5"
              height="3.4"
              rx="0.7"
              fill="var(--leather-mid, #35270f)"
            />
          </svg>
        </div>
      </div>

      {/*
        The number, and it is the biggest thing here after the book. What somebody wants
        off this screen is "how many more" — the total, the gate and the rule behind it are
        all context for that one figure, so they are set underneath it rather than around it.
      */}
      <div className="locked__note">
        {togo > 0 ? (
          <p className="locked__togo">
            Speel nog <strong>{togo}</strong> {togo === 1 ? 'wedstrijd' : 'wedstrijden'}
          </p>
        ) : null}

        {/* The pips are the same fact as the number, countable: one mark per game the gate
            asks for, filled in for the ones already played. A meter would be a UI; a row of
            stamps is something a clubhouse would actually keep. */}
        <div
          className="locked__pips"
          role="img"
          aria-label={`${games} van ${minGames} wedstrijden gespeeld`}
        >
          {Array.from({ length: minGames }, (_, i) => (
            <span
              key={i}
              className={`locked__pip${i < games ? ' locked__pip--played' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* Centred under the book rather than out in the right margin: there is no shelf
          opposite it here, and a lone sheet in one margin looks mislaid. */}
      <div className="locked__register">
        <LedgerCorner name={name} onSignOut={onSignOut} />
      </div>
    </div>
  );
};

export default LockedAlbum;
