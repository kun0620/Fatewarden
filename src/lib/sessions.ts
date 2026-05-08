import type { User } from '@supabase/supabase-js';
import { demoCharacter } from '../data/demo';
import type { GamePhase, GameSession } from '../types';
import { normalizeGamePhase } from './gamePhases';
import { defaultSessionRules, normalizeRules } from './rules';
import { supabase } from './supabase';

type SessionRow = {
  id: string;
  title: string;
  join_code: string;
  created_at: string;
  game_phase?: string | null;
  rules_version?: string | null;
  enabled_modules?: string[] | null;
  house_rules?: string | null;
};

const sessionSelect = 'id,title,join_code,created_at,game_phase,rules_version,enabled_modules,house_rules';
const legacySessionSelect = 'id,title,join_code,created_at,rules_version,enabled_modules,house_rules';

function mapSession(row: SessionRow): GameSession {
  return {
    id: row.id,
    title: row.title,
    joinCode: row.join_code,
    createdAt: row.created_at,
    phase: normalizeGamePhase(row.game_phase),
    rules: normalizeRules(row.rules_version, row.enabled_modules, row.house_rules),
  };
}

function isMissingGamePhaseColumn(error: { code?: string; message?: string }) {
  return error.code === '42703' || error.message?.includes('game_phase');
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
    .order('created_at', { ascending: false });
  let data: unknown[] | null = result.data;
  let error = result.error;

  if (error && isMissingGamePhaseColumn(error)) {
    const legacyResult = await client
      .from('sessions')
      .select(legacySessionSelect)
      .order('created_at', { ascending: false });
    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) throw error;

  return (data ?? []).map((row) => mapSession(row as SessionRow));
}

export async function createGameSession(title: string, user: User, houseRules = '') {
  const client = requireClient();
  const joinCode = makeJoinCode();
  const { data, error } = await client
    .from('sessions')
    .insert({
      title,
      join_code: joinCode,
      created_by: user.id,
      rules_version: defaultSessionRules.version,
      enabled_modules: defaultSessionRules.enabledModules,
      house_rules: houseRules.trim() || defaultSessionRules.houseRules,
      game_phase: 'setup',
    })
    .select(sessionSelect)
    .single();

  if (error) throw error;

  await upsertDemoCharacter(data.id, user.id);
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
  await upsertDemoCharacter(session.id, user.id);
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

async function upsertDemoCharacter(sessionId: string, userId: string) {
  const client = requireClient();
  const { error } = await client.from('characters').upsert(
    {
      session_id: sessionId,
      user_id: userId,
      name: demoCharacter.name,
      ancestry: demoCharacter.ancestry,
      class_name: demoCharacter.className,
      level: demoCharacter.level,
      armor_class: demoCharacter.armorClass,
      hit_points: demoCharacter.hitPoints,
      max_hit_points: demoCharacter.maxHitPoints,
      abilities: demoCharacter.abilities,
      skills: demoCharacter.skills,
    },
    { onConflict: 'session_id,user_id' },
  );

  if (error) throw error;
}
