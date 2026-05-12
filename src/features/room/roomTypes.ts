export type RoomPlayMode = 'dnd' | 'hexplore';
export type RoomStatus = 'open' | 'in_game' | 'closed';
export type RoomSessionStatus = 'active' | 'ended';
export type RoomPlayerRole = 'host' | 'player';

export interface RoomRules {
  readonly maxPlayers: number;
  readonly playMode: RoomPlayMode;
}

export interface Room {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly hostPlayerId: string;
  readonly status: RoomStatus;
  readonly rules: RoomRules;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RoomPlayer {
  readonly id: string;
  readonly roomId: string;
  readonly userId: string;
  readonly displayName: string;
  readonly role: RoomPlayerRole;
  readonly isReady: boolean;
  readonly joinedAt: string;
  readonly leftAt: string | null;
}

export interface RoomSession {
  readonly id: string;
  readonly roomId: string;
  readonly startedBy: string;
  readonly status: RoomSessionStatus;
  readonly startedAt: string;
  readonly endedAt: string | null;
}

export interface RoomState {
  readonly currentRoom: Room | null;
  readonly connectedPlayers: readonly RoomPlayer[];
  readonly sessionState: RoomSession | null;
  readonly hostPlayerId: string | null;
}

export interface CreateRoomInput {
  readonly name: string;
  readonly hostUserId: string;
  readonly hostDisplayName: string;
  readonly maxPlayers: number;
  readonly playMode?: RoomPlayMode;
}

export interface JoinRoomInput {
  readonly roomCode: string;
  readonly userId: string;
  readonly displayName: string;
}

export interface StartSessionInput {
  readonly roomId: string;
  readonly actorUserId: string;
}

export interface EndSessionInput {
  readonly roomId: string;
  readonly actorUserId: string;
}
