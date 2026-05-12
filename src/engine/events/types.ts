export interface BaseGameEvent {
  readonly id: string;
  readonly type: string;
  readonly sessionId: string;
  readonly actorId: string;
  readonly targetId?: string;
  readonly createdAt: string;
  readonly source?: 'user' | 'ai' | 'system';
  readonly correlationId?: string;
}

export interface ApplyDamageEvent extends BaseGameEvent {
  readonly type: 'apply_damage';
  readonly targetId: string;
  readonly amount: number;
  readonly damageType?: string;
  readonly isCritical?: boolean;
  readonly notes?: string;
}

export interface RecoverHpEvent extends BaseGameEvent {
  readonly type: 'recover_hp';
  readonly targetId: string;
  readonly amount: number;
  readonly recoveryKind?: 'healing' | 'temp_hp' | 'rest';
  readonly notes?: string;
}

export interface ApplyConditionEvent extends BaseGameEvent {
  readonly type: 'apply_condition';
  readonly targetId: string;
  readonly condition: string;
  readonly durationRounds?: number;
  readonly saveEnds?: boolean;
  readonly notes?: string;
}

export interface RemoveConditionEvent extends BaseGameEvent {
  readonly type: 'remove_condition';
  readonly targetId: string;
  readonly condition: string;
  readonly reason?: string;
}

export interface LongRestEvent extends BaseGameEvent {
  readonly type: 'long_rest';
  readonly targetId: string;
  readonly notes?: string;
}

export interface ShortRestEvent extends BaseGameEvent {
  readonly type: 'short_rest';
  readonly targetId: string;
  readonly hitDiceSpent: number;
  readonly notes?: string;
}

export interface SpendResourceEvent extends BaseGameEvent {
  readonly type: 'SPEND_RESOURCE';
  readonly characterId: string;
  readonly resourceId: string;
  readonly amount: number;
}

export interface RecoverResourceEvent extends BaseGameEvent {
  readonly type: 'RECOVER_RESOURCE';
  readonly characterId: string;
  readonly recoveryType: 'short' | 'long';
}

export interface LevelUpEvent extends BaseGameEvent {
  readonly type: 'LEVEL_UP';
  readonly characterId: string;
  readonly newLevel: number;
  readonly choices: import('../../types').LevelUpChoice[];
}

export interface UseRacialSpellEvent extends BaseGameEvent {
  readonly type: 'USE_RACIAL_SPELL';
  readonly characterId: string;
  readonly spellId: string;
}

export interface ResetRacialSpellsEvent extends BaseGameEvent {
  readonly type: 'RESET_RACIAL_SPELLS';
  readonly characterId: string;
}

export interface GiveItemEvent extends BaseGameEvent {
  readonly type: 'give_item';
  readonly targetId: string;
  readonly item: {
    id: string;
    name: string;
    category: 'weapon' | 'armor' | 'shield' | 'consumable' | 'tool' | 'material' | 'misc';
    quantity: number;
    weight: number;
    stackable: boolean;
    tags?: string[];
    metadata?: Record<string, unknown>;
  };
}

export interface AddItemEvent extends BaseGameEvent {
  readonly type: 'add_item';
  readonly targetId: string;
  readonly item: import('../../types').Item;
}

export interface RemoveItemEvent extends BaseGameEvent {
  readonly type: 'remove_item';
  readonly targetId: string;
  readonly itemId: string;
  readonly quantity?: number;
}

export interface EquipItemEvent extends BaseGameEvent {
  readonly type: 'equip_item';
  readonly targetId: string;
  readonly itemId: string;
  readonly slot: 'armor' | 'main_hand' | 'off_hand' | 'two_handed' | 'ring_1' | 'ring_2' | 'amulet' | 'cloak' | 'belt';
  readonly attuned?: boolean;
}

export interface UnequipItemEvent extends BaseGameEvent {
  readonly type: 'unequip_item';
  readonly targetId: string;
  readonly slot?: 'armor' | 'main_hand' | 'off_hand' | 'two_handed' | 'ring_1' | 'ring_2' | 'amulet' | 'cloak' | 'belt';
  readonly itemId?: string;
}

