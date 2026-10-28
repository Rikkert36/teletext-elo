import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CollectorStanding, CollectorStandings } from '../clients/cardsClient';
import { avatarUrl, CardPlayer, firstNameOf, splitName } from '../mock/cardMock';
import { ms, prefersReducedMotion } from '../utils/animationSpeed';
import { playPageTurn, playSlot } from '../utils/sounds';
import '../styles/newspaper.css';

const LIFT_MS = 280;
const UNFOLD_MS = 240;
const TURN_MS = 310;
const MAX_MISSING = 6;
const SWIPE_PX = 60;
/** Width over height of the paper folded in half — and of the top half of the sheet it unfolds from. */
const FOLD_RATIO = 1.5;
const SHEET_MAX_W = 1040;
/** The overlay's side padding, twice: the sheet is as wide as this leaves. */
const OVERLAY_GUTTERS = 32;
const TABLE_TILT = 'rotate(-3deg)';

type Phase = 'folded' | 'fetching' | 'lifting' | 'open' | 'returning';

/** One edition: everything the three pages print, fetched together. */
export interface Edition {
  standings: CollectorStandings;
  /** `api/packs?compact=true`, newest first. */
  packs: string[];
}

interface NewspaperProps {
  /** Fetched by the page with every collection state, so the paper is printed before it is picked up. */
  edition: Edition | null;
  failed: boolean;
  /** Told when the paper is picked up and put back, so the book's own arrow keys can stand down. */
  onLiftedChange?: (lifted: boolean) => void;
}

const PAGES = ['Verzamelalbum', 'Pakmatrix', 'Pakjes'] as const;

/** A leaf on its way: forward swings the current page away over its left edge, back swings the previous one in. */
interface Turn {
  from: number;
  to: number;
  forward: boolean;
}

/** The fold: the top half's height, and how much of the lower half swings down below it. */
interface Fold {
  band: number;
  flap: number;
}

const sheetWidth = (): number => Math.min(SHEET_MAX_W, window.innerWidth - OVERLAY_GUTTERS);

/**
 * The collectors' standings, as a newspaper folded in half on the table — a miniature of the real
 * page. Picked up, the top half is lifted to the middle of the table and the lower half swings down;
 * it is leafed through, and folded and put back with Esc or a click beside it.
 */
