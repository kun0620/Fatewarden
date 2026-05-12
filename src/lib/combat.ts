import type { Combatant, CombatantType, DeathSaves, EncounterState } from '../types';

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

export function normalizeCombatant(value: unknown): Combatant | null {
  if (!isRecord(value)) return null;

  const name = readString(value.name, '').trim();
  if (!name) return null;

  const maxHitPoints = Math.max(1, readNumber(value.maxHitPoints, 1));
  const hitPoints = Math.max(0, Math.min(maxHitPoints, readNumber(value.hitPoints, maxHitPoints)));

  return {
    id: readString(value.id, crypto.randomUUID()),
    name,
    type: normalizeCombatantType(value.type),
    armorClass: Math.max(1, readNumber(value.armorClass, 10)),
    hitPoints,
    maxHitPoints,
    tempHitPoints: Math.max(0, readNumber(value.tempHitPoints, 0)),
    initiative: readNumber(value.initiative, 0),
    conditions: normalizeStringArray(value.conditions),
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
    isActive: readBoolean(value.isActive, true),
    combatants,
  };
}

