import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { ChainReaction } from './game/engine';
import { askBot, type BotLevel } from './ai/bot';
import type { Board as BoardT, Player } from './game/types';
import { Board } from './components/Board';
import { Atom, OFFSETS, cellToWorld } from './components/Atom';
import { HUD } from './components/HUD';
import { WinnerModal } from './components/WinnerModal';
import { CortisolChart } from './components/CortisolChart';
import { StartScreen } from './components/StartScreen';
import { LandingPage } from './components/LandingPage';
import { LobbyScreen } from './components/LobbyScreen';
import bubbleAudio from './assets/audio/bubble.mp3';
import { ensureAuth } from './net/firebase';
import {
  cancelRematch,
  createRoom,
  findExistingSeat,
  joinRoom,
  kickPlayer,
  orderedEvents,
  pushMove,
  removeReaction,
  sendChat,
  sendReaction,
  skipTurn,
  startRoom,
  subscribeChat,
  subscribeReactions,
  subscribeRoom,
  tryFinalizeRematch,
  voteRematch,
  type ChatMessage,
  type Reaction,
  type Room,
} from './net/room';
import { ChatPanel } from './components/ChatPanel';
import { ReactionBar } from './components/ReactionBar';
import { ReactionToasts } from './components/ReactionToasts';
import { TurnTimer } from './components/TurnTimer';
import { ConfirmModal } from './components/ConfirmModal';
import { AdminPage } from './components/AdminPage';
import './App.css';

const EXPLODE_DURATION = 420;
const PLACE_DURATION = 280;

function snapshotCounts(board: BoardT): Map<string, number> {
  const m = new Map<string, number>();
  for (const row of board) {
    for (const cell of row) {
      if (cell.owner) m.set(cell.owner.id, (m.get(cell.owner.id) ?? 0) + cell.atoms.length);
    }
  }
  return m;
}

export type SeatKind = 'human' | 'bot-easy' | 'bot-medium' | 'bot-hard';

interface GameConfig {
  players: number;
  size: number;
  seats?: SeatKind[];
}

function botLevelOf(kind: SeatKind): BotLevel | null {
  if (kind === 'bot-easy') return 'easy';
  if (kind === 'bot-medium') return 'medium';
  if (kind === 'bot-hard') return 'hard';
  return null;
}

function CameraRig({ rows, cols }: { rows: number; cols: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const fov = 50 * (Math.PI / 180);
    const t = Math.tan(fov / 2);
    const aspect = size.width / Math.max(size.height, 1);
    const halfW = (cols * 3) / 2;
    const halfH = (rows * 3) / 2;
    const distV = halfH / t;
    const distH = halfW / (t * aspect);
    const narrow = aspect < 1;
    const margin = narrow ? 1.6 : 1.35;
    const distance = Math.max(distV, distH) * margin;
    const lift = narrow ? distance * 0.18 : distance * 0.4;
    camera.position.set(0, -lift, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, rows, cols]);
  return null;
}

