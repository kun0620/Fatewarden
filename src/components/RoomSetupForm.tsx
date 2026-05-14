import { type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import type { RoomSetupDraft, RoomSetupValidationError } from '../lib/roomSetup';
import { ruleStrictnessOptions, visibilityOptions, PARTY_SIZE_MIN, PARTY_SIZE_MAX } from '../lib/roomSetup';
import { playModes } from '../lib/playModes';
import { sessionThemePresets } from '../lib/sessionThemes';

type RoomSetupFormProps = {
  draft: RoomSetupDraft;
  busy: boolean;
  errors: RoomSetupValidationError[];
  onChange: (draft: RoomSetupDraft) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

function errorFor(errors: RoomSetupValidationError[], field: keyof RoomSetupDraft): string | undefined {
  return errors.find((e) => e.field === field)?.message;
}

function FormSection({ children, label, required }: { children: ReactNode; label: string; required?: boolean }) {
  return (
    <div className="fw-room-form-v2__section">
      <label className="fw-room-form-v2__label">
        {label}
        {required && <span className="fw-room-form-v2__required">*</span>}
      </label>
      {children}
    </div>
  );
}

export function RoomSetupForm({ draft, busy, errors, onChange, onSubmit, onCancel }: RoomSetupFormProps) {
  const titleError = errorFor(errors, 'title');
  const partySizeError = errorFor(errors, 'partySize');

  return (
    <form className="fw-room-form-v2">
      {/* Room Name */}
      <FormSection label="Room Name" required>
        <input
          className={`fw-input ${titleError ? 'fw-input--error' : ''}`}
          disabled={busy}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          placeholder="Enter adventure name"
          type="text"
          value={draft.title}
        />
        {titleError && <p className="fw-room-form-v2__error">{titleError}</p>}
      </FormSection>

      {/* Play Mode */}
      <FormSection label="Play Mode">
        <div className="fw-room-form-v2__chips" role="group" aria-label="Play mode">
          {playModes.map((mode) => (
            <button
              key={mode.id}
              className="fw-room-form-v2__chip"
              data-active={draft.playMode === mode.id}
              disabled={busy}
              onClick={() => onChange({ ...draft, playMode: mode.id })}
              type="button"
            >
              <strong>{mode.shortLabel}</strong>
            </button>
          ))}
        </div>
        <p className="fw-caption" style={{ marginTop: 'var(--sp-2)' }}>
          {playModes.find((m) => m.id === draft.playMode)?.description}
        </p>
      </FormSection>

      {/* Theme */}
      <FormSection label="Theme">
        <div className="fw-room-form-v2__chips" role="group" aria-label="Room theme">
          {sessionThemePresets.map((theme) => (
            <button
              key={theme.key}
              className="fw-room-form-v2__chip"
              data-active={draft.themeKey === theme.key}
              disabled={busy}
              onClick={() => onChange({ ...draft, themeKey: theme.key })}
              type="button"
            >
              <strong>{theme.label}</strong>
            </button>
          ))}
        </div>
      </FormSection>

      {/* Rule Strictness */}
      <FormSection label="Rule Strictness">
        <div className="fw-room-form-v2__segment" role="group" aria-label="Rule strictness">
          {ruleStrictnessOptions.map((option) => (
            <button
              key={option.id}
              className="fw-room-form-v2__segment-btn"
              data-active={draft.ruleStrictness === option.id}
              disabled={busy}
              onClick={() => onChange({ ...draft, ruleStrictness: option.id })}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="fw-caption" style={{ marginTop: 'var(--sp-2)' }}>
          {ruleStrictnessOptions.find((o) => o.id === draft.ruleStrictness)?.description}
        </p>
      </FormSection>

      {/* Party Size */}
      <FormSection label="Party Size" required>
        <div className="fw-room-form-v2__stepper">
          <button
            className="fw-room-form-v2__stepper-btn fw-btn fw-btn--sm fw-btn--ghost"
            disabled={busy || draft.partySize <= PARTY_SIZE_MIN}
            onClick={() => onChange({ ...draft, partySize: Math.max(PARTY_SIZE_MIN, draft.partySize - 1) })}
            type="button"
          >
            −
          </button>
          <input
            className="fw-input"
            disabled={busy}
            max={PARTY_SIZE_MAX}
            min={PARTY_SIZE_MIN}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) {
                onChange({ ...draft, partySize: Math.min(PARTY_SIZE_MAX, Math.max(PARTY_SIZE_MIN, val)) });
              }
            }}
            style={{ width: '60px', textAlign: 'center' }}
            type="number"
            value={draft.partySize}
          />
          <button
            className="fw-room-form-v2__stepper-btn fw-btn fw-btn--sm fw-btn--ghost"
            disabled={busy || draft.partySize >= PARTY_SIZE_MAX}
            onClick={() => onChange({ ...draft, partySize: Math.min(PARTY_SIZE_MAX, draft.partySize + 1) })}
            type="button"
          >
            +
          </button>
        </div>
        {partySizeError && <p className="fw-room-form-v2__error">{partySizeError}</p>}
      </FormSection>

      {/* Allow AI DM */}
      <FormSection label="Allow AI DM">
        <label className="fw-room-form-v2__toggle">
          <input
            checked={draft.allowAiDm}
            disabled={busy}
            onChange={(e) => onChange({ ...draft, allowAiDm: e.target.checked })}
            type="checkbox"
          />
          <span>{draft.allowAiDm ? 'Enabled' : 'Disabled'}</span>
        </label>
      </FormSection>

      {/* Visibility */}
      <FormSection label="Visibility">
        <div className="fw-room-form-v2__segment" role="group" aria-label="Room visibility">
          {visibilityOptions.map((option) => (
            <button
              key={option.id}
              className="fw-room-form-v2__segment-btn"
              data-active={draft.visibility === option.id}
              disabled={busy}
              onClick={() => onChange({ ...draft, visibility: option.id })}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </FormSection>

      {/* Theme Notes */}
      <FormSection label="Theme Notes">
        <input
          className="fw-input"
          disabled={busy}
          onChange={(e) => onChange({ ...draft, themeNotes: e.target.value })}
          placeholder="Optional: atmosphere, tone, specifics"
          value={draft.themeNotes}
        />
      </FormSection>

      {/* House Rules */}
      <FormSection label="House Rules">
        <input
          className="fw-input"
          disabled={busy}
          onChange={(e) => onChange({ ...draft, houseRules: e.target.value })}
          placeholder="Optional: custom rules or notes"
          value={draft.houseRules}
        />
      </FormSection>

      {/* Footer */}
      <div className="fw-room-form-v2__footer">
        <button className="fw-btn fw-btn--ghost" disabled={busy} onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="fw-btn fw-btn--primary" disabled={busy} onClick={onSubmit} type="button">
          <Plus size={17} aria-hidden="true" />
          {busy ? 'Creating...' : 'Create Room'}
        </button>
      </div>
    </form>
  );
}
