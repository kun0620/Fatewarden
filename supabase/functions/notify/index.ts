import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

type NotificationType = 'session_invite' | 'party_join' | 'party_leave' | 'vote_started' | 'turn_reminder';

type NotifyBody = {
  recipientUserIds?: string[];
  sessionId?: string;
  type?: NotificationType;
  title?: string;
  body?: string;
  metadata?: Record<string, unknown>;
};

const TYPES = new Set<NotificationType>(['session_invite', 'party_join', 'party_leave', 'vote_started', 'turn_reminder']);
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: corsHeaders });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization') ?? '';

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Supabase function environment is not configured.' }, 500);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) {
    return json({ error: 'Not authenticated.' }, 401);
  }

  let payload: NotifyBody;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON request body.' }, 400);
  }

  if (!payload.type || !TYPES.has(payload.type)) {
    return json({ error: 'Invalid notification type.' }, 400);
  }
  if (!payload.title?.trim() || !payload.body?.trim()) {
    return json({ error: 'title and body are required.' }, 400);
  }

  const recipients = Array.from(new Set(payload.recipientUserIds ?? [])).filter(Boolean);
  if (!recipients.length) {
    return json({ error: 'recipientUserIds must include at least one user.' }, 400);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  if (payload.sessionId) {
    const { data: allowedRows, error: allowedError } = await serviceClient
      .from('session_members')
      .select('player_id')
      .eq('session_id', payload.sessionId)
      .eq('player_id', authData.user.id)
      .neq('status', 'kicked')
      .limit(1);
    if (allowedError) return json({ error: allowedError.message }, 500);
    if (!allowedRows?.length) return json({ error: 'Not a session member.' }, 403);
  }

  const rows = recipients.map((userId) => ({
    user_id: userId,
    type: payload.type,
    title: payload.title?.trim(),
    body: payload.body?.trim(),
    metadata: {
      ...(payload.metadata ?? {}),
      ...(payload.sessionId ? { sessionId: payload.sessionId } : {}),
      fromUserId: authData.user.id,
    },
  }));

  const { data, error } = await serviceClient.from('notifications').insert(rows).select('id,user_id');
  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ ok: true, inserted: data?.length ?? rows.length });
});
