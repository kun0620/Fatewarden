import type { RealtimeChannel, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type NotificationType = 'session_invite' | 'party_join' | 'party_leave' | 'vote_started' | 'turn_reminder';

export type AppNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  metadata: {
    sessionId?: string;
    choiceId?: string;
    fromUserId?: string;
    sessionTitle?: string;
    [key: string]: unknown;
  };
  createdAt: string;
};

type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  metadata?: AppNotification['metadata'] | null;
  created_at: string;
};

export const notificationTiming: Record<NotificationType, { ms: number; priority: 'high' | 'medium' | 'low'; icon: string }> = {
  turn_reminder: { ms: 10_000, priority: 'high', icon: 'sword' },
  vote_started: { ms: 8_000, priority: 'high', icon: 'users' },
  session_invite: { ms: 5_000, priority: 'medium', icon: 'scroll' },
  party_join: { ms: 3_000, priority: 'low', icon: 'users' },
  party_leave: { ms: 3_000, priority: 'low', icon: 'logout' },
};

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    read: row.read,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

export function relativeNotificationTime(iso: string) {
  const elapsed = Math.max(0, Date.now() - Date.parse(iso));
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (elapsed < minute) return 'just now';
  if (elapsed < hour) return `${Math.floor(elapsed / minute)}m ago`;
  if (elapsed < day) return `${Math.floor(elapsed / hour)}h ago`;
  return `${Math.floor(elapsed / day)}d ago`;
}

export async function listNotifications(user: User) {
  const client = requireClient();
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data, error } = await client
    .from('notifications')
    .select('id,user_id,type,title,body,read,metadata,created_at')
    .eq('user_id', user.id)
    .gte('created_at', since)
    .order('created_at', { ascending: false });
  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return (data ?? []).map((row) => mapNotification(row as NotificationRow));
}

export async function countUnreadNotifications(user: User) {
  const client = requireClient();
  const { count, error } = await client
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);
  if (error) {
    if (error.code === '42P01') return 0;
    throw error;
  }
  return count ?? 0;
}

export async function markAllNotificationsRead() {
  const client = requireClient();
  const rpc = await client.rpc('mark_all_notifications_read');
  if (!rpc.error) return;
  const { error } = await client.from('notifications').update({ read: true }).eq('read', false);
  if (error) throw error;
}

export async function markNotificationRead(id: string) {
  const client = requireClient();
  const { error } = await client.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

export async function sendSessionInviteNotification(input: {
  recipientUserIds: string[];
  sessionId: string;
  sessionTitle?: string;
  inviterName?: string;
}) {
  const inviter = input.inviterName?.trim() || 'A player';
  const sessionLabel = input.sessionTitle?.trim() || 'a Fatewarden session';
  return sendNotification({
    recipientUserIds: input.recipientUserIds,
    sessionId: input.sessionId,
    type: 'session_invite',
    title: 'Session invite',
    body: `${inviter} invited you to ${sessionLabel}.`,
    metadata: {
      sessionId: input.sessionId,
      sessionTitle: input.sessionTitle,
    },
  });
}

export function subscribeToNotifications(user: User, onInsert: (notification: AppNotification) => void): RealtimeChannel {
  const client = requireClient();
  return client
    .channel(`notifications:${user.id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => onInsert(mapNotification(payload.new as NotificationRow)),
    )
    .subscribe();
}

export async function sendNotification(input: {
  recipientUserIds: string[];
  sessionId?: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: AppNotification['metadata'];
}) {
  const client = requireClient();
  const { error } = await client.functions.invoke('notify', {
    body: input,
  });
  if (error) throw error;
}
