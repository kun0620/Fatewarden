import type { AbilityKey, Character } from '../../types';
import { conditionEffects, getExhaustionEffects, type ConditionEffect, type MovementEffect } from './effects';
import { normalizeConditionId, type ConditionId } from './conditions';

export interface CombinedConditionEffects {
  readonly activeConditionIds: readonly ConditionId[];
  readonly penalties: Readonly<Partial<Record<AbilityKey, number>>>;
  readonly checkDisadvantage: readonly string[];
  readonly checkAdvantage: readonly string[];
  readonly attackDisadvantage: boolean;
  readonly attackAdvantageAgainstTarget: boolean;
  readonly incomingAttackAdvantage: boolean;
  readonly incomingAttackDisadvantage: boolean;
  readonly saveDisadvantage: readonly AbilityKey[];
  readonly autoFailSaves: readonly AbilityKey[];
  readonly disabledActions: readonly string[];
  readonly movement: MovementEffect;
  readonly exhaustion: ReturnType<typeof getExhaustionEffects>;
}

function unique(values: readonly string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function mergePenalties(effects: readonly ConditionEffect[]): Partial<Record<AbilityKey, number>> {
  return effects.reduce<Partial<Record<AbilityKey, number>>>((acc, effect) => {
    Object.entries(effect.penalties).forEach(([ability, value]) => {
      if (typeof value !== 'number') return;
      const key = ability as AbilityKey;
      acc[key] = (acc[key] ?? 0) + value;
    });
    return acc;
  }, {});
}

function mergeMovement(effects: readonly ConditionEffect[]): MovementEffect {
  const speedOverrideCandidates = effects
    .map((effect) => effect.movement.speedOverride)
    .filter((value): value is number => typeof value === 'number');

  const speedMultiplierValues = effects
    .map((effect) => effect.movement.speedMultiplier)
    .filter((value): value is number => typeof value === 'number');

  return {
    speedOverride: speedOverrideCandidates.length ? Math.min(...speedOverrideCandidates) : undefined,
    speedMultiplier: speedMultiplierValues.length ? Math.min(...speedMultiplierValues) : undefined,
    cannotMoveCloser: effects.some((effect) => effect.movement.cannotMoveCloser),
    crawlOnly: effects.some((effect) => effect.movement.crawlOnly),
  };
}

function toConditionId(value: string): ConditionId | null {
  return normalizeConditionId(value);
}

export function hasCondition(character: Character, condition: string) {
  const id = toConditionId(condition);
  if (!id) return false;
  return character.activeConditions.some((value) => toConditionId(value) === id);
}

export function applyCondition(character: Character, condition: string): Character {
  const id = toConditionId(condition);
  if (!id) return character;
  if (hasCondition(character, id)) return character;

  return {
    ...character,
    activeConditions: [...character.activeConditions, id],
  };
}

export function removeCondition(character: Character, condition: string): Character {
  const id = toConditionId(condition);
  if (!id) return character;

  return {
    ...character,
    activeConditions: character.activeConditions.filter((value) => toConditionId(value) !== id),
  };
}

export function getConditionEffects(character: Character): CombinedConditionEffects {
  const activeConditionIds = unique(
    character.activeConditions
      .map((value) => toConditionId(value))
      .filter((value): value is ConditionId => value !== null),
  ) as ConditionId[];
  const activeEffects = activeConditionIds.map((id) => conditionEffects[id]);
  const exhaustion = getExhaustionEffects(character.exhaustionLevel);

  const baseMovement = mergeMovement(activeEffects);
  const movement: MovementEffect = exhaustion.speedOverride === 0
    ? {
        ...baseMovement,
        speedOverride: 0,
      }
    : {
        ...baseMovement,
        speedMultiplier:
          typeof baseMovement.speedMultiplier === 'number'
            ? baseMovement.speedMultiplier * exhaustion.speedMultiplier
            : exhaustion.speedMultiplier,
      };

  return {
    activeConditionIds,
    penalties: mergePenalties(activeEffects),
    checkDisadvantage: unique([
      ...activeEffects.flatMap((effect) => effect.checkDisadvantage),
      ...(exhaustion.checkDisadvantage ? ['all'] : []),
    ]),
    checkAdvantage: unique(activeEffects.flatMap((effect) => effect.checkAdvantage)),
    attackDisadvantage: activeEffects.some((effect) => effect.attackDisadvantage) || exhaustion.attackDisadvantage,
    attackAdvantageAgainstTarget: activeEffects.some((effect) => effect.attackAdvantageAgainstTarget),
    incomingAttackAdvantage: activeEffects.some((effect) => effect.incomingAttackAdvantage),
    incomingAttackDisadvantage: activeEffects.some((effect) => effect.incomingAttackDisadvantage),
    saveDisadvantage: unique([
      ...activeEffects.flatMap((effect) => effect.saveDisadvantage),
      ...(exhaustion.saveDisadvantage ? (['str', 'dex', 'con', 'int', 'wis', 'cha'] as AbilityKey[]) : []),
    ]) as AbilityKey[],
    autoFailSaves: unique(activeEffects.flatMap((effect) => effect.autoFailSaves)) as AbilityKey[],
    disabledActions: unique(activeEffects.flatMap((effect) => effect.disabledActions)),
    movement,
    exhaustion,
  };
}
