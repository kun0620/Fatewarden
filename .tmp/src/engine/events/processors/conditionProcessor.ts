import type { Character } from '../../../types';
import { applyCondition, removeCondition } from '../../conditions/conditionEngine';
import type { ApplyConditionEvent, RemoveConditionEvent } from '../types';

export function applyConditionToCharacter(character: Character, event: ApplyConditionEvent): Character {
  return applyCondition(character, event.condition);
}

export function removeConditionFromCharacter(character: Character, event: RemoveConditionEvent): Character {
  return removeCondition(character, event.condition);
}
