import { useRef } from 'react';

const EMOJIS = ['👍', '🔥', '😂', '😮', '😢', '💀'];
const THROTTLE_MS = 800;

interface Props {
  onReact: (emoji: string) => void;
  disabled?: boolean;
}

export function ReactionBar({ onReact, disabled }: Props) {
  const lastRef = useRef(0);
  return (
    <div className="reaction-bar">
      {EMOJIS.map((e) => (
        <button
          key={e}
          className="reaction-btn"
          disabled={disabled}
          aria-label={`React ${e}`}
          onClick={() => {
            const now = Date.now();
            if (now - lastRef.current < THROTTLE_MS) return;
            lastRef.current = now;
            onReact(e);
          }}
        >
          {e}
        </button>
      ))}
    </div>
  );
}
