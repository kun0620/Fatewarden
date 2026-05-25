import type { RealtimeChannel } from '@supabase/supabase-js';
import { normalizeGamePhase } from './gamePhases';
import { useGameStore } from '../store/useGameStore';
import type {
  AiChoice,
  AiChoiceIntent,
  AiConfirmAction,
  AiConfirmActionType,
  AiDmPresetId,
  AiDmRequestMode,
  AiSuggestedRoll,
  Character,
  EncounterState,
  GamePhase,
  GameSession,
  Item,
  SceneFlow,
  StoryMessage,
} from '../types';
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
  aiMode?: 'adventure' | 'debug';
  latestScene?: SceneFlow | null;
  partySummary?: string;
  dmPresetId?: AiDmPresetId;
  requestMode?: AiDmRequestMode;
  sessionRecap?: string;
};

const AI_CONTEXT_CHAR_BUDGET = 12_000;

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

function estimateMessageSize(message: StoryMessage) {
  return (
    message.author.length +
    message.body.length +
    message.speaker.length +
    JSON.stringify(message.metadata ?? {}).length +
    24
  );
}

function buildAiContext(messages: StoryMessage[], budget = AI_CONTEXT_CHAR_BUDGET) {
  if (!messages.length) return [];

  const anchors: StoryMessage[] = [];
  const latestSceneOpening = [...messages]
    .reverse()
    .find((message) => (message.metadata?.kind as string | undefined) === 'scene_opening');
  const latestSceneObjective = [...messages]
    .reverse()
    .find((message) => (message.metadata?.kind as string | undefined) === 'scene_objective');

  if (latestSceneOpening) anchors.push(latestSceneOpening);
  if (latestSceneObjective && latestSceneObjective.id !== latestSceneOpening?.id) anchors.push(latestSceneObjective);

  const selectedById = new Set(anchors.map((message) => message.id));
  let total = anchors.reduce((sum, message) => sum + estimateMessageSize(message), 0);

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (selectedById.has(message.id)) continue;

    const nextSize = estimateMessageSize(message);
    if (total + nextSize > budget) continue;

    selectedById.add(message.id);
    total += nextSize;
  }

  return messages.filter((message) => selectedById.has(message.id));
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

export async function updateSessionMessageMetadata(messageId: string, metadata: Record<string, unknown>) {
  const client = requireClient();
  const { data, error } = await client
    .from('chat_messages')
    .update({ metadata })
    .eq('id', messageId)
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
        event: '*',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') return;
        onMessage(mapMessage(payload.new as MessageRow));
      },
    )
    .subscribe();
}

const confirmActionTypes = new Set<AiConfirmActionType>([
  'damage',
  'healing',
  'add_condition',
  'remove_condition',
  'phase_change',
  'start_combat',
  'next_turn',
  'previous_turn',
  'add_item',
  'remove_item',
  'use_resource',
  'complete_objective',
  'advance_threat_clock',
]);

