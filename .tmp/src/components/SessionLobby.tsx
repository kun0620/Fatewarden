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
  modalsOnly?: boolean;
};

type RoomModalShellProps = {
  children: ReactNode;
  eyebrow: string;
  onClose: () => void;
  title: string;
};

function RoomModalShell({ children, eyebrow, onClose, title }: RoomModalShellProps) {
  return (
    <div className="fw-backdrop" role="presentation">
      <section aria-modal="true" className="fw-modal fw-room-modal" role="dialog">
        <div className="fw-modal__header">
          <div>
            <p className="fw-caption">{eyebrow}</p>
            <h2 className="fw-h2">{title}</h2>
          </div>
          <button aria-label="Close room menu" className="fw-btn fw-btn--icon" onClick={onClose} type="button">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="fw-room-modal__body">
          {children}
        </div>
      </section>
    </div>
  );
}

export function SessionLobby({ onRequestEnterSession, onRoomModalChange, onSignOut, roomModal, user, modalsOnly }: SessionLobbyProps) {
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
      const session = await createGameSession({
        title: title.trim() || 'Untitled Adventure',
        playMode,
        themeKey,
        themeNotes,
        ruleStrictness: 'standard',
        partySize: 4,
        allowAiDm: true,
        visibility: 'invite_code',
        houseRules,
      }, user);
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
      {!modalsOnly ? (
        <section className="fw-panel fw-card--framed fw-room-menu">
        <div className="fw-panel__header">
          <div>
            <p className="fw-caption">Main Menu</p>
            <h2 className="fw-h2">{user ? 'Choose your next move' : 'Sign in to play'}</h2>
          </div>
          <ScrollText size={24} aria-hidden="true" />
        </div>

        <div className="fw-room-menu__doors">
          <button
            className="fw-room-door fw-room-door--primary"
            disabled={!user || busy}
            onClick={() => onRoomModalChange('create')}
            type="button"
          >
            <Plus size={18} aria-hidden="true" />
            <span className="fw-room-door__copy">
              <strong>Forge New Realm</strong>
              <small className="fw-caption">Create a new table</small>
            </span>
          </button>
          <button
            className="fw-room-door"
            disabled={!user || busy}
            onClick={() => onRoomModalChange('join')}
            type="button"
          >
            <DoorOpen size={18} aria-hidden="true" />
            <span className="fw-room-door__copy">
              <strong>Cross The Threshold</strong>
              <small className="fw-caption">Join with a code</small>
            </span>
          </button>
          <button
            className="fw-room-door"
            disabled={!user || busy}
            onClick={() => onRoomModalChange('continue')}
            type="button"
          >
            <ScrollText size={18} aria-hidden="true" />
            <span className="fw-room-door__copy">
              <strong>Return To Vigil</strong>
              <small className="fw-caption">
                {sessions.length ? `${sessions.length} saved table${sessions.length > 1 ? 's' : ''}` : 'No tables yet'}
              </small>
            </span>
          </button>
        </div>

        <div className="fw-room-menu__footer">
          <button
            className="fw-btn fw-btn--ghost"
            disabled={!user || busy}
            onClick={onSignOut}
            type="button"
          >
            <LogOut size={18} aria-hidden="true" />
            <strong>Sign Out</strong>
          </button>
          <p className="fw-caption">
            {user
              ? 'Create, join, or continue a room. Character setup appears after the table is selected.'
              : 'Login first. Room tools unlock after authentication.'}
          </p>
        </div>
      </section>
      ) : null}

      {roomModal === 'create' ? (
        <RoomModalShell eyebrow="New Table" onClose={closeModal} title="Create room">
          <form className="fw-room-form" onSubmit={createSession}>
            <div className="fw-field">
              <label className="fw-field__label">Adventure name</label>
              <input
                className="fw-input"
                disabled={!user || busy}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Session title"
                value={title}
              />
            </div>

            <div>
              <p className="fw-caption fw-room-form__label">Play mode</p>
              <div className="fw-room-form__chips" aria-label="Play mode">
                {playModes.map((mode) => (
                  <button
                    className={`fw-btn fw-btn--sm ${playMode === mode.id ? 'fw-btn--primary' : 'fw-btn--ghost'}`}
                    disabled={!user || busy}
                    key={mode.id}
                    onClick={() => setPlayMode(mode.id)}
                    type="button"
                  >
                    <strong>{mode.shortLabel}</strong>
                    <small style={{ marginLeft: 'var(--sp-1)' }}>{mode.label}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="fw-room-form__chips">
              {['SRD 5.1', 'core', 'combat', 'conditions'].map((rule) => (
                <span className="fw-cond fw-cond--minor" key={rule}>
                  <span className="fw-cond__dot" />{rule}
                </span>
              ))}
            </div>

            <p className="fw-caption">{getPlayModeDefinition(playMode).description}</p>

            <div>
              <p className="fw-caption fw-room-form__label">Theme</p>
              <div className="fw-room-form__chips" aria-label="Room theme">
                {sessionThemePresets.map((theme) => (
                  <button
                    className={`fw-btn fw-btn--sm ${themeKey === theme.key ? 'fw-btn--primary' : 'fw-btn--ghost'}`}
                    disabled={!user || busy}
                    key={theme.key}
                    onClick={() => setThemeKey(theme.key)}
                    type="button"
                  >
                    <strong>{theme.label}</strong>
                  </button>
                ))}
              </div>
            </div>

            <div className="fw-field">
              <label className="fw-field__label">Tone</label>
              <select
                className="fw-select"
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
            </div>

            <div className="fw-field">
              <label className="fw-field__label">Theme notes</label>
              <input
                className="fw-input"
                disabled={!user || busy}
                onChange={(event) => setThemeNotes(event.target.value)}
                placeholder="เช่น เมืองฝนตก, วิญญาณ, สืบคดีฆาตกรรม"
                value={themeNotes}
              />
            </div>

            <div className="fw-field">
              <label className="fw-field__label">House rules</label>
              <input
                className="fw-input"
                disabled={!user || busy}
                onChange={(event) => setHouseRules(event.target.value)}
                placeholder="Optional note"
                value={houseRules}
              />
            </div>

            <button className="fw-btn fw-btn--primary" disabled={!user || busy} type="submit">
              <Plus size={17} aria-hidden="true" />
              {busy ? 'Creating...' : 'Create Room'}
            </button>
          </form>
          {message ? <p className="fw-caption">{message}</p> : null}
        </RoomModalShell>
      ) : null}

      {roomModal === 'join' ? (
        <RoomModalShell eyebrow="Invitation" onClose={closeModal} title="Join room">
          <form className="fw-room-form" onSubmit={joinSession}>
            <div className="fw-field">
              <label className="fw-field__label">Join code</label>
              <input
                className="fw-input fw-input--mono"
                disabled={!user || busy}
                maxLength={8}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="AB12"
                value={joinCode}
              />
            </div>
            <button className="fw-btn fw-btn--primary" disabled={!user || busy || !joinCode.trim()} type="submit">
              <DoorOpen size={17} aria-hidden="true" />
              {busy ? 'Joining...' : 'Join Room'}
            </button>
          </form>
          {message ? <p className="fw-caption">{message}</p> : null}
        </RoomModalShell>
      ) : null}

      {roomModal === 'continue' ? (
        <RoomModalShell eyebrow="Saved Tables" onClose={closeModal} title="Continue room">
          {message ? <p className="fw-caption">{message}</p> : null}
          {sessions.length ? (
            <div className="fw-room-continue-list">
              {sessions.map((session) => (
                <div className="fw-room-continue-item" key={session.id}>
                  <button
                    className="fw-btn fw-btn--ghost"
                    disabled={busy || !user}
                    onClick={() => enterSession(session)}
                    style={{ flex: 1, justifyContent: 'flex-start', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}
                    type="button"
                  >
                    <span className="fw-body-sm">{session.title}</span>
                    <strong className="fw-caption">
                      {getPlayModeDefinition(session.playMode).shortLabel} / {getSessionThemeDefinition(session.theme.key).label} / Enter
                    </strong>
                  </button>
                  {session.createdBy === user?.id ? (
                    <button
                      aria-label={`Delete ${session.title}`}
                      className="fw-btn fw-btn--danger fw-btn--icon"
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
            <p className="fw-caption">No saved tables yet. Create or join a room first.</p>
          )}
        </RoomModalShell>
      ) : null}
    </>
  );
}