export interface UpdateCurrencyEvent extends BaseGameEvent {
  readonly type: 'update_currency';
  readonly targetId: string;
  readonly from: 'pp' | 'gp' | 'ep' | 'sp' | 'cp';
  readonly to: 'pp' | 'gp' | 'ep' | 'sp' | 'cp';
  readonly amount: number;
}

export interface UpdateQuantityEvent extends BaseGameEvent {
  readonly type: 'update_quantity';
  readonly targetId: string;
  readonly itemId: string;
  readonly delta: number;
}

export interface ConsumeItemEvent extends BaseGameEvent {
  readonly type: 'consume_item';
  readonly targetId: string;
  readonly itemId: string;
  readonly quantity?: number;
}

export interface SceneTransitionEvent extends BaseGameEvent {
  readonly type: 'SCENE_TRANSITION';
  readonly sessionId: string;
  readonly newMode: import('../scene').SceneMode;
  readonly newLocation: string;
  readonly newDescription: string;
}

export interface SceneObjectiveUpdateEvent extends BaseGameEvent {
  readonly type: 'SCENE_OBJECTIVE_UPDATE';
  readonly sessionId: string;
  readonly objectiveId: string;
  readonly status: 'completed' | 'failed';
}

export interface ThreatClockAdvanceEvent extends BaseGameEvent {
  readonly type: 'THREAT_CLOCK_ADVANCE';
  readonly sessionId: string;
  readonly clockId: string;
  readonly amount: number;
}

export interface PartyChoiceCreatedEvent extends BaseGameEvent {
  readonly type: 'PARTY_CHOICE_CREATED';
  readonly sessionId: string;
  readonly choice: import('../party/partyChoiceTypes').PartyChoice;
}

export interface PartyVoteCastEvent extends BaseGameEvent {
  readonly type: 'PARTY_VOTE_CAST';
  readonly sessionId: string;
  readonly choiceId: string;
  readonly playerId: string;
  readonly characterName: string;
  readonly selectedOptionId: string;
}

export interface PartyChoiceResolvedEvent extends BaseGameEvent {
  readonly type: 'PARTY_CHOICE_RESOLVED';
  readonly sessionId: string;
  readonly choiceId: string;
  readonly resolvedChoiceId: string;
}

export interface CompanionSummonEvent extends BaseGameEvent {
  readonly type: 'COMPANION_SUMMON';
  readonly sessionId: string;
  readonly companion: import('../companion/companionTypes').CompanionSheet;
}

export interface CompanionDismissEvent extends BaseGameEvent {
  readonly type: 'COMPANION_DISMISS';
  readonly sessionId: string;
  readonly companionId: string;
}

export interface CompanionLoyaltyChangeEvent extends BaseGameEvent {
  readonly type: 'COMPANION_LOYALTY_CHANGE';
  readonly sessionId: string;
  readonly companionId: string;
  readonly delta: number;
  readonly reason: string;
}

export interface CompanionActionEvent extends BaseGameEvent {
  readonly type: 'COMPANION_ACTION';
  readonly sessionId: string;
  readonly companionId: string;
  readonly targets: string[];
}

export type GameEvent =
  | ApplyDamageEvent
  | RecoverHpEvent
  | ApplyConditionEvent
  | RemoveConditionEvent
  | LongRestEvent
  | ShortRestEvent
  | SpendResourceEvent
  | RecoverResourceEvent
  | LevelUpEvent
  | UseRacialSpellEvent
  | ResetRacialSpellsEvent
  | AddItemEvent
  | GiveItemEvent
  | RemoveItemEvent
  | EquipItemEvent
  | UnequipItemEvent
  | UpdateCurrencyEvent
  | UpdateQuantityEvent
  | ConsumeItemEvent
  | SceneTransitionEvent
  | SceneObjectiveUpdateEvent
  | ThreatClockAdvanceEvent
  | PartyChoiceCreatedEvent
  | PartyVoteCastEvent
  | PartyChoiceResolvedEvent
  | CompanionSummonEvent
  | CompanionDismissEvent
  | CompanionLoyaltyChangeEvent
  | CompanionActionEvent;
