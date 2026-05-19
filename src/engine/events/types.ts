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
  readonly bypassTempHp?: boolean;
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

export interface ShortRestRuntimeEvent extends BaseGameEvent {
  readonly type: 'SHORT_REST';
  readonly characterId: string;
  readonly hitDiceSpent: number;
}

export interface LongRestRuntimeEvent extends BaseGameEvent {
  readonly type: 'LONG_REST';
  readonly characterId: string;
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

export interface CombatCreateEncounterEvent extends BaseGameEvent {
  readonly type: 'COMBAT_CREATE_ENCOUNTER';
  readonly encounterName: string;
  readonly playerCharacter: import('../../types').Character;
}

export interface CombatAddParticipantEvent extends BaseGameEvent {
  readonly type: 'COMBAT_ADD_PARTICIPANT';
  readonly participant: import('../../types').Combatant;
}

export interface CombatSetInitiativeEvent extends BaseGameEvent {
  readonly type: 'COMBAT_SET_INITIATIVE';
  readonly combatantId: string;
  readonly initiative: number;
}

export interface CombatSortInitiativeEvent extends BaseGameEvent {
  readonly type: 'COMBAT_SORT_INITIATIVE';
}

export interface CombatRollInitiativeEvent extends BaseGameEvent {
  readonly type: 'COMBAT_ROLL_INITIATIVE';
  readonly combatantId?: string;
}

export interface CombatAdvanceTurnEvent extends BaseGameEvent {
  readonly type: 'COMBAT_ADVANCE_TURN';
  readonly direction: 1 | -1;
}

export interface CombatUseActionEvent extends BaseGameEvent {
  readonly type: 'COMBAT_USE_ACTION';
  readonly combatantId: string;
  readonly actionKind: import('../../types').CombatActionKind;
}

export interface CombatMoveEvent extends BaseGameEvent {
  readonly type: 'COMBAT_MOVE';
  readonly combatantId: string;
  readonly feet: number;
}

export interface CombatAttackEvent extends BaseGameEvent {
  readonly type: 'COMBAT_ATTACK';
  readonly actorCombatantId: string;
  readonly targetCombatantId: string;
  readonly attackType: import('../../types').CombatAttackType;
  readonly advantageMode?: import('../../types').CombatAdvantageMode;
  readonly attackBonus?: number;
  readonly damageAmount?: number;
  readonly damageType?: string;
}

export interface CombatSetTempHpEvent extends BaseGameEvent {
  readonly type: 'COMBAT_SET_TEMP_HP';
  readonly combatantId: string;
  readonly tempHitPoints: number;
}

export interface CombatAdjustDeathSaveEvent extends BaseGameEvent {
  readonly type: 'COMBAT_ADJUST_DEATH_SAVE';
  readonly combatantId: string;
  readonly key: 'successes' | 'failures';
  readonly delta: number;
  readonly rollResult?: number;  // Raw d20 roll result (1-20) for nat 20/nat 1 detection
}

export interface CombatRollDeathSaveEvent extends BaseGameEvent {
  readonly type: 'COMBAT_ROLL_DEATH_SAVE';
  readonly combatantId: string;
}

export interface CombatSetAiBehaviorEvent extends BaseGameEvent {
  readonly type: 'COMBAT_SET_AI_BEHAVIOR';
  readonly combatantId: string;
  readonly behavior: import('../../types').CombatAiBehavior;
  readonly controlMode?: import('../../types').CombatControlMode;
}

export interface CombatExpireConditionsEvent extends BaseGameEvent {
  readonly type: 'COMBAT_EXPIRE_CONDITIONS';
  readonly combatantId: string;
  readonly timing: 'turn_start' | 'turn_end';
}

export interface CombatOpportunityTriggerEvent extends BaseGameEvent {
  readonly type: 'COMBAT_OPPORTUNITY_TRIGGER';
  readonly moverId: string;
  readonly threatenedByIds: string[];
  readonly confirmed?: boolean;
}

export interface CombatEndEncounterEvent extends BaseGameEvent {
  readonly type: 'COMBAT_END_ENCOUNTER';
  readonly lootSummary?: string;
}

export type GameEvent =
  | ApplyDamageEvent
  | RecoverHpEvent
  | ApplyConditionEvent
  | RemoveConditionEvent
  | LongRestEvent
  | ShortRestEvent
  | ShortRestRuntimeEvent
  | LongRestRuntimeEvent
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
  | CompanionActionEvent
  | CombatCreateEncounterEvent
  | CombatAddParticipantEvent
  | CombatSetInitiativeEvent
  | CombatSortInitiativeEvent
  | CombatRollInitiativeEvent
  | CombatAdvanceTurnEvent
  | CombatUseActionEvent
  | CombatMoveEvent
  | CombatAttackEvent
  | CombatSetTempHpEvent
  | CombatAdjustDeathSaveEvent
  | CombatRollDeathSaveEvent
  | CombatSetAiBehaviorEvent
  | CombatExpireConditionsEvent
  | CombatOpportunityTriggerEvent
  | CombatEndEncounterEvent;
