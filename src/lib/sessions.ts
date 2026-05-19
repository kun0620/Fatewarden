import type { User } from '@supabase/supabase-js';
import type { EncounterState, GamePhase, GameSession, SessionPlayMode, SessionTheme, RuleStrictness, RoomVisibility } from '../types';
import type { RoomSetupDraft } from './roomSetup';
import { normalizeEncounterState } from './combat';
import { normalizeGamePhase } from './gamePhases';
import { normalizePlayMode } from './playModes';
import { defaultSessionRules, normalizeRules } from './rules';
import { defaultSessionTheme, normalizeSessionTheme } from './sessionThemes';
import { supabase } from './supabase';

type SessionRow = {
  id: string;
  title: string;
  join_code: string;
  created_at: string;
  updated_at?: string | null;
  status?: string | null;
  created_by?: string | null;
  play_mode?: string | null;
  game_phase?: string | null;
  combat_state?: unknown;
  theme_key?: string | null;
  theme_tone?: string | null;
  theme_notes?: string | null;
  rules_version?: string | null;
  enabled_modules?: string[] | null;
  house_rules?: string | null;
  party_size?: number | null;
  allow_ai_dm?: boolean | null;
  visibility?: string | null;
  rule_strictness?: string | null;
};

const sessionSelect =
  'id,title,join_code,created_at,updated_at,status,created_by,play_mode,game_phase,combat_state,theme_key,theme_tone,theme_notes,rules_version,enabled_modules,house_rules,party_size,allow_ai_dm,visibility,rule_strictness';
const combatSessionSelect =
  'id,title,join_code,created_at,updated_at,status,created_by,play_mode,game_phase,combat_state,rules_version,enabled_modules,house_rules';
const legacySessionSelect = 'id,title,join_code,created_at,created_by,play_mode,game_phase,rules_version,enabled_modules,house_rules';
const baseSessionSelect = 'id,title,join_code,created_at,created_by,rules_version,enabled_modules,house_rules';

function mapSession(row: SessionRow): GameSession {
  return {
    id: row.id,
    title: row.title,
    joinCode: row.join_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    createdBy: row.created_by ?? undefined,
    status: normalizeSessionStatus(row.status, row.game_phase),
    playMode: normalizePlayMode(row.play_mode),
    phase: normalizeGamePhase(row.game_phase),
    theme: normalizeSessionTheme(row.theme_key, row.theme_tone, row.theme_notes),
    combatState: normalizeEncounterState(row.combat_state),
    rules: normalizeRules(row.rules_version, row.enabled_modules, row.house_rules),
    partySize: typeof row.party_size === 'number' ? row.party_size : 4,
    allowAiDm: typeof row.allow_ai_dm === 'boolean' ? row.allow_ai_dm : true,
    visibility: normalizeVisibility(row.visibility),
    ruleStrictness: normalizeRuleStrictness(row.rule_strictness),
  };
}

function isMissingSessionColumn(error: { code?: string; message?: string }) {
  return (
    error.code === '42703' ||
    error.message?.includes('game_phase') ||
    error.message?.includes('play_mode') ||
    error.message?.includes('combat_state') ||
    error.message?.includes('theme_key') ||
    error.message?.includes('theme_tone') ||
    error.message?.includes('theme_notes') ||
    error.message?.includes('party_size') ||
    error.message?.includes('allow_ai_dm') ||
    error.message?.includes('visibility') ||
    error.message?.includes('rule_strictness') ||
    error.message?.includes('updated_at') ||
    error.message?.includes('status')
  );
}

function normalizeSessionStatus(value: unknown, phase: unknown): 'draft' | 'active' | 'ended' {
  if (value === 'draft' || value === 'active' || value === 'ended') return value;
  return phase === 'setup' ? 'draft' : 'active';
}

function normalizeRuleStrictness(value: unknown): RuleStrictness {
  const valid = ['casual', 'standard', 'hardcore'];
  return typeof value === 'string' && valid.includes(value) ? (value as RuleStrictness) : 'standard';
}

