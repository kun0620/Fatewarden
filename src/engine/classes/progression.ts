import { buildSpellSlotState } from '../../data/spellSlots';
import { calculateMaxHP } from '../character/defenses';
import { getProficiencyBonus } from '../character/modifiers';
import { getClassById, getClassByName, type ClassFeature } from '../../data/classes';
import type { Character } from '../../types';
import { getResourceState, writeResourceState } from './resourceEngine';

export type LevelUpOptions = {
  targetLevel?: number;
  selectedSubclass?: string;
  selectedFeatures?: string[];
  selectedHpGain?: number;
};

export type LevelBenefitSummary = {
  fromLevel: number;
  toLevel: number;
  hpGain: number;
  proficiencyBonusFrom: number;
  proficiencyBonusTo: number;
  unlockedFeatures: string[];
  unlockedSubclass?: string;
};

function clampLevel(level: number) {
  if (!Number.isFinite(level)) return 1;
  return Math.max(1, Math.min(20, Math.trunc(level)));
}

function getClassDefinition(className: string) {
  return (
    getClassById(className.trim().toLowerCase())
    ?? getClassByName(className)
  );
}

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

export function getFeaturesForLevel(className: string, level: number): ClassFeature[] {
  const classDef = getClassDefinition(className);
  if (!classDef) return [];
  const safe = clampLevel(level);
  return classDef.features.filter((feature) => feature.level === safe);
}

export function applyLevelBenefits(
  character: Character,
  options: LevelUpOptions = {},
): { character: Character; summary: LevelBenefitSummary } {
  const classDef = getClassDefinition(character.className);
  if (!classDef) {
    return {
      character,
      summary: {
        fromLevel: character.level,
        toLevel: character.level,
        hpGain: 0,
        proficiencyBonusFrom: getProficiencyBonus(character.level),
        proficiencyBonusTo: getProficiencyBonus(character.level),
        unlockedFeatures: [],
      },
    };
  }

  const fromLevel = clampLevel(character.level);
  const toLevel = clampLevel(options.targetLevel ?? fromLevel + 1);
  if (toLevel <= fromLevel) {
    return {
      character,
      summary: {
        fromLevel,
        toLevel: fromLevel,
        hpGain: 0,
        proficiencyBonusFrom: getProficiencyBonus(fromLevel),
        proficiencyBonusTo: getProficiencyBonus(fromLevel),
        unlockedFeatures: [],
      },
    };
  }

  const unlockedFeatures = classDef.features
    .filter((feature) => feature.level > fromLevel && feature.level <= toLevel)
    .map((feature) => feature.name);
  const selectedFeatures = options.selectedFeatures ?? [];

  const provisional: Character = {
    ...character,
    level: toLevel,
    maxHitDice: toLevel,
    hitDice: Math.max(character.hitDice, Math.min(toLevel, character.maxHitDice)),
  };

  const calculatedMaxHp = calculateMaxHP(provisional);
  const manualGain = options.selectedHpGain;
  const hpGainFromManual = Number.isFinite(manualGain) ? Math.max(1, Math.trunc(manualGain as number)) : null;
  const targetMaxHp = hpGainFromManual === null
    ? calculatedMaxHp
    : Math.max(character.maxHitPoints + hpGainFromManual, calculatedMaxHp);
  const hpGain = Math.max(1, targetMaxHp - character.maxHitPoints);

  let next: Character = {
    ...provisional,
    maxHitPoints: targetMaxHp,
    hitPoints: Math.min(targetMaxHp, character.hitPoints + hpGain),
    features: toUnique([
      ...character.features,
      ...unlockedFeatures,
      ...selectedFeatures,
    ]),
    spellSlots: buildSpellSlotState(character.className, toLevel, character.spellSlots),
  };

  if (options.selectedSubclass && toLevel >= classDef.subclassLevel) {
    next = {
      ...next,
      features: toUnique([...next.features, `Subclass: ${options.selectedSubclass}`]),
    };
  }

  const normalizedResources = getResourceState(next);
  next = writeResourceState(next, normalizedResources);

  return {
    character: next,
    summary: {
      fromLevel,
      toLevel,
      hpGain,
      proficiencyBonusFrom: getProficiencyBonus(fromLevel),
      proficiencyBonusTo: getProficiencyBonus(toLevel),
      unlockedFeatures,
      unlockedSubclass: options.selectedSubclass,
    },
  };
}

export function levelUpCharacter(character: Character, options: LevelUpOptions = {}) {
  return applyLevelBenefits(character, options).character;
}
