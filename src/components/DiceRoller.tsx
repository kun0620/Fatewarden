import { Dices, Minus, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  abilityLabels,
  buildNotation,
  formatModifier,
  initiativeModifier,
  resolveRoll,
  savingThrowModifier,
  skillAbilityMap,
  skillModifier,
} from '../lib/rules';
import type { AbilityKey, Character, DiceRoll, RollMode, RollType } from '../types';

const dice = [4, 6, 8, 10, 12, 20, 100];
const abilities = Object.keys(abilityLabels) as AbilityKey[];
const skills = Object.keys(skillAbilityMap);

type DiceRollerProps = {
  character: Character;
  onRoll?: (roll: DiceRoll) => Promise<void> | void;
};

const rollTypeLabels: Record<RollType, string> = {
  free: 'Free',
  skill: 'Skill',
  save: 'Save',
  initiative: 'Initiative',
};

const modeLabels: Record<RollMode, string> = {
  normal: 'Normal',
  advantage: 'Adv',
  disadvantage: 'Dis',
};

export function DiceRoller({ character, onRoll }: DiceRollerProps) {
  const [rollType, setRollType] = useState<RollType>('skill');
  const [mode, setMode] = useState<RollMode>('normal');
  const [sides, setSides] = useState(20);
  const [count, setCount] = useState(1);
  const [freeModifier, setFreeModifier] = useState(0);
  const [selectedSkill, setSelectedSkill] = useState('Perception');
  const [selectedAbility, setSelectedAbility] = useState<AbilityKey>('dex');
  const [lastRoll, setLastRoll] = useState<DiceRoll | null>(null);
  const [posting, setPosting] = useState(false);

  const rollConfig = useMemo(() => {
    if (rollType === 'skill') {
      const ability = skillAbilityMap[selectedSkill] ?? 'wis';
      return {
        count: 1,
        sides: 20,
        modifier: skillModifier(character, selectedSkill),
        ability,
        skill: selectedSkill,
        label: `${selectedSkill} check`,
      };
    }

    if (rollType === 'save') {
      return {
        count: 1,
        sides: 20,
        modifier: savingThrowModifier(character, selectedAbility),
        ability: selectedAbility,
        label: `${abilityLabels[selectedAbility]} saving throw`,
      };
    }

    if (rollType === 'initiative') {
      return {
        count: 1,
        sides: 20,
        modifier: initiativeModifier(character),
        ability: 'dex' as AbilityKey,
        label: 'Initiative',
      };
    }

    return {
      count,
      sides,
      modifier: freeModifier,
      ability: undefined,
      label: 'Free roll',
    };
  }, [character, count, freeModifier, rollType, selectedAbility, selectedSkill, sides]);

  const notation = useMemo(
    () => buildNotation(rollConfig.count, rollConfig.sides, rollConfig.modifier, mode),
    [mode, rollConfig.count, rollConfig.modifier, rollConfig.sides],
  );

  async function roll() {
    const resolved = resolveRoll({
      count: rollConfig.count,
      sides: rollConfig.sides,
      modifier: rollConfig.modifier,
      mode,
      notation,
      label: rollConfig.label,
    });
    const nextRoll: DiceRoll = {
      notation,
      total: resolved.total,
      rolls: resolved.rolls,
      modifier: rollConfig.modifier,
      mode,
      type: rollType,
      label: rollConfig.label,
      ability: rollConfig.ability,
      skill: rollConfig.skill,
      keptRoll: resolved.keptRoll,
      droppedRolls: resolved.droppedRolls,
    };
    setLastRoll(nextRoll);

    if (!onRoll) return;

    setPosting(true);
    await onRoll(nextRoll);
    setPosting(false);
  }

  const isFreeRoll = rollType === 'free';

  return (
    <section className="panel dice-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Dice</p>
          <h2>Roll Check</h2>
        </div>
        <Dices size={24} aria-hidden="true" />
      </div>

      <div className="segmented-control" aria-label="Roll type">
        {(Object.keys(rollTypeLabels) as RollType[]).map((type) => (
          <button
            className={rollType === type ? 'active' : ''}
            key={type}
            onClick={() => setRollType(type)}
            type="button"
          >
            {rollTypeLabels[type]}
          </button>
        ))}
      </div>

      <div className="segmented-control compact" aria-label="Roll mode">
        {(Object.keys(modeLabels) as RollMode[]).map((nextMode) => (
          <button
            className={mode === nextMode ? 'active' : ''}
            key={nextMode}
            onClick={() => setMode(nextMode)}
            type="button"
          >
            {modeLabels[nextMode]}
          </button>
        ))}
      </div>

      {rollType === 'skill' ? (
        <label className="select-label">
          Skill
          <select value={selectedSkill} onChange={(event) => setSelectedSkill(event.target.value)}>
            {skills.map((skill) => (
              <option key={skill} value={skill}>
                {skill} ({abilityLabels[skillAbilityMap[skill]]} {formatModifier(skillModifier(character, skill))})
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {rollType === 'save' ? (
        <label className="select-label">
          Ability
          <select
            value={selectedAbility}
            onChange={(event) => setSelectedAbility(event.target.value as AbilityKey)}
          >
            {abilities.map((ability) => (
              <option key={ability} value={ability}>
                {abilityLabels[ability]} {formatModifier(savingThrowModifier(character, ability))}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {isFreeRoll ? (
        <>
          <div className="dice-options" aria-label="Dice type">
            {dice.map((die) => (
              <button
                className={sides === die ? 'active' : ''}
                key={die}
                onClick={() => setSides(die)}
                type="button"
              >
                d{die}
              </button>
            ))}
          </div>

          <div className="stepper-row">
            <label>
              Dice
              <span className="stepper">
                <button onClick={() => setCount(Math.max(1, count - 1))} type="button">
                  <Minus size={16} aria-hidden="true" />
                </button>
                <strong>{count}</strong>
                <button onClick={() => setCount(Math.min(10, count + 1))} type="button">
                  <Plus size={16} aria-hidden="true" />
                </button>
              </span>
            </label>
            <label>
              Mod
              <span className="stepper">
                <button onClick={() => setFreeModifier(freeModifier - 1)} type="button">
                  <Minus size={16} aria-hidden="true" />
                </button>
                <strong>{formatModifier(freeModifier)}</strong>
                <button onClick={() => setFreeModifier(freeModifier + 1)} type="button">
                  <Plus size={16} aria-hidden="true" />
                </button>
              </span>
            </label>
          </div>
        </>
      ) : (
        <div className="roll-summary">
          <span>{rollConfig.label}</span>
          <strong>{formatModifier(rollConfig.modifier)}</strong>
        </div>
      )}

      <button className="roll-button" disabled={posting} onClick={roll} type="button">
        {posting ? 'Posting...' : `Roll ${notation}`}
      </button>

      <div className="roll-result" aria-live="polite">
        {lastRoll ? (
          <>
            <span>{lastRoll.label}</span>
            <strong>{lastRoll.total}</strong>
            <small>
              {lastRoll.keptRoll ? `kept ${lastRoll.keptRoll} from ` : ''}
              {lastRoll.rolls.join(', ')}
            </small>
          </>
        ) : (
          <>
            <span>Ready</span>
            <strong>d20</strong>
            <small>Choose a check and roll</small>
          </>
        )}
      </div>
    </section>
  );
}
