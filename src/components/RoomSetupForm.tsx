import type { ReactNode } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  Crown,
  Dice5,
  Eye,
  Flame,
  Globe,
  Hexagon,
  Info,
  Minus,
  Plus,
  ScrollText,
  Shield,
  Skull,
  Sparkles,
  Users,
  WandSparkles,
} from 'lucide-react';
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

function CardHead({ icon, title, right }: { icon: ReactNode; title: string; right?: ReactNode }) {
  return (
    <div className="fw-card-head">
      <span style={{ color: 'var(--gold)' }}>{icon}</span>
      <h3>{title}</h3>
      {right ? <div className="fw-card-head-actions">{right}</div> : null}
    </div>
  );
}

function TileButton({
  active,
  busy,
  desc,
  icon,
  onClick,
  title,
}: {
  active: boolean;
  busy: boolean;
  desc: string;
  icon?: ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button className={`fw-tile ${active ? 'active' : ''}`} disabled={busy} onClick={onClick} type="button">
      {icon ? <span style={{ color: active ? 'var(--gold-bright)' : 'var(--arcane-bright)' }}>{icon}</span> : null}
      <span className="fw-tile-title">{title}</span>
      <span className="fw-tile-desc">{desc}</span>
    </button>
  );
}

export function RoomSetupForm({ draft, busy, errors, onChange, onSubmit, onCancel, serverError }: RoomSetupFormProps) {
  const titleError = errorFor(errors, 'title');
  const partySizeError = errorFor(errors, 'partySize');
  const mode = playModes.find((item) => item.id === draft.playMode) ?? playModes[0];
  const theme = sessionThemePresets.find((item) => item.key === draft.themeKey) ?? sessionThemePresets[0];
  const strict = ruleStrictnessOptions.find((item) => item.id === draft.ruleStrictness) ?? ruleStrictnessOptions[1];

  return (
    <div className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page">
        <header className="fw-page-head">
          <div>
            <div className="fw-eyebrow">Step 1 of 2</div>
            <h1>Forge a Room</h1>
            <div className="sub">Set the rules of the table. You can change everything except mode after session one.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button className="fw-btn fw-btn-ghost" disabled={busy} onClick={onCancel} type="button">
              <ChevronLeft size={12} /> Cancel
            </button>
            <button className="fw-btn fw-btn-ghost" disabled title="Visual only" type="button">
              Save as draft
            </button>
            <button className="fw-btn fw-btn-gold" disabled={busy} onClick={onSubmit} type="button">
              {busy ? 'Creating...' : 'Create Room'} <ArrowRight size={12} />
            </button>
          </div>
        </header>

        <div style={{ alignItems: 'start', display: 'grid', gap: 24, gridTemplateColumns: 'minmax(0, 1fr) 380px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <section className="fw-card fw-card-elev">
              <CardHead icon={<ScrollText size={14} />} title="Identity" />
              <div className="fw-card-body" style={{ display: 'grid', gap: 16, gridTemplateColumns: '1.6fr 1fr' }}>
                <label className="fw-field">
                  <span className="fw-label">Room Name</span>
                  <input
                    className="fw-input"
                    disabled={busy}
                    onChange={(event) => onChange({ ...draft, title: event.target.value })}
                    placeholder="The Gilded Tomb"
                    type="text"
                    value={draft.title}
                  />
                  {titleError ? <span style={{ color: 'var(--danger)', fontSize: 12 }}>{titleError}</span> : null}
                </label>
                <div className="fw-field">
                  <span className="fw-label">Sigil</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[Flame, Crown, Skull, Eye, Shield, WandSparkles].map((SigilIcon, index) => (
                      <button
                        className={`fw-btn fw-btn-icon ${index === 0 ? '' : 'fw-btn-ghost'}`}
                        disabled={busy}
                        key={index}
                        style={{ color: index === 0 ? 'var(--gold-bright)' : 'var(--text-3)', padding: 8 }}
                        type="button"
                      >
                        <SigilIcon size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="fw-card">
              <CardHead
                icon={<Dice5 size={14} />}
                title="Play Mode"
                right={<span className="fw-serif" style={{ color: 'var(--text-3)', fontSize: 11, fontStyle: 'italic' }}>Locked after session one.</span>}
              />
              <div className="fw-card-body" style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
                {playModes.map((item) => (
                  <TileButton
                    active={draft.playMode === item.id}
                    busy={busy}
                    desc={item.description}
                    icon={playModeIcons[item.id]}
                    key={item.id}
                    onClick={() => onChange({ ...draft, playMode: item.id })}
                    title={item.label}
                  />
                ))}
              </div>
            </section>

            <section className="fw-card">
              <CardHead icon={<Flame size={14} />} title="Theme" />
              <div className="fw-card-body" style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                {sessionThemePresets.map((item) => (
                  <TileButton
                    active={draft.themeKey === item.key}
                    busy={busy}
                    desc={item.description}
                    icon={themeIcons[item.key]}
                    key={item.key}
                    onClick={() => onChange({ ...draft, themeKey: item.key })}
                    title={item.label}
                  />
                ))}
              </div>
            </section>

            <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1.55fr 1fr' }}>
              <section className="fw-card">
                <CardHead icon={<Shield size={14} />} title="Rule Strictness" />
                <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ruleStrictnessOptions.map((item) => (
                    <label
                      key={item.id}
                      style={{
                        background: draft.ruleStrictness === item.id ? 'linear-gradient(180deg, rgba(214,168,79,0.07), rgba(214,168,79,0.02))' : 'transparent',
                        border: `1px solid ${draft.ruleStrictness === item.id ? 'rgba(214,168,79,0.4)' : 'var(--border-soft)'}`,
                        borderRadius: 8,
                        cursor: busy ? 'default' : 'pointer',
                        display: 'flex',
                        gap: 12,
                        padding: 12,
                      }}
                    >
                      <input
                        checked={draft.ruleStrictness === item.id}
                        disabled={busy}
                        name="ruleStrictness"
                        onChange={() => onChange({ ...draft, ruleStrictness: item.id })}
                        type="radio"
                        value={item.id}
                      />
                      <span>
                        <strong className="fw-display" style={{ color: draft.ruleStrictness === item.id ? 'var(--text)' : 'var(--text-2)', fontSize: 13 }}>
                          {item.label}
                        </strong>
                        <small style={{ color: 'var(--text-3)', display: 'block', marginTop: 2 }}>{strictDescriptions[item.id]}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <section className="fw-card">
                  <CardHead
                    icon={<Users size={14} />}
                    title="Party Size"
                    right={
                      <>
                        <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" disabled={busy || draft.partySize <= PARTY_SIZE_MIN} onClick={() => onChange(incrementPartySize(draft, -1))} type="button">
                          <Minus size={12} />
                        </button>
                        <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" disabled={busy || draft.partySize >= PARTY_SIZE_MAX} onClick={() => onChange(incrementPartySize(draft, 1))} type="button">
                          <Plus size={12} />
                        </button>
                      </>
                    }
                  />
                  <div className="fw-card-body" style={{ textAlign: 'center' }}>
                    <div className="fw-display" style={{ color: 'var(--gold-bright)', fontSize: 56, lineHeight: 1 }}>{draft.partySize}</div>
                    <div className="fw-eyebrow" style={{ marginTop: 4 }}>Including you</div>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 14 }}>
                      {Array.from({ length: PARTY_SIZE_MAX }).map((_, index) => {
                        const active = index < draft.partySize;
                        return (
                          <span
                            key={index}
                            style={{
                              background: active ? 'rgba(214,168,79,0.18)' : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${active ? 'var(--gold-deep)' : 'var(--border-soft)'}`,
                              borderRadius: 3,
                              color: active ? 'var(--gold-bright)' : 'var(--text-4)',
                              display: 'grid',
                              fontFamily: 'var(--f-mono)',
                              fontSize: 10,
                              height: 22,
                              placeItems: 'center',
                              width: 18,
                            }}
                          >
                            {index + 1}
                          </span>
                        );
                      })}
                    </div>
                    {partySizeError ? <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>{partySizeError}</p> : null}
                  </div>
                </section>

                <section className="fw-card">
                  <CardHead icon={<Globe size={14} />} title="Visibility" />
                  <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {visibilityOptions.map((item) => (
                      <label
                        key={item.id}
                        style={{
                          background: draft.visibility === item.id ? 'rgba(124,58,237,0.10)' : 'transparent',
                          border: `1px solid ${draft.visibility === item.id ? 'rgba(124,58,237,0.4)' : 'var(--border-soft)'}`,
                          borderRadius: 6,
                          cursor: busy ? 'default' : 'pointer',
                          display: 'flex',
                          gap: 10,
                          padding: 10,
                        }}
                      >
                        <input
                          checked={draft.visibility === item.id}
                          disabled={busy}
                          name="visibility"
                          onChange={() => onChange({ ...draft, visibility: item.id })}
                          type="radio"
                          value={item.id}
                        />
                        <span>
                          <strong style={{ color: 'var(--text)', display: 'block', fontSize: 13 }}>{item.label}</strong>
                          <small style={{ color: 'var(--text-3)' }}>{visibilityDescriptions[item.id]}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            <section className="fw-card" style={{ borderColor: 'rgba(124,58,237,0.3)' }}>
              <CardHead
                icon={<WandSparkles size={14} />}
                title="AI Dungeon Master"
                right={
                  <button
                    aria-pressed={draft.allowAiDm}
                    className={`fw-toggle ${draft.allowAiDm ? 'on' : ''}`}
                    disabled={busy}
                    onClick={() => onChange({ ...draft, allowAiDm: !draft.allowAiDm })}
                    title="Toggle AI Dungeon Master"
                    type="button"
                  />
                }
              />
              <div className="fw-card-body" style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr 1fr' }}>
                {[
                  ['Tone', draft.allowAiDm ? 'Balanced' : 'Off'],
                  ['Rule Strictness', strict.label],
                  ['Authority', draft.allowAiDm ? 'Assistant' : 'Manual'],
                ].map(([label, value]) => (
                  <div className="fw-seg" key={label} style={{ justifyContent: 'space-between', width: '100%' }}>
                    <span className="fw-seg-btn active" style={{ pointerEvents: 'none' }}>{value}</span>
                  </div>
                ))}
                <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-soft)', borderRadius: 8, display: 'flex', gap: 12, gridColumn: '1 / -1', padding: 12 }}>
                  <Info size={14} style={{ color: 'var(--arcane-bright)', marginTop: 2 }} />
                  <div className="fw-serif" style={{ color: 'var(--text-2)', fontSize: 12, fontStyle: 'italic', lineHeight: 1.5 }}>
                    The Warden never alters state without confirmation. Damage, conditions, death, and inventory loss always wait for your approval.
                  </div>
                </div>
              </div>
            </section>

            {serverError ? <p style={{ color: 'var(--danger)', margin: 0 }}>{serverError}</p> : null}
          </div>

          <RoomSetupPreviewCard
            busy={busy}
            draft={draft}
            onSubmit={onSubmit}
            playModeLabel={mode.label}
            ruleLabel={strict.label}
            themeLabel={theme.label}
          />
        </div>
      </div>
    </div>
  );
}
