import type { GameEvent } from '../../engine/events/types';
import type { Character } from '../../types';

type CombatDispatchResult = {
  character: Character | null;
  appliedCount: number;
  failed: string[];
};

export type CombatDispatch = (event: GameEvent) => CombatDispatchResult;

type CombatActionContext = {
  dispatch: CombatDispatch;
  character: Character;
  encounterId: string;
};

type CombatActionResult = CombatDispatchResult;

function eventMeta(character: Character, sessionId: string) {
  return {
    id: crypto.randomUUID(),
    sessionId,
    actorId: character.id,
    targetId: character.id,
    createdAt: new Date().toISOString(),
    source: 'user' as const,
  };
}

function execute(dispatch: CombatDispatch, event: GameEvent): CombatActionResult {
  const result = dispatch(event);
  if (result.failed.length) {
    throw new Error(result.failed.join(', '));
  }
  return result;
}

export const combatActions = {
  createEncounter({
    dispatch,
    character,
    encounterName,
  }: {
    dispatch: CombatDispatch;
    character: Character;
    encounterName: string;
  }) {
    return execute(dispatch, {
      ...eventMeta(character, 'local'),
      type: 'COMBAT_CREATE_ENCOUNTER',
      encounterName,
      playerCharacter: character,
    });
  },

  rollInitiative({
    dispatch,
    character,
    encounterId,
    combatantId,
  }: CombatActionContext & {
    combatantId?: string;
  }) {
    return execute(dispatch, {
      ...eventMeta(character, encounterId),
      type: 'COMBAT_ROLL_INITIATIVE',
      ...(combatantId ? { combatantId } : {}),
    });
  },

  sortInitiative({ dispatch, character, encounterId }: CombatActionContext) {
    return execute(dispatch, {
      ...eventMeta(character, encounterId),
      type: 'COMBAT_SORT_INITIATIVE',
    });
  },

  nextTurn({
    dispatch,
    character,
    encounterId,
    direction = 1,
  }: CombatActionContext & {
    direction?: 1 | -1;
  }) {
    return execute(dispatch, {
      ...eventMeta(character, encounterId),
      type: 'COMBAT_ADVANCE_TURN',
      direction,
    });
  },

  applyDamage({
    dispatch,
    character,
    encounterId,
    targetId,
    amount,
    damageType,
  }: CombatActionContext & {
    targetId: string;
    amount: number;
    damageType?: string;
  }) {
    return execute(dispatch, {
      ...eventMeta(character, encounterId),
      type: 'apply_damage',
      targetId,
      amount,
      damageType,
    });
  },

  heal({
    dispatch,
    character,
    encounterId,
    targetId,
    amount,
  }: CombatActionContext & {
    targetId: string;
    amount: number;
  }) {
    return execute(dispatch, {
      ...eventMeta(character, encounterId),
      type: 'recover_hp',
      targetId,
      amount,
      recoveryKind: 'healing',
    });
  },

  endEncounter({
    dispatch,
    character,
    encounterId,
    lootSummary,
  }: CombatActionContext & {
    lootSummary?: string;
  }) {
    return execute(dispatch, {
      ...eventMeta(character, encounterId),
      type: 'COMBAT_END_ENCOUNTER',
      lootSummary,
    });
  },
};
