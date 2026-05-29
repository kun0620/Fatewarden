import type { Character } from '../../../types';
import { applyLongRest, applyShortRest, recoverHitPoints } from '../../character/rest';
import type { LongRestEvent, RecoverHpEvent, ShortRestEvent } from '../types';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

export function recoverCharacterHp(character: Character, event: RecoverHpEvent): Character {
  const amount = clamp(event.amount, 0, Number.MAX_SAFE_INTEGER);
  return recoverHitPoints(character, amount);
}

export function applyLongRestToCharacter(character: Character, _event: LongRestEvent): Character {
  return applyLongRest(character);
}

export function applyShortRestToCharacter(character: Character, event: ShortRestEvent): Character {
  const hitDiceSpent = clamp(event.hitDiceSpent, 0, Math.max(0, character.hitDice));
  return applyShortRest(character, hitDiceSpent);
}
