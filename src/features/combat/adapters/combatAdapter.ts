/**
 * combatAdapter.ts
 *
 * The sole gateway between the UI layer and the combat engine.
 * UI components and hooks must never import engine functions directly —
 * every engine call flows through this file.
 *
 * Architecture:
 *   UI / Zustand Hook → combatAdapter → engine function → CombatDispatchResult
 *
 * Engine function type-split (discovered from engine source):
 *
 *   combatRules.ts  → rollCombatantInitiative / applyCombatDamage
 *     Operates on UI Combatant type directly — NO mapper required.
 *
 *   turnEngine.ts   → advanceTurn
 *   combatState.ts  → endCombat
 *     Operates on engine CombatState — mapper REQUIRED both ways.
 *
 * Rules:
 *   - No React. No Zustand. No Supabase. No side effects.
 *   - Never mutate input arguments.
 *   - Return CombatDispatchResult for every action — caller decides how
 *     to write the result into Zustand or display errors.
 */

import {
  rollCombatantInitiative,
  applyCombatDamage,
} from '../../../engine/combat/combatRules';
import { advanceTurn } from '../../../engine/combat/turnEngine';
import { endCombat as engineEndCombat } from '../../../engine/combat/combatState';

import { mapToEngineCombatState, mapToEncounterState } from './combatEngineMapper';

import type { EncounterState } from '../../../types';
import type {
  ApplyDamageInput,
  CombatDispatchResult,
  EndCombatInput,
  NextTurnInput,
  RollInitiativeInput,
} from '../types/combat.types';

// ── Internal result helpers ────────────────────────────────────────────────────

function succeed(encounter: EncounterState): CombatDispatchResult {
  return { ok: true, encounter, errors: [] };
}

function fail(...errors: string[]): CombatDispatchResult {
  return { ok: false, encounter: null, errors };
}

function withTimestamp(encounter: EncounterState): EncounterState {
  return { ...encounter, updatedAt: new Date().toISOString() };
}

// ── 1. rollInitiative ──────────────────────────────────────────────────────────

/**
 * Roll initiative for one combatant (by id) or all combatants.
 *
 * Engine call: rollCombatantInitiative(combatant) [combatRules.ts]
 *   — takes UI Combatant, returns updated Combatant with initiative + initiativeRoll set.
 *   — honours combatant.initiativeBonus and combatant.dexScore.
 *
 * After rolling, the combatants array is re-sorted descending by initiative.
 * The activeIndex is updated to keep tracking the same combatant across the sort.
 */
export function rollInitiative(
  encounter: EncounterState | null,
  input: RollInitiativeInput = {},
): CombatDispatchResult {
  if (!encounter) return fail('No active encounter.');

  // Roll initiative for the targeted combatant, or for all of them.
  const rolled = encounter.combatants.map((combatant) => {
    if (input.combatantId !== undefined && combatant.id !== input.combatantId) {
      return combatant;
    }
    return rollCombatantInitiative(combatant);
  });

  // Sort descending so initiative order is visually coherent from the top.
  const sorted = [...rolled].sort((a, b) => b.initiative - a.initiative);

  // Keep activeIndex tracking the same combatant after the sort.
  const previousActiveCombatantId = encounter.combatants[encounter.activeIndex]?.id ?? null;
  const nextActiveIndex = previousActiveCombatantId
    ? Math.max(0, sorted.findIndex((c) => c.id === previousActiveCombatantId))
    : 0;

  return succeed(
    withTimestamp({
      ...encounter,
      combatants: sorted,
      activeIndex: nextActiveIndex,
      activeCombatantId: sorted[nextActiveIndex]?.id ?? null,
    }),
  );
}

// ── 2. nextTurn ────────────────────────────────────────────────────────────────

