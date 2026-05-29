import { getClassById, getClassByName, type ClassFeature } from '../../data/classes';
import type { Character } from '../../types';
import { getResourceState, type RuntimeResourceMap } from './resourceEngine';

export type FeatureType = 'passive' | 'active' | 'triggered';

export type RuntimeFeature = {
  id: string;
  name: string;
  description: string;
  level: number;
  type: FeatureType;
  recovery?: 'short' | 'long';
  requiresChoice: boolean;
  available: boolean;
  remainingUses?: number | null;
};

function getClassDefinition(className: string) {
  return (
    getClassById(className.trim().toLowerCase())
    ?? getClassByName(className)
  );
}

function toFeatureType(feature: ClassFeature): FeatureType {
  const normalized = feature.name.toLowerCase();
  if (feature.recoveryType) return 'active';
  if (
    normalized.includes('reaction')
    || normalized.includes('when ')
    || normalized.includes('if ')
  ) {
    return 'triggered';
  }
  return 'passive';
}

function normalizeFeatureId(feature: ClassFeature) {
  return feature.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function findResourceForFeature(feature: ClassFeature, resources: RuntimeResourceMap) {
  const byName = feature.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return Object.values(resources).find((resource) => byName.includes(resource.id));
}

export function buildRuntimeFeature(
  feature: ClassFeature,
  resources: RuntimeResourceMap,
): RuntimeFeature {
  const resource = findResourceForFeature(feature, resources);
  const max = resource?.max ?? null;
  const remainingUses = resource
    ? (resource.max === 999 ? null : Math.max(0, resource.max - resource.used))
    : undefined;

  return {
    id: normalizeFeatureId(feature),
    name: feature.name,
    description: feature.description,
    level: feature.level,
    type: toFeatureType(feature),
    recovery: feature.recoveryType,
    requiresChoice: Boolean(feature.isChoice),
    available: max === null ? true : max === 999 || (remainingUses ?? 0) > 0,
    remainingUses,
  };
}

export function getFeatureSet(character: Character): RuntimeFeature[] {
  const classDef = getClassDefinition(character.className);
  if (!classDef) return [];
  const resources = getResourceState(character);
  return classDef.features
    .filter((feature) => feature.level <= character.level)
    .map((feature) => buildRuntimeFeature(feature, resources));
}
