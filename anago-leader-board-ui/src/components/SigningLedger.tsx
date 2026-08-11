import React, { useMemo, useRef, useState } from 'react';
import { SelectablePlayer, splitName } from '../mock/cardMock';
import '../styles/ledger.css';

interface SigningLedgerProps {
  /** Every active player, gate or no gate. */
  players: SelectablePlayer[];
  /** How many games a player needs before they can own a collection. */
  minGames: number;
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
 * Under-gate players are listed but struck through, with how far off they are. Leaving
 * them out was the first version and it is worse: a name that simply is not there cannot
 * explain itself, so the four newest colleagues would have concluded the page was broken.
 */
const SigningLedger: React.FC<SigningLedgerProps> = ({ players, minGames, onChoose }) => {
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

  const choose = (player: SelectablePlayer) => {
    if (player.numberOfGames < minGames) return;
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
          <div className="ledger__rule" />
          <p className="ledger__blurb ledger__blurb--fine">
            Vanaf {minGames} gespeelde wedstrijden kun je kaarten verzamelen — en sta je
            zelf op een kaart.
          </p>
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
            {matches.map((player) => {
              const short = player.numberOfGames < minGames;
              const togo = minGames - player.numberOfGames;

              return (
                <li key={player.id}>
                  <button
                    type="button"
                    className={`ledger__name${short ? ' ledger__name--short' : ''}`}
                    onMouseDown={() => {
                      if (blurTimer.current) window.clearTimeout(blurTimer.current);
                    }}
                    onClick={() => choose(player)}
                    disabled={short}
                  >
                    <span className="ledger__name-text">{splitName(player.name).display}</span>
                    <span className="ledger__name-note">
                      {short
                        ? `nog ${togo} ${togo === 1 ? 'wedstrijd' : 'wedstrijden'}`
                        : `${player.numberOfGames} wedstrijden`}
                    </span>
                  </button>
                </li>
              );
            })}

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
