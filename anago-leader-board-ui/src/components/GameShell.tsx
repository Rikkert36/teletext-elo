import React, { ReactNode, useState } from 'react';
import { isMuted, setMuted } from '../utils/sounds';
import '../styles/game.css';
import '../styles/tabletop.css';

interface GameShellProps {
  /**
   * Optional: the collection page prints whose album it is on the book's own
   * cover instead, so repeating it in the header was saying it twice.
   */
  title?: string;
  /** Small italic line beside the title. */
  subtitle?: ReactNode;
  /** Controls that sit at the top right, next to the sound toggle. */
  controls?: ReactNode;
  children: ReactNode;
  /** Readouts along the bottom, below the brass rule. */
  footer?: ReactNode;
}

/**
 * Full-bleed 2002 game screen: felt table under a spotlight, brass rules
 * separating a header and footer from the play area.
 *
 * Replaces the earlier Windows-window frame, which took the brief too
 * literally — the era's *games* are the reference, not its dialogs. Chrome is
 * kept dark and recessive so the album's 3D flip carries the screen.
 */
const GameShell: React.FC<GameShellProps> = ({
  title,
  subtitle,
  controls,
  children,
  footer,
}) => {
  const [muted, setMutedState] = useState(isMuted);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  return (
    <div className="game-stage">
      <div className="game-header">
        {title ? <h1 className="game-title">{title}</h1> : null}
        {subtitle ? <span className="game-subtitle">{subtitle}</span> : null}
        <span className="game-spacer" />
        {controls}
        <button
          type="button"
          className="game-button game-button--small"
          onClick={toggleMute}
          title={muted ? 'Geluid aan' : 'Geluid uit'}
          aria-label={muted ? 'Geluid aan' : 'Geluid uit'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      <div className="game-rule" />

      {children}

      {footer ? (
        <>
          <div className="game-rule" />
          <div className="game-footer">{footer}</div>
        </>
      ) : null}
    </div>
  );
};

export default GameShell;
