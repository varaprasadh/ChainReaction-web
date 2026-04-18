import type { Player } from '../game/types';

interface Props {
  winner: Player;
  onPlayAgain: () => void;
}

export function WinnerModal({ winner, onPlayAgain }: Props) {
  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ boxShadow: `0 0 80px ${winner.color}` }}>
        <div className="winner-ring" style={{ background: winner.color }} />
        <div className="modal-label">Winner</div>
        <div className="modal-name" style={{ color: winner.color }}>
          {winner.name}
        </div>
        <button onClick={onPlayAgain} style={{ background: winner.color }}>
          Play again
        </button>
      </div>
    </div>
  );
}
