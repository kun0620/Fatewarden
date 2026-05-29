import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import type {
  CreateRoomInput,
  EndSessionInput,
  JoinRoomInput,
  Room,
  RoomPlayer,
  RoomSession,
  StartSessionInput,
} from './roomTypes';

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

function requireClient(client?: SupabaseClient) {
  const resolved = client ?? supabase;
  if (!resolved) {
    throw new Error('Supabase is not configured.');
  }
  return resolved;
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

function mapRoomPlayer(row: RoomPlayerRow): RoomPlayer {
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

function mapRoomSession(row: RoomSessionRow): RoomSession {
  return {
    id: row.id,
    roomId: row.room_id,
    startedBy: row.started_by,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

function makeRoomCode() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => (byte % 36).toString(36)).join('').toUpperCase();
}

function clampMaxPlayers(value: number) {
  const safe = Math.trunc(value);
  if (!Number.isFinite(safe)) return 4;
  return Math.max(1, Math.min(8, safe));
}

async function ensureHostAuthority(client: SupabaseClient, roomId: string, actorUserId: string) {
  const { data, error } = await client
    .from('rooms')
    .select('host_player_id')
    .eq('id', roomId)
    .single();
  if (error) throw error;
  if (!data || (data as { host_player_id?: string }).host_player_id !== actorUserId) {
    throw new Error('Host authority required for this action.');
  }
}

export async function createRoom(input: CreateRoomInput, client?: SupabaseClient) {
  const db = requireClient(client);
  const code = makeRoomCode();

  const { data: roomData, error: roomError } = await db
    .from('rooms')
    .insert({
      code,
      name: input.name.trim(),
      host_player_id: input.hostUserId,
      status: 'open',
      max_players: clampMaxPlayers(input.maxPlayers),
      play_mode: input.playMode ?? 'dnd',
    })
    .select('id,code,name,host_player_id,status,max_players,play_mode,created_at,updated_at')
    .single();
  if (roomError) throw roomError;

  const room = mapRoom(roomData as RoomRow);

  const { data: hostData, error: hostError } = await db
    .from('room_players')
    .insert({
      room_id: room.id,
      user_id: input.hostUserId,
      display_name: input.hostDisplayName.trim(),
      role: 'host',
      is_ready: false,
    })
    .select('id,room_id,user_id,display_name,role,is_ready,joined_at,left_at')
    .single();
  if (hostError) throw hostError;

  return {
    room,
    hostPlayer: mapRoomPlayer(hostData as RoomPlayerRow),
  };
}

export async function joinRoom(input: JoinRoomInput, client?: SupabaseClient) {
  const db = requireClient(client);
  const roomCode = input.roomCode.trim().toUpperCase();

  const { data: roomData, error: roomError } = await db
    .from('rooms')
    .select('id,code,name,host_player_id,status,max_players,play_mode,created_at,updated_at')
    .eq('code', roomCode)
    .single();
  if (roomError) throw roomError;
  const room = mapRoom(roomData as RoomRow);

  if (room.status !== 'open') {
    throw new Error('Room is not open for new players.');
  }

  const { data: playersData, error: playersError } = await db
    .from('room_players')
    .select('id,room_id,user_id,display_name,role,is_ready,joined_at,left_at')
    .eq('room_id', room.id)
    .is('left_at', null);
  if (playersError) throw playersError;

  const activePlayers = (playersData ?? []) as RoomPlayerRow[];
  if (activePlayers.length >= room.rules.maxPlayers) {
    throw new Error('Room is full.');
  }

  const existing = activePlayers.find((player) => player.user_id === input.userId);
  if (existing) {
    return {
      room,
      player: mapRoomPlayer(existing),
    };
  }

  const { data: playerData, error: playerError } = await db
    .from('room_players')
    .insert({
      room_id: room.id,
      user_id: input.userId,
      display_name: input.displayName.trim(),
      role: 'player',
      is_ready: false,
    })
    .select('id,room_id,user_id,display_name,role,is_ready,joined_at,left_at')
    .single();
  if (playerError) throw playerError;

  return {
    room,
    player: mapRoomPlayer(playerData as RoomPlayerRow),
  };
}

export async function leaveRoom(roomId: string, userId: string, client?: SupabaseClient) {
  const db = requireClient(client);
  const { error } = await db
    .from('room_players')
    .update({ left_at: new Date().toISOString(), is_ready: false })
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .is('left_at', null);
  if (error) throw error;
}

export async function startSession(input: StartSessionInput, client?: SupabaseClient) {
  const db = requireClient(client);
  await ensureHostAuthority(db, input.roomId, input.actorUserId);

  const { data: roomPlayers, error: playersError } = await db
    .from('room_players')
    .select('id,room_id,user_id,display_name,role,is_ready,joined_at,left_at')
    .eq('room_id', input.roomId)
    .is('left_at', null);
  if (playersError) throw playersError;

  const players = (roomPlayers ?? []).map((row) => mapRoomPlayer(row as RoomPlayerRow));
  if (!players.length) {
    throw new Error('Cannot start session without players.');
  }
  const notReady = players.filter((player) => !player.isReady);
  if (notReady.length > 0) {
    throw new Error('All connected players must be ready.');
  }

  const { data: sessionData, error: sessionError } = await db
    .from('room_sessions')
    .insert({
      room_id: input.roomId,
      started_by: input.actorUserId,
      status: 'active',
    })
    .select('id,room_id,started_by,status,started_at,ended_at')
    .single();
  if (sessionError) throw sessionError;

  const { error: roomError } = await db
    .from('rooms')
    .update({ status: 'in_game' })
    .eq('id', input.roomId);
  if (roomError) throw roomError;

  return mapRoomSession(sessionData as RoomSessionRow);
}

export async function endSession(input: EndSessionInput, client?: SupabaseClient) {
  const db = requireClient(client);
  await ensureHostAuthority(db, input.roomId, input.actorUserId);

  const { data: activeSessionData, error: activeSessionError } = await db
    .from('room_sessions')
    .select('id,room_id,started_by,status,started_at,ended_at')
    .eq('room_id', input.roomId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (activeSessionError) throw activeSessionError;
  if (!activeSessionData) {
    throw new Error('No active session found.');
  }

  const endedAt = new Date().toISOString();
  const { data: endedSessionData, error: endError } = await db
    .from('room_sessions')
    .update({ status: 'ended', ended_at: endedAt })
    .eq('id', (activeSessionData as RoomSessionRow).id)
    .select('id,room_id,started_by,status,started_at,ended_at')
    .single();
  if (endError) throw endError;

  const { error: roomError } = await db
    .from('rooms')
    .update({ status: 'open' })
    .eq('id', input.roomId);
  if (roomError) throw roomError;

  return mapRoomSession(endedSessionData as RoomSessionRow);
}
