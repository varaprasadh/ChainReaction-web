import type { Player } from '../game/types';

interface Props {
  players: Player[];
  current: Player;
  counts: Map<string, number>;
  eliminated: Set<string>;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
}

export function HUD({
  players,
  current,
  counts,
  eliminated,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
}: Props) {
  return (
    <div className="hud">
      <div className="hud-title">Chain Reaction</div>
      <div className="players">
        {players.map((p) => {
          const isCurrent = p.id === current.id;
          const isOut = eliminated.has(p.id);
          return (
            <div
              key={p.id}
              className={`player${isCurrent ? ' current' : ''}${isOut ? ' out' : ''}`}
              style={{ ['--c' as string]: p.color }}
            >
              {isCurrent && <span className="caret" aria-hidden>▸</span>}
              <span className="dot" style={{ background: p.color }} />
              <span className="name">{p.name}</span>
              <span className="count">{counts.get(p.id) ?? 0}</span>
            </div>
          );
        })}
      </div>
      <div className="actions">
        <button className="icon-btn" onClick={onUndo} disabled={!canUndo} title="Undo (⌘Z)">
          ↶
        </button>
        <button className="icon-btn" onClick={onRedo} disabled={!canRedo} title="Redo (⇧⌘Z)">
          ↷
        </button>
        <button className="reset" onClick={onReset}>
          Exit
        </button>
      </div>
    </div>
  );
}
