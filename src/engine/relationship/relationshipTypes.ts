export type AffinityTier = 'allied' | 'friendly' | 'neutral' | 'unfriendly' | 'hostile';

export interface AffinityHistoryEntry {
  delta: number;
  reason: string;
  createdAt: number;
}

export interface AffinityRecord {
  id: string;
  characterId: string;
  npcId: string;
  npcName: string;
  npcRole?: string;
  affinity: number; // -100..+100
  tier: AffinityTier;
  history: AffinityHistoryEntry[];
}

export interface RelationshipState {
  records: AffinityRecord[];
}
