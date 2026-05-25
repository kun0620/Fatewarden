import { getAbilityModifier } from '../character/modifiers';
import { performAttackRoll } from '../dice/rollEngine';
import { rollDice } from '../dice/dice';
import { rehydrateParticipant } from '../inventory/inventoryEngine';
import type { Character } from '../../types';
import type { ApplyDamageEvent, ConcentrationSaveCheckEvent, GameEvent } from '../events/types';
import type { ActionResult, CombatAction, CombatState } from './combatTypes';

function findParticipant(combat: CombatState, participantId: string) {
  return combat.participants.find((participant) => participant.id === participantId) ?? null;
}

function makeActionResult(
  combat: CombatState,
  action: CombatAction,
  success: boolean,
  message: string,
  appliedEvents: string[] = [],
): ActionResult {
  return {
    combat,
    action,
    success,
    message,
    appliedEvents,
  };
}

function nowIso() {
  return new Date().toISOString();
}

function buildApplyDamageEvent(
  combat: CombatState,
  action: CombatAction,
  targetId: string,
  amount: number,
  isCritical: boolean,
  damageType?: string,
): ApplyDamageEvent {
  return {
    id: crypto.randomUUID(),
    type: 'apply_damage',
    sessionId: combat.roomId ?? combat.id,
    actorId: action.actorId,
    targetId,
    createdAt: nowIso(),
    source: 'system',
    amount: Math.max(0, Math.trunc(amount)),
    damageType,
    isCritical,
  };
}

function buildConcentrationSaveCheckEvent(
  combat: CombatState,
  action: CombatAction,
  characterId: string,
  damage: number,
): ConcentrationSaveCheckEvent {
  return {
    id: crypto.randomUUID(),
    type: 'CONCENTRATION_SAVE_CHECK',
    sessionId: combat.roomId ?? combat.id,
    actorId: action.actorId,
    targetId: characterId,
    createdAt: nowIso(),
    source: 'system',
    characterId,
    dc: Math.max(10, Math.floor(damage / 2)),
    damage,
  };
}

