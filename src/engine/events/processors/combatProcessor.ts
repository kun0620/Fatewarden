import {
  addParticipant,
  advanceTurn,
  applyCombatDamage,
  applyCombatHealing,
  applyCombatTempHp,
  applyCondition,
  createCombat,
  defaultActionEconomy,
  expireConditionsForTurn,
  markActionUsed,
  removeCondition,
  resetActionEconomy,
  resolveAttack,
  rollCombatantInitiative,
  rollDeathSave,
  sortCombatantsByInitiative,
  sortInitiativeOrder,
  spendMovement,
  startCombat,
  type CombatState as EngineCombatState,
} from '../../combat';
import type { Character, Combatant, EncounterState } from '../../../types';
import type {
  CombatAddParticipantEvent,
  CombatAdjustDeathSaveEvent,
  CombatAdvanceTurnEvent,
  CombatAttackEvent,
  CombatCreateEncounterEvent,
  CombatEndEncounterEvent,
  CombatExpireConditionsEvent,
  CombatMoveEvent,
  CombatRollDeathSaveEvent,
  CombatRollInitiativeEvent,
  CombatSetAiBehaviorEvent,
  CombatSetInitiativeEvent,
  CombatSetTempHpEvent,
  CombatSortInitiativeEvent,
  CombatUseActionEvent,
  GameEvent,
} from '../types';
import type { CompanionState } from '../../companion/companionTypes';

