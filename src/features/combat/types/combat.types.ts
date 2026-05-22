/**
 * combat.types.ts
 *
 * UI-facing types for the combat feature layer.
 *
 * Boundary rule:
 *   - This file imports ONLY from src/types.ts (UI domain).
 *   - Never import engine types here.
 *   - Engine ↔ UI translation lives exclusively in combatEngineMapper.ts.
 */

import type {
  Combatant,
  CombatantType,
  CombatantStatus,
  CombatActionEconomy,
  CombatConditionInstance,
  CombatConcentration,
  CombatConditionExpiry,
  DeathSaves,
  CombatAiBehavior,
  CombatControlMode,
  CombatAttackType,
  CombatAdvantageMode,
  CombatActionKind,
  EncounterState,
} from '../../../types';

// ── Re-exports: single import location for combat-domain consumers ─────────────

export type {
  EncounterState,
  Combatant,
  CombatantType,
  CombatantStatus,
  CombatActionEconomy,
  CombatConditionInstance,
  CombatConcentration,
  CombatConditionExpiry,
  DeathSaves,
  CombatAiBehavior,
  CombatControlMode,
  CombatAttackType,
  CombatAdvantageMode,
  CombatActionKind,
};

// ── Action input types ─────────────────────────────────────────────────────────

/**
 * Roll initiative for one combatant or all.
 * When combatantId is undefined, the engine rolls for all participants.
 */
export type RollInitiativeInput = {
  readonly combatantId?: string;
};

/**
 * Advance or rewind the turn order by one step.
 */
export type NextTurnInput = {
  /** 1 = forward (default), -1 = step back */
  readonly direction?: 1 | -1;
};

/**
 * Apply hit-point damage to a specific combatant.
 * damageType is forwarded to the engine for resistance / immunity checks.
 */
export type ApplyDamageInput = {
  readonly targetId: string;
  readonly amount: number;
  readonly damageType?: string;
};

/**
 * Signal that the current encounter has ended.
 */
export type EndCombatInput = {
  readonly encounterId: string;
};

// ── Dispatch result ─────────────────────────────────────────────────────────────

/**
 * Standardised return from every useCombatDispatch action.
 *
 * ok      — false when the engine rejected the event (see errors).
 * encounter — updated EncounterState on success; unchanged reference on failure.
 * errors  — human-readable rejection reasons from the engine processor.
 */
export type CombatDispatchResult = {
  readonly ok: boolean;
  readonly encounter: EncounterState | null;
  readonly errors: readonly string[];
};