function normalizeConfirmActions(events: unknown): AiConfirmAction[] {
  if (!Array.isArray(events)) return [];

  const actions: AiConfirmAction[] = [];
  events.forEach((event, index) => {
    if (!event || typeof event !== 'object') return;
    const item = event as Record<string, unknown>;
    const type = typeof item.type === 'string' ? item.type : typeof item.action === 'string' ? item.action : '';
    if (!confirmActionTypes.has(type as AiConfirmActionType)) return;

    const targetName = typeof item.targetName === 'string' ? item.targetName : typeof item.target === 'string' ? item.target : undefined;
    const rawItem = item.item && typeof item.item === 'object' ? (item.item as Partial<Item>) : undefined;
    const label =
      typeof item.label === 'string'
        ? item.label
        : typeof item.note === 'string'
          ? item.note
          : type.replaceAll('_', ' ');

    actions.push({
        id: typeof item.id === 'string' ? item.id : `ai-action-${Date.now()}-${index}`,
        type: type as AiConfirmActionType,
        label,
        targetId: typeof item.targetId === 'string' ? item.targetId : undefined,
        targetName,
        amount: typeof item.amount === 'number' ? item.amount : undefined,
        condition: typeof item.condition === 'string' ? item.condition : undefined,
        phase: item.phase ? normalizeGamePhase(item.phase) : undefined,
        encounterName:
          typeof item.encounterName === 'string'
            ? item.encounterName
            : typeof item.encounter_name === 'string'
              ? item.encounter_name
              : undefined,
        itemId: pickString(item, ['itemId', 'item_id']),
        itemName: pickString(item, ['itemName', 'item_name']),
        item: rawItem,
        resourceId: pickString(item, ['resourceId', 'resource_id']),
        objectiveId: pickString(item, ['objectiveId', 'objective_id']),
        clockId: pickString(item, ['clockId', 'clock_id']),
        note: typeof item.note === 'string' ? item.note : undefined,
      });
  });

  return actions;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        if (typeof record.label === 'string') return record.label.trim();
        if (typeof record.action === 'string') return record.action.trim();
        if (typeof record.title === 'string') return record.title.trim();
      }
      return '';
    })
    .filter(Boolean)
    .slice(0, 6);
}

const choiceIntents = new Set<AiChoiceIntent>([
  'aggressive',
  'defensive',
  'investigate',
  'social',
  'support',
  'utility',
  'risky',
  'talk',
  'travel',
  'roll',
  'combat',
  'rest',
  'custom',
]);

function makeChoiceFallbacks(scene: SceneFlow | null): Array<Omit<AiChoice, 'number'>> {
  const location = scene?.location || scene?.title || '';
  const objective = scene?.objective || scene?.hook || '';
  const threat = scene?.threat || '';
  const choices: Array<Omit<AiChoice, 'number'>> = [];

  if (location) {
    choices.push({
      label: `ตรวจสอบ ${location}`,
      prompt: `ฉันตรวจสอบ ${location} เพื่อหาร่องรอย รายละเอียดผิดปกติ หรือทางลับที่เกี่ยวข้องกับสถานการณ์นี้`,
      intent: 'investigate',
    });
  }

  if (threat) {
    choices.push({
      label: `รับมือ ${threat}`,
      prompt: `ฉันโฟกัสกับ ${threat} และพยายามหาวิธีลดความเสี่ยงก่อนเดินหน้าต่อ`,
      intent: 'defensive',
    });
  }

  if (objective) {
    choices.push({
      label: `มุ่งสู่ ${objective}`,
      prompt: `ฉันเดินหน้าทำ ${objective} โดยเลือกวิธีที่ปลอดภัยที่สุดเท่าที่ทำได้`,
      intent: 'travel',
    });
  }

  return choices.slice(0, 3);
}

function isGenericChoice(choice: AiChoice) {
  const label = choice.label.toLowerCase().trim();
  const prompt = choice.prompt.toLowerCase().trim();
  const genericLabels = [
    'ตรวจสอบ',
    'พูดคุย',
    'เดินต่อ',
    'โจมตี',
    'ป้องกัน',
    'ใช้สกิล',
    'ใช้ item',
    'ถอย',
    'รอ',
    'ทำต่อ',
    'สำรวจ',
  ];

  return genericLabels.some((generic) => label === generic || prompt === generic);
}

function normalizeChoiceIntent(value: unknown): AiChoiceIntent {
  return typeof value === 'string' && choiceIntents.has(value as AiChoiceIntent)
    ? (value as AiChoiceIntent)
    : 'custom';
}

