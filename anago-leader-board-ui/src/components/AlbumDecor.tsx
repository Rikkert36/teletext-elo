import React from 'react';
import { AlbumStyle } from '../utils/albumStyle';

/**
 * The drawn layer on an album page.
 *
 * Gradients and rules can make a page look *printed*, but they cannot make it
 * look *designed* — a real sticker album has bunting, confetti, a ball bleeding
 * off the corner. So the decoration is actual artwork: inline SVG, drawn from
 * primitives, no asset files and nothing fetched.
 *
 * **No two pages are the same.** Every style cycles a palette and varies its
 * composition by page index — the bunting starts on a different colour, the
 * rays come from a different corner, the ball moves. A book where page four is
 * page two again reads as a template, not as something someone made.
 *
 * The palette is published as CSS custom properties (`--pg-a`, `--pg-b`,
 * `--pg-ink`, `--pg-accent`) by `Album.tsx`, so the paper colour in albumstyle.css
 * and the artwork here always agree — they are the same four values.
 *
 * It sits behind the cards (`z-index: 0`) and is decorative, hence `aria-hidden`.
 */

const VIEW = '0 0 780 1000';

export interface PagePaint {
  /** Paper, light end. */
  a: string;
  /** Paper, dark end. */
  b: string;
  /** Type printed on the paper. */
  ink: string;
  /** The page's one strong colour. */
  accent: string;
}

/* ------------------------------------------------------------------ *
 * Palettes
 *
 * One per page, cycled by index. Long enough that a six-page section never
 * repeats, and ordered so consecutive pages contrast rather than drift.
 * ------------------------------------------------------------------ */

const PALETTES: Partial<Record<AlbumStyle, PagePaint[]>> = {
  panini: [
    { a: '#ffffff', b: '#eef3fb', ink: '#10233b', accent: '#0b57a4' },
    { a: '#fffdf7', b: '#fbe9e6', ink: '#3b1010', accent: '#e8262d' },
    { a: '#f8fffa', b: '#e4f3e9', ink: '#0f2e1c', accent: '#14a06a' },
    { a: '#fffdf0', b: '#f8efd4', ink: '#3a2f00', accent: '#e0980b' },
    { a: '#fdf8ff', b: '#efe4f7', ink: '#26103b', accent: '#7b2ff7' },
    { a: '#fbfeff', b: '#e2f3f7', ink: '#0b2b33', accent: '#0f9bb5' },
  ],
  veld: [
    { a: '#2e8f4a', b: '#1a6634', ink: '#ffffff', accent: '#e03a2f' },
    { a: '#27834f', b: '#145238', ink: '#ffffff', accent: '#ffd23f' },
    { a: '#1f7d7a', b: '#0f4f4d', ink: '#ffffff', accent: '#ff7a1a' },
    { a: '#3a9a3f', b: '#1f6b26', ink: '#ffffff', accent: '#2b6fd6' },
    { a: '#22794a', b: '#0f4a2c', ink: '#ffffff', accent: '#f04d9c' },
    { a: '#37864a', b: '#1d5730', ink: '#ffffff', accent: '#ffffff' },
  ],
  stadion: [
    { a: '#0c1729', b: '#0d1b31', ink: '#d8e4f7', accent: '#f5a524' },
    { a: '#1a1030', b: '#2a1140', ink: '#e6dcff', accent: '#b06bff' },
    { a: '#2a1414', b: '#3d1a12', ink: '#ffe6d8', accent: '#ff6a2b' },
    { a: '#07202b', b: '#0b3140', ink: '#d4f2ff', accent: '#34c6f0' },
    { a: '#161a24', b: '#232838', ink: '#e8ecf5', accent: '#c8d2e6' },
    { a: '#12241a', b: '#193524', ink: '#dcf5e4', accent: '#5fd48b' },
  ],
  kauwgom: [
    { a: '#ff4d9d', b: '#7b2ff7', ink: '#fff4fb', accent: '#ffd23f' },
    { a: '#29d0e0', b: '#1b6fd4', ink: '#f2fdff', accent: '#ff4d9d' },
    { a: '#ffd23f', b: '#ff7a1a', ink: '#3a1a00', accent: '#7b2ff7' },
    { a: '#8ce34a', b: '#12a05a', ink: '#0d2b12', accent: '#ff4d9d' },
    { a: '#ff7a1a', b: '#e0245e', ink: '#fff4ec', accent: '#29d0e0' },
    { a: '#b06bff', b: '#4a12a8', ink: '#f8f2ff', accent: '#8ce34a' },
  ],
};

