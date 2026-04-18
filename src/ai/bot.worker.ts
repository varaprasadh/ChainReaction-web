/// <reference lib="webworker" />
import type { EngineSnapshot } from '../game/engine';
import { findBestMove, type BotLevel } from './search';

interface Request {
  snapshot: EngineSnapshot;
  config: { rows: number; cols: number; players: number };
  rootId: string;
  level: BotLevel;
  timeMs: number;
}

self.onmessage = (ev: MessageEvent<Request>) => {
  const { snapshot, config, rootId, level, timeMs } = ev.data;
  const start = performance.now();
  try {
    const result = findBestMove(snapshot, config, rootId, level, timeMs);
    self.postMessage({
      ok: true,
      ...result,
      elapsed: performance.now() - start,
    });
  } catch (e) {
    self.postMessage({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
};
