import { useMemo } from 'react';
import type { Player } from '../game/types';

interface Props {
  players: Player[];
  atomHistory: Array<Map<string, number>>;
  eliminated: Set<string>;
  winnerId?: string;
}

const WIDTH = 320;
const HEIGHT = 200;
const PAD_L = 42;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 34;

function jitter(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function computeCortisol(
  player: Player,
  history: Array<Map<string, number>>,
  eliminated: Set<string>,
  winnerId?: string,
): number[] {
  if (history.length === 0) return [20];
  const pid = player.id;
  const vals: number[] = [];
  let peak = 0;
  let prev = 0;
  let wasOut = false;
  for (let i = 0; i < history.length; i++) {
    const cnt = history[i].get(pid) ?? 0;
    peak = Math.max(peak, cnt);
    const delta = cnt - prev;
    let c = 28;
    if (peak > 0) c += Math.min(45, ((peak - cnt) / Math.max(peak, 1)) * 55);
    if (delta < 0) c += Math.min(30, -delta * 9);
    if (delta > 0) c -= Math.min(14, delta * 4);
    if (cnt === 0 && i > 1) c += 22;
    if (cnt >= 8) c += 12;
    if (cnt >= 14) c += 14;
    c += (jitter(i * 37 + Number(pid) * 7) - 0.5) * 8;
    if (!wasOut && i > 0 && history[i - 1].get(pid) === undefined) {
      wasOut = false;
    }
    c = Math.max(4, Math.min(100, c));
    vals.push(c);
    prev = cnt;
  }
  if (eliminated.has(pid)) {
    vals[vals.length - 1] = Math.min(100, (vals[vals.length - 1] ?? 50) + 35);
  }
  if (winnerId === pid && vals.length > 1) {
    vals[vals.length - 1] = Math.min(vals[vals.length - 1], 22);
  }
  return vals;
}

function pathFromValues(values: number[]): string {
  if (values.length === 0) return '';
  const n = values.length;
  const stepX = n > 1 ? (WIDTH - PAD_L - PAD_R) / (n - 1) : 0;
  const pts = values.map((v, i) => {
    const x = PAD_L + i * stepX;
    const y = PAD_T + (1 - v / 100) * (HEIGHT - PAD_T - PAD_B);
    return [x, y] as const;
  });
  if (pts.length === 1) {
    const [x, y] = pts[0];
    return `M ${x} ${y} L ${x + 4} ${y}`;
  }
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i][0]} ${pts[i][1]}`;
  }
  return d;
}

export function CortisolChart({ players, atomHistory, eliminated, winnerId }: Props) {
  const lines = useMemo(
    () =>
      players.map((p) => ({
        player: p,
        values: computeCortisol(p, atomHistory, eliminated, winnerId),
      })),
    [players, atomHistory, eliminated, winnerId],
  );

  const hasData = atomHistory.length > 0;

  return (
    <div className="cortisol-card">
      <div className="cortisol-head">
        <span className="cortisol-title">Cortisol levels</span>
        <span className="cortisol-unit">pg/mL</span>
      </div>
      <svg
        className="cortisol-svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        aria-label="Cortisol trend lines"
      >
        <defs>
          <pattern
            id="cortisol-grid"
            x={PAD_L}
            y={PAD_T}
            width={(WIDTH - PAD_L - PAD_R) / 10}
            height={(HEIGHT - PAD_T - PAD_B) / 4}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 0 0 L 0 ${(HEIGHT - PAD_T - PAD_B) / 4} M 0 0 L ${(WIDTH - PAD_L - PAD_R) / 10} 0`}
              fill="none"
              stroke="rgba(120,140,200,0.1)"
              strokeWidth={0.6}
            />
          </pattern>
        </defs>
        <rect
          x={PAD_L}
          y={PAD_T}
          width={WIDTH - PAD_L - PAD_R}
          height={HEIGHT - PAD_T - PAD_B}
          fill="rgba(6,8,20,0.55)"
        />
        <rect
          x={PAD_L}
          y={PAD_T}
          width={WIDTH - PAD_L - PAD_R}
          height={HEIGHT - PAD_T - PAD_B}
          fill="url(#cortisol-grid)"
        />
        {[0, 25, 50, 75, 100].map((v) => {
          const y = PAD_T + (1 - v / 100) * (HEIGHT - PAD_T - PAD_B);
          return (
            <g key={v}>
              <line
                x1={PAD_L}
                x2={WIDTH - PAD_R}
                y1={y}
                y2={y}
                stroke="rgba(180,200,255,0.14)"
                strokeWidth={1}
              />
              <text
                x={PAD_L - 6}
                y={y + 3}
                fill="rgba(200,205,235,0.6)"
                fontSize={9}
                textAnchor="end"
              >
                {v}
              </text>
            </g>
          );
        })}
        <line
          x1={PAD_L}
          x2={WIDTH - PAD_R}
          y1={HEIGHT - PAD_B}
          y2={HEIGHT - PAD_B}
          stroke="rgba(255,255,255,0.22)"
          strokeWidth={1}
        />
        <line
          x1={PAD_L}
          x2={PAD_L}
          y1={PAD_T}
          y2={HEIGHT - PAD_B}
          stroke="rgba(255,255,255,0.22)"
          strokeWidth={1}
        />
        <text
          x={PAD_L + (WIDTH - PAD_L - PAD_R) / 2}
          y={HEIGHT - 16}
          fill="rgba(200,205,235,0.75)"
          fontSize={10}
          fontWeight={600}
          letterSpacing={1.2}
          textAnchor="middle"
        >
          MOVES
        </text>
        <text
          x={PAD_L + (WIDTH - PAD_L - PAD_R) / 2}
          y={HEIGHT - 5}
          fill="rgba(160,170,210,0.45)"
          fontSize={8}
          textAnchor="middle"
          fontStyle="italic"
        >
          turn by turn
        </text>
        <text
          transform={`translate(12 ${PAD_T + (HEIGHT - PAD_T - PAD_B) / 2}) rotate(-90)`}
          fill="rgba(200,205,235,0.75)"
          fontSize={10}
          fontWeight={600}
          letterSpacing={1.2}
          textAnchor="middle"
        >
          CORTISOL LEVEL
        </text>
        {hasData &&
          lines.map(({ player, values }) => {
            const d = pathFromValues(values);
            return (
              <g key={player.id}>
                <path
                  d={d}
                  fill="none"
                  stroke={player.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.95}
                  style={{
                    filter: `drop-shadow(0 0 4px ${player.color})`,
                  }}
                />
              </g>
            );
          })}
      </svg>
      <div className="cortisol-legend">
        {players.map((p) => (
          <span key={p.id} className="cortisol-legend-item">
            <span className="cortisol-swatch" style={{ background: p.color }} />
            {p.name}
          </span>
        ))}
      </div>
      <div className="cortisol-disclaimer">* fictional numbers, real trauma</div>
    </div>
  );
}
