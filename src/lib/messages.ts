import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Character, EncounterState, GamePhase, GameSession, StoryMessage } from '../types';
import { supabase } from './supabase';

type MessageRow = {
  id: string;
  speaker: StoryMessage['speaker'];
  author: string;
  body: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};

type AiRulesContext = {
  session?: GameSession;
  gamePhase?: GamePhase;
  character?: Character;
  encounter?: EncounterState | null;
};

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function mapMessage(row: MessageRow): StoryMessage {
  return {
    id: row.id,
    speaker: row.speaker,
    author: row.author,
    body: row.body,
    createdAt: formatTime(row.created_at),
    metadata: row.metadata ?? {},
  };
}

export async function loadSessionMessages(sessionId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('chat_messages')
    .select('id,speaker,author,body,metadata,created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => mapMessage(row as MessageRow));
}

export async function sendSessionMessage(
  sessionId: string,
  speaker: StoryMessage['speaker'],
  author: string,
  body: string,
  metadata: Record<string, unknown> = {},
) {
  const client = requireClient();
  const { data, error } = await client
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      speaker,
      author,
      body,
      metadata,
    })
    .select('id,speaker,author,body,metadata,created_at')
    .single();

  if (error) throw error;

  return mapMessage(data as MessageRow);
}

export function subscribeToSessionMessages(
  sessionId: string,
  onMessage: (message: StoryMessage) => void,
): RealtimeChannel {
  const client = requireClient();
  return client
    .channel(`session-messages:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => onMessage(mapMessage(payload.new as MessageRow)),
    )
    .subscribe();
}

function extractDmText(data: unknown) {
  const content = (data as { content?: Array<{ text?: string }> } | null)?.content;
  const text = content?.map((item) => item.text).filter(Boolean).join('\n').trim();
  if (!text) return 'The Dungeon Master watches the table and waits for the next action.';

  try {
    const parsed = JSON.parse(text) as {
      narration?: string;
      suggested_roll?: string | null;
      table_notes?: string | null;
    };
    return [parsed.narration, parsed.suggested_roll, parsed.table_notes].filter(Boolean).join('\n\n');
  } catch {
    return text;
  }
}

export async function requestAiDmReply(
  sessionId: string,
  characterName: string,
  message: string,
  recentMessages: StoryMessage[],
  rulesContext?: AiRulesContext,
) {
  const client = requireClient();
  const { data, error } = await client.functions.invoke('ai-dm', {
    body: {
      sessionId,
      characterName,
      message,
      recentMessages: recentMessages.slice(-8).map((item) => ({
        author: item.author,
        body: item.body,
        metadata: item.metadata ?? {},
        speaker: item.speaker,
      })),
      rulesContext: rulesContext
        ? {
            gamePhase: rulesContext.gamePhase ?? rulesContext.session?.phase,
            rules: rulesContext.session?.rules,
            character: rulesContext.character
              ? {
                  name: rulesContext.character.name,
                  ancestry: rulesContext.character.ancestry,
                  className: rulesContext.character.className,
                  level: rulesContext.character.level,
                  armorClass: rulesContext.character.armorClass,
                  hitPoints: rulesContext.character.hitPoints,
                  maxHitPoints: rulesContext.character.maxHitPoints,
                  abilities: rulesContext.character.abilities,
                  skills: rulesContext.character.skills,
                }
              : null,
            encounter: rulesContext.encounter,
            recentMetadata: recentMessages
              .slice(-8)
              .map((item) => item.metadata)
              .filter(Boolean),
          }
        : undefined,
    },
  });

  if (error) throw error;

  return sendSessionMessage(sessionId, 'dm', 'Dungeon Master', extractDmText(data));
}
