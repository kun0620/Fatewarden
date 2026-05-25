/**
 * aiEventMapper.ts
 *
 * Pure mapping layer between AI confirm actions and the GameEvent system.
 * No React. No Zustand. No Supabase. No side effects.
 *
 * Usage:
 *   const event = mapAiEventToGameEvent(action, ctx);
 *   if (!event) throw new Error(`Cannot map '${action.type}' to a GameEvent.`);
 *   dispatchGameEvent(event);
 */

import type { AiConfirmAction, Character, GamePhase } from '../types';
import type { GameEvent } from '../engine/events/types';

// ── Context ────────────────────────────────────────────────────────────────────

export interface AiEventMapperContext {
  /** Supabase session id, or 'local-session' for offline play. */
  readonly sessionId: string;
  /** The acting character's id (usually the player character). */
  readonly actorId: string;
  /**
   * Resolved combatant id for target-based actions
   * (damage, healing, add_condition, remove_condition).
   * Must be looked up by the caller before invoking this function.
   */
  readonly targetId?: string;
  /** Required only for start_combat — provides the player character snapshot. */
  readonly playerCharacter?: Character;
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function makeBase(ctx: AiEventMapperContext) {
  return {
    id: crypto.randomUUID(),
    sessionId: ctx.sessionId,
    actorId: ctx.actorId,
    createdAt: new Date().toISOString(),
    source: 'ai' as const,
  };
}

// ── Mapper ─────────────────────────────────────────────────────────────────────

/**
 * Convert an AI confirm action into the corresponding GameEvent.
 *
 * Returns null when required fields are missing (e.g. condition is empty,
 * phase is absent, playerCharacter is missing for start_combat).
 * The caller is responsible for throwing a user-visible error in that case.
 */
export function mapAiEventToGameEvent(
  action: AiConfirmAction,
  ctx: AiEventMapperContext,
): GameEvent | null {
  const base = makeBase(ctx);
  const targetId = ctx.targetId ?? ctx.actorId;

  switch (action.type) {
    case 'damage':
      return {
        ...base,
        type: 'apply_damage',
        targetId,
        amount: Math.max(0, action.amount ?? 0),
      };

    case 'healing':
      return {
        ...base,
        type: 'recover_hp',
        targetId,
        amount: Math.max(0, action.amount ?? 0),
        recoveryKind: 'healing',
      };

    case 'add_condition':
      if (!action.condition) return null;
      return {
        ...base,
        type: 'apply_condition',
        targetId,
        condition: action.condition,
      };

    case 'remove_condition':
      if (!action.condition) return null;
      return {
        ...base,
        type: 'remove_condition',
        targetId,
        condition: action.condition,
      };

    case 'phase_change':
      if (!action.phase) return null;
      return {
        ...base,
        type: 'GAME_PHASE_CHANGE',
        phase: action.phase as GamePhase,
      };

    case 'start_combat':
      if (!ctx.playerCharacter) return null;
      return {
        ...base,
        targetId: ctx.actorId,
        type: 'COMBAT_CREATE_ENCOUNTER',
        encounterName: action.encounterName || action.label || 'AI Suggested Encounter',
        playerCharacter: ctx.playerCharacter,
      };

    case 'next_turn':
      return {
        ...base,
        targetId: ctx.actorId,
        type: 'COMBAT_ADVANCE_TURN',
        direction: 1,
      };

    case 'previous_turn':
      return {
        ...base,
        targetId: ctx.actorId,
        type: 'COMBAT_REVERT_TURN',
      };

    case 'add_objective':
      return {
        ...base,
        type: 'ADD_OBJECTIVE',
        description: action.label,
      };

    case 'change_relationship': {
      const npcId = action.targetId ?? action.targetName ?? '';
      const npcName = action.targetName ?? action.targetId ?? '';
      if (!npcId && !npcName) return null;
      return {
        ...base,
        type: 'CHANGE_RELATIONSHIP',
        characterId: ctx.actorId,
        npcId,
        npcName,
        delta: action.amount ?? 0,
        reason: action.note,
      };
    }

    case 'add_journal_entry':
      if (!action.journalBody) return null;
      return {
        ...base,
        type: 'ADD_JOURNAL_ENTRY',
        characterId: ctx.actorId,
        entryType: action.journalType ?? 'memory',
        title: action.label,
        content: action.journalBody,
      };

    default:
      return null;
  }
}
