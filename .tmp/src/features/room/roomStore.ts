import type { Room, RoomPlayer, RoomSession, RoomState } from './roomTypes';

type RoomStoreListener = (state: RoomState) => void;

function immutableSortedPlayers(players: readonly RoomPlayer[]) {
  return [...players].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
}

export const initialRoomState: RoomState = {
  currentRoom: null,
  connectedPlayers: [],
  sessionState: null,
  hostPlayerId: null,
};

export function createRoomStore(initialState: RoomState = initialRoomState) {
  let state: RoomState = {
    currentRoom: initialState.currentRoom,
    connectedPlayers: immutableSortedPlayers(initialState.connectedPlayers),
    sessionState: initialState.sessionState,
    hostPlayerId: initialState.hostPlayerId,
  };
  const listeners = new Set<RoomStoreListener>();

  function notify() {
    listeners.forEach((listener) => listener(state));
  }

  function setState(nextState: RoomState) {
    state = {
      currentRoom: nextState.currentRoom,
      connectedPlayers: immutableSortedPlayers(nextState.connectedPlayers),
      sessionState: nextState.sessionState,
      hostPlayerId: nextState.hostPlayerId,
    };
    notify();
    return state;
  }

  function update(updater: (current: RoomState) => RoomState) {
    return setState(updater(state));
  }

  return {
    getState() {
      return state;
    },
    subscribe(listener: RoomStoreListener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setRoom(room: Room | null) {
      return update((current) => ({
        ...current,
        currentRoom: room,
        hostPlayerId: room?.hostPlayerId ?? null,
      }));
    },
    setPlayers(players: readonly RoomPlayer[]) {
      return update((current) => ({
        ...current,
        connectedPlayers: immutableSortedPlayers(players),
      }));
    },
    upsertPlayer(player: RoomPlayer) {
      return update((current) => {
        const nextPlayers = [...current.connectedPlayers];
        const index = nextPlayers.findIndex((item) => item.id === player.id);
        if (index >= 0) {
          nextPlayers[index] = player;
        } else {
          nextPlayers.push(player);
        }
        return {
          ...current,
          connectedPlayers: immutableSortedPlayers(nextPlayers.filter((item) => item.leftAt === null)),
        };
      });
    },
    removePlayer(playerId: string) {
      return update((current) => ({
        ...current,
        connectedPlayers: current.connectedPlayers.filter((player) => player.id !== playerId),
      }));
    },
    setSession(session: RoomSession | null) {
      return update((current) => ({
        ...current,
        sessionState: session,
      }));
    },
    setReadyState(playerId: string, isReady: boolean) {
      return update((current) => ({
        ...current,
        connectedPlayers: current.connectedPlayers.map((player) =>
          player.id === playerId ? { ...player, isReady } : player,
        ),
      }));
    },
    reset() {
      return setState(initialRoomState);
    },
  };
}

export type RoomStore = ReturnType<typeof createRoomStore>;