function normalizeAiChoices(value: unknown, nextActions: unknown, scene: SceneFlow | null): AiChoice[] {
  const rawChoices = Array.isArray(value) && value.length ? value : nextActions;
  const choices = Array.isArray(rawChoices)
    ? rawChoices
        .map((item, index): AiChoice | null => {
          if (typeof item === 'string') {
            const label = item.trim();
            return label
              ? {
                  number: index + 1,
                  label,
                  prompt: label,
                  intent: 'custom',
                }
              : null;
          }

          if (!item || typeof item !== 'object') return null;
          const record = item as Record<string, unknown>;
          const label = pickString(record, ['label', 'title', 'action']);
          const prompt = pickString(record, ['prompt', 'body', 'message', 'action']) || label;
          if (!label && !prompt) return null;

          return {
            number: typeof record.number === 'number' ? record.number : index + 1,
            label: label || prompt,
            prompt,
            intent: normalizeChoiceIntent(record.intent),
            suggestedRoll: normalizeSuggestedRoll(record.suggested_roll ?? record.suggestedRoll) ?? undefined,
          };
        })
        .filter((choice): choice is AiChoice => Boolean(choice))
        .filter((choice) => !isGenericChoice(choice))
    : [];

  if (!choices.length) {
    choices.push(...makeChoiceFallbacks(scene).map((template, index) => ({ ...template, number: index + 1 })));
  }

  return choices.slice(0, 6).map((choice, index) => ({
    ...choice,
    number: index + 1,
    label: choice.label.trim(),
    prompt: choice.prompt.trim(),
  }));
}

function normalizeScene(scene: unknown, nextActions: unknown): SceneFlow | null {
  const actions = normalizeStringList(nextActions);
  if (!scene || typeof scene !== 'object') {
    return actions.length ? { nextActions: actions } : null;
  }

  const record = scene as Record<string, unknown>;
  const normalized: SceneFlow = {
    title: typeof record.title === 'string' ? record.title : undefined,
    location: typeof record.location === 'string' ? record.location : undefined,
    objective: typeof record.objective === 'string' ? record.objective : undefined,
    threat: typeof record.threat === 'string' ? record.threat : undefined,
    hook: typeof record.hook === 'string' ? record.hook : undefined,
    nextActions: actions.length ? actions : normalizeStringList(record.next_actions ?? record.nextActions),
  };

  return Object.values(normalized).some((value) => (Array.isArray(value) ? value.length : Boolean(value)))
    ? normalized
    : null;
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return '';
}

