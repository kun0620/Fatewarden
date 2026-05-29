import type { User } from '@supabase/supabase-js';
import type { RunState } from '../engine/run/runTypes';
import type {
  AiDmPresetId,
  CoopChoiceMode,
  CoopDiceRollerMode,
  EncounterState,
  GamePhase,
  GameSession,
  RoomVisibility,
  RuleStrictness,
  SessionMember,
  SessionMemberRole,
  SessionMemberStatus,
  SessionPlayMode,
  SessionTheme,
} from '../types';
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
  room_code?: string | null;
  created_at: string;
  updated_at?: string | null;
  status?: string | null;
  created_by?: string | null;
  host_id?: string | null;
  mode?: string | null;
  preset?: string | null;
  campaign_id?: string | null;
  choice_mode?: string | null;
  dice_roller_mode?: string | null;
  play_mode?: string | null;
  game_phase?: string | null;
  combat_state?: unknown;
  run_state?: RunState | null;
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
  dm_preset?: string | null;
  session_recap?: string | null;
  last_autosaved_at?: string | null;
  ended_at?: string | null;
  max_players?: number | null;
  room_code_expires_at?: string | null;
};

const sessionSelect =
  'id,title,join_code,room_code,created_at,updated_at,status,created_by,host_id,mode,preset,campaign_id,choice_mode,dice_roller_mode,play_mode,game_phase,combat_state,run_state,theme_key,theme_tone,theme_notes,rules_version,enabled_modules,house_rules,party_size,max_players,allow_ai_dm,visibility,rule_strictness,dm_preset,session_recap,last_autosaved_at,ended_at,room_code_expires_at';
const combatSessionSelect =
  'id,title,join_code,created_at,updated_at,status,created_by,play_mode,game_phase,combat_state,rules_version,enabled_modules,house_rules';
const legacySessionSelect = 'id,title,join_code,created_at,created_by,play_mode,game_phase,rules_version,enabled_modules,house_rules';
const baseSessionSelect = 'id,title,join_code,created_at,created_by,rules_version,enabled_modules,house_rules';

function normalizeAiDmPresetId(value: unknown): AiDmPresetId {
  return value === 'grim' || value === 'heroic' || value === 'mystery' ? value : 'balanced';
}

type SessionMemberRow = {
  id: string;
  session_id: string;
  player_id: string;
  character_id?: string | null;
  role?: string | null;
  status?: string | null;
  is_ready?: boolean | null;
  last_seen?: string | null;
  joined_at?: string | null;
  updated_at?: string | null;
};

function mapSession(row: SessionRow): GameSession {
  const roomCode = row.room_code ?? row.join_code;
  const hostId = row.host_id ?? row.created_by ?? undefined;
  const maxPlayers = typeof row.max_players === 'number'
    ? row.max_players
    : typeof row.party_size === 'number'
      ? Math.min(5, Math.max(2, row.party_size))
      : 4;

  return {
    id: row.id,
    title: row.title,
    joinCode: roomCode,
    roomCode,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    createdBy: row.created_by ?? hostId,
    hostId,
    status: normalizeSessionStatus(row.status, row.game_phase),
    mode: row.mode === 'warden_run' ? 'warden_run' : row.mode === 'campaign' ? 'campaign' : 'ai_dm',
    preset: row.preset ?? row.dm_preset ?? undefined,
    campaignId: row.campaign_id ?? undefined,
    choiceMode: normalizeCoopChoiceMode(row.choice_mode),
    diceRollerMode: normalizeCoopDiceRollerMode(row.dice_roller_mode),
    playMode: normalizePlayMode(row.play_mode),
    phase: normalizeGamePhase(row.game_phase),
    theme: normalizeSessionTheme(row.theme_key, row.theme_tone, row.theme_notes),
    combatState: normalizeEncounterState(row.combat_state),
    runState: row.run_state ?? undefined,
    difficulty: row.run_state?.difficulty,
    rules: normalizeRules(row.rules_version, row.enabled_modules, row.house_rules),
    partySize: maxPlayers,
    maxPlayers,
    allowAiDm: typeof row.allow_ai_dm === 'boolean' ? row.allow_ai_dm : true,
    visibility: normalizeVisibility(row.visibility),
    ruleStrictness: normalizeRuleStrictness(row.rule_strictness),
    dmPreset: normalizeAiDmPresetId(row.dm_preset),
    sessionRecap: row.session_recap ?? '',
    lastAutosavedAt: row.last_autosaved_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    roomCodeExpiresAt: row.room_code_expires_at ?? undefined,
  };
}

