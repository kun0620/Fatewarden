import type { Character } from '../../../types';
import type { ApplyDamageEvent } from '../types';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

export function applyDamageToCharacter(character: Character, event: ApplyDamageEvent): Character {
  const amount = clamp(event.amount, 0, Number.MAX_SAFE_INTEGER);
  if (amount <= 0) return character;

  return {
    ...character,
    hitPoints: clamp(character.hitPoints - amount, 0, Math.max(1, character.maxHitPoints)),
  };
}
