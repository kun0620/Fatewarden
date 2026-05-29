import type { ReactNode } from 'react';
import { ArrowRight, Flame, Globe, Plus, Shield, Swords, Users } from 'lucide-react';
import type { RoomSetupDraft } from '../lib/roomSetup';

type RoomSetupPreviewCardProps = {
  busy: boolean;
  draft: RoomSetupDraft;
  playModeLabel: string;
  ruleLabel: string;
  themeLabel: string;
  onSubmit: () => void;
};

type SummaryRowProps = {
  icon: ReactNode;
  label: string;
  value: string;
  arcane?: boolean;
};

function SummaryRow({ icon, label, value, arcane }: SummaryRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 0',
        borderBottom: '1px dashed var(--border-soft)',
      }}
    >
      <span style={{ color: arcane ? 'var(--arcane-bright)' : 'var(--gold)' }}>{icon}</span>
      <span
        style={{
          flex: 1,
          color: 'var(--text-3)',
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span className="fw-serif" style={{ color: 'var(--text)', fontSize: 13 }}>
        {value}
      </span>
    </div>
  );
}

function PlayerRow({ index, host }: { index: number; host?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 8,
        background: host ? 'var(--surface-2)' : 'transparent',
        border: `1px ${host ? 'solid' : 'dashed'} var(--border-soft)`,
        borderRadius: 6,
      }}
    >
      <span className="fw-avatar sm" style={{ color: host ? 'var(--gold-bright)' : 'var(--text-4)' }}>
        {host ? 'YO' : '--'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: host ? 'var(--text)' : 'var(--text-3)', fontSize: 12 }}>
          {host ? 'You' : `Seat ${index + 1}`}
        </div>
        <div style={{ color: 'var(--text-4)', fontSize: 10.5 }}>
          {host ? 'Host / DM' : 'Awaiting invite'}
        </div>
      </div>
      {host ? <span className="fw-pill gold">DM</span> : <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled type="button"><Plus size={11} /> Invite</button>}
    </div>
  );
}

export function RoomSetupPreviewCard({
  busy,
  draft,
  playModeLabel,
  ruleLabel,
  themeLabel,
  onSubmit,
}: RoomSetupPreviewCardProps) {
  return (
    <aside className="fw-card fw-card-elev fw-orn" style={{ overflow: 'hidden', position: 'sticky', top: 20 }}>
      <span className="fw-orn-c tl" />
      <span className="fw-orn-c tr" />
      <span className="fw-orn-c bl" />
      <span className="fw-orn-c br" />

      <div
        style={{
          padding: '20px 18px 16px',
          textAlign: 'center',
          borderBottom: '1px solid var(--border-soft)',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.18), transparent 70%)',
        }}
      >
        <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Room Preview</div>
        <h3 className="fw-display" style={{ color: 'var(--text)', fontSize: 22, letterSpacing: '0.04em' }}>
          {draft.title.trim() || 'Untitled Adventure'}
        </h3>
        <p className="fw-serif" style={{ color: 'var(--text-3)', fontSize: 13, fontStyle: 'italic', marginTop: 4 }}>
          {themeLabel} · {playModeLabel}
        </p>
      </div>

      <div style={{ padding: 16 }}>
        <div className="fw-eyebrow" style={{ marginBottom: 8 }}>The Compact</div>
        <SummaryRow icon={<Swords size={12} />} label="Play Mode" value={playModeLabel} />
        <SummaryRow icon={<Flame size={12} />} label="Theme" value={themeLabel} />
        <SummaryRow icon={<Shield size={12} />} label="Rule Strictness" value={ruleLabel} />
        <SummaryRow icon={<Users size={12} />} label="Party Size" value={`${draft.partySize} adventurers`} />
        <SummaryRow icon={<Globe size={12} />} label="Visibility" value={draft.visibility === 'private' ? 'Private' : 'Invite Code'} />

        <div className="fw-divider" style={{ marginTop: 18, marginBottom: 12 }}>
          <span className="fw-eyebrow">Players</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PlayerRow index={0} host />
          {Array.from({ length: Math.max(0, draft.partySize - 1) }).map((_, index) => (
            <PlayerRow index={index + 1} key={`seat-${index}`} />
          ))}
        </div>

        <button className="fw-btn fw-btn-gold fw-btn-lg" disabled={busy} onClick={onSubmit} style={{ justifyContent: 'center', marginTop: 18, width: '100%' }} type="button">
          {busy ? 'Creating...' : 'Open the Doors'} <ArrowRight size={13} />
        </button>
        <div className="fw-serif" style={{ color: 'var(--text-4)', fontSize: 11, fontStyle: 'italic', marginTop: 10, textAlign: 'center' }}>
          Next, you will shape a character for this campaign.
        </div>
      </div>
    </aside>
  );
}
