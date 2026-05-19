import { getAbilityModifier } from '../character/modifiers';
import type { CombatParticipant } from './combatTypes';

export interface InitiativeRollResult {
  readonly participantId: string;
  readonly roll: number;
  readonly dexModifier: number;
  readonly total: number;
}

function rollD20(rng?: () => number) {
  const random = rng ? rng() : Math.random();
  return Math.floor(random * 20) + 1;
}

export function rollInitiative(participant: CombatParticipant, rng?: () => number): InitiativeRollResult {
  const roll = rollD20(rng);
  const dexModifier = getAbilityModifier(participant.dexScore);
  return {
    participantId: participant.id,
    roll,
    dexModifier,
    total: roll + dexModifier,
  };
}

export function sortInitiativeOrder(participants: readonly CombatParticipant[]): string[] {
  return [...participants]
    .sort((left, right) => {
      const leftScore = left.initiativeScore ?? Number.NEGATIVE_INFINITY;
      const rightScore = right.initiativeScore ?? Number.NEGATIVE_INFINITY;
      if (rightScore !== leftScore) return rightScore - leftScore;

      if (right.dexScore !== left.dexScore) return right.dexScore - left.dexScore;

      if (left.type !== right.type) {
        if (left.type === 'player') return -1;
        if (right.type === 'player') return 1;
      }

      if (left.joinedOrder !== right.joinedOrder) return left.joinedOrder - right.joinedOrder;
      return left.id.localeCompare(right.id);
    })
    .map((participant) => participant.id);
}