function normalizeVisibility(value: unknown): RoomVisibility {
  return value === 'private' ? 'private' : 'invite_code';
}

function makeJoinCode() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => (byte % 36).toString(36))
    .join('')
    .toUpperCase();
}

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

export async function listJoinedSessions() {
  const client = requireClient();
  const result = await client
    .from('sessions')
    .select(sessionSelect)
    .order('updated_at', { ascending: false });
  let data: unknown[] | null = result.data;
  let error = result.error;

  if (error && isMissingSessionColumn(error)) {
    const legacyResult = await client
      .from('sessions')
      .select(legacySessionSelect)
      .order('created_at', { ascending: false });
    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error && isMissingSessionColumn(error)) {
    const baseResult = await client
      .from('sessions')
      .select(baseSessionSelect)
      .order('created_at', { ascending: false });
    data = baseResult.data;
    error = baseResult.error;
  }

  if (error) throw error;

  return (data ?? []).map((row) => mapSession(row as SessionRow));
}

export async function createGameSession(draft: RoomSetupDraft, user: User) {
  const client = requireClient();
  const joinCode = makeJoinCode();
  const { data, error } = await client
    .from('sessions')
    .insert({
      title: draft.title.trim(),
      join_code: joinCode,
      created_by: user.id,
      play_mode: draft.playMode,
      rules_version: defaultSessionRules.version,
      enabled_modules: defaultSessionRules.enabledModules,
      house_rules: draft.houseRules.trim() || defaultSessionRules.houseRules,
      game_phase: 'setup',
      theme_key: draft.themeKey,
      theme_tone: defaultSessionTheme.tone,
      theme_notes: draft.themeNotes.trim(),
      party_size: draft.partySize,
      allow_ai_dm: draft.allowAiDm,
      visibility: draft.visibility,
      rule_strictness: draft.ruleStrictness,
      status: 'draft',
    })
    .select(sessionSelect)
    .single();

  if (error && isMissingSessionColumn(error)) {
    const legacyResult = await client
      .from('sessions')
      .insert({
        title: draft.title.trim(),
        join_code: joinCode,
        created_by: user.id,
        play_mode: draft.playMode,
        rules_version: defaultSessionRules.version,
        enabled_modules: defaultSessionRules.enabledModules,
        house_rules: draft.houseRules.trim() || defaultSessionRules.houseRules,
        game_phase: 'setup',
      })
      .select(combatSessionSelect)
      .single();

    if (legacyResult.error) throw legacyResult.error;
    return mapSession(legacyResult.data as SessionRow);
  }

  if (error) throw error;

  return mapSession(data as SessionRow);
}

export async function joinGameSession(joinCode: string, user: User) {
  const client = requireClient();
  const { data, error } = await client.rpc('join_session_by_code', {
    code_to_join: joinCode.trim().toUpperCase(),
  }).maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No session found for that join code.');

  const session = mapSession(data as SessionRow);
  return session;
}

export async function updateSessionPhase(sessionId: string, phase: GamePhase) {
  const client = requireClient();
  const { data, error } = await client
    .rpc('set_session_phase', {
      target_session_id: sessionId,
      next_phase: phase,
    })
    .single();

  if (error) throw error;

  return mapSession(data as SessionRow);
}

export async function updateSessionCombatState(sessionId: string, encounter: EncounterState | null) {
  const client = requireClient();
  const { data, error } = await client
    .rpc('set_session_combat_state', {
      target_session_id: sessionId,
      next_combat_state: encounter,
    })
    .single();

  if (error) throw error;

  return mapSession(data as SessionRow);
}

export async function deleteGameSession(sessionId: string) {
  const client = requireClient();
  const { error } = await client.rpc('delete_owned_session', {
    target_session_id: sessionId,
  });

  if (error) throw error;
}

export function subscribeToSessionUpdates(
  sessionId: string,
  onSession: (session: GameSession) => void,
) {
  const client = requireClient();
  return client
    .channel(`session:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`,
      },
      (payload) => onSession(mapSession(payload.new as SessionRow)),
    )
    .subscribe();
}
