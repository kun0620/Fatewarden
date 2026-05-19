import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Icon } from './ui/Icons';
import { supabase } from '../lib/supabase';
import {
  AVATAR_PRESETS,
  getProfile,
  recoverAccount,
  scheduleAccountDeletion,
  updateProfile,
  uploadAvatar,
  validateUsername,
  type UserProfile,
} from '../lib/profiles';

type SettingsSection = 'profile' | 'appearance' | 'audio' | 'ai' | 'rules' | 'table' | 'account';
type AiAuthority = 'Assistant' | 'Co-DM' | 'Off';
type AiTone = 'Balanced' | 'Grim' | 'Heroic' | 'Mystery';
type AiStrictness = 'Casual' | 'Standard' | 'Hardcore';

type SettingsPageProps = {
  user: User;
  onBack: () => void;
  onSignOut: () => void;
};

const SECTIONS: Array<{ id: SettingsSection; label: string; icon: string }> = [
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'appearance', label: 'Appearance', icon: 'flame' },
  { id: 'audio', label: 'Audio & Voice', icon: 'volume' },
  { id: 'ai', label: 'AI Warden', icon: 'wand' },
  { id: 'rules', label: 'Rules & Dice', icon: 'dice' },
  { id: 'table', label: 'Table Manners', icon: 'users' },
  { id: 'account', label: 'Account & Compact', icon: 'shield' },
];

function Toggle({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
  return (
    <button aria-pressed={on} className="fw-toggle" data-on={on} onClick={() => onChange(!on)} type="button">
      <span className="fw-toggle__thumb" />
    </button>
  );
}

function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="fw-seg">
      {options.map((option) => (
        <button className={`fw-seg-btn ${value === option ? 'active' : ''}`} key={option} onClick={() => onChange(option)} type="button">
          {option}
        </button>
      ))}
    </div>
  );
}

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return <section className="fw-card" style={style}>{children}</section>;
}

function CardHead({
  icon,
  right,
  title,
}: {
  icon: string;
  right?: React.ReactNode;
  title: string;
}) {
  return (
    <div className="fw-card-head">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--gold-bright)' }}>{Icon(icon, { size: 15 })}</span>
        <h2 className="fw-display" style={{ fontSize: 16, margin: 0 }}>{title}</h2>
      </div>
      {right}
    </div>
  );
}

function Field({
  children,
  hint,
  label,
}: {
  children: React.ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <label className="fw-field">
      <span className="fw-label">{label}</span>
      {children}
      {hint ? <span className="fw-serif" style={{ color: 'var(--text-3)', fontSize: 12, fontStyle: 'italic' }}>{hint}</span> : null}
    </label>
  );
}

function SettingRow({
  control,
  dense,
  desc,
  label,
}: {
  control: React.ReactNode;
  dense?: boolean;
  desc?: string;
  label: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: dense ? '4px 0' : '6px 0' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--text)' }}>{label}</div>
        {desc ? (
          <div className="fw-serif" style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', marginTop: 2, lineHeight: 1.4 }}>
            {desc}
          </div>
        ) : null}
      </div>
      <div>{control}</div>
    </div>
  );
}

