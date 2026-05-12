import { create } from 'zustand';
import { createEventQueueState, processEventQueue, type EventRuntimeState } from '../engine/events/eventQueue';
import { addParticipant, type CombatParticipant, type CombatState as EngineCombatState } from '../engine/combat';
import { getSceneContext as buildSceneContext, type SceneState } from '../engine/scene';
import type { RaceRuntime } from '../engine/races/raceRuntime';
import type { GameEvent } from '../engine/events/types';
import type { PartyChoice, PartyChoiceState } from '../engine/party/partyChoiceTypes';
import type { CompanionSheet, CompanionState } from '../engine/companion/companionTypes';
import {
  processPartyChoiceCreated,
  processPartyChoiceResolved,
  processPartyVoteCast,
} from '../engine/events/processors/partyChoiceProcessor';
import {
  processCompanionAction,
  processCompanionDismiss,
  processCompanionLoyaltyChange,
  processCompanionSummon,
} from '../engine/events/processors/companionProcessor';
import {
  processObjectiveUpdate,
  processSceneTransition,
  processThreatClockAdvance,
} from '../engine/events/processors/sceneProcessor';
import type { Character, Combatant, EncounterState, Inventory } from '../types';

type DispatchResult = {
  character: Character | null;
  appliedCount: number;
  failed: string[];
};

type GameStoreState = {
  combatState: EncounterState | null;
  sceneState: SceneState | null;
  companionState: CompanionState;
  partyChoiceState: PartyChoiceState;
  activeCharacter: Character | null;
  classRuntime: Character['systemData']['classRuntime'] | null;
  raceRuntime: RaceRuntime | null;
  inventory: Inventory | null;
  partyChoiceAiResponder: ((input: string) => void | Promise<void>) | null;
  setCombatState: (combatState: EncounterState | null) => void;
  setSceneState: (sceneState: SceneState | null) => void;
  addCompanion: (companion: CompanionSheet) => void;
  removeCompanion: (companionId: string) => void;
  updateCompanion: (companion: CompanionSheet) => void;
  setActivePartyChoice: (choice: PartyChoice) => void;
  clearActivePartyChoice: () => void;
  setPartyChoiceAiResponder: (responder: ((input: string) => void | Promise<void>) | null) => void;
  setActiveCharacter: (character: Character | null) => void;
  getSceneContext: () => ReturnType<typeof buildSceneContext> | null;
  eventMeta: (characterId: string) => {
    id: string;
    sessionId: string;
    actorId: string;
    targetId: string;
    createdAt: string;
    source: 'user';
  };
  dispatch: (event: GameEvent) => DispatchResult;
};

function nowIso() {
  return new Date().toISOString();
}

function mapRaceRuntime(character: Character | null): RaceRuntime | null {
  if (!character) return null;
  const runtime = character.systemData.raceRuntime as RaceRuntime | undefined;
  return runtime ?? null;
}

function mapClassRuntime(character: Character | null): Character['systemData']['classRuntime'] | null {
  if (!character) return null;
  return character.systemData.classRuntime ?? null;
}

function mapInventory(character: Character | null): Inventory | null {
  if (!character) return null;
  return character.inventory;
}

function buildCharacterRuntimeState(character: Character): EventRuntimeState {
  return {
    charactersById: {
      [character.id]: character,
    },
  };
}

