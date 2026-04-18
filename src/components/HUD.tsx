import type { Player } from '../game/types';

interface Props {
  players: Player[];
  current: Player;
  counts: Map<string, number>;
  eliminated: Set<string>;
  onReset: () => void;
  mineId?: string;
  statusText?: string | null;
}

export function HUD({ players, current, counts, eliminated, onReset, mineId, statusText }: Props) {
  return (
    <div className="hud">
      <div className="hud-title">Chain Reaction</div>
      <div className="players">
        {players.map((p) => {
          const isCurrent = p.id === current.id;
          const isOut = eliminated.has(p.id);
          const isMine = mineId !== undefined && p.id === mineId;
          return (
            <div
              key={p.id}
              className={`player${isCurrent ? ' current' : ''}${isOut ? ' out' : ''}${isMine ? ' mine' : ''}`}
              style={{ ['--c' as string]: p.color }}
            >
              {isCurrent && <span className="caret" aria-hidden>▸</span>}
              <span className="dot" style={{ background: p.color }} />
              <span className="name">{p.name}</span>
              {isMine && <span className="you-tag">you</span>}
              <span className="count">{counts.get(p.id) ?? 0}</span>
            </div>
          );
        })}
      </div>
      {statusText && (
        <div
          className={`turn-status${mineId && current.id === mineId ? ' own' : ''}`}
          style={{ ['--c' as string]: current.color }}
        >
          {statusText}
        </div>
      )}
      <div className="actions">
        <button className="reset" onClick={onReset}>
          Exit
        </button>
      </div>
    </div>
  );
}
