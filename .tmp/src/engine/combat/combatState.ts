import type { CombatParticipant, CombatState } from './combatTypes';
import { sortInitiativeOrder } from './initiative';
import { rehydrateParticipant } from '../inventory/inventoryEngine';
import type { Character } from '../../types';
import type { CompanionState } from '../companion/companionTypes';
import { companionToCombatParticipant } from '../companion/companionEngine';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function normalizeParticipant(participant: CombatParticipant, joinedOrder: number): CombatParticipant {
  const maxHitPoints = Math.max(1, participant.maxHitPoints);
  const hitPoints = clamp(participant.hitPoints, 0, maxHitPoints);
  const status =
    participant.status === 'dead' || hitPoints <= 0
      ? participant.status === 'dead'
        ? 'dead'
        : 'unconscious'
      : participant.status;

  return {
    ...participant,
    maxHitPoints,
    hitPoints,
    tempHitPoints: Math.max(0, participant.tempHitPoints),
    speed: Math.max(0, participant.speed),
    joinedOrder,
    status,
  };
}

function rehydrateParticipants(
  participants: readonly CombatParticipant[],
  charactersById: Record<string, Character>,
): CombatParticipant[] {
  return participants.map((participant) => {
    if (!participant.characterId) return participant;
    const linkedCharacter = charactersById[participant.characterId];
    if (!linkedCharacter) return participant;
    return rehydrateParticipant(participant, linkedCharacter);
  });
}

export function createCombat(name: string, roomId?: string): CombatState {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    roomId,
    name: name.trim() || 'Encounter',
    phase: 'setup',
    participants: [],
    initiativeOrder: [],
    turn: {
      round: 1,
      turnIndex: 0,
      activeParticipantId: null,
      hasStarted: false,
    },
    createdAt: now,
    startedAt: null,
    endedAt: null,
  };
}

export function addParticipant(
  combat: CombatState,
  participant: CombatParticipant,
  charactersById: Record<string, Character>,
): CombatState {
  const nextParticipant = normalizeParticipant(participant, combat.participants.length);
  const participants = rehydrateParticipants([...combat.participants, nextParticipant], charactersById);
  return {
    ...combat,
    participants,
    initiativeOrder: sortInitiativeOrder(participants),
  };
}

export function removeParticipant(combat: CombatState, participantId: string): CombatState {
  const participants = combat.participants
    .filter((participant) => participant.id !== participantId)
    .map((participant, index) => ({ ...participant, joinedOrder: index }));
  const initiativeOrder = sortInitiativeOrder(participants);
  const safeTurnIndex = initiativeOrder.length ? Math.min(combat.turn.turnIndex, initiativeOrder.length - 1) : 0;
  const activeParticipantId = initiativeOrder.length ? initiativeOrder[safeTurnIndex] : null;

  return {
    ...combat,
    participants,
    initiativeOrder,
    turn: {
      ...combat.turn,
      turnIndex: safeTurnIndex,
      activeParticipantId,
    },
  };
}

export function startCombat(
  combat: CombatState,
  charactersById: Record<string, Character>,
  companionState?: CompanionState | null,
): CombatState {
  return startCombatWithCompanions(combat, charactersById, companionState);
}

export function startCombatWithCompanions(
  combat: CombatState,
  charactersById: Record<string, Character>,
  companionState?: CompanionState | null,
): CombatState {
  const companionParticipants =
    companionState?.companions
      .filter((companion) => companion.isActive)
      .map((companion) => companionToCombatParticipant(companion)) ?? [];

  const mergedParticipants = [...combat.participants];
  companionParticipants.forEach((companionParticipant) => {
    if (!mergedParticipants.some((participant) => participant.id === companionParticipant.id)) {
      mergedParticipants.push(companionParticipant);
    }
  });

  const participants = rehydrateParticipants(mergedParticipants, charactersById);
  const initiativeOrder = sortInitiativeOrder(participants);
  const now = new Date().toISOString();
  return {
    ...combat,
    phase: 'active',
    participants,
    initiativeOrder,
    startedAt: combat.startedAt ?? now,
    endedAt: null,
    turn: {
      round: 1,
      turnIndex: 0,
      activeParticipantId: initiativeOrder[0] ?? null,
      hasStarted: true,
    },
  };
}

export function endCombat(combat: CombatState): CombatState {
  return {
    ...combat,
    phase: 'ended',
    endedAt: new Date().toISOString(),
    turn: {
      ...combat.turn,
      activeParticipantId: null,
      hasStarted: false,
    },
  };
}
