import { Eye, Flame, Plus, Skull } from 'lucide-react';
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

const abilities = Object.keys(abilityLabels) as AbilityKey[];
const skills = Object.keys(skillAbilityMap);
const quickDice = [4, 6, 8, 10, 12, 20, 100];

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

function isD20Roll(roll: DiceRoll) {
  return roll.notation.toLowerCase().includes('d20');
}

function getKind(roll: DiceRoll): 'crit' | 'success' | 'fumble' | 'failure' {
  const nat = roll.keptRoll ?? roll.rolls[0] ?? 0;
  if (isD20Roll(roll) && nat === 20) return 'crit';
  if (isD20Roll(roll) && nat === 1) return 'fumble';
  if (roll.total >= 15) return 'success';
  return 'failure';
}

export function DiceRoller({ character, onRoll }: DiceRollerProps) {
  const [rollType, setRollType] = useState<RollType>('skill');
  const [mode, setMode] = useState<RollMode>('normal');
  const [sides, setSides] = useState(20);
  const [count, setCount] = useState(1);
  const [freeModifier, setFreeModifier] = useState(0);
  const [selectedSkill, setSelectedSkill] = useState('Perception');
  const [selectedAbility, setSelectedAbility] = useState<AbilityKey>('dex');
  const [lastRoll, setLastRoll] = useState<DiceRoll | null>(null);
  const [rollHistory, setRollHistory] = useState<DiceRoll[]>([]);
  const [rolling, setRolling] = useState(false);
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

  const performRoll = async (override?: {
    count: number;
    sides: number;
    modifier: number;
    label: string;
    type: RollType;
    ability?: AbilityKey;
    skill?: string;
  }) => {
    const target = override ?? {
      count: rollConfig.count,
      sides: rollConfig.sides,
      modifier: rollConfig.modifier,
      label: rollConfig.label,
      type: rollType,
      ability: rollConfig.ability,
      skill: rollConfig.skill,
    };
    const nextNotation = buildNotation(target.count, target.sides, target.modifier, mode);

    setRolling(true);
    globalThis.setTimeout(() => setRolling(false), 450);

    const resolved = resolveRoll({
      count: target.count,
      sides: target.sides,
      modifier: target.modifier,
      mode,
      notation: nextNotation,
      label: target.label,
    });

    const nextRoll: DiceRoll = {
      notation: nextNotation,
      total: resolved.total,
      rolls: resolved.rolls,
      modifier: target.modifier,
      mode,
      type: target.type,
      label: target.label,
      ability: target.ability,
      skill: target.skill,
      keptRoll: resolved.keptRoll,
      droppedRolls: resolved.droppedRolls,
    };

    setLastRoll(nextRoll);
    setRollHistory((history) => [nextRoll, ...history].slice(0, 5));

    if (!onRoll) return;

    setPosting(true);
    try {
      await onRoll(nextRoll);
    } finally {
      setPosting(false);
    }
  };

  const activeKind = lastRoll ? getKind(lastRoll) : 'success';
  const kindMeta = {
    crit: { color: 'var(--gold-bright)', label: 'Critical Success', glow: 'var(--glow-gold)' },
    success: { color: 'var(--success)', label: 'Success', glow: 'var(--glow-arcane)' },
    fumble: { color: 'var(--blood-bright)', label: 'Critical Failure', glow: 'var(--glow-blood)' },
    failure: { color: 'var(--danger)', label: 'Failure', glow: 'var(--glow-blood)' },
  }[activeKind];

  return (
    <section className="fw-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '14px' }}>
      <div
        className="fw-card"
        style={{
          background: 'var(--surface)',
          borderColor: lastRoll ? kindMeta.color : 'var(--border-soft)',
          boxShadow: lastRoll ? kindMeta.glow : 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <p className="fw-caption">Last Roll - {lastRoll ? lastRoll.notation : notation}</p>
        <div className={`fw-display ${rolling ? 'fw-die-shake' : ''}`} style={{ fontSize: '56px', lineHeight: 1 }}>
          {lastRoll ? lastRoll.total : '--'}
          <span style={{ marginLeft: '8px', fontSize: '22px', color: 'var(--ink-300)' }}>
            {lastRoll ? formatModifier(lastRoll.modifier) : ''}
          </span>
        </div>
        <p className="fw-mono" style={{ margin: 0 }}>
          {lastRoll ? `= ${lastRoll.total}` : 'Awaiting first roll'}
        </p>
        <p className="fw-body" style={{ margin: 0, color: kindMeta.color, fontStyle: 'italic' }}>
          {lastRoll ? kindMeta.label : 'The world holds its breath...'}
        </p>
      </div>

      <div style={{ display: 'grid', gap: '10px' }}>
        <div className="fw-seg" aria-label="Roll type">
          {(Object.keys(rollTypeLabels) as RollType[]).map((type) => (
            <button
              className={`fw-seg-btn ${rollType === type ? 'active' : ''}`}
              key={type}
              onClick={() => setRollType(type)}
              type="button"
            >
              {rollTypeLabels[type]}
            </button>
          ))}
        </div>

        {rollType === 'skill' ? (
          <div className="fw-field">
            <label className="fw-field__label">Skill</label>
            <select className="fw-select" value={selectedSkill} onChange={(event) => setSelectedSkill(event.target.value)}>
              {skills.map((skill) => (
                <option key={skill} value={skill}>
                  {skill} ({abilityLabels[skillAbilityMap[skill]]} {formatModifier(skillModifier(character, skill))})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {rollType === 'save' ? (
          <div className="fw-field">
            <label className="fw-field__label">Ability</label>
            <select
              className="fw-select"
              value={selectedAbility}
              onChange={(event) => setSelectedAbility(event.target.value as AbilityKey)}
            >
              {abilities.map((ability) => (
                <option key={ability} value={ability}>
                  {abilityLabels[ability]} {formatModifier(savingThrowModifier(character, ability))}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <section className="fw-card" style={{ background: 'var(--surface-2)', display: 'grid', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <p className="fw-caption" style={{ margin: 0 }}>Quick Dice</p>
          <div className="fw-seg" aria-label="Roll mode">
            {(Object.keys(modeLabels) as RollMode[]).map((nextMode) => (
              <button
                className={`fw-seg-btn ${mode === nextMode ? 'active' : ''}`}
                key={nextMode}
                onClick={() => setMode(nextMode)}
                type="button"
              >
                {modeLabels[nextMode]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' }}>
          {quickDice.map((die) => (
            <button
              className={`fw-btn ${die === 20 ? 'fw-btn-arcane' : 'fw-btn-ghost'}`}
              key={die}
              onClick={() => {
                setRollType('free');
                setSides(die);
              }}
              style={{
                justifyContent: 'center',
                borderColor: sides === die ? 'var(--arcane-bright)' : undefined,
                boxShadow: sides === die && die === 20 ? 'var(--glow-arcane)' : undefined,
              }}
              type="button"
            >
              d{die}
            </button>
          ))}
        </div>

        {rollType === 'free' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <label className="fw-field">
              <span className="fw-caption">Dice Count</span>
              <div className="fw-seg">
                <button className="fw-seg-btn" onClick={() => setCount(Math.max(1, count - 1))} type="button">-</button>
                <button className="fw-seg-btn active" type="button">{count}</button>
                <button className="fw-seg-btn" onClick={() => setCount(Math.min(10, count + 1))} type="button">+</button>
              </div>
            </label>
            <label className="fw-field">
              <span className="fw-caption">Modifier</span>
              <div className="fw-seg">
                <button className="fw-seg-btn" onClick={() => setFreeModifier(freeModifier - 1)} type="button">-</button>
                <button className="fw-seg-btn active" type="button">{formatModifier(freeModifier)}</button>
                <button className="fw-seg-btn" onClick={() => setFreeModifier(freeModifier + 1)} type="button">+</button>
              </div>
            </label>
          </div>
        ) : (
          <p className="fw-mono" style={{ margin: 0, color: 'var(--ink-300)' }}>
            {rollConfig.label} {formatModifier(rollConfig.modifier)}
          </p>
        )}
      </section>

      <section className="fw-card" style={{ background: 'var(--surface)' }}>
        <p className="fw-caption" style={{ marginTop: 0 }}>Saved Rolls</p>
        <div style={{ display: 'grid', gap: '8px' }}>
          <button
            className="fw-btn fw-btn-ghost"
            onClick={() => {
              setRollType('free');
              void performRoll({ count: 2, sides: 10, modifier: 4, label: 'Eldritch Blast', type: 'free' });
            }}
            style={{ justifyContent: 'space-between' }}
            type="button"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><Flame size={14} aria-hidden="true" />Eldritch Blast</span>
            <span className="fw-mono">2d10+4</span>
          </button>
          <button
            className="fw-btn fw-btn-ghost"
            onClick={() => {
              setRollType('free');
              void performRoll({ count: 1, sides: 20, modifier: 0, label: 'Perception Check', type: 'free' });
            }}
            style={{ justifyContent: 'space-between' }}
            type="button"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><Eye size={14} aria-hidden="true" />Perception Check</span>
            <span className="fw-mono">1d20</span>
          </button>
          <button
            className="fw-btn fw-btn-ghost"
            onClick={() => {
              setRollType('free');
              void performRoll({ count: 1, sides: 20, modifier: 0, label: 'Death Save', type: 'free' });
            }}
            style={{ justifyContent: 'space-between' }}
            type="button"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><Skull size={14} aria-hidden="true" />Death Save</span>
            <span className="fw-mono">1d20</span>
          </button>
          <button
            className="fw-btn fw-btn-ghost"
            onClick={() => {
              setRollType('free');
              setSides(20);
              setCount(1);
            }}
            style={{ justifyContent: 'space-between' }}
            type="button"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><Plus size={14} aria-hidden="true" />Custom Roll</span>
            <span className="fw-mono">Open free mode</span>
          </button>
        </div>
      </section>

      <button className="fw-btn fw-btn-gold fw-btn-lg" disabled={posting} onClick={() => void performRoll()} type="button">
        {posting ? 'Posting...' : `Roll ${notation}`}
      </button>

      <section className="fw-card" style={{ background: 'var(--surface-2)' }}>
        <p className="fw-caption" style={{ marginTop: 0 }}>Recent Rolls</p>
        <div style={{ display: 'grid', gap: '6px' }}>
          {rollHistory.length > 0 ? (
            rollHistory.map((entry, index) => {
              const kind = getKind(entry);
              const symbol = kind === 'crit' ? '*' : kind === 'fumble' ? 'x' : '-';
              return (
                <p className="fw-mono" key={`${entry.notation}-${entry.total}-${index}`} style={{ margin: 0, fontSize: '11px', color: 'var(--ink-300)' }}>
                  You - {entry.label} {entry.total} {symbol}
                </p>
              );
            })
          ) : (
            <p className="fw-mono" style={{ margin: 0, fontSize: '11px', color: 'var(--ink-400)' }}>
              No recent rolls
            </p>
          )}
        </div>
      </section>
    </section>
  );
}
