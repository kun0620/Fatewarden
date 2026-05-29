import { getClassById, getClassByName, type HitDieType } from '../../data/classes';
import { buildSpellSlotState } from '../../data/spellSlots';
import type { Character, ExhaustionLevel, SpellSlotState } from '../../types';
import { getAbilityModifier } from './modifiers';

type RecoveryType = 'short_rest' | 'long_rest' | 'special';

type ResourceTracker = {
  used: number;
  max: number;
  recovery: RecoveryType;
};

type ResourceTrackerMap = Record<string, ResourceTracker>;

type CharacterSystemDataWithResources = Character['systemData'] & {
  resourceTrackers?: ResourceTrackerMap;
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function safeLevel(level: number) {
  return clamp(level, 1, 20);
}

function safeHitDieSpent(hitDiceSpent: number, availableHitDice: number) {
  return clamp(hitDiceSpent, 0, Math.max(0, availableHitDice));
}

function safeSystemData(character: Character): CharacterSystemDataWithResources {
  return (character.systemData ?? {}) as CharacterSystemDataWithResources;
}

function findClassDefinition(classIdOrName: string) {
  return getClassById(classIdOrName.toLowerCase()) ?? getClassByName(classIdOrName);
}

function normalizeSpellSlots(
  className: string,
  level: number,
  spellSlots: Record<number, SpellSlotState>,
) {
  const fromTable = buildSpellSlotState(className, level, spellSlots);
  const merged: Record<number, SpellSlotState> = {};
  const keys = Array.from(
    new Set([...Object.keys(fromTable), ...Object.keys(spellSlots)].map((key) => Number(key))),
  ).sort((a, b) => a - b);

  keys.forEach((slotLevel) => {
    const tableState = fromTable[slotLevel];
    const existing = spellSlots[slotLevel];
    const max = tableState?.max ?? existing?.max ?? 0;
    const used = clamp(existing?.used ?? 0, 0, max);
    merged[slotLevel] = { max, used };
  });

  return merged;
}

function recoverSpellSlotsFully(character: Character): Record<number, SpellSlotState> {
  const normalized = normalizeSpellSlots(character.className, character.level, character.spellSlots);
  const recovered: Record<number, SpellSlotState> = {};

  Object.entries(normalized).forEach(([slotLevel, state]) => {
    recovered[Number(slotLevel)] = {
      max: state.max,
      used: 0,
    };
  });

  return recovered;
}

function recoverShortRestSpellSlotsIfApplicable(character: Character): Record<number, SpellSlotState> {
  const classDef = findClassDefinition(character.className);
  const recoversSlotsOnShortRest = classDef?.features.some(
    (feature) => feature.recoveryType === 'short' && feature.name.toLowerCase().includes('pact magic'),
  );

  if (!recoversSlotsOnShortRest) {
    return normalizeSpellSlots(character.className, character.level, character.spellSlots);
  }

  return recoverSpellSlotsFully(character);
}

function recoverTrackersByType(character: Character, allowed: RecoveryType[]) {
  const systemData = safeSystemData(character);
  const trackers = systemData.resourceTrackers;
  if (!trackers) return character.systemData;

  const nextTrackers: ResourceTrackerMap = {};
  Object.entries(trackers).forEach(([key, tracker]) => {
    if (allowed.includes(tracker.recovery)) {
      nextTrackers[key] = { ...tracker, used: 0 };
      return;
    }
    nextTrackers[key] = { ...tracker };
  });

  return {
    ...systemData,
    resourceTrackers: nextTrackers,
  };
}

export function getHitDieType(classId: string): HitDieType {
  return findClassDefinition(classId)?.hitDie ?? 'd8';
}

export function recoverHitPoints(character: Character, amount: number): Character {
  const recovered = clamp(amount, 0, Number.MAX_SAFE_INTEGER);
  const maxHitPoints = Math.max(1, character.maxHitPoints);
  const nextHitPoints = clamp(character.hitPoints + recovered, 0, maxHitPoints);

  return {
    ...character,
    hitPoints: nextHitPoints,
  };
}

export function applyShortRest(character: Character, hitDiceSpent: number): Character {
  const availableHitDice = Math.max(0, character.hitDice);
  const spend = safeHitDieSpent(hitDiceSpent, availableHitDice);
  const conMod = getAbilityModifier(character.abilities.con);
  const hitDieSize = Number(getHitDieType(character.className).slice(1));
  const averageRoll = Math.floor(hitDieSize / 2) + 1;
  const recoveredPerDie = Math.max(1, averageRoll + conMod);
  const totalRecovered = spend * recoveredPerDie;

  const withRecoveredHp = recoverHitPoints(character, totalRecovered);

  return {
    ...withRecoveredHp,
    hitDice: clamp(availableHitDice - spend, 0, Math.max(1, character.maxHitDice)),
    spellSlots: recoverShortRestSpellSlotsIfApplicable(character),
    systemData: recoverTrackersByType(character, ['short_rest']),
  };
}

export function applyLongRest(character: Character): Character {
  const level = safeLevel(character.level);
  const maxHitDice = Math.max(1, character.maxHitDice || level);
  const recoverHitDiceCount = Math.max(1, Math.floor(maxHitDice / 2));
  const nextHitDice = clamp(character.hitDice + recoverHitDiceCount, 0, maxHitDice);
  const nextExhaustion = clamp(character.exhaustionLevel - 1, 0, 6) as ExhaustionLevel;

  return {
    ...character,
    hitPoints: Math.max(1, character.maxHitPoints),
    hitDice: nextHitDice,
    maxHitDice,
    spellSlots: recoverSpellSlotsFully(character),
    exhaustionLevel: nextExhaustion,
    systemData: recoverTrackersByType(character, ['short_rest', 'long_rest']),
  };
}

export function getDefaultRestState(className: string, level: number) {
  const safe = safeLevel(level);
  return {
    hitDice: safe,
    maxHitDice: safe,
    spellSlots: buildSpellSlotState(className, safe, {}),
  };
}