type CombatProcessorResult = {
  applied: boolean;
  combatState: EncounterState | null;
  error?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toCombatState(encounter: EncounterState, activeCharacter: Character): EngineCombatState {
  return {
    id: encounter.id,
    name: encounter.name,
    roomId: undefined,
    phase: encounter.isActive ? 'active' : 'setup',
    participants: encounter.combatants.map((combatant, index) => ({
      id: combatant.id,
      characterId: combatant.type === 'player' && combatant.id === `pc-${activeCharacter.id}` ? activeCharacter.id : undefined,
      name: combatant.name,
      type: combatant.type === 'enemy' ? 'monster' : 'player',
      initiativeScore: combatant.initiative,
      dexScore: combatant.dexScore ?? 10,
      armorClass: combatant.armorClass,
      hitPoints: combatant.hitPoints,
      maxHitPoints: combatant.maxHitPoints,
      tempHitPoints: combatant.tempHitPoints,
      speed: combatant.speed ?? 30,
      resistances: combatant.resistances,
      vulnerabilities: combatant.vulnerabilities,
      immunities: combatant.immunities,
      conditions: combatant.conditions,
      status: combatant.status === 'dying' || combatant.status === 'stable'
        ? 'unconscious'
        : combatant.status ?? (combatant.hitPoints <= 0 ? 'unconscious' : 'active'),
      joinedOrder: index,
      aiBehavior: combatant.aiBehavior,
      controlMode: combatant.controlMode,
      movementUsed: combatant.movementUsed ?? combatant.actionEconomy?.movementUsed ?? 0,
    })),
    initiativeOrder: encounter.combatants.map((combatant) => combatant.id),
    turn: {
      round: encounter.round,
      turnIndex: encounter.activeIndex,
      activeParticipantId: encounter.combatants[encounter.activeIndex]?.id ?? null,
      hasStarted: encounter.isActive,
    },
    createdAt: new Date().toISOString(),
    startedAt: encounter.isActive ? new Date().toISOString() : null,
    endedAt: null,
  };
}

function toEncounterState(combat: EngineCombatState): EncounterState {
  const order = combat.initiativeOrder.length
    ? combat.initiativeOrder
    : combat.participants.map((participant) => participant.id);
  const orderedParticipants = order
    .map((id) => combat.participants.find((participant) => participant.id === id) ?? null)
    .filter((participant): participant is EngineCombatState['participants'][number] => participant !== null);
  const orderedCombatants: Combatant[] = orderedParticipants.map((participant) => ({
    id: participant.id,
    characterId: participant.characterId,
    name: participant.name,
    type: participant.type === 'player' ? 'player' : 'enemy',
    armorClass: participant.armorClass,
    hitPoints: participant.hitPoints,
    maxHitPoints: participant.maxHitPoints,
    tempHitPoints: participant.tempHitPoints,
    initiative: participant.initiativeScore ?? 0,
    dexScore: participant.dexScore,
    speed: participant.speed,
    movementUsed: participant.movementUsed ?? 0,
    actionEconomy: defaultActionEconomy(),
    status: participant.status === 'unconscious' ? 'dying' : participant.status,
    resistances: participant.resistances ? [...participant.resistances] : [],
    vulnerabilities: participant.vulnerabilities ? [...participant.vulnerabilities] : [],
    immunities: participant.immunities ? [...participant.immunities] : [],
    conditions: [...participant.conditions],
    conditionInstances: participant.conditions.map((name) => ({
      id: crypto.randomUUID(),
      name,
      expiresOn: 'manual',
      combatOnly: true,
    })),
    aiBehavior: participant.aiBehavior ?? 'aggressive',
    controlMode: participant.controlMode ?? (participant.type === 'player' ? 'manual' : 'hybrid'),
    deathSaves: { successes: 0, failures: 0 },
  }));

  const activeIndex = combat.turn.activeParticipantId
    ? Math.max(0, orderedCombatants.findIndex((combatant) => combatant.id === combat.turn.activeParticipantId))
    : Math.max(0, Math.min(combat.turn.turnIndex, Math.max(0, orderedCombatants.length - 1)));

  return {
    id: combat.id,
    name: combat.name,
    round: combat.turn.round,
    activeIndex,
    phase: combat.phase,
    activeCombatantId: orderedCombatants[activeIndex]?.id ?? null,
    isActive: combat.phase === 'active',
    combatants: orderedCombatants,
  };
}

function withEncounterRuntime(current: EncounterState): EncounterState {
  const activeIndex = Math.max(0, Math.min(current.activeIndex, Math.max(0, current.combatants.length - 1)));
  return {
    ...current,
    phase: current.phase ?? (current.isActive ? 'active' : 'setup'),
    activeIndex,
    activeCombatantId: current.combatants[activeIndex]?.id ?? null,
    combatants: current.combatants.map((combatant) => ({
      ...combatant,
      dexScore: combatant.dexScore ?? 10,
      speed: combatant.speed ?? 30,
      movementUsed: combatant.movementUsed ?? combatant.actionEconomy?.movementUsed ?? 0,
      actionEconomy: combatant.actionEconomy ?? defaultActionEconomy(),
      status: combatant.status ?? (combatant.hitPoints <= 0 ? 'dying' : 'active'),
      resistances: combatant.resistances ?? [],
      vulnerabilities: combatant.vulnerabilities ?? [],
      immunities: combatant.immunities ?? [],
      conditionInstances: combatant.conditionInstances ?? combatant.conditions.map((name) => ({
        id: crypto.randomUUID(),
        name,
        expiresOn: 'manual',
        combatOnly: true,
      })),
      aiBehavior: combatant.aiBehavior ?? 'aggressive',
      controlMode: combatant.controlMode ?? (combatant.type === 'enemy' ? 'hybrid' : 'manual'),
    })),
  };
}

export function processCombatCreateEncounter(event: CombatCreateEncounterEvent, runtimeCharactersById: Record<string, Character>): CombatProcessorResult {
  const initialCombat = createCombat(event.encounterName.trim() || 'Encounter');
  const activeCharacter = event.playerCharacter;
  const withPlayer = addParticipant(initialCombat, {
    id: `pc-${activeCharacter.id}`,
    characterId: activeCharacter.id,
    name: activeCharacter.name,
    type: 'player',
    initiativeScore: 0,
    dexScore: activeCharacter.abilities.dex,
    armorClass: activeCharacter.armorClass,
    hitPoints: activeCharacter.hitPoints,
    maxHitPoints: activeCharacter.maxHitPoints,
    tempHitPoints: 0,
    speed: activeCharacter.speed,
    conditions: [],
    status: 'active',
    joinedOrder: 0,
  }, runtimeCharactersById);
  return {
    applied: true,
    combatState: withEncounterRuntime(toEncounterState(startCombat(withPlayer, runtimeCharactersById))),
  };
}

export function processCombatAddParticipant(current: EncounterState | null, event: CombatAddParticipantEvent, activeCharacter: Character, runtimeCharactersById: Record<string, Character>): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  const participant = event.participant;
  if (current.combatants.some((combatant) => combatant.id === participant.id)) {
    return { applied: true, combatState: current };
  }
  const withParticipant = addParticipant(toCombatState(withEncounterRuntime(current), activeCharacter), {
    id: participant.id,
    characterId: participant.type === 'player' ? activeCharacter.id : undefined,
    name: participant.name,
    type: participant.type === 'enemy' ? 'monster' : 'player',
    initiativeScore: participant.initiative,
    dexScore: participant.dexScore ?? 10,
    armorClass: participant.armorClass,
    hitPoints: participant.hitPoints,
    maxHitPoints: participant.maxHitPoints,
    tempHitPoints: participant.tempHitPoints,
    speed: participant.speed ?? 30,
    resistances: participant.resistances,
    vulnerabilities: participant.vulnerabilities,
    immunities: participant.immunities,
    conditions: participant.conditions,
    status: participant.status === 'dying' || participant.status === 'stable'
      ? 'unconscious'
      : participant.status ?? (participant.hitPoints <= 0 ? 'unconscious' : 'active'),
    joinedOrder: current.combatants.length,
    aiBehavior: participant.aiBehavior,
    controlMode: participant.controlMode,
    movementUsed: participant.movementUsed ?? 0,
  }, runtimeCharactersById);
  return { applied: true, combatState: withEncounterRuntime(toEncounterState(withParticipant)) };
}