function normalizeNarration(value: unknown) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (!value || typeof value !== 'object') return '';

  const record = value as Record<string, unknown>;
  return [
    pickString(record, ['scene', 'text', 'body', 'message']),
    pickString(record, ['atmosphere', 'mood']),
    pickString(record, ['focus', 'detail']),
    pickString(record, ['consequence']),
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

function normalizeSuggestedRoll(value: unknown): AiSuggestedRoll | string | null {
  if (!value) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const type = typeof record.type === 'string' ? record.type.toLowerCase() : '';
  const ability = typeof record.ability === 'string' ? record.ability.toLowerCase() : '';
  const mode = typeof record.mode === 'string' ? record.mode.toLowerCase() : '';
  const dc = typeof record.dc === 'number' ? record.dc : typeof record.DC === 'number' ? record.DC : undefined;
  const normalized: AiSuggestedRoll = {
    required: typeof record.required === 'boolean' ? record.required : true,
    type: ['ability', 'skill', 'save', 'initiative', 'attack', 'custom'].includes(type)
      ? (type as AiSuggestedRoll['type'])
      : undefined,
    ability: ['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(ability)
      ? (ability as AiSuggestedRoll['ability'])
      : undefined,
    skill: pickString(record, ['skill']),
    dc,
    reason: pickString(record, ['reason']),
    mode: ['normal', 'advantage', 'disadvantage'].includes(mode)
      ? (mode as AiSuggestedRoll['mode'])
      : undefined,
    label: pickString(record, ['label']),
  };

  return normalized.required || normalized.type || normalized.ability || normalized.skill || normalized.dc || normalized.reason
    ? normalized
    : null;
}

function sceneFallbackBody(scene: SceneFlow | null) {
  if (!scene) return '';

  return [
    scene.title ? `ฉาก: ${scene.title}` : '',
    scene.location ? `สถานที่: ${scene.location}` : '',
    scene.objective ? `เป้าหมาย: ${scene.objective}` : '',
    scene.threat ? `ภัยคุกคาม: ${scene.threat}` : '',
    scene.hook ? `จุดเกี่ยว: ${scene.hook}` : '',
    scene.nextActions?.length ? `ทางเลือก: ${scene.nextActions.join(' / ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function cleanJsonStringFragment(value: string) {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/[",}\]\s]*$/g, '')
    .trim();
}

function extractJsonStringFragment(text: string, key: string) {
  const keyPattern = new RegExp(`"${key}"\\s*:\\s*"`, 'i');
  const startMatch = keyPattern.exec(text);
  if (!startMatch) return '';

  const start = startMatch.index + startMatch[0].length;
  const rest = text.slice(start);
  const nextKeyMatch = /"\s*,\s*"(suggested_roll|suggestedRoll|scene|choices|next_actions|nextActions|events|table_notes|tableNotes)"\s*:/i.exec(rest);
  const rawValue = nextKeyMatch ? rest.slice(0, nextKeyMatch.index) : rest;

  return cleanJsonStringFragment(rawValue);
}

function stripJsonCodeFence(text: string) {
  const trimmed = text.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return match ? match[1].trim() : trimmed;
}

function extractLooseJsonStrings(text: string) {
  const keys = [
    'narration',
    'body',
    'message',
    'text',
    'scene',
    'description',
    'objective',
    'hook',
    'threat',
    'atmosphere',
    'mood',
    'focus',
    'detail',
    'consequence',
    'table_notes',
    'tableNotes',
  ];
  const values: string[] = [];
  const seen = new Set<string>();
  const pattern = new RegExp(`"(${keys.join('|')})"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)`, 'gi');
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const value = cleanJsonStringFragment(match[2]);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    values.push(value);
  }

  return values;
}

function extractMalformedJsonReply(text: string) {
  const cleaned = stripJsonCodeFence(text);
  if (!cleaned.trim().startsWith('{')) return null;

  const narration =
    extractJsonStringFragment(cleaned, 'narration') ||
    extractJsonStringFragment(cleaned, 'body') ||
    extractJsonStringFragment(cleaned, 'message');
  const suggestedRoll =
    extractJsonStringFragment(cleaned, 'suggested_roll') ||
    extractJsonStringFragment(cleaned, 'suggestedRoll');
  const tableNotes =
    extractJsonStringFragment(cleaned, 'table_notes') ||
    extractJsonStringFragment(cleaned, 'tableNotes');
  const looseBody = extractLooseJsonStrings(cleaned).slice(0, 5).join('\n\n');
  const body = [narration, suggestedRoll, tableNotes].filter(Boolean).join('\n\n') || looseBody;

  if (!body) {
    return {
      body: 'The Dungeon Master steadies the scene and waits for your next action.',
      confirmActions: [],
      choices: normalizeAiChoices([], [], null),
      scene: null,
      suggestedRoll: null,
      partyMode: false,
    };
  }

  return {
    body,
    confirmActions: [],
    choices: normalizeAiChoices([], [], null),
    scene: null,
    suggestedRoll: suggestedRoll || null,
    partyMode: false,
  };
}

async function getInvokeErrorMessage(error: unknown) {
  const fallback = error instanceof Error ? error.message : 'AI DM request failed.';
  if (!error || typeof error !== 'object') return fallback;

  const context = (error as { context?: unknown }).context;
  if (!context || typeof context !== 'object' || !('json' in context)) return fallback;

  try {
    const payload = await (context as Response).json();
    if (payload && typeof payload === 'object') {
      const message = (payload as { error?: unknown; message?: unknown }).error ?? (payload as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message.trim();
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function extractDmReply(data: unknown) {
  const replyObject = (data as { reply?: unknown } | null)?.reply;
  if (replyObject && typeof replyObject === 'object') {
    const parsed = replyObject as Record<string, unknown>;
    const narration = normalizeNarration(parsed.narration) || pickString(parsed, ['body', 'message']);
    const suggestedRoll = normalizeSuggestedRoll(parsed.suggested_roll ?? parsed.suggestedRoll);
    const tableNotes = pickString(parsed, ['table_notes', 'tableNotes']);
    const nextActions = parsed.next_actions ?? parsed.nextActions;
    const scene = normalizeScene(parsed.scene, nextActions);
    const choices = normalizeAiChoices(parsed.choices, nextActions, scene);
    const body = [narration, typeof suggestedRoll === 'string' ? suggestedRoll : '', tableNotes]
      .filter(Boolean)
      .join('\n\n') || sceneFallbackBody(scene);

    return {
      body: body || 'ผู้คุมเกมพยักหน้าและรอการกระทำถัดไปของปาร์ตี้',
      choices,
      confirmActions: normalizeConfirmActions(parsed.events),
      scene,
      suggestedRoll,
      partyMode: parsed.partyMode === true || parsed.party_mode === true,
    };
  }

  const content = (data as { content?: Array<{ text?: string }> } | null)?.content;
  const text = content?.map((item) => item.text).filter(Boolean).join('\n').trim();
  if (!text) {
    return {
      body: 'ผู้คุมเกมเฝ้ามองโต๊ะและรอการกระทำถัดไป',
      choices: normalizeAiChoices([], [], null),
      confirmActions: [],
      scene: null,
      suggestedRoll: null,
      partyMode: false,
    };
  }

  try {
    const parsed = JSON.parse(stripJsonCodeFence(text)) as Record<string, unknown>;
    const narration = normalizeNarration(parsed.narration) || pickString(parsed, ['body', 'message']);
    const suggestedRoll = normalizeSuggestedRoll(parsed.suggested_roll ?? parsed.suggestedRoll);
    const tableNotes = pickString(parsed, ['table_notes', 'tableNotes']);
    const nextActions = parsed.next_actions ?? parsed.nextActions;
    const scene = normalizeScene(parsed.scene, nextActions);
    const choices = normalizeAiChoices(parsed.choices, nextActions, scene);
    const body = [narration, typeof suggestedRoll === 'string' ? suggestedRoll : '', tableNotes]
      .filter(Boolean)
      .join('\n\n') || sceneFallbackBody(scene);

    return {
      body: body || 'ผู้คุมเกมพยักหน้าและรอการกระทำถัดไปของปาร์ตี้',
      choices,
      confirmActions: normalizeConfirmActions(parsed.events),
      scene,
      suggestedRoll,
      partyMode: parsed.partyMode === true || parsed.party_mode === true,
    };
  } catch {
    const malformedReply = extractMalformedJsonReply(text);
    if (malformedReply) return malformedReply;

    return {
      body: stripJsonCodeFence(text).trim().startsWith('{')
        ? 'The Dungeon Master steadies the scene and waits for your next action.'
        : text,
      choices: normalizeAiChoices([], [], null),
      confirmActions: [],
      scene: null,
      suggestedRoll: null,
      partyMode: false,
    };
  }
}

function summarizeInventory(character: Character | null | undefined) {
  const inventory = character?.inventory;
  if (!inventory) {
    return {
      equippedItems: [],
      carriedItems: [],
      carryWeight: { current: 0, max: 0 },
      currency: null,
    };
  }

  const currentWeight = inventory.items.reduce((sum, item) => sum + item.weight * item.quantity, 0);
  return {
    equippedItems: inventory.items
      .filter((item) => item.equipped)
      .map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        attuned: item.attuned,
        weapon: item.weapon
          ? {
              damageDice: item.weapon.damageDice,
              damageType: item.weapon.damageType,
              properties: item.weapon.properties,
            }
          : null,
        armor: item.armor
          ? {
              type: item.armor.type,
              baseAC: item.armor.baseAC,
            }
          : null,
      }))
      .slice(0, 12),
    carriedItems: inventory.items
      .filter((item) => !item.equipped)
      .map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        rarity: item.rarity,
      }))
      .slice(0, 24),
    carryWeight: {
      current: currentWeight,
      max: inventory.maxCarryWeight,
    },
    currency: inventory.currency,
  };
}

