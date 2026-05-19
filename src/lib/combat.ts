import type {
  CombatActionEconomy,
  CombatAiBehavior,
  Combatant,
  CombatantStatus,
  CombatantType,
  CombatConditionInstance,
  CombatControlMode,
  DeathSaves,
  EncounterState,
} from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function readStringUnion<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function normalizeDeathSaves(value: unknown): DeathSaves {
  if (!isRecord(value)) return { successes: 0, failures: 0 };

  return {
    successes: Math.max(0, Math.min(3, readNumber(value.successes, 0))),
    failures: Math.max(0, Math.min(3, readNumber(value.failures, 0))),
  };
}

function normalizeCombatantType(value: unknown): CombatantType {
  return value === 'enemy' ? 'enemy' : 'player';
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function defaultCombatActionEconomy(speed = 30): CombatActionEconomy {
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

function normalizeActionEconomy(value: unknown, speed = 30): CombatActionEconomy {
  const fallback = defaultCombatActionEconomy(speed);
  if (!isRecord(value)) return fallback;
  return {
    action: readBoolean(value.action, fallback.action),
    bonusAction: readBoolean(value.bonusAction, fallback.bonusAction),
    reaction: readBoolean(value.reaction, fallback.reaction),
    movementUsed: Math.max(0, readNumber(value.movementUsed, fallback.movementUsed)),
    freeActionUsed: readBoolean(value.freeActionUsed, fallback.freeActionUsed ?? false),
    readyAction: typeof value.readyAction === 'string' ? value.readyAction : null,
    disengaged: readBoolean(value.disengaged, false),
    dodging: readBoolean(value.dodging, false),
    dashed: readBoolean(value.dashed, false),
  };
}

function normalizeStatus(value: unknown, hitPoints: number): CombatantStatus {
  const inferred = hitPoints <= 0 ? 'dying' : 'active';
  return readStringUnion(value, ['active', 'dying', 'stable', 'unconscious', 'dead', 'removed'] as const, inferred);
}

function normalizeAiBehavior(value: unknown): CombatAiBehavior {
  return readStringUnion(value, ['aggressive', 'defensive', 'support', 'random', 'focused'] as const, 'aggressive');
}

function normalizeControlMode(value: unknown, type: CombatantType): CombatControlMode {
  return readStringUnion(value, ['manual', 'auto', 'hybrid'] as const, type === 'enemy' ? 'hybrid' : 'manual');
}

function normalizeConditionInstances(value: unknown, conditions: string[]): CombatConditionInstance[] {
  if (!Array.isArray(value)) {
    return conditions.map((name) => ({
      id: `${name.toLowerCase().replace(/\s+/g, '-')}-${crypto.randomUUID()}`,
      name,
      expiresOn: 'manual',
      combatOnly: true,
    }));
  }

  return value
    .filter(isRecord)
    .map((entry) => {
      const name = readString(entry.name, '').trim();
      if (!name) return null;
      const condition: CombatConditionInstance = {
        id: readString(entry.id, `${name.toLowerCase().replace(/\s+/g, '-')}-${crypto.randomUUID()}`),
        name,
        saveEnds: readBoolean(entry.saveEnds, false),
        expiresOn: readStringUnion(entry.expiresOn, ['manual', 'turn_start', 'turn_end', 'save_ends', 'combat_end'] as const, 'manual'),
        combatOnly: readBoolean(entry.combatOnly, true),
      };
      if (typeof entry.source === 'string') condition.source = entry.source;
      if (entry.durationRounds !== undefined) condition.durationRounds = Math.max(0, readNumber(entry.durationRounds, 0));
      if (entry.remainingRounds !== undefined) condition.remainingRounds = Math.max(0, readNumber(entry.remainingRounds, 0));
      return condition;
    })
    .filter((entry): entry is CombatConditionInstance => entry !== null);
}

export function normalizeCombatant(value: unknown): Combatant | null {
  if (!isRecord(value)) return null;

  const name = readString(value.name, '').trim();
  if (!name) return null;

  const maxHitPoints = Math.max(1, readNumber(value.maxHitPoints, 1));
  const hitPoints = Math.max(0, Math.min(maxHitPoints, readNumber(value.hitPoints, maxHitPoints)));
  const type = normalizeCombatantType(value.type);
  const conditions = normalizeStringArray(value.conditions);
  const speed = Math.max(0, readNumber(value.speed, 30));

  return {
    id: readString(value.id, crypto.randomUUID()),
    characterId: typeof value.characterId === 'string' ? value.characterId : undefined,
    name,
    type,
    armorClass: Math.max(1, readNumber(value.armorClass, 10)),
    hitPoints,
    maxHitPoints,
    tempHitPoints: Math.max(0, readNumber(value.tempHitPoints, 0)),
    initiative: readNumber(value.initiative, 0),
    initiativeRoll: value.initiativeRoll === undefined ? undefined : readNumber(value.initiativeRoll, 0),
    initiativeBonus: value.initiativeBonus === undefined ? undefined : readNumber(value.initiativeBonus, 0),
    dexScore: Math.max(1, readNumber(value.dexScore, 10)),
    speed,
    movementUsed: Math.max(0, readNumber(value.movementUsed, 0)),
    actionEconomy: normalizeActionEconomy(value.actionEconomy, speed),
    status: normalizeStatus(value.status, hitPoints),
    resistances: normalizeStringArray(value.resistances),
    vulnerabilities: normalizeStringArray(value.vulnerabilities),
    immunities: normalizeStringArray(value.immunities),
    conditions,
    conditionInstances: normalizeConditionInstances(value.conditionInstances, conditions),
    concentration: isRecord(value.concentration)
      ? {
          spellName: readString(value.concentration.spellName, ''),
          dc: value.concentration.dc === undefined ? undefined : readNumber(value.concentration.dc, 10),
          startedRound: value.concentration.startedRound === undefined ? undefined : readNumber(value.concentration.startedRound, 1),
          sourceId: typeof value.concentration.sourceId === 'string' ? value.concentration.sourceId : undefined,
        }
      : null,
    aiBehavior: normalizeAiBehavior(value.aiBehavior),
    controlMode: normalizeControlMode(value.controlMode, type),
    isBoss: readBoolean(value.isBoss, false),
    lastDamageTaken: value.lastDamageTaken === undefined ? undefined : Math.max(0, readNumber(value.lastDamageTaken, 0)),
    deathSaves: normalizeDeathSaves(value.deathSaves),
  };
}

export function normalizeEncounterState(value: unknown): EncounterState | null {
  if (!isRecord(value)) return null;

  const name = readString(value.name, '').trim();
  const rawCombatants = Array.isArray(value.combatants) ? value.combatants : [];
  const combatants = rawCombatants.map((item) => normalizeCombatant(item)).filter(Boolean) as Combatant[];

  if (!name || !combatants.length) return null;

  return {
    id: readString(value.id, crypto.randomUUID()),
    name,
    round: Math.max(1, readNumber(value.round, 1)),
    activeIndex: Math.max(0, Math.min(combatants.length - 1, readNumber(value.activeIndex, 0))),
    phase: readStringUnion(value.phase, ['setup', 'active', 'ended'] as const, readBoolean(value.isActive, true) ? 'active' : 'setup'),
    activeCombatantId: typeof value.activeCombatantId === 'string' ? value.activeCombatantId : combatants[readNumber(value.activeIndex, 0)]?.id ?? null,
    isActive: readBoolean(value.isActive, true),
    combatants,
    lootSummary: typeof value.lootSummary === 'string' ? value.lootSummary : undefined,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : undefined,
  };
}
