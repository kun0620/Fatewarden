import type { AdvantageState } from '../shared/types';
import { applyAdvantage, applyDisadvantage } from './advantage';
import { rollD20 } from './dice';
import type { RollContext, RollResult } from './types';

function resolveProficiencyBonus(context: RollContext) {
  if (!context.isProficient) return 0;
  const pb = context.proficiencyBonus ?? 0;
  const multiplier = Math.max(1, context.expertiseMultiplier ?? 1);
  return pb * multiplier;
}

function buildModifierTotal(context: RollContext) {
  return (
    (context.abilityModifier ?? 0) +
    resolveProficiencyBonus(context) +
    (context.extraModifier ?? 0)
  );
}

function resolveD20WithAdvantage(
  advantageState: AdvantageState,
  rng?: () => number,
): { keptRoll: number; droppedRolls: number[] } {
  if (advantageState === 'normal') {
    return { keptRoll: rollD20(rng), droppedRolls: [] };
  }

  const first = rollD20(rng);
  const second = rollD20(rng);
  const resolution =
    advantageState === 'advantage'
      ? applyAdvantage(first, second)
      : applyDisadvantage(first, second);

  return {
    keptRoll: resolution.kept,
    droppedRolls: [...resolution.dropped],
  };
}

function performD20Roll(context: RollContext): RollResult {
  const advantageState = context.advantageState ?? 'normal';
  const { keptRoll, droppedRolls } = resolveD20WithAdvantage(advantageState, context.rng);
  const modifierTotal = buildModifierTotal(context);
  const total = keptRoll + modifierTotal;

  return {
    rollType: context.rollType,
    formula: `1d20${modifierTotal >= 0 ? '+' : ''}${modifierTotal}`,
    dice: {
      notation: '1d20',
      count: 1,
      sides: 20,
      modifier: 0,
      rolls: [keptRoll, ...droppedRolls],
      subtotal: keptRoll,
    },
    modifierTotal,
    keptRoll,
    droppedRolls,
    outcome: {
      total,
      natural: keptRoll,
      isCriticalSuccess: keptRoll === 20,
      isCriticalFailure: keptRoll === 1,
    },
    context: {
      rollType: context.rollType,
      abilityModifier: context.abilityModifier,
      proficiencyBonus: context.proficiencyBonus,
      isProficient: context.isProficient,
      expertiseMultiplier: context.expertiseMultiplier,
      extraModifier: context.extraModifier,
      advantageState,
    },
  };
}

export function performAbilityCheck(context: Omit<RollContext, 'rollType'>): RollResult {
  return performD20Roll({ ...context, rollType: 'ability_check' });
}

export function performSavingThrow(context: Omit<RollContext, 'rollType'>): RollResult {
  return performD20Roll({ ...context, rollType: 'saving_throw' });
}

export function performSkillCheck(context: Omit<RollContext, 'rollType'>): RollResult {
  return performD20Roll({ ...context, rollType: 'skill_check' });
}

export function performAttackRoll(context: Omit<RollContext, 'rollType'>): RollResult {
  return performD20Roll({ ...context, rollType: 'attack_roll' });
}
