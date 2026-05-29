import type { Character, LevelUpChoice } from '../../../types';
import type { ClassFeature } from '../../../data/classes';
import type { LevelUpEvent, RecoverResourceEvent, SpendResourceEvent } from '../types';
import { buildClassRuntime, recoverResources, spendResource } from '../../classes/classRuntime';
import { calculateMaxHP } from '../../character/defenses';
import { getClassById, getClassByName } from '../../../data/classes';

export type EventResult = {
  character: Character;
  applied: boolean;
  error?: string;
};

function toUnique(values: string[]) {
  const seen = new Set<string>();
  const next: string[] = [];
  values.forEach((value) => {
    const normalized = value.trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    next.push(normalized);
  });
  return next;
}

function flattenChoiceSelections(choices: LevelUpChoice[]) {
  return choices
    .map((choice) => choice.selected?.trim())
    .filter((choice): choice is string => Boolean(choice));
}

function getHpChoice(choices: LevelUpChoice[]) {
  const hpChoice = choices.find((choice) => choice.type === 'hp');
  if (!hpChoice?.selected) return null;
  const parsed = Number(hpChoice.selected);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(1, Math.trunc(parsed));
}

export function processSpendResource(character: Character, event: SpendResourceEvent): EventResult {
  const runtime = character.systemData.classRuntime
    ?? buildClassRuntime(character.className, undefined, character.level, character);
  const updatedRuntime = spendResource(runtime, event.resourceId, event.amount);
  if (!updatedRuntime) {
    return {
      character,
      applied: false,
      error: `Insufficient resource: ${event.resourceId}`,
    };
  }

  return {
    character: {
      ...character,
      systemData: {
        ...character.systemData,
        classRuntime: updatedRuntime,
      },
    },
    applied: true,
  };
}

export function processRecoverResource(character: Character, event: RecoverResourceEvent): EventResult {
  const runtime = character.systemData.classRuntime
    ?? buildClassRuntime(character.className, undefined, character.level, character);
  const updatedRuntime = recoverResources(runtime, event.recoveryType);

  return {
    character: {
      ...character,
      systemData: {
        ...character.systemData,
        classRuntime: updatedRuntime,
      },
    },
    applied: true,
  };
}

function getUnlockedFeatures(features: ClassFeature[], fromLevel: number, toLevel: number) {
  return features
    .filter((feature) => feature.level > fromLevel && feature.level <= toLevel)
    .map((feature) => feature.name);
}

export function processLevelUp(character: Character, event: LevelUpEvent): EventResult {
  const fromLevel = Math.max(1, Math.min(20, Math.trunc(character.level)));
  const toLevel = Math.max(fromLevel, Math.min(20, Math.trunc(event.newLevel)));
  if (toLevel <= fromLevel) {
    return {
      character,
      applied: false,
      error: `New level must be greater than current level (${fromLevel})`,
    };
  }

  const selected = flattenChoiceSelections(event.choices);
  const hpGain = getHpChoice(event.choices);
  const provisional: Character = {
    ...character,
    level: toLevel,
    maxHitDice: toLevel,
    hitDice: Math.max(character.hitDice, toLevel),
  };
  const calculatedHp = calculateMaxHP(provisional);
  const targetMaxHp = hpGain === null
    ? calculatedHp
    : Math.max(calculatedHp, character.maxHitPoints + hpGain);
  const runtime = buildClassRuntime(
    character.className,
    character.systemData.classRuntime?.subclassId,
    toLevel,
    provisional,
  );
  const classDef = getClassById(runtime.classId) ?? getClassByName(character.className);
  const classFeatures = classDef?.features ?? [];

  const unlockedFeatures = getUnlockedFeatures(classFeatures, fromLevel, toLevel);

  return {
    character: {
      ...provisional,
      maxHitPoints: targetMaxHp,
      hitPoints: Math.min(targetMaxHp, provisional.hitPoints + Math.max(1, targetMaxHp - character.maxHitPoints)),
      features: toUnique([
        ...character.features,
        ...unlockedFeatures,
        ...selected,
      ]),
      systemData: {
        ...character.systemData,
        classRuntime: runtime,
      },
    },
    applied: true,
  };
}
