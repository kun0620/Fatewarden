import type { AbilityKey, ExhaustionLevel } from '../../types';
import type { ConditionId } from './conditions';

export interface MovementEffect {
  readonly speedMultiplier?: number;
  readonly speedOverride?: number;
  readonly cannotMoveCloser?: boolean;
  readonly crawlOnly?: boolean;
}

export interface ConditionEffect {
  readonly conditionId: ConditionId;
  readonly penalties: Readonly<Partial<Record<AbilityKey, number>>>;
  readonly checkDisadvantage: readonly string[];
  readonly checkAdvantage: readonly string[];
  readonly attackDisadvantage: boolean;
  readonly attackAdvantageAgainstTarget: boolean;
  readonly incomingAttackAdvantage: boolean;
  readonly incomingAttackDisadvantage: boolean;
  readonly saveDisadvantage: readonly AbilityKey[];
  readonly autoFailSaves: readonly AbilityKey[];
  readonly disabledActions: readonly string[];
  readonly movement: MovementEffect;
}

export interface ExhaustionEffect {
  readonly level: ExhaustionLevel;
  readonly checkDisadvantage: boolean;
  readonly speedMultiplier: number;
  readonly attackDisadvantage: boolean;
  readonly saveDisadvantage: boolean;
  readonly maxHpMultiplier: number;
  readonly speedOverride?: number;
  readonly dead: boolean;
  readonly description: string;
}

const EMPTY_EFFECT: Omit<ConditionEffect, 'conditionId'> = {
  penalties: {},
  checkDisadvantage: [],
  checkAdvantage: [],
  attackDisadvantage: false,
  attackAdvantageAgainstTarget: false,
  incomingAttackAdvantage: false,
  incomingAttackDisadvantage: false,
  saveDisadvantage: [],
  autoFailSaves: [],
  disabledActions: [],
  movement: {},
};

export const conditionEffects: Record<ConditionId, ConditionEffect> = {
  blinded: {
    conditionId: 'blinded',
    ...EMPTY_EFFECT,
    checkDisadvantage: ['sight'],
    attackDisadvantage: true,
    incomingAttackAdvantage: true,
  },
  charmed: {
    conditionId: 'charmed',
    ...EMPTY_EFFECT,
    disabledActions: ['attack_charmer'],
  },
  deafened: {
    conditionId: 'deafened',
    ...EMPTY_EFFECT,
    checkDisadvantage: ['hearing'],
  },
  frightened: {
    conditionId: 'frightened',
    ...EMPTY_EFFECT,
    attackDisadvantage: true,
    checkDisadvantage: ['while_source_visible'],
    movement: { cannotMoveCloser: true },
  },
  grappled: {
    conditionId: 'grappled',
    ...EMPTY_EFFECT,
    movement: { speedOverride: 0 },
  },
  incapacitated: {
    conditionId: 'incapacitated',
    ...EMPTY_EFFECT,
    disabledActions: ['action', 'reaction'],
  },
  invisible: {
    conditionId: 'invisible',
    ...EMPTY_EFFECT,
    attackAdvantageAgainstTarget: true,
    incomingAttackDisadvantage: true,
  },
  paralyzed: {
    conditionId: 'paralyzed',
    ...EMPTY_EFFECT,
    disabledActions: ['action', 'reaction', 'movement', 'speech'],
    autoFailSaves: ['str', 'dex'],
    incomingAttackAdvantage: true,
    movement: { speedOverride: 0 },
  },
  petrified: {
    conditionId: 'petrified',
    ...EMPTY_EFFECT,
    disabledActions: ['action', 'reaction', 'movement', 'speech'],
    autoFailSaves: ['str', 'dex'],
    incomingAttackAdvantage: true,
    movement: { speedOverride: 0 },
  },
  poisoned: {
    conditionId: 'poisoned',
    ...EMPTY_EFFECT,
    attackDisadvantage: true,
    checkDisadvantage: ['all'],
  },
  prone: {
    conditionId: 'prone',
    ...EMPTY_EFFECT,
    attackDisadvantage: true,
    incomingAttackAdvantage: true,
    movement: { crawlOnly: true },
  },
  restrained: {
    conditionId: 'restrained',
    ...EMPTY_EFFECT,
    attackDisadvantage: true,
    incomingAttackAdvantage: true,
    saveDisadvantage: ['dex'],
    movement: { speedOverride: 0 },
  },
  stunned: {
    conditionId: 'stunned',
    ...EMPTY_EFFECT,
    disabledActions: ['action', 'reaction', 'movement'],
    autoFailSaves: ['str', 'dex'],
    incomingAttackAdvantage: true,
    movement: { speedOverride: 0 },
  },
  unconscious: {
    conditionId: 'unconscious',
    ...EMPTY_EFFECT,
    disabledActions: ['action', 'reaction', 'movement', 'speech', 'awareness'],
    autoFailSaves: ['str', 'dex'],
    incomingAttackAdvantage: true,
    movement: { speedOverride: 0 },
  },
};

const exhaustionEffects: Record<ExhaustionLevel, ExhaustionEffect> = {
  0: {
    level: 0,
    checkDisadvantage: false,
    speedMultiplier: 1,
    attackDisadvantage: false,
    saveDisadvantage: false,
    maxHpMultiplier: 1,
    dead: false,
    description: 'No exhaustion.',
  },
  1: {
    level: 1,
    checkDisadvantage: true,
    speedMultiplier: 1,
    attackDisadvantage: false,
    saveDisadvantage: false,
    maxHpMultiplier: 1,
    dead: false,
    description: 'Disadvantage on ability checks.',
  },
  2: {
    level: 2,
    checkDisadvantage: true,
    speedMultiplier: 0.5,
    attackDisadvantage: false,
    saveDisadvantage: false,
    maxHpMultiplier: 1,
    dead: false,
    description: 'Speed halved.',
  },
  3: {
    level: 3,
    checkDisadvantage: true,
    speedMultiplier: 0.5,
    attackDisadvantage: true,
    saveDisadvantage: false,
    maxHpMultiplier: 1,
    dead: false,
    description: 'Disadvantage on attack rolls and saving throws.',
  },
  4: {
    level: 4,
    checkDisadvantage: true,
    speedMultiplier: 0.5,
    attackDisadvantage: true,
    saveDisadvantage: true,
    maxHpMultiplier: 0.5,
    dead: false,
    description: 'Hit point maximum halved.',
  },
  5: {
    level: 5,
    checkDisadvantage: true,
    speedMultiplier: 0,
    speedOverride: 0,
    attackDisadvantage: true,
    saveDisadvantage: true,
    maxHpMultiplier: 0.5,
    dead: false,
    description: 'Speed reduced to 0.',
  },
  6: {
    level: 6,
    checkDisadvantage: true,
    speedMultiplier: 0,
    speedOverride: 0,
    attackDisadvantage: true,
    saveDisadvantage: true,
    maxHpMultiplier: 0.5,
    dead: true,
    description: 'Death.',
  },
};

export function getExhaustionEffects(level: ExhaustionLevel): ExhaustionEffect {
  return exhaustionEffects[level];
}

