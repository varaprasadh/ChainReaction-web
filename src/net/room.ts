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
  kicked?: Record<string, number>;
  forfeits?: Record<string, number>;
}

export type RoomEvent =
  | { kind: 'move'; move: MoveRecord }
  | { kind: 'forfeit'; seat: number; ts: number };

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
  const room = snap.val() as Omit<Room, 'id'>;
  if (room.status === 'ended') throw new Error('Room has ended');
  if (room.kicked?.[uid]) throw new Error('You were removed from this room');

  let assignedSeat = -1;
  const seatsRef = ref(db, `rooms/${id}/seats`);
  const res = await runTransaction(seatsRef, (curr) => {
    const seats = (curr ?? {}) as Record<string, Seat>;
    for (const [idx, seat] of Object.entries(seats)) {
      if (seat?.uid === uid) {
        assignedSeat = Number(idx);
        return seats;
      }
    }
    if (room.status !== 'lobby') return;
    for (let i = 0; i < room.config.players; i++) {
      if (!seats[String(i)]) {
        seats[String(i)] = { uid, name };
        assignedSeat = i;
        return seats;
      }
    }
    return;
  });
  if (!res.committed || assignedSeat < 0) {
    if (room.status !== 'lobby') throw new Error('Game already started');
    throw new Error('Room is full');
  }
  return assignedSeat;
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
  const roomRef = ref(db, `rooms/${id}`);
  const snap = await get(roomRef);
  if (!snap.exists()) return;
  const room = snap.val() as Omit<Room, 'id'>;
  const updates: Record<string, unknown> = { status: 'playing' };
  const ts = Date.now();
  const forfeits: Record<string, number> = {};
  for (let i = 0; i < room.config.players; i++) {
    if (!room.seats?.[String(i)]) forfeits[String(i)] = ts;
  }
  if (Object.keys(forfeits).length > 0) updates.forfeits = forfeits;
  await update(roomRef, updates);
}

export async function endRoom(id: string): Promise<void> {
  await update(ref(db, `rooms/${id}`), { status: 'ended' });
}

export async function forfeitSeat(id: string, seatIdx: number): Promise<void> {
  await update(ref(db, `rooms/${id}`), {
    [`forfeits/${seatIdx}`]: Date.now(),
  });
}

export async function kickPlayer(id: string, seatIdx: number): Promise<void> {
  const roomRef = ref(db, `rooms/${id}`);
  const snap = await get(roomRef);
  if (!snap.exists()) return;
  const room = snap.val() as Omit<Room, 'id'>;
  const seat = room.seats?.[String(seatIdx)];
  if (!seat) return;
  const updates: Record<string, unknown> = {
    [`kicked/${seat.uid}`]: Date.now(),
  };
  if (room.status === 'lobby') {
    updates[`seats/${seatIdx}`] = null;
  } else if (room.status === 'playing') {
    updates[`forfeits/${seatIdx}`] = Date.now();
  }
  await update(roomRef, updates);
}

export function orderedEvents(room: Room): RoomEvent[] {
  const events: RoomEvent[] = [];
  const moves = room.moves ?? {};
  for (const k of Object.keys(moves).sort()) {
    events.push({ kind: 'move', move: moves[k] });
  }
  for (const [idx, ts] of Object.entries(room.forfeits ?? {})) {
    events.push({ kind: 'forfeit', seat: Number(idx), ts: Number(ts) });
  }
  events.sort((a, b) => {
    const ta = a.kind === 'move' ? a.move.ts : a.ts;
    const tb = b.kind === 'move' ? b.move.ts : b.ts;
    return ta - tb;
  });
  return events;
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
    forfeits: null,
    reactions: null,
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

export interface Reaction {
  uid: string;
  seat: number;
  emoji: string;
  ts: number;
}

export async function sendReaction(
  id: string,
  r: Omit<Reaction, 'ts'>,
): Promise<string> {
  const listRef = ref(db, `rooms/${id}/reactions`);
  const res = await push(listRef, { ...r, ts: Date.now() });
  return res.key ?? '';
}

export async function removeReaction(id: string, rid: string): Promise<void> {
  if (!rid) return;
  await remove(ref(db, `rooms/${id}/reactions/${rid}`));
}

export function subscribeReactions(
  id: string,
  cb: (reactions: Array<Reaction & { id: string }>) => void,
): () => void {
  const reactionsRef = ref(db, `rooms/${id}/reactions`);
  const handler = onValue(reactionsRef, (snap) => {
    const val = (snap.val() as Record<string, Reaction>) ?? {};
    const items = Object.keys(val)
      .sort()
      .map((k) => ({ id: k, ...val[k] }));
    cb(items);
  });
  return () => {
    off(reactionsRef, 'value', handler);
  };
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
