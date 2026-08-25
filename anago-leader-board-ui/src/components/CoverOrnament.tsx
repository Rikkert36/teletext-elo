import React from 'react';

/**
 * The blind ornament on the album's front board: four foosball rods, 1-2-3-5 from
 * keeper to attack, with the owner's name in the gap between the second and the third.
 *
 * **On the leather cover it is not a drawing on the hide, it is the hide pushed up.**
 * There is no second colour in here that matters — the stain's own tone runs at a fifth of
 * strength (`--ornament-tint`) and what you actually see is white and black at seven
 * tenths (`--ornament-light` and `--ornament-shadow`), which is what a blind stamp is: no
 * ink, only relief. Turn the tint up to full and it stops being an impression and becomes
 * a light blue picture printed on a navy book.
 *
 * On the icon binding the same drawing is struck in gold leaf on the ivory boards instead.
 * See `album.css` for both sets of dials and their values; none of it is in this file.
 *
 * **Every plane is drawn four times, and that is the whole effect.** Head, torso, legs
 * and foot each get a shadow form a fraction down-right, the body itself, a highlight
 * form a fraction up-left, and then three outlines half a unit apart — light, leather,
 * dark. A single bevel around the *silhouette* would make each figure a stamp; edges per
 * plane make it a casting that catches the lamp. The three interior seams (knee,
 * shoulder, foot) are the cheapest layer here and do a surprising amount of the work:
 * without them the figures read as silhouettes.
 *
 * **The rods stop at every torso rather than running behind it.** Two translucent forms
 * at 24% overlapping give 42%, so a continuous rod drew a pale band straight through
 * each figure — the one place on the cover where the density was wrong. Only the two
 * outermost ends of a row get a cap; where a segment meets a torso it is left open, so
 * the break reads as the rod passing behind the figure rather than as eleven rods in two
 * pieces each.
 *
 * That is also why the segments are computed from `ROWS` instead of being written out.
 * A figure's position would otherwise live in three places at once — its own transform
 * and the two segment widths beside it — and moving one would put a rod through a torso.
 *
 * **Only on the full-size cover.** `.choice__book` on the choosing table is its own small
 * flat face and deliberately does not get this: at 224px the three edges of a relief
 * start to merge, at 112px they are one thick line, and what that table is for is telling
 * bordeaux from ossenbloed. That argument holds harder on the icon binding, whose shadow
 * side runs at 0.95 of an already thin black.
 *
 * **It is drawn on the icon binding too, in gold leaf on the boards.** Everything that
 * differs there is a handful of custom properties in `album.css`
 * (`.album--icons .album__cover-rods`); this file draws one geometry and knows nothing
 * about which material it lands in. The `<defs>` below is the exception, and only because
 * a gradient has to be a real element somewhere.
 *
 * **The eleven figures are written out, not `<use href="#…">` on one definition**, and
 * that is not a missed optimisation. It was a sprite first, with the id from `useId()`
 * to keep two mounted covers from colliding — and `useId()` returns `:R0:`, colons and
 * all, which is a legal `id` and not a reference a fragment lookup can be trusted with.
 * The rods drew and every figure vanished. A sprite also puts the shapes in a shadow tree
 * where which selectors reach them is browser-dependent, and the whole ornament is
 * selector-driven. Thirty shapes eleven times is about 400 nodes on a cover that mounts
 * twice at most, and `React.memo` below means they are built once and never diffed again.
 *
 * Geometry is `docs/cover-ornament.html` (reference v5), unchanged. The tone values live
 * in `album.css` rather than here, because a number in a `<style>` inside an SVG is a
 * number nothing can tune.
 */

/** The rods, top to bottom, and where the figures sit on each. */
const ROWS: ReadonlyArray<{ y: number; players: readonly number[] }> = [
  { y: 110, players: [390] },
  { y: 252, players: [300, 480] },
  { y: 680, players: [245, 390, 535] },
  { y: 836, players: [185, 287.5, 390, 492.5, 595] },
];

/** Where a rod starts and ends, and how far a torso reaches from its own centre. */
const ROD_X0 = 100;
const ROD_X1 = 682;
const TORSO_HALF = 16;

