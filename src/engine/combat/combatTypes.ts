import type { AbilityKey, AdvantageState } from '../shared/types';
import type { RollResult } from '../dice/types';

export type CombatParticipantType = 'player' | 'npc' | 'monster' | 'summon' | 'companion';
export type CombatParticipantStatus = 'active' | 'dying' | 'stable' | 'unconscious' | 'dead' | 'removed';
export type CombatActionType =
  | 'attack'
  | 'cast_spell'
  | 'dash'
  | 'disengage'
  | 'dodge'
  | 'help'
  | 'hide'
  | 'ready'
  | 'search'
  | 'use_object'
  | 'move'
  | 'death_save';

export interface CombatParticipant {
  readonly id: string;
  readonly characterId?: string;
  readonly name: string;
  readonly type: CombatParticipantType;
  readonly initiativeScore: number | null;
  readonly dexScore: number;
  readonly armorClass: number;
  readonly hitPoints: number;
  readonly maxHitPoints: number;
  readonly tempHitPoints: number;
  readonly speed: number;
  readonly resistances?: readonly string[];
  readonly vulnerabilities?: readonly string[];
  readonly immunities?: readonly string[];
  readonly conditions: readonly string[];
  readonly status: CombatParticipantStatus;
  readonly joinedOrder: number;
  readonly aiBehavior?: 'aggressive' | 'defensive' | 'support' | 'random' | 'focused';
  readonly controlMode?: 'manual' | 'auto' | 'hybrid';
  readonly movementUsed?: number;
}

export interface TurnState {
  readonly round: number;
  readonly turnIndex: number;
  readonly activeParticipantId: string | null;
  readonly hasStarted: boolean;
}

export interface CombatState {
  readonly id: string;
  readonly roomId?: string;
  readonly name: string;
  readonly phase: 'setup' | 'active' | 'ended';
  readonly participants: readonly CombatParticipant[];
  readonly initiativeOrder: readonly string[];
  readonly turn: TurnState;
  readonly createdAt: string;
  readonly startedAt: string | null;
  readonly endedAt: string | null;
}

export interface CombatAction {
  readonly type: CombatActionType;
  readonly actorId: string;
  readonly targetId?: string;
  readonly advantageState?: AdvantageState;
  readonly abilityOverride?: AbilityKey;
  readonly attackBonus?: number;
  readonly damageAmount?: number;
  readonly damageType?: string;
  readonly movementSpent?: number;
  readonly notes?: string;
}

export interface ActionResult {
  readonly combat: CombatState;
  readonly action: CombatAction;
  readonly success: boolean;
  readonly message: string;
  readonly roll?: RollResult;
  readonly appliedEvents: readonly string[];
}
