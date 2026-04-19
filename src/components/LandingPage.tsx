import { useState } from 'react';
import { HowToPlay } from './HowToPlay';

interface Props {
  onPlay: () => void;
}

export function LandingPage({ onPlay }: Props) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden />

      <header className="landing-nav">
        <div className="brand">
          <span className="brand-dot" />
          Chain Reaction
        </div>
        <a
          className="nav-link"
          href="https://github.com/varaprasadh/ChainReaction-web"
          target="_blank"
          rel="noreferrer"
        >
          GitHub ↗
        </a>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="kicker">3D strategy · 2–8 players</div>
          <h1>
            Overflow a cell. <br />
            Detonate the board.
          </h1>
          <p className="lede">
            Claim cells by dropping atoms. When a cell exceeds its capacity, it
            erupts into every neighbor and steals them. One explosion triggers
            the next. Last color standing wins.
          </p>
          <div className="cta-row">
            <button className="primary-cta" onClick={onPlay}>
              Play now
            </button>
            <button className="secondary-cta" onClick={() => setShowHelp(true)}>
              How to play
            </button>
          </div>
          <div className="chips">
            <span className="chip">Local hotseat</span>
            <span className="chip">Online rooms</span>
            <span className="chip">AI opponent</span>
            <span className="chip">Chat + rematch</span>
          </div>
        </div>

        <div className="hero-art">
          <HeroArt />
        </div>
      </section>

      <section className="features">
        <Feature
          title="Face a friend"
          desc="Local hotseat for up to 8 players — or challenge the built-in AI at Easy, Medium, or Hard."
          icon="👥"
        />
        <Feature
          title="Play online"
          desc="Spin up a room with a short code, share the link, and see every explosion live with realtime chat."
          icon="🌐"
        />
        <Feature
          title="Cinematic chain"
          desc="Molecules tumble in 3D, cascades ripple across the grid, and each win gets its own share card."
          icon="💥"
        />
      </section>

      <section className="howto">
        <div className="howto-title">How it plays</div>
        <div className="howto-steps">
          <Step n={1} title="Drop an atom" desc="Click any empty cell or one you already own." />
          <Step n={2} title="Fill the cell" desc="Corners hold 1, edges hold 2, middles hold 3." />
          <Step n={3} title="Trigger the chain" desc="One more atom — explodes into neighbors and steals them." />
        </div>
      </section>

      <section className="closing">
        <h2>Quick game, sharp mind.</h2>
        <p>Matches take a few minutes. One overflow can flip the whole board.</p>
        <button className="primary-cta" onClick={onPlay}>
          Start a match
        </button>
      </section>

      <footer className="landing-footer">
        <span>© Chain Reaction · web</span>
      </footer>

      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}
    </div>
  );
}

function Feature({ title, desc, icon }: { title: string; desc: string; icon: string }) {
  return (
    <div className="feature">
      <div className="feature-icon" aria-hidden>
        {icon}
      </div>
      <div className="feature-title">{title}</div>
      <div className="feature-desc">{desc}</div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="step">
      <div className="step-n">{n}</div>
      <div>
        <div className="step-title">{title}</div>
        <div className="step-desc">{desc}</div>
      </div>
    </div>
  );
}

