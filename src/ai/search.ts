import { ChainReaction, type EngineSnapshot } from '../game/engine';
import type { Position } from '../game/types';
import { evaluate } from './evaluate';

export type BotLevel = 'easy' | 'medium' | 'hard';

interface SearchConfig {
  rows: number;
  cols: number;
  players: number;
}

interface Budget {
  deadline: number;
}

export interface BotResult {
  row: number;
  col: number;
  depth: number;
  score: number;
}

const MAX_DEPTH = 6;
const WIN_THRESHOLD = 5000;

export function findBestMove(
  snapshot: EngineSnapshot,
  config: SearchConfig,
  rootId: string,
  level: BotLevel,
  timeMs: number,
): BotResult {
  const engine = hydrate(snapshot, config);
  const moves = legalMoves(engine);
  if (moves.length === 0) throw new Error('No legal moves available');

  if (level === 'easy') {
    const pick = moves[Math.floor(Math.random() * moves.length)];
    return { row: pick.row, col: pick.col, depth: 0, score: 0 };
  }

  if (level === 'medium') {
    let best = moves[0];
    let bestScore = -Infinity;
    for (const m of moves) {
      const childSnap = simulate(snapshot, config, m);
      const e = hydrate(childSnap, config);
      const s = evaluate(e, rootId);
      if (s > bestScore) {
        bestScore = s;
        best = m;
      }
    }
    return { row: best.row, col: best.col, depth: 1, score: bestScore };
  }

  const deadline = Date.now() + timeMs;
  let bestMove = moves[0];
  let bestScore = -Infinity;
  let bestDepth = 0;
  for (let d = 1; d <= MAX_DEPTH; d++) {
    const r = searchRoot(snapshot, config, rootId, d, { deadline });
    if (!r) break;
    bestMove = r.move;
    bestScore = r.score;
    bestDepth = d;
    if (Math.abs(bestScore) >= WIN_THRESHOLD) break;
    if (Date.now() >= deadline) break;
  }
  return { row: bestMove.row, col: bestMove.col, depth: bestDepth, score: bestScore };
}

function searchRoot(
  snapshot: EngineSnapshot,
  config: SearchConfig,
  rootId: string,
  depth: number,
  budget: Budget,
): { move: Position; score: number } | null {
  const engine = hydrate(snapshot, config);
  const moves = orderedMoves(legalMoves(engine), engine);
  let alpha = -Infinity;
  const beta = Infinity;
  let bestMove: Position = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    if (Date.now() > budget.deadline) return null;
    const childSnap = simulate(snapshot, config, m);
    const score = minimax(childSnap, config, rootId, depth - 1, alpha, beta, budget);
    if (score === null) return null;
    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
    if (score > alpha) alpha = score;
  }
  return { move: bestMove, score: bestScore };
}

function minimax(
  snapshot: EngineSnapshot,
  config: SearchConfig,
  rootId: string,
  depth: number,
  alpha: number,
  beta: number,
  budget: Budget,
): number | null {
  if (Date.now() > budget.deadline) return null;
  const engine = hydrate(snapshot, config);
  const active = engine.activePlayers();
  if (active.length <= 1) {
    return active.length === 1 && active[0].id === rootId ? 10000 : -10000;
  }
  if (depth === 0) return evaluate(engine, rootId);
  const moves = orderedMoves(legalMoves(engine), engine);
  if (moves.length === 0) return evaluate(engine, rootId);

  const isMax = engine.currentPlayer().id === rootId;
  let best = isMax ? -Infinity : Infinity;
  for (const m of moves) {
    if (Date.now() > budget.deadline) return null;
    const childSnap = simulate(snapshot, config, m);
    const score = minimax(childSnap, config, rootId, depth - 1, alpha, beta, budget);
    if (score === null) return null;
    if (isMax) {
      if (score > best) best = score;
      if (score > alpha) alpha = score;
    } else {
      if (score < best) best = score;
      if (score < beta) beta = score;
    }
    if (beta <= alpha) break;
  }
  return best;
}

function legalMoves(engine: ChainReaction): Position[] {
  const cur = engine.currentPlayer();
  const out: Position[] = [];
  for (let r = 0; r < engine.rows; r++) {
    for (let c = 0; c < engine.cols; c++) {
      const cell = engine.board[r][c];
      if (!cell.owner || cell.owner.id === cur.id) {
        out.push({ row: r, col: c });
      }
    }
  }
  return out;
}

function orderedMoves(moves: Position[], engine: ChainReaction): Position[] {
  return [...moves].sort((a, b) => {
    const ca = engine.board[a.row][a.col];
    const cb = engine.board[b.row][b.col];
    const slackA = ca.capacity - ca.atoms.length;
    const slackB = cb.capacity - cb.atoms.length;
    return slackA - slackB;
  });
}

function hydrate(snapshot: EngineSnapshot, config: SearchConfig): ChainReaction {
  const e = new ChainReaction({
    rows: config.rows,
    cols: config.cols,
    players: config.players,
  });
  e.restore(snapshot);
  return e;
}

function simulate(
  snapshot: EngineSnapshot,
  config: SearchConfig,
  move: Position,
): EngineSnapshot {
  const e = hydrate(snapshot, config);
  try {
    e.place(move);
  } catch {
    /* invalid move, return unchanged */
  }
  return e.snapshot();
}
