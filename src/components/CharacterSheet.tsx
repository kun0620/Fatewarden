import { Maximize2, Save, Shield, Sparkles } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useGameData } from '../hooks/useGameData';
import { canLevelUp } from '../lib/characterProgression';
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
  onSave?: (character: Character) => Promise<void>;
  status?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

export function CharacterSheet({ character, disabled = false, onOpenFullSheet, onSave, status }: CharacterSheetProps) {
  const { character: storeCharacter, dispatch, eventMeta, setActiveCharacter } = useGameData();
  const selectedCharacter = character ?? storeCharacter;
  const [draft, setDraft] = useState<Character | null>(selectedCharacter);
  const [saving, setSaving] = useState(false);
  const [levelUpOpen, setLevelUpOpen] = useState(false);

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
  const passivePerception =
    10 +
    Math.floor((currentDraft.abilities.wis - 10) / 2) +
    (currentDraft.skills.some((skill) => skill.toLowerCase() === 'perception') ? proficiencyBonus(currentDraft.level) : 0);

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
        </div>
      </div>

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

      <InventoryPanel
        character={draft}
        disabled={disabled || saving}
        onUpdateCharacter={(updatedCharacter) => setDraft(updatedCharacter)}
      />

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
