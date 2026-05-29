import type { Character } from '../../types';
import { calculateMovementSpeed } from '../races/movement';
import { getInventoryState } from './inventoryEngine';

export type EncumbranceTier = 'none' | 'encumbered' | 'heavily_encumbered' | 'over_capacity';

export type EncumbranceResult = {
  totalWeight: number;
  carryCapacity: number;
  pushDragLift: number;
  tier: EncumbranceTier;
  movementPenalty: number;
  effectiveSpeed: number;
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

export function calculateCarryWeight(character: Character) {
  const inventory = getInventoryState(character);
  return inventory.items.reduce((total, item) => total + (item.weight * item.quantity), 0);
}

export function calculateEncumbrance(character: Character): EncumbranceResult {
  const strScore = clamp(character.abilities.str, 1, 30);
  const totalWeight = calculateCarryWeight(character);
  const carryCapacity = strScore * 15;
  const pushDragLift = carryCapacity * 2;
  const lightThreshold = strScore * 5;
  const heavyThreshold = strScore * 10;

  let tier: EncumbranceTier = 'none';
  let movementPenalty = 0;

  if (totalWeight > carryCapacity) {
    tier = 'over_capacity';
    movementPenalty = -20;
  } else if (totalWeight > heavyThreshold) {
    tier = 'heavily_encumbered';
    movementPenalty = -20;
  } else if (totalWeight > lightThreshold) {
    tier = 'encumbered';
    movementPenalty = -10;
  }

  const effectiveSpeed = Math.max(
    0,
    calculateMovementSpeed(character, {
      externalBonus: movementPenalty,
    }),
  );

  return {
    totalWeight,
    carryCapacity,
    pushDragLift,
    tier,
    movementPenalty,
    effectiveSpeed,
  };
}
