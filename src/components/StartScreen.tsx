import { useState } from 'react';

interface Props {
  onStart: (playerCount: number, size: number) => void;
}

export function StartScreen({ onStart }: Props) {
  const [players, setPlayers] = useState(2);
  const [size, setSize] = useState(6);

  return (
    <div className="modal-backdrop">
      <div className="modal start">
        <div className="modal-label">Chain Reaction</div>
        <div className="sub">Place atoms. Overflow a cell → chain reaction. Last one standing wins.</div>
        <div className="field">
          <label>Players</label>
          <div className="pill-row">
            {[2, 3, 4, 5, 6, 7, 8].map((n) => (
              <button
                key={n}
                className={`pill${n === players ? ' active' : ''}`}
                onClick={() => setPlayers(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Board</label>
          <div className="pill-row">
            {[5, 6, 7, 8].map((n) => (
              <button
                key={n}
                className={`pill${n === size ? ' active' : ''}`}
                onClick={() => setSize(n)}
              >
                {n}×{n}
              </button>
            ))}
          </div>
        </div>
        <button className="start-btn" onClick={() => onStart(players, size)}>
          Start
        </button>
      </div>
    </div>
  );
}
