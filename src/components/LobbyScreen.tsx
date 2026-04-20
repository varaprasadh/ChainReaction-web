import { useMemo, useState } from 'react';
import type { Room } from '../net/room';

interface Props {
  room: Room;
  uid: string;
  shareUrl: string;
  canStart: boolean;
  onStart: () => void;
  onLeave: () => void;
  onKick?: (seatIdx: number) => void;
}

const PALETTE = ['#ff3b6b', '#ffb84d', '#4dd0ff', '#66e07a', '#c477ff', '#f5f26e', '#ff7a3d', '#7af0c5'];

export function LobbyScreen({ room, uid, shareUrl, canStart, onStart, onLeave, onKick }: Props) {
  const isHost = room.hostUid === uid;
  const [copied, setCopied] = useState(false);
  const seats = useMemo(() => {
    const out: Array<{ idx: number; seat: { uid: string; name: string } | null }> = [];
    for (let i = 0; i < room.config.players; i++) {
      out.push({ idx: i, seat: room.seats?.[String(i)] ?? null });
    }
    return out;
  }, [room]);

  const filled = seats.filter((s) => s.seat).length;

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal start lobby">
        <div className="modal-label">Room</div>
        <div className="room-code">{room.id}</div>

        <div className="field">
          <label>
            Players ({filled}/{room.config.players})
          </label>
          <div className="seats">
            {seats.map(({ idx, seat }) => {
              const canKick = isHost && !!seat && seat.uid !== uid && !!onKick;
              return (
                <div
                  key={idx}
                  className={`seat${seat ? ' taken' : ' empty'}${seat?.uid === uid ? ' me' : ''}`}
                  style={{ borderColor: PALETTE[idx] }}
                >
                  <span className="dot" style={{ background: PALETTE[idx] }} />
                  <span className="name">
                    {seat ? seat.name : 'Waiting…'}
                    {seat?.uid === uid ? ' (you)' : ''}
                  </span>
                  {canKick && (
                    <button
                      className="kick-btn"
                      title="Remove player"
                      onClick={() => onKick?.(idx)}
                      aria-label={`Remove ${seat!.name}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="share-row">
          <input className="share-input" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
          <button className={`copy-btn${copied ? ' success' : ''}`} onClick={copy}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        <div className="lobby-actions">
          <button className="ghost-btn danger" onClick={onLeave}>
            Leave
          </button>
          {canStart && (
            <button className="start-btn" disabled={filled < 2} onClick={onStart}>
              Start ({filled})
            </button>
          )}
          {!canStart && <div className="waiting">Waiting for host…</div>}
        </div>
      </div>
    </div>
  );
}
