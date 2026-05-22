import type { User } from '@supabase/supabase-js';
import { useGameStore } from '../store/useGameStore';
import type { AppNotification } from '../lib/notifications';

export function useGameData() {
  const store = useGameStore();
  const character = store.activeCharacter;

  return {
    // Auth/session data still lives outside useGameStore.
    user: null as User | null,
    activeSession: null,
    characterStatus: null as string | null,
    notifications: [] as AppNotification[],

    // Character
    character,
    activeCharacter: character,
    classRuntime: store.classRuntime,
    raceRuntime: store.raceRuntime,
    derivedStats: character?.systemData.derivedStats ?? null,

    // Session/runtime
    combatState: store.combatState,
    sceneState: store.sceneState,
    inventory: store.inventory ?? character?.inventory ?? null,

    // Party and narrative runtime
    companions: store.companionState.companions,
    companionState: store.companionState,
    partyChoice: store.partyChoiceState.activeChoice,
    partyChoiceState: store.partyChoiceState,
    journalEntries: store.journalState.entries,
    journalState: store.journalState,
    relationships: store.relationshipState.records,
    relationshipState: store.relationshipState,

    // Actions
    eventMeta: store.eventMeta,
    dispatch: store.dispatch,
    setActiveCharacter: store.setActiveCharacter,
    setCombatState: store.setCombatState,
  };
}
