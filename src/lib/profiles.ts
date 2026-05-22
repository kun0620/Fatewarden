import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { uploadUserImage } from './storage';

export type UserSettings = {
  language: 'th' | 'en';
  theme: 'vigil' | 'frost' | 'ash';
  soundEnabled: boolean;
  defaultDmPreset: 'dark_fantasy' | 'storyteller' | 'horror' | 'heroic';
  hpCalculation: 'roll' | 'average';
  autoSave: boolean;
  defaultDiceRoller: 'manual' | 'auto';
  combatAutomation: 'full_manual' | 'semi_auto' | 'full_auto';
  partyChoiceTimeout: 30 | 60 | 120 | null;
};

export type UserProfile = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  settings: UserSettings;
  bannedAt?: string;
  banReason?: string;
  usernameChangedAt?: string;
  deletedAt?: string;
  deleteAfter?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ProfileRow = {
  id: string;
  email?: string | null;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  settings?: Partial<UserSettings> | null;
  banned_at?: string | null;
  ban_reason?: string | null;
  username_changed_at?: string | null;
  deleted_at?: string | null;
  delete_after?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export const AVATAR_PRESETS = [
  { id: 'ember', label: 'Ember', url: 'preset:ember', colors: ['#7c3aed', '#d6a84f'] },
  { id: 'cinder', label: 'Cinder', url: 'preset:cinder', colors: ['#1f1b2e', '#d6a84f'] },
  { id: 'thorn', label: 'Thorn', url: 'preset:thorn', colors: ['#14532d', '#d6a84f'] },
  { id: 'blood', label: 'Blood', url: 'preset:blood', colors: ['#7f1d1d', '#f87171'] },
  { id: 'moon', label: 'Moon', url: 'preset:moon', colors: ['#334155', '#e5e7eb'] },
  { id: 'void', label: 'Void', url: 'preset:void', colors: ['#111827', '#7c3aed'] },
  { id: 'ash', label: 'Ash', url: 'preset:ash', colors: ['#3f3f46', '#a8a29e'] },
  { id: 'gold', label: 'Gold', url: 'preset:gold', colors: ['#713f12', '#facc15'] },
] as const;

const USERNAME_RE = /^[a-z][a-z0-9_]{2,19}$/;
const PROFILE_SELECT = 'id,email,username,display_name,avatar_url,settings,banned_at,ban_reason,username_changed_at,deleted_at,delete_after,created_at,updated_at';
export const DEFAULT_USER_SETTINGS: UserSettings = {
  language: 'en',
  theme: 'vigil',
  soundEnabled: true,
  defaultDmPreset: 'dark_fantasy',
  hpCalculation: 'average',
  autoSave: true,
  defaultDiceRoller: 'manual',
  combatAutomation: 'semi_auto',
  partyChoiceTimeout: 60,
};

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function isLanguage(value: unknown): value is UserSettings['language'] {
  return value === 'th' || value === 'en';
}

function isTheme(value: unknown): value is UserSettings['theme'] {
  return value === 'vigil' || value === 'frost' || value === 'ash';
}

function isDmPreset(value: unknown): value is UserSettings['defaultDmPreset'] {
  return value === 'dark_fantasy' || value === 'storyteller' || value === 'horror' || value === 'heroic';
}

function isHpCalculation(value: unknown): value is UserSettings['hpCalculation'] {
  return value === 'roll' || value === 'average';
}

function isDiceRoller(value: unknown): value is UserSettings['defaultDiceRoller'] {
  return value === 'manual' || value === 'auto';
}

function isCombatAutomation(value: unknown): value is UserSettings['combatAutomation'] {
  return value === 'full_manual' || value === 'semi_auto' || value === 'full_auto';
}

function isPartyChoiceTimeout(value: unknown): value is UserSettings['partyChoiceTimeout'] {
  return value === 30 || value === 60 || value === 120 || value === null;
}

export function normalizeUserSettings(value: unknown): UserSettings {
  const raw = value && typeof value === 'object' ? value as Partial<UserSettings> : {};
  return {
    language: isLanguage(raw.language) ? raw.language : DEFAULT_USER_SETTINGS.language,
    theme: isTheme(raw.theme) ? raw.theme : DEFAULT_USER_SETTINGS.theme,
    soundEnabled: typeof raw.soundEnabled === 'boolean' ? raw.soundEnabled : DEFAULT_USER_SETTINGS.soundEnabled,
    defaultDmPreset: isDmPreset(raw.defaultDmPreset) ? raw.defaultDmPreset : DEFAULT_USER_SETTINGS.defaultDmPreset,
    hpCalculation: isHpCalculation(raw.hpCalculation) ? raw.hpCalculation : DEFAULT_USER_SETTINGS.hpCalculation,
    autoSave: typeof raw.autoSave === 'boolean' ? raw.autoSave : DEFAULT_USER_SETTINGS.autoSave,
    defaultDiceRoller: isDiceRoller(raw.defaultDiceRoller) ? raw.defaultDiceRoller : DEFAULT_USER_SETTINGS.defaultDiceRoller,
    combatAutomation: isCombatAutomation(raw.combatAutomation) ? raw.combatAutomation : DEFAULT_USER_SETTINGS.combatAutomation,
    partyChoiceTimeout: isPartyChoiceTimeout(raw.partyChoiceTimeout) ? raw.partyChoiceTimeout : DEFAULT_USER_SETTINGS.partyChoiceTimeout,
  };
}

export function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
}