export function SettingsPage({ user, onBack, onSignOut }: SettingsPageProps) {
  const [section, setSection] = useState<SettingsSection>('profile');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(user.user_metadata?.avatarUrl ?? '');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const [displayName, setDisplayName] = useState(user.user_metadata?.displayName ?? '');
  const [handle, setHandle] = useState(user.user_metadata?.handle ?? '');
  const [signature, setSignature] = useState(user.user_metadata?.signature ?? '');
  const [theme, setTheme] = useState(user.user_metadata?.theme ?? 'Cinder');
  const [aiAuthority, setAiAuthority] = useState<AiAuthority>(user.user_metadata?.aiAuthority ?? 'Assistant');
  const [aiTone, setAiTone] = useState<AiTone>(user.user_metadata?.aiTone ?? 'Balanced');
  const [aiStrictness, setAiStrictness] = useState<AiStrictness>(user.user_metadata?.aiStrictness ?? 'Standard');
  const [confirmHp, setConfirmHp] = useState<boolean>(user.user_metadata?.confirmHp ?? true);

  const [timezone, setTimezone] = useState(user.user_metadata?.timezone ?? 'UTC');
  const [readingMode, setReadingMode] = useState(true);
  const [readingSize, setReadingSize] = useState(15);
  const [voice, setVoice] = useState(true);
  const [confirmStrict, setConfirmStrict] = useState(true);
  const [diceStyle, setDiceStyle] = useState('Brass');
  const [suggestChoices, setSuggestChoices] = useState(true);
  const [autoGenerateScenes, setAutoGenerateScenes] = useState(false);

  useEffect(() => {
    let alive = true;
    getProfile(user)
      .then((loaded) => {
        if (!alive) return;
        setProfile(loaded);
        setDisplayName(loaded.displayName);
        setHandle(loaded.username);
        setAvatarUrl(loaded.avatarUrl);
      })
      .catch((loadError) => {
        if (alive) setError(loadError instanceof Error ? loadError.message : 'Could not load profile.');
      });
    return () => {
      alive = false;
    };
  }, [user]);

  useEffect(() => {
    if (!saved) return;
    const timeout = window.setTimeout(() => setSaved(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [saved]);

  const initials = useMemo(() => {
    const source = (displayName || user.email || 'Warden').trim();
    const words = source.split(/\s+/).filter(Boolean);
    if (words.length > 1) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return source.slice(0, 2).toUpperCase();
  }, [displayName, user.email]);

  async function save() {
    if (!supabase) return;
    setBusy(true);
    setSaved(false);
    setError(null);

    try {
      const checked = validateUsername(handle);
      if (!checked.ok) throw new Error(checked.message);
      const updated = await updateProfile(user, {
        displayName,
        username: checked.username,
        avatarUrl,
      });
      setProfile(updated);
      setHandle(updated.username);

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          displayName: updated.displayName,
          username: updated.username,
          avatarUrl: updated.avatarUrl,
          signature,
          theme,
          aiAuthority,
          aiTone,
          aiStrictness,
          confirmHp,
          timezone,
        },
      });
      if (updateError) throw updateError;
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save settings.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAccount() {
    if (!deletePassword) {
      setError('Enter your current passphrase before scheduling deletion.');
      return;
    }
    const confirmed = window.confirm('Your account will be disabled and scheduled for deletion in 30 days. Continue?');
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await scheduleAccountDeletion(user, deletePassword);
      await supabase?.auth.signOut();
      onSignOut();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not schedule account deletion.');
      setBusy(false);
    }
  }

  async function handleRecoverAccount() {
    setBusy(true);
    setError(null);
    try {
      await recoverAccount(user);
      setProfile(await getProfile(user));
      setSaved(true);
    } catch (recoverError) {
      setError(recoverError instanceof Error ? recoverError.message : 'Could not recover account.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAvatarUpload(file: File | undefined) {
    if (!file) return;
    setAvatarBusy(true);
    setError(null);
    try {
      const publicUrl = await uploadAvatar(user, file);
      setAvatarUrl(publicUrl);
      setProfile(await getProfile(user));
      setSaved(true);
    } catch (avatarError) {
      setError(avatarError instanceof Error ? avatarError.message : 'Could not upload avatar.');
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <main className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page">
        <header className="fw-page-head">
          <div>
            <div className="fw-eyebrow">The Scribe's Desk</div>
            <h1>Settings</h1>
            <div className="sub">Quiet things that change how the table feels.</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {saved ? <span className="fw-pill fw-pill-success">Saved</span> : null}
            {error ? <span className="fw-pill fw-pill-blood">{error}</span> : null}
            <button className="fw-btn fw-btn-ghost" onClick={onBack} type="button">Back</button>
            <button className="fw-btn fw-btn-gold" disabled={busy} onClick={() => void save()} type="button">
              {busy ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24, alignItems: 'start' }}>
          <Card style={{ position: 'sticky', top: 20, padding: 8 }}>
            {SECTIONS.map((item) => {
              const active = section === item.id;
              return (
                <button
                  className="fw-btn fw-btn-ghost"
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    padding: '10px 12px',
                    marginBottom: 2,
                    borderColor: active ? 'rgba(214,168,79,0.3)' : 'transparent',
                    background: active ? 'rgba(214,168,79,0.08)' : 'transparent',
                    color: active ? 'var(--gold-bright)' : 'var(--text-2)',
                    fontSize: 13,
                  }}
                  type="button"
                >
                  <span style={{ color: active ? 'var(--gold)' : 'var(--text-3)' }}>{Icon(item.icon, { size: 13 })}</span>
                  {item.label}
                </button>
              );
            })}
          </Card>

          <div className="fw-fade" key={section} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {section === 'profile' ? (
              <>
                <Card>
                  <CardHead icon="user" title="Warden Identity" />
                  <div className="fw-card-body" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 16, alignItems: 'center' }}>
                    <div className="fw-avatar xl fw-profile-avatar" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), #15101f)' }}>
                      {avatarUrl && !avatarUrl.startsWith('preset:') ? <img alt="" src={avatarUrl} /> : initials}
                    </div>
                    <Field label="Display name"><input className="fw-input" onChange={(event) => setDisplayName(event.target.value)} value={displayName} /></Field>
                    <Field label="Username" hint="3-20 chars. Start with a letter; use a-z, 0-9, or underscore.">
                      <input className="fw-input" onChange={(event) => setHandle(event.target.value)} placeholder="warden_name" value={handle} />
                    </Field>
                    <label className="fw-btn fw-btn-ghost fw-btn-sm" style={{ justifyContent: 'center' }}>
                      {avatarBusy ? 'Uploading...' : 'Upload portrait'}
                      <input accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void handleAvatarUpload(event.target.files?.[0])} type="file" />
                    </label>
                    <Field label="Email"><input className="fw-input" disabled value={user.email ?? ''} /></Field>
                    <Field label="Timezone">
                      <select className="fw-select" onChange={(event) => setTimezone(event.target.value)} value={timezone}>
                        <option value="UTC">UTC</option>
                        <option value="Asia/Bangkok">Asia/Bangkok</option>
                        <option value="America/New_York">America/New_York</option>
                        <option value="Europe/London">Europe/London</option>
                      </select>
                    </Field>
                  </div>
                  <div className="fw-card-body" style={{ paddingTop: 0 }}>
                    <div className="fw-avatar-preset-grid">
                      {AVATAR_PRESETS.map((preset) => (
                        <button
                          className={avatarUrl === preset.url ? 'active' : ''}
                          key={preset.id}
                          onClick={() => setAvatarUrl(preset.url)}
                          type="button"
                        >
                          <span style={{ background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})` }} />
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>
                <Card>
                  <CardHead icon="scroll" title="Signature" />
                  <div className="fw-card-body">
                    <Field label="The line carried on every character sheet" hint="Optional. Shown in small print at the bottom of your sheet.">
                      <input className="fw-input" onChange={(event) => setSignature(event.target.value)} value={signature} />
                    </Field>
                  </div>
                </Card>
              </>
            ) : null}

            {section === 'appearance' ? (
              <>
                <Card>
                  <CardHead icon="flame" title="Theme" />
                  <div className="fw-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    {[
                      { n: 'Cinder', g: ['#0B0A10', '#1D1828', '#D6A84F'], desc: 'Dark fantasy. Default.' },
                      { n: 'Sepulchre', g: ['#08070d', '#1a1226', '#7C3AED'], desc: 'Arcane purple.' },
                      { n: 'Reliquary', g: ['#16100b', '#3a2a18', '#EAC074'], desc: 'Warmer gold.' },
                      { n: 'Ash', g: ['#0c0c0e', '#1c1c20', '#A8A29E'], desc: 'Quiet greys.' },
                    ].map((option) => (
                      <button
                        className="fw-card"
                        key={option.n}
                        onClick={() => setTheme(option.n)}
                        style={{
                          textAlign: 'left',
                          padding: 0,
                          cursor: 'pointer',
                          overflow: 'hidden',
                          borderColor: theme === option.n ? 'rgba(214,168,79,0.55)' : 'var(--border-soft)',
                          boxShadow: theme === option.n ? '0 0 0 1px rgba(214,168,79,0.3), 0 0 24px -10px rgba(214,168,79,0.3)' : 'none',
                        }}
                        type="button"
                      >
                        <div style={{ height: 70, background: `linear-gradient(135deg, ${option.g[0]}, ${option.g[1]})`, position: 'relative' }}>
                          <span style={{ position: 'absolute', right: 8, bottom: 8, width: 22, height: 22, borderRadius: 50, background: option.g[2], boxShadow: `0 0 16px ${option.g[2]}80` }} />
                        </div>
                        <div style={{ padding: 10 }}>
                          <div className="fw-display" style={{ fontSize: 13, color: theme === option.n ? 'var(--gold-bright)' : 'var(--text)' }}>{option.n}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{option.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
                <Card>
                  <CardHead icon="book" title="Reading" />
                  <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <SettingRow label="Long-form reading mode" desc="Wider line height and serif body in story log." control={<Toggle on={readingMode} onChange={setReadingMode} />} />
                    <SettingRow
                      label="Body text size"
                      desc={`Currently ${readingSize}px in story log.`}
                      control={<input max={20} min={13} onChange={(event) => setReadingSize(Number(event.target.value))} style={{ width: 200, accentColor: 'var(--gold)' }} type="range" value={readingSize} />}
                    />
                    <SettingRow label="Animated atmospheric background" desc="Subtle particle drift on idle screens." control={<Toggle on={true} onChange={() => {}} />} />
                    <SettingRow label="Reduce motion" desc="Disable seal rotation, dice tumble, and ambient sway." control={<Toggle on={false} onChange={() => {}} />} />
                  </div>
                </Card>
              </>
            ) : null}

            {section === 'ai' ? (
              <>
                <Card>
                  <CardHead icon="wand" title="AI Warden Defaults" right={<span className="fw-pill">Applies to new rooms</span>} />
                  <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <SettingRow label="Authority" desc="The Warden never alters game state without confirmation." control={<Seg options={['Assistant', 'Co-DM', 'Off'] as const} value={aiAuthority} onChange={setAiAuthority} />} />
                    <SettingRow label="Default tone" control={<Seg options={['Balanced', 'Grim', 'Heroic', 'Mystery'] as const} value={aiTone} onChange={setAiTone} />} />
                    <SettingRow label="Default rule strictness" control={<Seg options={['Casual', 'Standard', 'Hardcore'] as const} value={aiStrictness} onChange={setAiStrictness} />} />
                    <SettingRow label="Suggest player choices" desc="Show next-action suggestions under the story log." control={<Toggle on={suggestChoices} onChange={setSuggestChoices} />} />
                    <SettingRow label="Auto-generate scenes on entry" desc="Propose a scene description for the human DM to approve." control={<Toggle on={autoGenerateScenes} onChange={setAutoGenerateScenes} />} />
                  </div>
                </Card>
                <Card style={{ border: '1px solid rgba(214,168,79,0.4)' }}>
                  <CardHead icon="shield" title="Critical Change Confirmations" />
                  <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      ['HP damage', 'Confirm before any HP loss is applied.', confirmHp, setConfirmHp],
                      ['Death save fail', 'Confirm before failed death save is recorded.', true, () => {}],
                      ['Condition gained', 'Confirm before a player gains a condition.', true, () => {}],
                      ['Inventory loss', 'Confirm before any item is removed from a sheet.', true, () => {}],
                    ].map(([label, desc, on, change]) => (
                      <SettingRow key={label as string} label={label as string} desc={desc as string} dense control={<Toggle on={on as boolean} onChange={change as (next: boolean) => void} />} />
                    ))}
                    <div className="fw-serif" style={{ padding: 12, background: 'var(--bg-deep)', borderRadius: 6, border: '1px dashed var(--border)', fontSize: 12, color: 'var(--text-2)', fontStyle: 'italic', lineHeight: 1.5 }}>
                      The Warden's hands are tied wherever you tie them. Untied actions still appear in the log, but never as state changes.
                    </div>
                  </div>
                </Card>
              </>
            ) : null}

            {section === 'audio' ? (
              <Card>
                <CardHead icon="volume" title="Voice & Sound" />
                <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <SettingRow label="Voice chat default" desc="Auto-join voice when entering a room." control={<Toggle on={voice} onChange={setVoice} />} />
                  <SettingRow label="Push-to-talk key" control={<input className="fw-input" defaultValue="Space" style={{ width: 120, textAlign: 'center', fontFamily: 'var(--f-mono)' }} />} />
                  <SettingRow label="Microphone gate" desc="-32 dB" control={<input defaultValue={40} style={{ width: 200, accentColor: 'var(--gold)' }} type="range" />} />
                  <SettingRow label="Ambient bed volume" control={<input defaultValue={60} style={{ width: 200, accentColor: 'var(--gold)' }} type="range" />} />
                  <SettingRow label="Dice impact sounds" control={<Toggle on={true} onChange={() => {}} />} />
                </div>
              </Card>
            ) : null}

            {section === 'rules' ? (
              <>
                <Card>
                  <CardHead icon="dice" title="Dice" />
                  <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <SettingRow
                      label="Dice style"
                      control={<div style={{ display: 'flex', gap: 6 }}>{['Brass', 'Bone', 'Ash', 'Arcane'].map((styleName) => (
                        <button className={`fw-btn ${diceStyle === styleName ? '' : 'fw-btn-ghost'} fw-btn-sm`} key={styleName} onClick={() => setDiceStyle(styleName)} type="button">{styleName}</button>
                      ))}</div>}
                    />
                    <SettingRow label="Roll animation" control={<Toggle on={true} onChange={() => {}} />} />
                    <SettingRow label="Critical hit threshold" control={<Seg options={['19+', '20', 'Brutal'] as const} value="20" onChange={() => {}} />} />
                  </div>
                </Card>
                <Card>
                  <CardHead icon="shield" title="House Rules" />
                  <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {['Critical hit doubles dice', 'Inspiration stacks up to 3', 'Healing potions are a bonus action', 'Death saves on private rolls', 'Flanking grants advantage'].map((rule, index) => (
                      <SettingRow key={rule} label={rule} dense control={<Toggle on={index === 0 || index === 2 || index === 3} onChange={() => {}} />} />
                    ))}
                  </div>
                </Card>
              </>
            ) : null}

            {section === 'table' ? (
              <Card>
                <CardHead icon="users" title="Table Manners" />
                <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <SettingRow label="Strict confirmations on critical state" desc="Require explicit Confirm on HP, death, conditions, inventory loss." control={<Toggle on={confirmStrict} onChange={setConfirmStrict} />} />
                  <SettingRow label="Lines & veils editor at session zero" control={<Toggle on={true} onChange={() => {}} />} />
                  <SettingRow label="Pause request requires no quorum" control={<Toggle on={true} onChange={() => {}} />} />
                  <SettingRow label="Quiet hours" desc="22:00 to 07:00 local" control={<Seg options={['Off', 'Soft', 'Strict'] as const} value="Soft" onChange={() => {}} />} />
                </div>
              </Card>
            ) : null}

            {section === 'account' ? (
              <>
                <Card>
                  <CardHead icon="shield" title="Account" />
                  <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {profile?.deletedAt ? (
                      <div className="fw-danger-box">
                        Account deletion is scheduled for {profile.deleteAfter ? new Date(profile.deleteAfter).toLocaleDateString() : '30 days from request'}.
                        <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled={busy} onClick={() => void handleRecoverAccount()} type="button">Recover account</button>
                      </div>
                    ) : null}
                    <SettingRow label="Email" control={<button className="fw-btn fw-btn-ghost fw-btn-sm" disabled type="button">Change</button>} />
                    <SettingRow label="Passphrase" control={<button className="fw-btn fw-btn-ghost fw-btn-sm" disabled type="button">Rotate</button>} />
                    <SettingRow label="Current session" desc="This device is signed in now." control={<button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={onSignOut} type="button">Sign out</button>} />
                  </div>
                </Card>
                <Card>
                  <CardHead icon="scroll" title="Data & Compact" />
                  <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <SettingRow label="Export all campaigns" desc="ZIP including JSON sheets, logs, and transcripts." control={<button className="fw-btn fw-btn-ghost fw-btn-sm" disabled type="button">Request export</button>} />
                    <SettingRow label="Read the Warden's Compact" control={<button className="fw-btn fw-btn-ghost fw-btn-sm" disabled type="button">{Icon('scroll', { size: 11 })} Open</button>} />
                    <Field label="Confirm passphrase" hint="Schedules soft deletion for 30 days, then signs this device out.">
                      <input className="fw-input" onChange={(event) => setDeletePassword(event.target.value)} type="password" value={deletePassword} />
                    </Field>
                    <SettingRow label="Delete account" desc="Soft-delete now; backend cleanup can hard-delete after the recovery window." control={<button className="fw-btn fw-btn-blood fw-btn-sm" disabled={busy} onClick={() => void handleDeleteAccount()} type="button">Delete</button>} />
                  </div>
                </Card>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
