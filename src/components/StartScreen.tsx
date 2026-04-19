import { useState } from 'react';
import type { SeatKind } from '../App';
import { HowToPlay } from './HowToPlay';

interface Props {
  defaultName: string;
  onLocal: (playerCount: number, size: number, seats: SeatKind[]) => void;
  onCreateOnline: (playerCount: number, size: number, name: string) => void;
  onJoinOnline: (code: string, name: string) => void;
  pendingJoinCode?: string;
}

type BotDifficulty = 'bot-easy' | 'bot-medium' | 'bot-hard';

const BOT_LABELS: Record<BotDifficulty, string> = {
  'bot-easy': 'Easy',
  'bot-medium': 'Medium',
  'bot-hard': 'Hard',
};

export function StartScreen({
  defaultName,
  onLocal,
  onCreateOnline,
  onJoinOnline,
  pendingJoinCode,
}: Props) {
  const [players, setPlayers] = useState(2);
  const [size, setSize] = useState(6);
  const [mode, setMode] = useState<'local' | 'online'>(pendingJoinCode ? 'online' : 'local');
  const [action, setAction] = useState<'create' | 'join'>(pendingJoinCode ? 'join' : 'create');
  const [code, setCode] = useState(pendingJoinCode ?? '');
  const [name, setName] = useState(defaultName);
  const [opponents, setOpponents] = useState<'humans' | 'bots'>('humans');
  const [botLevel, setBotLevel] = useState<BotDifficulty>('bot-medium');
  const [showHelp, setShowHelp] = useState(false);

  function handleGo() {
    const trimmedName = name.trim() || 'Player';
    if (mode === 'local') {
      const seats: SeatKind[] = Array.from({ length: players }, (_, i) =>
        i === 0 || opponents === 'humans' ? 'human' : botLevel,
      );
      onLocal(players, size, seats);
      return;
    }
    if (action === 'create') {
      onCreateOnline(players, size, trimmedName);
    } else {
      onJoinOnline(code.trim().toUpperCase(), trimmedName);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal start">
        <div className="modal-label">Chain Reaction</div>
        <div className="sub">
          Place atoms. Overflow a cell → chain reaction. Last one standing wins.
        </div>

        <div className="field">
          <label>Mode</label>
          <div className="segmented">
            <button
              className={`seg${mode === 'local' ? ' active' : ''}`}
              onClick={() => setMode('local')}
            >
              Local
            </button>
            <button
              className={`seg${mode === 'online' ? ' active' : ''}`}
              onClick={() => setMode('online')}
            >
              Online
            </button>
          </div>
        </div>

        {mode === 'online' && (
          <>
            <div className="field">
              <label>Name</label>
              <input
                className="text-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={16}
                placeholder="Your name"
              />
            </div>
            <div className="field">
              <label>Room</label>
              <div className="segmented">
                <button
                  className={`seg${action === 'create' ? ' active' : ''}`}
                  onClick={() => setAction('create')}
                >
                  Create
                </button>
                <button
                  className={`seg${action === 'join' ? ' active' : ''}`}
                  onClick={() => setAction('join')}
                >
                  Join
                </button>
              </div>
            </div>
            {action === 'join' && (
              <div className="field">
                <label>Code</label>
                <input
                  className="text-input code-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="XXXXX"
                />
              </div>
            )}
          </>
        )}

        {(mode === 'local' || action === 'create') && (
          <>
            {!(mode === 'local' && opponents === 'bots') && (
              <div className="field">
                <label>Players</label>
                <div className="pill-row">
                  {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <button
                      key={n}
                      className={`pill${n === players ? ' active' : ''}`}
                      onClick={() => setPlayers(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="field">
              <label>Board</label>
              <div className="pill-row">
                {[5, 6, 7, 8].map((n) => (
                  <button
                    key={n}
                    className={`pill${n === size ? ' active' : ''}`}
                    onClick={() => setSize(n)}
                  >
                    {n}×{n}
                  </button>
                ))}
              </div>
            </div>
            {mode === 'local' && (
              <>
                <div className="field">
                  <label>Opponents</label>
                  <div className="segmented">
                    <button
                      className={`seg${opponents === 'humans' ? ' active' : ''}`}
                      onClick={() => setOpponents('humans')}
                    >
                      Humans
                    </button>
                    <button
                      className={`seg${opponents === 'bots' ? ' active' : ''}`}
                      onClick={() => {
                        setOpponents('bots');
                        setPlayers(2);
                      }}
                    >
                      Bot (1v1)
                    </button>
                  </div>
                </div>
                {opponents === 'bots' && (
                  <div className="field">
                    <label>Difficulty</label>
                    <div className="pill-row">
                      {(Object.keys(BOT_LABELS) as BotDifficulty[]).map((k) => (
                        <button
                          key={k}
                          className={`pill${k === botLevel ? ' active' : ''}`}
                          onClick={() => setBotLevel(k)}
                        >
                          {BOT_LABELS[k]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        <button className="start-btn" onClick={handleGo}>
          {mode === 'local' ? 'Start' : action === 'create' ? 'Create Room' : 'Join Room'}
        </button>
        <button className="help-link" onClick={() => setShowHelp(true)}>
          How to play
        </button>
      </div>
      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}
    </div>
  );
}
