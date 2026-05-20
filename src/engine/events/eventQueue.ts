import type { GameEvent } from './types';
import { applyConditionToCharacter, removeConditionFromCharacter } from './processors/conditionProcessor';
import { applyDamageToCharacter } from './processors/damageProcessor';
import {
  processLevelUp,
  processRecoverResource,
  processSpendResource,
} from './processors/classProcessor';
import {
  processResetRacialSpells,
  processUseRacialSpell,
} from './processors/raceProcessor';
import {
  processAddItem,
  processAttuneItem,
  processConsumeItem,
  processEquipItem,
  processGiveItem,
  processRemoveItem,
  processUnequipItem,
  processUpdateCurrency,
  processUpdateQuantity,
} from './processors/inventoryProcessor';
import { applyLongRestToCharacter, applyShortRestToCharacter, recoverCharacterHp } from './processors/recoveryProcessor';
import type { Character } from '../../types';

export interface EventRuntimeState {
  readonly charactersById: Readonly<Record<string, Character>>;
}

export interface EventQueueState {
  readonly pending: readonly GameEvent[];
  readonly processing: readonly GameEvent[];
  readonly completed: readonly GameEvent[];
  readonly failed: readonly GameEvent[];
}

export interface FailedEventResult {
  readonly event: GameEvent;
  readonly error: string;
}

export interface ProcessEventResult {
  readonly state: EventRuntimeState;
  readonly appliedEvents: readonly GameEvent[];
  readonly failedEvents: readonly FailedEventResult[];
}

export interface ProcessQueueResult {
  readonly state: EventRuntimeState;
  readonly queue: EventQueueState;
  readonly appliedEvents: readonly GameEvent[];
  readonly failedEvents: readonly FailedEventResult[];
}

export function createEventQueueState(initialPending: readonly GameEvent[] = []): EventQueueState {
  return {
    pending: [...initialPending],
    processing: [],
    completed: [],
    failed: [],
  };
}

export function enqueueEvent(queue: EventQueueState, event: GameEvent): EventQueueState {
  return {
    ...queue,
    pending: [...queue.pending, event],
  };
}

export function dequeueEvent(queue: EventQueueState): { queue: EventQueueState; event: GameEvent | null } {
  if (queue.pending.length === 0) {
    return { queue, event: null };
  }

  const [event, ...remaining] = queue.pending;
  return {
    queue: {
      ...queue,
      pending: remaining,
      processing: [...queue.processing, event],
    },
    event,
  };
}

function ensureTargetCharacter(state: EventRuntimeState, event: GameEvent): Character {
  const targetId = 'targetId' in event
    ? event.targetId
    : 'characterId' in event
      ? event.characterId
      : undefined;
  if (!targetId) {
    throw new Error(`Event ${event.id} is missing targetId`);
  }
  const character = state.charactersById[targetId];
  if (!character) {
    throw new Error(`Character ${targetId} not found`);
  }
  return character;
}

function withUpdatedCharacter(state: EventRuntimeState, character: Character): EventRuntimeState {
  return {
    ...state,
    charactersById: {
      ...state.charactersById,
      [character.id]: character,
    },
  };
}

function markDone(queue: EventQueueState, event: GameEvent): EventQueueState {
  return {
    ...queue,
    processing: queue.processing.filter((current) => current.id !== event.id),
    completed: [...queue.completed, event],
  };
}

function markFailed(queue: EventQueueState, event: GameEvent): EventQueueState {
  return {
    ...queue,
    processing: queue.processing.filter((current) => current.id !== event.id),
    failed: [...queue.failed, event],
  };
}