export function validateUsername(value: string) {
  const username = normalizeUsername(value);
  if (!USERNAME_RE.test(username)) {
    return {
      ok: false as const,
      username,
      message: 'Username must be 3-20 chars, start with a letter, and use only a-z, 0-9, or underscore.',
    };
  }
  return { ok: true as const, username };
}

function fallbackUsername(user: User) {
  const raw =
    (typeof user.user_metadata?.username === 'string' && user.user_metadata.username) ||
    (typeof user.user_metadata?.handle === 'string' && user.user_metadata.handle) ||
    user.email?.split('@')[0] ||
    'warden';
  const normalized = normalizeUsername(raw);
  return USERNAME_RE.test(normalized) ? normalized : `warden_${user.id.slice(0, 6)}`.slice(0, 20);
}

function mapProfile(row: ProfileRow, user: User): UserProfile {
  return {
    id: row.id,
    email: row.email ?? user.email ?? '',
    username: row.username ?? fallbackUsername(user),
    displayName: row.display_name ?? user.user_metadata?.displayName ?? row.username ?? fallbackUsername(user),
    avatarUrl: row.avatar_url ?? user.user_metadata?.avatarUrl ?? '',
    settings: normalizeUserSettings(row.settings ?? user.user_metadata?.settings),
    bannedAt: row.banned_at ?? undefined,
    banReason: row.ban_reason ?? undefined,
    usernameChangedAt: row.username_changed_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    deleteAfter: row.delete_after ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export async function getProfile(user: User): Promise<UserProfile> {
  const client = requireClient();
  const { data, error } = await client
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') return metadataProfile(user);
    throw error;
  }

  if (!data) return ensureProfile(user);
  return mapProfile(data as ProfileRow, user);
}

export function metadataProfile(user: User): UserProfile {
  const username = fallbackUsername(user);
  return {
    id: user.id,
    email: user.email ?? '',
    username,
    displayName: user.user_metadata?.displayName ?? user.user_metadata?.name ?? username,
    avatarUrl: user.user_metadata?.avatarUrl ?? '',
    settings: normalizeUserSettings(user.user_metadata?.settings),
  };
}

export async function ensureProfile(user: User, options: { username?: string; displayName?: string } = {}) {
  const client = requireClient();
  const checked = validateUsername(options.username || fallbackUsername(user));
  const username = checked.ok ? checked.username : fallbackUsername(user);
  const displayName = (options.displayName || user.user_metadata?.displayName || user.user_metadata?.name || username).trim();

  const existing = await client
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', user.id)
    .maybeSingle();

  if (existing.error) {
    if (existing.error.code === '42P01') return metadataProfile(user);
    throw existing.error;
  }

  if (existing.data) {
    return mapProfile(existing.data as ProfileRow, user);
  }

  const row = {
    id: user.id,
    email: user.email ?? '',
    username,
    display_name: displayName || username,
    avatar_url: user.user_metadata?.avatarUrl ?? null,
    settings: normalizeUserSettings(user.user_metadata?.settings),
    username_changed_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from('profiles')
    .insert(row)
    .select(PROFILE_SELECT)
    .single();

  if (error) {
    if (error.code === '42P01') return metadataProfile(user);
    throw error;
  }

  await client.auth.updateUser({
    data: {
      username,
      displayName: displayName || username,
      avatarUrl: row.avatar_url ?? '',
      settings: row.settings,
    },
  });

  return mapProfile(data as ProfileRow, user);
}

export async function updateProfile(
  user: User,
  patch: { username?: string; displayName?: string; avatarUrl?: string },
) {
  const client = requireClient();
  const current = await getProfile(user);
  const next: Record<string, unknown> = {};
  const authData: Record<string, unknown> = {};

  if (patch.displayName !== undefined) {
    const displayName = patch.displayName.trim();
    next.display_name = displayName || current.username;
    authData.displayName = next.display_name;
  }

  if (patch.avatarUrl !== undefined) {
    next.avatar_url = patch.avatarUrl;
    authData.avatarUrl = patch.avatarUrl;
  }

  if (patch.username !== undefined && patch.username !== current.username) {
    const checked = validateUsername(patch.username);
    if (!checked.ok) throw new Error(checked.message);
    if (current.usernameChangedAt) {
      const last = new Date(current.usernameChangedAt).getTime();
      const days = (Date.now() - last) / 86_400_000;
      if (days < 30) throw new Error(`Username can be changed again in ${Math.ceil(30 - days)} day(s).`);
    }
    next.username = checked.username;
    next.username_changed_at = new Date().toISOString();
    authData.username = checked.username;
  }

  if (!Object.keys(next).length) return current;

  const { data, error } = await client
    .from('profiles')
    .update(next)
    .eq('id', user.id)
    .select(PROFILE_SELECT)
    .single();

  if (error) throw error;

  if (Object.keys(authData).length) await client.auth.updateUser({ data: authData });
  return mapProfile(data as ProfileRow, user);
}

export async function updateUserSettings(user: User, settings: UserSettings) {
  const client = requireClient();
  const normalized = normalizeUserSettings(settings);
  const { data, error } = await client
    .from('profiles')
    .update({ settings: normalized })
    .eq('id', user.id)
    .select(PROFILE_SELECT)
    .single();
  if (error) throw error;
  await client.auth.updateUser({ data: { settings: normalized, language: normalized.language, theme: normalized.theme } });
  return mapProfile(data as ProfileRow, user);
}

export async function uploadAvatar(user: User, file: File) {
  const uploaded = await uploadUserImage({ bucket: 'avatars', file, ownerKind: 'profile', ownerId: user.id, user });
  await updateProfile(user, { avatarUrl: uploaded.publicUrl });
  return uploaded.publicUrl;
}

export async function sendPasswordReset(email: string) {
  const client = requireClient();
  const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}

export async function scheduleAccountDeletion(user: User, password: string) {
  const client = requireClient();
  if (!user.email) throw new Error('No email is attached to this session.');
  const reauth = await client.auth.signInWithPassword({ email: user.email, password });
  if (reauth.error) throw reauth.error;

  const now = new Date();
  const deleteAfter = new Date(now.getTime() + 30 * 86_400_000);
  const { error } = await client
    .from('profiles')
    .update({
      deleted_at: now.toISOString(),
      delete_after: deleteAfter.toISOString(),
    })
    .eq('id', user.id);
  if (error) throw error;
}

export async function recoverAccount(user: User) {
  const client = requireClient();
  const { error } = await client
    .from('profiles')
    .update({ deleted_at: null, delete_after: null })
    .eq('id', user.id);
  if (error) throw error;
}