/* ------------------------------------------------------------------ *
 * Olympus: the page dresses to the players on it
 *
 * The book is sorted ascending, so a page's average overall rises as you turn
 * through it. These five steps run from a mud field to the top of Olympus, and
 * the page you reach last is the one with the best players in the club on it.
 * ------------------------------------------------------------------ */

export const OLYMP_STEPS = [
  { at: 0, name: 'modder' },
  { at: 66, name: 'dorp' },
  { at: 73, name: 'burcht' },
  { at: 80, name: 'paleis' },
  { at: 86, name: 'olympus' },
] as const;

const OLYMP_PAINT: PagePaint[] = [
  { a: '#6f5c42', b: '#3f3324', ink: '#f0e6d2', accent: '#a98f5c' },
  { a: '#8d7049', b: '#54402a', ink: '#f7edd8', accent: '#cda66a' },
  { a: '#949aa3', b: '#575d66', ink: '#f4f6f9', accent: '#c3c9d2' },
  { a: '#d3dcea', b: '#8399b8', ink: '#16203a', accent: '#d9c47a' },
  { a: '#fefcf5', b: '#ecdfba', ink: '#4a3a12', accent: '#dfb333' },
];

/** Which of the five worlds a page belongs to, from its average overall. */
export const olympLevel = (averageOverall: number): number => {
  let level = 0;
  OLYMP_STEPS.forEach((step, i) => {
    if (averageOverall >= step.at) level = i;
  });
  return level;
};

export const pagePaint = (
  style: AlbumStyle,
  index: number,
  level: number,
): PagePaint | undefined => {
  if (style === 'olymp') return OLYMP_PAINT[Math.min(level, OLYMP_PAINT.length - 1)];
  const list = PALETTES[style];
  return list?.[index % list.length];
};

/* ------------------------------------------------------------------ *
 * Shared primitives
 * ------------------------------------------------------------------ */

const frame = (children: React.ReactNode) => (
  <svg
    className="album__deco"
    viewBox={VIEW}
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

/** A football, drawn as a pentagon and a ring of patches. */
const Ball: React.FC<{ cx: number; cy: number; r: number; fill: string; ink: string }> = ({
  cx,
  cy,
  r,
  fill,
  ink,
}) => {
  const patch = (angle: number, distance: number, size: number) => {
    const a = ((angle - 90) * Math.PI) / 180;
    const px = cx + Math.cos(a) * distance;
    const py = cy + Math.sin(a) * distance;
    const points = Array.from({ length: 5 }, (_, i) => {
      const t = ((i * 72 + angle) * Math.PI) / 180;
      return `${px + Math.sin(t) * size},${py - Math.cos(t) * size}`;
    }).join(' ');
    return <polygon key={angle} points={points} fill={ink} />;
  };

  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={fill} />
      {patch(0, 0, r * 0.34)}
      {[0, 72, 144, 216, 288].map((a) => patch(a, r * 0.68, r * 0.24))}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={ink} strokeWidth={r * 0.06} />
    </g>
  );
};

/** A foosball figure, seen from above on its rod. */
const Man: React.FC<{ x: number; y: number; colour: string }> = ({ x, y, colour }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M-11,-6 L11,-6 L8,13 L-8,13 Z" fill={colour} />
    <rect x={-9} y={13} width={7} height={13} rx={2} fill={colour} />
    <rect x={2} y={13} width={7} height={13} rx={2} fill={colour} />
    <circle cy={-13} r={8} fill="#f2e3cf" />
    <circle cy={-13} r={8} fill="none" stroke="rgba(0,0,0,.25)" strokeWidth={1.5} />
  </g>
);

