import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../net/room';
import type { Player } from '../game/types';

interface Props {
  messages: Array<ChatMessage & { id: string }>;
  players: Player[];
  myUid: string;
  onSend: (text: string) => Promise<void> | void;
}

const EMOJIS = ['🔥', '💥', '😂', '👏', '😭', '🎉', '🧠', '🫠'];

const TOAST_DURATION = 4200;
const MAX_TOASTS = 3;

export function ChatPanel({ messages, players, myUid, onSend }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [seen, setSeen] = useState<number>(() => messages.length);
  const [toasts, setToasts] = useState<Array<{ key: string; msgId: string; text: string; name: string; seat: number }>>([]);
  const prevCountRef = useRef<number>(messages.length);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    setSeen(messages.length);
  }, [messages, open]);

  useEffect(() => {
    const prev = prevCountRef.current;
    if (messages.length > prev && !open) {
      const fresh = messages.slice(prev).filter((m) => m.uid !== myUid);
      if (fresh.length > 0) {
        const added = fresh.map((m) => ({
          key: `${m.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          msgId: m.id,
          text: m.text,
          name: m.name,
          seat: m.seat,
        }));
        setToasts((curr) => [...curr, ...added].slice(-MAX_TOASTS));
        for (const t of added) {
          window.setTimeout(() => {
            setToasts((curr) => curr.filter((x) => x.key !== t.key));
          }, TOAST_DURATION);
        }
      }
    }
    prevCountRef.current = messages.length;
  }, [messages, open, myUid]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setToasts([]);
    }
  }, [open]);

  const unread = open ? 0 : Math.max(0, messages.length - seen);

  function colorFor(seat: number): string {
    return players[seat]?.color ?? '#ffffff';
  }

  async function submit() {
    const t = text.trim();
    if (!t) return;
    setText('');
    try {
      await onSend(t);
    } catch {
      /* noop */
    }
  }

  if (!open) {
    return (
      <>
        <div className="chat-toasts">
          {toasts.map((t) => (
            <button
              key={t.key}
              className="chat-toast"
              style={{ ['--c' as string]: colorFor(t.seat) }}
              onClick={() => setOpen(true)}
            >
              <span className="chat-toast-name" style={{ color: colorFor(t.seat) }}>
                {t.name}
              </span>
              <span className="chat-toast-text">{t.text}</span>
            </button>
          ))}
        </div>
        <button className="chat-fab" onClick={() => setOpen(true)} title="Open chat">
          💬
          {unread > 0 && <span className="chat-badge">{unread > 9 ? '9+' : unread}</span>}
        </button>
      </>
    );
  }

  return (
    <div className="chat-panel">
      <div className="chat-head">
        <span className="chat-title">Chat</span>
        <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">
          ×
        </button>
      </div>
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && <div className="chat-empty">Say hi 👋</div>}
        {messages.map((m) => {
          const mine = m.uid === myUid;
          const c = colorFor(m.seat);
          return (
            <div key={m.id} className={`chat-msg${mine ? ' mine' : ''}`}>
              {!mine && (
                <div className="chat-author" style={{ color: c }}>
                  <span className="chat-dot" style={{ background: c }} />
                  {m.name}
                </div>
              )}
              <div
                className="chat-bubble"
                style={
                  mine
                    ? {
                        background: `color-mix(in srgb, ${c} 40%, #1a1d35)`,
                        borderColor: c,
                      }
                    : undefined
                }
              >
                {m.text}
              </div>
            </div>
          );
        })}
      </div>
      <div className="chat-emoji">
        {EMOJIS.map((e) => (
          <button key={e} onClick={() => onSend(e)} className="chat-emoji-btn">
            {e}
          </button>
        ))}
      </div>
      <form
        className="chat-input-row"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          ref={inputRef}
          className="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          maxLength={240}
        />
        <button className="chat-send" type="submit" disabled={!text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