export function processEvent(state: EventRuntimeState, event: GameEvent): ProcessEventResult {
  try {
    const current = ensureTargetCharacter(state, event);
    let nextCharacter: Character = current;

    switch (event.type) {
      case 'apply_damage':
        nextCharacter = applyDamageToCharacter(current, event);
        break;
      case 'recover_hp':
        nextCharacter = recoverCharacterHp(current, event);
        break;
      case 'apply_condition':
        nextCharacter = applyConditionToCharacter(current, event);
        break;
      case 'remove_condition':
        nextCharacter = removeConditionFromCharacter(current, event);
        break;
      case 'long_rest':
        nextCharacter = applyLongRestToCharacter(current, event);
        break;
      case 'short_rest':
        nextCharacter = applyShortRestToCharacter(current, event);
        break;
      case 'add_item': {
        const result = processAddItem(current, event);
        if (!result.applied) throw new Error(result.error ?? 'Failed to add item');
        nextCharacter = result.character;
        break;
      }
      case 'give_item': {
        const result = processGiveItem(current, event);
        if (!result.applied) throw new Error(result.error ?? 'Failed to give item');
        nextCharacter = result.character;
        break;
      }
      case 'remove_item': {
        const result = processRemoveItem(current, event);
        if (!result.applied) throw new Error(result.error ?? 'Failed to remove item');
        nextCharacter = result.character;
        break;
      }
      case 'consume_item': {
        const result = processConsumeItem(current, event);
        if (!result.applied) throw new Error(result.error ?? 'Failed to consume item');
        nextCharacter = result.character;
        break;
      }
      case 'equip_item': {
        const result = processEquipItem(current, event);
        if (!result.applied) throw new Error(result.error ?? 'Failed to equip item');
        nextCharacter = result.character;
        break;
      }
      case 'unequip_item': {
        const result = processUnequipItem(current, event);
        if (!result.applied) throw new Error(result.error ?? 'Failed to unequip item');
        nextCharacter = result.character;
        break;
      }
      case 'attune_item': {
        const result = processAttuneItem(current, event);
        if (!result.applied) throw new Error(result.error ?? 'Failed to attune item');
        nextCharacter = result.character;
        break;
      }
      case 'update_currency': {
        const result = processUpdateCurrency(current, event);
        if (!result.applied) throw new Error(result.error ?? 'Failed to update currency');
        nextCharacter = result.character;
        break;
      }
      case 'update_quantity': {
        const result = processUpdateQuantity(current, event);
        if (!result.applied) throw new Error(result.error ?? 'Failed to update quantity');
        nextCharacter = result.character;
        break;
      }
      case 'SPEND_RESOURCE': {
        const result = processSpendResource(current, event);
        if (!result.applied) throw new Error(result.error ?? 'Failed to spend resource');
        nextCharacter = result.character;
        break;
      }
      case 'RECOVER_RESOURCE': {
        const result = processRecoverResource(current, event);
        if (!result.applied) throw new Error(result.error ?? 'Failed to recover resources');
        nextCharacter = result.character;
        break;
      }
      case 'LEVEL_UP': {
        const result = processLevelUp(current, event);
        if (!result.applied) throw new Error(result.error ?? 'Failed to level up');
        nextCharacter = result.character;
        break;
      }
      case 'USE_RACIAL_SPELL': {
        const result = processUseRacialSpell(current, event);
        if (!result.applied) throw new Error(result.error ?? 'Failed to use racial spell');
        nextCharacter = result.character;
        break;
      }
      case 'RESET_RACIAL_SPELLS': {
        const result = processResetRacialSpells(current, event);
        if (!result.applied) throw new Error(result.error ?? 'Failed to reset racial spells');
        nextCharacter = result.character;
        break;
      }
      default:
        return {
          state,
          appliedEvents: [],
          failedEvents: [{ event, error: `Unsupported event type: ${(event as { type: string }).type}` }],
        };
    }

    return {
      state: withUpdatedCharacter(state, nextCharacter),
      appliedEvents: [event],
      failedEvents: [],
    };
  } catch (error) {
    return {
      state,
      appliedEvents: [],
      failedEvents: [{ event, error: error instanceof Error ? error.message : 'Unknown event error' }],
    };
  }
}

export function processEventQueue(initialState: EventRuntimeState, initialQueue: EventQueueState): ProcessQueueResult {
  let state = initialState;
  let queue = initialQueue;
  const appliedEvents: GameEvent[] = [];
  const failedEvents: FailedEventResult[] = [];

  while (queue.pending.length > 0) {
    const dequeued = dequeueEvent(queue);
    queue = dequeued.queue;
    if (!dequeued.event) break;

    const result = processEvent(state, dequeued.event);
    state = result.state;
    appliedEvents.push(...result.appliedEvents);
    failedEvents.push(...result.failedEvents);
    queue = result.failedEvents.length > 0 ? markFailed(queue, dequeued.event) : markDone(queue, dequeued.event);
  }

  return {
    state,
    queue,
    appliedEvents,
    failedEvents,
  };
}