function summarizeCharacter(character: Character | null | undefined) {
  if (!character) return null;
  return {
    id: character.id,
    name: character.name,
    ancestry: character.ancestry,
    className: character.className,
    level: character.level,
    armorClass: character.armorClass,
    hitPoints: character.hitPoints,
    maxHitPoints: character.maxHitPoints,
    conditions: character.activeConditions,
    abilities: character.abilities,
    skills: character.skills,
    spellSlots: character.spellSlots,
    resources: character.systemData.classRuntime?.resources ?? [],
    hexHeroBuild: character.systemData.hexplore ?? null,
  };
}

function summarizeCombat(encounter: EncounterState | null | undefined) {
  if (!encounter) return null;
  return {
    id: encounter.id,
    name: encounter.name,
    round: encounter.round,
    activeIndex: encounter.activeIndex,
    activeCombatantId: encounter.combatants[encounter.activeIndex]?.id ?? null,
    isActive: encounter.isActive,
    combatants: encounter.combatants.map((combatant) => ({
      id: combatant.id,
      name: combatant.name,
      type: combatant.type,
      armorClass: combatant.armorClass,
      hitPoints: combatant.hitPoints,
      maxHitPoints: combatant.maxHitPoints,
      tempHitPoints: combatant.tempHitPoints,
      initiative: combatant.initiative,
      conditions: combatant.conditions,
      status: combatant.status,
    })),
  };
}

