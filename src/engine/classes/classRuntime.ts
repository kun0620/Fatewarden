import { getClassById, getClassByName, type ClassFeature } from '../../data/classes';
import { warlockPactSlots } from '../../data/spellSlots';
import type { Character } from '../../types';
import type { ClassResource, ClassRuntime } from './classTypes';

type RecoveryType = 'short' | 'long';

function clampLevel(level: number) {
  if (!Number.isFinite(level)) return 1;
  return Math.max(1, Math.min(20, Math.trunc(level)));
}

function normalizeClassId(classId: string) {
  return classId.trim().toLowerCase();
}

function resolveClassId(classId: string) {
  const normalized = normalizeClassId(classId);
  return (
    getClassById(normalized)?.id
    ?? getClassByName(classId)?.id
    ?? normalized
  );
}

function getRageLevelBonus(level: number) {
  if (level >= 17) return 4;
  if (level >= 12) return 3;
  if (level >= 6) return 2;
  if (level >= 3) return 1;
  return 0;
}

function buildResourcesForClass(classId: string, level: number): ClassResource[] {
  const safeLevel = clampLevel(level);

  switch (classId) {
    case 'barbarian':
      return [{
        id: 'rage',
        name: 'Rage',
        current: 2 + getRageLevelBonus(safeLevel),
        max: 2 + getRageLevelBonus(safeLevel),
        recoveryType: 'long',
      }];
    case 'monk':
      return [{
        id: 'ki',
        name: 'Ki',
        current: safeLevel,
        max: safeLevel,
        recoveryType: 'short',
      }];
    case 'fighter':
      return [
        {
          id: 'action_surge',
          name: 'Action Surge',
          current: 1,
          max: 1,
          recoveryType: 'short',
        },
        {
          id: 'second_wind',
          name: 'Second Wind',
          current: 1,
          max: 1,
          recoveryType: 'short',
        },
      ];
    case 'paladin':
      return [
        {
          id: 'lay_on_hands',
          name: 'Lay on Hands',
          current: safeLevel * 5,
          max: safeLevel * 5,
          recoveryType: 'long',
        },
        {
          id: 'channel_divinity',
          name: 'Channel Divinity',
          current: 1,
          max: 1,
          recoveryType: 'short',
        },
      ];
    case 'cleric':
      return [{
        id: 'channel_divinity',
        name: 'Channel Divinity',
        current: 1,
        max: 1,
        recoveryType: 'short',
      }];
    case 'druid':
      return [{
        id: 'wild_shape',
        name: 'Wild Shape',
        current: 2,
        max: 2,
        recoveryType: 'short',
      }];
    case 'warlock': {
      const pact = warlockPactSlots[safeLevel];
      const slots = pact?.slotCount ?? 0;
      return [{
        id: 'pact_magic',
        name: 'Pact Magic',
        current: slots,
        max: slots,
        recoveryType: 'short',
      }];
    }
    default:
      return [];
  }
}

export function getFeaturesAtLevel(classId: string, level: number): ClassFeature[] {
  const classDef = getClassById(resolveClassId(classId)) ?? getClassByName(classId);
  if (!classDef) return [];
  const safeLevel = clampLevel(level);
  return classDef.features.filter((feature) => feature.level === safeLevel);
}

export function buildClassRuntime(
  classId: string,
  subclassId: string | undefined,
  level: number,
  character: Character,
): ClassRuntime {
  const resolvedClassId = resolveClassId(classId || character.className);
  const safeLevel = clampLevel(level || character.level);
  const classDef = getClassById(resolvedClassId) ?? getClassByName(character.className);
  const allFeatures = classDef?.features ?? [];

  return {
    classId: resolvedClassId,
    subclassId,
    level: safeLevel,
    resources: buildResourcesForClass(resolvedClassId, safeLevel),
    activeFeatures: allFeatures
      .filter((feature) => feature.level <= safeLevel)
      .map((feature) => feature.name),
    learnedSpells: character.spells.length > 0 ? [...character.spells] : undefined,
  };
}

export function spendResource(runtime: ClassRuntime, resourceId: string, amount: number): ClassRuntime | null {
  const spendAmount = Math.max(1, Math.trunc(amount));
  const target = runtime.resources.find((resource) => resource.id === resourceId);
  if (!target || target.current < spendAmount) return null;

  return {
    ...runtime,
    resources: runtime.resources.map((resource) => (
      resource.id === resourceId
        ? { ...resource, current: resource.current - spendAmount }
        : resource
    )),
  };
}

export function recoverResources(runtime: ClassRuntime, recoveryType: RecoveryType): ClassRuntime {
  return {
    ...runtime,
    resources: runtime.resources.map((resource) => (
      resource.recoveryType === recoveryType
        ? { ...resource, current: resource.max }
        : resource
    )),
  };
}
