import { Minus, Plus, RotateCcw, SkipBack, SkipForward, Swords, XCircle } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { conditions } from '../lib/rules';
import type { GameEvent } from '../engine/events/types';
import type { Character, Combatant, EncounterState, GamePhase } from '../types';
import { Tooltip } from './ui/Tooltip';

type CombatTrackerProps = {
  character: Character;
  encounter: EncounterState | null;
  onEncounterChange: (encounter: EncounterState | null) => Promise<void> | void;
  onCombatEvent: (body: string, metadata: Record<string, unknown>) => Promise<void> | void;
  onRequestPhaseChange?: (phase: GamePhase) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hpState(hp: number, maxHp: number): 'full' | 'mid' | 'low' | 'bleed' {
  if (maxHp <= 0) return 'full';
  const pct = hp / maxHp;
  if (pct > 0.6) return 'full';
  if (pct > 0.3) return 'mid';
  if (pct > 0.1) return 'low';
  return 'bleed';
}

function isInitiativeSorted(combatants: Combatant[]) {
  for (let index = 1; index < combatants.length; index += 1) {
    if (combatants[index - 1].initiative < combatants[index].initiative) return false;
  }
  return true;
}

function buildEventMeta(character: Character, sessionId: string) {
  return {
    id: crypto.randomUUID(),
    sessionId,
    actorId: character.id,
    targetId: character.id,
    createdAt: new Date().toISOString(),
    source: 'user' as const,
  };
}

export function CombatTracker({
  character,
  encounter,
  onCombatEvent,
  onEncounterChange,
  onRequestPhaseChange,
}: CombatTrackerProps) {
  const [name, setName] = useState('Road Ambush');
  const [enemyName, setEnemyName] = useState('Goblin Scout');
  const [enemyAc, setEnemyAc] = useState(13);
  const [enemyHp, setEnemyHp] = useState(7);
  const [enemyInitiative, setEnemyInitiative] = useState(10);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [conditionDrafts, setConditionDrafts] = useState<Record<string, string>>({});

  const combatState = useGameStore((state) => state.combatState);
  const setCombatState = useGameStore((state) => state.setCombatState);
  const setActiveCharacter = useGameStore((state) => state.setActiveCharacter);
  const dispatch = useGameStore((state) => state.dispatch);

  useEffect(() => {
    setActiveCharacter(character);
  }, [character, setActiveCharacter]);

  useEffect(() => {
    setCombatState(encounter);
  }, [encounter, setCombatState]);

  const activeEncounter = combatState ?? encounter;

  const activeCombatant = useMemo(() => {
    if (!activeEncounter?.combatants.length) return null;
    return activeEncounter.combatants[activeEncounter.activeIndex] ?? activeEncounter.combatants[0];
  }, [activeEncounter]);

  const quickStep = useMemo(() => {
    if (!activeEncounter) return null;
    if (activeEncounter.combatants.length < 2) return 1;
    if (activeEncounter.combatants.some((combatant) => combatant.initiative === 0)) return 2;
    if (!isInitiativeSorted(activeEncounter.combatants)) return 3;
    return 4;
  }, [activeEncounter]);

  const shouldShowQuickSteps = useMemo(() => {
    if (!activeEncounter) return false;
    if (!activeEncounter.isActive) return true;
    return activeEncounter.round <= 1 && activeEncounter.activeIndex === 0;
  }, [activeEncounter]);

  async function syncEncounterFromStore() {
    const latest = useGameStore.getState().combatState;
    await onEncounterChange(latest);
    return latest;
  }

  async function dispatchCombat(event: GameEvent) {
    const result = dispatch(event);
    if (result.failed.length) {
      throw new Error(result.failed.join(', '));
    }
    return syncEncounterFromStore();
  }

  async function endEncounter() {
    if (!activeEncounter) return;
    await dispatchCombat({
      ...buildEventMeta(character, activeEncounter.id),
      type: 'COMBAT_END_ENCOUNTER',
    });
    await onCombatEvent(`Encounter ended: ${activeEncounter.name}`, {
      kind: 'combat_event',
      action: 'encounter_ended',
      encounterId: activeEncounter.id,
    });
  }

  async function createEncounter(event: FormEvent) {
    event.preventDefault();
    await dispatchCombat({
      ...buildEventMeta(character, 'local'),
      type: 'COMBAT_CREATE_ENCOUNTER',
      encounterName: name.trim() || 'Encounter',
      playerCharacter: character,
    });
    onRequestPhaseChange?.('combat');
    const latest = useGameStore.getState().combatState;
    if (latest) {
      await onCombatEvent(`Encounter started: ${latest.name}`, {
        kind: 'combat_event',
        action: 'encounter_started',
        encounter: latest,
      });
    }
  }

  async function addPlayer() {
    if (!activeEncounter) return;
    const player: Combatant = {
      id: `pc-${character.id}`,
      name: character.name,
      type: 'player',
      armorClass: character.armorClass,
      hitPoints: character.hitPoints,
      maxHitPoints: character.maxHitPoints,
      tempHitPoints: 0,
      initiative: 0,
      conditions: [],
      deathSaves: { successes: 0, failures: 0 },
    };
    await dispatchCombat({
      ...buildEventMeta(character, activeEncounter.id),
      type: 'COMBAT_ADD_PARTICIPANT',
      participant: player,
    });
    await onCombatEvent(`${character.name} joined the initiative list.`, {
      kind: 'combat_event',
      action: 'combatant_added',
      combatant: player,
    });
  }

  async function addEnemy(event: FormEvent) {
    event.preventDefault();
    if (!activeEncounter) return;
    const enemy: Combatant = {
      id: crypto.randomUUID(),
      name: enemyName.trim() || 'Enemy',
      type: 'enemy',
      armorClass: enemyAc,
      hitPoints: enemyHp,
      maxHitPoints: enemyHp,
      tempHitPoints: 0,
      initiative: enemyInitiative,
      conditions: [],
      deathSaves: { successes: 0, failures: 0 },
    };
    await dispatchCombat({
      ...buildEventMeta(character, activeEncounter.id),
      type: 'COMBAT_ADD_PARTICIPANT',
      participant: enemy,
    });
    await onCombatEvent(`${enemy.name} entered combat with initiative ${enemy.initiative}.`, {
      kind: 'combat_event',
      action: 'combatant_added',
      combatant: enemy,
    });
  }

  async function setInitiative(id: string, initiative: number) {
    if (!activeEncounter) return;
    await dispatchCombat({
      ...buildEventMeta(character, activeEncounter.id),
      type: 'COMBAT_SET_INITIATIVE',
      combatantId: id,
      initiative,
    });
  }

  async function sortInitiative() {
    if (!activeEncounter) return;
    await dispatchCombat({
      ...buildEventMeta(character, activeEncounter.id),
      type: 'COMBAT_SORT_INITIATIVE',
    });
    await onCombatEvent('Initiative order locked.', {
      kind: 'combat_event',
      action: 'initiative_sorted',
    });
  }

  async function moveTurn(direction: 1 | -1) {
    if (!activeEncounter) return;
    const next = await dispatchCombat({
      ...buildEventMeta(character, activeEncounter.id),
      type: 'COMBAT_ADVANCE_TURN',
      direction,
    });
    if (next && next.combatants.length > 0) {
      const active = next.combatants[next.activeIndex];
      await onCombatEvent(`Turn started: ${active.name} (Round ${next.round})`, {
        kind: 'combat_event',
        action: 'turn_started',
        encounterId: next.id,
        round: next.round,
        activeCombatant: active,
      });
    }
  }

  async function applyHp(id: string, direction: 'damage' | 'healing') {
    if (!activeEncounter) return;
    const amount = Math.max(0, amounts[id] ?? 0);
    if (!amount) return;
    const target = activeEncounter.combatants.find((combatant) => combatant.id === id);
    if (!target) return;

    const event: GameEvent =
      direction === 'damage'
        ? {
            ...buildEventMeta(character, activeEncounter.id),
            type: 'apply_damage',
            targetId: id,
            amount,
          }
        : {
            ...buildEventMeta(character, activeEncounter.id),
            type: 'recover_hp',
            targetId: id,
            amount,
            recoveryKind: 'healing',
          };

    const next = await dispatchCombat(event);
    const changed = next?.combatants.find((combatant) => combatant.id === id);
    if (!changed) return;
    const eventText =
      direction === 'damage'
        ? `${target.name} took ${amount} damage. HP ${changed.hitPoints}/${changed.maxHitPoints}.`
        : `${target.name} healed ${amount}. HP ${changed.hitPoints}/${changed.maxHitPoints}.`;
    await onCombatEvent(eventText, {
      kind: 'combat_event',
      action: direction,
      amount,
      combatant: changed,
    });
  }

  async function setTempHp(id: string, tempHitPoints: number) {
    if (!activeEncounter) return;
    await dispatchCombat({
      ...buildEventMeta(character, activeEncounter.id),
      type: 'COMBAT_SET_TEMP_HP',
      combatantId: id,
      tempHitPoints: Math.max(0, tempHitPoints),
    });
  }

  async function addCondition(id: string) {
    if (!activeEncounter) return;
    const condition = conditionDrafts[id];
    if (!condition) return;
    const target = activeEncounter.combatants.find((combatant) => combatant.id === id);
    await dispatchCombat({
      ...buildEventMeta(character, activeEncounter.id),
      type: 'apply_condition',
      targetId: id,
      condition,
    });
    await onCombatEvent(`${condition} added to ${target?.name ?? 'target'}.`, {
      kind: 'combat_event',
      action: 'condition_added',
      condition,
      combatantId: id,
    });
  }

  async function removeCondition(id: string, condition: string) {
    if (!activeEncounter) return;
    const target = activeEncounter.combatants.find((combatant) => combatant.id === id);
    await dispatchCombat({
      ...buildEventMeta(character, activeEncounter.id),
      type: 'remove_condition',
      targetId: id,
      condition,
    });
    await onCombatEvent(`${condition} removed from ${target?.name ?? 'target'}.`, {
      kind: 'combat_event',
      action: 'condition_removed',
      condition,
      combatantId: id,
    });
  }

  async function setDeathSave(id: string, key: 'successes' | 'failures', delta: number) {
    if (!activeEncounter) return;
    const next = await dispatchCombat({
      ...buildEventMeta(character, activeEncounter.id),
      type: 'COMBAT_ADJUST_DEATH_SAVE',
      combatantId: id,
      key,
      delta,
    });
    const combatant = next?.combatants.find((entry) => entry.id === id);
    if (!combatant) return;
    await onCombatEvent(
      `${combatant.name} death saves: ${combatant.deathSaves.successes} success, ${combatant.deathSaves.failures} failure.`,
      { kind: 'combat_event', action: 'death_save', combatantId: id, key, delta },
    );
  }

  if (!activeEncounter) {
    return (
      <section className="fw-panel fw-combat-panel">
        <div className="fw-panel__header">
          <div>
            <p className="fw-caption">Combat</p>
            <h2 className="fw-h2">Tracker</h2>
          </div>
          <Swords size={24} aria-hidden="true" />
        </div>
        <form onSubmit={createEncounter} className="fw-panel__body fw-combat-panel__create">
          <div className="fw-field">
            <label className="fw-field__label">Encounter name</label>
            <input className="fw-input" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <button className="fw-btn fw-btn--primary" type="submit">
            <Swords size={17} aria-hidden="true" />
            Create Encounter
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="fw-panel fw-combat-panel">
      <div className="fw-panel__header">
        <div>
          <p className="fw-caption">Combat</p>
          <h2 className="fw-h2">{activeEncounter.name}</h2>
        </div>
        <span className="fw-caption">Round {activeEncounter.round}</span>
      </div>
      <div className="fw-panel__body fw-combat-panel__body">

        {shouldShowQuickSteps ? (
          <article className="fw-combat-panel__steps">
            <p className="fw-caption fw-combat-panel__steps-title">Quick Steps</p>
            <div className="fw-combat-panel__steps-list">
            {[
              'Step 1: Add participants',
              'Step 2: Set initiative',
              'Step 3: Sort',
              'Step 4: Next Turn',
            ].map((label, index) => {
              const step = index + 1;
              const isActiveStep = quickStep === step;
              return (
                  <span
                    className="fw-cond fw-cond--minor"
                    data-selected={isActiveStep ? 'true' : undefined}
                    key={label}
                    style={isActiveStep ? { borderColor: 'var(--accent)', color: 'var(--ink-100)' } : undefined}
                  >
                    <span className="fw-cond__dot" />
                    {label}
                  </span>
                );
              })}
            </div>
          </article>
        ) : null}

        <div className="fw-combat-panel__controls">
          <button className="fw-btn fw-btn--ghost" onClick={() => void moveTurn(-1)} type="button">
            <SkipBack size={16} aria-hidden="true" />
            Previous
          </button>
          <button className="fw-btn fw-btn--primary fw-combat-panel__next-turn" onClick={() => void moveTurn(1)} type="button">
            <SkipForward size={16} aria-hidden="true" />
            Next Turn
          </button>
          <button className="fw-btn fw-btn--ghost" onClick={() => void sortInitiative()} type="button">
            <RotateCcw size={16} aria-hidden="true" />
            <Tooltip label="ลำดับการตี — ทอย d20 + DEX">Initiative</Tooltip>
          </button>
          <button className="fw-btn fw-btn--danger" onClick={() => void endEncounter()} type="button">
            <XCircle size={16} aria-hidden="true" />
            End
          </button>
        </div>

        <p className="fw-caption fw-combat-panel__active">
          Active: <strong>{activeCombatant?.name ?? 'No combatants'}</strong>
        </p>

        <div className="fw-combat-panel__list">
          {activeEncounter.combatants.map((combatant, index) => (
            <article
              className={index === activeEncounter.activeIndex ? 'fw-card fw-card--elevated fw-combatant fw-combatant--active' : 'fw-card fw-combatant'}
              key={combatant.id}
            >
              <div className="fw-combatant__top">
                <div>
                  <span className="fw-h3">{combatant.name}</span>
                  <span className="fw-caption">
                    {combatant.type === 'player' ? 'Player' : 'Enemy'} · <Tooltip label="Armor Class — ค่าที่คนตียากให้ถึง">AC</Tooltip> {combatant.armorClass}
                  </span>
                </div>
                <div className="fw-field">
                  <label className="fw-field__label">
                    <Tooltip label="ลำดับการตี — ทอย d20 + DEX">Initiative</Tooltip>
                  </label>
                  <input
                    className="fw-input"
                    type="number"
                    value={combatant.initiative}
                    onChange={(event) => void setInitiative(combatant.id, Number(event.target.value))}
                  />
                </div>
              </div>

              <div
                className="fw-hp fw-hp--lg"
                data-state={hpState(combatant.hitPoints, combatant.maxHitPoints)}
              >
                <div
                  className="fw-hp__fill"
                  style={{ width: `${Math.max(0, Math.min(100, combatant.maxHitPoints > 0 ? (combatant.hitPoints / combatant.maxHitPoints) * 100 : 0))}%` }}
                />
                <span className="fw-hp__text">
                  {combatant.hitPoints}/{combatant.maxHitPoints}
                  {combatant.tempHitPoints ? ` +${combatant.tempHitPoints}` : ''}
                </span>
              </div>

              <div className="fw-combatant__hp-actions">
                <input
                  className="fw-input"
                  aria-label={`Amount for ${combatant.name}`}
                  min={0}
                  type="number"
                  value={amounts[combatant.id] ?? 0}
                  onChange={(event) =>
                    setAmounts((current) => ({ ...current, [combatant.id]: Number(event.target.value) }))
                  }
                />
                <button className="fw-btn fw-btn--ghost" onClick={() => void applyHp(combatant.id, 'damage')} type="button">
                  Damage
                </button>
                <button className="fw-btn fw-btn--ghost" onClick={() => void applyHp(combatant.id, 'healing')} type="button">
                  Heal
                </button>
              </div>

              <div className="fw-field">
                <label className="fw-field__label">
                  <Tooltip label="HP ชั่วคราว — ลดก่อน HP จริง">Temp HP</Tooltip>
                </label>
                <input
                  className="fw-input"
                  min={0}
                  type="number"
                  value={combatant.tempHitPoints}
                  onChange={(event) => void setTempHp(combatant.id, Number(event.target.value))}
                />
              </div>

              <div className="fw-combatant__conditions-editor">
                <select
                  className="fw-select"
                  value={conditionDrafts[combatant.id] ?? ''}
                  onChange={(event) =>
                    setConditionDrafts((current) => ({ ...current, [combatant.id]: event.target.value }))
                  }
                >
                  <option value="">Condition</option>
                  {conditions.map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </select>
                <button className="fw-btn fw-btn--ghost" onClick={() => void addCondition(combatant.id)} type="button">
                  <Plus size={15} aria-hidden="true" />
                </button>
              </div>

              {combatant.conditions.length ? (
                <div className="fw-combatant__condition-list">
                  {combatant.conditions.map((condition) => (
                    <button
                      className="fw-cond fw-cond--minor"
                      key={condition}
                      onClick={() => void removeCondition(combatant.id, condition)}
                      type="button"
                    >
                      <span className="fw-cond__dot" />
                      {condition}
                    </button>
                  ))}
                </div>
              ) : null}

              {combatant.hitPoints === 0 ? (
                <div className="fw-combatant__deathsave">
                  <span>
                    <Tooltip label="ทอย d20 — สูง 10 ได้, ต่ำ 10 เสีย">Death Save</Tooltip>
                  </span>
                  <button className="fw-btn fw-btn--ghost" onClick={() => void setDeathSave(combatant.id, 'successes', -1)} type="button">
                    <Minus size={14} aria-hidden="true" />
                  </button>
                  <span className="fw-caption">S {combatant.deathSaves.successes}</span>
                  <button className="fw-btn fw-btn--ghost" onClick={() => void setDeathSave(combatant.id, 'successes', 1)} type="button">
                    <Plus size={14} aria-hidden="true" />
                  </button>
                  <button className="fw-btn fw-btn--ghost" onClick={() => void setDeathSave(combatant.id, 'failures', -1)} type="button">
                    <Minus size={14} aria-hidden="true" />
                  </button>
                  <span className="fw-caption">F {combatant.deathSaves.failures}</span>
                  <button className="fw-btn fw-btn--ghost" onClick={() => void setDeathSave(combatant.id, 'failures', 1)} type="button">
                    <Plus size={14} aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>

        <form onSubmit={addEnemy} className="fw-combat-panel__add-enemy">
          <input className="fw-input" value={enemyName} onChange={(event) => setEnemyName(event.target.value)} />
          <input className="fw-input" type="number" value={enemyAc} onChange={(event) => setEnemyAc(Number(event.target.value))} />
          <input className="fw-input" type="number" value={enemyHp} onChange={(event) => setEnemyHp(Number(event.target.value))} />
          <input
            className="fw-input"
            type="number"
            value={enemyInitiative}
            onChange={(event) => setEnemyInitiative(Number(event.target.value))}
          />
          <button className="fw-btn fw-btn--ghost" type="submit">
            <Plus size={15} aria-hidden="true" />
            Enemy
          </button>
        </form>

        <button className="fw-btn fw-btn--ghost" onClick={() => void addPlayer()} type="button">
          Add current player
        </button>
      </div>
    </section>
  );
}
