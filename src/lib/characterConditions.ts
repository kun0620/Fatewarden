import type { AbilityKey, Character, ConditionEffect, ExhaustionEffect, ExhaustionLevel } from '../types';

type ConditionMap = Record<string, ConditionEffect>;

const srDConditions: ConditionMap = {
  blinded: {
    name: 'Blinded',
    penalties: {},
    disabledActions: ['Perception checks that rely on sight'],
    description:
      'Cannot see and automatically fails ability checks requiring sight. Attack rolls against the creature have advantage, and the creature attack rolls have disadvantage.',
  },
  charmed: {
    name: 'Charmed',
    penalties: {},
    disabledActions: ['Attack the charmer', 'Harmful abilities against the charmer'],
    description:
      'Cannot attack the charmer or target the charmer with harmful abilities or magical effects. Charmer has advantage on social checks with the creature.',
  },
  deafened: {
    name: 'Deafened',
    penalties: {},
    disabledActions: ['Perception checks that rely on hearing'],
    description: 'Cannot hear and automatically fails ability checks requiring hearing.',
  },
  frightened: {
    name: 'Frightened',
    penalties: {},
    disabledActions: ['Move closer to the source of fear'],
    description:
      'Has disadvantage on ability checks and attack rolls while the source of fear is in line of sight and cannot willingly move closer to it.',
  },
  grappled: {
    name: 'Grappled',
    penalties: {},
    disabledActions: ['Move'],
    description: 'Speed becomes 0 and the creature cannot benefit from bonuses to speed.',
  },
  incapacitated: {
    name: 'Incapacitated',
    penalties: {},
    disabledActions: ['Actions', 'Reactions'],
    description: 'Cannot take actions or reactions.',
  },
  invisible: {
    name: 'Invisible',
    penalties: {},
    disabledActions: [],
    description:
      'Impossible to see without special sense or magic. Creature is heavily obscured for hiding; attack rolls against it have disadvantage, and its attack rolls have advantage.',
  },
  paralyzed: {
    name: 'Paralyzed',
    penalties: { str: -99, dex: -99 },
    disabledActions: ['Move', 'Speak', 'Actions', 'Reactions'],
    description:
      'Incapacitated and cannot move or speak. Automatically fails STR and DEX saves. Attack rolls against it have advantage; hits within 5 feet are critical.',
  },
  petrified: {
    name: 'Petrified',
    penalties: { str: -99, dex: -99 },
    disabledActions: ['Move', 'Speak', 'Actions', 'Reactions'],
    description:
      'Transformed into inert substance, incapacitated, cannot move/speak, unaware of surroundings. Automatically fails STR and DEX saves; attack rolls against it have advantage.',
  },
  poisoned: {
    name: 'Poisoned',
    penalties: {},
    disabledActions: [],
    description: 'Has disadvantage on attack rolls and ability checks.',
  },
  prone: {
    name: 'Prone',
    penalties: {},
    disabledActions: ['Stand without movement cost'],
    description:
      'Movement option is crawl unless standing up. Attack rolls against it have advantage if attacker is within 5 ft; otherwise attacks against it have disadvantage.',
  },
  restrained: {
    name: 'Restrained',
    penalties: { dex: -99 },
    disabledActions: ['Move'],
    description:
      'Speed becomes 0. Attack rolls against it have advantage, its attack rolls have disadvantage, and it has disadvantage on DEX saves.',
  },
  stunned: {
    name: 'Stunned',
    penalties: { str: -99, dex: -99 },
    disabledActions: ['Move', 'Actions', 'Reactions', 'Speak falteringly'],
    description:
      'Incapacitated, cannot move, can speak only falteringly. Automatically fails STR and DEX saves. Attack rolls against it have advantage.',
  },
  unconscious: {
    name: 'Unconscious',
    penalties: { str: -99, dex: -99 },
    disabledActions: ['Move', 'Actions', 'Reactions', 'Speak'],
    description:
      'Incapacitated, cannot move/speak, unaware of surroundings, drops held items, falls prone. Automatically fails STR and DEX saves; attacks against it have advantage; hits within 5 feet are critical.',
  },
};

const defaultConditionEffect: ConditionEffect = {
  name: 'Unknown',
  penalties: {},
  disabledActions: [],
  description: 'No rule reference found for this condition.',
};

function normalizeConditionName(condition: string) {
  return condition.trim().toLowerCase();
}

function toTitleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(' ');
}

function toUniqueConditions(conditions: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  conditions.forEach((condition) => {
    const normalized = normalizeConditionName(condition);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(toTitleCase(condition));
  });
  return result;
}

function clampExhaustionLevel(level: number): ExhaustionLevel {
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(6, Math.trunc(level))) as ExhaustionLevel;
}

export function getConditionEffect(condition: string): ConditionEffect {
  const key = normalizeConditionName(condition);
  if (!key) return defaultConditionEffect;
  const known = srDConditions[key];
  if (!known) {
    return {
      ...defaultConditionEffect,
      name: toTitleCase(condition),
    };
  }
  return known;
}

export function applyConditionToCharacter(character: Character, condition: string): Character {
  const nextConditions = toUniqueConditions([...character.activeConditions, condition]);
  return {
    ...character,
    activeConditions: nextConditions,
  };
}

export function removeConditionFromCharacter(character: Character, condition: string): Character {
  const target = normalizeConditionName(condition);
  const nextConditions = character.activeConditions.filter(
    (knownCondition) => normalizeConditionName(knownCondition) !== target,
  );
  return {
    ...character,
    activeConditions: toUniqueConditions(nextConditions),
  };
}

export function getExhaustionPenalties(level: ExhaustionLevel | number): ExhaustionEffect {
  const safeLevel = clampExhaustionLevel(typeof level === 'number' ? level : Number(level));
  const base: ExhaustionEffect = {
    level: safeLevel,
    description: 'No penalties.',
    disadvantageAbilityChecks: false,
    speedMultiplier: 1,
    disadvantageAttackRolls: false,
    disadvantageSavingThrows: false,
    hitPointMaximumMultiplier: 1,
    speedBecomesZero: false,
    dead: false,
  };

  if (safeLevel >= 1) {
    base.description = 'Disadvantage on ability checks.';
    base.disadvantageAbilityChecks = true;
  }
  if (safeLevel >= 2) {
    base.description = 'Speed halved.';
    base.speedMultiplier = 0.5;
  }
  if (safeLevel >= 3) {
    base.description = 'Disadvantage on attack rolls and saving throws.';
    base.disadvantageAttackRolls = true;
    base.disadvantageSavingThrows = true;
  }
  if (safeLevel >= 4) {
    base.description = 'Hit point maximum halved.';
    base.hitPointMaximumMultiplier = 0.5;
  }
  if (safeLevel >= 5) {
    base.description = 'Speed reduced to 0.';
    base.speedBecomesZero = true;
    base.speedMultiplier = 0;
  }
  if (safeLevel >= 6) {
    base.description = 'Death.';
    base.dead = true;
  }

  return base;
}

export const srdConditionList = Object.values(srDConditions).map((condition) => condition.name);

export const conditionAbilitiesImpacted: Partial<Record<AbilityKey, string[]>> = {
  str: ['Paralyzed', 'Petrified', 'Stunned', 'Unconscious'],
  dex: ['Paralyzed', 'Petrified', 'Restrained', 'Stunned', 'Unconscious'],
};
