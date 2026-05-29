import type { AdvantageState, RollType } from '../shared/types';

export interface DiceRoll {
  readonly notation: string;
  readonly count: number;
  readonly sides: number;
  readonly modifier: number;
  readonly rolls: readonly number[];
  readonly subtotal: number;
}

export interface RollOutcome {
  readonly total: number;
  readonly natural?: number;
  readonly isCriticalSuccess: boolean;
  readonly isCriticalFailure: boolean;
}

export interface RollContext {
  readonly rollType: RollType;
  readonly abilityModifier?: number;
  readonly proficiencyBonus?: number;
  readonly isProficient?: boolean;
  readonly expertiseMultiplier?: number;
  readonly extraModifier?: number;
  readonly advantageState?: AdvantageState;
  readonly rng?: () => number;
}

export interface RollResult {
  readonly rollType: RollType;
  readonly formula: string;
  readonly dice: DiceRoll;
  readonly modifierTotal: number;
  readonly keptRoll?: number;
  readonly droppedRolls?: readonly number[];
  readonly outcome: RollOutcome;
  readonly context: Readonly<Omit<RollContext, 'rng'>>;
}
