import type { CombatParticipant, CombatState } from './combatTypes';
import { rehydrateParticipant } from '../inventory/inventoryEngine';
import type { Character } from '../../types';
import type { CompanionState } from '../companion/companionTypes';
import type { CompanionActionEvent, GameEvent } from '../events/types';

function isSkippable(participant: CombatParticipant) {
  return participant.status === 'dead' || participant.status === 'unconscious' || participant.status === 'removed';
}

function getParticipantById(combat: CombatState, participantId: string | null) {
  if (!participantId) return null;
  return combat.participants.find((participant) => participant.id === participantId) ?? null;
}

function findNextTurnIndex(combat: CombatState, fromIndex: number): number {
  const total = combat.initiativeOrder.length;
  if (total === 0) return 0;

  for (let offset = 1; offset <= total; offset += 1) {
    const candidateIndex = (fromIndex + offset) % total;
    const candidateId = combat.initiativeOrder[candidateIndex];
    const participant = getParticipantById(combat, candidateId);
    if (participant && !isSkippable(participant)) {
      return candidateIndex;
    }
  }

  return fromIndex;
}

export function getCurrentTurn(combat: CombatState) {
  return getParticipantById(combat, combat.turn.activeParticipantId);
}

export function nextRound(combat: CombatState): CombatState {
  return {
    ...combat,
    turn: {
      ...combat.turn,
      round: combat.turn.round + 1,
    },
  };
}

export function advanceTurn(
  combat: CombatState,
  charactersById: Record<string, Character>,
  companionState?: CompanionState | null,
  dispatchEvent?: EventDispatcher,
): CombatState {
  return advanceTurnWithCompanionActions(combat, charactersById, companionState, dispatchEvent);
}

type EventDispatcher = (event: GameEvent) => void;

function buildCompanionActionTargets(combat: CombatState, companionId: string) {
  return combat.participants
    .filter((participant) => participant.id !== companionId)
    .filter((participant) => participant.status !== 'dead' && participant.status !== 'removed')
    .map((participant) => participant.id);
}

export function advanceTurnWithCompanionActions(
  combat: CombatState,
  charactersById: Record<string, Character>,
  companionState?: CompanionState | null,
  dispatchEvent?: EventDispatcher,
  remainingAutoSteps = combat.initiativeOrder.length,
): CombatState {
  if (combat.phase !== 'active' || combat.initiativeOrder.length === 0) {
    return combat;
  }
  if (remainingAutoSteps <= 0) {
    return combat;
  }

  const participants = combat.participants.map((participant) => {
    if (!participant.characterId) return participant;
    const linkedCharacter = charactersById[participant.characterId];
    if (!linkedCharacter) return participant;
    return rehydrateParticipant(participant, linkedCharacter);
  });

  const hydratedCombat: CombatState = {
    ...combat,
    participants,
  };

  const currentIndex = Math.max(0, Math.min(hydratedCombat.turn.turnIndex, hydratedCombat.initiativeOrder.length - 1));
  const nextIndex = findNextTurnIndex(hydratedCombat, currentIndex);
  const wraps = nextIndex < currentIndex;
  const round = wraps ? hydratedCombat.turn.round + 1 : hydratedCombat.turn.round;

  const nextCombat = {
    ...hydratedCombat,
    turn: {
      ...hydratedCombat.turn,
      round,
      turnIndex: nextIndex,
      activeParticipantId: hydratedCombat.initiativeOrder[nextIndex] ?? null,
      hasStarted: true,
    },
  };

  const activeParticipant = getParticipantById(nextCombat, nextCombat.turn.activeParticipantId);
  if (activeParticipant?.type !== 'companion' || !dispatchEvent || !companionState) {
    return nextCombat;
  }

  const companion = companionState.companions.find((item) => item.id === activeParticipant.id && item.isActive);
  if (!companion) return nextCombat;

  const event: CompanionActionEvent = {
    id: crypto.randomUUID(),
    type: 'COMPANION_ACTION',
    sessionId: nextCombat.roomId ?? combat.roomId ?? 'local',
    actorId: companion.ownerId,
    targetId: activeParticipant.id,
    createdAt: new Date().toISOString(),
    source: 'system',
    companionId: companion.id,
    targets: buildCompanionActionTargets(nextCombat, companion.id),
  };

  dispatchEvent(event);

  // Companion action is handled by store dispatch; turn engine only advances flow.
  const afterCompanionTurn = {
    ...nextCombat,
    turn: {
      ...nextCombat.turn,
      turnIndex: nextIndex,
      activeParticipantId: nextCombat.initiativeOrder[nextIndex] ?? null,
    },
  };

  return advanceTurnWithCompanionActions(
    afterCompanionTurn,
    charactersById,
    companionState,
    dispatchEvent,
    remainingAutoSteps - 1,
  );
}
