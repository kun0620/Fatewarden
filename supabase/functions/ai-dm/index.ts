type RequestBody = {
  sessionId: string;
  characterName: string;
  message: string;
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('GOOGLE_API_KEY');
  if (!apiKey) {
    return Response.json(
      { error: 'GOOGLE_API_KEY is not configured' },
      { status: 500, headers: corsHeaders },
    );
  }
  const model = Deno.env.get('GOOGLE_MODEL') ?? 'gemini-2.5-flash';

  const body = (await request.json()) as RequestBody;
  if (!body.sessionId || !body.characterName || !body.message) {
    return Response.json(
      { error: 'sessionId, characterName, and message are required' },
      { status: 400, headers: corsHeaders },
    );
  }

  const recent = body.recentMessages
    ?.map((message) => `${message.speaker.toUpperCase()} ${message.author}: ${message.body}`)
    .join('\n');
  const rulesContext = body.rulesContext
    ? JSON.stringify(body.rulesContext, null, 2)
    : 'No structured rules context provided.';

  const response = await fetch(
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
                'You are a fair, concise DnD 5e Dungeon Master for SRD 5.1 / DnD 5e 2014 style play. Always reply in Thai. Use a vivid but compact tabletop tone. Reply as JSON with keys narration, suggested_roll, events, and table_notes. Use rulesContext.gamePhase to tailor guidance: setup prepares the table, exploration favors investigation/social/travel checks, combat favors turn/action/ruling clarity, and rest favors recovery/recap. You may suggest DCs, checks, saves, likely rules, and narrative consequences. You must not mutate table state yourself: do not reduce HP, add/remove conditions, end turns, change encounter state, or change game phase. Ask the user to confirm any state-changing result in the UI.',
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

Player action:
${body.message}`,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 900,
          responseMimeType: 'application/json',
        },
      }),
    },
  );

  const data = (await response.json()) as GeminiResponse | { error?: { message?: string } };
  if (!response.ok) {
    const message =
      'error' in data && data.error?.message ? data.error.message : 'Gemini request failed';
    return Response.json({ error: message }, { status: response.status, headers: corsHeaders });
  }

  const text =
    (data as GeminiResponse).candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join('\n')
      .trim() ?? '';

  return Response.json(
    {
      content: [{ type: 'text', text }],
      usage: (data as GeminiResponse).usageMetadata,
    },
    { headers: corsHeaders },
  );
});
