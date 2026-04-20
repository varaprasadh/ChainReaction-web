import { useEffect, useRef, useState } from 'react';
import type { Player } from '../game/types';
import type { Reaction } from '../net/room';

interface Props {
  reactions: Array<Reaction & { id: string }>;
  players: Player[];
}

interface ToastItem {
  key: string;
  id: string;
  seat: number;
  emoji: string;
  name: string;
  color: string;
}

const LIFETIME_MS = 3200;

export function ReactionToasts({ reactions, players }: Props) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const added: ToastItem[] = [];
    for (const r of reactions) {
      if (seenRef.current.has(r.id)) continue;
      seenRef.current.add(r.id);
      const p = players[r.seat];
      if (!p) continue;
      added.push({
        key: `${r.id}-${Date.now()}`,
        id: r.id,
        seat: r.seat,
        emoji: r.emoji,
        name: p.name,
        color: p.color,
      });
    }
    if (added.length === 0) return;
    setToasts((prev) => [...prev, ...added].slice(-6));
    const timers = added.map((t) =>
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.key !== t.key));
      }, LIFETIME_MS),
    );
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [reactions, players]);

  if (toasts.length === 0) return null;

  return (
    <div className="reaction-toasts" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.key}
          className="reaction-toast"
          style={{ ['--c' as string]: t.color }}
        >
          <span className="reaction-toast-emoji" aria-hidden>
            {t.emoji}
          </span>
          <span className="reaction-toast-name">{t.name}</span>
        </div>
      ))}
    </div>
  );
}
