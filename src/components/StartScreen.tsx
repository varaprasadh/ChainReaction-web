import { useState } from 'react';

interface Props {
  defaultName: string;
  onLocal: (playerCount: number, size: number) => void;
  onCreateOnline: (playerCount: number, size: number, name: string) => void;
  onJoinOnline: (code: string, name: string) => void;
  pendingJoinCode?: string;
}

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

  function handleGo() {
    const trimmedName = name.trim() || 'Player';
    if (mode === 'local') {
      onLocal(players, size);
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
          <div className="pill-row">
            <button
              className={`pill${mode === 'local' ? ' active' : ''}`}
              onClick={() => setMode('local')}
            >
              Local
            </button>
            <button
              className={`pill${mode === 'online' ? ' active' : ''}`}
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
              <div className="pill-row">
                <button
                  className={`pill${action === 'create' ? ' active' : ''}`}
                  onClick={() => setAction('create')}
                >
                  Create
                </button>
                <button
                  className={`pill${action === 'join' ? ' active' : ''}`}
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
          </>
        )}

        <button className="start-btn" onClick={handleGo}>
          {mode === 'local' ? 'Start' : action === 'create' ? 'Create Room' : 'Join Room'}
        </button>
      </div>
    </div>
  );
}
