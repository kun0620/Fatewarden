import type { Character } from '../../types';
import { getConditionEffects } from '../conditions/conditionEngine';
import { getPassiveRaceEffects } from './traitEngine';

export type MovementContext = {
  armorType?: 'none' | 'light' | 'medium' | 'heavy';
  armorStrengthRequirementMet?: boolean;
  externalBonus?: number;
};

export type MovementBreakdown = {
  base: number;
  racialBonus: number;
  racialMultiplier: number;
  armorPenalty: number;
  conditionMultiplier: number;
  conditionOverride?: number;
  finalSpeed: number;
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function getArmorPenalty(context: MovementContext) {
  if (context.armorType !== 'heavy') return 0;
  if (context.armorStrengthRequirementMet === false) return -10;
  return 0;
}

export function applyMovementModifiers(baseSpeed: number, context: MovementContext, character: Character) {
  const raceEffects = getPassiveRaceEffects(character);
  const conditionEffects = getConditionEffects(character);
  const armorPenalty = getArmorPenalty(context);
  const externalBonus = Number.isFinite(context.externalBonus) ? Math.trunc(context.externalBonus as number) : 0;

  const preConditionBase = Math.max(0, baseSpeed + raceEffects.movementBonus + armorPenalty + externalBonus);
  const afterRaceMultiplier = Math.floor(preConditionBase * raceEffects.movementMultiplier);
  const conditionMultiplier = conditionEffects.movement.speedMultiplier ?? 1;
  const conditionOverride = conditionEffects.movement.speedOverride;

  const finalSpeed = typeof conditionOverride === 'number'
    ? clamp(conditionOverride, 0, 999)
    : clamp(Math.floor(afterRaceMultiplier * conditionMultiplier), 0, 999);

  return {
    base: baseSpeed,
    racialBonus: raceEffects.movementBonus,
    racialMultiplier: raceEffects.movementMultiplier,
    armorPenalty,
    conditionMultiplier,
    conditionOverride,
    finalSpeed,
  } satisfies MovementBreakdown;
}

export function calculateMovementSpeed(character: Character, context: MovementContext = {}) {
  const baseSpeed = Math.max(0, Math.trunc(character.speed || 0));
  return applyMovementModifiers(baseSpeed, context, character).finalSpeed;
}
