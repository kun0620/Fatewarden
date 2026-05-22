import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

type ReportReason = 'inappropriate_content' | 'harassment' | 'spam' | 'other';

type ReportTarget = {
  kind?: 'message' | 'session';
  sessionId?: string;
  messageId?: string;
  title?: string;
  author?: string;
  content?: string;
};

type ReportBody = {
  reason?: ReportReason;
  details?: string;
  target?: ReportTarget;
};

const REASONS = new Set<ReportReason>(['inappropriate_content', 'harassment', 'spam', 'other']);
const REASON_LABELS: Record<ReportReason, string> = {
  inappropriate_content: 'Inappropriate content',
  harassment: 'Harassment',
  spam: 'Spam',
  other: 'Other',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: corsHeaders });
}

function truncate(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const adminEmail = Deno.env.get('REPORT_ADMIN_EMAIL') ?? 'support@fatewarden.app';
  const fromEmail = Deno.env.get('REPORT_FROM_EMAIL') ?? 'Fatewarden Reports <reports@fatewarden.app>';
  const authorization = request.headers.get('Authorization') ?? '';

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !resendApiKey) {
    return json({ error: 'Report function environment is not configured.' }, 500);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) {
    return json({ error: 'Not authenticated.' }, 401);
  }

  let payload: ReportBody;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON request body.' }, 400);
  }

  if (!payload.reason || !REASONS.has(payload.reason)) {
    return json({ error: 'Invalid report reason.' }, 400);
  }
  if (!payload.target?.kind || !['message', 'session'].includes(payload.target.kind)) {
    return json({ error: 'Report target is required.' }, 400);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('email,username,display_name')
    .eq('id', authData.user.id)
    .maybeSingle();

  const reporterName = truncate(profile?.display_name, 80) || truncate(profile?.username, 80) || authData.user.email || authData.user.id;
  const reporterEmail = truncate(profile?.email, 120) || authData.user.email || 'unknown';
  const target = payload.target;
  const reasonLabel = REASON_LABELS[payload.reason];

  const text = [
    `Fatewarden moderation report`,
    ``,
    `Reason: ${reasonLabel}`,
    `Reporter: ${reporterName} <${reporterEmail}>`,
    `Reporter user id: ${authData.user.id}`,
    ``,
    `Target kind: ${target.kind}`,
    `Session id: ${truncate(target.sessionId, 80) || 'n/a'}`,
    `Message id: ${truncate(target.messageId, 80) || 'n/a'}`,
    `Target title: ${truncate(target.title, 160) || 'n/a'}`,
    `Target author: ${truncate(target.author, 120) || 'n/a'}`,
    ``,
    `Details:`,
    truncate(payload.details, 2000) || 'n/a',
    ``,
    `Reported content:`,
    truncate(target.content, 4000) || 'n/a',
  ].join('\n');

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: adminEmail,
      subject: `[Fatewarden Report] ${reasonLabel} from ${reporterName}`,
      text,
    }),
  });

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    return json({ error: errorText || 'Could not send report email.' }, 502);
  }

  return json({ ok: true });
});
