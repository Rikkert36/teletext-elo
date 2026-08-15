import React, { useMemo, useRef, useState } from 'react';
import { SelectablePlayer, splitName } from '../mock/cardMock';
import '../styles/ledger.css';

interface SigningLedgerProps {
  /** Every active player, gate or no gate. */
  players: SelectablePlayer[];
  onChoose: (player: SelectablePlayer) => void;
}

/**
 * The way in: a ruled leaf of the register lying on the table, and you write your name on it.
 *
 * The page it replaces had a bare type-ahead in the header, which was the one piece of
 * undisguised UI on a screen whose whole premise is objects lying on a mahogany table.
 * A register is the same control as a physical thing — and it is *the right* physical
 * thing, because a sheet you sign to say you were here is exactly what this is doing.
 * It also sits beside the album without arguing with it.
 *
 * **One page, not a spread.** This was two pages with a stitched gutter between them —
 * what the book is for on the left, the line you sign on the right — and the fold read as
 * a fold: one column of things to do, split across a valley, with half the sheet's width
 * behind the crease. Losing it is also what makes this and `LedgerCorner` visibly the same
 * object at two sizes, which is the whole reason they share `.ledger-paper`: you sign one
 * leaf to get in, and the leaf you signed stays lying in the margin until you cross it out.
 * The paper's material — the grain, the cut edges, the offset shadow — is what carries
 * "this is paper" now that the gutter is not there to do it. See the header of ledger.css.
 *
 * **It is still a type-ahead, and that is load-bearing.** There is no authentication in
 * this app and never will be, so nothing stops you opening a colleague's collection. The
 * harm is bounded — cards land with the rightful owner either way, so only the surprise
 * of a reveal can be spoiled — and the entire mitigation is that you have to *type* a
 * name rather than pick it off a sanctioned list. Turning this into a roster of clickable
 * names would throw that away for nothing.
 *
 * **Every name on it can be signed, and none of them carries a game count.** Under-gate
 * players used to be listed struck through with "nog 2 wedstrijden" beside them, and both
 * halves of that were wrong here. The gate belongs on the far side of the signature, where
 * it is a padlocked album with your own number on it (`LockedAlbum`) — not on the page
 * whose only job is asking who you are, where it greys out exactly the newest colleagues
 * and offers them nothing to click. And a games column turns a register into a
 * leaderboard: this page is not where you find out how much anybody has played.
 *
 * Listing them at all is still deliberate, and it is the reason the type-ahead is backed
 * by `GET api/players?activeOnly=true` rather than by the card pool, which excludes them
 * by definition. A name that simply is not there cannot explain itself.
 */
const SigningLedger: React.FC<SigningLedgerProps> = ({ players, onChoose }) => {
  const [query, setQuery] = useState('');
  const blurTimer = useRef<number | null>(null);
  const [focused, setFocused] = useState(false);

  /*
   * Same matching as the header picker had: substring, case-insensitive, over the whole
   * stored name so a nickname finds its owner. Eight lines, because that is what fits on
   * the page without the ledger growing taller than the table.
   */
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return players.filter((p) => p.name.toLowerCase().includes(needle)).slice(0, 8);
  }, [players, query]);

  /* No gate check. Signing in always works — see the note above the component. */
  const choose = (player: SelectablePlayer) => {
    onChoose(player);
    setQuery('');
  };

  const searching = query.trim().length > 0;

  return (
    <div className="ledger-stage">
      <div className="ledger ledger-paper">
        <div className="ledger__heading">Aanmeldformulier</div>
        <p className="ledger__blurb">Schrijf je naam en we halen je album erbij.</p>
        {/*
          It no longer says *where* to write it, because there is no longer anywhere else:
          on one page the NAAM below is the only rule on the sheet and it points at itself.
          The old copy said "op de regel hiernaast", which was pointing across the fold.

          No fine print about the games gate either. It was answering a question nobody has
          asked yet — the gate only concerns you once you have signed, and that is now a
          screen of its own that says it with your own numbers on it. The rule above it went
          with it: a divider with nothing under it is furniture.
        */}

        <label className="ledger__label" htmlFor="ledger-name">
          Naam
        </label>

        {/*
          The line is drawn by the wrapper, not by the input's border: the rule has to
          keep its own box so the active state can recolour it without moving the field.
        */}
        <div className={`ledger__line${focused ? ' ledger__line--active' : ''}`}>
          <input
            id="ledger-name"
            className="ledger__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              // Let a click on a name land before the list goes.
              blurTimer.current = window.setTimeout(() => setFocused(false), 150);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matches.length > 0) choose(matches[0]);
              if (e.key === 'Escape') setQuery('');
            }}
            autoComplete="off"
            spellCheck={false}
            aria-label="Schrijf je naam"
          />
        </div>

        {/*
          The written lines below the rule. No dropdown, no panel, no shadow — they are
          further entries on the same page, which is why they can be a plain list here
          where the header picker needed a floating menu.
        */}
        <ul className="ledger__names">
          {matches.map((player) => (
            <li key={player.id}>
              <button
                type="button"
                className="ledger__name"
                onMouseDown={() => {
                  if (blurTimer.current) window.clearTimeout(blurTimer.current);
                }}
                onClick={() => choose(player)}
              >
                <span className="ledger__name-text">{splitName(player.name).display}</span>
              </button>
            </li>
          ))}

          {searching && matches.length === 0 ? (
            <li className="ledger__empty">
              Niet gevonden. Wie nog nooit gespeeld heeft staat er niet in — speel eerst een
              wedstrijd.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
};

export default SigningLedger;
