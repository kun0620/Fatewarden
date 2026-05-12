import { Minus, Plus, RotateCcw, SkipBack, SkipForward, Swords, XCircle } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { addParticipant, advanceTurn, createCombat, endCombat, sortInitiativeOrder, startCombat } from '../engine/combat';
import type { CombatState as EngineCombatState } from '../engine/combat';
import { createEventQueueState, processEventQueue, type EventRuntimeState } from '../engine/events/eventQueue';
import type { GameEvent } from '../engine/events/types';
import { createEmptyInventory } from '../lib/inventory';
import { conditions } from '../lib/rules';
import type { Character, Combatant, EncounterState, GamePhase } from '../types';

type CombatTrackerProps = {
  character: Character;
  encounter: EncounterState | null;
  onEncounterChange: (encounter: EncounterState | null) => Promise<void> | void;
  onCombatEvent: (body: string, metadata: Record<string, unknown>) => Promise<void> | void;
  onRequestPhaseChange?: (phase: GamePhase) => void;
};

function makePlayerCombatant(character: Character): Combatant {
  return {
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
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function combatantToRuntimeCharacter(combatant: Combatant): Character {
  return {
    id: combatant.id,
    name: combatant.name,
    ancestry: '',
    className: '',
    level: 1,
    background: '',
    age: '',
    alignment: '',
    languages: [],
    proficiencies: [],
    armorClass: combatant.armorClass,
    hitPoints: combatant.hitPoints,
    maxHitPoints: combatant.maxHitPoints,
    speed: 30,
    darkvision: 0,
    inspiration: false,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    skills: [],
    inventory: createEmptyInventory(),
    features: [],
    spells: [],
    backstory: '',
    personalityTraits: [],
    portraitUrl: '',
    activeConditions: [...combatant.conditions],
    exhaustionLevel: 0,
    hitDice: 1,
    maxHitDice: 1,
    spellSlots: {},
    systemData: {},
  };
}

function applyRuntimeCharacterToCombatant(combatant: Combatant, runtimeCharacter: Character): Combatant {
  return {
    ...combatant,
    hitPoints: runtimeCharacter.hitPoints,
    maxHitPoints: runtimeCharacter.maxHitPoints,
    conditions: [...runtimeCharacter.activeConditions],
  };
}

function processCombatantEvent(encounter: EncounterState, targetId: string, event: GameEvent) {
  const target = encounter.combatants.find((combatant) => combatant.id === targetId);
  if (!target) {
    throw new Error('Target combatant not found.');
  }

  const runtimeState: EventRuntimeState = {
    charactersById: {
      [target.id]: combatantToRuntimeCharacter(target),
    },
  };
  const queue = createEventQueueState([event]);
  const processed = processEventQueue(runtimeState, queue);

  if (processed.failedEvents.length > 0) {
    throw new Error(processed.failedEvents[0].error);
  }

  const processedCharacter = processed.state.charactersById[target.id];
  if (!processedCharacter) {
    throw new Error('Event queue did not return target character.');
  }

  return {
    target,
    processedCharacter,
  };
}

function toCombatState(encounter: EncounterState, activeCharacter: Character): EngineCombatState {
  return {
    id: encounter.id,
    name: encounter.name,
    roomId: undefined,
    phase: encounter.isActive ? ('active' as const) : ('setup' as const),
    participants: encounter.combatants.map((combatant, index) => ({
      id: combatant.id,
      characterId: combatant.type === 'player' && combatant.id === `pc-${activeCharacter.id}` ? activeCharacter.id : undefined,
      name: combatant.name,
      type: combatant.type === 'enemy' ? ('monster' as const) : ('player' as const),
      initiativeScore: combatant.initiative,
      dexScore: 10,
      armorClass: combatant.armorClass,
      hitPoints: combatant.hitPoints,
      maxHitPoints: combatant.maxHitPoints,
      tempHitPoints: combatant.tempHitPoints,
      speed: 30,
      conditions: combatant.conditions,
      status: combatant.hitPoints <= 0 ? ('unconscious' as const) : ('active' as const),
      joinedOrder: index,
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
  const orderedCombatants = orderedParticipants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      type: participant.type === 'player' ? ('player' as const) : ('enemy' as const),
      armorClass: participant.armorClass,
      hitPoints: participant.hitPoints,
      maxHitPoints: participant.maxHitPoints,
      tempHitPoints: participant.tempHitPoints,
      initiative: participant.initiativeScore ?? 0,
      conditions: [...participant.conditions],
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
    isActive: combat.phase === 'active',
    combatants: orderedCombatants,
  };
}

function hpState(hp: number, maxHp: number): 'full' | 'mid' | 'low' | 'bleed' {
  if (maxHp <= 0) return 'full';
  const pct = hp / maxHp;
  if (pct > 0.6) return 'full';
  if (pct > 0.3) return 'mid';
  if (pct > 0.1) return 'low';
  return 'bleed';
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
  const runtimeCharactersById = useMemo(() => ({ [character.id]: character }), [character]);

  const activeCombatant = useMemo(() => {
    if (!encounter?.combatants.length) return null;
    return encounter.combatants[encounter.activeIndex] ?? encounter.combatants[0];
  }, [encounter]);

  function updateEncounter(updater: (current: EncounterState) => EncounterState, event?: string, metadata = {}) {
    if (!encounter) return;
    const next = updater(encounter);
    onEncounterChange(next);
    if (event) void onCombatEvent(event, { kind: 'combat_event', encounterId: next.id, ...metadata });
  }

  function endEncounter() {
    if (!encounter) return;
    const endedEncounter = toEncounterState(endCombat(toCombatState(encounter, character)));
    void onEncounterChange(null);
    void onCombatEvent(`Encounter ended: ${endedEncounter.name}`, {
      kind: 'combat_event',
      action: 'encounter_ended',
      encounterId: endedEncounter.id,
      encounter: endedEncounter,
    });
  }

  function createEncounter(event: FormEvent) {
    event.preventDefault();
    const initialCombat = createCombat(name.trim() || 'Encounter');
    const withPlayer = addParticipant(initialCombat, {
      id: `pc-${character.id}`,
      characterId: character.id,
      name: character.name,
      type: 'player',
      initiativeScore: 0,
      dexScore: 10,
      armorClass: character.armorClass,
      hitPoints: character.hitPoints,
      maxHitPoints: character.maxHitPoints,
      tempHitPoints: 0,
      speed: character.speed,
      conditions: [],
      status: 'active',
      joinedOrder: 0,
    }, runtimeCharactersById);
    const next = toEncounterState(startCombat(withPlayer, runtimeCharactersById));
    onEncounterChange(next);
    onRequestPhaseChange?.('combat');
    void onCombatEvent(`Encounter started: ${next.name}`, {
      kind: 'combat_event',
      action: 'encounter_started',
      encounter: next,
    });
  }

  function addPlayer() {
    if (!encounter) return;
    const player = makePlayerCombatant(character);
    updateEncounter((current) => {
      if (current.combatants.some((combatant) => combatant.id === player.id)) return current;
      const withPlayer = addParticipant(toCombatState(current, character), {
        id: player.id,
        characterId: character.id,
        name: player.name,
        type: 'player',
        initiativeScore: player.initiative,
        dexScore: 10,
        armorClass: player.armorClass,
        hitPoints: player.hitPoints,
        maxHitPoints: player.maxHitPoints,
        tempHitPoints: player.tempHitPoints,
        speed: character.speed,
        conditions: player.conditions,
        status: 'active',
        joinedOrder: current.combatants.length,
      }, runtimeCharactersById);
      return toEncounterState(withPlayer);
    },
      `${character.name} joined the initiative list.`,
      { action: 'combatant_added', combatant: player },
    );
  }

  function addEnemy(event: FormEvent) {
    event.preventDefault();
    if (!encounter) return;
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
    updateEncounter((current) => {
      const withEnemy = addParticipant(toCombatState(current, character), {
        id: enemy.id,
        name: enemy.name,
        type: 'monster',
        initiativeScore: enemy.initiative,
        dexScore: 10,
        armorClass: enemy.armorClass,
        hitPoints: enemy.hitPoints,
        maxHitPoints: enemy.maxHitPoints,
        tempHitPoints: enemy.tempHitPoints,
        speed: 30,
        conditions: enemy.conditions,
        status: 'active',
        joinedOrder: current.combatants.length,
      }, runtimeCharactersById);
      return toEncounterState(withEnemy);
    },
      `${enemy.name} entered combat with initiative ${enemy.initiative}.`,
      { action: 'combatant_added', combatant: enemy },
    );
  }

  function setInitiative(id: string, initiative: number) {
    updateEncounter((current) => ({
      ...current,
      combatants: current.combatants.map((combatant) =>
        combatant.id === id ? { ...combatant, initiative } : combatant,
      ),
    }));
  }

  function sortInitiative() {
    updateEncounter((current) => {
      const combat = toCombatState(current, character);
      const orderedIds = sortInitiativeOrder(combat.participants);
      const sorted = {
        ...combat,
        initiativeOrder: orderedIds,
        turn: {
          ...combat.turn,
          turnIndex: 0,
          activeParticipantId: orderedIds[0] ?? null,
        },
      };
      return toEncounterState(sorted);
    },
      'Initiative order locked.',
      { action: 'initiative_sorted' },
    );
  }

  function moveTurn(direction: 1 | -1) {
    updateEncounter((current) => {
      if (!current.combatants.length) return current;

      let nextCombat = toCombatState(current, character);
      if (direction === -1) {
        const total = Math.max(1, nextCombat.initiativeOrder.length);
        for (let index = 0; index < total - 1; index += 1) {
          nextCombat = advanceTurn(nextCombat, runtimeCharactersById);
        }
      } else {
        nextCombat = advanceTurn(nextCombat, runtimeCharactersById);
      }

      const next = toEncounterState(nextCombat);
      const active = next.combatants[next.activeIndex];
      if (active) {
        void onCombatEvent(`Turn started: ${active.name} (Round ${next.round})`, {
          kind: 'combat_event',
          action: 'turn_started',
          encounterId: current.id,
          round: next.round,
          activeCombatant: active,
        });
      }
      return next;
    });
  }

  function applyHp(id: string, direction: 'damage' | 'healing') {
    const amount = Math.max(0, amounts[id] ?? 0);
    if (!amount) return;

    updateEncounter((current) => {
      const event: GameEvent =
        direction === 'damage'
          ? {
              id: crypto.randomUUID(),
              type: 'apply_damage',
              sessionId: current.id,
              actorId: id,
              targetId: id,
              amount,
              createdAt: new Date().toISOString(),
              source: 'user',
            }
          : {
              id: crypto.randomUUID(),
              type: 'recover_hp',
              sessionId: current.id,
              actorId: id,
              targetId: id,
              amount,
              recoveryKind: 'healing',
              createdAt: new Date().toISOString(),
              source: 'user',
            };

      const { target, processedCharacter } = processCombatantEvent(current, id, event);
      const eventText =
        direction === 'damage'
          ? `${target.name} took ${amount} damage. HP ${processedCharacter.hitPoints}/${processedCharacter.maxHitPoints}.`
          : `${target.name} healed ${amount}. HP ${processedCharacter.hitPoints}/${processedCharacter.maxHitPoints}.`;

      const combatants = current.combatants.map((combatant) =>
        combatant.id === id ? applyRuntimeCharacterToCombatant(combatant, processedCharacter) : combatant,
      );

      void onCombatEvent(eventText, {
        kind: 'combat_event',
        action: direction,
        amount,
        combatant: combatants.find((combatant) => combatant.id === id),
      });

      return { ...current, combatants };
    });
  }

  function setTempHp(id: string, tempHitPoints: number) {
    updateEncounter((current) => ({
      ...current,
      combatants: current.combatants.map((combatant) =>
        combatant.id === id ? { ...combatant, tempHitPoints: Math.max(0, tempHitPoints) } : combatant,
      ),
    }));
  }

  function addCondition(id: string) {
    const condition = conditionDrafts[id];
    if (!condition) return;
    updateEncounter((current) => {
      const event: GameEvent = {
        id: crypto.randomUUID(),
        type: 'apply_condition',
        sessionId: current.id,
        actorId: id,
        targetId: id,
        condition,
        createdAt: new Date().toISOString(),
        source: 'user',
      };
      const { target, processedCharacter } = processCombatantEvent(current, id, event);
      const combatants = current.combatants.map((combatant) =>
        combatant.id === id ? applyRuntimeCharacterToCombatant(combatant, processedCharacter) : combatant,
      );
      void onCombatEvent(`${condition} added to ${target.name}.`, {
        kind: 'combat_event',
        action: 'condition_added',
        condition,
        combatantId: id,
      });
      return { ...current, combatants };
    });
  }

  function removeCondition(id: string, condition: string) {
    updateEncounter((current) => {
      const event: GameEvent = {
        id: crypto.randomUUID(),
        type: 'remove_condition',
        sessionId: current.id,
        actorId: id,
        targetId: id,
        condition,
        createdAt: new Date().toISOString(),
        source: 'user',
      };
      const { target, processedCharacter } = processCombatantEvent(current, id, event);
      const combatants = current.combatants.map((combatant) =>
        combatant.id === id ? applyRuntimeCharacterToCombatant(combatant, processedCharacter) : combatant,
      );
      void onCombatEvent(`${condition} removed from ${target.name}.`, {
        kind: 'combat_event',
        action: 'condition_removed',
        condition,
        combatantId: id,
      });
      return { ...current, combatants };
    });
  }

  function setDeathSave(id: string, key: 'successes' | 'failures', delta: number) {
    updateEncounter((current) => {
      let eventText = '';
      const combatants = current.combatants.map((combatant) => {
        if (combatant.id !== id) return combatant;
        const deathSaves = {
          ...combatant.deathSaves,
          [key]: clamp(combatant.deathSaves[key] + delta, 0, 3),
        };
        eventText = `${combatant.name} death saves: ${deathSaves.successes} success, ${deathSaves.failures} failure.`;
        return { ...combatant, deathSaves };
      });
      if (eventText) {
        void onCombatEvent(eventText, { kind: 'combat_event', action: 'death_save', combatantId: id, key, delta });
      }
      return { ...current, combatants };
    });
  }

  if (!encounter) {
    return (
      <section className="fw-panel">
        <div className="fw-panel__header">
          <div>
            <p className="fw-caption">Combat</p>
            <h2 className="fw-h2">Tracker</h2>
          </div>
          <Swords size={24} aria-hidden="true" />
        </div>
        <form onSubmit={createEncounter}>
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
    <section className="fw-panel">
      <div className="fw-panel__header">
        <div>
          <p className="fw-caption">Combat</p>
          <h2 className="fw-h2">{encounter.name}</h2>
        </div>
        <span className="fw-caption">Round {encounter.round}</span>
      </div>

      <div>
        <button className="fw-btn fw-btn--ghost" onClick={() => moveTurn(-1)} type="button">
          <SkipBack size={16} aria-hidden="true" />
          Previous
        </button>
        <button className="fw-btn fw-btn--primary" onClick={() => moveTurn(1)} type="button">
          <SkipForward size={16} aria-hidden="true" />
          Next Turn
        </button>
        <button className="fw-btn fw-btn--ghost" onClick={sortInitiative} type="button">
          <RotateCcw size={16} aria-hidden="true" />
          Sort
        </button>
        <button className="fw-btn fw-btn--danger" onClick={endEncounter} type="button">
          <XCircle size={16} aria-hidden="true" />
          End
        </button>
      </div>

      <p className="fw-caption">
        Active: <strong>{activeCombatant?.name ?? 'No combatants'}</strong>
      </p>

      <div>
        {encounter.combatants.map((combatant, index) => (
          <article
            className={index === encounter.activeIndex ? 'fw-card fw-card--elevated' : 'fw-card'}
            key={combatant.id}
          >
            <div>
              <div>
                <span className="fw-h3">{combatant.name}</span>
                <span className="fw-caption">
                  {combatant.type === 'player' ? 'Player' : 'Enemy'} · AC {combatant.armorClass}
                </span>
              </div>
              <div className="fw-field">
                <label className="fw-field__label">Init</label>
                <input
                  className="fw-input"
                  type="number"
                  value={combatant.initiative}
                  onChange={(event) => setInitiative(combatant.id, Number(event.target.value))}
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

            <div>
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
              <button className="fw-btn fw-btn--ghost" onClick={() => applyHp(combatant.id, 'damage')} type="button">
                Damage
              </button>
              <button className="fw-btn fw-btn--ghost" onClick={() => applyHp(combatant.id, 'healing')} type="button">
                Heal
              </button>
            </div>

            <div className="fw-field">
              <label className="fw-field__label">Temp HP</label>
              <input
                className="fw-input"
                min={0}
                type="number"
                value={combatant.tempHitPoints}
                onChange={(event) => setTempHp(combatant.id, Number(event.target.value))}
              />
            </div>

            <div>
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
              <button className="fw-btn fw-btn--ghost" onClick={() => addCondition(combatant.id)} type="button">
                <Plus size={15} aria-hidden="true" />
              </button>
            </div>

            {combatant.conditions.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                {combatant.conditions.map((condition) => (
                  <button
                    className="fw-cond fw-cond--minor"
                    key={condition}
                    onClick={() => removeCondition(combatant.id, condition)}
                    type="button"
                  >
                    <span className="fw-cond__dot" />
                    {condition}
                  </button>
                ))}
              </div>
            ) : null}

            {combatant.hitPoints === 0 ? (
              <div>
                <span>Death saves</span>
                <button className="fw-btn fw-btn--ghost" onClick={() => setDeathSave(combatant.id, 'successes', -1)} type="button">
                  <Minus size={14} aria-hidden="true" />
                </button>
                <span className="fw-caption">S {combatant.deathSaves.successes}</span>
                <button className="fw-btn fw-btn--ghost" onClick={() => setDeathSave(combatant.id, 'successes', 1)} type="button">
                  <Plus size={14} aria-hidden="true" />
                </button>
                <button className="fw-btn fw-btn--ghost" onClick={() => setDeathSave(combatant.id, 'failures', -1)} type="button">
                  <Minus size={14} aria-hidden="true" />
                </button>
                <span className="fw-caption">F {combatant.deathSaves.failures}</span>
                <button className="fw-btn fw-btn--ghost" onClick={() => setDeathSave(combatant.id, 'failures', 1)} type="button">
                  <Plus size={14} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <form onSubmit={addEnemy}>
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

      <button className="fw-btn fw-btn--ghost" onClick={addPlayer} type="button">
        Add current player
      </button>
    </section>
  );
}
