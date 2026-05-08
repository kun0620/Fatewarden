import { HeartPulse, Minus, Plus, RotateCcw, SkipBack, SkipForward, Swords } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { conditions } from '../lib/rules';
import type { Character, Combatant, EncounterState, GamePhase } from '../types';

type CombatTrackerProps = {
  character: Character;
  encounter: EncounterState | null;
  onEncounterChange: (encounter: EncounterState | null) => void;
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

function sortCombatants(combatants: Combatant[]) {
  return [...combatants].sort((a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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

  function createEncounter(event: FormEvent) {
    event.preventDefault();
    const next: EncounterState = {
      id: crypto.randomUUID(),
      name: name.trim() || 'Encounter',
      round: 1,
      activeIndex: 0,
      isActive: true,
      combatants: [makePlayerCombatant(character)],
    };
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
    updateEncounter(
      (current) => ({
        ...current,
        combatants: current.combatants.some((combatant) => combatant.id === player.id)
          ? current.combatants
          : [...current.combatants, player],
      }),
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
    updateEncounter(
      (current) => ({
        ...current,
        combatants: [...current.combatants, enemy],
      }),
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
    updateEncounter(
      (current) => ({
        ...current,
        activeIndex: 0,
        combatants: sortCombatants(current.combatants),
      }),
      'Initiative order locked.',
      { action: 'initiative_sorted' },
    );
  }

  function moveTurn(direction: 1 | -1) {
    updateEncounter((current) => {
      if (!current.combatants.length) return current;
      const nextIndex = current.activeIndex + direction;
      const wrappedForward = nextIndex >= current.combatants.length;
      const wrappedBackward = nextIndex < 0;
      const activeIndex = wrappedForward
        ? 0
        : wrappedBackward
          ? current.combatants.length - 1
          : nextIndex;
      const round = wrappedForward ? current.round + 1 : wrappedBackward ? Math.max(1, current.round - 1) : current.round;
      const active = current.combatants[activeIndex];
      const next = { ...current, activeIndex, round };
      void onCombatEvent(`Turn started: ${active.name} (Round ${round})`, {
        kind: 'combat_event',
        action: 'turn_started',
        encounterId: current.id,
        round,
        activeCombatant: active,
      });
      return next;
    });
  }

  function applyHp(id: string, direction: 'damage' | 'healing') {
    const amount = Math.max(0, amounts[id] ?? 0);
    if (!amount) return;

    updateEncounter((current) => {
      let eventText = '';
      let eventCombatant: Combatant | undefined;
      const combatants = current.combatants.map((combatant) => {
        if (combatant.id !== id) return combatant;

        if (direction === 'damage') {
          const tempAbsorbed = Math.min(combatant.tempHitPoints, amount);
          const remainingDamage = amount - tempAbsorbed;
          const hitPoints = clamp(combatant.hitPoints - remainingDamage, 0, combatant.maxHitPoints);
          eventCombatant = { ...combatant, tempHitPoints: combatant.tempHitPoints - tempAbsorbed, hitPoints };
          eventText = `${combatant.name} took ${amount} damage. HP ${hitPoints}/${combatant.maxHitPoints}.`;
          return eventCombatant;
        }

        const hitPoints = clamp(combatant.hitPoints + amount, 0, combatant.maxHitPoints);
        eventCombatant = { ...combatant, hitPoints };
        eventText = `${combatant.name} healed ${amount}. HP ${hitPoints}/${combatant.maxHitPoints}.`;
        return eventCombatant;
      });

      if (eventText) {
        void onCombatEvent(eventText, {
          kind: 'combat_event',
          action: direction,
          amount,
          combatant: eventCombatant,
        });
      }

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
      let targetName = '';
      return {
        ...current,
        combatants: current.combatants.map((combatant) => {
          if (combatant.id !== id) return combatant;
          targetName = combatant.name;
          return combatant.conditions.includes(condition)
            ? combatant
            : { ...combatant, conditions: [...combatant.conditions, condition] };
        }),
      };
    }, `${condition} added to ${encounter?.combatants.find((combatant) => combatant.id === id)?.name ?? 'target'}.`, {
      action: 'condition_added',
      condition,
      combatantId: id,
    });
  }

  function removeCondition(id: string, condition: string) {
    updateEncounter(
      (current) => ({
        ...current,
        combatants: current.combatants.map((combatant) =>
          combatant.id === id
            ? { ...combatant, conditions: combatant.conditions.filter((item) => item !== condition) }
            : combatant,
        ),
      }),
      `${condition} removed from ${encounter?.combatants.find((combatant) => combatant.id === id)?.name ?? 'target'}.`,
      { action: 'condition_removed', condition, combatantId: id },
    );
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
      <section className="panel combat-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Combat</p>
            <h2>Tracker</h2>
          </div>
          <Swords size={24} aria-hidden="true" />
        </div>
        <form className="stack-form" onSubmit={createEncounter}>
          <label>
            Encounter name
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <button className="primary-button" type="submit">
            <Swords size={17} aria-hidden="true" />
            Create Encounter
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="panel combat-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Combat</p>
          <h2>{encounter.name}</h2>
        </div>
        <span className="round-chip">Round {encounter.round}</span>
      </div>

      <div className="combat-toolbar">
        <button className="secondary-button" onClick={() => moveTurn(-1)} type="button">
          <SkipBack size={16} aria-hidden="true" />
          Previous
        </button>
        <button className="primary-button" onClick={() => moveTurn(1)} type="button">
          <SkipForward size={16} aria-hidden="true" />
          Next Turn
        </button>
        <button className="secondary-button" onClick={sortInitiative} type="button">
          <RotateCcw size={16} aria-hidden="true" />
          Sort
        </button>
      </div>

      <p className="active-turn">
        Active: <strong>{activeCombatant?.name ?? 'No combatants'}</strong>
      </p>

      <div className="combatants-list">
        {encounter.combatants.map((combatant, index) => (
          <article className={`combatant-card ${index === encounter.activeIndex ? 'active' : ''}`} key={combatant.id}>
            <div className="combatant-topline">
              <div>
                <strong>{combatant.name}</strong>
                <span>
                  {combatant.type === 'player' ? 'Player' : 'Enemy'} · AC {combatant.armorClass}
                </span>
              </div>
              <label>
                Init
                <input
                  type="number"
                  value={combatant.initiative}
                  onChange={(event) => setInitiative(combatant.id, Number(event.target.value))}
                />
              </label>
            </div>

            <div className="hp-row">
              <HeartPulse size={16} aria-hidden="true" />
              <span>
                HP {combatant.hitPoints}/{combatant.maxHitPoints}
                {combatant.tempHitPoints ? ` +${combatant.tempHitPoints} temp` : ''}
              </span>
            </div>

            <div className="combat-action-grid">
              <input
                aria-label={`Amount for ${combatant.name}`}
                min={0}
                type="number"
                value={amounts[combatant.id] ?? 0}
                onChange={(event) =>
                  setAmounts((current) => ({ ...current, [combatant.id]: Number(event.target.value) }))
                }
              />
              <button className="secondary-button" onClick={() => applyHp(combatant.id, 'damage')} type="button">
                Damage
              </button>
              <button className="secondary-button" onClick={() => applyHp(combatant.id, 'healing')} type="button">
                Heal
              </button>
            </div>

            <label className="temp-hp-label">
              Temp HP
              <input
                min={0}
                type="number"
                value={combatant.tempHitPoints}
                onChange={(event) => setTempHp(combatant.id, Number(event.target.value))}
              />
            </label>

            <div className="condition-row">
              <select
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
              <button className="secondary-button" onClick={() => addCondition(combatant.id)} type="button">
                <Plus size={15} aria-hidden="true" />
              </button>
            </div>

            {combatant.conditions.length ? (
              <div className="condition-pills">
                {combatant.conditions.map((condition) => (
                  <button key={condition} onClick={() => removeCondition(combatant.id, condition)} type="button">
                    {condition} x
                  </button>
                ))}
              </div>
            ) : null}

            {combatant.hitPoints === 0 ? (
              <div className="death-save-row">
                <span>Death saves</span>
                <button onClick={() => setDeathSave(combatant.id, 'successes', -1)} type="button">
                  <Minus size={14} aria-hidden="true" />
                </button>
                <strong>S {combatant.deathSaves.successes}</strong>
                <button onClick={() => setDeathSave(combatant.id, 'successes', 1)} type="button">
                  <Plus size={14} aria-hidden="true" />
                </button>
                <button onClick={() => setDeathSave(combatant.id, 'failures', -1)} type="button">
                  <Minus size={14} aria-hidden="true" />
                </button>
                <strong>F {combatant.deathSaves.failures}</strong>
                <button onClick={() => setDeathSave(combatant.id, 'failures', 1)} type="button">
                  <Plus size={14} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <form className="enemy-form" onSubmit={addEnemy}>
        <input value={enemyName} onChange={(event) => setEnemyName(event.target.value)} />
        <input type="number" value={enemyAc} onChange={(event) => setEnemyAc(Number(event.target.value))} />
        <input type="number" value={enemyHp} onChange={(event) => setEnemyHp(Number(event.target.value))} />
        <input
          type="number"
          value={enemyInitiative}
          onChange={(event) => setEnemyInitiative(Number(event.target.value))}
        />
        <button className="secondary-button" type="submit">
          <Plus size={15} aria-hidden="true" />
          Enemy
        </button>
      </form>

      <button className="text-button" onClick={addPlayer} type="button">
        Add current player
      </button>
    </section>
  );
}