/** The stretches of rod between the torsos, left to right. */
const gapsFor = (players: readonly number[]): Array<[number, number]> => {
  const gaps: Array<[number, number]> = [];
  let x = ROD_X0;

  players.forEach((centre) => {
    gaps.push([x, centre - TORSO_HALF - x]);
    x = centre + TORSO_HALF;
  });
  gaps.push([x, ROD_X1 - x]);

  return gaps;
};

/**
 * One stretch of rod: a shadow offset downward only (a lamp up and to the left throws
 * nothing upward), the bar, and four edges — highlight on the top, leather just under
 * it, a soft dark just above the bottom, black on the bottom itself. That is a flat face
 * with a chamfer round it. No rounded corners and no round caps anywhere: the torso is
 * `rx 1.8` on 32 wide, which is as good as square, and a round tube through a square
 * casting reads as two objects.
 */
const RodSegment: React.FC<{ x: number; w: number; capLeft: boolean; capRight: boolean }> = ({
  x,
  w,
  capLeft,
  capRight,
}) => {
  const x2 = x + w;

  return (
    <g>
      <rect className="rod-shadow" x={x} y={-3.2} width={w} height={8} />
      <rect className="rod-face" x={x} y={-4} width={w} height={8} />
      <line className="rod-top" x1={x} y1={-4} x2={x2} y2={-4} />
      <line className="rod-top-inner" x1={x} y1={-2.75} x2={x2} y2={-2.75} />
      <line className="rod-bottom-inner" x1={x} y1={2.85} x2={x2} y2={2.85} />
      <line className="rod-bottom" x1={x} y1={4} x2={x2} y2={4} />
      {capLeft ? (
        <>
          <line className="rod-left" x1={x} y1={-4} x2={x} y2={4} />
          <line className="rod-left-inner" x1={x + 1.1} y1={-3.2} x2={x + 1.1} y2={3.2} />
        </>
      ) : null}
      {capRight ? (
        <>
          <line className="rod-right-inner" x1={x2 - 1.1} y1={-3.2} x2={x2 - 1.1} y2={3.2} />
          <line className="rod-right" x1={x2} y1={-4} x2={x2} y2={4} />
        </>
      ) : null}
    </g>
  );
};

/**
 * One figure, standing at `x` on its rod. Head, torso, legs and foot, each drawn as a
 * shadow form, a body, a highlight form and three outlines — in that order, because they
 * stack.
 */