function mapSessionMember(row: SessionMemberRow): SessionMember {
  return {
    id: row.id,
    sessionId: row.session_id,
    playerId: row.player_id,
    characterId: row.character_id ?? undefined,
    role: normalizeSessionMemberRole(row.role),
    status: normalizeSessionMemberStatus(row.status),
    isReady: row.is_ready ?? false,
    lastSeen: row.last_seen ?? row.updated_at ?? new Date().toISOString(),
    joinedAt: row.joined_at ?? row.last_seen ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? undefined,
  };
}

function isMissingSessionColumn(error: { code?: string; message?: string }) {
  return (
    error.code === '42703' ||
    error.message?.includes('game_phase') ||
    error.message?.includes('play_mode') ||
    error.message?.includes('combat_state') ||
    error.message?.includes('run_state') ||
    error.message?.includes('theme_key') ||
    error.message?.includes('theme_tone') ||
    error.message?.includes('theme_notes') ||
    error.message?.includes('party_size') ||
    error.message?.includes('allow_ai_dm') ||
    error.message?.includes('visibility') ||
    error.message?.includes('rule_strictness') ||
    error.message?.includes('dm_preset') ||
    error.message?.includes('session_recap') ||
    error.message?.includes('last_autosaved_at') ||
    error.message?.includes('ended_at') ||
    error.message?.includes('updated_at') ||
    error.message?.includes('status') ||
    error.message?.includes('room_code') ||
    error.message?.includes('host_id') ||
    error.message?.includes('mode') ||
    error.message?.includes('preset') ||
    error.message?.includes('max_players') ||
    error.message?.includes('campaign_id') ||
    error.message?.includes('choice_mode') ||
    error.message?.includes('dice_roller_mode') ||
    error.message?.includes('room_code_expires_at')
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
  if (value === 'public') return 'public';
  return value === 'private' ? 'private' : 'invite_code';
}

function normalizeCoopChoiceMode(value: unknown): CoopChoiceMode {
  return value === 'host' ? 'host' : 'vote';
}

function normalizeCoopDiceRollerMode(value: unknown): CoopDiceRollerMode {
  const valid: CoopDiceRollerMode[] = ['host', 'highest_stat', 'all_best', 'all_worst'];
  return typeof value === 'string' && valid.includes(value as CoopDiceRollerMode)
    ? (value as CoopDiceRollerMode)
    : 'highest_stat';
}

function toPersistedPlayMode(mode: SessionPlayMode): 'dnd' | 'hexplore' {
  return mode === 'hexplore' ? 'hexplore' : 'dnd';
}

function normalizeSessionMemberRole(value: unknown): SessionMemberRole {
  return value === 'host' ? 'host' : 'player';
}

function normalizeSessionMemberStatus(value: unknown): SessionMemberStatus {
  if (value === 'online' || value === 'offline' || value === 'kicked') return value;
  return 'offline';
}

function makeJoinCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
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
      room_code: joinCode,
      created_by: user.id,
      host_id: user.id,
      mode: draft.playMode === 'warden_run'
        ? 'warden_run'
        : 'campaign',
      preset: draft.themeKey,
      choice_mode: 'vote',
      dice_roller_mode: 'highest_stat',
      play_mode: toPersistedPlayMode(draft.playMode),
      rules_version: defaultSessionRules.version,
      enabled_modules: defaultSessionRules.enabledModules,
      house_rules: draft.houseRules.trim() || defaultSessionRules.houseRules,
      game_phase: 'setup',
      theme_key: draft.themeKey,
      theme_tone: defaultSessionTheme.tone,
      theme_notes: draft.themeNotes.trim(),
      party_size: draft.partySize,
      max_players: draft.partySize,
      allow_ai_dm: false,
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
        play_mode: toPersistedPlayMode(draft.playMode),
        rules_version: defaultSessionRules.version,
        enabled_modules: defaultSessionRules.enabledModules,
        house_rules: draft.houseRules.trim() || defaultSessionRules.houseRules,
        game_phase: 'setup',
      })
      .select(legacySessionSelect)
      .single();

    if (legacyResult.error) throw legacyResult.error;
    const session = mapSession(legacyResult.data as SessionRow);
    void ensureSessionMember(session.id, user).catch(() => undefined);
    return session;
  }

  if (error) throw error;

  const session = mapSession(data as SessionRow);
  void ensureSessionMember(session.id, user).catch(() => undefined);
  return session;
}

