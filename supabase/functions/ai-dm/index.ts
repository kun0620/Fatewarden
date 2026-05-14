type RequestBody = {
  sessionId: string;
  characterName: string;
  message: string;
  sceneContext?: unknown;
  recentMessages?: Array<{ author: string; body: string; speaker: string; metadata?: unknown }>;
  rulesContext?: unknown;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: unknown;
};

type SuggestedRoll =
  | string
  | {
      required: boolean;
      type?: string;
      ability?: string;
      skill?: string;
      dc?: number;
      reason?: string;
      mode?: string;
      label?: string;
    }
  | null;

type DmReply = {
  narration: string;
  suggested_roll: SuggestedRoll;
  scene: Record<string, unknown> | null;
  partyMode?: boolean;
  choices: Array<{
    number: number;
    label: string;
    prompt: string;
    intent: string;
    suggested_roll?: SuggestedRoll;
  }>;
  next_actions: string[];
  events: unknown[];
  table_notes: string | null;
};

const GEMINI_TIMEOUT_MS = 35_000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: corsHeaders });
}

async function parseRequestBody(request: Request) {
  try {
    return (await request.json()) as RequestBody;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
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

function normalizeSuggestedRoll(value: unknown): SuggestedRoll {
  if (!value) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const dc = typeof record.dc === 'number' ? record.dc : typeof record.DC === 'number' ? record.DC : undefined;
  const normalized = {
    required: typeof record.required === 'boolean' ? record.required : true,
    type: pickString(record, ['type']) || undefined,
    ability: pickString(record, ['ability']) || undefined,
    skill: pickString(record, ['skill']) || undefined,
    dc,
    reason: pickString(record, ['reason']) || undefined,
    mode: pickString(record, ['mode']) || undefined,
    label: pickString(record, ['label']) || undefined,
  };

  return normalized.required || normalized.type || normalized.ability || normalized.skill || normalized.dc || normalized.reason
    ? normalized
    : null;
}

function normalizeStringList(value: unknown) {
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

function makeChoiceFallbacks(scene: Record<string, string> | null) {
  const location = scene?.location || scene?.title || '';
  const objective = scene?.objective || scene?.hook || '';
  const threat = scene?.threat || '';
  const choices: Array<{ label: string; prompt: string; intent: string }> = [];

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

function isGenericChoice(choice: { label: string; prompt: string }) {
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

function normalizeChoices(value: unknown, nextActions: unknown, scene: Record<string, string> | null): DmReply['choices'] {
  const rawChoices = Array.isArray(value) && value.length ? value : nextActions;
  const choices = Array.isArray(rawChoices)
    ? rawChoices
        .map((item, index) => {
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
            intent: pickString(record, ['intent']) || 'custom',
            suggested_roll: normalizeSuggestedRoll(record.suggested_roll ?? record.suggestedRoll) ?? undefined,
          };
        })
        .filter((choice): choice is DmReply['choices'][number] => Boolean(choice) && !isGenericChoice(choice)) as DmReply['choices']
    : [];

  if (!choices.length) {
    choices.push(...makeChoiceFallbacks(scene).map((choice, index) => ({ ...choice, number: index + 1 })));
  }

  return choices.slice(0, 6).map((choice, index) => ({
    ...choice,
    number: index + 1,
  }));
}

function normalizeScene(value: unknown) {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const scene = {
    title: typeof record.title === 'string' ? record.title.trim() : '',
    location: typeof record.location === 'string' ? record.location.trim() : '',
    objective: typeof record.objective === 'string' ? record.objective.trim() : '',
    threat: typeof record.threat === 'string' ? record.threat.trim() : '',
    hook: typeof record.hook === 'string' ? record.hook.trim() : '',
  };

  return Object.values(scene).some(Boolean) ? scene : null;
}

function normalizeDmReply(text: string): DmReply {
  const fallback: DmReply = {
    narration: 'AI DM ตอบกลับมาเป็นข้อมูลที่ไม่สมบูรณ์ ลองกด Try again อีกครั้ง',
    suggested_roll: null,
    scene: null,
    choices: normalizeChoices([], [], null),
    next_actions: [],
    events: [],
    table_notes: null,
  };

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const scene = normalizeScene(parsed.scene);
    const nextActions = normalizeStringList(parsed.next_actions ?? parsed.nextActions);
    const choices = normalizeChoices(parsed.choices, parsed.next_actions ?? parsed.nextActions, scene);
    const narration = normalizeNarration(parsed.narration) || pickString(parsed, ['body', 'message']);
    const suggestedRoll = normalizeSuggestedRoll(parsed.suggested_roll ?? parsed.suggestedRoll);

    return {
      narration:
        narration ||
        (scene
          ? [scene.title, scene.location, scene.objective].filter(Boolean).join(' - ')
          : fallback.narration),
      suggested_roll: suggestedRoll,
      scene,
      choices,
      next_actions: nextActions,
      events: Array.isArray(parsed.events) ? parsed.events : [],
      table_notes: pickString(parsed, ['table_notes', 'tableNotes']) || null,
    };
  } catch {
    const narration =
      extractJsonStringFragment(text, 'narration') ||
      extractJsonStringFragment(text, 'body') ||
      extractJsonStringFragment(text, 'message');
    const suggestedRoll =
      extractJsonStringFragment(text, 'suggested_roll') ||
      extractJsonStringFragment(text, 'suggestedRoll');
    const tableNotes =
      extractJsonStringFragment(text, 'table_notes') ||
      extractJsonStringFragment(text, 'tableNotes');

    return {
      ...fallback,
      narration: narration || fallback.narration,
      suggested_roll: suggestedRoll || null,
      choices: normalizeChoices([], [], null),
      table_notes: tableNotes || null,
    };
  }
}

function formatSceneContextBlock(sceneContext: unknown) {
  if (!sceneContext || typeof sceneContext !== 'object') {
    return '## Current Scene\n- Mode: unknown\n- Location: unknown\n- Danger: unknown\n- Reality: unknown\n- Active objectives: none\n- Threat clocks: none';
  }

  const record = sceneContext as Record<string, unknown>;
  const mode = pickString(record, ['mode']) || 'unknown';
  const location = pickString(record, ['location']) || 'unknown';
  const dangerLevel = pickString(record, ['dangerLevel']) || 'unknown';
  const realityStability = pickString(record, ['realityStability']) || 'unknown';

  const activeObjectives = Array.isArray(record.activeObjectives)
    ? record.activeObjectives
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    : [];

  const threatClocks = Array.isArray(record.activeThreatClocks)
    ? record.activeThreatClocks
        .map((item) => {
          if (!item || typeof item !== 'object') return '';
          const clock = item as Record<string, unknown>;
          const name = pickString(clock, ['name']);
          const current = typeof clock.current === 'number' ? clock.current : null;
          const max = typeof clock.max === 'number' ? clock.max : null;
          if (!name || current === null || max === null) return '';
          return `${name} ${current}/${max}`;
        })
        .filter(Boolean)
    : [];

  return `## Current Scene
- Mode: ${mode}
- Location: ${location}
- Danger: ${dangerLevel}
- Reality: ${realityStability}
- Active objectives: ${activeObjectives.length ? activeObjectives.join(', ') : 'none'}
- Threat clocks: ${threatClocks.length ? threatClocks.join(', ') : 'none'}`;
}

function inferPartyModeFromSceneContext(sceneContext: unknown) {
  if (!sceneContext || typeof sceneContext !== 'object') return false;
  const record = sceneContext as Record<string, unknown>;
  const dangerLevel = pickString(record, ['dangerLevel']).toLowerCase();
  const highDanger = dangerLevel === 'high' || dangerLevel === 'extreme';
  const activeThreatClocks = Array.isArray(record.activeThreatClocks) && record.activeThreatClocks.length > 0;
  return highDanger || activeThreatClocks;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('GOOGLE_API_KEY');
  if (!apiKey) {
    return errorResponse('GOOGLE_API_KEY is not configured for the AI DM function.', 500);
  }
  const model = Deno.env.get('GOOGLE_MODEL') ?? 'gemini-2.0-flash';

  const body = await parseRequestBody(request);
  if (!body) {
    return errorResponse('Invalid JSON request body.', 400);
  }

  if (!body.sessionId || !body.characterName || !body.message) {
    return errorResponse('sessionId, characterName, and message are required.', 400);
  }

  const recent = body.recentMessages
    ?.map((message) => `${message.speaker.toUpperCase()} ${message.author}: ${message.body}`)
    .join('\n');
  const rulesContext = body.rulesContext
    ? JSON.stringify(body.rulesContext, null, 2)
    : 'No structured rules context provided.';
  const sceneContextBlock = formatSceneContextBlock(body.sceneContext);

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text:
                  'You are Fatewarden, a cinematic AI Dungeon Master for DnD. Always reply in Thai. Style: dark fantasy, cosmic horror, mystery, emotional pressure, dangerous but fair. The world must feel alive: use environment, sound, temperature, silence, and unnatural details to imply danger. Be serious and concise, never comedic unless explicitly requested. Reply as strict JSON only, no markdown, using keys narration, scene, suggested_roll, choices, next_actions, events, table_notes, and optional partyMode. narration may be a string or an object with scene, atmosphere, focus, and consequence. Keep action results 1-3 short Thai paragraphs and combat results 1-3 short paragraphs. scene should include title, location, objective, threat, hook, atmosphere, and tactical_context when useful. choices must be generated from the exact current situation only. Choose the number naturally: 2 choices for a tight binary moment, 3-4 for normal exploration/social scenes, 4-6 only when the scene truly has many tactical options. Do not mechanically cover categories. Do not always use the same count. Do not use generic choices. Each choice label must name a concrete target from the current scene, such as a specific NPC, clue, door, sound, monster, ritual mark, path, object, threat, or party member. Bad labels: "ตรวจสอบ", "พูดคุย", "เดินต่อ", "โจมตี", "ป้องกัน", "ใช้สกิล". Good labels: "แกะรอยคราบสีเงินใต้ประตูหอคอย", "ถามบาทหลวงตาบอดเรื่องเสียงประสาน", "ล่อเงาที่กำแพงออกจากแสงตะเกียง". Avoid repeating choice labels used in the recent log. The UI adds the final custom "ทำอย่างอื่น..." option itself, so do not include a freeform/custom-only final option. Each choice object must include number, label, prompt, intent, and optional suggested_roll. suggested_roll may be null or an object with required, type, ability, skill, dc, reason, mode, and label. Request rolls only when outcome is uncertain or risky; failure creates complications, not dead ends. Mirror choice labels in next_actions for legacy clients. Set partyMode=true when this is a major party decision (high/extreme danger or active threat clocks), else false or omit. Use rulesContext.theme, gamePhase, partySummary, latestScene, recent log, and encounter state. In setup, open the table with an objective and current danger. In exploration, favor investigation/social/travel pressure. In combat, offer tactical choices and readable enemy patterns. In rest, recap consequences and next hook. You are a Narrative Engine, not Game Authority: never directly change HP, condition, inventory, initiative, turn order, encounter, or phase. Put state-changing suggestions in events only for UI confirmation. Event types: damage, healing, add_condition, remove_condition, phase_change, start_combat, next_turn, previous_turn, with label, targetId or targetName, amount, condition, phase, encounterName, and note. If no state change is needed, events must be an empty array.',
              },
            ],
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Session: ${body.sessionId}
Character: ${body.characterName}
Recent log:
${recent ?? 'No prior messages.'}

Rules and table state context:
${rulesContext}

${sceneContextBlock}

Player action:
${body.message}`,
              },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 1100,
            responseMimeType: 'application/json',
          },
        }),
      },
      GEMINI_TIMEOUT_MS,
    );
  } catch (error) {
    const isAbort = error instanceof DOMException && error.name === 'AbortError';
    return errorResponse(
      isAbort ? 'Gemini request timed out. Try again in a moment.' : 'Could not reach Gemini from the AI DM function.',
      isAbort ? 504 : 502,
    );
  }

  let data: GeminiResponse | { error?: { message?: string } };
  try {
    data = (await response.json()) as GeminiResponse | { error?: { message?: string } };
  } catch {
    return errorResponse('Gemini returned an invalid JSON response.', 502);
  }

  if (!response.ok) {
    const message =
      'error' in data && data.error?.message ? data.error.message : 'Gemini request failed';
    return errorResponse(message, response.status);
  }

  const text =
    (data as GeminiResponse).candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join('\n')
      .trim() ?? '';

  if (!text) {
    return errorResponse('Gemini returned an empty AI DM response.', 502);
  }

  const reply = normalizeDmReply(text);
  const inferredPartyMode = inferPartyModeFromSceneContext(body.sceneContext);
  if (inferredPartyMode && reply.partyMode !== true) {
    reply.partyMode = true;
  }

  return Response.json(
    {
      reply,
      content: [{ type: 'text', text }],
      usage: (data as GeminiResponse).usageMetadata,
    },
    { headers: corsHeaders },
  );
});