const Player: React.FC<{ x: number }> = ({ x }) => (
  <g transform={`translate(${x} 0)`}>
    <circle className="shape-loFill" cx={0.9} cy={-30.2} r={10.5} />
          <rect className="shape-loFill" x={-16.1} y={-16} width={32} height={37} rx={1.8} />
          <path className="shape-loFill" d="M-9.9 21 L9.9 21 L6.8 38.8 L3.9 53 L-3.9 53 L-6.8 38.8 Z" />
          <rect className="shape-loFill" x={-10.6} y={53} width={21.2} height={10.2} rx={0.9} />

          <circle className="shape-fill" cx={0} cy={-31} r={10.5} />
          <rect className="shape-fill" x={-16} y={-16} width={32} height={37} rx={1.8} />
          <path className="shape-fill" d="M-10 21 L10 21 L6.9 38.6 L4 52 L-4 52 L-6.9 38.6 Z" />
          <rect className="shape-fill" x={-10.5} y={52} width={21} height={10} rx={0.9} />

          <circle className="shape-hiFill" cx={-0.8} cy={-31.8} r={9.7} />
          <rect className="shape-hiFill" x={-15.2} y={-16.7} width={29.2} height={34} rx={1.5} />
          <path className="shape-hiFill" d="M-9 21.2 L8.4 21.2 L5.8 37.2 L3.3 49.3 L-3.4 49.3 L-5.8 37.3 Z" />
          <rect className="shape-hiFill" x={-9.5} y={52.2} width={18.6} height={8.4} rx={0.7} />

          <circle className="edge-hi" cx={-0.45} cy={-31.45} r={10} />
          <circle className="edge-mid" cx={0} cy={-31} r={10.1} />
          <circle className="edge-lo" cx={0.55} cy={-30.45} r={10.15} />

          <rect className="edge-hi" x={-15.35} y={-16.55} width={30.2} height={35.2} rx={1.5} />
          <rect className="edge-mid" x={-15.7} y={-16.2} width={31} height={36} rx={1.6} />
          <rect className="edge-lo" x={-15.25} y={-15.75} width={31.8} height={36.8} rx={1.7} />

          <path className="edge-hi" d="M-9.2 21.1 L8.7 21.1 L6 37.5 L3.4 50.3 L-3.4 50.3 L-6 37.5 Z" />
          <path className="edge-mid" d="M-9.6 21.1 L9.2 21.1 L6.4 38 L3.7 51.1 L-3.7 51.1 L-6.4 38 Z" />
          <path className="edge-lo" d="M-9.95 21.45 L9.8 21.45 L6.9 38.55 L3.95 52 L-3.95 52 L-6.9 38.55 Z" />

          <rect className="edge-hi" x={-9.7} y={52.2} width={19.1} height={8.6} rx={0.8} />
          <rect className="edge-mid" x={-10} y={52.25} width={19.8} height={9.1} rx={0.8} />
          <rect className="edge-lo" x={-10.35} y={52.55} width={20.4} height={9.4} rx={0.85} />

          {/* The seams where the mould opened: knee, shoulder, top of the foot. Across
              the leg rather than along it — a parting line runs around a casting. */}
          <line className="detail-hi" x1={-7.9} y1={36} x2={6.7} y2={36} />
          <line className="detail-mid" x1={-7.4} y1={36.5} x2={7.3} y2={36.5} />
          <line className="detail-lo" x1={-6.8} y1={37.1} x2={7.9} y2={37.1} />

          <line className="detail-hi" x1={-13.6} y1={-15.1} x2={12.5} y2={-15.1} />
          <line className="detail-mid" x1={-13} y1={-14.4} x2={13} y2={-14.4} />
          <line className="detail-lo" x1={-12.4} y1={-13.7} x2={13.6} y2={-13.7} />

          <line className="detail-hi" x1={-8.2} y1={52.9} x2={7} y2={52.9} />
    <line className="detail-mid" x1={-7.6} y1={53.4} x2={7.6} y2={53.4} />
    <line className="detail-lo" x1={-7} y1={54} x2={8.2} y2={54} />
  </g>
);

const CoverOrnament: React.FC = () => (
  <svg
    className="album__cover-rods"
    viewBox="0 0 780 1000"
    /* The board is 0.780 and the drawing is 0.780. `none` keeps the rods spanning the
       same margins at every size instead of letterboxing a rounding error. */
    preserveAspectRatio="none"
    aria-hidden="true"
    focusable="false"
  >
    {/*
      The leaf, for the icon binding — `--ornament-paint` points at it from album.css.

      **A literal id, and that is deliberate.** `useId()` returns `:R0:`, colons and all,
      which is a legal id and not a reference a fragment lookup can be trusted with; that
      is the same trap that made the eleven figures written out rather than a sprite. Two
      mounted covers therefore define the same id twice, which is harmless here: both
      elements are identical, and `userSpaceOnUse` resolves against the *referencing*
      element's user space, so whichever one the lookup finds paints both covers correctly.

      Along the lamp's own 150deg, and across the whole drawing rather than per figure —
      eleven figures with a gradient each read as eleven stickers.
    */}
    <defs>
      <linearGradient id="album-goldleaf" gradientUnits="userSpaceOnUse"
                      x1="60" y1="40" x2="720" y2="960">
        <stop offset="0" stopColor="#ffeeb8" />
        <stop offset="0.45" stopColor="#d2a533" />
        <stop offset="1" stopColor="#6b4a0f" />
      </linearGradient>
    </defs>

    {ROWS.map((row) => {
      const gaps = gapsFor(row.players);

      return (
        <g key={row.y} transform={`translate(0 ${row.y})`}>
          {gaps.map(([x, w], i) => (
            <RodSegment key={x} x={x} w={w} capLeft={i === 0} capRight={i === gaps.length - 1} />
          ))}
          {/* After the rod, so a figure is never crossed by one. */}
          {row.players.map((centre) => (
            <Player key={centre} x={centre} />
          ))}
        </g>
      );
    })}
  </svg>
);

/* Takes no props and draws about four hundred nodes, so there is never a reason to
   diff it again. */
export default React.memo(CoverOrnament);