function HeroArt() {
  const CELL = 58;
  const ORIGIN_X = 16;
  const ORIGIN_Y = 16;
  const cellCenter = (r: number, c: number): [number, number] => [
    ORIGIN_X + c * CELL + CELL / 2,
    ORIGIN_Y + r * CELL + CELL / 2,
  ];

  const CENTER = cellCenter(2, 2);
  const NEIGHBORS: Array<{ r: number; c: number; dx: number; dy: number; delay: string }> = [
    { r: 1, c: 2, dx: 0, dy: -CELL, delay: '0s' },
    { r: 3, c: 2, dx: 0, dy: CELL, delay: '0.06s' },
    { r: 2, c: 1, dx: -CELL, dy: 0, delay: '0.12s' },
    { r: 2, c: 3, dx: CELL, dy: 0, delay: '0.18s' },
  ];

  return (
    <svg viewBox="0 0 320 320" className="hero-svg">
      <defs>
        <radialGradient id="glow-red" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff3b6b" stopOpacity="1" />
          <stop offset="100%" stopColor="#ff3b6b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="glow-blue" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4dd0ff" stopOpacity="1" />
          <stop offset="100%" stopColor="#4dd0ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g transform="translate(16 16)" opacity="0.75">
        {Array.from({ length: 5 }).map((_, r) =>
          Array.from({ length: 5 }).map((_, c) => (
            <rect
              key={`${r}-${c}`}
              x={c * CELL}
              y={r * CELL}
              width={CELL - 4}
              height={CELL - 4}
              rx={6}
              fill="rgba(255,255,255,0.02)"
              stroke="rgba(255,59,107,0.28)"
              strokeWidth={1}
            />
          )),
        )}
      </g>

      {/* Enemy red atoms at neighbor cells - get stolen by blue explosion */}
      {NEIGHBORS.map((n) => {
        const [cx, cy] = cellCenter(n.r, n.c);
        return (
          <g key={`enemy-${n.r}-${n.c}`} transform={`translate(${cx} ${cy})`}>
            <circle r={12} fill="#ff3b6b" className="hero-enemy" />
          </g>
        );
      })}

      {/* Red duo (passive spinner, top-left corner) */}
      <g transform="translate(45 97)">
        <g className="hero-spin spin-a">
          <circle cx={-9} cy={1} r={14} fill="#ff3b6b" className="hero-atom" />
          <circle cx={9} cy={-1} r={14} fill="#ff3b6b" opacity="0.9" className="hero-atom" />
        </g>
      </g>

      {/* Yellow lone (passive bob) */}
      <g transform="translate(280 45)">
        <circle cx={0} cy={0} r={12} fill="#f5f26e" className="hero-bob" />
      </g>

      {/* Purple trio (passive spinner) */}
      <g transform="translate(45 275)">
        <g className="hero-spin spin-c">
          <circle cx={-9} cy={-5} r={14} fill="#c477ff" className="hero-atom" />
          <circle cx={9} cy={-7} r={14} fill="#c477ff" opacity="0.9" className="hero-atom" />
          <circle cx={0} cy={13} r={14} fill="#c477ff" opacity="0.85" className="hero-atom" />
        </g>
      </g>

      {/* Blast ring at center cell */}
      <g transform={`translate(${CENTER[0]} ${CENTER[1]})`}>
        <circle r={22} className="hero-blast-ring" stroke="#4dd0ff" />
      </g>

      {/* Blue core compound - fades on explosion */}
      <g transform={`translate(${CENTER[0]} ${CENTER[1]})`}>
        <g className="hero-core">
          <g className="hero-spin spin-b">
            <circle cx={-9} cy={-5} r={14} fill="#4dd0ff" className="hero-atom" />
            <circle cx={9} cy={-7} r={14} fill="#4dd0ff" opacity="0.9" className="hero-atom" />
            <circle cx={0} cy={13} r={14} fill="#4dd0ff" opacity="0.85" className="hero-atom" />
          </g>
        </g>
      </g>

      {/* Shrapnel atoms flying from center to neighbors */}
      {NEIGHBORS.map((n, i) => (
        <g key={`shrap-${i}`} transform={`translate(${CENTER[0]} ${CENTER[1]})`}>
          <g
            className="hero-shrapnel"
            style={
              {
                ['--dx' as string]: `${n.dx}px`,
                ['--dy' as string]: `${n.dy}px`,
              } as React.CSSProperties
            }
          >
            <circle r={14} fill="#4dd0ff" />
          </g>
        </g>
      ))}
    </svg>
  );
}
