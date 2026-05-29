import type { AbilityKey, DamageType } from '../../types';

export type CompanionBehavior = 'aggressive' | 'defensive' | 'support' | 'passive';

export type CompanionLoyalty = {
  current: number;
  tier: 'hostile' | 'neutral' | 'friendly' | 'devoted';
};

export type CompanionResource = {
  id: string;
  name: string;
  current: number;
  max: number;
};

export type CompanionSheet = {
  id: string;
  name: string;
  type: 'npc' | 'beast' | 'summon' | 'hireling';
  ownerId: string;
  characterSnapshot: {
    armorClass: number;
    hitPoints: number;
    maxHitPoints: number;
    speed: number;
    abilities: Record<AbilityKey, number>;
    attackDice: string;
    attackType: DamageType;
    conditions: string[];
  };
  behavior: CompanionBehavior;
  loyalty: CompanionLoyalty;
  resources: CompanionResource[];
  isActive: boolean;
  createdAt: number;
};

export type CompanionState = {
  companions: CompanionSheet[];
};
