import BotWorker from './bot.worker?worker';
import type { EngineSnapshot } from '../game/engine';
import type { BotLevel, BotResult } from './search';

export type { BotLevel, BotResult };

interface AskParams {
  snapshot: EngineSnapshot;
  config: { rows: number; cols: number; players: number };
  rootId: string;
  level: BotLevel;
  timeMs?: number;
  signal?: AbortSignal;
}

const DEFAULT_TIME: Record<BotLevel, number> = {
  easy: 120,
  medium: 250,
  hard: 1400,
};

export function askBot({
  snapshot,
  config,
  rootId,
  level,
  timeMs,
  signal,
}: AskParams): Promise<BotResult> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('aborted', 'AbortError'));
      return;
    }
    const worker = new BotWorker();
    const onAbort = () => {
      worker.terminate();
      reject(new DOMException('aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    worker.onmessage = (ev) => {
      signal?.removeEventListener('abort', onAbort);
      worker.terminate();
      if (ev.data?.ok) {
        resolve({
          row: ev.data.row,
          col: ev.data.col,
          depth: ev.data.depth,
          score: ev.data.score,
        });
      } else {
        reject(new Error(ev.data?.error ?? 'Bot error'));
      }
    };
    worker.onerror = (e) => {
      signal?.removeEventListener('abort', onAbort);
      worker.terminate();
      reject(e);
    };
    worker.postMessage({
      snapshot,
      config,
      rootId,
      level,
      timeMs: timeMs ?? DEFAULT_TIME[level],
    });
  });
}
