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
import bubbleAudio from './assets/audio/bubble.mp3';
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
  onCellClick,
}: {
  board: BoardT;
  rows: number;
  cols: number;
  current: Player;
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
        <Board rows={rows} cols={cols} color={current.color} onCellClick={onCellClick} />
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

function Game({ config, onExit }: { config: GameConfig; onExit: () => void }) {
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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    audioRef.current = new Audio(bubbleAudio);
    audioRef.current.volume = 0.4;
  }, []);

  const playPop = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    void a.play().catch(() => {});
  }, []);

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
        /* invalid move */
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
    if (!canUndo) return;
    jumpTo(cursor - 1);
  }, [canUndo, cursor, jumpTo]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    jumpTo(cursor + 1);
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

  const reset = useCallback(() => {
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
      {winner && <WinnerModal winner={winner} onPlayAgain={reset} />}
    </div>
  );
}

export default function App() {
  const [config, setConfig] = useState<GameConfig | null>(null);
  return config ? (
    <Game
      key={`${config.players}-${config.size}`}
      config={config}
      onExit={() => setConfig(null)}
    />
  ) : (
    <StartScreen onStart={(players, size) => setConfig({ players, size })} />
  );
}
