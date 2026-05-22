import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

type GuardBody = {
  bucket?: string;
  sizeBytes?: number;
};

const LIMIT_BYTES = 100 * 1024 * 1024;
const BUCKETS = new Set(['avatars', 'portraits', 'thumbnails', 'campaign-images']);

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

  let body: GuardBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON request body.' }, 400);
  }

  const bucket = body.bucket ?? '';
  const sizeBytes = Math.max(0, Math.trunc(Number(body.sizeBytes ?? 0)));
  if (!BUCKETS.has(bucket)) {
    return json({ error: 'Unknown storage bucket.' }, 400);
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return json({ error: 'sizeBytes must be a positive number.' }, 400);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await serviceClient
    .from('storage_files')
    .select('size_bytes')
    .eq('user_id', authData.user.id);

  if (error) {
    return json({ error: error.message }, 500);
  }

  const usedBytes = (data ?? []).reduce((sum, row) => sum + Number(row.size_bytes ?? 0), 0);
  const nextBytes = usedBytes + sizeBytes;
  const allowed = nextBytes <= LIMIT_BYTES;

  return json(
    {
      allowed,
      usedBytes,
      requestedBytes: sizeBytes,
      nextBytes,
      limitBytes: LIMIT_BYTES,
      remainingBytes: Math.max(0, LIMIT_BYTES - usedBytes),
    },
    allowed ? 200 : 413,
  );
});
