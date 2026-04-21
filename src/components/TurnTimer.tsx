import { useEffect, useRef, useState } from 'react';

interface Props {
  startedAt: number;
  durationMs: number;
  color: string;
  myTurn: boolean;
  onExpire: () => void;
}

export function TurnTimer({ startedAt, durationMs, color, myTurn, onExpire }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
  }, [startedAt]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const elapsed = Math.max(0, now - startedAt);
  const remaining = Math.max(0, durationMs - elapsed);
  const seconds = Math.ceil(remaining / 1000);
  const pct = Math.max(0, Math.min(1, remaining / durationMs));

  useEffect(() => {
    if (remaining === 0 && !firedRef.current) {
      firedRef.current = true;
      onExpire();
    }
  }, [remaining, onExpire]);

  const critical = remaining <= 5000;

  return (
    <div
      className={`turn-timer${myTurn ? ' own' : ''}${critical ? ' critical' : ''}`}
      style={{ ['--c' as string]: color, ['--pct' as string]: String(pct) }}
      aria-label={`${seconds} seconds left`}
    >
      <span className="turn-timer-ring" />
      <span className="turn-timer-num">{seconds}</span>
    </div>
  );
}
