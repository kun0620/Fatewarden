import { Maximize2, Save, Shield, Sparkles } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useGameData } from '../hooks/useGameData';
import { getSpell } from '../data/spells';
import { canLevelUp } from '../lib/characterProgression';
import { calculateMaxHP, calculatePassivePerception } from '../engine/character/defenses';
import { proficiencyBonus } from '../lib/rules';
import { InventoryPanel } from './InventoryPanel';
import { LevelUpModal } from './LevelUpModal';
import { Tooltip } from './ui/Tooltip';
import type { AbilityKey, Character, LevelUpChoice } from '../types';

const abilityLabels: Record<AbilityKey, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

function modifier(score: number) {
  const value = Math.floor((score - 10) / 2);
  return value >= 0 ? `+${value}` : `${value}`;
}

type CharacterSheetProps = {
  character?: Character | null;
  disabled?: boolean;
  onOpenFullSheet?: () => void;
  onEndConcentration?: () => void;
  onSave?: (character: Character) => Promise<void>;
  status?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

export function CharacterSheet({
  character,
  disabled = false,
  onOpenFullSheet,
  onEndConcentration,
  onSave,
  status,
}: CharacterSheetProps) {
  const { character: storeCharacter, dispatch, eventMeta, setActiveCharacter, combatState } = useGameData();
  const selectedCharacter = character ?? storeCharacter;
  const [draft, setDraft] = useState<Character | null>(selectedCharacter);
  const [saving, setSaving] = useState(false);
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [shortRestDice, setShortRestDice] = useState(1);

  useEffect(() => {
    setDraft(selectedCharacter);
  }, [selectedCharacter]);

  if (!draft) {
    return (
      <section className="fw-panel">
        <div className="fw-panel__header">
          <div>
            <p className="fw-caption">Character</p>
            <h2 className="fw-h2">No character selected</h2>
          </div>
        </div>
        <p className="fw-caption">Choose or create a character before editing the sheet.</p>
      </section>
    );
  }

  const currentDraft = draft;
  const initiative = Math.floor((currentDraft.abilities.dex - 10) / 2);
  const passivePerception = calculatePassivePerception(currentDraft);
  const calculatedMaxHP = calculateMaxHP(currentDraft);
  const dyingCombatant = combatState?.combatants.find(
    (c: { id: string; hitPoints: number; deathSaves: { successes: number; failures: number }; status?: string }) =>
      c.id === currentDraft.id && c.hitPoints <= 0,
  ) ?? null;
  const activeConcentration = currentDraft.systemData.activeConcentration;

  function updateField<K extends keyof Character>(key: K, value: Character[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateNumber(key: 'level' | 'armorClass' | 'hitPoints' | 'maxHitPoints', min: number, max: number) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      updateField(key, clamp(event.target.valueAsNumber, min, max));
    };
  }

  function updateAbility(key: AbilityKey) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const value = clamp(event.target.valueAsNumber, 1, 30);
      setDraft((current) =>
        current
          ? {
              ...current,
              abilities: {
                ...current.abilities,
                [key]: value,
              },
            }
          : current,
      );
    };
  }

  async function takeShortRest() {
    if (!onSave) return;
    setSaving(true);
    setActiveCharacter(currentDraft);
    const result = dispatch({
      ...eventMeta(currentDraft.id),
      type: 'SHORT_REST',
      characterId: currentDraft.id,
      hitDiceSpent: shortRestDice,
    });
    if (result.failed.length === 0 && result.character) {
      setDraft(result.character);
      await onSave(result.character);
    }
    setSaving(false);
  }

  async function takeLongRest() {
    if (!onSave) return;
    setSaving(true);
    setActiveCharacter(currentDraft);
    const result = dispatch({
      ...eventMeta(currentDraft.id),
      type: 'LONG_REST',
      characterId: currentDraft.id,
    });
    if (result.failed.length === 0 && result.character) {
      setDraft(result.character);
      await onSave(result.character);
    }
    setSaving(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!onSave) return;

    setSaving(true);
    await onSave({
      ...currentDraft,
      skills: currentDraft.skills.map((skill) => skill.trim()).filter(Boolean),
    });
    setSaving(false);
  }

  async function confirmLevelUp(updatedCharacter: Character, choices: LevelUpChoice[]) {
    setSaving(true);
    setActiveCharacter(currentDraft);
    const result = dispatch({
      ...eventMeta(currentDraft.id),
      type: 'LEVEL_UP',
      characterId: currentDraft.id,
      newLevel: updatedCharacter.level,
      choices,
    });
    const nextCharacter = result.character ?? updatedCharacter;
    setDraft(nextCharacter);
    if (onSave) await onSave(nextCharacter);
    setSaving(false);
    setLevelUpOpen(false);
  }

  async function endConcentration() {
    if (!activeConcentration) return;

    if (onEndConcentration) {
      onEndConcentration();
      setDraft((current) =>
        current
          ? {
              ...current,
              systemData: {
                ...current.systemData,
                activeConcentration: undefined,
              },
            }
          : current,
      );
      return;
    }

    setSaving(true);
    setActiveCharacter(currentDraft);
    const result = dispatch({
      ...eventMeta(currentDraft.id),
      type: 'CONCENTRATION_END',
      characterId: currentDraft.id,
      reason: 'manual',
    });
    if (result.failed.length === 0 && result.character) {
      setDraft(result.character);
      if (onSave) await onSave(result.character);
    }
    setSaving(false);
  }

  return (
    <form className="fw-panel" onSubmit={submit}>
      <div className="fw-panel__header">
        <div>
          <p className="fw-caption">Character</p>
          <h2 className="fw-h2">{draft.name}</h2>
        </div>
        <span className="fw-caption">Lv {draft.level}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
        <div className="fw-field">
          <label className="fw-field__label">Name</label>
          <input
            className="fw-input"
            disabled={disabled || saving}
            onChange={(event) => updateField('name', event.target.value)}
            value={draft.name}
          />
        </div>
        <div className="fw-field">
          <label className="fw-field__label">Level</label>
          <input
            className="fw-input fw-input--mono"
            disabled={disabled || saving}
            max={20}
            min={1}
            onChange={updateNumber('level', 1, 20)}
            type="number"
            value={draft.level}
          />
        </div>
        <div className="fw-field">
          <label className="fw-field__label">Ancestry</label>
          <input
            className="fw-input"
            disabled={disabled || saving}
            onChange={(event) => updateField('ancestry', event.target.value)}
            value={draft.ancestry}
          />
        </div>
        <div className="fw-field">
          <label className="fw-field__label">Class</label>
          <input
            className="fw-input"
            disabled={disabled || saving}
            onChange={(event) => updateField('className', event.target.value)}
            value={draft.className}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-4)' }}>
        <div className="fw-field" style={{ flex: 1 }}>
          <label className="fw-field__label">
            <Shield size={13} aria-hidden="true" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            <Tooltip label="Armor Class">AC</Tooltip>
          </label>
          <input
            aria-label="Armor class"
            className="fw-input fw-input--mono"
            disabled={disabled || saving}
            max={30}
            min={1}
            onChange={updateNumber('armorClass', 1, 30)}
            type="number"
            value={draft.armorClass}
          />
        </div>
        <div className="fw-field" style={{ flex: 2 }}>
          <label className="fw-field__label">
            <Sparkles size={13} aria-hidden="true" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            HP
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <input
              aria-label="Hit points"
              className="fw-input fw-input--mono"
              disabled={disabled || saving}
              max={999}
              min={0}
              onChange={updateNumber('hitPoints', 0, 999)}
              style={{ flex: 1 }}
              type="number"
              value={draft.hitPoints}
            />
            <span className="fw-caption">/</span>
            <input
              aria-label="Max hit points"
              className="fw-input fw-input--mono"
              disabled={disabled || saving}
              max={999}
              min={1}
              onChange={updateNumber('maxHitPoints', 1, 999)}
              style={{ flex: 1 }}
              type="number"
              value={draft.maxHitPoints}
            />
          </div>
          {calculatedMaxHP !== draft.maxHitPoints && (
            <span className="fw-caption" style={{ color: 'var(--text-3)', marginTop: 2 }}>
              calculated: {calculatedMaxHP}
            </span>
          )}
        </div>
      </div>

      {dyingCombatant && (
        <div style={{ padding: 'var(--sp-3)', border: '1px solid var(--blood)', borderRadius: 6, background: 'rgba(153,27,27,0.08)' }}>
          <p className="fw-caption" style={{ margin: '0 0 var(--sp-2)', color: 'var(--blood-bright)', fontWeight: 600 }}>
            ☠ Death Saves — {dyingCombatant.status === 'stable' ? 'Stable' : dyingCombatant.status === 'dead' ? 'Dead' : 'Dying'}
          </p>
          <div style={{ display: 'flex', gap: 'var(--sp-4)' }}>
            <div>
              <p className="fw-caption" style={{ margin: '0 0 4px', color: 'var(--success)' }}>Successes</p>
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <span key={i} style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid var(--success)', background: i < dyingCombatant.deathSaves.successes ? 'var(--success)' : 'transparent', display: 'inline-block' }} />
                ))}
              </div>
            </div>
            <div>
              <p className="fw-caption" style={{ margin: '0 0 4px', color: 'var(--blood-bright)' }}>Failures</p>
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <span key={i} style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid var(--blood)', background: i < dyingCombatant.deathSaves.failures ? 'var(--blood-bright)' : 'transparent', display: 'inline-block' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-2)' }}>
        <p className="fw-caption" style={{ margin: 0 }}>
          <span style={{ textDecoration: 'underline' }}>AC</span> {draft.armorClass}
        </p>
        <p className="fw-caption" style={{ margin: 0 }}>
          <span style={{ textDecoration: 'underline' }}>Initiative</span> {initiative >= 0 ? `+${initiative}` : initiative}
        </p>
        <p className="fw-caption" style={{ margin: 0 }}>
          <span style={{ textDecoration: 'underline' }}>Passive Perception</span> {passivePerception}
        </p>
      </div>
      <p className="fw-caption" style={{ margin: 0 }}>
        Underlined values are calculated automatically; other fields are editable.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--sp-2)' }}>
        {Object.entries(draft.abilities).map(([key, score]) => (
          <div className="fw-field" key={key} style={{ alignItems: 'center', textAlign: 'center' }}>
            <label className="fw-field__label" style={{ textAlign: 'center' }}>{abilityLabels[key as AbilityKey]}</label>
            <input
              aria-label={abilityLabels[key as AbilityKey]}
              className="fw-input fw-input--mono"
              disabled={disabled || saving}
              max={30}
              min={1}
              onChange={updateAbility(key as AbilityKey)}
              style={{ textAlign: 'center' }}
              type="number"
              value={score}
            />
            <small className="fw-caption">{modifier(score)}</small>
          </div>
        ))}
      </div>

      <div className="fw-field">
        <label className="fw-field__label">Skills</label>
        <input
          className="fw-input"
          disabled={disabled || saving}
          onChange={(event) =>
            updateField(
              'skills',
              event.target.value.split(',').map((skill) => skill.trim()),
            )
          }
          placeholder="Perception, Survival, Stealth"
          value={draft.skills.join(', ')}
        />
      </div>

      {Object.entries(draft.spellSlots ?? {}).some(([, slot]) => slot.max > 0) && (
        <div className="fw-field">
          <label className="fw-field__label">Spell Slots</label>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            {Object.entries(draft.spellSlots ?? {})
              .filter(([, slot]) => slot.max > 0)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([level, slot]) => (
                <span
                  key={level}
                  className="fw-caption"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    padding: '2px 6px',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    color: slot.used >= slot.max ? 'var(--text-4)' : 'var(--text-2)',
                  }}
                >
                  L{level} {slot.max - slot.used}/{slot.max}
                </span>
              ))}
          </div>
        </div>
      )}

      {activeConcentration && (
        <div className="fw-field">
          <span className="fw-caption">CONCENTRATING</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="fw-pill blood">
              {getSpell(activeConcentration.spellId)?.name ?? activeConcentration.spellId}
            </span>
            <button
              className="fw-btn fw-btn--ghost fw-btn--sm"
              disabled={disabled || saving}
              onClick={() => void endConcentration()}
              type="button"
            >
              End
            </button>
          </div>
        </div>
      )}

      <InventoryPanel
        character={draft}
        disabled={disabled || saving}
        onUpdateCharacter={(updatedCharacter) => setDraft(updatedCharacter)}
      />

      <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          aria-label="Hit dice to spend on short rest"
          className="fw-input fw-input--mono"
          disabled={disabled || saving || !onSave || currentDraft.hitDice <= 0}
          max={currentDraft.hitDice}
          min={1}
          onChange={(e) => setShortRestDice(Math.min(currentDraft.hitDice, Math.max(1, e.target.valueAsNumber || 1)))}
          style={{ width: 52, textAlign: 'center' }}
          type="number"
          value={shortRestDice}
        />
        <button
          className="fw-btn fw-btn--ghost"
          disabled={disabled || saving || !onSave || currentDraft.hitDice <= 0}
          onClick={() => void takeShortRest()}
          title={currentDraft.hitDice <= 0 ? 'No hit dice remaining.' : `Short rest: spend ${shortRestDice} hit die to recover HP.`}
          type="button"
        >
          Short Rest
        </button>
        <button
          className="fw-btn fw-btn--ghost"
          disabled={disabled || saving || !onSave}
          onClick={() => void takeLongRest()}
          title="Long rest: recover HP, hit dice, and spell slots."
          type="button"
        >
          Long Rest
        </button>
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center', flexWrap: 'wrap' }}>
        {status ? <p className="fw-caption" style={{ flex: 1 }}>{status}</p> : null}
        <button
          className="fw-btn fw-btn--ghost"
          disabled={disabled || saving || !onSave || !canLevelUp(draft)}
          onClick={() => setLevelUpOpen(true)}
          type="button"
        >
          Level Up
        </button>
        <button className="fw-btn fw-btn--ghost" onClick={onOpenFullSheet} type="button">
          <Maximize2 size={17} aria-hidden="true" />
          Open Sheet
        </button>
        <button className="fw-btn fw-btn--primary" disabled={disabled || saving || !onSave} type="submit">
          <Save size={17} aria-hidden="true" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <LevelUpModal
        character={draft}
        onCancel={() => setLevelUpOpen(false)}
        onConfirm={confirmLevelUp}
        open={levelUpOpen}
      />
    </form>
  );
}