/** A laurel half-wreath, mirrored by the caller. */
const Laurel: React.FC<{ colour: string; opacity: number }> = ({ colour, opacity }) => (
  <g opacity={opacity}>
    {[0, 1].map((side) => (
      <g key={side} transform={side ? 'scale(-1 1)' : undefined}>
        <path
          d="M-14,120 C-96,74 -122,-8 -96,-84"
          fill="none"
          stroke={colour}
          strokeWidth={9}
          strokeLinecap="round"
        />
        {Array.from({ length: 8 }, (_, i) => {
          const t = i / 7;
          const x = -14 - t * 88;
          const y = 120 - t * 206 + t * t * 22;
          return (
            <ellipse
              key={i}
              cx={x}
              cy={y}
              rx={23}
              ry={11}
              fill={colour}
              transform={`rotate(${-58 + t * 46} ${x} ${y})`}
            />
          );
        })}
      </g>
    ))}
  </g>
);

/* ------------------------------------------------------------------ *
 * 2 · PANINI
 * ------------------------------------------------------------------ */

const FLAGS = ['#e8262d', '#ffd23f', '#0b57a4', '#14a06a', '#ff7a1a', '#7b2ff7'];

const Panini: React.FC<{ index: number; paint: PagePaint }> = ({ index, paint }) => {
  /* Bunting starts on a different colour each page, and hangs from alternate
     sides so the swag does not repeat. */
  const offset = index % FLAGS.length;
  const deep = index % 2 === 1;

  return frame(
    <>
      {Array.from({ length: 13 }, (_, i) => {
        const drop = deep ? 96 + (i % 2) * 26 : 96 - (i % 2) * 22;
        return (
          <polygon
            key={i}
            points={`${i * 62},34 ${i * 62 + 62},34 ${i * 62 + 31},${drop}`}
            fill={FLAGS[(i + offset) % FLAGS.length]}
            opacity={0.85}
          />
        );
      })}
      <path d="M0,34 H780" stroke={paint.accent} strokeWidth={4} fill="none" />

      {Array.from({ length: 14 }, (_, i) => {
        /* Deterministic scatter that differs per page — no randomness, so a
           re-render never reshuffles the confetti. */
        const seed = i * 71 + index * 137;
        const x = (seed * 13) % 740 + 20;
        const y = ((seed * 29) % 820) + 140;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={15}
            height={8}
            rx={1}
            fill={FLAGS[(i + offset) % FLAGS.length]}
            opacity={0.38}
            transform={`rotate(${(seed % 90) - 45} ${x} ${y})`}
          />
        );
      })}

      <g opacity={0.14}>
        <Ball
          cx={index % 2 ? 710 : 70}
          cy={950}
          r={165}
          fill={paint.accent}
          ink={paint.ink}
        />
      </g>
    </>,
  );
};

/* ------------------------------------------------------------------ *
 * 3 · SPEELVELD
 * ------------------------------------------------------------------ */

const Veld: React.FC<{ index: number; paint: PagePaint }> = ({ index, paint }) => {
  /* Alternate which team holds the three-man rods, so facing pages read as the
     two ends of the table rather than as one page printed twice. */
  const swap = index % 2 === 1;
  const rods = [150, 400, 650, 900];

  return frame(
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x={0}
          y={i * 125}
          width={780}
          height={125}
          fill={i % 2 ? 'rgba(255,255,255,.045)' : 'transparent'}
        />
      ))}

      <g fill="none" stroke="rgba(255,255,255,.5)" strokeWidth={5}>
        <rect x={26} y={26} width={728} height={948} rx={4} />
        <path d="M26,500 H754" />
        <circle cx={390} cy={500} r={104} />
        <rect x={246} y={26} width={288} height={104} />
        <rect x={246} y={870} width={288} height={104} />
      </g>
      <circle cx={390} cy={500} r={9} fill="rgba(255,255,255,.5)" />

      {rods.map((y, row) => {
        const home = swap ? row % 2 === 1 : row % 2 === 0;
        const colour = home ? paint.accent : '#2b6fd6';
        const men = home ? [275, 505] : [160, 390, 620];
        return (
          <g key={y}>
            <rect x={-30} y={y - 5} width={840} height={10} fill="url(#rod)" />
            {men.map((x) => (
              <Man key={x} x={x} y={y} colour={colour} />
            ))}
          </g>
        );
      })}

      <defs>
        <linearGradient id="rod" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8d97a3" />
          <stop offset="38%" stopColor="#eef2f6" />
          <stop offset="62%" stopColor="#b3bcc7" />
          <stop offset="100%" stopColor="#6e7883" />
        </linearGradient>
      </defs>
    </>,
  );
};

