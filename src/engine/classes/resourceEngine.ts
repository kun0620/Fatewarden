import { getClassById, getClassByName } from '../../data/classes';
import type { Character } from '../../types';
import type { ClassResource, ClassRuntime } from './classTypes';
import { buildClassRuntime } from './classRuntime';

export type ResourceRecovery = 'short' | 'long';

export type ClassResourceDefinition = {
  id: string;
  label: string;
  recovery: ResourceRecovery;
  max: (character: Character) => number;
};

export type RuntimeResourceState = {
  id: string;
  label: string;
  max: number;
  used: number;
  recovery: ResourceRecovery;
};

export type RuntimeResourceMap = Record<string, RuntimeResourceState>;

type ClassRuntimeData = Character['systemData'] & {
  classRuntime?: Partial<ClassRuntime> & {
    // legacy shape support
    resources?: ClassResource[] | Record<string, { used: number }>;
  };
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function getClassId(className: string) {
  return (
    getClassById(className.trim().toLowerCase())?.id
    ?? getClassByName(className)?.id
    ?? className.trim().toLowerCase()
  );
}

export function getClassResourceDefinitions(character: Character): ClassResourceDefinition[] {
  const classId = getClassId(character.className);
  const runtime = buildClassRuntime(classId, undefined, character.level, character);
  return runtime.resources.map((resource) => ({
    id: resource.id,
    label: resource.name,
    recovery: resource.recoveryType === 'special' ? 'long' : resource.recoveryType,
    max: () => resource.max,
  }));
}

export function getResourceState(character: Character): RuntimeResourceMap {
  const runtimeData = (character.systemData ?? {}) as ClassRuntimeData;
  const runtimeResources = runtimeData.classRuntime?.resources;
  const classId = getClassId(character.className);
  const fallbackRuntime = buildClassRuntime(classId, runtimeData.classRuntime?.subclassId, character.level, character);
  const normalizedResources: ClassResource[] = Array.isArray(runtimeResources)
    ? runtimeResources
    : fallbackRuntime.resources;
  const next: RuntimeResourceMap = {};

  normalizedResources.forEach((resource) => {
    const max = Math.max(0, Math.trunc(resource.max));
    const current = clamp(resource.current, 0, max === 999 ? Number.MAX_SAFE_INTEGER : max);
    const used = max === 999 ? 0 : Math.max(0, max - current);
    next[resource.id] = {
      id: resource.id,
      label: resource.name,
      max,
      used,
      recovery: resource.recoveryType === 'special' ? 'long' : resource.recoveryType,
    };
  });

  // Legacy map support for old saved shape
  if (!Array.isArray(runtimeResources) && runtimeResources && typeof runtimeResources === 'object') {
    Object.entries(runtimeResources).forEach(([resourceId, value]) => {
      if (!next[resourceId]) return;
      const usedValue = (value as { used?: number } | undefined)?.used ?? 0;
      const used = clamp(usedValue, 0, next[resourceId].max === 999 ? Number.MAX_SAFE_INTEGER : next[resourceId].max);
      next[resourceId] = { ...next[resourceId], used };
    });
  }

  return next;
}

export function writeResourceState(character: Character, resources: RuntimeResourceMap): Character {
  const runtimeData = (character.systemData ?? {}) as ClassRuntimeData;
  const classId = getClassId(character.className);
  const fallbackRuntime = buildClassRuntime(classId, runtimeData.classRuntime?.subclassId, character.level, character);
  const existingResources = Array.isArray(runtimeData.classRuntime?.resources)
    ? runtimeData.classRuntime.resources
    : fallbackRuntime.resources;
  const existingById = new Map(existingResources.map((resource) => [resource.id, resource]));

  const safeResources = Object.values(resources).map<ClassResource>((resource) => {
    const prev = existingById.get(resource.id);
    const max = Math.max(0, Math.trunc(resource.max));
    const used = Math.max(0, Math.trunc(resource.used));
    const current = max === 999 ? (prev?.current ?? max) : Math.max(0, max - Math.min(used, max));
    return {
      id: resource.id,
      name: prev?.name ?? resource.label,
      current,
      max,
      recoveryType: prev?.recoveryType ?? resource.recovery,
    };
  });

  return {
    ...character,
    systemData: {
      ...runtimeData,
      classRuntime: {
        ...fallbackRuntime,
        ...runtimeData.classRuntime,
        resources: safeResources,
      },
    },
  };
}

export function useResource(
  character: Character,
  resourceId: string,
  amount = 1,
): { character: Character; success: boolean } {
  const resources = getResourceState(character);
  const target = resources[resourceId];
  if (!target) return { character, success: false };

  const spend = Math.max(1, Math.trunc(amount));
  if (target.max !== 999 && target.used + spend > target.max) {
    return { character, success: false };
  }

  const nextResources: RuntimeResourceMap = {
    ...resources,
    [resourceId]: {
      ...target,
      used: target.used + spend,
    },
  };
  return {
    character: writeResourceState(character, nextResources),
    success: true,
  };
}

export function recoverResourcesByRest(character: Character, restType: ResourceRecovery): Character {
  const resources = getResourceState(character);
  const nextResources: RuntimeResourceMap = {};

  Object.values(resources).forEach((resource) => {
    const shouldRecover = restType === 'long'
      ? true
      : resource.recovery === 'short';

    nextResources[resource.id] = shouldRecover
      ? { ...resource, used: 0 }
      : { ...resource };
  });

  return writeResourceState(character, nextResources);
}
