import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Icon } from './ui/Icons';
import { exportAllUserData } from '../lib/dataExport';
import { supabase } from '../lib/supabase';
import { deleteUserStorageFile, formatBytes, getStorageUsage, type StorageFileRecord, type StorageBucketId } from '../lib/storage';
import {
  AVATAR_PRESETS,
  DEFAULT_USER_SETTINGS,
  getProfile,
  normalizeUserSettings,
  recoverAccount,
  scheduleAccountDeletion,
  updateProfile,
  updateUserSettings,
  uploadAvatar,
  validateUsername,
  type UserProfile,
  type UserSettings,
} from '../lib/profiles';

type SettingsSection = 'account' | 'app' | 'gameplay' | 'storage';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type SettingsPageProps = {
  user: User;
  onBack: () => void;
  onSignOut: () => void;
};

const SETTINGS_STORAGE_KEY = 'fatewarden:user-settings';
const STORAGE_LIMIT = 100 * 1024 * 1024;
const SECTIONS: Array<{ id: SettingsSection; label: string; icon: string; desc: string }> = [
  { id: 'account', label: 'Account', icon: 'user', desc: 'Identity, avatar, password, deletion' },
  { id: 'app', label: 'App', icon: 'flame', desc: 'Language, theme, sound' },
  { id: 'gameplay', label: 'Gameplay', icon: 'dice', desc: 'DM, dice, combat defaults' },
  { id: 'storage', label: 'Storage', icon: 'layers', desc: 'Usage, files, export' },
];

const THEME_OPTIONS: Array<{ id: UserSettings['theme']; label: string; desc: string; swatch: string[] }> = [
  { id: 'vigil', label: 'Black Sea Vigil', desc: 'Default dark fantasy table.', swatch: ['#0b0a10', '#1d1828', '#d6a84f'] },
  { id: 'frost', label: 'Cathedral Frost', desc: 'Cold blue stone and pale candlelight.', swatch: ['#0a1015', '#192631', '#c7e6ee'] },
  { id: 'ash', label: 'Burned Library', desc: 'Warm ash, ember, and old pages.', swatch: ['#100c0b', '#261c18', '#f0b478'] },
];

const BUCKET_LABELS: Record<StorageBucketId, string> = {
  avatars: 'Avatars',
  portraits: 'Character Portraits',
  thumbnails: 'Campaign Thumbnails',
  'campaign-images': 'Campaign Images',
};

function storageKey(userId: string) {
  return `${SETTINGS_STORAGE_KEY}:${userId}`;
}

