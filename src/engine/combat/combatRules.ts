import { getAbilityModifier } from '../character/modifiers';
import type {
  CombatActionEconomy,
  CombatActionKind,
  CombatAdvantageMode,
  CombatAiBehavior,
  CombatAttackType,
  Combatant,
  CombatantStatus,
  EncounterState,
} from '../../types';

export type DamageApplication = {
  amount: number;
  damageType?: string;
  isCritical?: boolean;
  bypassTempHp?: boolean;
};

export type DamageResult = {
  combatant: Combatant;
  appliedDamage: number;
  preventedDamage: number;
  tempHpLost: number;
  hpLost: number;
  concentrationDc?: number;
  instantDeath: boolean;
};

export type AttackResolution = {
  encounter: EncounterState;
  attackRoll: number;
  attackTotal: number;
  damageApplied: number;
  hit: boolean;
  critical: boolean;
  fumble: boolean;
  message: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function rollDie(sides: number, rng?: () => number) {
  const random = rng ? rng() : Math.random();
  return Math.floor(random * sides) + 1;
}

function rollD20(mode: CombatAdvantageMode = 'normal', rng?: () => number) {
  const first = rollDie(20, rng);
  if (mode === 'normal') return first;
  const second = rollDie(20, rng);
  return mode === 'advantage' ? Math.max(first, second) : Math.min(first, second);
}

export function defaultActionEconomy(): CombatActionEconomy {
  return {
    action: true,
    bonusAction: true,
    reaction: true,
    movementUsed: 0,
    freeActionUsed: false,
    readyAction: null,
    disengaged: false,
    dodging: false,
    dashed: false,
  };
}

export function resetActionEconomy(combatant: Combatant): Combatant {
  return {
    ...combatant,
    movementUsed: 0,
    actionEconomy: defaultActionEconomy(),
  };
}

export function markActionUsed(combatant: Combatant, kind: CombatActionKind): Combatant {
  const actionEconomy = combatant.actionEconomy ?? defaultActionEconomy();
  return {
    ...combatant,
    actionEconomy: {
      ...actionEconomy,
      [kind]: false,
    },
  };
}

export function spendMovement(combatant: Combatant, feet: number): Combatant {
  const speed = combatant.speed ?? 30;
  const actionEconomy = combatant.actionEconomy ?? defaultActionEconomy();
  const movementUsed = clamp((actionEconomy.movementUsed ?? combatant.movementUsed ?? 0) + Math.max(0, feet), 0, speed * 2);
  return {
    ...combatant,
    movementUsed,
    actionEconomy: {
      ...actionEconomy,
      movementUsed,
    },
  };
}

export function rollCombatantInitiative(combatant: Combatant, rng?: () => number): Combatant {
  const roll = rollDie(20, rng);
  const dexScore = combatant.dexScore ?? 10;
  const initiativeBonus = combatant.initiativeBonus ?? getAbilityModifier(dexScore);
  return {
    ...combatant,
    initiativeRoll: roll,
    initiative: roll + initiativeBonus,
  };
}

export function sortCombatantsByInitiative(combatants: Combatant[]): Combatant[] {
  return [...combatants].sort((left, right) => {
    if (right.initiative !== left.initiative) return right.initiative - left.initiative;
    const rightDex = right.dexScore ?? 10;
    const leftDex = left.dexScore ?? 10;
    if (rightDex !== leftDex) return rightDex - leftDex;
    if (left.type !== right.type) return left.type === 'player' ? -1 : 1;
    return left.name.localeCompare(right.name);
  });
}

function listIncludes(list: readonly string[] | undefined, damageType?: string) {
  if (!damageType || !list?.length) return false;
  const normalized = damageType.toLowerCase();
  return list.some((item) => item.toLowerCase() === normalized);
}

export function applyCombatDamage(combatant: Combatant, application: DamageApplication): DamageResult {
  const rawAmount = Math.max(0, Math.floor(application.amount));
  let appliedDamage = rawAmount;
  let preventedDamage = 0;

  if (listIncludes(combatant.immunities, application.damageType)) {
    preventedDamage = appliedDamage;
    appliedDamage = 0;
  } else {
    if (listIncludes(combatant.resistances, application.damageType)) {
      const resisted = Math.floor(appliedDamage / 2);
      preventedDamage += appliedDamage - resisted;
      appliedDamage = resisted;
    }
    if (listIncludes(combatant.vulnerabilities, application.damageType)) {
      appliedDamage *= 2;
    }
  }

  const startingHp = combatant.hitPoints;
  const startingTemp = application.bypassTempHp ? 0 : combatant.tempHitPoints;
  const tempHpLost = application.bypassTempHp ? 0 : Math.min(startingTemp, appliedDamage);
  const damageAfterTemp = appliedDamage - tempHpLost;
  const hpLost = Math.min(startingHp, damageAfterTemp);
  const nextHp = clamp(startingHp - damageAfterTemp, 0, combatant.maxHitPoints);
  const instantDeath = damageAfterTemp >= combatant.maxHitPoints && startingHp <= damageAfterTemp;
  const nextStatus: CombatantStatus =
    instantDeath ? 'dead' : nextHp <= 0 ? (combatant.type === 'player' ? 'dying' : 'unconscious') : 'active';
  const concentrationDc = combatant.concentration && appliedDamage > 0 ? Math.max(10, Math.floor(appliedDamage / 2)) : undefined;

  const nextCombatant: Combatant = {
    ...combatant,
    hitPoints: nextHp,
    tempHitPoints: application.bypassTempHp ? combatant.tempHitPoints : startingTemp - tempHpLost,
    status: nextStatus,
    lastDamageTaken: appliedDamage,
    deathSaves: instantDeath
      ? { successes: 0, failures: 3 }
      : nextHp > 0
        ? { successes: 0, failures: 0 }
        : combatant.deathSaves,
  };

  return {
    combatant: nextCombatant,
    appliedDamage,
    preventedDamage,
    tempHpLost,
    hpLost,
    concentrationDc,
    instantDeath,
  };
}

export function applyCombatHealing(combatant: Combatant, amount: number): Combatant {
  if (combatant.status === 'dead') return combatant;
  const nextHp = clamp(combatant.hitPoints + Math.max(0, Math.floor(amount)), 0, combatant.maxHitPoints);
  return {
    ...combatant,
    hitPoints: nextHp,
    status: nextHp > 0 ? 'active' : combatant.status,
    deathSaves: nextHp > 0 ? { successes: 0, failures: 0 } : combatant.deathSaves,
  };
}

export function applyCombatTempHp(combatant: Combatant, amount: number): Combatant {
  return {
    ...combatant,
    tempHitPoints: Math.max(combatant.tempHitPoints, Math.max(0, Math.floor(amount))),
  };
}

export function rollDeathSave(combatant: Combatant, rng?: () => number): { combatant: Combatant; roll: number; message: string } {
  const roll = rollDie(20, rng);
  if (roll === 20) {
    return {
      roll,
      combatant: { ...combatant, hitPoints: 1, status: 'active', deathSaves: { successes: 0, failures: 0 } },
      message: `${combatant.name} rolls a natural 20 and returns to 1 HP.`,
    };
  }

  const deltaFailure = roll === 1 ? 2 : roll >= 10 ? 0 : 1;
  const deltaSuccess = roll >= 10 && roll !== 1 ? 1 : 0;
  const successes = clamp(combatant.deathSaves.successes + deltaSuccess, 0, 3);
  const failures = clamp(combatant.deathSaves.failures + deltaFailure, 0, 3);
  const status: CombatantStatus = failures >= 3 ? 'dead' : successes >= 3 ? 'stable' : 'dying';

  return {
    roll,
    combatant: { ...combatant, status, deathSaves: { successes, failures } },
    message: `${combatant.name} death save ${roll}: ${successes} success, ${failures} failure.`,
  };
}

export function applyCondition(combatant: Combatant, condition: string, durationRounds?: number, saveEnds?: boolean): Combatant {
  const name = condition.trim();
  if (!name) return combatant;
  const conditions = combatant.conditions.includes(name) ? combatant.conditions : [...combatant.conditions, name];
  return {
    ...combatant,
    conditions,
    conditionInstances: [
      ...(combatant.conditionInstances ?? []).filter((entry) => entry.name !== name),
      {
        id: crypto.randomUUID(),
        name,
        durationRounds,
        remainingRounds: durationRounds,
        saveEnds,
        expiresOn: durationRounds ? 'turn_end' : saveEnds ? 'save_ends' : 'manual',
        combatOnly: true,
      },
    ],
  };
}

export function removeCondition(combatant: Combatant, condition: string): Combatant {
  return {
    ...combatant,
    conditions: combatant.conditions.filter((entry) => entry !== condition),
    conditionInstances: (combatant.conditionInstances ?? []).filter((entry) => entry.name !== condition),
  };
}

export function expireConditionsForTurn(combatant: Combatant, timing: 'turn_start' | 'turn_end'): Combatant {
  const instances = combatant.conditionInstances ?? [];
  const nextInstances = instances
    .map((entry) => {
      if (entry.expiresOn !== timing || typeof entry.remainingRounds !== 'number') return entry;
      return { ...entry, remainingRounds: Math.max(0, entry.remainingRounds - 1) };
    })
    .filter((entry) => entry.remainingRounds === undefined || entry.remainingRounds > 0);

  return {
    ...combatant,
    conditionInstances: nextInstances,
    conditions: nextInstances.map((entry) => entry.name),
  };
}

export function resolveAttack(encounter: EncounterState, options: {
  actorId: string;
  targetId: string;
  attackType: CombatAttackType;
  advantageMode?: CombatAdvantageMode;
  attackBonus?: number;
  damageAmount?: number;
  damageType?: string;
}, rng?: () => number): AttackResolution {
  const actor = encounter.combatants.find((entry) => entry.id === options.actorId);
  const target = encounter.combatants.find((entry) => entry.id === options.targetId);
  if (!actor || !target) {
    return {
      encounter,
      attackRoll: 0,
      attackTotal: 0,
      damageApplied: 0,
      hit: false,
      critical: false,
      fumble: false,
      message: 'Attack could not resolve because actor or target was missing.',
    };
  }

  const attackRoll = rollD20(options.advantageMode ?? 'normal', rng);
  const critical = attackRoll === 20;
  const fumble = attackRoll === 1;
  const attackBonus = options.attackBonus ?? 0;
  const attackTotal = attackRoll + attackBonus;
  const hit = critical || (!fumble && attackTotal >= target.armorClass);
  const damageAmount = hit ? Math.max(0, options.damageAmount ?? 0) * (critical ? 2 : 1) : 0;
  const damageResult = hit
    ? applyCombatDamage(target, { amount: damageAmount, damageType: options.damageType, isCritical: critical })
    : null;

  const nextCombatants = encounter.combatants.map((combatant) => {
    if (combatant.id === actor.id) return markActionUsed(combatant, 'action');
    if (damageResult && combatant.id === target.id) return damageResult.combatant;
    return combatant;
  });

  return {
    encounter: {
      ...encounter,
      combatants: nextCombatants,
      updatedAt: new Date().toISOString(),
    },
    attackRoll,
    attackTotal,
    damageApplied: damageResult?.appliedDamage ?? 0,
    hit,
    critical,
    fumble,
    message: hit
      ? `${actor.name} hits ${target.name} with a ${options.attackType} attack for ${damageResult?.appliedDamage ?? 0} damage.`
      : `${actor.name} misses ${target.name} with a ${options.attackType} attack.`,
  };
}

export function chooseEnemyTarget(encounter: EncounterState, enemy: Combatant): Combatant | null {
  const targets = encounter.combatants.filter((entry) => entry.type === 'player' && entry.status !== 'dead' && entry.hitPoints > 0);
  if (!targets.length) return null;
  const behavior: CombatAiBehavior = enemy.aiBehavior ?? 'aggressive';
  if (behavior === 'focused') return [...targets].sort((left, right) => left.hitPoints - right.hitPoints)[0] ?? null;
  if (behavior === 'defensive') return [...targets].sort((left, right) => right.armorClass - left.armorClass)[0] ?? null;
  if (behavior === 'random') return targets[Math.floor(Math.random() * targets.length)] ?? null;
  return [...targets].sort((left, right) => left.hitPoints - right.hitPoints)[0] ?? null;
}
