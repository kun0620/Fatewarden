import { AlertTriangle, Dices, Flame, Shield, UserRound, Users, Volume2, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type SettingsSection = 'profile' | 'appearance' | 'audio' | 'ai-warden' | 'rules' | 'manners' | 'account';
type AiAuthority = 'Assistant' | 'Co-DM' | 'Off';
type AiTone = 'Balanced' | 'Grim' | 'Heroic' | 'Mystery';
type AiStrictness = 'Casual' | 'Standard' | 'Hardcore';

type SettingsPageProps = {
  user: User;
  onBack: () => void;
  onSignOut: () => void;
};

type SettingsNavItem = {
  id: SettingsSection;
  label: string;
  icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
};

const NAV_ITEMS: SettingsNavItem[] = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'appearance', label: 'Appearance', icon: Flame },
  { id: 'audio', label: 'Audio & Voice', icon: Volume2 },
  { id: 'ai-warden', label: 'AI Warden', icon: Wand2 },
  { id: 'rules', label: 'Rules & Dice', icon: Dices },
  { id: 'manners', label: 'Table Manners', icon: Users },
  { id: 'account', label: 'Account & Compact', icon: Shield },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      aria-pressed={checked}
      className="fw-toggle"
      data-on={checked}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span className="fw-toggle__thumb" />
    </button>
  );
}

function SegmentButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={`fw-seg-btn ${active ? 'active' : ''}`} onClick={onClick} type="button">
      {label}
    </button>
  );
}

