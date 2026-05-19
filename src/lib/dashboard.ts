import type { User } from '@supabase/supabase-js';
import { listVaultCharacters } from './characters';
import { listJoinedSessions } from './sessions';
import { supabase } from './supabase';
import type { GameSession, VaultCharacter } from '../types';

export type DashboardCampaign = {
  id: string;
  title: string;
  summary: string;
  thumbnailUrl?: string;
  actsCount: number;
  levelMin: number;
  levelMax: number;
  updatedAt: string;
  session?: GameSession;
};

export type DashboardData = {
  sessions: GameSession[];
  characters: VaultCharacter[];
  campaigns: DashboardCampaign[];
};

type CampaignRow = {
  id: string;
  title: string;
  summary?: string | null;
  thumbnail_url?: string | null;
  acts_count?: number | null;
  level_min?: number | null;
  level_max?: number | null;
  updated_at?: string | null;
  created_at?: string | null;
};

function mapCampaign(row: CampaignRow): DashboardCampaign {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary ?? '',
    thumbnailUrl: row.thumbnail_url ?? undefined,
    actsCount: row.acts_count ?? 1,
    levelMin: row.level_min ?? 1,
    levelMax: row.level_max ?? 5,
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  };
}

function sessionCampaigns(sessions: GameSession[]): DashboardCampaign[] {
  return sessions.slice(0, 3).map((session, index) => ({
    id: `session:${session.id}`,
    title: session.title,
    summary: `${session.theme.key.replace(/_/g, ' ')} / ${session.playMode} / ${session.ruleStrictness}`,
    actsCount: index + 1,
    levelMin: 1,
    levelMax: Math.max(3, session.partySize + 1),
    updatedAt: session.updatedAt ?? session.createdAt,
    session,
  }));
}

async function listCampaigns(user: User, sessions: GameSession[]) {
  if (!supabase) return sessionCampaigns(sessions);

  const { data, error } = await supabase
    .from('campaigns')
    .select('id,title,summary,thumbnail_url,acts_count,level_min,level_max,updated_at,created_at')
    .eq('author_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(4);

  if (error) {
    if (error.code === '42P01') return sessionCampaigns(sessions);
    throw error;
  }

  const campaigns = (data ?? []).map((row) => mapCampaign(row as CampaignRow));
  return campaigns.length ? campaigns : sessionCampaigns(sessions);
}

export async function loadDashboard(user: User): Promise<DashboardData> {
  const sessionsPromise = listJoinedSessions();
  const charactersPromise = listVaultCharacters(user);

  const [sessions, characters] = await Promise.all([sessionsPromise, charactersPromise]);
  const campaigns = await listCampaigns(user, sessions);

  return {
    sessions: sessions.slice(0, 6),
    characters: characters.slice(0, 6),
    campaigns,
  };
}

export function relativeTimeLabel(iso?: string) {
  if (!iso) return 'Recently';
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return 'Recently';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
