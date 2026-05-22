import { Minus, Plus, RotateCcw, Settings, SkipBack, SkipForward, Swords, XCircle } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { conditions } from '../lib/rules';
import { useGameStore } from '../store/useGameStore';
import type { GameEvent } from '../engine/events/types';
import type { Character, Combatant, EncounterState, GamePhase } from '../types';

type CombatTrackerProps = {
  character: Character;
  encounter: EncounterState | null;
  onEncounterChange: (encounter: EncounterState | null) => Promise<void> | void;
  onCombatEvent: (body: string, metadata: Record<string, unknown>) => Promise<void> | void;
  onRequestPhaseChange?: (phase: GamePhase) => void;
};

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

function getConditionVariant(condition: string): 'bleed' | 'buff' | 'minor' {
  const negative = new Set([
    'poisoned',
    'frightened',
    'paralyzed',
    'prone',
    'stunned',
    'exhausted',
    'blinded',
    'restrained',
  ]);
  const positive = new Set(['bless', 'haste', 'inspired', 'concentrating']);
  const lower = condition.trim().toLowerCase();
  if (negative.has(lower)) return 'bleed';
  if (positive.has(lower)) return 'buff';
  return 'minor';
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hpDraftMode, setHpDraftMode] = useState<'damage' | 'healing' | null>(null);
  const [showConditionPicker, setShowConditionPicker] = useState(false);
  const [showEnemyForm, setShowEnemyForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [attackTargetId, setAttackTargetId] = useState('');
  const [attackBonus, setAttackBonus] = useState(5);
  const [attackDamage, setAttackDamage] = useState(6);
  const [attackType, setAttackType] = useState<'melee' | 'ranged' | 'spell'>('melee');
  const [advantageMode, setAdvantageMode] = useState<'normal' | 'advantage' | 'disadvantage'>('normal');
  const [damageType, setDamageType] = useState('slashing');

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

  useEffect(() => {
    if (!activeEncounter?.combatants.length) {
      setSelectedId(null);
      return;
    }
    const current = activeEncounter.combatants[activeEncounter.activeIndex] ?? activeEncounter.combatants[0];
    const chosen = selectedId
      ? activeEncounter.combatants.find((combatant) => combatant.id === selectedId)
      : null;
    if (!chosen) setSelectedId(current.id);
  }, [activeEncounter, selectedId]);

  const selectedCombatant = useMemo(
    () => activeEncounter?.combatants.find((combatant) => combatant.id === selectedId) ?? null,
    [activeEncounter, selectedId],
  );

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

  const allConditionChips = useMemo(
    () =>
      (activeEncounter?.combatants ?? []).flatMap((combatant) =>
        combatant.conditions.map((condition) => ({ combatant, condition })),
      ),
    [activeEncounter],
  );

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

  async function rollInitiative(id?: string) {
    if (!activeEncounter) return;
    await dispatchCombat({
      ...buildEventMeta(character, activeEncounter.id),
      type: 'COMBAT_ROLL_INITIATIVE',
      ...(id ? { combatantId: id } : {}),
    });
    await onCombatEvent(id ? 'Initiative rolled.' : 'Initiative rolled for all combatants.', {
      kind: 'combat_event',
      action: 'initiative_rolled',
      combatantId: id,
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

  async function useAction(id: string, actionKind: 'action' | 'bonusAction' | 'reaction') {
    if (!activeEncounter) return;
    await dispatchCombat({
      ...buildEventMeta(character, activeEncounter.id),
      type: 'COMBAT_USE_ACTION',
      combatantId: id,
      actionKind,
    });
  }

  async function moveCombatant(id: string, feet: number) {
    if (!activeEncounter) return;
    await dispatchCombat({
      ...buildEventMeta(character, activeEncounter.id),
      type: 'COMBAT_MOVE',
      combatantId: id,
      feet,
    });
  }

  async function resolveAttackFlow() {
    if (!activeEncounter || !selectedCombatant || !attackTargetId) return;
    const target = activeEncounter.combatants.find((combatant) => combatant.id === attackTargetId);
    const next = await dispatchCombat({
      ...buildEventMeta(character, activeEncounter.id),
      type: 'COMBAT_ATTACK',
      actorCombatantId: selectedCombatant.id,
      targetCombatantId: attackTargetId,
      attackType,
      advantageMode,
      attackBonus,
      damageAmount: attackDamage,
      damageType,
    });
    const changed = next?.combatants.find((combatant) => combatant.id === attackTargetId);
    await onCombatEvent(
      `${selectedCombatant.name} attacks ${target?.name ?? 'target'}. ${changed ? `HP ${changed.hitPoints}/${changed.maxHitPoints}.` : ''}`.trim(),
      {
        kind: 'combat_event',
        action: 'attack',
        actorId: selectedCombatant.id,
        targetId: attackTargetId,
        attackType,
      },
    );
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

  async function rollDeathSaveAuto(id: string) {
    if (!activeEncounter) return;
    const next = await dispatchCombat({
      ...buildEventMeta(character, activeEncounter.id),
      type: 'COMBAT_ROLL_DEATH_SAVE',
      combatantId: id,
    });
    const combatant = next?.combatants.find((entry) => entry.id === id);
    if (!combatant) return;
    await onCombatEvent(
      `${combatant.name} death saves: ${combatant.deathSaves.successes} success, ${combatant.deathSaves.failures} failure.`,
      { kind: 'combat_event', action: 'death_save_roll', combatantId: id },
    );
  }

  async function setAiBehavior(id: string, behavior: 'aggressive' | 'defensive' | 'support' | 'random' | 'focused') {
    if (!activeEncounter) return;
    await dispatchCombat({
      ...buildEventMeta(character, activeEncounter.id),
      type: 'COMBAT_SET_AI_BEHAVIOR',
      combatantId: id,
      behavior,
      controlMode: 'hybrid',
    });
  }

  if (!activeEncounter) {
    return (
      <section className="fw-panel fw-combat-panel fw-combat-panel--empty">
        <div className="fw-panel__header">
          <div>
            <p className="fw-caption">Combat</p>
            <h2 className="fw-h2">No encounter active</h2>
          </div>
          <Swords size={24} aria-hidden="true" />
        </div>
        <div className="fw-panel__body">
          <p className="fw-caption">Create an encounter to begin tracking initiative.</p>
        </div>
        <form onSubmit={createEncounter} className="fw-panel__body fw-combat-panel__create">
          <div className="fw-field">
            <label className="fw-field__label">Encounter name</label>
            <input className="fw-input" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <button className="fw-btn fw-btn-gold" type="submit">
            <Swords size={17} aria-hidden="true" />
            Start Encounter
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
        <div className="fw-combat-panel__meta">
          <span className="fw-pill blood">Round {activeEncounter.round}</span>
          <span className="fw-caption">Surprise: none</span>
          <button className="fw-btn fw-btn--ghost fw-btn--sm" type="button" aria-label="Combat settings" onClick={() => setShowSettings(!showSettings)}>
            <Settings size={14} aria-hidden="true" />
          </button>
        </div>

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
                    {label}
                  </span>
                );
              })}
            </div>
          </article>
        ) : null}

        <div className="fw-combat-panel__list">
          {activeEncounter.combatants.map((combatant, index) => {
            const isCurrent = index === activeEncounter.activeIndex;
            const isSelected = combatant.id === selectedId;
            const state = hpState(combatant.hitPoints, combatant.maxHitPoints);
            const down = combatant.hitPoints <= 0;
            return (
              <article
                className="fw-combat-row"
                data-current={isCurrent ? 'true' : undefined}
                data-selected={isSelected ? 'true' : undefined}
                key={combatant.id}
                onClick={() => setSelectedId(combatant.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedId(combatant.id);
                  }
                }}
                role="button"
                style={down ? { opacity: 0.6 } : undefined}
                tabIndex={0}
              >
                {isCurrent ? <span className="fw-combat-row__accent" /> : null}
                <span className="fw-combat-row__ini fw-mono">{combatant.initiative}</span>
                <span className={`fw-combat-row__dot ${combatant.type === 'enemy' ? 'is-enemy' : 'is-ally'}`} />
                <span className="fw-combat-row__name">{combatant.name}</span>
                <span className={`fw-combat-row__hp fw-mono fw-combat-row__hp--${state}`}>
                  {combatant.tempHitPoints ? `+${combatant.tempHitPoints} ` : ''}{combatant.hitPoints}/{combatant.maxHitPoints}
                </span>
                <span className="fw-caption">
                  A {combatant.actionEconomy?.action === false ? '0' : '1'} / B {combatant.actionEconomy?.bonusAction === false ? '0' : '1'} / R {combatant.actionEconomy?.reaction === false ? '0' : '1'}
                </span>
                {isCurrent ? <span className="fw-cond bleed">NOW</span> : null}
              </article>
            );
          })}
        </div>

        <article className="fw-combat-panel__conditions">
          <p className="fw-caption fw-combat-panel__steps-title">Active Conditions</p>
          <div className="fw-combat-panel__condition-list">
            {allConditionChips.length ? (
              allConditionChips.map(({ combatant, condition }) => {
                const variant = getConditionVariant(condition);
                const className =
                  variant === 'minor' ? 'fw-cond fw-cond--minor' : `fw-cond ${variant}`;
                return (
                  <button
                    className={className}
                    key={`${combatant.id}-${condition}`}
                    onClick={() => void removeCondition(combatant.id, condition)}
                    type="button"
                  >
                    {condition} ({combatant.name} - source)
                  </button>
                );
              })
            ) : (
              <span className="fw-caption">No active conditions</span>
            )}
          </div>
        </article>

        <div className="fw-combat-panel__actions-grid">
          <button
            className="fw-btn fw-btn-blood"
            onClick={() => {
              setHpDraftMode('damage');
              setShowConditionPicker(false);
            }}
            type="button"
          >
            Damage
          </button>
          <button
            className="fw-btn fw-btn-ghost"
            onClick={() => {
              setHpDraftMode('healing');
              setShowConditionPicker(false);
            }}
            type="button"
          >
            Heal
          </button>
          <button
            className="fw-btn fw-btn-ghost"
            onClick={() => {
              setShowConditionPicker((value) => !value);
              setHpDraftMode(null);
            }}
            type="button"
          >
            Condition
          </button>
          <button className="fw-btn fw-btn-ghost" onClick={() => setShowEnemyForm((value) => !value)} type="button">
            + NPC
          </button>
        </div>

        {selectedCombatant ? (
          <article className="fw-combat-panel__conditions">
            <p className="fw-caption fw-combat-panel__steps-title">Turn Budget</p>
            <div className="fw-combat-panel__steps-list">
              {(['action', 'bonusAction', 'reaction'] as const).map((kind) => (
                <button
                  className={`fw-cond ${selectedCombatant.actionEconomy?.[kind] === false ? 'bleed' : 'buff'}`}
                  disabled={selectedCombatant.actionEconomy?.[kind] === false}
                  key={kind}
                  onClick={() => void useAction(selectedCombatant.id, kind)}
                  type="button"
                >
                  {kind === 'bonusAction' ? 'Bonus' : kind}
                </button>
              ))}
              <button className="fw-cond fw-cond--minor" onClick={() => void moveCombatant(selectedCombatant.id, 5)} type="button">
                Move +5 ft ({selectedCombatant.actionEconomy?.movementUsed ?? selectedCombatant.movementUsed ?? 0}/{selectedCombatant.speed ?? 30})
              </button>
              <button className="fw-cond fw-cond--minor" onClick={() => void rollInitiative(selectedCombatant.id)} type="button">
                Roll init
              </button>
            </div>
          </article>
        ) : null}

        {selectedCombatant && activeEncounter.combatants.length > 1 ? (
          <article className="fw-combat-panel__conditions-editor">
            <select className="fw-select" value={attackTargetId} onChange={(event) => setAttackTargetId(event.target.value)}>
              <option value="">Target</option>
              {activeEncounter.combatants
                .filter((combatant) => combatant.id !== selectedCombatant.id)
                .map((combatant) => (
                  <option key={combatant.id} value={combatant.id}>
                    {combatant.name}
                  </option>
                ))}
            </select>
            <select className="fw-select" value={attackType} onChange={(event) => setAttackType(event.target.value as typeof attackType)}>
              <option value="melee">Melee</option>
              <option value="ranged">Ranged</option>
              <option value="spell">Spell</option>
            </select>
            <select className="fw-select" value={advantageMode} onChange={(event) => setAdvantageMode(event.target.value as typeof advantageMode)}>
              <option value="normal">Normal</option>
              <option value="advantage">Adv</option>
              <option value="disadvantage">Dis</option>
            </select>
            <input className="fw-input" type="number" value={attackBonus} onChange={(event) => setAttackBonus(Number(event.target.value))} aria-label="Attack bonus" />
            <input className="fw-input" type="number" value={attackDamage} onChange={(event) => setAttackDamage(Number(event.target.value))} aria-label="Damage" />
            <select className="fw-select" value={damageType} onChange={(event) => setDamageType(event.target.value)}>
              {['slashing', 'piercing', 'bludgeoning', 'fire', 'cold', 'lightning', 'poison', 'necrotic', 'radiant', 'force', 'psychic', 'thunder', 'acid'].map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <button className="fw-btn fw-btn-gold" onClick={() => void resolveAttackFlow()} type="button">
              <Swords size={15} aria-hidden="true" />
              Attack
            </button>
          </article>
        ) : null}

        {hpDraftMode && selectedCombatant ? (
          <div className="fw-combat-panel__hp-actions">
            <input
              aria-label={`Amount for ${selectedCombatant.name}`}
              className="fw-input"
              min={0}
              onChange={(event) =>
                setAmounts((current) => ({
                  ...current,
                  [selectedCombatant.id]: Number(event.target.value),
                }))
              }
              type="number"
              value={amounts[selectedCombatant.id] ?? 0}
            />
            <button className="fw-btn fw-btn-gold" onClick={() => void applyHp(selectedCombatant.id, hpDraftMode)} type="button">
              Apply
            </button>
          </div>
        ) : null}

        {showConditionPicker && selectedCombatant ? (
          <div className="fw-combat-panel__conditions-editor">
            <select
              className="fw-select"
              value={conditionDrafts[selectedCombatant.id] ?? ''}
              onChange={(event) =>
                setConditionDrafts((current) => ({
                  ...current,
                  [selectedCombatant.id]: event.target.value,
                }))
              }
            >
              <option value="">Condition</option>
              {conditions.map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ))}
            </select>
            <button className="fw-btn fw-btn-ghost" onClick={() => void addCondition(selectedCombatant.id)} type="button">
              <Plus size={15} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {showEnemyForm ? (
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
            <button className="fw-btn fw-btn-ghost" type="submit">
              <Plus size={15} aria-hidden="true" />
              Enemy
            </button>
          </form>
        ) : null}

        <div className="fw-combat-panel__controls">
          <button className="fw-btn fw-btn--ghost" onClick={() => void moveTurn(-1)} type="button">
            <SkipBack size={16} aria-hidden="true" />
            Previous
          </button>
          <button className="fw-btn fw-btn--ghost" onClick={() => void sortInitiative()} type="button">
            <RotateCcw size={16} aria-hidden="true" />
            Initiative
          </button>
          <button className="fw-btn fw-btn--ghost" onClick={() => void rollInitiative()} type="button">
            Roll all
          </button>
          <button className="fw-btn fw-btn--danger" onClick={() => void endEncounter()} type="button">
            <XCircle size={16} aria-hidden="true" />
            End
          </button>
        </div>

        <p className="fw-caption fw-combat-panel__active">
          Active: <strong>{activeCombatant?.name ?? 'No combatants'}</strong>
        </p>

        <div className="fw-combat-panel__aux">
          <button className="fw-btn fw-btn--ghost" onClick={() => void addPlayer()} type="button">
            Add current player
          </button>
          {selectedCombatant ? (
            <div className="fw-field">
              <label className="fw-field__label">Temp HP</label>
              <input
                className="fw-input"
                min={0}
                type="number"
                value={selectedCombatant.tempHitPoints}
                onChange={(event) => void setTempHp(selectedCombatant.id, Number(event.target.value))}
              />
              {selectedCombatant.type === 'enemy' ? (
                <select
                  className="fw-select"
                  value={selectedCombatant.aiBehavior ?? 'aggressive'}
                  onChange={(event) => void setAiBehavior(selectedCombatant.id, event.target.value as 'aggressive' | 'defensive' | 'support' | 'random' | 'focused')}
                >
                  <option value="aggressive">Aggressive</option>
                  <option value="defensive">Defensive</option>
                  <option value="support">Support</option>
                  <option value="focused">Focused</option>
                  <option value="random">Random</option>
                </select>
              ) : null}
            </div>
          ) : null}
        </div>

        <button className="fw-btn fw-btn-gold fw-combat-panel__next-turn" onClick={() => void moveTurn(1)} type="button">
          <SkipForward size={16} aria-hidden="true" />
          End Turn
        </button>

        {selectedCombatant && selectedCombatant.hitPoints === 0 ? (
          <div className="fw-combatant__deathsave">
            <span>Death Save</span>
            <button className="fw-btn fw-btn--ghost" onClick={() => void setDeathSave(selectedCombatant.id, 'successes', -1)} type="button">
              <Minus size={14} aria-hidden="true" />
            </button>
            <span className="fw-caption">S {selectedCombatant.deathSaves.successes}</span>
            <button className="fw-btn fw-btn--ghost" onClick={() => void setDeathSave(selectedCombatant.id, 'successes', 1)} type="button">
              <Plus size={14} aria-hidden="true" />
            </button>
            <button className="fw-btn fw-btn--ghost" onClick={() => void setDeathSave(selectedCombatant.id, 'failures', -1)} type="button">
              <Minus size={14} aria-hidden="true" />
            </button>
            <span className="fw-caption">F {selectedCombatant.deathSaves.failures}</span>
            <button className="fw-btn fw-btn--ghost" onClick={() => void setDeathSave(selectedCombatant.id, 'failures', 1)} type="button">
              <Plus size={14} aria-hidden="true" />
            </button>
            <button className="fw-btn fw-btn-gold" onClick={() => void rollDeathSaveAuto(selectedCombatant.id)} type="button">
              Roll
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
