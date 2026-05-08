import { Save, X } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { abilityLabels, abilityModifier, formatModifier, proficiencyBonus } from '../lib/rules';
import type { AbilityKey, Character } from '../types';

const shortAbilityLabels: Record<AbilityKey, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

type CharacterSheetViewProps = {
  character: Character;
  disabled?: boolean;
  onClose: () => void;
  onSave?: (character: Character) => Promise<void>;
  status?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function listToText(items: string[]) {
  return items.join('\n');
}

function textToList(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function CharacterSheetView({
  character,
  disabled = false,
  onClose,
  onSave,
  status,
}: CharacterSheetViewProps) {
  const [draft, setDraft] = useState(character);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(character);
  }, [character]);

  function updateField<K extends keyof Character>(key: K, value: Character[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateNumber(
    key: 'level' | 'armorClass' | 'hitPoints' | 'maxHitPoints' | 'speed' | 'darkvision',
    min: number,
    max: number,
  ) {
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
      languages: draft.languages.map((language) => language.trim()).filter(Boolean),
      proficiencies: draft.proficiencies.map((item) => item.trim()).filter(Boolean),
      equipment: draft.equipment.map((item) => item.trim()).filter(Boolean),
      features: draft.features.map((item) => item.trim()).filter(Boolean),
      spells: draft.spells.map((item) => item.trim()).filter(Boolean),
      personalityTraits: draft.personalityTraits.map((item) => item.trim()).filter(Boolean),
    });
    setSaving(false);
  }

  return (
    <div className="sheet-overlay" role="dialog" aria-modal="true" aria-label={`${draft.name} character sheet`}>
      <form className="sheet-folio" onSubmit={submit}>
        <div className="sheet-command">
          <div>
            <p className="eyebrow">Character Codex</p>
            <h2>{draft.name || 'Unnamed Wanderer'}</h2>
          </div>
          <div className="sheet-command-actions">
            {status ? <span>{status}</span> : null}
            <button className="secondary-button" disabled={disabled || saving || !onSave} type="submit">
              <Save size={17} aria-hidden="true" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button aria-label="Close character sheet" className="icon-button" onClick={onClose} type="button">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="sheet-grid">
          <section className="sheet-left">
            <div className="sheet-portrait-frame">
              {draft.portraitUrl ? (
                <img alt={`${draft.name} portrait`} src={draft.portraitUrl} />
              ) : (
                <div className="sheet-portrait-placeholder">
                  <span>{draft.name.slice(0, 1) || '?'}</span>
                  <small>Portrait URL</small>
                </div>
              )}
            </div>

            <label className="sheet-field">
              Portrait URL
              <input
                disabled={disabled || saving}
                onChange={(event) => updateField('portraitUrl', event.target.value)}
                placeholder="https://..."
                value={draft.portraitUrl}
              />
            </label>

            <section className="sheet-card">
              <p className="sheet-card-title">Weapon / Equipment</p>
              <textarea
                disabled={disabled || saving}
                onChange={(event) => updateField('equipment', textToList(event.target.value))}
                rows={6}
                value={listToText(draft.equipment)}
              />
            </section>

            <section className="sheet-card">
              <p className="sheet-card-title">Class Features</p>
              <textarea
                disabled={disabled || saving}
                onChange={(event) => updateField('features', textToList(event.target.value))}
                rows={6}
                value={listToText(draft.features)}
              />
            </section>
          </section>

          <section className="sheet-right">
            <section className="sheet-card identity-card">
              <div className="sheet-title-row">
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
              </div>
              <div className="sheet-form-grid">
                <label>
                  Race
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
                <label>
                  Background
                  <input
                    disabled={disabled || saving}
                    onChange={(event) => updateField('background', event.target.value)}
                    value={draft.background}
                  />
                </label>
                <label>
                  Age
                  <input
                    disabled={disabled || saving}
                    onChange={(event) => updateField('age', event.target.value)}
                    value={draft.age}
                  />
                </label>
                <label>
                  Alignment
                  <input
                    disabled={disabled || saving}
                    onChange={(event) => updateField('alignment', event.target.value)}
                    value={draft.alignment}
                  />
                </label>
                <label>
                  Languages
                  <input
                    disabled={disabled || saving}
                    onChange={(event) => updateField('languages', textToList(event.target.value))}
                    value={draft.languages.join(', ')}
                  />
                </label>
              </div>
            </section>

            <section className="sheet-card">
              <p className="sheet-card-title">Ability Scores</p>
              <div className="sheet-ability-grid">
                {Object.entries(draft.abilities).map(([key, score]) => {
                  const abilityKey = key as AbilityKey;
                  return (
                    <label className="sheet-ability" key={key}>
                      <span>{shortAbilityLabels[abilityKey]}</span>
                      <strong>{formatModifier(abilityModifier(score))}</strong>
                      <input
                        aria-label={abilityLabels[abilityKey]}
                        disabled={disabled || saving}
                        max={30}
                        min={1}
                        onChange={updateAbility(abilityKey)}
                        type="number"
                        value={score}
                      />
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="sheet-vitals">
              <label>
                HP
                <div className="sheet-pair">
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
              </label>
              <label>
                AC
                <input
                  disabled={disabled || saving}
                  max={30}
                  min={1}
                  onChange={updateNumber('armorClass', 1, 30)}
                  type="number"
                  value={draft.armorClass}
                />
              </label>
              <label>
                Speed
                <input
                  disabled={disabled || saving}
                  max={200}
                  min={0}
                  onChange={updateNumber('speed', 0, 200)}
                  type="number"
                  value={draft.speed}
                />
              </label>
              <label>
                Darkvision
                <input
                  disabled={disabled || saving}
                  max={300}
                  min={0}
                  onChange={updateNumber('darkvision', 0, 300)}
                  type="number"
                  value={draft.darkvision}
                />
              </label>
              <div className="sheet-static">
                <span>Proficiency</span>
                <strong>{formatModifier(proficiencyBonus(draft.level))}</strong>
              </div>
              <label className="sheet-check">
                <input
                  checked={draft.inspiration}
                  disabled={disabled || saving}
                  onChange={(event) => updateField('inspiration', event.target.checked)}
                  type="checkbox"
                />
                Inspiration
              </label>
            </section>

            <section className="sheet-notes-grid">
              <label className="sheet-card">
                <p className="sheet-card-title">Skills</p>
                <textarea
                  disabled={disabled || saving}
                  onChange={(event) => updateField('skills', textToList(event.target.value))}
                  rows={5}
                  value={listToText(draft.skills)}
                />
              </label>
              <label className="sheet-card">
                <p className="sheet-card-title">Proficiencies</p>
                <textarea
                  disabled={disabled || saving}
                  onChange={(event) => updateField('proficiencies', textToList(event.target.value))}
                  rows={5}
                  value={listToText(draft.proficiencies)}
                />
              </label>
              <label className="sheet-card">
                <p className="sheet-card-title">Ritual / Spells</p>
                <textarea
                  disabled={disabled || saving}
                  onChange={(event) => updateField('spells', textToList(event.target.value))}
                  rows={5}
                  value={listToText(draft.spells)}
                />
              </label>
              <label className="sheet-card">
                <p className="sheet-card-title">Personality Traits</p>
                <textarea
                  disabled={disabled || saving}
                  onChange={(event) => updateField('personalityTraits', textToList(event.target.value))}
                  rows={5}
                  value={listToText(draft.personalityTraits)}
                />
              </label>
            </section>

            <label className="sheet-card sheet-backstory">
              <p className="sheet-card-title">Backstory</p>
              <textarea
                disabled={disabled || saving}
                onChange={(event) => updateField('backstory', event.target.value)}
                rows={7}
                value={draft.backstory}
              />
            </label>
          </section>
        </div>
      </form>
    </div>
  );
}
