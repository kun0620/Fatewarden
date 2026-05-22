import { supabase } from './supabase';

export type ReportReason = 'inappropriate_content' | 'harassment' | 'spam' | 'other';

export type ReportTargetKind = 'message' | 'session';

export type ReportTarget = {
  kind: ReportTargetKind;
  sessionId?: string;
  messageId?: string;
  title?: string;
  author?: string;
  content?: string;
};

export type ReportContentInput = {
  reason: ReportReason;
  details?: string;
  target: ReportTarget;
};

export const REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
];

export async function sendContentReport(input: ReportContentInput) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.functions.invoke('report-content', {
    body: {
      reason: input.reason,
      details: input.details?.trim() || undefined,
      target: input.target,
    },
  });
  if (error) throw error;
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    throw new Error(data.error);
  }
  return data as { ok: true };
}
