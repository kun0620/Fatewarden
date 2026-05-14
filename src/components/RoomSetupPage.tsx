import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
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
    <section className="fw-room-setup-page">
      <header className="fw-room-setup-page__header">
        <p className="fw-caption">Step 2 of 4</p>
        <h1 className="fw-h2">Forge your realm</h1>
        <p className="fw-body">Configure the room before assembling the party.</p>
      </header>
      <RoomSetupForm
        draft={draft}
        busy={busy}
        errors={errors}
        onChange={setDraft}
        onSubmit={handleSubmit}
        onCancel={onCancel}
      />
      {serverError ? <p className="fw-caption fw-room-setup-page__error">{serverError}</p> : null}
    </section>
  );
}
