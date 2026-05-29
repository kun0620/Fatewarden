import type { ReactNode } from 'react';
import { ChevronLeft, Crown, Dice5, Eye, Flame, Globe, Hexagon, Plus, ScrollText, Shield, Skull, Sparkles, Users, WandSparkles } from 'lucide-react';
import type { RoomSetupDraft, RoomSetupValidationError } from '../lib/roomSetup';
import { PARTY_SIZE_MAX, PARTY_SIZE_MIN, ruleStrictnessOptions, visibilityOptions } from '../lib/roomSetup';
import { playModes } from '../lib/playModes';
import { sessionThemePresets } from '../lib/sessionThemes';
import type { RuleStrictness, RoomVisibility, SessionPlayMode, SessionThemeKey } from '../types';
import { RoomSetupPreviewCard } from './RoomSetupPreviewCard';

type RoomSetupFormProps = {
  draft: RoomSetupDraft;
  busy: boolean;
  errors: RoomSetupValidationError[];
  onChange: (draft: RoomSetupDraft) => void;
  onSubmit: () => void;
  onCancel: () => void;
  serverError?: string;
};

const playModeIcons: Record<SessionPlayMode, ReactNode> = {
  dnd: <Dice5 size={16} aria-hidden="true" />,
  story: <ScrollText size={16} aria-hidden="true" />,
  ai_dm: <WandSparkles size={16} aria-hidden="true" />,
  hexplore: <Hexagon size={16} aria-hidden="true" />,
};

const themeIcons: Record<SessionThemeKey, ReactNode> = {
  dark_fantasy: <Flame size={16} aria-hidden="true" />,
  high_fantasy: <Crown size={16} aria-hidden="true" />,
  horror: <Skull size={16} aria-hidden="true" />,
  mystery: <Eye size={16} aria-hidden="true" />,
};

const strictDescriptions: Record<RuleStrictness, string> = {
  casual: 'DM may rule loosely. Player intent often beats the die.',
  standard: 'By the book, with DM discretion for table fun.',
  hardcore: 'RAW. No takebacks. Death is permanent unless rules allow otherwise.',
};

const visibilityDescriptions: Record<RoomVisibility, string> = {
  invite_code: 'Anyone with the code can join the lobby.',
  private: 'Only invited players can view this room.',
};

function errorFor(errors: RoomSetupValidationError[], field: keyof RoomSetupDraft): string | undefined {
  return errors.find((e) => e.field === field)?.message;
}

function incrementPartySize(draft: RoomSetupDraft, amount: number): RoomSetupDraft {
  return {
    ...draft,
    partySize: Math.min(PARTY_SIZE_MAX, Math.max(PARTY_SIZE_MIN, draft.partySize + amount)),
  };
}

function partySlots(partySize: number) {
  return Array.from({ length: PARTY_SIZE_MAX }, (_, index) => index < partySize);
}

