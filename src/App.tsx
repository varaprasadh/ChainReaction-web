import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { ChainReaction, type EngineSnapshot } from './game/engine';
import type { Board as BoardT, Player } from './game/types';
import { Board } from './components/Board';
import { Atom, OFFSETS, cellToWorld } from './components/Atom';
import { HUD } from './components/HUD';
import { WinnerModal } from './components/WinnerModal';
import { StartScreen } from './components/StartScreen';
import { LobbyScreen } from './components/LobbyScreen';
import bubbleAudio from './assets/audio/bubble.mp3';
import { ensureAuth } from './net/firebase';
import {
  createRoom,
  joinRoom,
  orderedMoves,
  pushMove,
  startRoom,
  subscribeRoom,
  type Room,
} from './net/room';
import './App.css';

const EXPLODE_DURATION = 420;
const PLACE_DURATION = 280;

interface GameConfig {
  players: number;
  size: number;
}

function CameraRig({ dim }: { dim: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1);
    const narrow = aspect < 1;
    const dist = narrow ? dim * 4.2 : dim * 3.2;
    const lift = narrow ? dim * 1.4 : dim * 2.2;
    camera.position.set(0, -lift, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, dim]);
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
    >
      <color attach="background" args={['#05060f']} />
      <ambientLight intensity={0.18} />
      <directionalLight position={[6, 8, 10]} intensity={1.4} color="#ffffff" />
      <pointLight position={[-8, -6, 6]} intensity={0.6} color="#6ea8ff" />
      <pointLight position={[0, 0, -6]} intensity={0.35} color={current.color} />
      <CameraRig dim={dim} />
      <OrbitControls
        target={[0, 0, 0]}
        enablePan={false}
        minDistance={dim * 1.5}
        maxDistance={dim * 6}
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

  const historyRef = useRef<EngineSnapshot[]>([engine.snapshot()]);
  const [cursor, setCursor] = useState(0);
  const canUndo = cursor > 0 && !busy && !winner;
  const canRedo = cursor < historyRef.current.length - 1 && !busy && !winner;

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
      if (finalWinner) setWinner(finalWinner);
      else setCurrent(nextPlayer);
      setBusy(false);
    },
    [playPop],
  );

  const handleClick = useCallback(
    (row: number, col: number) => {
      if (busy || winner) return;
      try {
        const res = engine.place({ row, col });
        const elim = new Set(engine.eliminated);
        historyRef.current = historyRef.current.slice(0, cursor + 1);
        historyRef.current.push(engine.snapshot());
        setCursor(historyRef.current.length - 1);
        void runStates(res.states, res.winner, res.nextPlayer, elim);
      } catch {
        /* invalid */
      }
    },
    [busy, winner, engine, runStates, cursor],
  );

  const jumpTo = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= historyRef.current.length) return;
      const snap = historyRef.current[idx];
      engine.restore(snap);
      setBoard(JSON.parse(JSON.stringify(engine.board)) as BoardT);
      setCurrent(engine.currentPlayer());
      setEliminated(new Set(engine.eliminated));
      setWinner(null);
      setCursor(idx);
    },
    [engine],
  );

  const undo = useCallback(() => {
    if (canUndo) jumpTo(cursor - 1);
  }, [canUndo, cursor, jumpTo]);
  const redo = useCallback(() => {
    if (canRedo) jumpTo(cursor + 1);
  }, [canRedo, cursor, jumpTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const playAgain = useCallback(() => {
    engine.reset();
    historyRef.current = [engine.snapshot()];
    setCursor(0);
    setBoard(JSON.parse(JSON.stringify(engine.board)) as BoardT);
    setCurrent(engine.currentPlayer());
    setEliminated(new Set());
    setWinner(null);
    setBusy(false);
  }, [engine]);

  return (
    <div className="app" style={{ ['--accent' as string]: current.color }}>
      <Scene
        board={board}
        rows={config.size}
        cols={config.size}
        current={current}
        disabled={busy || !!winner}
        onCellClick={handleClick}
      />
      <HUD
        players={engine.players}
        current={current}
        counts={counts}
        eliminated={eliminated}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onReset={onExit}
      />
      {winner && <WinnerModal winner={winner} onPlayAgain={playAgain} />}
    </div>
  );
}

function OnlineGame({
  room,
  mySeat,
  onExit,
}: {
  room: Room;
  mySeat: number;
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

  const [board, setBoard] = useState<BoardT>(() =>
    JSON.parse(JSON.stringify(engine.board)) as BoardT,
  );
  const [current, setCurrent] = useState<Player>(() => engine.currentPlayer());
  const [winner, setWinner] = useState<Player | null>(null);
  const [eliminated, setEliminated] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
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
    const moves = orderedMoves(room);
    let cancelled = false;

    async function replay() {
      if (moves.length < appliedRef.current) return;

      // initial catch-up: apply all moves instantly
      if (!didInitRef.current) {
        for (let i = 0; i < moves.length; i++) {
          try {
            engine.place({ row: moves[i].row, col: moves[i].col });
          } catch {
            /* invalid, skip */
          }
        }
        appliedRef.current = moves.length;
        didInitRef.current = true;
        setBoard(JSON.parse(JSON.stringify(engine.board)) as BoardT);
        setCurrent(engine.currentPlayer());
        setEliminated(new Set(engine.eliminated));
        return;
      }

      // animate each new move
      setBusy(true);
      for (let i = appliedRef.current; i < moves.length; i++) {
        if (cancelled) break;
        try {
          const res = engine.place({ row: moves[i].row, col: moves[i].col });
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
        } catch {
          /* invalid move, skip */
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

  const mySeatId = String(mySeat);
  const myTurn = engine.currentPlayer().id === mySeatId;
  const statusText = winner
    ? null
    : myTurn
      ? 'Your turn'
      : `Waiting for ${engine.currentPlayer().name}`;

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
        players={engine.players}
        current={current}
        counts={counts}
        eliminated={eliminated}
        canUndo={false}
        canRedo={false}
        onUndo={() => {}}
        onRedo={() => {}}
        onReset={onExit}
        mineId={mySeatId}
        statusText={statusText}
      />
      {winner && (
        <WinnerModal
          winner={winner}
          onPlayAgain={onExit}
        />
      )}
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

export default function App() {
  const [route, setRoute] = useState<Route>({ kind: 'start' });
  const [pendingJoin, setPendingJoin] = useState<string | undefined>(() => parseJoinCodeFromHash());
  const [uid, setUid] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [mySeat, setMySeat] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string>(() => {
    return localStorage.getItem('crName') ?? 'Player';
  });

  useEffect(() => {
    ensureAuth().then(setUid).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (route.kind !== 'online') return;
    const unsub = subscribeRoom(route.roomId, (r) => {
      setRoom(r);
      if (!r) setError('Room closed');
    });
    return unsub;
  }, [route]);

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

  const onLocal = (players: number, size: number) => {
    setRoute({ kind: 'local', config: { players, size } });
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
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const exit = () => {
    setRoute({ kind: 'start' });
    setRoom(null);
    setMySeat(-1);
    setError(null);
  };

  if (route.kind === 'local') {
    return (
      <LocalGame
        key={`${route.config.players}-${route.config.size}`}
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
        />
      );
    }
    return (
      <OnlineGame
        key={room.id}
        room={room}
        mySeat={mySeat}
        onExit={exit}
      />
    );
  }

  return (
    <>
      <StartScreen
        defaultName={name}
        pendingJoinCode={pendingJoin}
        onLocal={onLocal}
        onCreateOnline={onCreateOnline}
        onJoinOnline={onJoinOnline}
      />
      {error && <div className="error-toast">{error}</div>}
    </>
  );
}
