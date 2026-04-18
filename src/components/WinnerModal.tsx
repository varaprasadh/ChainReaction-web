import type { Player } from '../game/types';

interface RematchState {
  myUid: string;
  seatUids: string[];
  votes: Record<string, boolean>;
  seatNames: Record<string, string>;
  onVote: () => void;
  onCancel: () => void;
}

interface Props {
  winner: Player;
  onPlayAgain: () => void;
  primaryLabel?: string;
  rematch?: RematchState;
}

export function WinnerModal({ winner, onPlayAgain, primaryLabel = 'Play again', rematch }: Props) {
  const voted = rematch ? !!rematch.votes[rematch.myUid] : false;
  const agreed = rematch ? rematch.seatUids.filter((u) => rematch.votes[u]).length : 0;
  const total = rematch?.seatUids.length ?? 0;

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ boxShadow: `0 0 80px ${winner.color}` }}>
        <div className="winner-ring" style={{ background: winner.color }} />
        <div className="modal-label">Winner</div>
        <div className="modal-name" style={{ color: winner.color }}>
          {winner.name}
        </div>

        {rematch ? (
          <>
            {voted ? (
              <div className="rematch-status">
                Waiting for rematch… {agreed}/{total} ready
                <div className="rematch-dots">
                  {rematch.seatUids.map((uid) => (
                    <span
                      key={uid}
                      className={`rematch-dot${rematch.votes[uid] ? ' on' : ''}`}
                      title={rematch.seatNames[uid] ?? 'Player'}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="sub" style={{ marginBottom: 18 }}>
                {rematch.votes && Object.keys(rematch.votes).length > 0
                  ? 'Someone wants a rematch.'
                  : 'Up for another round?'}
              </div>
            )}
            <div className="modal-actions">
              <button
                onClick={voted ? rematch.onCancel : rematch.onVote}
                style={{ background: voted ? '#6a6f92' : winner.color }}
              >
                {voted ? 'Cancel' : 'Rematch'}
              </button>
              <button className="ghost-btn" onClick={rematch.onCancel}>
                Exit
              </button>
            </div>
          </>
        ) : (
          <button onClick={onPlayAgain} style={{ background: winner.color }}>
            {primaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