/* ------------------------------------------------------------------ *
 * 4 · STADION
 * ------------------------------------------------------------------ */

const CROWD = ['#e8262d', '#ffd23f', '#0b57a4', '#f4f1ea', '#14a06a', '#ff7a1a'];

const Pylon: React.FC<{ x: number; flip?: boolean; lamp: string }> = ({ x, flip, lamp }) => (
  <g transform={`translate(${x} 0)${flip ? ' scale(-1 1)' : ''}`}>
    <path d="M0,150 L300,760 L-190,760 Z" fill="url(#beam)" />
    <path d="M-9,150 L9,150 L20,560 L-20,560 Z" fill="#2b3440" />
    <path d="M-14,250 L14,258 M-16,340 L16,348 M-18,440 L18,448" stroke="#2b3440" strokeWidth={5} />
    <rect x={-74} y={74} width={148} height={78} rx={5} fill="#2b3440" />
    {Array.from({ length: 12 }, (_, i) => (
      <circle key={i} cx={-58 + (i % 6) * 23} cy={97 + Math.floor(i / 6) * 30} r={9} fill={lamp} />
    ))}
  </g>
);

const Stadion: React.FC<{ index: number; paint: PagePaint }> = ({ index, paint }) => {
  /* One pylon or two, and on alternating sides — the same ground from a
     different corner each page. */
  const single = index % 3 === 2;
  const mirrored = index % 2 === 1;

  return frame(
    <>
      {Array.from({ length: 5 }, (_, row) =>
        Array.from({ length: 30 }, (_, i) => (
          <circle
            key={`${row}-${i}`}
            cx={13 + i * 26}
            cy={196 + row * 22}
            r={7}
            fill={CROWD[(i * 3 + row + index) % CROWD.length]}
            opacity={0.5}
          />
        )),
      )}
      <path d="M0,320 H780" stroke="rgba(255,255,255,.35)" strokeWidth={6} />

      {single ? (
        <Pylon x={390} lamp={paint.accent} />
      ) : (
        <>
          <Pylon x={mirrored ? 670 : 110} flip={mirrored} lamp={paint.accent} />
          <Pylon x={mirrored ? 110 : 670} flip={!mirrored} lamp={paint.accent} />
        </>
      )}

      <rect x={0} y={860} width={780} height={140} fill="rgba(28,120,60,.5)" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={i * 130} y={860} width={65} height={140} fill="rgba(255,255,255,.05)" />
      ))}
      <path d="M0,860 H780" stroke="rgba(255,255,255,.5)" strokeWidth={5} />

      <defs>
        <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,240,190,.30)" />
          <stop offset="100%" stopColor="rgba(255,240,190,0)" />
        </linearGradient>
      </defs>
    </>,
  );
};

/* ------------------------------------------------------------------ *
 * 5 · KAUWGOM
 * ------------------------------------------------------------------ */

const CORNERS = [
  { x: 0, y: 0 },
  { x: 780, y: 0 },
  { x: 780, y: 1000 },
  { x: 0, y: 1000 },
];

const Kauwgom: React.FC<{ index: number; paint: PagePaint }> = ({ index, paint }) => {
  const origin = CORNERS[index % CORNERS.length];
  const badge = CORNERS[(index + 2) % CORNERS.length];

  return frame(
    <>
      {Array.from({ length: 18 }, (_, i) => {
        const a0 = ((i * 20 + index * 7) * Math.PI) / 180;
        const a1 = ((i * 20 + 9 + index * 7) * Math.PI) / 180;
        return (
          <polygon
            key={i}
            points={`${origin.x},${origin.y} ${origin.x + Math.cos(a0) * 1600},${
              origin.y + Math.sin(a0) * 1600
            } ${origin.x + Math.cos(a1) * 1600},${origin.y + Math.sin(a1) * 1600}`}
            fill="#fff"
            opacity={0.12}
          />
        );
      })}

      <g
        transform={`translate(${badge.x + (badge.x ? -130 : 130)} ${
          badge.y + (badge.y ? -120 : 120)
        })`}
        opacity={0.5}
      >
        <polygon
          points={Array.from({ length: 24 }, (_, i) => {
            const a = ((i * 15 + index * 5) * Math.PI) / 180;
            const r = i % 2 ? 62 : 122;
            return `${Math.cos(a) * r},${Math.sin(a) * r}`;
          }).join(' ')}
          fill={paint.accent}
        />
        <circle r={58} fill={paint.a} />
      </g>

      {Array.from({ length: 7 }, (_, row) =>
        Array.from({ length: 7 }, (_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={index % 2 ? 16 + col * 30 : 780 - col * 30 - 16}
            cy={row * 30 + 16}
            r={Math.max(1.5, 9 - (row + col) * 0.9)}
            fill={paint.accent}
            opacity={0.5}
          />
        )),
      )}

      <g opacity={0.18}>
        <Ball cx={index % 2 ? 640 : 140} cy={560} r={120} fill="#fff" ink={paint.b} />
      </g>
    </>,
  );
};

