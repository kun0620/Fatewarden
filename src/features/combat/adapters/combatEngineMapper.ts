/**
 * combatEngineMapper.ts
 *
 * Pure mapping functions between UI types (EncounterState / Combatant)
 * and engine types (CombatState / CombatParticipant).
 *
 * Rules:
 *   - No React. No Zustand. No Supabase. No side effects.
 *   - Never mutate input arguments.
 *   - Engine stays UI-agnostic: engine types are only referenced here,
 *     never in UI components directly.
 *   - Fields the engine does not model (deathSaves, isBoss, concentration,
 *     conditionInstances, actionEconomy flags) are preserved from the
 *     previous UI snapshot passed as `previous`.
 */

import type {
  CombatState,
  CombatParticipant,
  CombatParticipantStatus,
  CombatParticipantType,
} from '../../../engine/combat/combatTypes';

import type {
  Combatant,
  CombatantStatus,
  CombatantType,
  CombatActionEconomy,
  DeathSaves,
  EncounterState,
} from '../../../types';

// ── Internal constants ─────────────────────────────────────────────────────────

const DEFAULT_DEATH_SAVES: DeathSaves = { successes: 0, failures: 0 };
const DEFAULT_DEX_SCORE = 10;
const DEFAULT_SPEED = 30;

// ── Internal helpers ───────────────────────────────────────────────────────────

function toParticipantType(type: CombatantType): CombatParticipantType {
  return type === 'player' ? 'player' : 'monster';
}

function toCombatantType(type: CombatParticipantType): CombatantType {
  return type === 'player' ? 'player' : 'enemy';
}

/**
 * Derive engine status from UI combatant.
 * Prefers the explicit status field; falls back to hp-based inference only
 * when status is not yet set (e.g. freshly added combatant).
 */
function toParticipantStatus(combatant: Combatant): CombatParticipantStatus {
  if (combatant.status !== undefined) {
    // Both status enums share identical values — safe to cast.
    return combatant.status as CombatParticipantStatus;
  }
  return combatant.hitPoints <= 0 ? 'unconscious' : 'active';
}

/**
 * Derive engine phase from the UI encounter.
 * Uses the explicit `phase` field when present; infers from `isActive` otherwise.
 */
function toEnginePhase(encounter: EncounterState): 'setup' | 'active' | 'ended' {
  if (encounter.phase === 'ended') return 'ended';
  if (encounter.isActive || encounter.phase === 'active') return 'active';
  return 'setup';
}

/**
 * Safely resolve an array index for the active combatant.
 * Prefers lookup by participant ID; falls back to clamped turnIndex.
 */
function safeActiveIndex(
  combatants: Combatant[],
  activeParticipantId: string | null,
  turnIndex: number,
): number {
  if (!combatants.length) return 0;
  if (activeParticipantId !== null) {
    const byId = combatants.findIndex((c) => c.id === activeParticipantId);
    if (byId >= 0) return byId;
  }
  return Math.max(0, Math.min(turnIndex, combatants.length - 1));
}

/**
 * Merge engine-updated movementUsed back into the previous actionEconomy
 * without touching the other boolean flags (action, bonusAction, etc.).
 */
