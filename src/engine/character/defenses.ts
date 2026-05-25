import { getClassData, normalizeClassName } from '../../data/classes';
import { inventoryToNames } from '../../lib/inventory';
import type { Character } from '../../types';
import { getAbilityModifier, getProficiencyBonus } from './modifiers';

function includesText(values: string[], fragment: string) {
  const target = fragment.trim().toLowerCase();
  return values.some((value) => value.toLowerCase().includes(target));
}

function detectArmorType(character: Character): string {
  const equipped = inventoryToNames(character.inventory).map((item) => item.trim().toLowerCase());

  if (equipped.some((item) => item.includes('plate'))) return 'plate';
  if (equipped.some((item) => item.includes('splint'))) return 'splint';
  if (equipped.some((item) => item.includes('chain mail'))) return 'chain mail';
  if (equipped.some((item) => item.includes('ring mail'))) return 'ring mail';
  if (equipped.some((item) => item.includes('half plate'))) return 'half plate';
  if (equipped.some((item) => item.includes('breastplate'))) return 'breastplate';
  if (equipped.some((item) => item.includes('scale mail'))) return 'scale mail';
  if (equipped.some((item) => item.includes('chain shirt'))) return 'chain shirt';
  if (equipped.some((item) => item.includes('hide'))) return 'hide';
  if (equipped.some((item) => item.includes('studded leather'))) return 'studded leather';
  if (equipped.some((item) => item.includes('leather'))) return 'leather';

  return 'none';
}

function hasShield(character: Character) {
  return includesText(inventoryToNames(character.inventory), 'shield');
}

function getArmorClassByType(dexModifier: number, armorType: string) {
  switch (armorType) {
    case 'leather':
      return 11 + dexModifier;
    case 'studded leather':
      return 12 + dexModifier;
    case 'hide':
      return 12 + Math.min(2, dexModifier);
    case 'chain shirt':
    case 'scale mail':
    case 'breastplate':
      return 13 + Math.min(2, dexModifier);
    case 'half plate':
      return 15 + Math.min(2, dexModifier);
    case 'ring mail':
      return 14;
    case 'chain mail':
      return 16;
    case 'splint':
      return 17;
    case 'plate':
      return 18;
    case 'none':
    default:
      return 10 + dexModifier;
  }
}

function getClassHitDie(className: string) {
  return Number((getClassData(className)?.hitDie ?? 'd8').slice(1));
}

export function calculateMaxHP(character: Character) {
  const hitDie = getClassHitDie(character.className);
  const conModifier = getAbilityModifier(character.abilities.con);
  const level = Math.max(1, Math.min(20, Math.trunc(character.level || 1)));
  const levelOne = hitDie + conModifier;
  const avgPerLevel = Math.floor(hitDie / 2) + 1 + conModifier;
  return Math.max(1, levelOne + Math.max(0, level - 1) * avgPerLevel);
}

export function calculateArmorClass(character: Character) {
  const dexModifier = getAbilityModifier(character.abilities.dex);
  const normalizedClass = normalizeClassName(character.className);
  const armorType = detectArmorType(character);
  const shieldBonus = hasShield(character) ? 2 : 0;

  if (armorType === 'none' && normalizedClass === 'barbarian') {
    return 10 + dexModifier + getAbilityModifier(character.abilities.con) + shieldBonus;
  }

  if (armorType === 'none' && normalizedClass === 'monk') {
    return 10 + dexModifier + getAbilityModifier(character.abilities.wis);
  }

  const baseAc = getArmorClassByType(dexModifier, armorType);
  return Math.max(1, baseAc + shieldBonus);
}

export function calculateInitiative(character: Character) {
  const featInitBonus = character.systemData?.featBonuses?.initiative ?? 0;
  return getAbilityModifier(character.abilities.dex) + featInitBonus;
}

export function calculatePassivePerception(character: Character) {
  const wisModifier = getAbilityModifier(character.abilities.wis);
  const proficiencyBonus = getProficiencyBonus(character.level);
  const hasPerceptionProficiency = character.skills.some(
    (skill) => skill.trim().toLowerCase() === 'perception',
  ) || character.proficiencies.some((entry) => entry.trim().toLowerCase() === 'perception');

  const hasPerceptionExpertise = character.proficiencies.some(
    (entry) => entry.trim().toLowerCase() === 'expertise:perception',
  );

  const proficiencyPart = hasPerceptionExpertise
    ? proficiencyBonus * 2
    : hasPerceptionProficiency
      ? proficiencyBonus
      : 0;

  return 10 + wisModifier + proficiencyPart;
}