export function SettingsPage({ user, onBack, onSignOut }: SettingsPageProps) {
  const [section, setSection] = useState<SettingsSection>('profile');
  const [busy, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(user.user_metadata?.displayName ?? '');
  const [handle, setHandle] = useState(user.user_metadata?.handle ?? '');
  const [signature, setSignature] = useState(user.user_metadata?.signature ?? '');
  const [theme, setTheme] = useState(user.user_metadata?.theme ?? 'Cinder');
  const [aiAuthority, setAiAuthority] = useState<AiAuthority>(user.user_metadata?.aiAuthority ?? 'Assistant');
  const [aiTone, setAiTone] = useState<AiTone>(user.user_metadata?.aiTone ?? 'Balanced');
  const [aiStrictness, setAiStrictness] = useState<AiStrictness>(user.user_metadata?.aiStrictness ?? 'Standard');
  const [confirmHp, setConfirmHp] = useState<boolean>(user.user_metadata?.confirmHp ?? true);

  const [timezone, setTimezone] = useState('UTC');
  const [readingMode, setReadingMode] = useState(false);
  const [textSize, setTextSize] = useState(15);
  const [atmosphericBg, setAtmosphericBg] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [voiceChatDefault, setVoiceChatDefault] = useState(false);
  const [suggestChoices, setSuggestChoices] = useState(true);
  const [autoGenerateScenes, setAutoGenerateScenes] = useState(false);
  const [confirmDeathSave, setConfirmDeathSave] = useState(true);
  const [confirmCondition, setConfirmCondition] = useState(true);
  const [confirmInventoryLoss, setConfirmInventoryLoss] = useState(true);
  const [confirmSpellSlot, setConfirmSpellSlot] = useState(true);
  const [houseRuleFlanking, setHouseRuleFlanking] = useState(false);
  const [houseRulePotionsBonus, setHouseRulePotionsBonus] = useState(false);
  const [houseRuleHeroPoints, setHouseRuleHeroPoints] = useState(false);
  const [houseRuleLingeringWounds, setHouseRuleLingeringWounds] = useState(false);
  const [houseRuleGrittyRest, setHouseRuleGrittyRest] = useState(false);
  const [privateWhispers, setPrivateWhispers] = useState(true);
  const [safetyTools, setSafetyTools] = useState(true);
  const [autoFadeMusic, setAutoFadeMusic] = useState(true);
  const [autoMuteCrossTalk, setAutoMuteCrossTalk] = useState(false);
  const [tablePace, setTablePace] = useState<'Slow' | 'Balanced' | 'Brisk'>('Balanced');

  useEffect(() => {
    if (!saved) return;
    const timeout = window.setTimeout(() => setSaved(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [saved]);

  const initials = useMemo(() => {
    const source = (displayName || user.email || 'W').trim();
    return source.slice(0, 1).toUpperCase();
  }, [displayName, user.email]);

  async function save() {
    if (!supabase) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        displayName,
        handle,
        signature,
        theme,
        aiAuthority,
        aiTone,
        aiStrictness,
        confirmHp,
      },
    });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setSaved(true);
    }
  }

  async function handleDeleteAccount() {
    const confirmDelete = window.confirm('This is a destructive stub. Sign out now?');
    if (!confirmDelete) return;
    await supabase?.auth.signOut();
    onSignOut();
  }

  const sectionBody = (() => {
    if (section === 'profile') {
      return (
        <>
          <article className="fw-card" style={{ padding: 16 }}>
            <div className="fw-card-head" style={{ marginBottom: 12 }}>
              <div>
                <p className="fw-eyebrow">Profile</p>
                <h2 className="fw-display" style={{ fontSize: 18, margin: 0 }}>
                  Warden Identity
                </h2>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
              <div className="fw-avatar xl">{initials}</div>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled type="button">
                Change portrait
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label className="fw-field">
                <span className="fw-label">Display Name</span>
                <input className="fw-input" onChange={(e) => setDisplayName(e.target.value)} value={displayName} />
              </label>
              <label className="fw-field">
                <span className="fw-label">Handle</span>
                <input className="fw-input" onChange={(e) => setHandle(e.target.value)} value={handle} placeholder="@warden" />
              </label>
            </div>
            <label className="fw-field" style={{ marginTop: 10 }}>
              <span className="fw-label">Email</span>
              <input className="fw-input" disabled value={user.email ?? ''} />
            </label>
            <label className="fw-field" style={{ marginTop: 10 }}>
              <span className="fw-label">Timezone</span>
              <select className="fw-select" onChange={(e) => setTimezone(e.target.value)} value={timezone}>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
              </select>
            </label>
          </article>

          <article className="fw-card" style={{ padding: 16 }}>
            <div className="fw-card-head" style={{ marginBottom: 12 }}>
              <div>
                <h2 className="fw-display" style={{ fontSize: 18, margin: 0 }}>
                  Signature
                </h2>
                <p className="sub" style={{ margin: 0 }}>
                  The line carried on every character sheet.
                </p>
              </div>
            </div>
            <label className="fw-field">
              <span className="fw-label">Signature</span>
              <input className="fw-input" onChange={(e) => setSignature(e.target.value)} value={signature} />
            </label>
          </article>
        </>
      );
    }

    if (section === 'appearance') {
      return (
        <>
          <article className="fw-card" style={{ padding: 16 }}>
            <div className="fw-card-head" style={{ marginBottom: 10 }}>
              <h2 className="fw-display" style={{ fontSize: 18, margin: 0 }}>
                Theme
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
              {['Cinder', 'Sepulchre', 'Reliquary', 'Ash'].map((name) => (
                <button
                  key={name}
                  className="fw-btn fw-btn-ghost fw-btn-sm"
                  onClick={() => setTheme(name)}
                  style={
                    theme === name
                      ? { borderColor: 'var(--gold-deep)', color: 'var(--gold-bright)', background: 'rgba(214,168,79,0.08)' }
                      : undefined
                  }
                  type="button"
                >
                  {name}
                </button>
              ))}
            </div>
          </article>

          <article className="fw-card" style={{ padding: 16 }}>
            <div className="fw-card-head" style={{ marginBottom: 10 }}>
              <h2 className="fw-display" style={{ fontSize: 18, margin: 0 }}>
                Reading
              </h2>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fw-label">Long-form reading mode</span>
                <Toggle checked={readingMode} onChange={setReadingMode} />
              </div>
              <label className="fw-field">
                <span className="fw-label">Body text size: {textSize}px</span>
                <input
                  max={20}
                  min={13}
                  onChange={(e) => setTextSize(Number(e.target.value))}
                  type="range"
                  value={textSize}
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fw-label">Animated atmospheric background</span>
                <Toggle checked={atmosphericBg} onChange={setAtmosphericBg} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fw-label">Reduce motion</span>
                <Toggle checked={reduceMotion} onChange={setReduceMotion} />
              </div>
            </div>
          </article>
        </>
      );
    }

    if (section === 'ai-warden') {
      return (
        <>
          <article className="fw-card" style={{ padding: 16 }}>
            <div className="fw-card-head" style={{ marginBottom: 10 }}>
              <div>
                <h2 className="fw-display" style={{ fontSize: 18, margin: 0 }}>
                  AI Warden Defaults
                </h2>
                <span className="fw-pill fw-pill-gold" style={{ marginTop: 6 }}>
                  Applies to new rooms
                </span>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="fw-field">
                <span className="fw-label">Authority</span>
                <div className="fw-seg">
                  {(['Assistant', 'Co-DM', 'Off'] as const).map((option) => (
                    <SegmentButton
                      key={option}
                      active={aiAuthority === option}
                      label={option}
                      onClick={() => setAiAuthority(option)}
                    />
                  ))}
                </div>
              </div>
              <div className="fw-field">
                <span className="fw-label">Default Tone</span>
                <div className="fw-seg">
                  {(['Balanced', 'Grim', 'Heroic', 'Mystery'] as const).map((option) => (
                    <SegmentButton key={option} active={aiTone === option} label={option} onClick={() => setAiTone(option)} />
                  ))}
                </div>
              </div>
              <div className="fw-field">
                <span className="fw-label">Rule Strictness</span>
                <div className="fw-seg">
                  {(['Casual', 'Standard', 'Hardcore'] as const).map((option) => (
                    <SegmentButton
                      key={option}
                      active={aiStrictness === option}
                      label={option}
                      onClick={() => setAiStrictness(option)}
                    />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fw-label">Suggest player choices</span>
                <Toggle checked={suggestChoices} onChange={setSuggestChoices} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fw-label">Auto-generate scenes on entry</span>
                <Toggle checked={autoGenerateScenes} onChange={setAutoGenerateScenes} />
              </div>
            </div>
          </article>

          <article className="fw-card" style={{ padding: 16, borderColor: 'rgba(214,168,79,0.35)' }}>
            <div className="fw-card-head" style={{ marginBottom: 10 }}>
              <h2 className="fw-display" style={{ fontSize: 18, margin: 0 }}>
                Critical Change Confirmations
              </h2>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fw-label">HP damage requires confirmation</span>
                <Toggle checked={confirmHp} onChange={setConfirmHp} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fw-label">Death save failure</span>
                <Toggle checked={confirmDeathSave} onChange={setConfirmDeathSave} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fw-label">Condition gained</span>
                <Toggle checked={confirmCondition} onChange={setConfirmCondition} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fw-label">Inventory loss</span>
                <Toggle checked={confirmInventoryLoss} onChange={setConfirmInventoryLoss} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fw-label">Spell slot spend</span>
                <Toggle checked={confirmSpellSlot} onChange={setConfirmSpellSlot} />
              </div>
              <p className="fw-serif" style={{ fontStyle: 'italic', color: 'var(--text-3)', margin: '2px 0 0' }}>
                Your defaults are used when a room does not override confirmation behavior.
              </p>
            </div>
          </article>
        </>
      );
    }

    if (section === 'audio') {
      return (
        <>
          <article className="fw-card" style={{ padding: 16 }}>
            <div className="fw-card-head" style={{ marginBottom: 8 }}>
              <h2 className="fw-display" style={{ fontSize: 18, margin: 0 }}>
                Voice
              </h2>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="fw-label">Voice chat default</span>
              <Toggle checked={voiceChatDefault} onChange={setVoiceChatDefault} />
            </div>
          </article>
          <article className="fw-card" style={{ padding: 16 }}>
            <div className="fw-card-head" style={{ marginBottom: 8 }}>
              <h2 className="fw-display" style={{ fontSize: 18, margin: 0 }}>
                Audio Controls
              </h2>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <label className="fw-field">
                <span className="fw-label">Master volume</span>
                <input defaultValue={65} max={100} min={0} type="range" />
              </label>
              <label className="fw-field">
                <span className="fw-label">Music volume</span>
                <input defaultValue={42} max={100} min={0} type="range" />
              </label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fw-label">Auto-fade music on narration</span>
                <Toggle checked={autoFadeMusic} onChange={setAutoFadeMusic} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fw-label">Mute cross-talk in combat</span>
                <Toggle checked={autoMuteCrossTalk} onChange={setAutoMuteCrossTalk} />
              </div>
            </div>
          </article>
        </>
      );
    }

    if (section === 'rules') {
      return (
        <>
          <article className="fw-card" style={{ padding: 16 }}>
            <div className="fw-card-head" style={{ marginBottom: 10 }}>
              <h2 className="fw-display" style={{ fontSize: 18, margin: 0 }}>
                Dice
              </h2>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="fw-seg">
                {['Classic', 'Arcane', 'Bone', 'Iron'].map((styleName) => (
                  <SegmentButton key={styleName} active={styleName === 'Arcane'} label={styleName} onClick={() => {}} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fw-label">Show roll breakdown</span>
                <Toggle checked onChange={() => {}} />
              </div>
            </div>
          </article>
          <article className="fw-card" style={{ padding: 16 }}>
            <div className="fw-card-head" style={{ marginBottom: 10 }}>
              <h2 className="fw-display" style={{ fontSize: 18, margin: 0 }}>
                House Rules
              </h2>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fw-label">Flanking grants advantage</span>
                <Toggle checked={houseRuleFlanking} onChange={setHouseRuleFlanking} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fw-label">Potion use as bonus action</span>
                <Toggle checked={houseRulePotionsBonus} onChange={setHouseRulePotionsBonus} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fw-label">Hero points enabled</span>
                <Toggle checked={houseRuleHeroPoints} onChange={setHouseRuleHeroPoints} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fw-label">Lingering wounds</span>
                <Toggle checked={houseRuleLingeringWounds} onChange={setHouseRuleLingeringWounds} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fw-label">Gritty rests</span>
                <Toggle checked={houseRuleGrittyRest} onChange={setHouseRuleGrittyRest} />
              </div>
            </div>
          </article>
        </>
      );
    }

    if (section === 'manners') {
      return (
        <article className="fw-card" style={{ padding: 16 }}>
          <div className="fw-card-head" style={{ marginBottom: 10 }}>
            <h2 className="fw-display" style={{ fontSize: 18, margin: 0 }}>
              Table Manners
            </h2>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="fw-label">Enable private whispers</span>
              <Toggle checked={privateWhispers} onChange={setPrivateWhispers} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="fw-label">Safety tools reminders</span>
              <Toggle checked={safetyTools} onChange={setSafetyTools} />
            </div>
            <div className="fw-field">
              <span className="fw-label">Table pace</span>
              <div className="fw-seg">
                {(['Slow', 'Balanced', 'Brisk'] as const).map((pace) => (
                  <SegmentButton key={pace} active={tablePace === pace} label={pace} onClick={() => setTablePace(pace)} />
                ))}
              </div>
            </div>
          </div>
        </article>
      );
    }

    return (
      <>
        <article className="fw-card" style={{ padding: 16 }}>
          <div className="fw-card-head" style={{ marginBottom: 10 }}>
            <h2 className="fw-display" style={{ fontSize: 18, margin: 0 }}>
              Account
            </h2>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled type="button">
              Change Email
            </button>
            <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled type="button">
              Rotate Passphrase
            </button>
            <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled type="button">
              Sign out elsewhere
            </button>
            <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled type="button">
              Manage subscription
            </button>
            <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={onSignOut} type="button">
              Sign out
            </button>
          </div>
        </article>
        <article className="fw-card" style={{ padding: 16 }}>
          <div className="fw-card-head" style={{ marginBottom: 10 }}>
            <h2 className="fw-display" style={{ fontSize: 18, margin: 0 }}>
              Data & Compact
            </h2>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled type="button">
              Export all campaigns
            </button>
            <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled type="button">
              Warden&apos;s Compact
            </button>
            <button className="fw-btn fw-btn-blood fw-btn-sm" onClick={() => void handleDeleteAccount()} type="button">
              <AlertTriangle size={14} aria-hidden={true} />
              Delete account
            </button>
          </div>
        </article>
      </>
    );
  })();

  return (
    <main className="fw-scroll" style={{ height: '100vh' }}>
      <div className="fw-page">
        <header className="fw-page-head">
          <div>
            <p className="fw-eyebrow">Configuration</p>
            <h1>Settings</h1>
            <p className="sub">Tune the table to your cadence.</p>
          </div>
          <div className="fw-page-head-actions">
            {saved ? <span className="fw-pill fw-pill-success">Saved</span> : null}
            {error ? <span className="fw-pill fw-pill-blood">{error}</span> : null}
            <button className="fw-btn fw-btn-ghost" onClick={onBack} type="button">
              Back
            </button>
            <button className="fw-btn fw-btn-gold" disabled={busy} onClick={() => void save()} type="button">
              {busy ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </header>

        <section className="fw-settings-layout" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
          <aside className="fw-card" style={{ padding: 10, height: 'fit-content' }}>
            <nav className="fw-settings-nav" style={{ display: 'grid', gap: 4 }}>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    className="fw-btn fw-btn-ghost"
                    onClick={() => setSection(item.id)}
                    style={
                      active
                        ? { color: 'var(--gold-bright)', borderColor: 'rgba(214,168,79,0.3)', background: 'rgba(214,168,79,0.08)' }
                        : { justifyContent: 'flex-start' }
                    }
                    type="button"
                  >
                    <Icon size={14} aria-hidden={true} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="fw-fade" key={section} style={{ display: 'grid', gap: 12 }}>
            {sectionBody}
          </div>
        </section>
      </div>
    </main>
  );
}