function Scene({
  board,
  rows,
  cols,
  current,
  disabled = false,
  onCellClick,
}: {
  board: BoardT;
  rows: number;
  cols: number;
  current: Player;
  disabled?: boolean;
  onCellClick: (row: number, col: number) => void;
}) {
  const atoms = useMemo(() => {
    const out: Array<{
      id: string;
      color: string;
      from: { row: number; col: number };
      to: { row: number; col: number };
      offset: [number, number, number];
      exploding: boolean;
      spin: boolean;
      axis: [number, number, number];
    }> = [];
    for (const row of board) {
      for (const cell of row) {
        const count = cell.atoms.length;
        const offs = OFFSETS[Math.min(count, 4)] ?? OFFSETS[3];
        const spin = count >= 2;
        const seed = cell.position.row * 31 + cell.position.col * 17 + 3;
        let ax = Math.sin(seed * 0.73);
        let ay = Math.cos(seed * 0.41) * 0.8;
        let az = Math.sin(seed * 1.17) + 0.4;
        const len = Math.hypot(ax, ay, az) || 1;
        const axis: [number, number, number] = [ax / len, ay / len, az / len];
        cell.atoms.forEach((atom, i) => {
          out.push({
            id: atom.id,
            color: cell.owner?.color ?? '#ffffff',
            from: atom.prevPos,
            to: atom.currPos,
            offset: offs[i % offs.length],
            exploding: !!cell.exploded,
            spin,
            axis,
          });
        });
      }
    }
    return out;
  }, [board]);

  const cx = ((cols - 1) * 3) / 2;
  const cy = ((rows - 1) * 3) / 2;
  const dim = Math.max(rows, cols);

  return (
    <Canvas
      camera={{
        position: [0, -dim * 2.2, dim * 3.2],
        fov: 50,
      }}
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true }}
    >
      <color attach="background" args={['#05060f']} />
      <ambientLight intensity={0.18} />
      <directionalLight position={[6, 8, 10]} intensity={1.4} color="#ffffff" />
      <pointLight position={[-8, -6, 6]} intensity={0.6} color="#6ea8ff" />
      <pointLight position={[0, 0, -6]} intensity={0.35} color={current.color} />
      <CameraRig rows={rows} cols={cols} />
      <OrbitControls
        target={[0, 0, 0]}
        enablePan={false}
        minDistance={dim * 1.2}
        maxDistance={dim * 8}
        maxPolarAngle={Math.PI * 0.85}
      />
      <Stars radius={80} depth={40} count={1500} factor={3} fade />
      <group position={[-cx, -cy, 0]}>
        <Board
          rows={rows}
          cols={cols}
          color={current.color}
          disabled={disabled}
          onCellClick={onCellClick}
        />
        {atoms.map((a) => (
          <Atom
            key={a.id}
            color={a.color}
            from={a.from}
            to={a.to}
            offset={a.offset}
            exploding={a.exploding}
            spin={a.spin}
            axis={a.axis}
          />
        ))}
      </group>
    </Canvas>
  );
}

function useAudioPop() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    audioRef.current = new Audio(bubbleAudio);
    audioRef.current.volume = 0.4;
  }, []);
  return useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    void a.play().catch(() => {});
  }, []);
}

