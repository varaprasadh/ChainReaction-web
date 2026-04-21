import { useState } from 'react';
import type { Player } from '../game/types';
import { HowToPlay } from './HowToPlay';
import { ConfirmModal } from './ConfirmModal';

interface Props {
  players: Player[];
  current: Player;
  counts: Map<string, number>;
  eliminated: Set<string>;
  onReset: () => void;
  mineId?: string;
  statusText?: string | null;
  isHost?: boolean;
  onKick?: (seatIdx: number) => void;
}

export function HUD({ players, current, counts, eliminated, onReset, mineId, statusText, isHost, onKick }: Props) {
  const [showHelp, setShowHelp] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmKick, setConfirmKick] = useState<{ seatIdx: number; name: string } | null>(null);

  return (
    <div className="hud">
      <div className="hud-title">Chain Reaction</div>
      <div className="players">
        {players.map((p) => {
          const isCurrent = p.id === current.id;
          const isOut = eliminated.has(p.id);
          const isMine = mineId !== undefined && p.id === mineId;
          const canKick = !!isHost && !isMine && !isOut && !!onKick;
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
              {canKick && (
                <button
                  className="kick-btn"
                  title="Remove player"
                  aria-label={`Remove ${p.name}`}
                  onClick={() => setConfirmKick({ seatIdx: Number(p.id), name: p.name })}
                >
                  ×
                </button>
              )}
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
        <button
          className="icon-btn"
          onClick={() => setShowHelp(true)}
          title="How to play"
        >
          ?
        </button>
        <button className="reset" onClick={() => setConfirmExit(true)}>
          Exit
        </button>
      </div>
      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}
      {confirmExit && (
        <ConfirmModal
          title="Exit game"
          message="Leave this game? Your progress will be lost."
          confirmLabel="Exit"
          cancelLabel="Stay"
          danger
          onConfirm={() => {
            setConfirmExit(false);
            onReset();
          }}
          onCancel={() => setConfirmExit(false)}
        />
      )}
      {confirmKick && (
        <ConfirmModal
          title="Remove player"
          message={`Remove ${confirmKick.name} from the game? They won't be able to rejoin.`}
          confirmLabel="Remove"
          cancelLabel="Cancel"
          danger
          onConfirm={() => {
            onKick?.(confirmKick.seatIdx);
            setConfirmKick(null);
          }}
          onCancel={() => setConfirmKick(null)}
        />
      )}
    </div>
  );
}
