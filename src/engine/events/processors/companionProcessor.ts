import {
  adjustLoyalty,
  resolveCompanionAction,
  type CompanionActionResult,
} from '../../companion/companionEngine';
import type { CompanionState } from '../../companion/companionTypes';
import type {
  ApplyDamageEvent,
  CompanionActionEvent,
  CompanionDismissEvent,
  CompanionLoyaltyChangeEvent,
  CompanionSummonEvent,
  GameEvent,
  RecoverHpEvent,
} from '../types';

export type CompanionEventResult = {
  state: CompanionState;
  applied: boolean;
  emittedEvents: GameEvent[];
  actionResult?: CompanionActionResult;
  logs?: string[];
  error?: string;
};

function findCompanion(state: CompanionState, companionId: string) {
  return state.companions.find((companion) => companion.id === companionId) ?? null;
}

function mapTargetsFromState(state: CompanionState, targetIds: string[]) {
  const ids = new Set(targetIds);
  return state.companions
    .filter((companion) => ids.has(companion.id))
    .map((companion) => ({
      id: companion.id,
      hitPoints: companion.characterSnapshot.hitPoints,
      maxHitPoints: companion.characterSnapshot.maxHitPoints,
      armorClass: companion.characterSnapshot.armorClass,
      abilities: companion.characterSnapshot.abilities,
    }));
}

function buildDamageEvent(event: CompanionActionEvent, result: CompanionActionResult): ApplyDamageEvent | null {
  if (result.actionType !== 'attack' || !result.targetId || typeof result.value !== 'number') return null;
  return {
    id: crypto.randomUUID(),
    type: 'apply_damage',
    sessionId: event.sessionId,
    actorId: event.actorId,
    targetId: result.targetId,
    createdAt: new Date().toISOString(),
    source: event.source ?? 'system',
    correlationId: event.correlationId,
    amount: Math.max(0, Math.floor(result.value)),
    damageType: 'bludgeoning',
    notes: result.description,
  };
}

function buildRecoverEvent(event: CompanionActionEvent, result: CompanionActionResult): RecoverHpEvent | null {
  if (result.actionType !== 'heal' || !result.targetId || typeof result.value !== 'number') return null;
  return {
    id: crypto.randomUUID(),
    type: 'recover_hp',
    sessionId: event.sessionId,
    actorId: event.actorId,
    targetId: result.targetId,
    createdAt: new Date().toISOString(),
    source: event.source ?? 'system',
    correlationId: event.correlationId,
    amount: Math.max(0, Math.floor(result.value)),
    recoveryKind: 'healing',
    notes: result.description,
  };
}

export function processCompanionSummon(state: CompanionState, event: CompanionSummonEvent): CompanionEventResult {
  if (findCompanion(state, event.companion.id)) {
    return {
      state,
      applied: false,
      emittedEvents: [],
      error: `Companion already exists: ${event.companion.id}`,
    };
  }

  return {
    state: {
      ...state,
      companions: [...state.companions, event.companion],
    },
    applied: true,
    emittedEvents: [],
    logs: [`${event.companion.name} joined the party.`],
  };
}

export function processCompanionDismiss(state: CompanionState, event: CompanionDismissEvent): CompanionEventResult {
  const existing = findCompanion(state, event.companionId);
  if (!existing) {
    return {
      state,
      applied: false,
      emittedEvents: [],
      error: `Companion not found: ${event.companionId}`,
    };
  }

  return {
    state: {
      ...state,
      companions: state.companions.filter((companion) => companion.id !== event.companionId),
    },
    applied: true,
    emittedEvents: [],
    logs: [`${existing.name} was dismissed.`],
  };
}

export function processCompanionLoyaltyChange(
  state: CompanionState,
  event: CompanionLoyaltyChangeEvent,
): CompanionEventResult {
  const existing = findCompanion(state, event.companionId);
  if (!existing) {
    return {
      state,
      applied: false,
      emittedEvents: [],
      error: `Companion not found: ${event.companionId}`,
    };
  }

  const updated = adjustLoyalty(existing, event.delta);

  return {
    state: {
      ...state,
      companions: state.companions.map((companion) =>
        companion.id === event.companionId ? updated : companion,
      ),
    },
    applied: true,
    emittedEvents: [],
    logs: [`${updated.name} loyalty ${event.delta >= 0 ? 'increased' : 'decreased'}: ${event.reason}`],
  };
}

export function processCompanionAction(state: CompanionState, event: CompanionActionEvent): CompanionEventResult {
  const companion = findCompanion(state, event.companionId);
  if (!companion) {
    return {
      state,
      applied: false,
      emittedEvents: [],
      error: `Companion not found: ${event.companionId}`,
    };
  }

  const targets = mapTargetsFromState(state, event.targets);
  const actionResult = resolveCompanionAction(companion, targets);
  const emittedEvents: GameEvent[] = [];

  const damageEvent = buildDamageEvent(event, actionResult);
  if (damageEvent) emittedEvents.push(damageEvent);

  const recoverEvent = buildRecoverEvent(event, actionResult);
  if (recoverEvent) emittedEvents.push(recoverEvent);

  return {
    state,
    applied: true,
    emittedEvents,
    actionResult,
    logs: [actionResult.description],
  };
}
