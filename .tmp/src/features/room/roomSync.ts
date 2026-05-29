import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import type { RoomStore } from './roomStore';
import type { Room, RoomPlayer, RoomSession } from './roomTypes';

type RoomRow = {
  id: string;
  code: string;
  name: string;
  host_player_id: string;
  status: 'open' | 'in_game' | 'closed';
  max_players: number;
  play_mode: 'dnd' | 'hexplore';
  created_at: string;
  updated_at: string;
};

type RoomPlayerRow = {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  role: 'host' | 'player';
  is_ready: boolean;
  joined_at: string;
  left_at: string | null;
};

type RoomSessionRow = {
  id: string;
  room_id: string;
  started_by: string;
  status: 'active' | 'ended';
  started_at: string;
  ended_at: string | null;
};

interface RoomSyncOptions {
  readonly roomId: string;
  readonly store: RoomStore;
  readonly client?: SupabaseClient;
  readonly reconnectDelayMs?: number;
}

interface RoomSyncController {
  disconnect(): Promise<void>;
}

function mapRoom(row: RoomRow): Room {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    hostPlayerId: row.host_player_id,
    status: row.status,
    rules: {
      maxPlayers: row.max_players,
      playMode: row.play_mode,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPlayer(row: RoomPlayerRow): RoomPlayer {
  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    displayName: row.display_name,
    role: row.role,
    isReady: row.is_ready,
    joinedAt: row.joined_at,
    leftAt: row.left_at,
  };
}

function mapSession(row: RoomSessionRow): RoomSession {
  return {
    id: row.id,
    roomId: row.room_id,
    startedBy: row.started_by,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

function requireClient(client?: SupabaseClient) {
  const resolved = client ?? supabase;
  if (!resolved) {
    throw new Error('Supabase is not configured.');
  }
  return resolved;
}

async function hydrateRoomState(client: SupabaseClient, roomId: string, store: RoomStore) {
  const [roomResult, playersResult, sessionResult] = await Promise.all([
    client
      .from('rooms')
      .select('id,code,name,host_player_id,status,max_players,play_mode,created_at,updated_at')
      .eq('id', roomId)
      .single(),
    client
      .from('room_players')
      .select('id,room_id,user_id,display_name,role,is_ready,joined_at,left_at')
      .eq('room_id', roomId)
      .is('left_at', null)
      .order('joined_at', { ascending: true }),
    client
      .from('room_sessions')
      .select('id,room_id,started_by,status,started_at,ended_at')
      .eq('room_id', roomId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (roomResult.error) throw roomResult.error;
  if (playersResult.error) throw playersResult.error;
  if (sessionResult.error) throw sessionResult.error;

  if (roomResult.data) {
    store.setRoom(mapRoom(roomResult.data as RoomRow));
  }

  store.setPlayers(((playersResult.data ?? []) as RoomPlayerRow[]).map((row) => mapPlayer(row)));
  store.setSession(sessionResult.data ? mapSession(sessionResult.data as RoomSessionRow) : null);
}

export async function connectRoomSync(options: RoomSyncOptions): Promise<RoomSyncController> {
  const client = requireClient(options.client);
  const reconnectDelayMs = options.reconnectDelayMs ?? 1500;
  const { roomId, store } = options;
  let stopped = false;
  let roomChannel: RealtimeChannel | null = null;
  let playersChannel: RealtimeChannel | null = null;
  let sessionsChannel: RealtimeChannel | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const clearReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (stopped || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connectChannels();
    }, reconnectDelayMs);
  };

  const removeChannel = async (channel: RealtimeChannel | null) => {
    if (!channel) return;
    await client.removeChannel(channel);
  };

  const cleanupChannels = async () => {
    await Promise.all([removeChannel(roomChannel), removeChannel(playersChannel), removeChannel(sessionsChannel)]);
    roomChannel = null;
    playersChannel = null;
    sessionsChannel = null;
  };

  const channelStatusHandler = (status: string) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      scheduleReconnect();
    }
  };

  const connectChannels = async () => {
    if (stopped) return;
    await cleanupChannels();
    await hydrateRoomState(client, roomId, store);

    roomChannel = client
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          store.setRoom(mapRoom(payload.new as RoomRow));
        },
      )
      .subscribe(channelStatusHandler);

    playersChannel = client
      .channel(`room_players:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const nextPlayer = mapPlayer(payload.new as RoomPlayerRow);
          if (payload.eventType === 'DELETE' || nextPlayer.leftAt !== null) {
            store.removePlayer(nextPlayer.id);
            return;
          }
          store.upsertPlayer(nextPlayer);
        },
      )
      .subscribe(channelStatusHandler);

    sessionsChannel = client
      .channel(`room_sessions:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_sessions', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            store.setSession(null);
            return;
          }
          const nextSession = mapSession(payload.new as RoomSessionRow);
          store.setSession(nextSession.status === 'active' ? nextSession : null);
        },
      )
      .subscribe(channelStatusHandler);
  };

  await connectChannels();

  return {
    async disconnect() {
      stopped = true;
      clearReconnect();
      await cleanupChannels();
    },
  };
}
