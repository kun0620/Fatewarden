import type { AbilityKey } from '../../types';
import type { CompanionBehavior, CompanionSheet } from './companionTypes';
import type { CombatParticipant } from '../combat/combatTypes';

type CompanionTier = CompanionSheet['loyalty']['tier'];

export type CompanionActionTarget = {
  id: string;
  armorClass?: number;
  hitPoints: number;
  maxHitPoints?: number;
  abilities?: Partial<Record<AbilityKey, number>>;
};

export type CompanionActionResult = {
  companionId: string;
  actionType: 'attack' | 'defend' | 'heal' | 'skip';
  targetId?: string;
  roll?: number;
  value?: number;
  description: string;
};

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function parseDice(dice: string) {
  const match = dice.trim().match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) return null;
  return {
    count: Number(match[1]),
    sides: Number(match[2]),
    modifier: match[3] ? Number(match[3]) : 0,
  };
}

function rollFormula(dice: string) {
  const parsed = parseDice(dice);
  if (!parsed) {
    return {
      total: 0,
      rolls: [] as number[],
    };
  }

  const rolls = Array.from({ length: parsed.count }, () => randomInt(1, parsed.sides));
  return {
    total: rolls.reduce((sum, value) => sum + value, 0) + parsed.modifier,
    rolls,
  };
}

function abilityModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

function loyaltyTier(current: number): CompanionTier {
  if (current <= 0) return 'betrayal';
  if (current <= 24) return 'hostile';
  if (current <= 49) return 'neutral';
  if (current <= 74) return 'friendly';
  return 'devoted';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function findLowestHpTarget(targets: CompanionActionTarget[]) {
  if (!targets.length) return null;
  return targets.reduce((lowest, current) => (current.hitPoints < lowest.hitPoints ? current : lowest), targets[0]);
}

export function createCompanion(
  ownerId: string,
  name: string,
  type: CompanionSheet['type'],
  snapshot: CompanionSheet['characterSnapshot'],
): CompanionSheet {
  return {
    id: crypto.randomUUID(),
    name: name.trim() || 'Companion',
    type,
    ownerId,
    characterSnapshot: {
      ...snapshot,
      conditions: [...snapshot.conditions],
      abilities: { ...snapshot.abilities },
    },
    behavior: 'defensive',
    loyalty: {
      current: 50,
      tier: 'neutral',
    },
    controlMode: 'auto',
    resources: [],
    isActive: true,
    createdAt: Date.now(),
  };
}

export function companionToCombatParticipant(companion: CompanionSheet): CombatParticipant {
  const dexScore = companion.characterSnapshot.abilities.dex ?? 10;
  return {
    id: companion.id,
    characterId: companion.id,
    name: companion.name,
    type: 'companion',
    initiativeScore: null,
    dexScore,
    armorClass: companion.characterSnapshot.armorClass,
    hitPoints: companion.characterSnapshot.hitPoints,
    maxHitPoints: companion.characterSnapshot.maxHitPoints,
    tempHitPoints: 0,
    speed: companion.characterSnapshot.speed,
    resistances: [],
    conditions: [...companion.characterSnapshot.conditions],
    status: companion.characterSnapshot.hitPoints <= 0 ? 'unconscious' : 'active',
    joinedOrder: 0,
  };
}

export function adjustLoyalty(companion: CompanionSheet, delta: number): CompanionSheet {
  const current = clamp(companion.loyalty.current + delta, 0, 100);
  return {
    ...companion,
    loyalty: {
      current,
      tier: loyaltyTier(current),
    },
  };
}

export function setCompanionBehavior(companion: CompanionSheet, behavior: CompanionBehavior): CompanionSheet {
  return {
    ...companion,
    behavior,
  };
}

export function applyDamageToCompanion(companion: CompanionSheet, amount: number): CompanionSheet {
  const damage = Math.max(0, Math.floor(amount));
  const nextHp = Math.max(0, companion.characterSnapshot.hitPoints - damage);
  return {
    ...companion,
    isActive: nextHp > 0,
    characterSnapshot: {
      ...companion.characterSnapshot,
      hitPoints: nextHp,
    },
  };
}

export function resolveCompanionAction(
  companion: CompanionSheet,
  targets: CompanionActionTarget[],
): CompanionActionResult {
  if (!companion.isActive) {
    return {
      companionId: companion.id,
      actionType: 'skip',
      description: `${companion.name} ไม่สามารถทำอะไรได้ในตอนนี้`,
    };
  }

  if (companion.behavior === 'passive') {
    return {
      companionId: companion.id,
      actionType: 'skip',
      description: `${companion.name} เลือกเฝ้าดูสถานการณ์และยังไม่ลงมือ`,
    };
  }

  if (companion.behavior === 'defensive') {
    return {
      companionId: companion.id,
      actionType: 'defend',
      targetId: companion.ownerId,
      value: 2,
      description: `${companion.name} เข้าคุ้มกันเจ้าของ เพิ่ม AC +2 จนจบเทิร์น`,
    };
  }

  if (companion.behavior === 'support') {
    const target = findLowestHpTarget(targets);
    if (!target) {
      return {
        companionId: companion.id,
        actionType: 'skip',
        description: `${companion.name} พยายามสนับสนุน แต่ไม่มีเป้าหมายที่เหมาะสม`,
      };
    }

    const wis = companion.characterSnapshot.abilities.wis ?? 10;
    const healRoll = randomInt(1, 4);
    const healValue = Math.max(1, healRoll + abilityModifier(wis));

    return {
      companionId: companion.id,
      actionType: 'heal',
      targetId: target.id,
      roll: healRoll,
      value: healValue,
      description: `${companion.name} ฟื้นฟู ${target.id} ด้วยพลังสนับสนุน (${healRoll} + WIS) ได้ ${healValue} HP`,
    };
  }

  const target = findLowestHpTarget(targets);
  if (!target) {
    return {
      companionId: companion.id,
      actionType: 'skip',
      description: `${companion.name} มองไม่เห็นเป้าหมายสำหรับการโจมตี`,
    };
  }

  const dex = companion.characterSnapshot.abilities.dex ?? 10;
  const attackRoll = randomInt(1, 20) + abilityModifier(dex);
  const damage = rollFormula(companion.characterSnapshot.attackDice);
  const value = Math.max(1, damage.total);

  return {
    companionId: companion.id,
    actionType: 'attack',
    targetId: target.id,
    roll: attackRoll,
    value,
    description: `${companion.name} โจมตี ${target.id} (ทอย ${attackRoll}) สร้างความเสียหาย ${value} ${companion.characterSnapshot.attackType}`,
  };
}