function toEngineCombatState(encounter: EncounterState): EngineCombatState {
  return {
    id: encounter.id,
    name: encounter.name,
    roomId: undefined,
    phase: encounter.isActive ? 'active' : 'setup',
    participants: encounter.combatants.map((combatant, index) => ({
      id: combatant.id,
      name: combatant.name,
      type: combatant.type === 'player' ? 'player' : 'monster',
      initiativeScore: combatant.initiative,
      dexScore: 10,
      armorClass: combatant.armorClass,
      hitPoints: combatant.hitPoints,
      maxHitPoints: combatant.maxHitPoints,
      tempHitPoints: combatant.tempHitPoints,
      speed: 30,
      conditions: [...combatant.conditions],
      status: combatant.hitPoints <= 0 ? 'unconscious' : 'active',
      joinedOrder: index,
    })),
    initiativeOrder: encounter.combatants.map((combatant) => combatant.id),
    turn: {
      round: encounter.round,
      turnIndex: encounter.activeIndex,
      activeParticipantId: encounter.combatants[encounter.activeIndex]?.id ?? null,
      hasStarted: encounter.isActive,
    },
    createdAt: new Date().toISOString(),
    startedAt: encounter.isActive ? new Date().toISOString() : null,
    endedAt: null,
  };
}

function toEncounterState(combat: EngineCombatState): EncounterState {
  const order = combat.initiativeOrder.length
    ? combat.initiativeOrder
    : combat.participants.map((participant) => participant.id);
  const orderedParticipants = order
    .map((id) => combat.participants.find((participant) => participant.id === id) ?? null)
    .filter((participant): participant is EngineCombatState['participants'][number] => participant !== null);

  const combatants: Combatant[] = orderedParticipants.map((participant) => ({
    id: participant.id,
    name: participant.name,
    type: participant.type === 'monster' ? 'enemy' : 'player',
    armorClass: participant.armorClass,
    hitPoints: participant.hitPoints,
    maxHitPoints: participant.maxHitPoints,
    tempHitPoints: participant.tempHitPoints,
    initiative: participant.initiativeScore ?? 0,
    conditions: [...participant.conditions],
    deathSaves: { successes: 0, failures: 0 },
  }));

  return {
    id: combat.id,
    name: combat.name,
    round: combat.turn.round,
    activeIndex: Math.max(
      0,
      combatatsLengthSafeIndex(combatants, combat.turn.activeParticipantId, combat.turn.turnIndex),
    ),
    isActive: combat.phase === 'active',
    combatants,
  };
}

function combatatsLengthSafeIndex(combatants: Combatant[], activeParticipantId: string | null, turnIndex: number) {
  if (!combatants.length) return 0;
  if (activeParticipantId) {
    const byId = combatants.findIndex((combatant) => combatant.id === activeParticipantId);
    if (byId >= 0) return byId;
  }
  return Math.max(0, Math.min(turnIndex, combatants.length - 1));
}

