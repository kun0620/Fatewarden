import type { ReactNode } from 'react';
import { Flame, Globe, Shield, Sparkles, Swords, Users } from 'lucide-react';
import type { RoomSetupDraft } from '../lib/roomSetup';

type RoomSetupPreviewCardProps = {
  busy: boolean;
  draft: RoomSetupDraft;
  playModeLabel: string;
  ruleLabel: string;
  themeLabel: string;
  onCancel: () => void;
  onSubmit: () => void;
};

type SummaryRowProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function SummaryRow({ icon, label, value }: SummaryRowProps) {
  return (
    <div className="fw-room-setup-proto__summary-row">
      <span aria-hidden="true" className="fw-room-setup-proto__summary-icon">
        {icon}
      </span>
      <span className="fw-room-setup-proto__summary-key">{label}</span>
      <span className="fw-room-setup-proto__summary-value">{value}</span>
    </div>
  );
}

export function RoomSetupPreviewCard({
  busy,
  draft,
  playModeLabel,
  ruleLabel,
  themeLabel,
  onCancel,
  onSubmit,
}: RoomSetupPreviewCardProps) {
  return (
    <aside className="fw-room-setup-proto__preview fw-card fw-card--framed fw-orn">
      <span className="fw-orn-c tl" />
      <span className="fw-orn-c tr" />
      <span className="fw-orn-c bl" />
      <span className="fw-orn-c br" />

      <div className="fw-room-setup-proto__preview-head">
        <p className="fw-eyebrow">Room Preview</p>
        <h3 className="fw-display">{draft.title.trim() || 'Untitled Adventure'}</h3>
        <p className="fw-room-setup-proto__preview-sub">
          {themeLabel} · {playModeLabel}
        </p>
      </div>

      <div className="fw-room-setup-proto__summary">
        <SummaryRow icon={<Swords size={12} />} label="Play Mode" value={playModeLabel} />
        <SummaryRow icon={<Flame size={12} />} label="Theme" value={themeLabel} />
        <SummaryRow icon={<Shield size={12} />} label="Rule Strictness" value={ruleLabel} />
        <SummaryRow icon={<Users size={12} />} label="Party Size" value={`${draft.partySize} adventurers`} />
        <SummaryRow icon={<Sparkles size={12} />} label="AI DM" value={draft.allowAiDm ? 'Enabled' : 'Disabled'} />
        <SummaryRow
          icon={<Globe size={12} />}
          label="Visibility"
          value={draft.visibility === 'private' ? 'Private' : 'Invite Code'}
        />
      </div>

      <div className="fw-room-setup-proto__preview-actions">
        <button className="fw-btn fw-btn-ghost" disabled={busy} onClick={onCancel} type="button">
          Back
        </button>
        <button className="fw-btn fw-btn-gold fw-btn-lg" disabled={busy} onClick={onSubmit} type="button">
          {busy ? 'Creating...' : 'Create Room'}
        </button>
      </div>
    </aside>
  );
}
