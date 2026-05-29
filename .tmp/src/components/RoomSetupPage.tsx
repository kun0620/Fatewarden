import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { ChevronLeft, Home, Plus, Settings, Users } from 'lucide-react';
import type { GameSession } from '../types';
import { createGameSession } from '../lib/sessions';
import { getDefaultRoomSetup, validateRoomSetup, type RoomSetupDraft, type RoomSetupValidationError } from '../lib/roomSetup';
import { RoomSetupForm } from './RoomSetupForm';

type RoomSetupPageProps = {
  user: User;
  onCreated: (session: GameSession) => void;
  onCancel: () => void;
};

export function RoomSetupPage({ user, onCreated, onCancel }: RoomSetupPageProps) {
  const [draft, setDraft] = useState<RoomSetupDraft>(() => getDefaultRoomSetup());
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<RoomSetupValidationError[]>([]);
  const [serverError, setServerError] = useState('');

  async function handleSubmit() {
    const validationErrors = validateRoomSetup(draft);
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }

    setBusy(true);
    setServerError('');
    try {
      const session = await createGameSession(draft, user);
      onCreated(session);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Could not create room.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fw-menu-shell fw-room-setup-shell">
      <aside className="fw-menu-shell__rail" aria-label="Main navigation">
        <div className="fw-menu-shell__rail-logo">FW</div>
        <button className="fw-menu-shell__rail-btn" onClick={onCancel} title="Main Menu" type="button">
          <Home size={18} aria-hidden="true" />
        </button>
        <button className="fw-menu-shell__rail-btn is-active" title="Room Setup" type="button">
          <Plus size={17} aria-hidden="true" />
        </button>
        <button className="fw-menu-shell__rail-btn" disabled title="Characters" type="button">
          <Users size={17} aria-hidden="true" />
        </button>
        <div className="fw-menu-shell__rail-spacer" />
        <button className="fw-menu-shell__rail-btn" disabled title="Settings" type="button">
          <Settings size={17} aria-hidden="true" />
        </button>
        <div className="fw-menu-shell__rail-user">{user.email?.slice(0, 2).toUpperCase() ?? 'U'}</div>
      </aside>

      <section className="fw-menu-shell__main">
        <header className="fw-menu-shell__topbar">
          <div className="fw-menu-shell__crumb">
            <span>Hearth</span>
            <span className="sep">&gt;</span>
            <span>Main Menu</span>
            <span className="sep">&gt;</span>
            <strong>Room Setup</strong>
          </div>
          <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={onCancel} type="button">
            <ChevronLeft size={14} aria-hidden="true" />
            Back to menu
          </button>
        </header>

        <section className="fw-room-setup-proto">
          <RoomSetupForm
            draft={draft}
            busy={busy}
            errors={errors}
            onChange={setDraft}
            onSubmit={handleSubmit}
            onCancel={onCancel}
            serverError={serverError}
          />
        </section>
      </section>
    </div>
  );
}
