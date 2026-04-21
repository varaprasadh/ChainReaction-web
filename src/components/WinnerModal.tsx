import { useState, type ReactNode } from 'react';
import type { Player } from '../game/types';
import {
  APP_URL,
  composeShareImage,
  copyShareLink,
  nativeShare,
  shareText,
} from '../utils/share';

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
  chart?: ReactNode;
}

export function WinnerModal({ winner, onPlayAgain, primaryLabel = 'Play again', rematch, chart }: Props) {
  const voted = rematch ? !!rematch.votes[rematch.myUid] : false;
  const agreed = rematch ? rematch.seatUids.filter((u) => rematch.votes[u]).length : 0;
  const total = rematch?.seatUids.length ?? 0;

  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function flashToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 2000);
  }

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    const blob = await composeShareImage({
      winnerName: winner.name,
      winnerColor: winner.color,
    });
    const text = shareText(winner.name);
    const result = await nativeShare(blob, text, APP_URL);
    if (result === 'unsupported' || result === 'failed') {
      const copied = await copyShareLink(text, APP_URL);
      flashToast(copied ? 'Link copied' : 'Copy failed');
    }
    setSharing(false);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ boxShadow: `0 0 80px ${winner.color}` }}>
        <div className="winner-ring" style={{ background: winner.color }} />
        <div className="modal-label">Winner</div>
        <div className="modal-name" style={{ color: winner.color }}>
          {winner.name}
        </div>

        {chart}

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
              <button className="ghost-btn" onClick={handleShare} disabled={sharing}>
                {sharing ? 'Preparing…' : 'Share'}
              </button>
              <button className="ghost-btn" onClick={rematch.onCancel}>
                Exit
              </button>
            </div>
          </>
        ) : (
          <div className="modal-actions">
            <button onClick={onPlayAgain} style={{ background: winner.color }}>
              {primaryLabel}
            </button>
            <button className="ghost-btn" onClick={handleShare} disabled={sharing}>
              {sharing ? 'Preparing…' : 'Share'}
            </button>
          </div>
        )}

        {toast && <div className="inline-toast">{toast}</div>}
      </div>
    </div>
  );
}
