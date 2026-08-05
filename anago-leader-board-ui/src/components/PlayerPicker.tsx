import React, { useMemo, useRef, useState } from 'react';
import { CardPlayer, splitName } from '../mock/cardMock';

interface PlayerPickerProps {
  players: CardPlayer[];
  value: CardPlayer | null;
  onChange: (player: CardPlayer) => void;
}

/**
 * Type-ahead rather than a dropdown, deliberately.
 *
 * There is no authentication anywhere in this app, so nothing stops you opening
 * a colleague's collection. The harm is bounded — cards land with the owner
 * either way, so only the surprise is spoiled — but picking a name off a
 * sanctioned list feels materially different from typing it out. This is the
 * whole mitigation, and it costs nothing for legitimate use.
 */
const PlayerPicker: React.FC<PlayerPickerProps> = ({ players, value, onChange }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<number | null>(null);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return players
      .filter((p) => p.name.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [players, query]);

  const choose = (player: CardPlayer) => {
    onChange(player);
    setQuery('');
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative', minWidth: 240 }}>
      <input
        className="game-input"
        placeholder={value ? splitName(value.name).display : 'typ je naam…'}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Let a click on a suggestion land before the list unmounts.
          blurTimer.current = window.setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && matches.length > 0) choose(matches[0]);
          if (e.key === 'Escape') setOpen(false);
        }}
        aria-label="Speler zoeken"
      />

      {open && matches.length > 0 ? (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            background: '#1f180e',
            border: '1px solid #6b5325',
            borderRadius: 3,
            zIndex: 40,
            maxHeight: 210,
            overflowY: 'auto',
            boxShadow: '0 6px 18px rgba(0,0,0,0.7)',
          }}
        >
          {matches.map((player) => (
            <li key={player.id}>
              <button
                type="button"
                onMouseDown={() => {
                  if (blurTimer.current) window.clearTimeout(blurTimer.current);
                }}
                onClick={() => choose(player)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 8px',
                  border: 'none',
                  background: 'transparent',
                  color: '#f0e6cd',
                  font: 'inherit',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#a9853c';
                  e.currentTarget.style.color = '#241a05';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#f0e6cd';
                }}
              >
                {splitName(player.name).display}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export default PlayerPicker;