function mergeMovementIntoEconomy(
  previous: CombatActionEconomy | undefined,
  movementUsed: number | undefined,
): CombatActionEconomy | undefined {
  if (previous === undefined) return undefined;
  return { ...previous, movementUsed: movementUsed ?? previous.movementUsed };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Map a single UI Combatant → engine CombatParticipant.
 *
 * `joinedOrder` should be the combatant's position in the EncounterState.combatants
 * array. The engine uses it as a stable tiebreaker for initiative sorting.
 */
export function mapCombatantToParticipant(
  combatant: Combatant,
  joinedOrder: number,
): CombatParticipant {
  return {
    id: combatant.id,
    characterId: combatant.characterId,
    name: combatant.name,
    type: toParticipantType(combatant.type),
    initiativeScore: combatant.initiative,
    dexScore: combatant.dexScore ?? DEFAULT_DEX_SCORE,
    armorClass: combatant.armorClass,
    hitPoints: combatant.hitPoints,
    maxHitPoints: combatant.maxHitPoints,
    tempHitPoints: combatant.tempHitPoints,
    speed: combatant.speed ?? DEFAULT_SPEED,
    resistances: combatant.resistances,
    vulnerabilities: combatant.vulnerabilities,
    immunities: combatant.immunities,
    conditions: [...combatant.conditions],
    status: toParticipantStatus(combatant),
    joinedOrder,
    aiBehavior: combatant.aiBehavior,
    controlMode: combatant.controlMode,
    // actionEconomy.movementUsed is the canonical source; fall back to root field.
    movementUsed: combatant.actionEconomy?.movementUsed ?? combatant.movementUsed,
  };
}

/**
 * Map a single engine CombatParticipant → UI Combatant.
 *
 * `previous` is the UI Combatant snapshot from before the engine processed
 * the event. Fields the engine does not model are restored from it:
 *   - deathSaves
 *   - conditionInstances (rich condition metadata)
 *   - concentration
 *   - actionEconomy boolean flags (action / bonusAction / reaction)
 *   - isBoss
 *   - lastDamageTaken
 *   - initiativeRoll / initiativeBonus
 *
 * When previous is undefined (e.g. a newly spawned enemy), safe defaults apply.
 */
export function mapParticipantToCombatant(
  participant: CombatParticipant,
  previous: Combatant | undefined,
): Combatant {
  return {
    id: participant.id,
    characterId: participant.characterId,
    name: participant.name,
    type: toCombatantType(participant.type),
    armorClass: participant.armorClass,
    hitPoints: participant.hitPoints,
    maxHitPoints: participant.maxHitPoints,
    tempHitPoints: participant.tempHitPoints,
    // Engine stores initiative as initiativeScore (nullable); fall back to previous.
    initiative: participant.initiativeScore ?? previous?.initiative ?? 0,
    initiativeRoll: previous?.initiativeRoll,
    initiativeBonus: previous?.initiativeBonus,
    dexScore: participant.dexScore,
    speed: participant.speed,
    movementUsed: participant.movementUsed,
    // Merge engine movementUsed back into the boolean-flag economy from previous.
    actionEconomy: mergeMovementIntoEconomy(previous?.actionEconomy, participant.movementUsed),
    // Both enums have identical string values.
    status: participant.status as CombatantStatus,
    resistances: participant.resistances ? [...participant.resistances] : undefined,
    vulnerabilities: participant.vulnerabilities ? [...participant.vulnerabilities] : undefined,
    immunities: participant.immunities ? [...participant.immunities] : undefined,
    conditions: [...participant.conditions],
    // Engine does not model these — restore verbatim from previous snapshot.
    conditionInstances: previous?.conditionInstances,
    concentration: previous?.concentration,
    aiBehavior: participant.aiBehavior,
    controlMode: participant.controlMode,
    isBoss: previous?.isBoss,
    lastDamageTaken: previous?.lastDamageTaken,
    deathSaves: previous?.deathSaves ?? DEFAULT_DEATH_SAVES,
  };
}

/**
 * Map UI EncounterState → engine CombatState.
 *
 * Pure function — does not mutate either argument.
 * Called before dispatching a combat event to the engine processor.
 */
export function mapToEngineCombatState(encounter: EncounterState): CombatState {
  const participants = encounter.combatants.map((combatant, index) =>
    mapCombatantToParticipant(combatant, index),
  );

  return {
    id: encounter.id,
    name: encounter.name,
    roomId: undefined,
    phase: toEnginePhase(encounter),
    participants,
    // initiativeOrder mirrors the sorted combatants array.
    initiativeOrder: encounter.combatants.map((c) => c.id),
    turn: {
      round: encounter.round,
      turnIndex: encounter.activeIndex,
      activeParticipantId: encounter.combatants[encounter.activeIndex]?.id ?? null,
      hasStarted: encounter.isActive,
    },
    createdAt: new Date().toISOString(),
    startedAt: encounter.isActive ? new Date().toISOString() : null,
    endedAt: encounter.phase === 'ended' ? new Date().toISOString() : null,
  };
}

/**
 * Map engine CombatState → UI EncounterState.
 *
 * `previous` must be the EncounterState that was passed INTO the engine.
 * It is used to restore fields the engine does not track (see mapParticipantToCombatant).
 * Pass null only when creating a brand-new encounter with no prior UI state.
 *
 * Called after the engine processor returns to write updated state back to the store.
 */
export function mapToEncounterState(
  engineState: CombatState,
  previous: EncounterState | null,
): EncounterState {
  // Use initiativeOrder if populated; fall back to participant insertion order.
  const order =
    engineState.initiativeOrder.length > 0
      ? engineState.initiativeOrder
      : engineState.participants.map((p) => p.id);

  // Build a fast lookup for previous combatants so we can restore engine-opaque fields.
  const previousById = new Map<string, Combatant>(
    (previous?.combatants ?? []).map((c) => [c.id, c]),
  );

  const combatants: Combatant[] = order
    .map((id) => engineState.participants.find((p) => p.id === id))
    .filter((p): p is CombatParticipant => p !== null && p !== undefined)
    .map((participant) =>
      mapParticipantToCombatant(participant, previousById.get(participant.id)),
    );

  return {
    id: engineState.id,
    name: engineState.name,
    round: engineState.turn.round,
    activeIndex: safeActiveIndex(
      combatants,
      engineState.turn.activeParticipantId,
      engineState.turn.turnIndex,
    ),
    activeCombatantId: engineState.turn.activeParticipantId,
    phase: engineState.phase,
    isActive: engineState.phase === 'active',
    combatants,
    // Preserve UI-only fields from the previous snapshot.
    lootSummary: previous?.lootSummary,
    updatedAt: new Date().toISOString(),
  };
}