export async function joinGameSession(joinCode: string, user: User) {
  const client = requireClient();
  const { data, error } = await client.rpc('join_session_by_code', {
    code_to_join: joinCode.trim().toUpperCase(),
  }).maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No session found for that join code.');

  const session = mapSession(data as SessionRow);
  void ensureSessionMember(session.id, user).catch(() => undefined);
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
  const nextCombatState = encounter
    ? {
        ...encounter,
        phase: encounter.phase ?? (encounter.isActive ? 'active' : 'setup'),
        activeCombatantId: encounter.combatants[encounter.activeIndex]?.id ?? encounter.activeCombatantId ?? null,
        updatedAt: new Date().toISOString(),
      }
    : null;

  const primary = await client
    .rpc('set_combat_state', {
      target_session_id: sessionId,
      next_combat_state: nextCombatState,
    })
    .single();

  if (!primary.error) {
    return mapSession(primary.data as SessionRow);
  }

  const missingRpc = primary.error.code === '42883' || primary.error.code === 'PGRST202';
  if (!missingRpc) throw primary.error;

  const fallback = await client
    .rpc('set_session_combat_state', {
      target_session_id: sessionId,
      next_combat_state: nextCombatState,
    })
    .single();

  if (fallback.error) throw fallback.error;

  return mapSession(fallback.data as SessionRow);
}

export async function updateSessionAiState(
  sessionId: string,
  patch: {
    dmPreset?: AiDmPresetId;
    sessionRecap?: string;
    markAutosaved?: boolean;
    markEnded?: boolean;
  },
) {
  const client = requireClient();
  const rpc = await client
    .rpc('set_session_ai_state', {
      target_session_id: sessionId,
      next_dm_preset: patch.dmPreset ?? null,
      next_session_recap: patch.sessionRecap ?? null,
      mark_autosaved: patch.markAutosaved ?? false,
      mark_ended: patch.markEnded ?? false,
    })
    .single();

  if (!rpc.error) return mapSession(rpc.data as SessionRow);

  const missingRpc = rpc.error.code === '42883' || rpc.error.code === 'PGRST202';
  if (!missingRpc) throw rpc.error;

  const updatePayload: Record<string, unknown> = {};
  if (patch.dmPreset) updatePayload.dm_preset = patch.dmPreset;
  if (typeof patch.sessionRecap === 'string') updatePayload.session_recap = patch.sessionRecap;
  if (patch.markAutosaved) updatePayload.last_autosaved_at = new Date().toISOString();
  if (patch.markEnded) {
    updatePayload.status = 'ended';
    updatePayload.ended_at = new Date().toISOString();
  }

  const fallback = await client
    .from('sessions')
    .update(updatePayload)
    .eq('id', sessionId)
    .select(sessionSelect)
    .single();

  if (fallback.error) throw fallback.error;
  return mapSession(fallback.data as SessionRow);
}

export async function deleteGameSession(sessionId: string) {
  const client = requireClient();
  const { error } = await client.rpc('delete_owned_session', {
    target_session_id: sessionId,
  });

  if (error) throw error;
}

