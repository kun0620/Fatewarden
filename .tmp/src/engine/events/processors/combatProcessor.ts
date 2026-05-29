import {
  addParticipant,
  advanceTurn,
  createCombat,
  sortInitiativeOrder,
  startCombat,
  type CombatState as EngineCombatState,
} from '../../combat';
import type { Character, Combatant, EncounterState } from '../../../types';
import type {
  CombatAddParticipantEvent,
  CombatAdjustDeathSaveEvent,
  CombatAdvanceTurnEvent,
  CombatCreateEncounterEvent,
  CombatEndEncounterEvent,
  CombatSetInitiativeEvent,
  CombatSetTempHpEvent,
  CombatSortInitiativeEvent,
  GameEvent,
} from '../types';
import type { CompanionState } from '../../companion/companionTypes';

type CombatProcessorResult = {
  applied: boolean;
  combatState: EncounterState | null;
  error?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toCombatState(encounter: EncounterState, activeCharacter: Character): EngineCombatState {
  return {
    id: encounter.id,
    name: encounter.name,
    roomId: undefined,
    phase: encounter.isActive ? 'active' : 'setup',
    participants: encounter.combatants.map((combatant, index) => ({
      id: combatant.id,
      characterId: combatant.type === 'player' && combatant.id === `pc-${activeCharacter.id}` ? activeCharacter.id : undefined,
      name: combatant.name,
      type: combatant.type === 'enemy' ? 'monster' : 'player',
      initiativeScore: combatant.initiative,
      dexScore: 10,
      armorClass: combatant.armorClass,
      hitPoints: combatant.hitPoints,
      maxHitPoints: combatant.maxHitPoints,
      tempHitPoints: combatant.tempHitPoints,
      speed: 30,
      conditions: combatant.conditions,
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
  const orderedCombatants: Combatant[] = orderedParticipants.map((participant) => ({
    id: participant.id,
    name: participant.name,
    type: participant.type === 'player' ? 'player' : 'enemy',
    armorClass: participant.armorClass,
    hitPoints: participant.hitPoints,
    maxHitPoints: participant.maxHitPoints,
    tempHitPoints: participant.tempHitPoints,
    initiative: participant.initiativeScore ?? 0,
    conditions: [...participant.conditions],
    deathSaves: { successes: 0, failures: 0 },
  }));

  const activeIndex = combat.turn.activeParticipantId
    ? Math.max(0, orderedCombatants.findIndex((combatant) => combatant.id === combat.turn.activeParticipantId))
    : Math.max(0, Math.min(combat.turn.turnIndex, Math.max(0, orderedCombatants.length - 1)));

  return {
    id: combat.id,
    name: combat.name,
    round: combat.turn.round,
    activeIndex,
    isActive: combat.phase === 'active',
    combatants: orderedCombatants,
  };
}

export function processCombatCreateEncounter(event: CombatCreateEncounterEvent, runtimeCharactersById: Record<string, Character>): CombatProcessorResult {
  const initialCombat = createCombat(event.encounterName.trim() || 'Encounter');
  const activeCharacter = event.playerCharacter;
  const withPlayer = addParticipant(initialCombat, {
    id: `pc-${activeCharacter.id}`,
    characterId: activeCharacter.id,
    name: activeCharacter.name,
    type: 'player',
    initiativeScore: 0,
    dexScore: activeCharacter.abilities.dex,
    armorClass: activeCharacter.armorClass,
    hitPoints: activeCharacter.hitPoints,
    maxHitPoints: activeCharacter.maxHitPoints,
    tempHitPoints: 0,
    speed: activeCharacter.speed,
    conditions: [],
    status: 'active',
    joinedOrder: 0,
  }, runtimeCharactersById);
  return {
    applied: true,
    combatState: toEncounterState(startCombat(withPlayer, runtimeCharactersById)),
  };
}

export function processCombatAddParticipant(current: EncounterState | null, event: CombatAddParticipantEvent, activeCharacter: Character, runtimeCharactersById: Record<string, Character>): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  const participant = event.participant;
  if (current.combatants.some((combatant) => combatant.id === participant.id)) {
    return { applied: true, combatState: current };
  }
  const withParticipant = addParticipant(toCombatState(current, activeCharacter), {
    id: participant.id,
    characterId: participant.type === 'player' ? activeCharacter.id : undefined,
    name: participant.name,
    type: participant.type === 'enemy' ? 'monster' : 'player',
    initiativeScore: participant.initiative,
    dexScore: 10,
    armorClass: participant.armorClass,
    hitPoints: participant.hitPoints,
    maxHitPoints: participant.maxHitPoints,
    tempHitPoints: participant.tempHitPoints,
    speed: 30,
    conditions: participant.conditions,
    status: participant.hitPoints <= 0 ? 'unconscious' : 'active',
    joinedOrder: current.combatants.length,
  }, runtimeCharactersById);
  return { applied: true, combatState: toEncounterState(withParticipant) };
}

export function processCombatSetInitiative(current: EncounterState | null, event: CombatSetInitiativeEvent): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  return {
    applied: true,
    combatState: {
      ...current,
      combatants: current.combatants.map((combatant) =>
        combatant.id === event.combatantId ? { ...combatant, initiative: event.initiative } : combatant,
      ),
    },
  };
}

export function processCombatSortInitiative(current: EncounterState | null, activeCharacter: Character): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  const combat = toCombatState(current, activeCharacter);
  const orderedIds = sortInitiativeOrder(combat.participants);
  const sorted = {
    ...combat,
    initiativeOrder: orderedIds,
    turn: {
      ...combat.turn,
      turnIndex: 0,
      activeParticipantId: orderedIds[0] ?? null,
    },
  };
  return { applied: true, combatState: toEncounterState(sorted) };
}

export function processCombatAdvanceTurn(
  current: EncounterState | null,
  event: CombatAdvanceTurnEvent,
  activeCharacter: Character,
  runtimeCharactersById: Record<string, Character>,
  companionState?: CompanionState | null,
  dispatchEvent?: (event: GameEvent) => void,
): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  if (!current.combatants.length) return { applied: true, combatState: current };

  let nextCombat = toCombatState(current, activeCharacter);
  if (event.direction === -1) {
    const total = Math.max(1, nextCombat.initiativeOrder.length);
    for (let index = 0; index < total - 1; index += 1) {
      nextCombat = advanceTurn(nextCombat, runtimeCharactersById, companionState, dispatchEvent);
    }
  } else {
    nextCombat = advanceTurn(nextCombat, runtimeCharactersById, companionState, dispatchEvent);
  }
  return { applied: true, combatState: toEncounterState(nextCombat) };
}

export function processCombatSetTempHp(current: EncounterState | null, event: CombatSetTempHpEvent): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  return {
    applied: true,
    combatState: {
      ...current,
      combatants: current.combatants.map((combatant) =>
        combatant.id === event.combatantId
          ? { ...combatant, tempHitPoints: Math.max(0, event.tempHitPoints) }
          : combatant,
      ),
    },
  };
}

export function processCombatAdjustDeathSave(current: EncounterState | null, event: CombatAdjustDeathSaveEvent): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  return {
    applied: true,
    combatState: {
      ...current,
      combatants: current.combatants.map((combatant) => {
        if (combatant.id !== event.combatantId) return combatant;
        return {
          ...combatant,
          deathSaves: {
            ...combatant.deathSaves,
            [event.key]: clamp(combatant.deathSaves[event.key] + event.delta, 0, 3),
          },
        };
      }),
    },
  };
}

export function processCombatEndEncounter(_current: EncounterState | null, _event: CombatEndEncounterEvent): CombatProcessorResult {
  return { applied: true, combatState: null };
}
