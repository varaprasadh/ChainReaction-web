import { useEffect, useMemo, useState } from 'react';
import { off, onValue, ref } from 'firebase/database';
import { db } from '../net/firebase';
import { ChainReaction } from '../game/engine';

interface RoomRaw {
  config?: { rows: number; cols: number; players: number };
  hostUid?: string;
  status?: 'lobby' | 'playing' | 'ended';
  seats?: Record<string, { uid: string; name: string } | null>;
  moves?: Record<string, { row: number; col: number; uid: string; seat: number; ts: number }>;
  chat?: Record<string, { uid: string; name: string; text: string; ts: number }>;
  createdAt?: number;
  generation?: number;
}

interface RoomStat {
  id: string;
  createdAt: number;
  status: string;
  size: number;
  configPlayers: number;
  seatedPlayers: string[];
  moveCount: number;
  chatCount: number;
  winner: string | null;
  generation: number;
}

interface Stats {
  total: number;
  lobby: number;
  playing: number;
  ended: number;
  totalMoves: number;
  totalChats: number;
  avgMoves: number;
  rows: RoomStat[];
  wins: Array<[string, number]>;
}

function computeStats(rooms: Record<string, RoomRaw>): Stats {
  const rows: RoomStat[] = [];
  let lobby = 0;
  let playing = 0;
  let ended = 0;
  let totalMoves = 0;
  let totalChats = 0;
  const winCounts = new Map<string, number>();

  for (const [id, raw] of Object.entries(rooms)) {
    const status = raw.status ?? 'lobby';
    const config = raw.config;
    if (!config) continue;

    const seatEntries = Object.entries(raw.seats ?? {})
      .filter(([, s]) => !!s)
      .map(([k, s]) => [Number(k), s as { uid: string; name: string }] as const)
      .sort((a, b) => a[0] - b[0]);
    const seatNames = seatEntries.map(([, s]) => s.name);

    const moveEntries = Object.entries(raw.moves ?? {})
      .map(([k, v]) => [k, v] as const)
      .sort((a, b) => a[0].localeCompare(b[0]));
    const moveCount = moveEntries.length;
    const chatCount = Object.keys(raw.chat ?? {}).length;

    if (status === 'lobby') lobby++;
    else if (status === 'playing') playing++;
    else ended++;

    totalMoves += moveCount;
    totalChats += chatCount;

    let winner: string | null = null;
    if (moveCount >= 2 && seatEntries.length >= 2) {
      try {
        const engine = new ChainReaction({
          rows: config.rows,
          cols: config.cols,
          players: config.players,
        });
        for (const [idx, seat] of seatEntries) {
          if (engine.players[idx]) {
            engine.players[idx] = { ...engine.players[idx], name: seat.name };
          }
        }
        for (const [, m] of moveEntries) {
          try {
            engine.place({ row: m.row, col: m.col });
          } catch {
            /* invalid move, skip */
          }
          if (engine.activePlayers().length === 1 && engine.moved.size >= 2) {
            winner = engine.activePlayers()[0].name;
            break;
          }
        }
      } catch {
        /* engine error */
      }
    }

    if (winner) winCounts.set(winner, (winCounts.get(winner) ?? 0) + 1);

    rows.push({
      id,
      createdAt: raw.createdAt ?? 0,
      status,
      size: config.rows,
      configPlayers: config.players,
      seatedPlayers: seatNames,
      moveCount,
      chatCount,
      winner,
      generation: raw.generation ?? 0,
    });
  }

  rows.sort((a, b) => b.createdAt - a.createdAt);
  const wins = [...winCounts.entries()].sort((a, b) => b[1] - a[1]);

  return {
    total: rows.length,
    lobby,
    playing,
    ended,
    totalMoves,
    totalChats,
    avgMoves: rows.length ? totalMoves / rows.length : 0,
    rows,
    wins,
  };
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="admin-stat">
      <div className="admin-stat-label">{label}</div>
      <div className="admin-stat-value">{value}</div>
    </div>
  );
}

function formatTime(ts: number): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const now = Date.now();
  const diffH = (now - ts) / 3600_000;
  if (diffH < 1) return `${Math.round((now - ts) / 60_000)}m ago`;
  if (diffH < 24) return `${Math.round(diffH)}h ago`;
  return d.toLocaleDateString();
}

interface Props {
  onExit: () => void;
}

export function AdminPage({ onExit }: Props) {
  const [rooms, setRooms] = useState<Record<string, RoomRaw>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const roomsRef = ref(db, 'rooms');
    const handler = onValue(
      roomsRef,
      (snap) => {
        setRooms((snap.val() as Record<string, RoomRaw>) ?? {});
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => off(roomsRef, 'value', handler);
  }, []);

  const stats = useMemo(() => computeStats(rooms), [rooms]);

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <div className="admin-kicker">Chain Reaction</div>
          <h1>Admin · live metrics</h1>
        </div>
        <button className="ghost-btn" onClick={onExit}>
          Exit
        </button>
      </header>

      {error ? (
        <div className="admin-empty">
          Cannot read /rooms — {error}. Add <code>".read": true</code> at the <code>rooms</code>{' '}
          level in your RTDB rules.
        </div>
      ) : loading ? (
        <div className="admin-empty">Loading…</div>
      ) : (
        <>
          <section className="admin-metrics">
            <Stat label="Total Rooms" value={stats.total} />
            <Stat label="Lobby" value={stats.lobby} />
            <Stat label="Playing" value={stats.playing} />
            <Stat label="Ended" value={stats.ended} />
            <Stat label="Moves" value={stats.totalMoves} />
            <Stat label="Chats" value={stats.totalChats} />
            <Stat label="Avg moves/game" value={stats.avgMoves.toFixed(1)} />
          </section>

          {stats.wins.length > 0 && (
            <section className="admin-section">
              <h2>Top winners</h2>
              <div className="admin-wins">
                {stats.wins.slice(0, 10).map(([name, w]) => (
                  <div key={name} className="admin-win">
                    <span className="name">{name}</span>
                    <span className="count">{w}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="admin-section">
            <h2>Rooms</h2>
            {stats.rows.length === 0 ? (
              <div className="admin-empty">No rooms yet.</div>
            ) : (
              <div className="admin-table">
                <div className="admin-tr head">
                  <span>Room</span>
                  <span>Created</span>
                  <span>Status</span>
                  <span>Size</span>
                  <span>Players</span>
                  <span>Moves</span>
                  <span>Chat</span>
                  <span>Gen</span>
                  <span>Winner</span>
                </div>
                {stats.rows.map((r) => (
                  <div key={r.id} className="admin-tr">
                    <span className="mono">{r.id}</span>
                    <span>{formatTime(r.createdAt)}</span>
                    <span className={`status ${r.status}`}>{r.status}</span>
                    <span>
                      {r.size}×{r.size}
                    </span>
                    <span>
                      {r.seatedPlayers.length}/{r.configPlayers}
                      {r.seatedPlayers.length > 0 ? ` · ${r.seatedPlayers.join(', ')}` : ''}
                    </span>
                    <span>{r.moveCount}</span>
                    <span>{r.chatCount}</span>
                    <span>{r.generation}</span>
                    <span>{r.winner ?? '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