export function processCombatSetInitiative(current: EncounterState | null, event: CombatSetInitiativeEvent): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  return {
    applied: true,
    combatState: {
      ...withEncounterRuntime(current),
      combatants: current.combatants.map((combatant) =>
        combatant.id === event.combatantId ? { ...combatant, initiative: event.initiative } : combatant,
      ),
    },
  };
}

export function processCombatSortInitiative(current: EncounterState | null, activeCharacter: Character): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  const runtime = withEncounterRuntime(current);
  const combatants = sortCombatantsByInitiative(runtime.combatants);
  const sorted: EncounterState = {
    ...runtime,
    activeIndex: 0,
    activeCombatantId: combatants[0]?.id ?? null,
    combatants,
  };
  return { applied: true, combatState: sorted };
}

export function processCombatAdvanceTurn(
  current: EncounterState | null,
  event: CombatAdvanceTurnEvent,
  activeCharacter: Character,
  runtimeCharactersById: Record<string, Character>,
  companionState?: CompanionState | null,
  dispatchEvent?: (event: GameEvent) => void,
): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  if (!current.combatants.length) return { applied: true, combatState: current };

  const runtime = withEncounterRuntime(current);
  const count = runtime.combatants.length;
  const leaving = runtime.combatants[runtime.activeIndex];
  let combatants = runtime.combatants.map((combatant) =>
    leaving && combatant.id === leaving.id ? expireConditionsForTurn(combatant, 'turn_end') : combatant,
  );
  let activeIndex = runtime.activeIndex + event.direction;
  let round = runtime.round;

  if (activeIndex >= count) {
    activeIndex = 0;
    round += 1;
  } else if (activeIndex < 0) {
    activeIndex = count - 1;
    round = Math.max(1, round - 1);
  }

  const entering = combatants[activeIndex];
  combatants = combatants.map((combatant) => {
    if (!entering || combatant.id !== entering.id) return combatant;
    return resetActionEconomy(expireConditionsForTurn(combatant, 'turn_start'));
  });

  return {
    applied: true,
    combatState: {
      ...runtime,
      round,
      activeIndex,
      activeCombatantId: combatants[activeIndex]?.id ?? null,
      combatants,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function processCombatSetTempHp(current: EncounterState | null, event: CombatSetTempHpEvent): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  const runtime = withEncounterRuntime(current);
  return {
    applied: true,
    combatState: {
      ...runtime,
      combatants: runtime.combatants.map((combatant) =>
        combatant.id === event.combatantId
          ? applyCombatTempHp({ ...combatant, tempHitPoints: 0 }, event.tempHitPoints)
          : combatant,
      ),
    },
  };
}

export function processCombatAdjustDeathSave(current: EncounterState | null, event: CombatAdjustDeathSaveEvent): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  const runtime = withEncounterRuntime(current);
  return {
    applied: true,
    combatState: {
      ...runtime,
      combatants: runtime.combatants.map((combatant) => {
        if (combatant.id !== event.combatantId) return combatant;
        if (event.rollResult) {
          return rollDeathSave(combatant, () => (Math.max(1, Math.min(20, event.rollResult ?? 10)) - 1) / 20).combatant;
        }
        const deathSaves = {
          ...combatant.deathSaves,
          [event.key]: clamp(combatant.deathSaves[event.key] + event.delta, 0, 3),
        };
        const status = deathSaves.failures >= 3 ? 'dead' : deathSaves.successes >= 3 ? 'stable' : combatant.status;
        return {
          ...combatant,
          deathSaves,
          status,
        };
      }),
    },
  };
}

