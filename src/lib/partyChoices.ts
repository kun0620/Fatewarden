/**
 * Migration SQL (reference)
 *
 * -- party_choices: id, session_id, source_message_id, prompt, options(jsonb),
 * --   resolution_policy, resolved_choice_id, status, expires_at, created_at
 * -- party_votes: id, choice_id, session_id, player_id, character_name,
 * --   selected_option_id, voted_at
 * -- Enable RLS: players can only insert their own votes.
 * -- Enable realtime on both tables.
 */

import type { RealtimeChannel } from '@supabase/supabase-js';
import type { AiChoice } from '../types';
import type { PartyChoice, PartyChoiceState, PartyVote } from '../engine/party/partyChoiceTypes';
import { supabase } from './supabase';

type PartyChoiceRow = {
  id: string;
  session_id: string;
  source_message_id: string;
  prompt: string;
  options: unknown;
  resolution_policy: PartyChoice['resolutionPolicy'];
  resolved_choice_id?: string | null;
  status: PartyChoice['status'];
  expires_at?: string | null;
  created_at: string;
};

type PartyVoteRow = {
  choice_id: string;
  player_id: string;
  character_name: string;
  selected_option_id: string;
  voted_at: string;
};

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }
  return supabase;
}

function toMs(value: string | null | undefined) {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeOptions(value: unknown): AiChoice[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index): AiChoice | null => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const number = typeof row.number === 'number' ? row.number : index + 1;
      const label = typeof row.label === 'string' ? row.label.trim() : '';
      const prompt = typeof row.prompt === 'string' ? row.prompt.trim() : label;
      if (!label && !prompt) return null;
      return {
        number,
        label: label || prompt,
        prompt: prompt || label,
        intent: typeof row.intent === 'string' ? (row.intent as AiChoice['intent']) : 'custom',
      };
    })
    .filter((item): item is AiChoice => Boolean(item));
}

function mapVoteRow(row: PartyVoteRow): PartyVote {
  return {
    playerId: row.player_id,
    characterName: row.character_name,
    choiceId: row.selected_option_id,
    votedAt: Date.parse(row.voted_at),
  };
}

function mapChoiceRow(row: PartyChoiceRow, votes: PartyVote[]): PartyChoice {
  return {
    id: row.id,
    sessionId: row.session_id,
    sourceMessageId: row.source_message_id,
    prompt: row.prompt,
    options: normalizeOptions(row.options),
    votes,
    status: row.status,
    resolutionPolicy: row.resolution_policy,
    resolvedChoiceId: row.resolved_choice_id ?? undefined,
    expiresAt: toMs(row.expires_at),
    createdAt: Date.parse(row.created_at),
  };
}

async function fetchVotesByChoiceId(choiceId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('party_votes')
    .select('choice_id,player_id,character_name,selected_option_id,voted_at')
    .eq('choice_id', choiceId)
    .order('voted_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapVoteRow(row as PartyVoteRow));
}

async function fetchLatestChoice(sessionId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('party_choices')
    .select('id,session_id,source_message_id,prompt,options,resolution_policy,resolved_choice_id,status,expires_at,created_at')
    .eq('session_id', sessionId)
    .in('status', ['pending', 'voting'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as PartyChoiceRow | null) ?? null;
}

export async function createPartyChoiceInDb(choice: PartyChoice): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('party_choices').insert({
    id: choice.id,
    session_id: choice.sessionId,
    source_message_id: choice.sourceMessageId,
    prompt: choice.prompt,
    options: choice.options,
    resolution_policy: choice.resolutionPolicy,
    resolved_choice_id: choice.resolvedChoiceId ?? null,
    status: choice.status,
    expires_at: choice.expiresAt ? new Date(choice.expiresAt).toISOString() : null,
    created_at: new Date(choice.createdAt).toISOString(),
  });
  if (error) throw error;
}

export async function castVoteInDb(
  sessionId: string,
  choiceId: string,
  playerId: string,
  characterName: string,
  selectedOptionId: string,
): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('party_votes').insert({
    choice_id: choiceId,
    session_id: sessionId,
    player_id: playerId,
    character_name: characterName,
    selected_option_id: selectedOptionId,
    voted_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function resolvePartyChoiceInDb(
  choiceId: string,
  selectedOptionId: string,
  status: Extract<PartyChoice['status'], 'resolved' | 'expired'> = 'resolved',
): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('party_choices')
    .update({
      resolved_choice_id: selectedOptionId,
      status,
    })
    .eq('id', choiceId);

  if (error) throw error;
}

export async function getActivePartyChoice(sessionId: string): Promise<PartyChoice | null> {
  const choiceRow = await fetchLatestChoice(sessionId);
  if (!choiceRow) return null;
  const votes = await fetchVotesByChoiceId(choiceRow.id);
  return mapChoiceRow(choiceRow, votes);
}

export async function getPartyChoiceState(sessionId: string): Promise<PartyChoiceState> {
  const client = requireClient();
  const { data, error } = await client
    .from('party_choices')
    .select('id,session_id,source_message_id,prompt,options,resolution_policy,resolved_choice_id,status,expires_at,created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as PartyChoiceRow[];
  const unresolved = rows.find((row) => row.status === 'pending' || row.status === 'voting') ?? null;
  const resolvedRows = rows.filter((row) => row.status === 'resolved' || row.status === 'expired');

  const activeChoice = unresolved
    ? mapChoiceRow(unresolved, await fetchVotesByChoiceId(unresolved.id))
    : null;

  const history: PartyChoice[] = [];
  for (const row of resolvedRows) {
    const votes = await fetchVotesByChoiceId(row.id);
    history.push(mapChoiceRow(row, votes));
  }

  return { activeChoice, history };
}

export function subscribeToPartyChoice(
  sessionId: string,
  onUpdate: (choice: PartyChoice) => void,
): RealtimeChannel {
  const client = requireClient();

  const refresh = async () => {
    const choice = await getActivePartyChoice(sessionId);
    if (choice) onUpdate(choice);
  };

  const channel = client
    .channel(`party-choice:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'party_choices',
        filter: `session_id=eq.${sessionId}`,
      },
      () => {
        void refresh();
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'party_votes',
        filter: `session_id=eq.${sessionId}`,
      },
      () => {
        void refresh();
      },
    )
    .subscribe();

  void refresh();
  return channel;
}