function LocalGame({ config, onExit }: { config: GameConfig; onExit: () => void }) {
  const engineRef = useRef<ChainReaction | null>(null);
  if (!engineRef.current) {
    engineRef.current = new ChainReaction({
      rows: config.size,
      cols: config.size,
      players: config.players,
    });
  }
  const engine = engineRef.current;

  const [board, setBoard] = useState<BoardT>(() =>
    JSON.parse(JSON.stringify(engine.board)) as BoardT,
  );
  const [current, setCurrent] = useState<Player>(() => engine.currentPlayer());
  const [winner, setWinner] = useState<Player | null>(null);
  const [eliminated, setEliminated] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [atomHistory, setAtomHistory] = useState<Array<Map<string, number>>>([]);

  const playPop = useAudioPop();

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of board) {
      for (const cell of row) {
        if (cell.owner) m.set(cell.owner.id, (m.get(cell.owner.id) ?? 0) + cell.atoms.length);
      }
    }
    return m;
  }, [board]);

  const runStates = useCallback(
    async (states: BoardT[], finalWinner: Player | null, nextPlayer: Player, elim: Set<string>) => {
      setBusy(true);
      for (let i = 0; i < states.length; i++) {
        setBoard(states[i]);
        const hasExplode = states[i].some((row) => row.some((c) => c.exploded));
        playPop();
        await new Promise((r) => setTimeout(r, hasExplode ? EXPLODE_DURATION : PLACE_DURATION));
      }
      setEliminated(new Set(elim));
      const finalBoard = states[states.length - 1];
      setAtomHistory((prev) => [...prev, snapshotCounts(finalBoard)]);
      if (finalWinner) setWinner(finalWinner);
      else setCurrent(nextPlayer);
      setBusy(false);
    },
    [playPop],
  );

  const runMove = useCallback(
    (row: number, col: number) => {
      try {
        const res = engine.place({ row, col });
        const elim = new Set(engine.eliminated);
        void runStates(res.states, res.winner, res.nextPlayer, elim);
      } catch {
        /* invalid */
      }
    },
    [engine, runStates],
  );

  const handleClick = useCallback(
    (row: number, col: number) => {
      if (busy || winner) return;
      const seatKind = config.seats?.[Number(current.id)] ?? 'human';
      if (seatKind !== 'human') return;
      runMove(row, col);
    },
    [busy, winner, current.id, config.seats, runMove],
  );

  const [botThinking, setBotThinking] = useState(false);
  useEffect(() => {
    if (busy || winner) return;
    const seatKind = config.seats?.[Number(current.id)] ?? 'human';
    const level = botLevelOf(seatKind);
    if (!level) return;
    const ctrl = new AbortController();
    setBotThinking(true);
    askBot({
      snapshot: engine.snapshot(),
      config: { rows: config.size, cols: config.size, players: config.players },
      rootId: current.id,
      level,
      signal: ctrl.signal,
    })
      .then((res) => {
        setBotThinking(false);
        if (ctrl.signal.aborted) return;
        setTimeout(() => {
          if (!ctrl.signal.aborted) runMove(res.row, res.col);
        }, 220);
      })
      .catch((e) => {
        setBotThinking(false);
        if (e?.name !== 'AbortError') console.error(e);
      });
    return () => ctrl.abort();
  }, [current.id, busy, winner, engine, config, runMove]);

  const playAgain = useCallback(() => {
    engine.reset();
    setBoard(JSON.parse(JSON.stringify(engine.board)) as BoardT);
    setCurrent(engine.currentPlayer());
    setEliminated(new Set());
    setWinner(null);
    setBusy(false);
    setAtomHistory([]);
  }, [engine]);

  return (
    <div className="app" style={{ ['--accent' as string]: current.color }}>
      <Scene
        board={board}
        rows={config.size}
        cols={config.size}
        current={current}
        disabled={busy || !!winner || botThinking || !!botLevelOf(config.seats?.[Number(current.id)] ?? 'human')}
        onCellClick={handleClick}
      />
      <HUD
        players={engine.players}
        current={current}
        counts={counts}
        eliminated={eliminated}
        onReset={onExit}
        statusText={botThinking ? `${current.name} thinking…` : undefined}
      />
      {winner && (
        <WinnerModal
          winner={winner}
          onPlayAgain={playAgain}
          chart={
            <CortisolChart
              players={engine.players}
              atomHistory={atomHistory}
              eliminated={eliminated}
              winnerId={winner.id}
            />
          }
        />
      )}
    </div>
  );
}

