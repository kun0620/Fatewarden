import type { AbilityKey } from '../../types';

function toSafeScore(score: number) {
  if (!Number.isFinite(score)) return 10;
  return Math.trunc(score);
}

function clampLevel(level: number) {
  if (!Number.isFinite(level)) return 1;
  return Math.max(1, Math.min(20, Math.trunc(level)));
}

export function getAbilityModifier(score: number) {
  return Math.floor((toSafeScore(score) - 10) / 2);
}

export function getProficiencyBonus(level: number) {
  return Math.ceil(clampLevel(level) / 4) + 1;
}

export function getAbilityModifiers(abilities: Record<AbilityKey, number>): Record<AbilityKey, number> {
  return {
    str: getAbilityModifier(abilities.str),
    dex: getAbilityModifier(abilities.dex),
    con: getAbilityModifier(abilities.con),
    int: getAbilityModifier(abilities.int),
    wis: getAbilityModifier(abilities.wis),
    cha: getAbilityModifier(abilities.cha),
  };
}