export function RoomSetupForm({ draft, busy, errors, onChange, onSubmit, onCancel, serverError }: RoomSetupFormProps) {
  const titleError = errorFor(errors, 'title');
  const partySizeError = errorFor(errors, 'partySize');
  const mode = playModes.find((item) => item.id === draft.playMode) ?? playModes[0];
  const theme = sessionThemePresets.find((item) => item.key === draft.themeKey) ?? sessionThemePresets[0];
  const strict = ruleStrictnessOptions.find((item) => item.id === draft.ruleStrictness) ?? ruleStrictnessOptions[1];

  return (
    <div className="fw-room-setup-proto__shell">
      <header className="fw-room-setup-proto__header">
        <div>
          <p className="fw-eyebrow">Step 1 of 2</p>
          <h1 className="fw-display">Forge a Room</h1>
          <p className="fw-room-setup-proto__sub">
            Set the rules of the table. You can adjust details later, but this becomes the shared compact.
          </p>
        </div>
        <div className="fw-room-setup-proto__header-actions">
          <button className="fw-btn fw-btn-ghost" disabled={busy} onClick={onCancel} type="button">
            <ChevronLeft size={14} aria-hidden="true" />
            Back
          </button>
          <button className="fw-btn fw-btn-gold" disabled={busy} onClick={onSubmit} type="button">
            <Plus size={16} aria-hidden="true" />
            {busy ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      </header>

      <div className="fw-room-setup-proto__layout">
        <div className="fw-room-setup-proto__form-column">
          <section className="fw-card fw-card--framed fw-room-setup-proto__card">
            <div className="fw-card-head">
              <span className="fw-room-setup-proto__card-icon">
                <ScrollText size={14} aria-hidden="true" />
              </span>
              <h3>Identity</h3>
            </div>
            <div className="fw-room-setup-proto__card-body">
              <label className="fw-field">
                <span className="fw-label">Room Name</span>
                <input
                  className={`fw-input ${titleError ? 'fw-input--error' : ''}`}
                  disabled={busy}
                  onChange={(event) => onChange({ ...draft, title: event.target.value })}
                  placeholder="The Gilded Tomb"
                  type="text"
                  value={draft.title}
                />
              </label>
              {titleError ? <p className="fw-room-setup-proto__error">{titleError}</p> : null}
            </div>
          </section>

          <section className="fw-card fw-card--framed fw-room-setup-proto__card">
            <div className="fw-card-head">
              <span className="fw-room-setup-proto__card-icon">
                <Dice5 size={14} aria-hidden="true" />
              </span>
              <h3>Play Mode</h3>
            </div>
            <div className="fw-room-setup-proto__card-body">
              <div className="fw-room-setup-proto__tile-grid fw-room-setup-proto__tile-grid--two">
                {playModes.map((item) => (
                  <button
                    className="fw-room-setup-proto__tile"
                    data-active={draft.playMode === item.id}
                    disabled={busy}
                    key={item.id}
                    onClick={() => onChange({ ...draft, playMode: item.id })}
                    type="button"
                  >
                    <span className="fw-room-setup-proto__tile-icon">{playModeIcons[item.id]}</span>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="fw-card fw-card--framed fw-room-setup-proto__card">
            <div className="fw-card-head">
              <span className="fw-room-setup-proto__card-icon">
                <Flame size={14} aria-hidden="true" />
              </span>
              <h3>Theme</h3>
            </div>
            <div className="fw-room-setup-proto__card-body">
              <div className="fw-room-setup-proto__tile-grid fw-room-setup-proto__tile-grid--four">
                {sessionThemePresets.map((item) => (
                  <button
                    className="fw-room-setup-proto__tile"
                    data-active={draft.themeKey === item.key}
                    disabled={busy}
                    key={item.key}
                    onClick={() => onChange({ ...draft, themeKey: item.key })}
                    type="button"
                  >
                    <span className="fw-room-setup-proto__tile-icon">{themeIcons[item.key]}</span>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="fw-room-setup-proto__duo">
            <section className="fw-card fw-card--framed fw-room-setup-proto__card">
              <div className="fw-card-head">
                <span className="fw-room-setup-proto__card-icon">
                  <Shield size={14} aria-hidden="true" />
                </span>
                <h3>Rule Strictness</h3>
              </div>
              <div className="fw-room-setup-proto__card-body fw-room-setup-proto__list">
                {ruleStrictnessOptions.map((item) => (
                  <label
                    className="fw-room-setup-proto__list-option"
                    data-active={draft.ruleStrictness === item.id}
                    key={item.id}
                  >
                    <input
                      checked={draft.ruleStrictness === item.id}
                      disabled={busy}
                      name="ruleStrictness"
                      onChange={() => onChange({ ...draft, ruleStrictness: item.id })}
                      type="radio"
                      value={item.id}
                    />
                    <div>
                      <strong>{item.label}</strong>
                      <small>{strictDescriptions[item.id]}</small>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            <div className="fw-room-setup-proto__duo-side">
              <section className="fw-card fw-card--framed fw-room-setup-proto__card">
                <div className="fw-card-head">
                  <span className="fw-room-setup-proto__card-icon">
                    <Sparkles size={14} aria-hidden="true" />
                  </span>
                  <h3>Allow AI DM</h3>
                </div>
                <div className="fw-room-setup-proto__card-body">
                  <label className="fw-toggle" data-on={draft.allowAiDm}>
                    <input
                      checked={draft.allowAiDm}
                      className="fw-room-setup-proto__sr-only"
                      disabled={busy}
                      onChange={(event) => onChange({ ...draft, allowAiDm: event.target.checked })}
                      type="checkbox"
                    />
                    <span className="fw-toggle__thumb" />
                  </label>
                  <p className="fw-room-setup-proto__toggle-copy">
                    {draft.allowAiDm ? 'AI Warden is enabled for scene guidance.' : 'AI Warden is disabled.'}
                  </p>
                </div>
              </section>

              <section className="fw-card fw-card--framed fw-room-setup-proto__card">
                <div className="fw-card-head">
                  <span className="fw-room-setup-proto__card-icon">
                    <Users size={14} aria-hidden="true" />
                  </span>
                  <h3>Party Size</h3>
                </div>
                <div className="fw-room-setup-proto__card-body fw-room-setup-proto__party">
                  <div className="fw-room-setup-proto__party-actions">
                    <button
                      className="fw-btn fw-btn-ghost fw-btn-sm"
                      disabled={busy || draft.partySize <= PARTY_SIZE_MIN}
                      onClick={() => onChange(incrementPartySize(draft, -1))}
                      type="button"
                    >
                      −
                    </button>
                    <p className="fw-display">{draft.partySize}</p>
                    <button
                      className="fw-btn fw-btn-ghost fw-btn-sm"
                      disabled={busy || draft.partySize >= PARTY_SIZE_MAX}
                      onClick={() => onChange(incrementPartySize(draft, 1))}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                  <small>Including you</small>
                  <div className="fw-room-setup-proto__party-slots">
                    {partySlots(draft.partySize).map((filled, index) => (
                      <span data-active={filled} key={`${filled ? 'y' : 'n'}-${index}`}>
                        {index + 1}
                      </span>
                    ))}
                  </div>
                  {partySizeError ? <p className="fw-room-setup-proto__error">{partySizeError}</p> : null}
                </div>
              </section>

              <section className="fw-card fw-card--framed fw-room-setup-proto__card">
                <div className="fw-card-head">
                  <span className="fw-room-setup-proto__card-icon">
                    <Globe size={14} aria-hidden="true" />
                  </span>
                  <h3>Visibility</h3>
                </div>
                <div className="fw-room-setup-proto__card-body fw-room-setup-proto__list">
                  {visibilityOptions.map((item) => (
                    <label
                      className="fw-room-setup-proto__list-option"
                      data-active={draft.visibility === item.id}
                      key={item.id}
                    >
                      <input
                        checked={draft.visibility === item.id}
                        disabled={busy}
                        name="visibility"
                        onChange={() => onChange({ ...draft, visibility: item.id })}
                        type="radio"
                        value={item.id}
                      />
                      <div>
                        <strong>{item.label}</strong>
                        <small>{visibilityDescriptions[item.id]}</small>
                      </div>
                    </label>
                  ))}
                </div>
              </section>
            </div>
          </div>

          {serverError ? <p className="fw-room-setup-proto__server-error">{serverError}</p> : null}
        </div>

        <RoomSetupPreviewCard
          busy={busy}
          draft={draft}
          onCancel={onCancel}
          onSubmit={onSubmit}
          playModeLabel={mode.label}
          ruleLabel={strict.label}
          themeLabel={theme.label}
        />
      </div>
    </div>
  );
}
