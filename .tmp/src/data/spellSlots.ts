/**
 * spellSlots.ts — SRD 5.1 Spell Slot Tables
 *
 * Covers:
 *  - Full casters   : Bard, Cleric, Druid, Sorcerer, Wizard
 *  - Half casters   : Paladin, Ranger
 *  - Warlock        : Pact Magic (separate table, all slots same level)
 *  - Third casters  : Eldritch Knight (Fighter), Arcane Trickster (Rogue)
 *
 * Index: slotsByLevel[level][slotLevel] = count
 * Level = character level (1–20)
 * Slot level = spell level (1–9)
 */
import { getClassData, normalizeClassName } from './classes';
import type { SpellSlotState } from '../types';

export type SlotRow = {
  /** Spell slots available per spell level [1st … 9th] */
  slots: [number, number, number, number, number, number, number, number, number];
};

export type SpellSlotTable = Record<number, SlotRow>;

// ─────────────────────────────────────────
// FULL CASTER  (Bard, Cleric, Druid, Sorcerer, Wizard)
// ─────────────────────────────────────────
export const fullCasterSlots: SpellSlotTable = {
  1:  { slots: [2, 0, 0, 0, 0, 0, 0, 0, 0] },
  2:  { slots: [3, 0, 0, 0, 0, 0, 0, 0, 0] },
  3:  { slots: [4, 2, 0, 0, 0, 0, 0, 0, 0] },
  4:  { slots: [4, 3, 0, 0, 0, 0, 0, 0, 0] },
  5:  { slots: [4, 3, 2, 0, 0, 0, 0, 0, 0] },
  6:  { slots: [4, 3, 3, 0, 0, 0, 0, 0, 0] },
  7:  { slots: [4, 3, 3, 1, 0, 0, 0, 0, 0] },
  8:  { slots: [4, 3, 3, 2, 0, 0, 0, 0, 0] },
  9:  { slots: [4, 3, 3, 3, 1, 0, 0, 0, 0] },
  10: { slots: [4, 3, 3, 3, 2, 0, 0, 0, 0] },
  11: { slots: [4, 3, 3, 3, 2, 1, 0, 0, 0] },
  12: { slots: [4, 3, 3, 3, 2, 1, 0, 0, 0] },
  13: { slots: [4, 3, 3, 3, 2, 1, 1, 0, 0] },
  14: { slots: [4, 3, 3, 3, 2, 1, 1, 0, 0] },
  15: { slots: [4, 3, 3, 3, 2, 1, 1, 1, 0] },
  16: { slots: [4, 3, 3, 3, 2, 1, 1, 1, 0] },
  17: { slots: [4, 3, 3, 3, 2, 1, 1, 1, 1] },
  18: { slots: [4, 3, 3, 3, 3, 1, 1, 1, 1] },
  19: { slots: [4, 3, 3, 3, 3, 2, 1, 1, 1] },
  20: { slots: [4, 3, 3, 3, 3, 2, 2, 1, 1] },
};

