import { getClassData } from '../../data/classes';
import type { AbilityKey, Character } from '../../types';
import { getAbilityModifier, getProficiencyBonus } from './modifiers';

const abilityKeys: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export function calculateSavingThrows(character: Character): Record<AbilityKey, number> {
  const proficiencyBonus = getProficiencyBonus(character.level);
  const proficientSaves = new Set(getClassData(character.className)?.savingThrowProficiencies ?? []);

  return abilityKeys.reduce(
    (acc, ability) => {
      const modifier = getAbilityModifier(character.abilities[ability]);
      acc[ability] = proficientSaves.has(ability) ? modifier + proficiencyBonus : modifier;
      return acc;
    },
    {} as Record<AbilityKey, number>,
  );
}
