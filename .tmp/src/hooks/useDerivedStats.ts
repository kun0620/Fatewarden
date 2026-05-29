import { useMemo } from 'react';
import type { AbilityKey, Character } from '../types';
import { getAbilityModifiers, getProficiencyBonus } from '../engine/character/modifiers';
import { calculateSavingThrows } from '../engine/character/savingThrows';
import { calculateSkillBonuses } from '../engine/character/skills';
import {
  calculateArmorClass,
  calculateInitiative,
  calculateMaxHP,
  calculatePassivePerception,
} from '../engine/character/defenses';

export type DerivedStatsRuntime = {
  modifiers: Record<AbilityKey, number>;
  proficiencyBonus: number;
  savingThrows: Record<AbilityKey, number>;
  skillBonuses: Record<string, number>;
  AC: number;
  HP: number;
  initiative: number;
  passivePerception: number;
};

export function useDerivedStats(character: Character): DerivedStatsRuntime {
  return useMemo(() => {
    const modifiers = getAbilityModifiers(character.abilities);
    const proficiencyBonus = getProficiencyBonus(character.level);
    const savingThrows = calculateSavingThrows(character);
    const skillBonuses = calculateSkillBonuses(character);
    const AC = calculateArmorClass(character);
    const HP = calculateMaxHP(character);
    const initiative = calculateInitiative(character);
    const passivePerception = calculatePassivePerception(character);

    return {
      modifiers,
      proficiencyBonus,
      savingThrows,
      skillBonuses,
      AC,
      HP,
      initiative,
      passivePerception,
    };
  }, [character]);
}
