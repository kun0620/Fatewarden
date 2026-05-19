import { getClassByName } from '../data/classes';
import { buildSpellSlotState, spellAttackBonus, spellSaveDC } from '../data/spellSlots';
import { calcACFromInventory } from './inventory';
import { skillAbilityMap } from './rules';
import type { AbilityKey, Character } from '../types';

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
  return calcPassivePerceptionForLevel(wisScore, hasProficiency, 1);
}

export function calcPassivePerceptionForLevel(wisScore: number, hasProficiency: boolean, level: number) {
  return 10 + abilityModifier(wisScore) + (hasProficiency ? calcProficiencyBonus(level) : 0);
}

export function calcSavingThrows(abilities: Record<AbilityKey, number>, className: string, level = 1) {
  const pb = calcProficiencyBonus(level);
  const classData = getClassByName(className);
  const profs = classData?.savingThrows ?? [];

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

function getSpellAbilityScore(character: Character) {
  const classData = getClassByName(character.className);
  const spellAbility = classData?.spellcastingAbility;
  return spellAbility ? character.abilities[spellAbility] : undefined;
}

export function recalculateCharacter(character: Character): Character {
  const level = clampLevel(character.level);
  const proficiencyBonus = calcProficiencyBonus(level);
  const skillBonuses = calcSkillBonuses(character.abilities, character.skills, level);
  const savingThrows = calcSavingThrows(character.abilities, character.className, level);
  const passivePerception = calcPassivePerceptionForLevel(character.abilities.wis, character.skills.includes('Perception'), level);
  const armorClass = calcACFromInventory(character.inventory, character.abilities.dex);
  const maxHitPoints = calcMaxHP(level, character.className, character.abilities.con);
  const classData = getClassByName(character.className);
  const spellAbilityScore = getSpellAbilityScore(character);
  const spellSlots = buildSpellSlotState(character.className, level, character.spellSlots);
  const spellStats =
    classData?.isCaster && typeof spellAbilityScore === 'number'
      ? {
          spellSaveDC: spellSaveDC(proficiencyBonus, spellAbilityScore),
          spellAttackBonus: spellAttackBonus(proficiencyBonus, spellAbilityScore),
        }
      : {};

  return {
    ...character,
    level,
    armorClass,
    maxHitPoints,
    hitPoints: Math.max(0, Math.min(character.hitPoints || maxHitPoints, maxHitPoints)),
    maxHitDice: level,
    hitDice: Math.max(0, Math.min(character.hitDice || level, level)),
    spellSlots,
    savingThrows: classData?.savingThrows ?? character.savingThrows ?? [],
    spellsKnown: character.spellsKnown ?? character.spells,
    systemData: {
      ...character.systemData,
      derivedStats: {
        armorClass,
        maxHitPoints,
        proficiencyBonus,
        initiative: calcInitiative(character.abilities.dex),
        passivePerception,
        savingThrows,
        skillBonuses,
        ...spellStats,
      },
    },
  };
}
