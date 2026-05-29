import type { AbilityKey, Character } from '../../types';
import { getAbilityModifier, getProficiencyBonus } from './modifiers';

export const skillAbilityMap: Record<string, AbilityKey> = {
  Acrobatics: 'dex',
  'Animal Handling': 'wis',
  Arcana: 'int',
  Athletics: 'str',
  Deception: 'cha',
  History: 'int',
  Insight: 'wis',
  Intimidation: 'cha',
  Investigation: 'int',
  Medicine: 'wis',
  Nature: 'int',
  Perception: 'wis',
  Performance: 'cha',
  Persuasion: 'cha',
  Religion: 'int',
  'Sleight of Hand': 'dex',
  Stealth: 'dex',
  Survival: 'wis',
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function hasSkillProficiency(character: Character, skill: string) {
  const target = normalize(skill);
  const fromSkills = character.skills.some((entry) => normalize(entry) === target);
  const fromProficiencies = character.proficiencies.some((entry) => normalize(entry) === target);
  return fromSkills || fromProficiencies;
}

function hasSkillExpertise(character: Character, skill: string) {
  const target = normalize(skill);
  return character.proficiencies.some((entry) => normalize(entry) === `expertise:${target}`);
}

export function calculateSkillBonuses(character: Character): Record<string, number> {
  const proficiencyBonus = getProficiencyBonus(character.level);
  const bonuses: Record<string, number> = {};

  Object.entries(skillAbilityMap).forEach(([skill, ability]) => {
    const base = getAbilityModifier(character.abilities[ability]);
    const hasProficiency = hasSkillProficiency(character, skill);
    const hasExpertise = hasSkillExpertise(character, skill);

    if (hasExpertise) {
      bonuses[skill] = base + proficiencyBonus * 2;
      return;
    }

    bonuses[skill] = hasProficiency ? base + proficiencyBonus : base;
  });

  return bonuses;
}
