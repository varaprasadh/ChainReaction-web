interface Props {
  onClose: () => void;
}

const RED = '#ff3b6b';
const BLUE = '#4dd0ff';

function Cell({
  x,
  y,
  color,
  atoms = 0,
  highlight,
}: {
  x: number;
  y: number;
  color?: string;
  atoms?: number;
  highlight?: boolean;
}) {
  const s = 36;
  const positions: Record<number, Array<[number, number]>> = {
    1: [[18, 18]],
    2: [
      [12, 18],
      [24, 18],
    ],
    3: [
      [12, 12],
      [24, 12],
      [18, 26],
    ],
  };
  const pts = positions[atoms] ?? [];
  return (
    <g transform={`translate(${x},${y})`}>
      <rect
        width={s}
        height={s}
        fill={highlight ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)'}
        stroke={highlight ? '#fff' : 'rgba(255,255,255,0.25)'}
        strokeWidth={highlight ? 1.5 : 1}
        rx={4}
      />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={5} fill={color ?? '#fff'} />
      ))}
    </g>
  );
}

function CapacityDiagram() {
  return (
    <svg viewBox="0 0 152 152" className="htp-svg">
      <Cell x={4} y={4} atoms={1} color={RED} highlight />
      <Cell x={40} y={4} atoms={2} color={BLUE} highlight />
      <Cell x={76} y={4} atoms={2} color={BLUE} highlight />
      <Cell x={112} y={4} atoms={1} color={RED} highlight />

      <Cell x={4} y={40} atoms={2} color={BLUE} highlight />
      <Cell x={40} y={40} atoms={3} color="#f5f26e" highlight />
      <Cell x={76} y={40} atoms={3} color="#f5f26e" highlight />
      <Cell x={112} y={40} atoms={2} color={BLUE} highlight />

      <Cell x={4} y={76} atoms={2} color={BLUE} highlight />
      <Cell x={40} y={76} atoms={3} color="#f5f26e" highlight />
      <Cell x={76} y={76} atoms={3} color="#f5f26e" highlight />
      <Cell x={112} y={76} atoms={2} color={BLUE} highlight />

      <Cell x={4} y={112} atoms={1} color={RED} highlight />
      <Cell x={40} y={112} atoms={2} color={BLUE} highlight />
      <Cell x={76} y={112} atoms={2} color={BLUE} highlight />
      <Cell x={112} y={112} atoms={1} color={RED} highlight />
    </svg>
  );
}

function ExplodeSeq() {
  return (
    <div className="htp-seq">
      <svg viewBox="0 0 116 44" className="htp-svg-wide">
        <Cell x={4} y={4} />
        <Cell x={40} y={4} atoms={3} color={RED} highlight />
        <Cell x={76} y={4} />
      </svg>
      <div className="htp-arrow">→</div>
      <svg viewBox="0 0 116 44" className="htp-svg-wide">
        <Cell x={4} y={4} atoms={1} color={RED} />
        <Cell x={40} y={4} atoms={1} color={RED} highlight />
        <Cell x={76} y={4} atoms={1} color={RED} />
      </svg>
    </div>
  );
}

function CaptureSeq() {
  return (
    <div className="htp-seq">
      <svg viewBox="0 0 116 44" className="htp-svg-wide">
        <Cell x={4} y={4} atoms={1} color={BLUE} />
        <Cell x={40} y={4} atoms={3} color={RED} highlight />
        <Cell x={76} y={4} atoms={1} color={BLUE} />
      </svg>
      <div className="htp-arrow">→</div>
      <svg viewBox="0 0 116 44" className="htp-svg-wide">
        <Cell x={4} y={4} atoms={2} color={RED} />
        <Cell x={40} y={4} atoms={1} color={RED} highlight />
        <Cell x={76} y={4} atoms={2} color={RED} />
      </svg>
    </div>
  );
}

export function HowToPlay({ onClose }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal htp" onClick={(e) => e.stopPropagation()}>
        <div className="modal-label">How to play</div>

        <div className="htp-section">
          <div className="htp-step">1</div>
          <div className="htp-body">
            <h3>Click a cell to drop an atom</h3>
            <p>You can only drop on empty cells or your own color.</p>
          </div>
        </div>

        <div className="htp-section">
          <div className="htp-step">2</div>
          <div className="htp-body">
            <h3>Each cell has a capacity</h3>
            <p>
              <span className="dot" style={{ background: RED }} /> Corners hold 1 &nbsp;
              <span className="dot" style={{ background: BLUE }} /> Edges hold 2 &nbsp;
              <span className="dot" style={{ background: '#f5f26e' }} /> Middle holds 3
            </p>
            <div className="htp-diagram">
              <CapacityDiagram />
            </div>
          </div>
        </div>

        <div className="htp-section">
          <div className="htp-step">3</div>
          <div className="htp-body">
            <h3>Overflow = explosion</h3>
            <p>One atom flies to each neighbor. Chain reactions cascade.</p>
            <ExplodeSeq />
          </div>
        </div>

        <div className="htp-section">
          <div className="htp-step">4</div>
          <div className="htp-body">
            <h3>Explosions steal enemy cells</h3>
            <p>Any neighbor hit by your explosion becomes yours.</p>
            <CaptureSeq />
          </div>
        </div>

        <div className="htp-section">
          <div className="htp-step">★</div>
          <div className="htp-body">
            <h3>Last player standing wins</h3>
            <p>Eliminate opponents by taking all their atoms. Last one with atoms wins.</p>
          </div>
        </div>

        <button className="start-btn" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
