import React, { useMemo, useRef, useState } from 'react';
import { SelectablePlayer, splitName } from '../mock/cardMock';
import '../styles/ledger.css';

interface SigningLedgerProps {
  /** Every active player, gate or no gate. */
  players: SelectablePlayer[];
  onChoose: (player: SelectablePlayer) => void;
}

/**
 * The way in: a ruled ledger lying open on the table, and you write your name on it.
 *
 * The page it replaces had a bare type-ahead in the header, which was the one piece of
 * undisguised UI on a screen whose whole premise is objects lying on a mahogany table.
 * A ledger is the same control as a physical thing — and it is *the right* physical
 * thing, because a book you sign to say you were here is exactly what this is doing.
 * It also sits beside the album without arguing with it: two books on one table.
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
        {/* The stitched gutter down the middle, so it reads as a bound book seen open. */}
        <div className="ledger__gutter" />

        <div className="ledger__page ledger__page--left">
          <div className="ledger__heading">Verzamelalbums</div>
          <p className="ledger__blurb">
            Schrijf je naam op de regel hiernaast. Dan halen we je album erbij.
          </p>
          {/*
            No fine print about the games gate. It was answering a question nobody has
            asked yet — the gate only concerns you once you have signed, and that is now
            a screen of its own that says it with your own numbers on it. The rule above
            it went with it: a divider with nothing under it is furniture.
          */}
        </div>

        <div className="ledger__page ledger__page--right">
          <label className="ledger__label" htmlFor="ledger-name">
            Naam
          </label>

          {/*
            The line is drawn by the wrapper, not by the input's border: the pen has to
            sit on the rule at the left of it, and a border would run underneath the nib.
          */}
          <div className={`ledger__line${focused ? ' ledger__line--active' : ''}`}>
            <span className="ledger__nib" aria-hidden="true" />
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
                Niet gevonden. Wie nog nooit gespeeld heeft staat er niet in — speel eerst
                een wedstrijd.
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SigningLedger;
