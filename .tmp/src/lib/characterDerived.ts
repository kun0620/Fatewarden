import { skillAbilityMap } from './rules';
import type { AbilityKey } from '../types';

const classHitDie: Record<string, number> = {
  barbarian: 12,
  fighter: 10,
  paladin: 10,
  ranger: 10,
  bard: 8,
  cleric: 8,
  druid: 8,
  monk: 8,
  rogue: 8,
  warlock: 8,
  sorcerer: 6,
  wizard: 6,
};

const classSaveProficiencies: Record<string, AbilityKey[]> = {
  barbarian: ['str', 'con'],
  bard: ['dex', 'cha'],
  cleric: ['wis', 'cha'],
  druid: ['int', 'wis'],
  fighter: ['str', 'con'],
  monk: ['str', 'dex'],
  paladin: ['wis', 'cha'],
  ranger: ['str', 'dex'],
  rogue: ['dex', 'int'],
  sorcerer: ['con', 'cha'],
  warlock: ['wis', 'cha'],
  wizard: ['int', 'wis'],
};

const abilityKeys: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

function normalizeClassName(className: string) {
  return className.trim().toLowerCase();
}

function abilityModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

function clampLevel(level: number) {
  return Math.max(1, Math.min(20, Number.isFinite(level) ? Math.trunc(level) : 1));
}

function normalizeArmorType(armorType: string) {
  return armorType.trim().toLowerCase();
}

function matchesArmor(name: string, aliases: string[]) {
  return aliases.includes(name);
}

function includesCaseInsensitive(values: string[], candidate: string) {
  const normalized = candidate.trim().toLowerCase();
  return values.some((value) => value.trim().toLowerCase() === normalized);
}

export function calcProficiencyBonus(level: number) {
  return Math.ceil(clampLevel(level) / 4) + 1;
}

export function calcMaxHP(level: number, className: string, conScore: number, selectedHp?: number) {
  if (typeof selectedHp === 'number' && Number.isFinite(selectedHp) && selectedHp > 0) {
    return Math.max(1, Math.trunc(selectedHp));
  }

  const normalizedClass = normalizeClassName(className);
  const hitDie = classHitDie[normalizedClass] ?? 8;
  const conMod = abilityModifier(conScore);
  const safeLevel = clampLevel(level);
  const perLevelAverage = Math.floor(hitDie / 2) + 1;
  const levelOneHp = hitDie + conMod;
  const laterLevelHp = (safeLevel - 1) * (perLevelAverage + conMod);
  return Math.max(1, levelOneHp + laterLevelHp);
}

export function calcAC(dexScore: number, armorType: string, shieldEquipped = false) {
  const dexMod = abilityModifier(dexScore);
  const armor = normalizeArmorType(armorType);
  let armorClass = 10 + dexMod;

  if (matchesArmor(armor, ['none', 'unarmored', 'no armor', ''])) {
    armorClass = 10 + dexMod;
  } else if (matchesArmor(armor, ['light', 'leather'])) {
    armorClass = 11 + dexMod;
  } else if (matchesArmor(armor, ['studded leather'])) {
    armorClass = 12 + dexMod;
  } else if (matchesArmor(armor, ['medium', 'hide'])) {
    armorClass = 12 + Math.min(2, dexMod);
  } else if (matchesArmor(armor, ['chain shirt', 'scale mail', 'breastplate'])) {
    armorClass = 13 + Math.min(2, dexMod);
  } else if (matchesArmor(armor, ['half plate'])) {
    armorClass = 15 + Math.min(2, dexMod);
  } else if (matchesArmor(armor, ['heavy', 'ring mail'])) {
    armorClass = 14;
  } else if (matchesArmor(armor, ['chain mail'])) {
    armorClass = 16;
  } else if (matchesArmor(armor, ['splint'])) {
    armorClass = 17;
  } else if (matchesArmor(armor, ['plate'])) {
    armorClass = 18;
  }

  if (shieldEquipped) armorClass += 2;
  return Math.max(1, armorClass);
}

export function calcInitiative(dexScore: number) {
  return abilityModifier(dexScore);
}

export function calcPassivePerception(wisScore: number, hasProficiency: boolean) {
  return 10 + abilityModifier(wisScore) + (hasProficiency ? 2 : 0);
}

export function calcSavingThrows(abilities: Record<AbilityKey, number>, className: string) {
  const pb = 2;
  const normalizedClass = normalizeClassName(className);
  const profs = classSaveProficiencies[normalizedClass] ?? [];

  return abilityKeys.reduce(
    (acc, key) => {
      const base = abilityModifier(abilities[key]);
      acc[key] = profs.includes(key) ? base + pb : base;
      return acc;
    },
    {} as Record<AbilityKey, number>,
  );
}

export function calcSkillBonuses(
  abilities: Record<AbilityKey, number>,
  proficiencies: string[],
  level: number,
) {
  const pb = calcProficiencyBonus(level);
  const bonuses: Record<string, number> = {};

  Object.entries(skillAbilityMap).forEach(([skill, ability]) => {
    const base = abilityModifier(abilities[ability]);
    bonuses[skill] = includesCaseInsensitive(proficiencies, skill) ? base + pb : base;
  });

  return bonuses;
}