function OnlineGame({
  room,
  mySeat,
  myUid,
  onExit,
}: {
  room: Room;
  mySeat: number;
  myUid: string;
  onExit: () => void;
}) {
  const { config } = room;
  const engineRef = useRef<ChainReaction | null>(null);
  if (!engineRef.current) {
    engineRef.current = new ChainReaction({
      rows: config.rows,
      cols: config.cols,
      players: config.players,
    });
  }
  const engine = engineRef.current;

  for (let i = 0; i < config.players; i++) {
    const seat = room.seats?.[String(i)];
    if (seat?.name) engine.players[i] = { ...engine.players[i], name: seat.name };
  }
  const visiblePlayers = engine.players.filter((_, i) => !!room.seats?.[String(i)]);

  const [board, setBoard] = useState<BoardT>(() =>
    JSON.parse(JSON.stringify(engine.board)) as BoardT,
  );
  const [current, setCurrent] = useState<Player>(() => engine.currentPlayer());
  const [winner, setWinner] = useState<Player | null>(null);
  const [eliminated, setEliminated] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [turnStartedAt, setTurnStartedAt] = useState<number>(() => Date.now());
  const [atomHistory, setAtomHistory] = useState<Array<Map<string, number>>>([]);
  const appliedRef = useRef(0);
  const didInitRef = useRef(false);
  const playPop = useAudioPop();

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of board) {
      for (const cell of row) {
        if (cell.owner) m.set(cell.owner.id, (m.get(cell.owner.id) ?? 0) + cell.atoms.length);
      }
    }
    return m;
  }, [board]);

  useEffect(() => {
    const events = orderedEvents(room);
    let cancelled = false;

    async function replay() {
      if (events.length < appliedRef.current) return;

      // initial catch-up: apply all events instantly
      if (!didInitRef.current) {
        const history: Array<Map<string, number>> = [];
        for (let i = 0; i < events.length; i++) {
          const ev = events[i];
          try {
            if (ev.kind === 'move') {
              engine.place({ row: ev.move.row, col: ev.move.col });
            } else if (ev.kind === 'forfeit') {
              engine.forfeit(String(ev.seat));
            } else {
              engine.skipTurn(String(ev.seat));
            }
          } catch {
            /* invalid, skip */
          }
          history.push(snapshotCounts(engine.board));
        }
        appliedRef.current = events.length;
        didInitRef.current = true;
        setBoard(JSON.parse(JSON.stringify(engine.board)) as BoardT);
        setCurrent(engine.currentPlayer());
        setEliminated(new Set(engine.eliminated));
        setAtomHistory(history);
        const active = engine.activePlayers();
        if (engine.moved.size >= 2 && active.length <= 1 && active[0]) {
          setWinner(active[0]);
        }
        return;
      }

      // animate each new event
      setBusy(true);
      for (let i = appliedRef.current; i < events.length; i++) {
        if (cancelled) break;
        const ev = events[i];
        try {
          if (ev.kind === 'move') {
            const res = engine.place({ row: ev.move.row, col: ev.move.col });
            for (let s = 0; s < res.states.length; s++) {
              if (cancelled) break;
              setBoard(res.states[s]);
              const hasExplode = res.states[s].some((r) => r.some((c) => c.exploded));
              playPop();
              await new Promise((r) => setTimeout(r, hasExplode ? EXPLODE_DURATION : PLACE_DURATION));
            }
            setEliminated(new Set(engine.eliminated));
            if (res.winner) setWinner(res.winner);
            else setCurrent(res.nextPlayer);
          } else if (ev.kind === 'forfeit') {
            const res = engine.forfeit(String(ev.seat));
            setBoard(JSON.parse(JSON.stringify(engine.board)) as BoardT);
            setEliminated(new Set(engine.eliminated));
            if (res.winner) setWinner(res.winner);
            else setCurrent(engine.currentPlayer());
          } else {
            engine.skipTurn(String(ev.seat));
            setCurrent(engine.currentPlayer());
          }
          setAtomHistory((prev) => [...prev, snapshotCounts(engine.board)]);
        } catch {
          /* invalid event, skip */
        }
        appliedRef.current = i + 1;
      }
      if (!cancelled) setBusy(false);
    }

    void replay();
    return () => {
      cancelled = true;
    };
  }, [room, engine, playPop]);

  const handleClick = useCallback(
    (row: number, col: number) => {
      if (busy || winner) return;
      if (engine.currentPlayer().id !== String(mySeat)) return;
      const seat = room.seats?.[String(mySeat)];
      pushMove(room.id, {
        row,
        col,
        uid: seat?.uid ?? '',
        seat: mySeat,
      }).catch(console.error);
    },
    [busy, winner, engine, mySeat, room],
  );

  useEffect(() => {
    if (busy || winner) return;
    setTurnStartedAt(Date.now());
  }, [current.id, busy, winner]);

  const [confirmLeave, setConfirmLeave] = useState(false);
  useEffect(() => {
    if (winner) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.history.pushState({ guard: Date.now() }, '');
    const onPopState = () => {
      window.history.pushState({ guard: Date.now() }, '');
      setConfirmLeave(true);
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);
    };
  }, [winner]);

  const mySeatId = String(mySeat);
  const myTurn = engine.currentPlayer().id === mySeatId;
  const statusText = winner
    ? null
    : myTurn
      ? 'Your turn'
      : `Waiting for ${engine.currentPlayer().name}`;

  const [chatMsgs, setChatMsgs] = useState<Array<ChatMessage & { id: string }>>([]);
  useEffect(() => {
    return subscribeChat(room.id, setChatMsgs);
  }, [room.id]);

  const [reactions, setReactions] = useState<Array<Reaction & { id: string }>>([]);
  useEffect(() => {
    return subscribeReactions(room.id, setReactions);
  }, [room.id]);

  const onReact = useCallback(
    async (emoji: string) => {
      try {
        const rid = await sendReaction(room.id, { uid: myUid, seat: mySeat, emoji });
        setTimeout(() => {
          removeReaction(room.id, rid).catch(() => {});
        }, 3000);
      } catch (e) {
        console.error(e);
      }
    },
    [room.id, myUid, mySeat],
  );

  const myName = room.seats?.[mySeatId]?.name ?? 'Player';

  useEffect(() => {
    if (!room.rematch) return;
    const votes = room.rematch.votes ?? {};
    const kicked = room.kicked ?? {};
    const seatUids = Object.values(room.seats ?? {})
      .filter(Boolean)
      .map((s) => s.uid)
      .filter((u) => !kicked[u]);
    if (seatUids.length < 2) return;
    const allYes = seatUids.every((u) => votes[u]);
    if (allYes) {
      tryFinalizeRematch(room.id).catch(console.error);
    }
  }, [room.rematch, room.seats, room.kicked, room.id]);
  const onSendChat = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      await sendChat(room.id, {
        uid: myUid,
        seat: mySeat,
        name: myName,
        text: trimmed.slice(0, 240),
      });
    },
    [room.id, myUid, mySeat, myName],
  );

  return (
    <div className="app" style={{ ['--accent' as string]: current.color }}>
      <Scene
        board={board}
        rows={config.rows}
        cols={config.cols}
        current={current}
        disabled={!myTurn || busy || !!winner}
        onCellClick={handleClick}
      />
      <HUD
        players={visiblePlayers}
        current={current}
        counts={counts}
        eliminated={eliminated}
        onReset={onExit}
        mineId={mySeatId}
        statusText={statusText}
        isHost={room.hostUid === myUid}
        onKick={(seatIdx) => {
          kickPlayer(room.id, seatIdx).catch(console.error);
        }}
      />
      <ReactionBar onReact={onReact} disabled={!!winner} />
      <ReactionToasts reactions={reactions} players={engine.players} />
      {!winner && (
        <TurnTimer
          startedAt={turnStartedAt}
          durationMs={30000}
          color={current.color}
          myTurn={myTurn}
          onExpire={() => {
            const turnIdx =
              Object.keys(room.moves ?? {}).length +
              Object.keys(room.forfeits ?? {}).length +
              Object.keys(room.skips ?? {}).length;
            skipTurn(room.id, turnIdx, Number(current.id)).catch(console.error);
          }}
        />
      )}
      {confirmLeave && (
        <ConfirmModal
          title="Leave game?"
          message="Your turns will be skipped until you return. Really exit?"
          confirmLabel="Leave"
          cancelLabel="Stay"
          danger
          onConfirm={() => {
            setConfirmLeave(false);
            onExit();
          }}
          onCancel={() => setConfirmLeave(false)}
        />
      )}
      <ChatPanel
        messages={chatMsgs}
        players={engine.players}
        myUid={myUid}
        onSend={onSendChat}
      />
      {winner && (() => {
        const kicked = room.kicked ?? {};
        const seatUids = Object.values(room.seats ?? {})
          .filter(Boolean)
          .map((s) => s.uid)
          .filter((u) => !kicked[u]);
        const seatNames: Record<string, string> = {};
        for (const [idx, s] of Object.entries(room.seats ?? {})) {
          if (s?.uid && !kicked[s.uid]) seatNames[s.uid] = engine.players[Number(idx)]?.name ?? s.name;
        }
        return (
          <WinnerModal
            winner={winner}
            onPlayAgain={onExit}
            chart={
              <CortisolChart
                players={visiblePlayers}
                atomHistory={atomHistory}
                eliminated={eliminated}
                winnerId={winner.id}
              />
            }
            rematch={{
              myUid,
              seatUids,
              seatNames,
              votes: room.rematch?.votes ?? {},
              onVote: () => voteRematch(room.id, myUid).catch(console.error),
              onCancel: () => {
                cancelRematch(room.id).catch(() => {});
                onExit();
              },
            }}
          />
        );
      })()}
    </div>
  );
}

