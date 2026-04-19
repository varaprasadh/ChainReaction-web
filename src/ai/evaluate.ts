import type { ChainReaction } from '../game/engine';

const WIN = 10000;

export function evaluate(engine: ChainReaction, rootId: string): number {
  if (engine.eliminated.has(rootId)) return -WIN;
  const active = engine.activePlayers();
  if (active.length === 1) {
    return active[0].id === rootId ? WIN : -WIN;
  }

  let mine = 0;
  let theirs = 0;
  let mineReady = 0;
  let theirReady = 0;
  let mineAtRisk = 0;
  let theirAtRisk = 0;

  for (let r = 0; r < engine.rows; r++) {
    for (let c = 0; c < engine.cols; c++) {
      const cell = engine.board[r][c];
      if (!cell.owner) continue;
      const slack = cell.capacity - cell.atoms.length;
      const isMine = cell.owner.id === rootId;
      if (isMine) mine += cell.atoms.length;
      else theirs += cell.atoms.length;

      if (slack === 0) {
        if (isMine) mineReady++;
        else theirReady++;
      } else if (slack === 1 && hasHostileCapNeighbor(engine, r, c, isMine, rootId)) {
        if (isMine) mineAtRisk++;
        else theirAtRisk++;
      }
    }
  }

  return (
    (mine - theirs) +
    0.55 * (mineReady - theirReady) -
    0.45 * mineAtRisk +
    0.25 * theirAtRisk
  );
}

function hasHostileCapNeighbor(
  engine: ChainReaction,
  r: number,
  c: number,
  isMine: boolean,
  rootId: string,
): boolean {
  const ns: Array<[number, number]> = [
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ];
  for (const [nr, nc] of ns) {
    if (nr < 0 || nc < 0 || nr >= engine.rows || nc >= engine.cols) continue;
    const nb = engine.board[nr][nc];
    if (!nb.owner) continue;
    const nbMine = nb.owner.id === rootId;
    if (nbMine === isMine) continue;
    if (nb.atoms.length === nb.capacity) return true;
  }
  return false;
}
