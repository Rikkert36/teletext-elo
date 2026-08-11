import React, { ReactNode } from 'react';
import '../styles/game.css';

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
  /** Readouts along the bottom of the table. */
  footer?: ReactNode;
}

/**
 * The table the album lies on, with the controls as objects on it — see the note
 * at the top of game.css.
 *
 * There are no dividers between the header, the play area and the footer: a rule
 * is screen furniture, and the space between two things on a table is what
 * separates them. Chrome is kept dark and recessive so the album's 3D flip
 * carries the screen.
 *
 * **The header is rendered only if there is something to put in it**, and on the
 * collection page there no longer is: the player picker became the ledger, and the mute
 * button is gone (see below). An empty header still contributed its bottom margin, which
 * pushed the whole table down by ~22px for nothing.
 *
 * **There is no mute button.** Sound is on, and anyone who does not want it has a volume
 * control on their computer and a mute button on their tab. A speaker icon in the corner
 * of a mahogany table was the last piece of OS chrome on this page, and it was there to
 * solve a problem the browser already solves. `setMuted` survives for the console — see
 * `cardDebug` — so a silent development session is still one call away.
 */
const GameShell: React.FC<GameShellProps> = ({
  title,
  subtitle,
  controls,
  children,
  footer,
}) => {
  const header = title || subtitle || controls;

  return (
    <div className="game-stage">
      {header ? (
        <div className="game-header">
          {title ? <h1 className="game-title">{title}</h1> : null}
          {subtitle ? <span className="game-subtitle">{subtitle}</span> : null}
          <span className="game-spacer" />
          {controls}
        </div>
      ) : null}

      {children}

      {footer ? <div className="game-footer">{footer}</div> : null}
    </div>
  );
};

export default GameShell;
