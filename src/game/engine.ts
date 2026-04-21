import type { Atom, Board, Cell, Player, Position, StepResult } from './types';

export interface EngineSnapshot {
  board: Board;
  currentIdx: number;
  moved: string[];
  eliminated: string[];
}

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const PALETTE = [
  '#ff3b6b',
  '#ffb84d',
  '#4dd0ff',
  '#66e07a',
  '#c477ff',
  '#f5f26e',
  '#ff7a3d',
  '#7af0c5',
];

const PLAYER_NAMES = ['Red', 'Amber', 'Sky', 'Mint', 'Violet', 'Citron', 'Ember', 'Aqua'];

const clone = <T>(v: T): T =>
  typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v));

function capacityFor(row: number, col: number, rows: number, cols: number) {
  const rEdge = row === 0 || row === rows - 1;
  const cEdge = col === 0 || col === cols - 1;
  if (rEdge && cEdge) return 1;
  if (rEdge || cEdge) return 2;
  return 3;
}

export class ChainReaction {
  rows: number;
  cols: number;
  players: Player[];
  board: Board;
  currentIdx = 0;
  moved = new Set<string>();
  eliminated = new Set<string>();

  constructor(opts: { rows?: number; cols?: number; players?: number } = {}) {
    this.rows = opts.rows ?? 6;
    this.cols = opts.cols ?? 6;
    const n = opts.players ?? 2;
    if (n < 2 || n > 8) throw new Error('Players must be 2-8');
    this.players = Array.from({ length: n }, (_, i) => ({
      id: String(i),
      name: PLAYER_NAMES[i],
      color: PALETTE[i],
    }));
    this.board = this.freshBoard();
  }