function readLocalSettings(userId: string) {
  try {
    return normalizeUserSettings(JSON.parse(localStorage.getItem(storageKey(userId)) || localStorage.getItem(SETTINGS_STORAGE_KEY) || 'null'));
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
}

function applyAppSettings(settings: UserSettings, userId: string) {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.lang = settings.language === 'th' ? 'th' : 'en';
  localStorage.setItem(storageKey(userId), JSON.stringify(settings));
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => (typeof window === 'undefined' ? false : window.matchMedia(query).matches));
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
  return (
    <button aria-pressed={on} className={`fw-toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} type="button">
    </button>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <section className="fw-card" style={style}>{children}</section>;
}

function CardHead({ icon, right, title }: { icon: string; right?: React.ReactNode; title: string }) {
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

function Field({ children, hint, label }: { children: React.ReactNode; hint?: string; label: string }) {
  return (
    <label className="fw-field">
      <span className="fw-label">{label}</span>
      {children}
      {hint ? <span className="fw-serif" style={{ color: 'var(--text-3)', fontSize: 12, fontStyle: 'italic' }}>{hint}</span> : null}
    </label>
  );
}

function SettingRow({ control, desc, label }: { control: React.ReactNode; desc?: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: '1px solid var(--border-soft)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text)' }}>{label}</div>
        {desc ? <div className="fw-serif" style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', marginTop: 2, lineHeight: 1.4 }}>{desc}</div> : null}
      </div>
      {control}
    </div>
  );
}

function Select<T extends string | number>({ options, value, onChange }: { options: Array<{ value: T; label: string }>; value: T; onChange: (next: T) => void }) {
  return (
    <select className="fw-select" onChange={(event) => onChange(options.find((option) => String(option.value) === event.target.value)?.value ?? value)} value={String(value)}>
      {options.map((option) => <option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}
    </select>
  );
}

function PasswordModal({
  busy,
  currentPassword,
  newPassword,
  onCancel,
  onChangeCurrent,
  onChangeNew,
  onSubmit,
}: {
  busy: boolean;
  currentPassword: string;
  newPassword: string;
  onCancel: () => void;
  onChangeCurrent: (value: string) => void;
  onChangeNew: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.62)', padding: 20 }}>
      <section className="fw-card fw-card-elev" style={{ width: 'min(440px, 100%)' }}>
        <CardHead icon="shield" title="Change Password" />
        <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Current password">
            <input className="fw-input" onChange={(event) => onChangeCurrent(event.target.value)} type="password" value={currentPassword} />
          </Field>
          <Field label="New password" hint="Use at least 8 characters.">
            <input className="fw-input" onChange={(event) => onChangeNew(event.target.value)} type="password" value={newPassword} />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="fw-btn fw-btn-ghost" onClick={onCancel} type="button">Cancel</button>
            <button className="fw-btn fw-btn-gold" disabled={busy} onClick={onSubmit} type="button">{busy ? 'Updating...' : 'Update'}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function SettingsPage({ user, onBack, onSignOut }: SettingsPageProps) {
  const isMobile = useMediaQuery('(max-width: 760px)');
  const [section, setSection] = useState<SettingsSection>('account');
  const [mobileSection, setMobileSection] = useState<SettingsSection | null>(null);
  const activeSection = isMobile ? mobileSection : section;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings>(() => readLocalSettings(user.id));
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [displayName, setDisplayName] = useState(user.user_metadata?.displayName ?? '');
  const [username, setUsername] = useState(user.user_metadata?.username ?? user.user_metadata?.handle ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user.user_metadata?.avatarUrl ?? '');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  const [exportBusy, setExportBusy] = useState(false);
  const [storageBusy, setStorageBusy] = useState(false);
  const [storageFiles, setStorageFiles] = useState<StorageFileRecord[]>([]);
  const [storageUsedBytes, setStorageUsedBytes] = useState(0);
  const [storageByBucket, setStorageByBucket] = useState<Record<StorageBucketId, number>>({ avatars: 0, portraits: 0, thumbnails: 0, 'campaign-images': 0 });
  const [showFiles, setShowFiles] = useState(false);

  useEffect(() => {
    applyAppSettings(settings, user.id);
  }, [settings, user.id]);

  useEffect(() => {
    let alive = true;
    getProfile(user)
      .then((loaded) => {
        if (!alive) return;
        setProfile(loaded);
        setDisplayName(loaded.displayName);
        setUsername(loaded.username);
        setAvatarUrl(loaded.avatarUrl);
        setSettings(loaded.settings);
        applyAppSettings(loaded.settings, user.id);
      })
      .catch((loadError) => {
        if (!alive) return;
        const local = readLocalSettings(user.id);
        setSettings(local);
        applyAppSettings(local, user.id);
        setError(loadError instanceof Error ? loadError.message : 'Could not load profile.');
      })
      .finally(() => {
        if (alive) setHydrated(true);
      });
    return () => {
      alive = false;
    };
  }, [user]);

  useEffect(() => {
    if (!hydrated) return;
    setSaveState('saving');
    const timeout = window.setTimeout(() => {
      void saveSettings();
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [hydrated, displayName, username, avatarUrl, settings]);

  useEffect(() => {
    if (activeSection !== 'storage') return;
    void refreshStorageUsage();
  }, [activeSection, user.id]);

  useEffect(() => {
    if (saveState !== 'saved') return;
    const timeout = window.setTimeout(() => setSaveState('idle'), 2500);
    return () => window.clearTimeout(timeout);
  }, [saveState]);

  const initials = useMemo(() => {
    const source = (displayName || user.email || 'Warden').trim();
    const words = source.split(/\s+/).filter(Boolean);
    if (words.length > 1) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return source.slice(0, 2).toUpperCase();
  }, [displayName, user.email]);

  const canChangeUsername = useMemo(() => {
    if (!profile?.usernameChangedAt || username === profile.username) return true;
    return Date.now() - Date.parse(profile.usernameChangedAt) >= 30 * 86_400_000;
  }, [profile?.username, profile?.usernameChangedAt, username]);

  const usagePercent = Math.min(100, Math.round((storageUsedBytes / STORAGE_LIMIT) * 100));

  function patchSettings(patch: Partial<UserSettings>) {
    setSettings((current) => normalizeUserSettings({ ...current, ...patch }));
  }

  async function saveSettings() {
    setError(null);
    try {
      const checked = validateUsername(username);
      if (!checked.ok) throw new Error(checked.message);
      if (!canChangeUsername) throw new Error('Username can be changed once every 30 days.');

      const updatedProfile = await updateProfile(user, {
        displayName,
        username: checked.username,
        avatarUrl,
      });
      const savedProfile = await updateUserSettings(user, settings);
      setProfile({ ...savedProfile, displayName: updatedProfile.displayName, username: updatedProfile.username, avatarUrl: updatedProfile.avatarUrl });
      setUsername(updatedProfile.username);
      setSaveState('saved');
    } catch (saveError) {
      setSaveState('error');
      setError(saveError instanceof Error ? saveError.message : 'Could not save settings.');
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
      setSaveState('saved');
    } catch (avatarError) {
      setError(avatarError instanceof Error ? avatarError.message : 'Could not upload avatar.');
      setSaveState('error');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handlePasswordChange() {
    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }
    if (!user.email) {
      setError('No email is attached to this session.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    setPasswordBusy(true);
    setError(null);
    try {
      const reauth = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (reauth.error) throw reauth.error;
      const update = await supabase.auth.updateUser({ password: newPassword });
      if (update.error) throw update.error;
      setPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setSaveState('saved');
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : 'Could not update password.');
    } finally {
      setPasswordBusy(false);
    }
  }

  async function handleDeleteAccount() {
    if (!deletePassword) {
      setError('Enter your current password before scheduling deletion.');
      return;
    }
    const confirmed = window.confirm('Your account will be disabled and scheduled for deletion in 30 days. Continue?');
    if (!confirmed) return;
    setSaveState('saving');
    setError(null);
    try {
      await scheduleAccountDeletion(user, deletePassword);
      await supabase?.auth.signOut();
      onSignOut();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not schedule account deletion.');
      setSaveState('error');
    }
  }

  async function handleRecoverAccount() {
    setSaveState('saving');
    setError(null);
    try {
      await recoverAccount(user);
      setProfile(await getProfile(user));
      setSaveState('saved');
    } catch (recoverError) {
      setError(recoverError instanceof Error ? recoverError.message : 'Could not recover account.');
      setSaveState('error');
    }
  }

  async function refreshStorageUsage() {
    setStorageBusy(true);
    setError(null);
    try {
      const usage = await getStorageUsage(user);
      setStorageFiles(usage.files);
      setStorageUsedBytes(usage.usedBytes);
      setStorageByBucket(usage.byBucket);
    } catch (storageError) {
      setError(storageError instanceof Error ? storageError.message : 'Could not load storage usage.');
    } finally {
      setStorageBusy(false);
    }
  }

  async function handleExportAllData() {
    setExportBusy(true);
    setError(null);
    try {
      await exportAllUserData(user);
      setSaveState('saved');
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Could not export your data.');
      setSaveState('error');
    } finally {
      setExportBusy(false);
    }
  }

  async function handleDeleteStorageFile(file: StorageFileRecord) {
    const confirmed = window.confirm(`Delete ${file.objectPath.split('/').pop() || file.objectPath}?`);
    if (!confirmed) return;
    setStorageBusy(true);
    setError(null);
    try {
      await deleteUserStorageFile(file);
      await refreshStorageUsage();
      setSaveState('saved');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete file.');
    } finally {
      setStorageBusy(false);
    }
  }

  function renderSectionList() {
    return (
      <Card style={{ position: isMobile ? 'static' : 'sticky', top: 20, padding: 8 }}>
        {SECTIONS.map((item) => {
          const active = activeSection === item.id;
          return (
            <button
              className="fw-btn fw-btn-ghost"
              key={item.id}
              onClick={() => {
                setSection(item.id);
                setMobileSection(item.id);
              }}
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
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <span>{item.label}</span>
                <span className="fw-serif" style={{ color: 'var(--text-3)', fontSize: 11, fontStyle: 'italic' }}>{item.desc}</span>
              </span>
            </button>
          );
        })}
      </Card>
    );
  }

  function renderAccount() {
    return (
      <>
        <Card>
          <CardHead icon="user" title="Account" />
          <div className="fw-card-body" style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'center' }}>
            <div className="fw-avatar xl" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), #15101f)', overflow: 'hidden' }}>
              {avatarUrl && !avatarUrl.startsWith('preset:') ? <img alt="" src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
            </div>
            <Field label="Display Name">
              <input className="fw-input" onChange={(event) => setDisplayName(event.target.value)} value={displayName} />
            </Field>
            <Field label="Username" hint={canChangeUsername ? '3-20 chars. Can be changed once every 30 days.' : 'Username is locked for 30 days after the last change.'}>
              <input className="fw-input" disabled={!canChangeUsername} onChange={(event) => setUsername(event.target.value)} value={username} />
            </Field>
            <label className="fw-btn fw-btn-ghost fw-btn-sm" style={{ justifyContent: 'center' }}>
              {avatarBusy ? 'Uploading...' : 'Upload Avatar'}
              <input accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void handleAvatarUpload(event.target.files?.[0])} type="file" />
            </label>
            <Field label="Email">
              <input className="fw-input" disabled value={user.email ?? ''} />
            </Field>
            <SettingRow label="Password" desc="Re-authenticate, then set a new password." control={<button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => setPasswordModal(true)} type="button">Change</button>} />
          </div>
          <div className="fw-card-body" style={{ paddingTop: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(98px, 1fr))', gap: 8 }}>
              {AVATAR_PRESETS.map((preset) => (
                <button
                  className="fw-btn fw-btn-ghost fw-btn-sm"
                  key={preset.id}
                  onClick={() => setAvatarUrl(preset.url)}
                  style={{
                    justifyContent: 'flex-start',
                    borderColor: avatarUrl === preset.url ? 'var(--gold-deep)' : undefined,
                    color: avatarUrl === preset.url ? 'var(--gold-bright)' : undefined,
                  }}
                  type="button"
                >
                  <span style={{ width: 16, height: 16, borderRadius: 50, background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})`, border: '1px solid var(--border-soft)' }} />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </Card>
        <Card>
          <CardHead icon="shield" title="Delete Account" />
          <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {profile?.deletedAt ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'rgba(153,27,27,0.12)', border: '1px solid rgba(153,27,27,0.35)', borderRadius: 8, color: 'var(--text-2)' }}>
                Account deletion is scheduled for {profile.deleteAfter ? new Date(profile.deleteAfter).toLocaleDateString() : '30 days from request'}.
                <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => void handleRecoverAccount()} type="button">Recover account</button>
              </div>
            ) : null}
            <Field label="Current password" hint="Soft-delete keeps a 30 day recovery window.">
              <input className="fw-input" onChange={(event) => setDeletePassword(event.target.value)} type="password" value={deletePassword} />
            </Field>
            <button className="fw-btn fw-btn-blood fw-btn-sm" onClick={() => void handleDeleteAccount()} style={{ alignSelf: 'flex-start' }} type="button">Delete Account</button>
          </div>
        </Card>
        <Card>
          <CardHead icon="mail" title="Support" />
          <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ color: 'var(--text-2)', fontSize: 13 }}>
              For account suspension questions, reports, or appeal requests, contact support.
            </div>
            <a className="fw-btn fw-btn-ghost fw-btn-sm" href="mailto:support@fatewarden.app" style={{ alignSelf: 'flex-start' }}>
              support@fatewarden.app
            </a>
          </div>
        </Card>
      </>
    );
  }

  function renderApp() {
    return (
      <>
        <Card>
          <CardHead icon="book" title="Language" />
          <div className="fw-card-body">
            <SettingRow
              label="Language"
              desc="Applies immediately without reloading."
              control={<Select options={[{ value: 'en', label: 'English' }, { value: 'th', label: 'ไทย' }]} value={settings.language} onChange={(language) => patchSettings({ language })} />}
            />
          </div>
        </Card>
        <Card>
          <CardHead icon="flame" title="Theme" />
          <div className="fw-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {THEME_OPTIONS.map((option) => (
              <button
                className="fw-card"
                key={option.id}
                onClick={() => patchSettings({ theme: option.id })}
                style={{
                  textAlign: 'left',
                  padding: 0,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  borderColor: settings.theme === option.id ? 'rgba(214,168,79,0.55)' : 'var(--border-soft)',
                  boxShadow: settings.theme === option.id ? '0 0 0 1px rgba(214,168,79,0.3), 0 0 24px -10px rgba(214,168,79,0.3)' : 'none',
                }}
                type="button"
              >
                <div style={{ height: 66, background: `linear-gradient(135deg, ${option.swatch[0]}, ${option.swatch[1]})`, position: 'relative' }}>
                  <span style={{ position: 'absolute', right: 8, bottom: 8, width: 22, height: 22, borderRadius: 50, background: option.swatch[2], boxShadow: `0 0 16px ${option.swatch[2]}80` }} />
                </div>
                <div style={{ padding: 10 }}>
                  <div className="fw-display" style={{ fontSize: 13, color: settings.theme === option.id ? 'var(--gold-bright)' : 'var(--text)' }}>{option.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{option.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <CardHead icon="volume" title="Sound" />
          <div className="fw-card-body">
            <SettingRow label="Sound" desc="Controls dice roll, notification, and scene transition sounds." control={<Toggle on={settings.soundEnabled} onChange={(soundEnabled) => patchSettings({ soundEnabled })} />} />
          </div>
        </Card>
      </>
    );
  }

  function renderGameplay() {
    return (
      <Card>
        <CardHead icon="dice" title="Gameplay" />
        <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <SettingRow
            label="Default DM Preset"
            control={<Select options={[
              { value: 'dark_fantasy', label: 'Dark Fantasy' },
              { value: 'storyteller', label: 'Storyteller' },
              { value: 'horror', label: 'Horror' },
              { value: 'heroic', label: 'Heroic' },
            ]} value={settings.defaultDmPreset} onChange={(defaultDmPreset) => patchSettings({ defaultDmPreset })} />}
          />
          <SettingRow
            label="HP Calculation"
            control={<Select options={[{ value: 'average', label: 'Average' }, { value: 'roll', label: 'Roll' }]} value={settings.hpCalculation} onChange={(hpCalculation) => patchSettings({ hpCalculation })} />}
          />
          <SettingRow label="Auto-save" control={<Toggle on={settings.autoSave} onChange={(autoSave) => patchSettings({ autoSave })} />} />
          <SettingRow
            label="Default Dice Roller"
            control={<Select options={[{ value: 'manual', label: 'Manual' }, { value: 'auto', label: 'Auto' }]} value={settings.defaultDiceRoller} onChange={(defaultDiceRoller) => patchSettings({ defaultDiceRoller })} />}
          />
          <SettingRow
            label="Combat Automation"
            desc="Full Manual: host controls enemies. Semi-Auto: host chooses per enemy. Full Auto: enemy behavior runs automatically."
            control={<Select options={[
              { value: 'full_manual', label: 'Full Manual' },
              { value: 'semi_auto', label: 'Semi-Auto' },
              { value: 'full_auto', label: 'Full Auto' },
            ]} value={settings.combatAutomation} onChange={(combatAutomation) => patchSettings({ combatAutomation })} />}
          />
          <SettingRow
            label="Party Choice Timeout"
            desc="When time expires, resolve by current majority; if no votes exist, host decides."
            control={<select className="fw-select" onChange={(event) => patchSettings({ partyChoiceTimeout: event.target.value === 'none' ? null : Number(event.target.value) as 30 | 60 | 120 })} value={settings.partyChoiceTimeout ?? 'none'}>
              <option value="30">30s</option>
              <option value="60">1min</option>
              <option value="120">2min</option>
              <option value="none">No limit</option>
            </select>}
          />
        </div>
      </Card>
    );
  }

  function renderStorage() {
    return (
      <>
        <Card>
          <CardHead icon="layers" right={<button className="fw-btn fw-btn-ghost fw-btn-sm" disabled={storageBusy} onClick={() => void refreshStorageUsage()} type="button">{storageBusy ? 'Refreshing...' : 'Refresh'}</button>} title="Storage Usage" />
          <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(BUCKET_LABELS).map(([bucket, label]) => (
              <div key={bucket} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: 'var(--text-2)', fontSize: 13 }}>
                <span>{label}</span>
                <span style={{ fontFamily: 'var(--f-mono)' }}>{formatBytes(storageByBucket[bucket as StorageBucketId] ?? 0)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: 'var(--text)', fontSize: 13 }}>
                <span>Total</span>
                <span style={{ fontFamily: 'var(--f-mono)' }}>{formatBytes(storageUsedBytes)} / 100 MB</span>
              </div>
              <div style={{ height: 8, border: '1px solid var(--border-soft)', borderRadius: 999, overflow: 'hidden', marginTop: 8, background: 'var(--bg-deep)' }}>
                <div style={{ height: '100%', width: `${usagePercent}%`, background: 'var(--gold)' }} />
              </div>
              <div className="fw-serif" style={{ color: 'var(--text-3)', fontSize: 12, fontStyle: 'italic', marginTop: 6 }}>{usagePercent}% used</div>
            </div>
          </div>
        </Card>
        <Card>
          <CardHead icon="scroll" title="Actions" />
          <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SettingRow label="Manage Files" desc={`${storageFiles.length} uploaded file${storageFiles.length === 1 ? '' : 's'} tracked.`} control={<button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => setShowFiles((next) => !next)} type="button">{showFiles ? 'Hide' : 'List'}</button>} />
            <SettingRow label="Export All Data" desc="Downloads a ZIP of character and campaign JSON data." control={<button className="fw-btn fw-btn-ghost fw-btn-sm" disabled={exportBusy} onClick={() => void handleExportAllData()} type="button">{exportBusy ? 'Exporting...' : 'Export ZIP'}</button>} />
            {showFiles ? (
              storageFiles.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {storageFiles.map((file) => (
                    <div key={file.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border-soft)' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: 'var(--text)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.objectPath}</div>
                        <div className="fw-serif" style={{ color: 'var(--text-3)', fontSize: 11, fontStyle: 'italic' }}>{file.bucketId} / {file.ownerKind}</div>
                      </div>
                      <span className="fw-pill dim">{formatBytes(file.sizeBytes)}</span>
                      <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled={storageBusy} onClick={() => void handleDeleteStorageFile(file)} type="button">Delete</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="fw-serif" style={{ color: 'var(--text-3)', fontSize: 12, fontStyle: 'italic' }}>No uploaded files are tracked yet.</div>
              )
            ) : null}
          </div>
        </Card>
      </>
    );
  }

  function renderActiveSection() {
    if (!activeSection) return renderSectionList();
    return (
      <div className="fw-fade" key={activeSection} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {isMobile ? <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => setMobileSection(null)} style={{ alignSelf: 'flex-start' }} type="button">{Icon('chevL', { size: 12 })} Settings</button> : null}
        {activeSection === 'account' ? renderAccount() : null}
        {activeSection === 'app' ? renderApp() : null}
        {activeSection === 'gameplay' ? renderGameplay() : null}
        {activeSection === 'storage' ? renderStorage() : null}
      </div>
    );
  }

  return (
    <main className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page">
        <header className="fw-page-head">
          <div>
            <div className="fw-eyebrow">The Scribe's Desk</div>
            <h1>Settings</h1>
            <div className="sub">Account, app, gameplay, and storage preferences.</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {saveState === 'saving' ? <span className="fw-pill">Saving...</span> : null}
            {saveState === 'saved' ? <span className="fw-pill success">Saved</span> : null}
            {error ? <span className="fw-pill blood">{error}</span> : null}
            <button className="fw-btn fw-btn-ghost" onClick={onBack} type="button">Back</button>
          </div>
        </header>

        <section style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'start' }}>
          {!isMobile ? renderSectionList() : null}
          {renderActiveSection()}
        </section>
      </div>

      {passwordModal ? (
        <PasswordModal
          busy={passwordBusy}
          currentPassword={currentPassword}
          newPassword={newPassword}
          onCancel={() => setPasswordModal(false)}
          onChangeCurrent={setCurrentPassword}
          onChangeNew={setNewPassword}
          onSubmit={() => void handlePasswordChange()}
        />
      ) : null}
    </main>
  );
}