// ─────────────────────────────────────────
// HALF CASTER  (Paladin, Ranger)
// Spell slots available starting at class level 2
// ─────────────────────────────────────────
export const halfCasterSlots: SpellSlotTable = {
  1:  { slots: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
  2:  { slots: [2, 0, 0, 0, 0, 0, 0, 0, 0] },
  3:  { slots: [3, 0, 0, 0, 0, 0, 0, 0, 0] },
  4:  { slots: [3, 0, 0, 0, 0, 0, 0, 0, 0] },
  5:  { slots: [4, 2, 0, 0, 0, 0, 0, 0, 0] },
  6:  { slots: [4, 2, 0, 0, 0, 0, 0, 0, 0] },
  7:  { slots: [4, 3, 0, 0, 0, 0, 0, 0, 0] },
  8:  { slots: [4, 3, 0, 0, 0, 0, 0, 0, 0] },
  9:  { slots: [4, 3, 2, 0, 0, 0, 0, 0, 0] },
  10: { slots: [4, 3, 2, 0, 0, 0, 0, 0, 0] },
  11: { slots: [4, 3, 3, 0, 0, 0, 0, 0, 0] },
  12: { slots: [4, 3, 3, 0, 0, 0, 0, 0, 0] },
  13: { slots: [4, 3, 3, 1, 0, 0, 0, 0, 0] },
  14: { slots: [4, 3, 3, 1, 0, 0, 0, 0, 0] },
  15: { slots: [4, 3, 3, 2, 0, 0, 0, 0, 0] },
  16: { slots: [4, 3, 3, 2, 0, 0, 0, 0, 0] },
  17: { slots: [4, 3, 3, 3, 1, 0, 0, 0, 0] },
  18: { slots: [4, 3, 3, 3, 1, 0, 0, 0, 0] },
  19: { slots: [4, 3, 3, 3, 2, 0, 0, 0, 0] },
  20: { slots: [4, 3, 3, 3, 2, 0, 0, 0, 0] },
};

// ─────────────────────────────────────────
// WARLOCK — Pact Magic
// All slots are the same level; slot level rises with character level.
// ─────────────────────────────────────────
export type WarlockPactRow = {
  slotLevel: number;   // spell level of each slot (1–5)
  slotCount: number;   // number of slots
  invocationsKnown: number;
  cantripsKnown: number;
  spellsKnown: number;
};

export const warlockPactSlots: Record<number, WarlockPactRow> = {
  1:  { slotLevel: 1, slotCount: 1, invocationsKnown: 0,  cantripsKnown: 2, spellsKnown: 2 },
  2:  { slotLevel: 1, slotCount: 2, invocationsKnown: 2,  cantripsKnown: 2, spellsKnown: 3 },
  3:  { slotLevel: 2, slotCount: 2, invocationsKnown: 2,  cantripsKnown: 2, spellsKnown: 4 },
  4:  { slotLevel: 2, slotCount: 2, invocationsKnown: 2,  cantripsKnown: 3, spellsKnown: 5 },
  5:  { slotLevel: 3, slotCount: 2, invocationsKnown: 3,  cantripsKnown: 3, spellsKnown: 6 },
  6:  { slotLevel: 3, slotCount: 2, invocationsKnown: 3,  cantripsKnown: 3, spellsKnown: 7 },
  7:  { slotLevel: 4, slotCount: 2, invocationsKnown: 4,  cantripsKnown: 3, spellsKnown: 8 },
  8:  { slotLevel: 4, slotCount: 2, invocationsKnown: 4,  cantripsKnown: 3, spellsKnown: 9 },
  9:  { slotLevel: 5, slotCount: 2, invocationsKnown: 5,  cantripsKnown: 3, spellsKnown: 10 },
  10: { slotLevel: 5, slotCount: 2, invocationsKnown: 5,  cantripsKnown: 4, spellsKnown: 10 },
  11: { slotLevel: 5, slotCount: 3, invocationsKnown: 5,  cantripsKnown: 4, spellsKnown: 11 },
  12: { slotLevel: 5, slotCount: 3, invocationsKnown: 6,  cantripsKnown: 4, spellsKnown: 11 },
  13: { slotLevel: 5, slotCount: 3, invocationsKnown: 6,  cantripsKnown: 4, spellsKnown: 12 },
  14: { slotLevel: 5, slotCount: 3, invocationsKnown: 6,  cantripsKnown: 4, spellsKnown: 12 },
  15: { slotLevel: 5, slotCount: 3, invocationsKnown: 7,  cantripsKnown: 4, spellsKnown: 13 },
  16: { slotLevel: 5, slotCount: 3, invocationsKnown: 7,  cantripsKnown: 4, spellsKnown: 13 },
  17: { slotLevel: 5, slotCount: 4, invocationsKnown: 7,  cantripsKnown: 4, spellsKnown: 14 },
  18: { slotLevel: 5, slotCount: 4, invocationsKnown: 8,  cantripsKnown: 4, spellsKnown: 14 },
  19: { slotLevel: 5, slotCount: 4, invocationsKnown: 8,  cantripsKnown: 4, spellsKnown: 15 },
  20: { slotLevel: 5, slotCount: 4, invocationsKnown: 8,  cantripsKnown: 4, spellsKnown: 15 },
};

// ─────────────────────────────────────────
// THIRD CASTER
// Eldritch Knight (Fighter), Arcane Trickster (Rogue)
// Slots available from class level 3 only
// ─────────────────────────────────────────
export const thirdCasterSlots: SpellSlotTable = {
  1:  { slots: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
  2:  { slots: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
  3:  { slots: [2, 0, 0, 0, 0, 0, 0, 0, 0] },
  4:  { slots: [3, 0, 0, 0, 0, 0, 0, 0, 0] },
  5:  { slots: [3, 0, 0, 0, 0, 0, 0, 0, 0] },
  6:  { slots: [3, 0, 0, 0, 0, 0, 0, 0, 0] },
  7:  { slots: [4, 2, 0, 0, 0, 0, 0, 0, 0] },
  8:  { slots: [4, 2, 0, 0, 0, 0, 0, 0, 0] },
  9:  { slots: [4, 2, 0, 0, 0, 0, 0, 0, 0] },
  10: { slots: [4, 3, 0, 0, 0, 0, 0, 0, 0] },
  11: { slots: [4, 3, 0, 0, 0, 0, 0, 0, 0] },
  12: { slots: [4, 3, 0, 0, 0, 0, 0, 0, 0] },
  13: { slots: [4, 3, 2, 0, 0, 0, 0, 0, 0] },
  14: { slots: [4, 3, 2, 0, 0, 0, 0, 0, 0] },
  15: { slots: [4, 3, 2, 0, 0, 0, 0, 0, 0] },
  16: { slots: [4, 3, 3, 0, 0, 0, 0, 0, 0] },
  17: { slots: [4, 3, 3, 0, 0, 0, 0, 0, 0] },
  18: { slots: [4, 3, 3, 0, 0, 0, 0, 0, 0] },
  19: { slots: [4, 3, 3, 1, 0, 0, 0, 0, 0] },
  20: { slots: [4, 3, 3, 1, 0, 0, 0, 0, 0] },
};

// ─────────────────────────────────────────
// PROFICIENCY BONUS by total character level
// ─────────────────────────────────────────
export const proficiencyBonusByLevel: Record<number, number> = {
  1: 2, 2: 2, 3: 2, 4: 2,
  5: 3, 6: 3, 7: 3, 8: 3,
  9: 4, 10: 4, 11: 4, 12: 4,
  13: 5, 14: 5, 15: 5, 16: 5,
  17: 6, 18: 6, 19: 6, 20: 6,
};

// ─────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────

export type CastingProgression = 'full' | 'half' | 'third' | 'warlock' | 'none';

/**
 * Get spell slot counts for a caster at a given class level.
 * Returns array index 0–8 = spell levels 1–9.
 */
export function getSpellSlots(
  progression: CastingProgression,
  classLevel: number,
): number[] {
  const level = Math.max(1, Math.min(20, classLevel));

  switch (progression) {
    case 'full':    return [...fullCasterSlots[level].slots];
    case 'half':    return [...halfCasterSlots[level].slots];
    case 'third':   return [...thirdCasterSlots[level].slots];
    case 'warlock': {
      const row = warlockPactSlots[level];
      // Warlock: all slots at the same level, all other levels = 0
      const arr = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      arr[row.slotLevel - 1] = row.slotCount;
      return arr;
    }
    case 'none':
    default:
      return [0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
}

/**
 * Build initial spellSlots state for a character.
 * Returns object: { [spellLevel: number]: { used: number; max: number } }
 */
export function buildInitialSpellSlots(
  progression: CastingProgression,
  classLevel: number,
): Record<number, { used: number; max: number }> {
  const slots = getSpellSlots(progression, classLevel);
  const result: Record<number, { used: number; max: number }> = {};

  slots.forEach((max, index) => {
    if (max > 0) {
      result[index + 1] = { used: 0, max };
    }
  });

  return result;
}

/**
 * Restore all spell slots on long rest.
 */
export function restoreAllSpellSlots(
  current: Record<number, { used: number; max: number }>,
): Record<number, { used: number; max: number }> {
  const restored: Record<number, { used: number; max: number }> = {};
  for (const [level, slot] of Object.entries(current)) {
    restored[Number(level)] = { used: 0, max: slot.max };
  }
  return restored;
}

/**
 * Expend one spell slot of a given level.
 * Returns null if no slots available.
 */
export function expendSpellSlot(
  current: Record<number, { used: number; max: number }>,
  slotLevel: number,
): Record<number, { used: number; max: number }> | null {
  const slot = current[slotLevel];
  if (!slot || slot.used >= slot.max) return null;
  return {
    ...current,
    [slotLevel]: { ...slot, used: slot.used + 1 },
  };
}

/**
 * Max spell slot level available for a caster at given level.
 */
export function maxSpellLevel(progression: CastingProgression, classLevel: number): number {
  const slots = getSpellSlots(progression, classLevel);
  for (let i = 8; i >= 0; i--) {
    if (slots[i] > 0) return i + 1;
  }
  return 0;
}

/**
 * Ability modifier from ability score.
 */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Spell save DC = 8 + proficiency bonus + spellcasting ability modifier.
 */
export function spellSaveDC(
  proficiencyBonus: number,
  spellcastingAbilityScore: number,
): number {
  return 8 + proficiencyBonus + abilityModifier(spellcastingAbilityScore);
}

/**
 * Spell attack bonus = proficiency bonus + spellcasting ability modifier.
 */
export function spellAttackBonus(
  proficiencyBonus: number,
  spellcastingAbilityScore: number,
): number {
  return proficiencyBonus + abilityModifier(spellcastingAbilityScore);
}

function toProgression(className: string): CastingProgression {
  const normalized = normalizeClassName(className);
  if (normalized === 'warlock') return 'warlock';

  const classData = getClassData(className);
  if (!classData?.isCaster) return 'none';

  if (['paladin', 'ranger'].includes(normalized)) return 'half';
  if (['fighter', 'rogue'].includes(normalized)) return 'third';
  return 'full';
}

export function getSpellSlotMaxByClassAndLevel(className: string, level: number) {
  const progression = toProgression(className);
  const slots = getSpellSlots(progression, level);
  return slots.reduce<Record<number, number>>((acc, max, index) => {
    if (max > 0) acc[index + 1] = max;
    return acc;
  }, {});
}

export function buildSpellSlotState(
  className: string,
  level: number,
  existing: Record<number, SpellSlotState> = {},
): Record<number, SpellSlotState> {
  const maxByLevel = getSpellSlotMaxByClassAndLevel(className, level);
  const result: Record<number, SpellSlotState> = {};

  Object.entries(maxByLevel).forEach(([slotLevelRaw, maxRaw]) => {
    const slotLevel = Number(slotLevelRaw);
    const max = Math.max(0, Math.trunc(maxRaw));
    const used = Math.max(0, Math.min(max, Math.trunc(existing[slotLevel]?.used ?? 0)));
    result[slotLevel] = { used, max };
  });

  return result;
}

export function isCasterClass(className: string) {
  return toProgression(className) !== 'none';
}