  private freshBoard(): Board {
    const b: Board = [];
    for (let r = 0; r < this.rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < this.cols; c++) {
        row.push({
          id: uuid(),
          owner: null,
          capacity: capacityFor(r, c, this.rows, this.cols),
          atoms: [],
          position: { row: r, col: c },
        });
      }
      b.push(row);
    }
    return b;
  }

  reset() {
    this.board = this.freshBoard();
    this.currentIdx = 0;
    this.moved.clear();
    this.eliminated.clear();
  }

  snapshot(): EngineSnapshot {
    return {
      board: clone(this.board),
      currentIdx: this.currentIdx,
      moved: [...this.moved],
      eliminated: [...this.eliminated],
    };
  }

  restore(snap: EngineSnapshot) {
    this.board = clone(snap.board);
    this.currentIdx = snap.currentIdx;
    this.moved = new Set(snap.moved);
    this.eliminated = new Set(snap.eliminated);
  }

  currentPlayer(): Player {
    return this.players[this.currentIdx];
  }

  activePlayers(): Player[] {
    return this.players.filter((p) => !this.eliminated.has(p.id));
  }

  nextPlayer(): Player {
    const active = this.activePlayers();
    if (active.length === 0) return this.players[this.currentIdx];
    const cur = this.currentPlayer();
    const idx = active.findIndex((p) => p.id === cur.id);
    return active[(idx + 1) % active.length];
  }

  private advance() {
    const active = this.activePlayers();
    const cur = this.currentPlayer();
    const idx = active.findIndex((p) => p.id === cur.id);
    const next = active[(idx + 1) % active.length];
    this.currentIdx = this.players.findIndex((p) => p.id === next.id);
  }

  private inBounds({ row, col }: Position) {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  private neighbors({ row, col }: Position): Position[] {
    const n: Position[] = [];
    const cand = [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
    ];
    for (const p of cand) if (this.inBounds(p)) n.push(p);
    return n;
  }

  private countPerPlayer(): Map<string, number> {
    const m = new Map<string, number>();
    for (const row of this.board) {
      for (const cell of row) {
        if (cell.owner) m.set(cell.owner.id, (m.get(cell.owner.id) ?? 0) + cell.atoms.length);
      }
    }
    return m;
  }

  place(pos: Position): StepResult {
    if (!this.inBounds(pos)) throw new Error('Out of bounds');
    const player = this.currentPlayer();
    const cell = this.board[pos.row][pos.col];
    if (cell.owner && cell.owner.id !== player.id) throw new Error('Opponent cell');

    cell.owner = player;
    cell.atoms.push({
      id: uuid(),
      prevPos: { ...pos },
      currPos: { ...pos },
    });
    this.moved.add(player.id);

    const states: Board[] = [this.cloneBoard()];

    let queue: Cell[] = [cell];
    let safety = 0;
    const maxSteps = this.rows * this.cols * 8;

    while (queue.length) {
      if (++safety > maxSteps) break;
      if (this.onlyOneOwnerLeft()) break;

      const exploding = queue.filter((c) => c.atoms.length > c.capacity);
      if (exploding.length === 0) break;

      const next: Cell[] = [];
      for (const src of exploding) src.exploded = true;

      for (const src of exploding) {
        const owner = src.owner;
        const neighborPositions = this.neighbors(src.position);
        for (const np of neighborPositions) {
          const nb = this.board[np.row][np.col];
          const atom = src.atoms.pop();
          if (!atom) break;
          atom.prevPos = { ...src.position };
          atom.currPos = { ...np };
          nb.owner = owner;
          nb.atoms.push(atom);
          if (nb.atoms.length > nb.capacity && !next.includes(nb)) next.push(nb);
        }
        if (src.atoms.length === 0) src.owner = null;
      }

      states.push(this.cloneBoard());

      for (const row of this.board) for (const cell of row) cell.exploded = false;

      queue = next;
    }

    for (const row of this.board) for (const cell of row) cell.exploded = false;

    const counts = this.countPerPlayer();
    const justEliminated: Player[] = [];
    for (const p of this.players) {
      if (this.eliminated.has(p.id)) continue;
      if (this.moved.has(p.id) && (counts.get(p.id) ?? 0) === 0) {
        this.eliminated.add(p.id);
        justEliminated.push(p);
      }
    }

    const remaining = this.activePlayers();
    const gameOver = this.moved.size >= 2 && remaining.length <= 1;
    const winner = gameOver ? remaining[0] ?? player : null;

    let nextP: Player;
    if (gameOver) {
      nextP = winner ?? player;
    } else {
      this.advance();
      nextP = this.currentPlayer();
    }

    return {
      states,
      final: this.cloneBoard(),
      gameOver,
      winner,
      nextPlayer: nextP,
      justEliminated,
    };
  }

  skipTurn(playerId: string): void {
    if (this.eliminated.has(playerId)) return;
    if (this.currentPlayer().id !== playerId) return;
    this.advance();
  }

  forfeit(playerId: string): { winner: Player | null } {
    if (this.eliminated.has(playerId)) return { winner: null };
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return { winner: null };

    for (const row of this.board) {
      for (const cell of row) {
        if (cell.owner?.id === playerId) {
          cell.owner = null;
          cell.atoms = [];
        }
      }
    }
    this.eliminated.add(playerId);
    this.moved.add(playerId);

    if (this.currentPlayer().id === playerId) {
      for (let i = 1; i <= this.players.length; i++) {
        const nextIdx = (this.currentIdx + i) % this.players.length;
        if (!this.eliminated.has(this.players[nextIdx].id)) {
          this.currentIdx = nextIdx;
          break;
        }
      }
    }

    const active = this.activePlayers();
    const gameOver = this.moved.size >= 2 && active.length <= 1;
    return { winner: gameOver ? active[0] ?? null : null };
  }

  private onlyOneOwnerLeft(): boolean {
    const set = new Set<string>();
    for (const row of this.board) {
      for (const cell of row) {
        if (cell.owner) set.add(cell.owner.id);
      }
    }
    return this.moved.size >= 2 && set.size === 1;
  }

  private cloneBoard(): Board {
    return clone(this.board);
  }
}