/* ------------------------------------------------------------------ *
 * 6 · OLYMPUS — the page dressed to its players
 * ------------------------------------------------------------------ */

const Olymp: React.FC<{ level: number; paint: PagePaint }> = ({ level, paint }) => {
  const gold = paint.accent;

  /* 0 · MODDER — a ploughed field, straw, a broken fence. */
  if (level === 0) {
    return frame(
      <>
        {Array.from({ length: 26 }, (_, i) => (
          <path
            key={i}
            d={`M0,${120 + i * 34} Q390,${104 + i * 34} 780,${124 + i * 34}`}
            stroke="rgba(0,0,0,.14)"
            strokeWidth={7}
            fill="none"
          />
        ))}
        {Array.from({ length: 30 }, (_, i) => {
          const x = ((i * 137) % 740) + 20;
          const y = ((i * 219) % 880) + 80;
          return (
            <path
              key={i}
              d={`M${x},${y} l${16 + (i % 3) * 8},${-7 - (i % 4) * 4}`}
              stroke={gold}
              strokeWidth={4}
              opacity={0.45}
            />
          );
        })}
        <g stroke="#3d3020" strokeWidth={13} opacity={0.55} strokeLinecap="square">
          <path d="M0,905 H780" />
          <path d="M0,955 H520" />
          {[70, 250, 430, 610].map((x) => (
            <path key={x} d={`M${x},860 V1000`} />
          ))}
        </g>
      </>,
    );
  }

  /* 1 · DORP — timber, rope and canvas awnings. */
  if (level === 1) {
    return frame(
      <>
        {Array.from({ length: 9 }, (_, i) => (
          <rect
            key={i}
            x={0}
            y={i * 112}
            width={780}
            height={112}
            fill={i % 2 ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.045)'}
          />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <path
            key={i}
            d={`M0,${i * 112} H780`}
            stroke="rgba(0,0,0,.28)"
            strokeWidth={3}
          />
        ))}
        {Array.from({ length: 13 }, (_, i) => (
          <polygon
            key={i}
            points={`${i * 62},0 ${i * 62 + 62},0 ${i * 62 + 62},60 ${i * 62},60`}
            fill={i % 2 ? gold : 'rgba(255,255,255,.28)'}
            opacity={0.55}
          />
        ))}
        <path
          d="M0,86 Q195,128 390,86 T780,86"
          stroke={gold}
          strokeWidth={7}
          fill="none"
          opacity={0.7}
        />
      </>,
    );
  }

  /* 2 · BURCHT — ashlar stonework and iron studs. */
  if (level === 2) {
    const rows = 10;
    return frame(
      <>
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: 5 }, (_, c) => {
            const w = 168;
            const x = c * w - (r % 2 ? w / 2 : 0);
            const y = r * 100;
            return (
              <rect
                key={`${r}-${c}`}
                x={x + 4}
                y={y + 4}
                width={w - 8}
                height={92}
                rx={3}
                fill={r % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.07)'}
                stroke="rgba(0,0,0,.22)"
                strokeWidth={3}
              />
            );
          }),
        )}
        {Array.from({ length: 12 }, (_, i) => (
          <circle
            key={i}
            cx={70 + (i % 4) * 214}
            cy={150 + Math.floor(i / 4) * 320}
            r={10}
            fill="rgba(0,0,0,.3)"
            stroke={gold}
            strokeWidth={3}
          />
        ))}
      </>,
    );
  }

  /* 3 · PALEIS — fluted marble columns and a laurel swag. */
  if (level === 3) {
    const column = (x: number) => (
      <g key={x}>
        <rect x={x - 46} y={120} width={92} height={760} fill="rgba(255,255,255,.34)" />
        {Array.from({ length: 5 }, (_, i) => (
          <path
            key={i}
            d={`M${x - 34 + i * 17},130 V870`}
            stroke="rgba(0,0,0,.09)"
            strokeWidth={5}
          />
        ))}
        <rect x={x - 62} y={92} width={124} height={34} rx={4} fill="rgba(255,255,255,.5)" />
        <rect x={x - 62} y={876} width={124} height={34} rx={4} fill="rgba(255,255,255,.5)" />
      </g>
    );
    return frame(
      <>
        {Array.from({ length: 18 }, (_, i) => (
          <path
            key={i}
            d={`M${-100 + i * 60},0 L${120 + i * 60},1000`}
            stroke="rgba(255,255,255,.07)"
            strokeWidth={2}
          />
        ))}
        {[86, 694].map(column)}
        <g transform="translate(390 190)">
          <Laurel colour={gold} opacity={0.4} />
        </g>
      </>,
    );
  }

  /* 4 · OLYMPUS — sunburst, cloudbank and a gold wreath. */
  return frame(
    <>
      {Array.from({ length: 32 }, (_, i) => {
        const a0 = ((i * 11.25 - 90) * Math.PI) / 180;
        const a1 = ((i * 11.25 - 85) * Math.PI) / 180;
        return (
          <polygon
            key={i}
            points={`390,140 ${390 + Math.cos(a0) * 1500},${140 + Math.sin(a0) * 1500} ${
              390 + Math.cos(a1) * 1500
            },${140 + Math.sin(a1) * 1500}`}
            fill={gold}
            opacity={0.09}
          />
        );
      })}

      <circle cx={390} cy={140} r={96} fill={gold} opacity={0.22} />
      <circle cx={390} cy={140} r={62} fill={gold} opacity={0.3} />

      <g transform="translate(390 470) scale(1.5)">
        <Laurel colour={gold} opacity={0.28} />
      </g>

      {/* Cloudbank along the foot — Olympus sits above the weather. */}
      {[
        { cx: 120, cy: 940, s: 1.15 },
        { cx: 400, cy: 972, s: 1.45 },
        { cx: 660, cy: 930, s: 1 },
        { cx: 250, cy: 1000, s: 1.3 },
        { cx: 560, cy: 1002, s: 1.2 },
      ].map((c, i) => (
        <g key={i} transform={`translate(${c.cx} ${c.cy}) scale(${c.s})`} opacity={0.5}>
          <ellipse rx={112} ry={40} fill="#ffffff" />
          <ellipse cx={-62} cy={14} rx={64} ry={30} fill="#ffffff" />
          <ellipse cx={64} cy={16} rx={72} ry={32} fill="#ffffff" />
          <ellipse cx={4} cy={-26} rx={56} ry={34} fill="#ffffff" />
        </g>
      ))}
    </>,
  );
};

/* ------------------------------------------------------------------ */

interface AlbumDecorProps {
  style: AlbumStyle;
  /** Page index, so no two pages compose the same way. */
  index: number;
  /** Olympus only: which of the five worlds this page's players belong to. */
  level: number;
  paint?: PagePaint;
}

const AlbumDecor: React.FC<AlbumDecorProps> = ({ style, index, level, paint }) => {
  if (!paint) return null;

  switch (style) {
    case 'panini':
      return <Panini index={index} paint={paint} />;
    case 'veld':
      return <Veld index={index} paint={paint} />;
    case 'stadion':
      return <Stadion index={index} paint={paint} />;
    case 'kauwgom':
      return <Kauwgom index={index} paint={paint} />;
    case 'olymp':
      return <Olymp level={level} paint={paint} />;
    default:
      /* `leder` is the plain baseline — its page furniture is CSS only. */
      return null;
  }
};

export default AlbumDecor;