function buildStructuredAiContext(
  fallbackCharacter: Character | null | undefined,
  fallbackEncounter: EncounterState | null | undefined,
  aiContextMessages: StoryMessage[],
) {
  const store = useGameStore.getState();
  const character = store.activeCharacter ?? fallbackCharacter ?? null;
  const scene = store.sceneState;
  const combat = store.combatState ?? fallbackEncounter ?? null;
  const location = scene?.location.toLowerCase() ?? '';

  const relationships = store.relationshipState.records
    .filter((record) => !location || record.npcName.toLowerCase().includes(location) || record.npcRole?.toLowerCase().includes(location))
    .slice(0, 12)
    .map((record) => ({
      npcId: record.npcId,
      npcName: record.npcName,
      npcRole: record.npcRole,
      affinity: record.affinity,
      tier: record.tier,
      latestHistory: record.history.slice(-3),
    }));

  return {
    scene: scene
      ? {
          id: scene.id,
          mode: scene.mode,
          location: scene.location,
          description: scene.description,
          danger: scene.flags.dangerLevel,
          realityStability: scene.flags.realityStability,
          flags: scene.flags,
          objectives: scene.objectives,
          threatClocks: scene.threatClocks,
          turnNumber: scene.turnNumber,
        }
      : null,
    character: summarizeCharacter(character),
    inventory: summarizeInventory(character),
    combat: summarizeCombat(combat),
    companions: store.companionState.companions
      .filter((companion) => companion.isActive)
      .map((companion) => ({
        id: companion.id,
        name: companion.name,
        type: companion.type,
        behavior: companion.behavior,
        controlMode: companion.controlMode,
        loyalty: companion.loyalty,
        hp: companion.characterSnapshot.hitPoints,
        maxHp: companion.characterSnapshot.maxHitPoints,
        armorClass: companion.characterSnapshot.armorClass,
        conditions: companion.characterSnapshot.conditions,
        resources: companion.resources,
      })),
    relationships,
    recentJournalEntries: store.journalState.entries
      .slice()
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, 5)
      .map((entry) => ({
        id: entry.id,
        type: entry.type,
        title: entry.title,
        content: entry.content,
        tags: entry.tags,
        createdAt: entry.createdAt,
      })),
    recentMetadata: aiContextMessages.map((item) => item.metadata).filter(Boolean),
  };
}
