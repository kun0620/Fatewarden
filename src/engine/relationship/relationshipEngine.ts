import type { AffinityRecord, AffinityTier, RelationshipState } from './relationshipTypes';

export function getAffinityTier(score: number): AffinityTier {
  if (score >= 76) return 'allied';
  if (score >= 26) return 'friendly';
  if (score >= -25) return 'neutral';
  if (score >= -75) return 'unfriendly';
  return 'hostile';
}

export function getRecord(
  state: RelationshipState,
  characterId: string,
  npcId: string,
): AffinityRecord | undefined {
  return state.records.find((r) => r.characterId === characterId && r.npcId === npcId);
}

export function adjustAffinity(
  state: RelationshipState,
  characterId: string,
  npcId: string,
  npcName: string,
  delta: number,
  reason: string,
): RelationshipState {
  const existing = getRecord(state, characterId, npcId);
  const now = Date.now();

  if (existing) {
    const newAffinity = Math.max(-100, Math.min(100, existing.affinity + delta));
    const updated: AffinityRecord = {
      ...existing,
      affinity: newAffinity,
      tier: getAffinityTier(newAffinity),
      history: [...existing.history, { delta, reason, createdAt: now }],
    };
    return {
      records: state.records.map((r) =>
        r.characterId === characterId && r.npcId === npcId ? updated : r,
      ),
    };
  }

  const initialAffinity = Math.max(-100, Math.min(100, delta));
  const newRecord: AffinityRecord = {
    id: crypto.randomUUID(),
    characterId,
    npcId,
    npcName,
    affinity: initialAffinity,
    tier: getAffinityTier(initialAffinity),
    history: [{ delta, reason, createdAt: now }],
  };
  return { records: [...state.records, newRecord] };
}