function normalizeDamageType(value: string | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function applyResistanceIfNeeded(
  damage: number,
  damageType: string | undefined,
  targetResistances: readonly string[] | undefined,
) {
  const resistances = (targetResistances ?? []).map((entry) => entry.trim().toLowerCase());
  const normalizedDamageType = normalizeDamageType(damageType);
  if (!normalizedDamageType || !resistances.includes(normalizedDamageType)) {
    return damage;
  }
  return Math.floor(damage / 2);
}

function getEquippedWeapon(character: Character) {
  return character.inventory.items.find((item) => item.equipped && item.weapon) ?? null;
}

function getStrengthModifier(character: Character) {
  return getAbilityModifier(character.abilities.str ?? 10);
}

function resolveAttackDamage(actorCharacter: Character | null): { amount: number; damageType: string } {
  if (!actorCharacter) {
    return { amount: 1, damageType: 'bludgeoning' };
  }

  const equippedWeapon = getEquippedWeapon(actorCharacter);
  if (equippedWeapon?.weapon) {
    const rolled = rollDice(equippedWeapon.weapon.damageDice);
    return {
      amount: Math.max(1, rolled.subtotal),
      damageType: equippedWeapon.weapon.damageType,
    };
  }

  const unarmedDamage = Math.max(1, 1 + getStrengthModifier(actorCharacter));
  return {
    amount: unarmedDamage,
    damageType: 'bludgeoning',
  };
}

export type CombatActionResolution = {
  result: ActionResult;
  events: GameEvent[];
};

export function performAttackAction(
  combat: CombatState,
  action: CombatAction,
  charactersById: Record<string, Character> = {},
): CombatActionResolution {
  if (action.type !== 'attack') {
    return { result: makeActionResult(combat, action, false, 'Invalid action type for attack.'), events: [] };
  }

  const actor = findParticipant(combat, action.actorId);
  const target = action.targetId ? findParticipant(combat, action.targetId) : null;

  if (!actor) return { result: makeActionResult(combat, action, false, 'Actor not found.'), events: [] };
  if (!target) return { result: makeActionResult(combat, action, false, 'Target not found.'), events: [] };
  if (actor.status === 'dead' || actor.status === 'unconscious') {
    return { result: makeActionResult(combat, action, false, `${actor.name} cannot act right now.`), events: [] };
  }

  const ability = action.abilityOverride ?? 'str';
  const abilityScore =
    ability === 'dex'
      ? actor.dexScore
      : 10;
  const attackRoll = performAttackRoll({
    abilityModifier: getAbilityModifier(abilityScore),
    extraModifier: action.attackBonus ?? 0,
    advantageState: action.advantageState ?? 'normal',
  });

  const total = attackRoll.outcome.total;
  const hit = attackRoll.outcome.isCriticalSuccess || total >= target.armorClass;
  const message = hit
    ? `${actor.name} hits ${target.name} (attack ${total} vs AC ${target.armorClass}).`
    : `${actor.name} misses ${target.name} (attack ${total} vs AC ${target.armorClass}).`;

  const result: ActionResult = {
    combat,
    action,
    success: hit,
    message,
    roll: attackRoll,
    appliedEvents: hit ? ['attack_hit'] : ['attack_miss'],
  };

  if (!hit) {
    return { result, events: [] };
  }

  const linkedAttackerCharacter =
    actor.characterId && charactersById[actor.characterId]
      ? charactersById[actor.characterId]
      : null;
  const linkedTargetCharacter =
    target.characterId && charactersById[target.characterId]
      ? charactersById[target.characterId]
      : null;
  const hydratedActor = linkedAttackerCharacter ? rehydrateParticipant(actor, linkedAttackerCharacter) : actor;
  const hydratedTarget = linkedTargetCharacter ? rehydrateParticipant(target, linkedTargetCharacter) : target;
  const resolvedDamage = resolveAttackDamage(
    hydratedActor.characterId ? linkedAttackerCharacter : null,
  );
  const criticalDamage = attackRoll.outcome.isCriticalSuccess ? resolvedDamage.amount * 2 : resolvedDamage.amount;
  const reducedDamage = applyResistanceIfNeeded(criticalDamage, resolvedDamage.damageType, hydratedTarget.resistances);
  const finalDamage = Math.max(0, reducedDamage);

  const damageEvent = buildApplyDamageEvent(
    combat,
    action,
    target.id,
    finalDamage,
    attackRoll.outcome.isCriticalSuccess,
    resolvedDamage.damageType,
  );

  const concentrationEvent =
    target.type === 'player' && linkedTargetCharacter?.systemData.activeConcentration && finalDamage > 0 && target.characterId
      ? buildConcentrationSaveCheckEvent(combat, action, target.characterId, finalDamage)
      : null;

  return { result, events: concentrationEvent ? [damageEvent, concentrationEvent] : [damageEvent] };
}

export function performDashAction(combat: CombatState, action: CombatAction): CombatActionResolution {
  if (action.type !== 'dash') {
    return { result: makeActionResult(combat, action, false, 'Invalid action type for dash.'), events: [] };
  }
  const actor = findParticipant(combat, action.actorId);
  if (!actor) return { result: makeActionResult(combat, action, false, 'Actor not found.'), events: [] };
  if (actor.status === 'dead' || actor.status === 'unconscious') {
    return { result: makeActionResult(combat, action, false, `${actor.name} cannot act right now.`), events: [] };
  }

  return {
    result: makeActionResult(combat, action, true, `${actor.name} dashes and doubles movement this turn.`, ['dash']),
    events: [],
  };
}

export function performDisengageAction(combat: CombatState, action: CombatAction): CombatActionResolution {
  if (action.type !== 'disengage') {
    return { result: makeActionResult(combat, action, false, 'Invalid action type for disengage.'), events: [] };
  }
  const actor = findParticipant(combat, action.actorId);
  if (!actor) return { result: makeActionResult(combat, action, false, 'Actor not found.'), events: [] };
  if (actor.status === 'dead' || actor.status === 'unconscious') {
    return { result: makeActionResult(combat, action, false, `${actor.name} cannot act right now.`), events: [] };
  }

  return {
    result: makeActionResult(combat, action, true, `${actor.name} disengages and avoids opportunity attacks.`, [
      'disengage',
    ]),
    events: [],
  };
}

export function performDodgeAction(combat: CombatState, action: CombatAction): CombatActionResolution {
  if (action.type !== 'dodge') {
    return { result: makeActionResult(combat, action, false, 'Invalid action type for dodge.'), events: [] };
  }
  const actor = findParticipant(combat, action.actorId);
  if (!actor) return { result: makeActionResult(combat, action, false, 'Actor not found.'), events: [] };
  if (actor.status === 'dead' || actor.status === 'unconscious') {
    return { result: makeActionResult(combat, action, false, `${actor.name} cannot act right now.`), events: [] };
  }

  return {
    result: makeActionResult(combat, action, true, `${actor.name} takes the Dodge action.`, ['dodge']),
    events: [],
  };
}