export function processCombatRollInitiative(current: EncounterState | null, event: CombatRollInitiativeEvent): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  const runtime = withEncounterRuntime(current);
  return {
    applied: true,
    combatState: {
      ...runtime,
      combatants: runtime.combatants.map((combatant) =>
        event.combatantId && combatant.id !== event.combatantId ? combatant : rollCombatantInitiative(combatant),
      ),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function processCombatUseAction(current: EncounterState | null, event: CombatUseActionEvent): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  const runtime = withEncounterRuntime(current);
  const actor = runtime.combatants.find((combatant) => combatant.id === event.combatantId);
  if (!actor) return { applied: false, combatState: runtime, error: 'Combatant not found.' };
  if (actor.actionEconomy?.[event.actionKind] === false) {
    return { applied: false, combatState: runtime, error: `${actor.name} has already used that resource this turn.` };
  }
  return {
    applied: true,
    combatState: {
      ...runtime,
      combatants: runtime.combatants.map((combatant) =>
        combatant.id === event.combatantId ? markActionUsed(combatant, event.actionKind) : combatant,
      ),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function processCombatMove(current: EncounterState | null, event: CombatMoveEvent): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  const runtime = withEncounterRuntime(current);
  return {
    applied: true,
    combatState: {
      ...runtime,
      combatants: runtime.combatants.map((combatant) =>
        combatant.id === event.combatantId ? spendMovement(combatant, event.feet) : combatant,
      ),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function processCombatAttack(current: EncounterState | null, event: CombatAttackEvent): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  const runtime = withEncounterRuntime(current);
  const actor = runtime.combatants.find((combatant) => combatant.id === event.actorCombatantId);
  if (!actor) return { applied: false, combatState: runtime, error: 'Attacker not found.' };
  if (actor.actionEconomy?.action === false) {
    return { applied: false, combatState: runtime, error: `${actor.name} has already used an action this turn.` };
  }
  const result = resolveAttack(runtime, {
    actorId: event.actorCombatantId,
    targetId: event.targetCombatantId,
    attackType: event.attackType,
    advantageMode: event.advantageMode,
    attackBonus: event.attackBonus,
    damageAmount: event.damageAmount,
    damageType: event.damageType,
  });
  return { applied: true, combatState: result.encounter };
}

export function processCombatRollDeathSave(current: EncounterState | null, event: CombatRollDeathSaveEvent): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  const runtime = withEncounterRuntime(current);
  return {
    applied: true,
    combatState: {
      ...runtime,
      combatants: runtime.combatants.map((combatant) =>
        combatant.id === event.combatantId ? rollDeathSave(combatant).combatant : combatant,
      ),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function processCombatSetAiBehavior(current: EncounterState | null, event: CombatSetAiBehaviorEvent): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  const runtime = withEncounterRuntime(current);
  return {
    applied: true,
    combatState: {
      ...runtime,
      combatants: runtime.combatants.map((combatant) =>
        combatant.id === event.combatantId
          ? { ...combatant, aiBehavior: event.behavior, controlMode: event.controlMode ?? combatant.controlMode }
          : combatant,
      ),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function processCombatExpireConditions(current: EncounterState | null, event: CombatExpireConditionsEvent): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  const runtime = withEncounterRuntime(current);
  return {
    applied: true,
    combatState: {
      ...runtime,
      combatants: runtime.combatants.map((combatant) =>
        combatant.id === event.combatantId ? expireConditionsForTurn(combatant, event.timing) : combatant,
      ),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function processCombatApplyDamage(current: EncounterState | null, targetId: string, amount: number, damageType?: string, isCritical?: boolean, bypassTempHp?: boolean): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  const runtime = withEncounterRuntime(current);
  return {
    applied: true,
    combatState: {
      ...runtime,
      combatants: runtime.combatants.map((combatant) =>
        combatant.id === targetId
          ? applyCombatDamage(combatant, { amount, damageType, isCritical, bypassTempHp }).combatant
          : combatant,
      ),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function processCombatRecoverHp(current: EncounterState | null, targetId: string, amount: number, recoveryKind?: string): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  const runtime = withEncounterRuntime(current);
  return {
    applied: true,
    combatState: {
      ...runtime,
      combatants: runtime.combatants.map((combatant) => {
        if (combatant.id !== targetId) return combatant;
        return recoveryKind === 'temp_hp' ? applyCombatTempHp(combatant, amount) : applyCombatHealing(combatant, amount);
      }),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function processCombatApplyCondition(current: EncounterState | null, targetId: string, condition: string, durationRounds?: number, saveEnds?: boolean): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  const runtime = withEncounterRuntime(current);
  return {
    applied: true,
    combatState: {
      ...runtime,
      combatants: runtime.combatants.map((combatant) =>
        combatant.id === targetId ? applyCondition(combatant, condition, durationRounds, saveEnds) : combatant,
      ),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function processCombatRemoveCondition(current: EncounterState | null, targetId: string, condition: string): CombatProcessorResult {
  if (!current) return { applied: false, combatState: null, error: 'No active encounter.' };
  const runtime = withEncounterRuntime(current);
  return {
    applied: true,
    combatState: {
      ...runtime,
      combatants: runtime.combatants.map((combatant) =>
        combatant.id === targetId ? removeCondition(combatant, condition) : combatant,
      ),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function processCombatEndEncounter(_current: EncounterState | null, _event: CombatEndEncounterEvent): CombatProcessorResult {
  return { applied: true, combatState: null };
}