type Route =
  | { kind: 'start' }
  | { kind: 'local'; config: GameConfig }
  | { kind: 'online'; roomId: string; mySeat: number };

function parseJoinCodeFromHash(): string | undefined {
  const h = window.location.hash;
  const m = h.match(/^#\/room\/([A-Z0-9]+)/i);
  return m ? m[1].toUpperCase() : undefined;
}

function roomUrl(roomId: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/room/${roomId}`;
}

function isAdminRoute(): boolean {
  return (
    window.location.pathname.startsWith('/secret-admin') ||
    /^#\/secret-admin\b/.test(window.location.hash)
  );
}

export default function App() {
  const [route, setRoute] = useState<Route>({ kind: 'start' });
  const [showStart, setShowStart] = useState(false);
  const [pendingJoin, setPendingJoin] = useState<string | undefined>(() => parseJoinCodeFromHash());
  const [admin, setAdmin] = useState(() => isAdminRoute());

  useEffect(() => {
    const onChange = () => setAdmin(isAdminRoute());
    window.addEventListener('hashchange', onChange);
    window.addEventListener('popstate', onChange);
    return () => {
      window.removeEventListener('hashchange', onChange);
      window.removeEventListener('popstate', onChange);
    };
  }, []);
  const [uid, setUid] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [mySeat, setMySeat] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);
  const [kickedNotice, setKickedNotice] = useState(false);
  const [startedNotice, setStartedNotice] = useState(false);
  const [name, setName] = useState<string>(() => {
    return localStorage.getItem('crName') ?? 'Player';
  });

  useEffect(() => {
    ensureAuth().then(setUid).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!uid || !pendingJoin || route.kind !== 'start') return;
    let cancelled = false;
    findExistingSeat(pendingJoin, uid)
      .then((seat) => {
        if (cancelled || seat === null) return;
        setMySeat(seat);
        setPendingJoin(undefined);
        setShowStart(false);
        setRoute({ kind: 'online', roomId: pendingJoin, mySeat: seat });
      })
      .catch(() => {
        /* fall through to normal join flow */
      });
    return () => {
      cancelled = true;
    };
  }, [uid, pendingJoin, route.kind]);

  useEffect(() => {
    if (route.kind !== 'online') return;
    const unsub = subscribeRoom(route.roomId, (r) => {
      setRoom(r);
      if (!r) setError('Room closed');
    });
    return unsub;
  }, [route]);

  useEffect(() => {
    if (route.kind !== 'online' || !room || !uid) return;
    if (room.kicked?.[uid]) {
      setKickedNotice(true);
      setRoute({ kind: 'start' });
      setRoom(null);
      setMySeat(-1);
      setShowStart(false);
    }
  }, [room, uid, route.kind]);

  useEffect(() => {
    if (route.kind === 'online') {
      window.history.replaceState(null, '', `#/room/${route.roomId}`);
    } else if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [route]);

  const persistName = (n: string) => {
    setName(n);
    localStorage.setItem('crName', n);
  };

  const onLocal = (players: number, size: number, seats: SeatKind[]) => {
    setRoute({ kind: 'local', config: { players, size, seats } });
  };

  const onCreateOnline = async (players: number, size: number, n: string) => {
    setError(null);
    persistName(n);
    try {
      const u = uid ?? (await ensureAuth());
      if (!uid) setUid(u);
      const id = await createRoom(u, n, { rows: size, cols: size, players });
      setMySeat(0);
      setRoute({ kind: 'online', roomId: id, mySeat: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const onJoinOnline = async (code: string, n: string) => {
    setError(null);
    persistName(n);
    try {
      const u = uid ?? (await ensureAuth());
      if (!uid) setUid(u);
      const seat = await joinRoom(code, u, n);
      setMySeat(seat);
      setPendingJoin(undefined);
      setRoute({ kind: 'online', roomId: code, mySeat: seat });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/removed/i.test(msg)) {
        setShowStart(false);
        setKickedNotice(true);
      } else if (/already started/i.test(msg)) {
        setShowStart(false);
        setStartedNotice(true);
      } else {
        setError(msg);
      }
    }
  };

  const exit = () => {
    setRoute({ kind: 'start' });
    setShowStart(false);
    setRoom(null);
    setMySeat(-1);
    setError(null);
  };

  useEffect(() => {
    if (pendingJoin) setShowStart(true);
  }, [pendingJoin]);

  if (admin) {
    return (
      <AdminPage
        onExit={() => {
          window.history.replaceState(null, '', '/');
          setAdmin(false);
        }}
      />
    );
  }

  if (route.kind === 'local') {
    return (
      <LocalGame
        key={`${route.config.players}-${route.config.size}-${(route.config.seats ?? []).join(',')}`}
        config={route.config}
        onExit={exit}
      />
    );
  }

  if (route.kind === 'online') {
    if (!room) {
      return (
        <div className="modal-backdrop">
          <div className="modal start">
            <div className="modal-label">Connecting…</div>
            {error && <div className="sub">{error}</div>}
            <button className="pill" onClick={exit}>
              Cancel
            </button>
          </div>
        </div>
      );
    }
    if (room.status === 'lobby') {
      return (
        <LobbyScreen
          room={room}
          uid={uid ?? ''}
          shareUrl={roomUrl(room.id)}
          canStart={room.hostUid === uid}
          onStart={() => startRoom(room.id).catch(console.error)}
          onLeave={exit}
          onKick={(seatIdx) => {
            kickPlayer(room.id, seatIdx).catch(console.error);
          }}
        />
      );
    }
    return (
      <OnlineGame
        key={`${room.id}-${room.generation ?? 0}`}
        room={room}
        mySeat={mySeat}
        myUid={uid ?? ''}
        onExit={exit}
      />
    );
  }

  return (
    <>
      <LandingPage onPlay={() => setShowStart(true)} />
      {showStart && (
        <StartScreen
          defaultName={name}
          pendingJoinCode={pendingJoin}
          onLocal={onLocal}
          onCreateOnline={onCreateOnline}
          onJoinOnline={onJoinOnline}
          onClose={() => setShowStart(false)}
        />
      )}
      {error && <div className="error-toast">{error}</div>}
      {kickedNotice && (
        <div className="modal-backdrop kicked-backdrop">
          <div className="modal kicked-modal">
            <div className="modal-label">Removed from room</div>
            <div className="sub">
              The host removed you from this room. You can't rejoin.
            </div>
            <button className="start-btn" onClick={() => setKickedNotice(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
      {startedNotice && (
        <div className="modal-backdrop kicked-backdrop">
          <div className="modal kicked-modal">
            <div className="modal-label">Room already started</div>
            <div className="sub">
              This game is already in progress. Ask the host to create a new room or try a different code.
            </div>
            <button className="start-btn" onClick={() => {
              setStartedNotice(false);
              setPendingJoin(undefined);
            }}>
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
