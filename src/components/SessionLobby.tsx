import { DoorOpen, LogOut, Plus, ScrollText, Trash2, X } from 'lucide-react';
import { FormEvent, type ReactNode, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getPlayModeDefinition, playModes } from '../lib/playModes';
import { defaultSessionTheme, getSessionThemeDefinition, sessionThemePresets, sessionThemeTones } from '../lib/sessionThemes';
import { createGameSession, deleteGameSession, joinGameSession, listJoinedSessions } from '../lib/sessions';
import type { GameSession, SessionPlayMode, SessionThemeKey, SessionThemeTone } from '../types';

export type RoomModal = 'create' | 'join' | 'continue' | null;

type SessionLobbyProps = {
  onRequestEnterSession: (session: GameSession) => void;
  onRoomModalChange: (modal: RoomModal) => void;
  onSignOut: () => void;
  roomModal: RoomModal;
  user: User | null;
};

type RoomModalShellProps = {
  children: ReactNode;
  eyebrow: string;
  onClose: () => void;
  title: string;
};

function RoomModalShell({ children, eyebrow, onClose, title }: RoomModalShellProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="character-setup-modal room-modal" role="dialog">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          <button aria-label="Close room menu" className="icon-button" onClick={onClose} type="button">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function SessionLobby({ onRequestEnterSession, onRoomModalChange, onSignOut, roomModal, user }: SessionLobbyProps) {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [title, setTitle] = useState('The Witchlight Tower');
  const [playMode, setPlayMode] = useState<SessionPlayMode>('dnd');
  const [themeKey, setThemeKey] = useState<SessionThemeKey>(defaultSessionTheme.key);
  const [themeTone, setThemeTone] = useState<SessionThemeTone>(defaultSessionTheme.tone);
  const [themeNotes, setThemeNotes] = useState('');
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
  }, [roomModal, user]);

  function closeModal() {
    if (busy) return;
    onRoomModalChange(null);
    setMessage('');
  }

  async function createSession(event: FormEvent) {
    event.preventDefault();
    if (!user) return;

    setBusy(true);
    setMessage('');
    try {
      const session = await createGameSession(title.trim() || 'Untitled Adventure', user, houseRules, playMode, {
        key: themeKey,
        tone: themeTone,
        notes: themeNotes,
      });
      setSessions((current) => [session, ...current]);
      setHouseRules('');
      setThemeNotes('');
      onRoomModalChange(null);
      onRequestEnterSession(session);
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
      setJoinCode('');
      onRoomModalChange(null);
      onRequestEnterSession(session);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not join session.');
    }
    setBusy(false);
  }

  function enterSession(session: GameSession) {
    if (!user) return;
    onRoomModalChange(null);
    onRequestEnterSession(session);
  }

  async function deleteSession(session: GameSession) {
    if (!user || session.createdBy !== user.id) return;
    const confirmed = window.confirm(`Delete "${session.title}"? This removes the table, party, combat, and story log.`);
    if (!confirmed) return;

    setBusy(true);
    setMessage('');
    try {
      await deleteGameSession(session.id);
      setSessions((current) => current.filter((item) => item.id !== session.id));
      setMessage(`Deleted ${session.title}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete session.');
    }
    setBusy(false);
  }

  return (
    <>
      <section className="panel room-menu-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Main Menu</p>
            <h2>{user ? 'Choose your next move' : 'Sign in to play'}</h2>
          </div>
          <ScrollText size={24} aria-hidden="true" />
        </div>

        <div className="room-menu-actions">
          <button className="primary-button room-menu-button" disabled={!user || busy} onClick={() => onRoomModalChange('create')} type="button">
            <Plus size={18} aria-hidden="true" />
            <span>
              <strong>Create Room</strong>
              <small>Start a new table</small>
            </span>
          </button>
          <button className="secondary-button room-menu-button" disabled={!user || busy} onClick={() => onRoomModalChange('join')} type="button">
            <DoorOpen size={18} aria-hidden="true" />
            <span>
              <strong>Join Room</strong>
              <small>Use an invite code</small>
            </span>
          </button>
          <button className="secondary-button room-menu-button" disabled={!user || busy} onClick={() => onRoomModalChange('continue')} type="button">
            <ScrollText size={18} aria-hidden="true" />
            <span>
              <strong>Continue Room</strong>
              <small>{sessions.length ? `${sessions.length} saved table${sessions.length > 1 ? 's' : ''}` : 'No tables yet'}</small>
            </span>
          </button>
          <button className="secondary-button room-menu-button" disabled={!user || busy} onClick={onSignOut} type="button">
            <LogOut size={18} aria-hidden="true" />
            <span>
              <strong>Sign Out</strong>
              <small>Leave this device</small>
            </span>
          </button>
        </div>

        <p className="form-message">
          {user
            ? 'Create, join, or continue a room. Character setup appears after the table is selected.'
            : 'Login first. Room tools unlock after authentication.'}
        </p>
      </section>

      {roomModal === 'create' ? (
        <RoomModalShell eyebrow="New Table" onClose={closeModal} title="Create room">
          <form className="stack-form create-table-form" onSubmit={createSession}>
            <label>
              Adventure name
              <input
                disabled={!user || busy}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Session title"
                value={title}
              />
            </label>
            <div className="play-mode-picker" aria-label="Play mode">
              <span>Play mode</span>
              <div className="play-mode-options">
                {playModes.map((mode) => (
                  <button
                    className={playMode === mode.id ? 'active' : ''}
                    disabled={!user || busy}
                    key={mode.id}
                    onClick={() => setPlayMode(mode.id)}
                    type="button"
                  >
                    <strong>{mode.shortLabel}</strong>
                    <small>{mode.label}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="rules-strip">
              <span>SRD 5.1</span>
              <span>core</span>
              <span>combat</span>
              <span>conditions</span>
            </div>
            <p className="mode-helper">{getPlayModeDefinition(playMode).description}</p>
            <div className="play-mode-picker" aria-label="Room theme">
              <span>Theme</span>
              <div className="theme-options">
                {sessionThemePresets.map((theme) => (
                  <button
                    className={themeKey === theme.key ? 'active' : ''}
                    disabled={!user || busy}
                    key={theme.key}
                    onClick={() => setThemeKey(theme.key)}
                    type="button"
                  >
                    <strong>{theme.label}</strong>
                    <small>{theme.description}</small>
                  </button>
                ))}
              </div>
            </div>
            <label>
              Tone
              <select
                disabled={!user || busy}
                onChange={(event) => setThemeTone(event.target.value as SessionThemeTone)}
                value={themeTone}
              >
                {sessionThemeTones.map((tone) => (
                  <option key={tone.key} value={tone.key}>
                    {tone.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Theme notes
              <input
                disabled={!user || busy}
                onChange={(event) => setThemeNotes(event.target.value)}
                placeholder="เช่น เมืองฝนตก, วิญญาณ, สืบคดีฆาตกรรม"
                value={themeNotes}
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
              {busy ? 'Creating...' : 'Create Room'}
            </button>
          </form>
          {message ? <p className="form-message">{message}</p> : null}
        </RoomModalShell>
      ) : null}

      {roomModal === 'join' ? (
        <RoomModalShell eyebrow="Invitation" onClose={closeModal} title="Join room">
          <form className="stack-form join-table-form" onSubmit={joinSession}>
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
            <button className="primary-button" disabled={!user || busy || !joinCode.trim()} type="submit">
              <DoorOpen size={17} aria-hidden="true" />
              {busy ? 'Joining...' : 'Join Room'}
            </button>
          </form>
          {message ? <p className="form-message">{message}</p> : null}
        </RoomModalShell>
      ) : null}

      {roomModal === 'continue' ? (
        <RoomModalShell eyebrow="Saved Tables" onClose={closeModal} title="Continue room">
          {message ? <p className="form-message">{message}</p> : null}
          {sessions.length ? (
            <div className="session-list room-session-list">
              {sessions.map((session) => (
                <div className="session-row" key={session.id}>
                  <button disabled={busy || !user} onClick={() => enterSession(session)} type="button">
                    <span>{session.title}</span>
                    <strong>
                      {getPlayModeDefinition(session.playMode).shortLabel} / {getSessionThemeDefinition(session.theme.key).label} / Enter
                    </strong>
                  </button>
                  {session.createdBy === user?.id ? (
                    <button
                      aria-label={`Delete ${session.title}`}
                      className="icon-button danger-icon"
                      disabled={busy}
                      onClick={() => void deleteSession(session)}
                      type="button"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No saved tables yet. Create or join a room first.</p>
          )}
        </RoomModalShell>
      ) : null}
    </>
  );
}