/**
 * Advance (or rewind) the turn order by one step.
 *
 * Forward (direction = 1):
 *   Engine call: advanceTurn(engineState, {}) [turnEngine.ts]
 *     — takes CombatState; mapper is used both ways.
 *     — skips dead / unconscious / removed participants automatically.
 *     — increments round when the order wraps.
 *   Note: charactersById is passed as {} — character rehydration is not
 *   needed here because the adapter works from already-current UI state.
 *
 * Backward (direction = -1):
 *   The engine's advanceTurn only moves forward. Backward is handled locally
 *   with a simple index step and round decrement. Condition expiry is NOT
 *   applied for backward steps (consistent with the existing processor).
 */
export function nextTurn(
  encounter: EncounterState | null,
  input: NextTurnInput = {},
): CombatDispatchResult {
  if (!encounter) return fail('No active encounter.');
  if (!encounter.isActive) return fail('Cannot advance turn: encounter has not started.');
  if (!encounter.combatants.length) return fail('Cannot advance turn: no combatants.');

  const direction = input.direction ?? 1;

  if (direction === -1) {
    const count = encounter.combatants.length;
    const nextIndex = encounter.activeIndex === 0 ? count - 1 : encounter.activeIndex - 1;
    const nextRound = encounter.activeIndex === 0
      ? Math.max(1, encounter.round - 1)
      : encounter.round;

    return succeed(
      withTimestamp({
        ...encounter,
        round: nextRound,
        activeIndex: nextIndex,
        activeCombatantId: encounter.combatants[nextIndex]?.id ?? null,
      }),
    );
  }

  // Forward — delegate to the engine (skips incapacitated combatants, tracks rounds).
  const engineIn = mapToEngineCombatState(encounter);
  const engineOut = advanceTurn(engineIn, {});
  return succeed(withTimestamp(mapToEncounterState(engineOut, encounter)));
}

// ── 3. applyDamage ─────────────────────────────────────────────────────────────

/**
 * Apply damage to a specific combatant.
 *
 * Engine call: applyCombatDamage(combatant, { amount, damageType }) [combatRules.ts]
 *   — takes UI Combatant, returns DamageResult { combatant, appliedDamage, ... }.
 *   — applies resistance (halve) and immunity (zero) from combatant fields.
 *   — consumes tempHitPoints before reducing hitPoints.
 *   — sets status to 'dying' when hitPoints reach 0.
 */
export function applyDamage(
  encounter: EncounterState | null,
  input: ApplyDamageInput,
): CombatDispatchResult {
  if (!encounter) return fail('No active encounter.');

  const targetIndex = encounter.combatants.findIndex((c) => c.id === input.targetId);
  if (targetIndex === -1) {
    return fail(`Combatant '${input.targetId}' not found in encounter.`);
  }

  const target = encounter.combatants[targetIndex];
  const result = applyCombatDamage(target, {
    amount: input.amount,
    damageType: input.damageType,
  });

  const updatedCombatants = encounter.combatants.map((c, i) =>
    i === targetIndex ? result.combatant : c,
  );

  return succeed(withTimestamp({ ...encounter, combatants: updatedCombatants }));
}

// ── 4. endCombat ───────────────────────────────────────────────────────────────

/**
 * Mark the encounter as ended and return its final state.
 *
 * Engine call: endCombat(engineState) [combatState.ts]
 *   — takes CombatState; mapper is used both ways.
 *   — sets phase: 'ended', endedAt, clears activeParticipantId.
 *
 * The returned EncounterState (phase: 'ended', isActive: false) can be used
 * by the UI to display loot / recap before the store clears combatState.
 * The caller (useCombatDispatch / store) is responsible for nulling the
 * Zustand combatState after presenting the end-of-combat screen.
 */
export function endCombat(
  encounter: EncounterState | null,
  input: EndCombatInput,
): CombatDispatchResult {
  if (!encounter) return fail('No active encounter.');
  if (encounter.id !== input.encounterId) {
    return fail(
      `Encounter ID mismatch: expected '${input.encounterId}', got '${encounter.id}'.`,
    );
  }

  const engineIn = mapToEngineCombatState(encounter);
  const engineOut = engineEndCombat(engineIn);
  return succeed(withTimestamp(mapToEncounterState(engineOut, encounter)));
}
