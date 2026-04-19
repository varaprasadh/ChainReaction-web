import {
  get,
  off,
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  set,
  update,
} from 'firebase/database';
import { db } from './firebase';

export type RoomStatus = 'lobby' | 'playing' | 'ended';

export interface Seat {
  uid: string;
  name: string;
}

export interface MoveRecord {
  row: number;
  col: number;
  uid: string;
  seat: number;
  ts: number;
}

export interface RoomConfig {
  rows: number;
  cols: number;
  players: number;
}

export interface Rematch {
  proposer: string;
  votes: Record<string, boolean>;
}

export interface Room {
  id: string;
  config: RoomConfig;
  hostUid: string;
  status: RoomStatus;
  seats: Record<string, Seat>;
  moves: Record<string, MoveRecord>;
  createdAt: number;
  generation?: number;
  rematch?: Rematch | null;
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';

export function randomCode(len = 5): string {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return s;
}

export async function createRoom(
  uid: string,
  name: string,
  config: RoomConfig,
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = randomCode();
    const roomRef = ref(db, `rooms/${id}`);
    const existing = await get(roomRef);
    if (existing.exists()) continue;
    await set(roomRef, {
      config,
      hostUid: uid,
      status: 'lobby',
      seats: { 0: { uid, name } },
      createdAt: Date.now(),
    });
    return id;
  }
  throw new Error('Could not allocate room code');
}

export async function joinRoom(
  id: string,
  uid: string,
  name: string,
): Promise<number> {
  const roomRef = ref(db, `rooms/${id}`);
  const snap = await get(roomRef);
  if (!snap.exists()) throw new Error('Room not found');
  const room = snap.val() as Room;
  if (room.status === 'ended') throw new Error('Room has ended');

  for (const [idx, seat] of Object.entries(room.seats ?? {})) {
    if (seat?.uid === uid) return Number(idx);
  }
  if (room.status !== 'lobby') throw new Error('Game already started');

  for (let i = 0; i < room.config.players; i++) {
    const seatRef = ref(db, `rooms/${id}/seats/${i}`);
    const res = await runTransaction(seatRef, (curr) => {
      if (curr) return;
      return { uid, name };
    });
    if (res.committed) return i;
  }
  throw new Error('Room is full');
}

export function subscribeRoom(id: string, cb: (room: Room | null) => void): () => void {
  const roomRef = ref(db, `rooms/${id}`);
  const handler = onValue(roomRef, (snap) => {
    if (!snap.exists()) {
      cb(null);
      return;
    }
    const val = snap.val() as Omit<Room, 'id'>;
    cb({ id, ...val });
  });
  return () => {
    off(roomRef, 'value', handler);
  };
}

export async function startRoom(id: string): Promise<void> {
  await update(ref(db, `rooms/${id}`), { status: 'playing' });
}

export async function endRoom(id: string): Promise<void> {
  await update(ref(db, `rooms/${id}`), { status: 'ended' });
}

export async function pushMove(
  id: string,
  move: Omit<MoveRecord, 'ts'>,
): Promise<void> {
  await push(ref(db, `rooms/${id}/moves`), { ...move, ts: Date.now() });
}

export async function voteRematch(id: string, uid: string): Promise<void> {
  const rematchRef = ref(db, `rooms/${id}/rematch`);
  await runTransaction(rematchRef, (current) => {
    if (!current) {
      return { proposer: uid, votes: { [uid]: true } };
    }
    if (!current.votes) current.votes = {};
    current.votes[uid] = true;
    return current;
  });
}

export async function cancelRematch(id: string): Promise<void> {
  await remove(ref(db, `rooms/${id}/rematch`));
}

export async function tryFinalizeRematch(id: string): Promise<void> {
  const genRef = ref(db, `rooms/${id}/generation`);
  const res = await runTransaction(genRef, (g) => (typeof g === 'number' ? g : 0) + 1);
  if (!res.committed) return;
  await update(ref(db, `rooms/${id}`), {
    moves: null,
    rematch: null,
  });
}

export function orderedMoves(room: Room): MoveRecord[] {
  const moves = room.moves ?? {};
  return Object.keys(moves)
    .sort()
    .map((k) => moves[k]);
}

export interface ChatMessage {
  uid: string;
  seat: number;
  name: string;
  text: string;
  ts: number;
}

export async function sendChat(
  id: string,
  msg: Omit<ChatMessage, 'ts'>,
): Promise<void> {
  await push(ref(db, `rooms/${id}/chat`), { ...msg, ts: Date.now() });
}

export function subscribeChat(
  id: string,
  cb: (msgs: Array<ChatMessage & { id: string }>) => void,
): () => void {
  const chatRef = ref(db, `rooms/${id}/chat`);
  const handler = onValue(chatRef, (snap) => {
    const val = (snap.val() as Record<string, ChatMessage>) ?? {};
    const items = Object.keys(val)
      .sort()
      .map((k) => ({ id: k, ...val[k] }));
    cb(items);
  });
  return () => {
    off(chatRef, 'value', handler);
  };
}
