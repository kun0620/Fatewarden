export interface RuntimeCombatantState {
  readonly id: string;
  readonly name: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly tempHp: number;
  readonly initiative?: number;
  readonly conditions: readonly string[];
}

export interface RuntimeCombatState {
  readonly encounterId: string;
  readonly round: number;
  readonly turnIndex: number;
  readonly combatants: readonly RuntimeCombatantState[];
  readonly startedAt: string;
  readonly updatedAt: string;
}

export interface RuntimeSceneState {
  readonly sceneId: string;
  readonly title: string;
  readonly objective?: string;
  readonly threatLevel?: 'low' | 'medium' | 'high' | 'extreme';
  readonly tags: readonly string[];
  readonly notes: readonly string[];
  readonly updatedAt: string;
}
