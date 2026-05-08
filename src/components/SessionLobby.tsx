import { Copy, DoorOpen, Plus } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createGameSession, joinGameSession, listJoinedSessions } from '../lib/sessions';
import type { GameSession } from '../types';

type SessionLobbyProps = {
  activeSession: GameSession | null;
  onSelectSession: (session: GameSession) => void;
  user: User | null;
};

export function SessionLobby({ activeSession, onSelectSession, user }: SessionLobbyProps) {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [title, setTitle] = useState('The Witchlight Tower');
  const [houseRules, setHouseRules] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) {
      setSessions([]);
      return;
    }

    let alive = true;
    listJoinedSessions()
      .then((rows) => {
        if (!alive) return;
        setSessions(rows);
      })
      .catch((error: Error) => {
        if (alive) setMessage(error.message);
      });

    return () => {
      alive = false;
    };
  }, [activeSession, onSelectSession, user]);

  async function createSession(event: FormEvent) {
    event.preventDefault();
    if (!user) return;

    setBusy(true);
    setMessage('');
    try {
      const session = await createGameSession(title.trim() || 'Untitled Adventure', user, houseRules);
      setSessions((current) => [session, ...current]);
      onSelectSession(session);
      setHouseRules('');
      setMessage(`Created ${session.title}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create session.');
    }
    setBusy(false);
  }

  async function joinSession(event: FormEvent) {
    event.preventDefault();
    if (!user) return;

    setBusy(true);
    setMessage('');
    try {
      const session = await joinGameSession(joinCode, user);
      setSessions((current) => [session, ...current.filter((item) => item.id !== session.id)]);
      onSelectSession(session);
      setJoinCode('');
      setMessage(`Joined ${session.title}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not join session.');
    }
    setBusy(false);
  }

  function copyCode() {
    if (!activeSession) return;
    void navigator.clipboard?.writeText(activeSession.joinCode);
    setMessage('Join code copied.');
  }

  return (
    <section className="panel lobby-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Table</p>
          <h2>{activeSession ? activeSession.title : 'Create or join'}</h2>
        </div>
        {activeSession ? (
          <button className="code-button" onClick={copyCode} type="button">
            <Copy size={15} aria-hidden="true" />
            {activeSession.joinCode}
          </button>
        ) : null}
      </div>

      <div className="lobby-grid">
        <form className="stack-form" onSubmit={createSession}>
          <label>
            Adventure name
            <input
              disabled={!user || busy}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Session title"
              value={title}
            />
          </label>
          <label>
            House rules
            <input
              disabled={!user || busy}
              onChange={(event) => setHouseRules(event.target.value)}
              placeholder="Optional note"
              value={houseRules}
            />
          </label>
          <button className="primary-button" disabled={!user || busy} type="submit">
            <Plus size={17} aria-hidden="true" />
            Create
          </button>
        </form>

        <form className="stack-form" onSubmit={joinSession}>
          <label>
            Join code
            <input
              disabled={!user || busy}
              maxLength={8}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="AB12"
              value={joinCode}
            />
          </label>
          <button className="secondary-button" disabled={!user || busy || !joinCode.trim()} type="submit">
            <DoorOpen size={17} aria-hidden="true" />
            Join
          </button>
        </form>
      </div>

      {message ? <p className="form-message">{message}</p> : null}

      {activeSession ? (
        <div className="rules-strip">
          <span>SRD 5.1</span>
          {activeSession.rules.enabledModules.map((module) => (
            <span key={module}>{module}</span>
          ))}
          {activeSession.rules.houseRules ? <strong>{activeSession.rules.houseRules}</strong> : null}
        </div>
      ) : null}

      {sessions.length ? (
        <div className="session-list">
          {sessions.map((session) => (
            <button
              className={activeSession?.id === session.id ? 'active' : ''}
              key={session.id}
              onClick={() => onSelectSession(session)}
              type="button"
            >
              <span>{session.title}</span>
              <strong>{activeSession?.id === session.id ? 'Active' : `Enter ${session.joinCode}`}</strong>
            </button>
          ))}
        </div>
      ) : (
        <p className="empty-state">
          {user ? 'No sessions yet.' : 'Sign in to create a table or join with a code.'}
        </p>
      )}
    </section>
  );
}