export function getSessionJoinLink(joinCode: string) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/join/${joinCode.trim().toUpperCase()}`;
}

export async function listSessionMembers(sessionId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('session_members')
    .select('id,session_id,player_id,character_id,role,status,is_ready,last_seen,joined_at,updated_at')
    .eq('session_id', sessionId)
    .order('joined_at', { ascending: true });

  if (error) {
    const missingTable = error.code === '42P01' || error.message?.includes('session_members');
    if (missingTable) return [];
    throw error;
  }

  return (data ?? []).map((row) => mapSessionMember(row as SessionMemberRow));
}

export async function ensureSessionMember(sessionId: string, user: User, characterId?: string | null) {
  const client = requireClient();
  const rpc = await client
    .rpc('ensure_session_member', {
      target_session_id: sessionId,
      target_character_id: characterId ?? null,
    })
    .maybeSingle();

  if (!rpc.error && rpc.data) return mapSessionMember(rpc.data as SessionMemberRow);

  const missingRpc = rpc.error?.code === '42883' || rpc.error?.code === 'PGRST202';
  if (rpc.error && !missingRpc) throw rpc.error;

  const fallback = await client
    .from('session_members')
    .upsert({
      session_id: sessionId,
      player_id: user.id,
      character_id: characterId ?? null,
      role: 'player',
      status: 'online',
      last_seen: new Date().toISOString(),
    }, { onConflict: 'session_id,player_id' })
    .select('id,session_id,player_id,character_id,role,status,last_seen,joined_at,updated_at')
    .single();

  if (fallback.error) {
    const missingTable = fallback.error.code === '42P01' || fallback.error.message?.includes('session_members');
    if (missingTable) {
      return {
        id: `${sessionId}:${user.id}`,
        sessionId,
        playerId: user.id,
        characterId: characterId ?? undefined,
        role: 'player' as const,
        status: 'online' as const,
        lastSeen: new Date().toISOString(),
        joinedAt: new Date().toISOString(),
      };
    }
    throw fallback.error;
  }

  return mapSessionMember(fallback.data as SessionMemberRow);
}

export async function updateSessionPresence(
  sessionId: string,
  user: User,
  status: Extract<SessionMemberStatus, 'online' | 'offline'>,
  characterId?: string | null,
) {
  const client = requireClient();
  const rpc = await client
    .rpc('set_session_member_presence', {
      target_session_id: sessionId,
      next_status: status,
      next_character_id: characterId ?? null,
    })
    .maybeSingle();

  if (!rpc.error && rpc.data) return mapSessionMember(rpc.data as SessionMemberRow);

  const missingRpc = rpc.error?.code === '42883' || rpc.error?.code === 'PGRST202';
  if (rpc.error && !missingRpc) throw rpc.error;

  const fallback = await client
    .from('session_members')
    .upsert({
      session_id: sessionId,
      player_id: user.id,
      character_id: characterId ?? null,
      role: 'player',
      status,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'session_id,player_id' })
    .select('id,session_id,player_id,character_id,role,status,last_seen,joined_at,updated_at')
    .single();

  if (fallback.error) {
    const missingTable = fallback.error.code === '42P01' || fallback.error.message?.includes('session_members');
    if (missingTable) return null;
    throw fallback.error;
  }

  return mapSessionMember(fallback.data as SessionMemberRow);
}

export async function kickSessionMember(sessionId: string, playerId: string) {
  const client = requireClient();
  const { data, error } = await client
    .rpc('kick_session_member', {
      target_session_id: sessionId,
      target_player_id: playerId,
    })
    .maybeSingle();

  if (error) throw error;
  return data ? mapSessionMember(data as SessionMemberRow) : null;
}

export async function startMultiplayerSession(sessionId: string) {
  const client = requireClient();
  const { data, error } = await client
    .rpc('start_multiplayer_session', {
      target_session_id: sessionId,
    })
    .maybeSingle();

  if (!error && data) return mapSession(data as SessionRow);

  const missingRpc = error?.code === '42883' || error?.code === 'PGRST202';
  if (error && !missingRpc) throw error;

  const fallback = await client
    .from('sessions')
    .update({ status: 'active', game_phase: 'exploration' })
    .eq('id', sessionId)
    .select(sessionSelect)
    .single();

  if (fallback.error) throw fallback.error;
  return mapSession(fallback.data as SessionRow);
}

export async function endMultiplayerSession(sessionId: string, recap = '') {
  const client = requireClient();
  const { data, error } = await client
    .rpc('end_multiplayer_session', {
      target_session_id: sessionId,
      next_recap: recap,
    })
    .maybeSingle();

  if (!error && data) return mapSession(data as SessionRow);

  const missingRpc = error?.code === '42883' || error?.code === 'PGRST202';
  if (error && !missingRpc) throw error;

  return updateSessionAiState(sessionId, {
    sessionRecap: recap,
    markAutosaved: true,
    markEnded: true,
  });
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

export async function updateMemberReady(sessionId: string, playerId: string, isReady: boolean) {
  const client = requireClient();
  const { data, error } = await client
    .from('session_members')
    .update({ is_ready: isReady })
    .eq('session_id', sessionId)
    .eq('player_id', playerId)
    .select('id,session_id,player_id,character_id,role,status,is_ready,last_seen,joined_at,updated_at')
    .single();

  if (error) {
    const missingColumn = error.code === '42703' || error.message?.includes('is_ready');
    if (missingColumn) return null;
    throw error;
  }
  return mapSessionMember(data as SessionMemberRow);
}

export function subscribeToSessionMembers(
  sessionId: string,
  onMembers: (members: SessionMember[]) => void,
) {
  const client = requireClient();
  return client
    .channel(`session-members:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'session_members',
        filter: `session_id=eq.${sessionId}`,
      },
      () => {
        void listSessionMembers(sessionId)
          .then(onMembers)
          .catch((error) => console.warn('Could not refresh session members', error));
      },
    )
    .subscribe();
}