function companionToParticipant(companion: CompanionSheet): CombatParticipant {
  const dexScore = companion.characterSnapshot.abilities.dex ?? 10;
  return {
    id: companion.id,
    characterId: companion.id,
    name: companion.name,
    type: 'companion',
    initiativeScore: null,
    dexScore,
    armorClass: companion.characterSnapshot.armorClass,
    hitPoints: companion.characterSnapshot.hitPoints,
    maxHitPoints: companion.characterSnapshot.maxHitPoints,
    tempHitPoints: 0,
    speed: companion.characterSnapshot.speed,
    resistances: [],
    conditions: [...companion.characterSnapshot.conditions],
    status: companion.characterSnapshot.hitPoints <= 0 ? 'unconscious' : 'active',
    joinedOrder: 0,
  };
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  combatState: null,
  sceneState: null,
  companionState: {
    companions: [],
  },
  partyChoiceState: {
    activeChoice: null,
    history: [],
  },
  activeCharacter: null,
  classRuntime: null,
  raceRuntime: null,
  inventory: null,
  partyChoiceAiResponder: null,
  setCombatState: (combatState) => set({ combatState }),
  setSceneState: (sceneState) => set({ sceneState }),
  addCompanion: (companion) =>
    set((state) => ({
      companionState: {
        companions: state.companionState.companions.some((item) => item.id === companion.id)
          ? state.companionState.companions
          : [...state.companionState.companions, companion],
      },
    })),
  removeCompanion: (companionId) =>
    set((state) => ({
      companionState: {
        companions: state.companionState.companions.filter((item) => item.id !== companionId),
      },
    })),
  updateCompanion: (companion) =>
    set((state) => ({
      companionState: {
        companions: state.companionState.companions.map((item) =>
          item.id === companion.id ? companion : item,
        ),
      },
    })),
  setActivePartyChoice: (choice) =>
    set((state) => ({
      partyChoiceState: {
        ...state.partyChoiceState,
        activeChoice: choice,
      },
    })),
  clearActivePartyChoice: () =>
    set((state) => ({
      partyChoiceState: {
        ...state.partyChoiceState,
        activeChoice: null,
      },
    })),
  setPartyChoiceAiResponder: (responder) => set({ partyChoiceAiResponder: responder }),
  setActiveCharacter: (character) =>
    set({
      activeCharacter: character,
      classRuntime: mapClassRuntime(character),
      raceRuntime: mapRaceRuntime(character),
      inventory: mapInventory(character),
    }),
  getSceneContext: () => {
    const sceneState = get().sceneState;
    if (!sceneState) return null;
    return buildSceneContext(sceneState);
  },
  eventMeta: (characterId: string) => ({
    id: crypto.randomUUID(),
    sessionId: 'local',
    actorId: characterId,
    targetId: characterId,
    createdAt: nowIso(),
    source: 'user',
  }),
  dispatch: (event) => {
    if (event.type === 'COMPANION_SUMMON') {
      const currentCompanionState = get().companionState;
      const result = processCompanionSummon(currentCompanionState, event);
      if (!result.applied) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: [result.error ?? 'Failed to summon companion.'],
        };
      }

      get().addCompanion(event.companion);

      const currentCombat = get().combatState;
      if (currentCombat) {
        const withCompanion = addParticipant(
          toEngineCombatState(currentCombat),
          companionToParticipant(event.companion),
          {},
        );
        get().setCombatState(toEncounterState(withCompanion));
      }

      return {
        character: get().activeCharacter,
        appliedCount: 1,
        failed: [],
      };
    }

    if (event.type === 'COMPANION_DISMISS') {
      const currentCompanionState = get().companionState;
      const result = processCompanionDismiss(currentCompanionState, event);
      if (!result.applied) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: [result.error ?? 'Failed to dismiss companion.'],
        };
      }
      get().removeCompanion(event.companionId);
      return {
        character: get().activeCharacter,
        appliedCount: 1,
        failed: [],
      };
    }

    if (event.type === 'COMPANION_LOYALTY_CHANGE') {
      const currentCompanionState = get().companionState;
      const result = processCompanionLoyaltyChange(currentCompanionState, event);
      if (!result.applied) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: [result.error ?? 'Failed to update companion loyalty.'],
        };
      }
      const updated = result.state.companions.find((companion) => companion.id === event.companionId);
      if (updated) {
        get().updateCompanion(updated);
      }
      return {
        character: get().activeCharacter,
        appliedCount: 1,
        failed: [],
      };
    }

    if (event.type === 'COMPANION_ACTION') {
      const currentCompanionState = get().companionState;
      const result = processCompanionAction(currentCompanionState, event);
      if (!result.applied) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: [result.error ?? 'Failed to resolve companion action.'],
        };
      }
      const updated = result.state.companions.find((companion) => companion.id === event.companionId);
      if (updated) {
        get().updateCompanion(updated);
      }
      if (result.emittedEvents.length) {
        result.emittedEvents.forEach((emitted) => {
          void get().dispatch(emitted);
        });
      }
      return {
        character: get().activeCharacter,
        appliedCount: 1 + result.emittedEvents.length,
        failed: [],
      };
    }

    if (event.type === 'PARTY_CHOICE_CREATED') {
      const partyState = get().partyChoiceState;
      const result = processPartyChoiceCreated(partyState, event);
      if (!result.applied) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: [result.error ?? 'Failed to create party choice.'],
        };
      }
      get().setActivePartyChoice(result.state.activeChoice as PartyChoice);
      return {
        character: get().activeCharacter,
        appliedCount: 1,
        failed: [],
      };
    }

    if (event.type === 'PARTY_VOTE_CAST') {
      const partyState = get().partyChoiceState;
      const currentVotes = partyState.activeChoice?.votes.length ?? 0;
      const playerCount = Math.max(currentVotes + 1, 1);
      const result = processPartyVoteCast(partyState, event, playerCount);
      if (!result.applied) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: [result.error ?? 'Failed to cast party vote.'],
        };
      }
      if (result.state.activeChoice) {
        get().setActivePartyChoice(result.state.activeChoice);
      }
      if (result.emittedEvents.length) {
        result.emittedEvents.forEach((emitted) => {
          void get().dispatch(emitted);
        });
      }
      return {
        character: get().activeCharacter,
        appliedCount: 1 + result.emittedEvents.length,
        failed: [],
      };
    }

    if (event.type === 'PARTY_CHOICE_RESOLVED') {
      const partyState = get().partyChoiceState;
      const result = processPartyChoiceResolved(partyState, event);
      if (!result.applied) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: [result.error ?? 'Failed to resolve party choice.'],
        };
      }
      set({ partyChoiceState: result.state });
      const responder = get().partyChoiceAiResponder;
      if (responder) {
        void responder(`Party selected option: ${event.resolvedChoiceId}`);
      }
      return {
        character: get().activeCharacter,
        appliedCount: 1,
        failed: [],
      };
    }

    if (event.type === 'SCENE_TRANSITION') {
      const sceneState = get().sceneState;
      if (!sceneState) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: ['No active scene in runtime store.'],
        };
      }
      const result = processSceneTransition(sceneState, event);
      if (!result.applied) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: [result.error ?? 'Failed to transition scene.'],
        };
      }
      get().setSceneState(result.scene);
      return {
        character: get().activeCharacter,
        appliedCount: 1,
        failed: [],
      };
    }

    if (event.type === 'SCENE_OBJECTIVE_UPDATE') {
      const sceneState = get().sceneState;
      if (!sceneState) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: ['No active scene in runtime store.'],
        };
      }
      const result = processObjectiveUpdate(sceneState, event);
      if (!result.applied) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: [result.error ?? 'Failed to update objective.'],
        };
      }
      get().setSceneState(result.scene);
      return {
        character: get().activeCharacter,
        appliedCount: 1,
        failed: [],
      };
    }

    if (event.type === 'THREAT_CLOCK_ADVANCE') {
      const sceneState = get().sceneState;
      if (!sceneState) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: ['No active scene in runtime store.'],
        };
      }
      const result = processThreatClockAdvance(sceneState, event);
      if (!result.applied) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: [result.error ?? 'Failed to advance threat clock.'],
        };
      }
      get().setSceneState(result.scene);
      return {
        character: get().activeCharacter,
        appliedCount: 1,
        failed: [],
      };
    }

    const currentCharacter = get().activeCharacter;
    if (!currentCharacter) {
      return {
        character: null,
        appliedCount: 0,
        failed: ['No active character in runtime store.'],
      };
    }

    const runtimeState = buildCharacterRuntimeState(currentCharacter);
    const queue = createEventQueueState([event]);
    const processed = processEventQueue(runtimeState, queue);
    const nextCharacter = processed.state.charactersById[currentCharacter.id] ?? currentCharacter;

    set({
      activeCharacter: nextCharacter,
      classRuntime: mapClassRuntime(nextCharacter),
      raceRuntime: mapRaceRuntime(nextCharacter),
      inventory: mapInventory(nextCharacter),
    });

    return {
      character: nextCharacter,
      appliedCount: processed.appliedEvents.length,
      failed: processed.failedEvents.map((item) => item.error),
    };
  },
}));