const Newspaper: React.FC<NewspaperProps> = ({ edition, failed, onLiftedChange }) => {
  const [phase, setPhase] = useState<Phase>('folded');
  const [page, setPage] = useState(0);
  const [turning, setTurning] = useState<Turn | null>(null);
  const [fold, setFold] = useState<Fold | null>(null);
  const [printWidth, setPrintWidth] = useState(sheetWidth);
  const [spotWidth, setSpotWidth] = useState(0);

  const spotRef = useRef<HTMLDivElement>(null);
  const foldedRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const turnTimer = useRef<number | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useEffect(
    () => () => {
      timers.current.forEach(window.clearTimeout);
      if (turnTimer.current !== null) window.clearTimeout(turnTimer.current);
    },
    [],
  );

  /* The miniature is the real page at the width it will be lifted to, scaled down to the spot on the table. */
  useEffect(() => {
    const spot = spotRef.current;
    if (!spot) return;
    const measure = () => {
      setSpotWidth(spot.clientWidth);
      setPrintWidth(sheetWidth());
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(spot);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const lifted = phase !== 'folded' && phase !== 'fetching';
  useEffect(() => onLiftedChange?.(lifted), [lifted, onLiftedChange]);

  const pickUp = () => {
    if (phase !== 'folded') return;
    setTurning(null);
    setPhase('fetching');
  };

  /* The paper stays on the table until something is printed on it — only on a first load is there a wait. */
  useEffect(() => {
    if (phase !== 'fetching' || (!edition && !failed)) return;
    setPhase('lifting');
    playPageTurn();
  }, [phase, edition, failed]);

  /* The folded paper is drawn up to the middle of the table, showing only its top half. */
  useLayoutEffect(() => {
    if (phase !== 'lifting') return;
    const sheet = sheetRef.current;
    const spot = spotRef.current;
    if (!sheet || !spot) return;

    if (prefersReducedMotion()) {
      setPhase('open');
      return;
    }

    const band = sheet.offsetWidth / FOLD_RATIO;
    const height = sheet.offsetHeight;
    const folds = height > band * 1.05;
    if (folds) {
      clipTo(sheet, band);
      setFold({ band, flap: Math.min(band, height - band) });
    }

    const start = (() => {
      sheet.style.transition = 'none';
      sheet.style.transform = '';
      sheet.style.transformOrigin = `50% ${band / 2}px`;
      return tableTransform(spot, sheet, band);
    })();
    sheet.style.transform = start;
    sheet.focus({ preventScroll: true });

    /*
     * Painted where it lies first, and only set moving a frame later — building the sheet in the frame
     * it starts flying made the lift stutter. Both motions are started here directly, together, with no
     * render in between.
     */
    const go = () => {
      sheet.style.transform = '';
      sheet.animate([{ transform: start }, { transform: 'none' }], {
        duration: ms(LIFT_MS),
        easing: 'cubic-bezier(.2,.7,.2,1)',
      });

      const flap = flapRef.current;
      if (flap) {
        const unfold = { duration: ms(UNFOLD_MS), easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' as const };
        flap.animate(
          [{ transform: 'perspective(1800px) rotateX(-90deg)' }, { transform: 'perspective(1800px) rotateX(0deg)' }],
          unfold,
        );
        flap.animate([{ opacity: 1 }, { opacity: 0 }], { ...unfold, pseudoElement: '::after' });
      }

      timers.current.push(
        window.setTimeout(() => {
          if (sheetRef.current) clipTo(sheetRef.current, null);
          setFold(null);
          setPhase('open');
        }, ms(folds ? Math.max(LIFT_MS, UNFOLD_MS) : LIFT_MS)),
      );
    };
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(go);
    });
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  const putBack = useCallback(() => {
    if (phase !== 'open' || turning) return;
    const sheet = sheetRef.current;
    const spot = spotRef.current;

    const land = () => {
      setPhase('folded');
      setFold(null);
      playSlot();
      foldedRef.current?.focus({ preventScroll: true });
    };

    if (!sheet || !spot || prefersReducedMotion()) {
      land();
      return;
    }

    overlayRef.current?.scrollTo({ top: 0 });
    const band = sheet.offsetWidth / FOLD_RATIO;
    const height = sheet.offsetHeight;
    const folds = height > band * 1.05;

    /* The lower half folds up behind the top half on the way down, not before. */
    if (folds) {
      clipTo(sheet, band);
      setFold({ band, flap: Math.min(band, height - band) });
    }
    setPhase('returning');
    sheet.style.transformOrigin = `50% ${band / 2}px`;
    sheet.style.transition = `transform ${ms(LIFT_MS)}ms cubic-bezier(.5,0,.75,.4)`;
    sheet.style.transform = tableTransform(spot, sheet, band);
    timers.current.push(window.setTimeout(land, ms(folds ? Math.max(LIFT_MS, UNFOLD_MS) : LIFT_MS)));
  }, [phase, turning]);

  /* Wraps round: past the last page is the first again. A turn mid-leaf starts from the page it was heading to. */
  const turn = useCallback(
    (forward: boolean) => {
      if (phase !== 'open') return;
      const from = turning ? turning.to : page;
      const to = (from + (forward ? 1 : PAGES.length - 1)) % PAGES.length;
      if (turnTimer.current !== null) window.clearTimeout(turnTimer.current);
      overlayRef.current?.scrollTo({ top: 0 });
      playPageTurn();

      if (prefersReducedMotion()) {
        setPage(to);
        setTurning(null);
        return;
      }

      setPage(from);
      setTurning({ from, to, forward });
      turnTimer.current = window.setTimeout(() => {
        turnTimer.current = null;
        setPage(to);
        setTurning(null);
      }, ms(TURN_MS));
    },
    [phase, turning, page],
  );

  useEffect(() => {
    if (phase !== 'open') return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        putBack();
        return;
      }
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      /* Inside the matrix window the arrows scroll it. */
      if ((event.target as HTMLElement | null)?.closest?.('.newspaper__scroll')) return;

      event.preventDefault();
      turn(event.key === 'ArrowRight');
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, putBack, turn]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === 'mouse' || (event.target as HTMLElement).closest('.newspaper__scroll')) return;
    swipe.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    turn(dx < 0);
  };

  const dateline = useMemo(() => {
    const today = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
    return today.charAt(0).toUpperCase() + today.slice(1);
  }, []);

  const content = (index: number, live: boolean): React.ReactNode => {
    if (failed) return <p className="newspaper__notice">De krant is vandaag niet bezorgd.</p>;
    if (!edition) return live ? <p className="newspaper__notice">De krant is vandaag niet bezorgd.</p> : null;
    if (index === 0) return <Standings standings={edition.standings} />;
    if (index === 1) return <Matrix standings={edition.standings} />;
    return <Packs lines={edition.packs} />;
  };

  /** One page of the paper. A copy that is not `live` is print only: the miniature on the table, or the flap. */
  const renderPage = (index: number, live: boolean, className = ''): React.ReactNode => {
    const previous = PAGES[(index + PAGES.length - 1) % PAGES.length];
    const next = PAGES[(index + 1) % PAGES.length];
    const focusable = live && index === settled;
    return (
      <article
        key={PAGES[index]}
        className={`newspaper__sheet${className}`}
        aria-hidden={!focusable}
      >
        <div className="newspaper__pagers">
          <button
            type="button"
            className="newspaper__pager"
            tabIndex={focusable ? 0 : -1}
            onClick={live ? () => turn(false) : undefined}
          >
            ‹ {previous}
          </button>
          <button
            type="button"
            className="newspaper__pager"
            tabIndex={focusable ? 0 : -1}
            onClick={live ? () => turn(true) : undefined}
          >
            {next} ›
          </button>
        </div>
        <RunningHead dateline={dateline} page={index + 1} />
        <h2 className="newspaper__section">{PAGES[index]}</h2>
        <div className="newspaper__body">{live && !inSight(index) ? null : content(index, live)}</div>
      </article>
    );
  };

  /* The page that will be showing sets the paper's height; the others lie over it out of flow. */
  const settled = turning ? turning.to : page;
  /* Pages out of sight are left unprinted: the pack history alone runs to thousands of lines, all of it moved on every frame of a lift. */
  const inSight = (index: number): boolean =>
    index === settled || (turning !== null && (index === turning.from || index === turning.to));
  const leafClass = (index: number): string => {
    const base = ` newspaper__page${index === settled ? ' newspaper__page--settled' : ''}`;
    if (turning) {
      if (turning.forward && index === turning.from) return `${base} newspaper__page--leaving`;
      if (!turning.forward && index === turning.to) return `${base} newspaper__page--arriving`;
      if (index === (turning.forward ? turning.to : turning.from)) return `${base} newspaper__page--under`;
      return `${base} newspaper__page--away`;
    }
    return index === page ? base : `${base} newspaper__page--away`;
  };

  const printScale = spotWidth > 0 ? spotWidth / printWidth : 0;

  return (
    <>
      <div ref={spotRef} className="newspaper-spot">
        <button
          ref={foldedRef}
          type="button"
          className={`newspaper-folded${lifted ? ' newspaper-folded--lifted' : ''}`}
          style={{ transform: TABLE_TILT }}
          onClick={pickUp}
          title="De Verzamelaar"
          aria-label="De Verzamelaar: de stand van alle verzamelaars"
        >
          <div
            className="newspaper-folded__print"
            aria-hidden="true"
            style={{ width: printWidth, transform: `scale(${printScale})` }}
          >
            {renderPage(page, false)}
          </div>
        </button>
      </div>

      {lifted
        ? createPortal(
            <div
              ref={overlayRef}
              className={`newspaper newspaper--${phase}`}
              style={
                {
                  '--np-lift-ms': `${ms(LIFT_MS)}ms`,
                  '--np-unfold-ms': `${ms(UNFOLD_MS)}ms`,
                  '--np-turn-ms': `${ms(TURN_MS)}ms`,
                } as React.CSSProperties
              }
              onClick={(event) => {
                if (event.target === event.currentTarget) putBack();
              }}
            >
              <div className="newspaper__scrim" onClick={putBack} />
              <div
                ref={sheetRef}
                className="newspaper__lift"
                tabIndex={-1}
                role="dialog"
                aria-label="De Verzamelaar"
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerCancel={() => (swipe.current = null)}
              >
                <div className="newspaper__pages">
                  {PAGES.map((_, index) => renderPage(index, true, leafClass(index)))}
                </div>
                {fold ? (
                  <div
                    ref={flapRef}
                    className={`newspaper__flap newspaper__flap--${phase === 'returning' ? 'folding' : 'waiting'}`}
                    style={{ top: fold.band, height: fold.flap }}
                    aria-hidden="true"
                  >
                    <div className="newspaper__flap-print" style={{ top: -fold.band }}>
                      {renderPage(page, false)}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
};

/** Shows only the pages' top half while the paper is folded, or all of it again for `null`. The flap is not clipped. */
const clipTo = (sheet: HTMLElement, band: number | null) => {
  const pages = sheet.querySelector<HTMLElement>('.newspaper__pages');
  if (!pages) return;
  pages.style.clipPath = band === null ? '' : `inset(0 0 ${Math.max(0, pages.offsetHeight - band)}px 0)`;
};

/**
 * The folded paper on the table, as a transform on the lifted sheet: its top half's centre on the
 * spot's centre, at the spot's size and slant. Measured off the spot, which the slant does not move.
 */
const tableTransform = (spot: HTMLElement, sheet: HTMLElement, band: number): string => {
  const from = spot.getBoundingClientRect();
  const to = sheet.getBoundingClientRect();
  const scale = from.width / to.width;
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + band / 2);
  return `translate(${dx}px, ${dy}px) ${TABLE_TILT} scale(${scale})`;
};

const RunningHead: React.FC<{ dateline: string; page: number }> = ({ dateline, page }) => (
  <div className="newspaper__runhead">
    <span className="newspaper__runhead-title">De Verzamelaar</span>
    <span className="newspaper__runhead-section">Sport</span>
    <span>
      {dateline} · pagina {page}
    </span>
  </div>
);

/**
 * The compact pack lines as a results column: grouped under their day, newest first.
 * A line is `28-10-2026 13:01 - Rik pakte: Anneloes (84)*, Charlie (68)`; `*` is a first copy.
 */
const Packs: React.FC<{ lines: string[] }> = ({ lines }) => {
  const days = useMemo(() => {
    const grouped: { day: string; entries: { time: string; text: string }[] }[] = [];
    lines.forEach((line) => {
      const match = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}:\d{2}) - (.*)$/.exec(line);
      if (!match) return;
      const [, dd, mm, yyyy, time, text] = match;
      const day = new Date(Number(yyyy), Number(mm) - 1, Number(dd)).toLocaleDateString('nl-NL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      const last = grouped[grouped.length - 1];
      if (last && last.day === day) last.entries.push({ time, text });
      else grouped.push({ day, entries: [{ time, text }] });
    });
    return grouped;
  }, [lines]);

  if (days.length === 0) return <p className="newspaper__notice">Nog geen pakjes geopend.</p>;

  return (
    <>
      <p className="newspaper__legend">* nieuw in het album</p>
      <div className="newspaper__packs">
        {days.map(({ day, entries }) => (
          <section key={day} className="newspaper__day">
            <h3 className="newspaper__day-head">{day}</h3>
            {entries.map((entry, index) => (
              <p key={index} className="newspaper__pack">
                <span className="newspaper__pack-time">{entry.time}</span> {entry.text}
              </p>
            ))}
          </section>
        ))}
      </div>
    </>
  );
};

/**
 * First names, with the last name's initial wherever two people share one: Daan B, Daan V.
 */
const useShortNames = (standings: CollectorStandings) =>
  useMemo(() => {
    const people = new Map<string, string>();
    standings.collectors.forEach((c) => people.set(c.playerId, c.name));
    [...standings.actives, ...standings.icons].forEach((p) => people.set(p.id, p.name));

    const byFirst = new Map<string, number>();
    people.forEach((name) => {
      const first = firstNameOf(name);
      byFirst.set(first, (byFirst.get(first) ?? 0) + 1);
    });

    const short = new Map<string, string>();
    people.forEach((name, id) => {
      const first = firstNameOf(name);
      const words = splitName(name).display.split(' ').filter(Boolean);
      const initial = words.length > 1 ? words[words.length - 1].charAt(0).toUpperCase() : '';
      short.set(id, (byFirst.get(first) ?? 0) > 1 && initial ? `${first} ${initial}` : first);
    });
    return short;
  }, [standings]);

const Standings: React.FC<{ standings: CollectorStandings }> = ({ standings }) => {
  const names = useShortNames(standings);
  const firstVolumeOnly = standings.collectors.findIndex((c) => !c.iconsUnlocked);

  return (
    <table className="newspaper__stand">
      <thead>
        <tr>
          <th />
          <th>Verzamelaar</th>
          <th>Volume I</th>
          <th>+ Iconen</th>
        </tr>
      </thead>
      <tbody>
        {standings.collectors.map((collector, index) => (
          <tr
            key={collector.playerId}
            className={index > 0 && index === firstVolumeOnly ? 'newspaper__divider' : undefined}
          >
            <td className="newspaper__rank">{collector.rank}.</td>
            <td>
              <div className="newspaper__who">
                <Portrait id={collector.playerId} name={names.get(collector.playerId) ?? collector.name} />
                <div className="newspaper__who-text">
                  <div className="newspaper__name">{names.get(collector.playerId)}</div>
                  <Missing collector={collector} names={names} />
                </div>
              </div>
            </td>
            <td className="newspaper__num">{collector.volumeOnePercent}%</td>
            <td className="newspaper__num">
              {collector.withIconsPercent === null ? '' : `${collector.withIconsPercent}%`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const Missing: React.FC<{ collector: CollectorStanding; names: Map<string, string> }> = ({ collector, names }) => {
  if (collector.missing.length === 0) {
    return <div className="newspaper__missing newspaper__missing--done">Compleet</div>;
  }
  const shown = collector.missing.slice(0, MAX_MISSING);
  const rest = collector.missing.length - shown.length;

  return (
    <div className="newspaper__missing">
      <em>mist</em> {shown.map((id) => names.get(id) ?? '?').join(', ')}
      {rest > 0 ? <strong> en nog {rest}</strong> : null}
    </div>
  );
};

/** A passport photo, screened like newsprint; the initial stands in when there is no photo. */
const Portrait: React.FC<{ id: string; name: string }> = ({ id, name }) => {
  const [broken, setBroken] = useState(false);
  return (
    <div className="newspaper__portrait" aria-hidden="true">
      {broken ? (
        <span>{name.charAt(0)}</span>
      ) : (
        <img src={avatarUrl(id)} alt="" loading="lazy" onError={() => setBroken(true)} />
      )}
    </div>
  );
};

const Matrix: React.FC<{ standings: CollectorStandings }> = ({ standings }) => {
  const names = useShortNames(standings);
  const iconCollectors = standings.collectors.filter((c) => c.iconCounts !== null);

  return (
    <>
      <Grid
        cards={standings.actives}
        rows={standings.collectors}
        counts={(c) => c.activeCounts}
        names={names}
      />
      {iconCollectors.length > 0 && standings.icons.length > 0 ? (
        <>
          <p className="newspaper__subsection">Iconen</p>
          <Grid
            cards={standings.icons}
            rows={iconCollectors}
            counts={(c) => c.iconCounts ?? []}
            names={names}
          />
        </>
      ) : null}
      <p className="newspaper__legend">Getal: zo vaak gepakt. Een punt: mist nog.</p>
    </>
  );
};

const Grid: React.FC<{
  cards: CardPlayer[];
  rows: CollectorStanding[];
  counts: (collector: CollectorStanding) => number[];
  names: Map<string, string>;
}> = ({ cards, rows, counts, names }) => {
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);

  return (
    <div className="newspaper__scroll" onMouseLeave={() => setHover(null)}>
      <table className="newspaper__matrix">
        <thead>
          <tr>
            <th className="newspaper__matrix-name newspaper__matrix-corner" />
            {cards.map((card, col) => (
              <th
                key={card.id}
                className={hover?.col === col ? 'newspaper__hl' : undefined}
                onMouseEnter={() => setHover({ row: -1, col })}
              >
                <span>{names.get(card.id)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((collector, row) => {
            const values = counts(collector);
            return (
              <tr key={collector.playerId}>
                <td className={`newspaper__matrix-name${hover?.row === row ? ' newspaper__hl' : ''}`}>
                  <span className="newspaper__matrix-rank">{collector.rank}.</span>
                  {names.get(collector.playerId)}
                </td>
                {cards.map((card, col) => {
                  const value = values[col] ?? 0;
                  const lit = hover !== null && (hover.row === row || hover.col === col);
                  return (
                    <td
                      key={card.id}
                      className={`${value ? 'newspaper__count' : 'newspaper__gap'}${lit ? ' newspaper__hl' : ''}`}
                      onMouseEnter={() => setHover({ row, col })}
                    >
                      {value || '·'}
                    </td>
                  );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
};

export default Newspaper;
