import { Maximize2, Save, Shield, Sparkles } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { canLevelUp } from '../lib/characterProgression';
import { InventoryPanel } from './InventoryPanel';
import { LevelUpModal } from './LevelUpModal';
import type { AbilityKey, Character } from '../types';

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
  character: Character;
  disabled?: boolean;
  onOpenFullSheet?: () => void;
  onSave?: (character: Character) => Promise<void>;
  status?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

export function CharacterSheet({ character, disabled = false, onOpenFullSheet, onSave, status }: CharacterSheetProps) {
  const [draft, setDraft] = useState(character);
  const [saving, setSaving] = useState(false);
  const [levelUpOpen, setLevelUpOpen] = useState(false);

  useEffect(() => {
    setDraft(character);
  }, [character]);

  function updateField<K extends keyof Character>(key: K, value: Character[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateNumber(key: 'level' | 'armorClass' | 'hitPoints' | 'maxHitPoints', min: number, max: number) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      updateField(key, clamp(event.target.valueAsNumber, min, max));
    };
  }

  function updateAbility(key: AbilityKey) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const value = clamp(event.target.valueAsNumber, 1, 30);
      setDraft((current) => ({
        ...current,
        abilities: {
          ...current.abilities,
          [key]: value,
        },
      }));
    };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!onSave) return;

    setSaving(true);
    await onSave({
      ...draft,
      skills: draft.skills.map((skill) => skill.trim()).filter(Boolean),
    });
    setSaving(false);
  }

  return (
    <form className="panel character-panel" onSubmit={submit}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Character</p>
          <h2>{draft.name}</h2>
        </div>
        <span className="level-pill">Lv {draft.level}</span>
      </div>

      <div className="character-editor-grid">
        <label>
          Name
          <input
            disabled={disabled || saving}
            onChange={(event) => updateField('name', event.target.value)}
            value={draft.name}
          />
        </label>
        <label>
          Level
          <input
            disabled={disabled || saving}
            max={20}
            min={1}
            onChange={updateNumber('level', 1, 20)}
            type="number"
            value={draft.level}
          />
        </label>
        <label>
          Ancestry
          <input
            disabled={disabled || saving}
            onChange={(event) => updateField('ancestry', event.target.value)}
            value={draft.ancestry}
          />
        </label>
        <label>
          Class
          <input
            disabled={disabled || saving}
            onChange={(event) => updateField('className', event.target.value)}
            value={draft.className}
          />
        </label>
      </div>

      <div className="vitals-grid">
        <div className="vital">
          <Shield size={18} aria-hidden="true" />
          <span>AC</span>
          <input
            aria-label="Armor class"
            disabled={disabled || saving}
            max={30}
            min={1}
            onChange={updateNumber('armorClass', 1, 30)}
            type="number"
            value={draft.armorClass}
          />
        </div>
        <div className="vital">
          <Sparkles size={18} aria-hidden="true" />
          <span>HP</span>
          <div className="hp-inputs">
            <input
              aria-label="Hit points"
              disabled={disabled || saving}
              max={999}
              min={0}
              onChange={updateNumber('hitPoints', 0, 999)}
              type="number"
              value={draft.hitPoints}
            />
            <span>/</span>
            <input
              aria-label="Max hit points"
              disabled={disabled || saving}
              max={999}
              min={1}
              onChange={updateNumber('maxHitPoints', 1, 999)}
              type="number"
              value={draft.maxHitPoints}
            />
          </div>
        </div>
      </div>

      <div className="ability-grid">
        {Object.entries(draft.abilities).map(([key, score]) => (
          <div className="ability" key={key}>
            <span>{abilityLabels[key as AbilityKey]}</span>
            <input
              aria-label={abilityLabels[key as AbilityKey]}
              disabled={disabled || saving}
              max={30}
              min={1}
              onChange={updateAbility(key as AbilityKey)}
              type="number"
              value={score}
            />
            <small>{modifier(score)}</small>
          </div>
        ))}
      </div>

      <label className="skills-editor">
        Skills
        <input
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
      </label>

      <InventoryPanel
        character={draft}
        disabled={disabled || saving}
        onUpdateCharacter={(updatedCharacter) => setDraft(updatedCharacter)}
      />

      <div className="character-actions">
        {status ? <p className="form-message">{status}</p> : null}
        <button
          className="secondary-button"
          disabled={disabled || saving || !onSave || !canLevelUp(draft)}
          onClick={() => setLevelUpOpen(true)}
          type="button"
        >
          Level Up
        </button>
        <button className="secondary-button" onClick={onOpenFullSheet} type="button">
          <Maximize2 size={17} aria-hidden="true" />
          Open Sheet
        </button>
        <button className="secondary-button" disabled={disabled || saving || !onSave} type="submit">
          <Save size={17} aria-hidden="true" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <LevelUpModal
        character={draft}
        onCancel={() => setLevelUpOpen(false)}
        onConfirm={async (updatedCharacter) => {
          setDraft(updatedCharacter);
          if (onSave) {
            setSaving(true);
            await onSave(updatedCharacter);
            setSaving(false);
          }
          setLevelUpOpen(false);
        }}
        open={levelUpOpen}
      />
    </form>
  );
}
