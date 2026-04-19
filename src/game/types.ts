export interface Position {
  row: number;
  col: number;
}

export interface Player {
  id: string;
  name: string;
  color: string;
}

export interface Atom {
  id: string;
  prevPos: Position;
  currPos: Position;
}

export interface Cell {
  id: string;
  owner: Player | null;
  capacity: number;
  atoms: Atom[];
  position: Position;
  exploded?: boolean;
}

export type Board = Cell[][];

export interface StepResult {
  states: Board[];
  final: Board;
  gameOver: boolean;
  winner: Player | null;
  nextPlayer: Player;
  justEliminated: Player[];
}
