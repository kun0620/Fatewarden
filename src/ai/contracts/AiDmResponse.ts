import type { GameEvent } from '../../engine/events/types';
import type { AbilityKey, AdvantageState, RollType } from '../../engine/shared/types';

export interface AiDmChoice {
  readonly id: string;
  readonly label: string;
  readonly prompt: string;
  readonly intent?: string;
}

export interface AiDmSuggestedRoll {
  readonly required: boolean;
  readonly rollType: RollType;
  readonly ability?: AbilityKey;
  readonly skill?: string;
  readonly dc?: number;
  readonly reason?: string;
  readonly advantageState?: AdvantageState;
}

export interface AiDmResponse {
  readonly narration: string;
  readonly choices: readonly AiDmChoice[];
  readonly events: readonly GameEvent[];
  readonly suggestedRoll?: AiDmSuggestedRoll;
}
