import { Save, X } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { inventoryFromNames, inventoryToNames } from '../lib/inventory';
import { abilityLabels, abilityModifier, formatModifier, proficiencyBonus } from '../lib/rules';
import { Tooltip } from './ui/Tooltip';
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
      inventory: inventoryFromNames(inventoryToNames(draft.inventory).map((item) => item.trim()).filter(Boolean)),
      features: draft.features.map((item) => item.trim()).filter(Boolean),
      spells: draft.spells.map((item) => item.trim()).filter(Boolean),
      personalityTraits: draft.personalityTraits.map((item) => item.trim()).filter(Boolean),
    });
    setSaving(false);
  }

  return (
    <div className="fw-backdrop" role="dialog" aria-modal="true" aria-label={`${draft.name} character sheet`}>
      <form
        className="fw-card fw-card--framed"
        onSubmit={submit}
        style={{
          width: 'min(960px, 95vw)',
          maxHeight: '92vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-5)',
          padding: 'var(--sp-6)',
        }}
      >
        <div className="fw-panel__header" style={{ position: 'sticky', top: 0, background: 'var(--bg-raised)', zIndex: 1, margin: 'calc(var(--sp-6) * -1)', padding: 'var(--sp-4) var(--sp-6)', marginBottom: 0 }}>
          <div>
            <p className="fw-caption">Character Codex</p>
            <h2 className="fw-h2">{draft.name || 'Unnamed Wanderer'}</h2>
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}>
            {status ? <span className="fw-caption">{status}</span> : null}
            <button className="fw-btn fw-btn--ghost" disabled={disabled || saving || !onSave} type="submit">
              <Save size={17} aria-hidden="true" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button aria-label="Close character sheet" className="fw-btn fw-btn--icon" onClick={onClose} type="button">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 'var(--sp-6)' }}>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div style={{ aspectRatio: '1', background: 'var(--bg-deep)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {draft.portraitUrl ? (
                <img alt={`${draft.name} portrait`} src={draft.portraitUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '3rem', color: 'var(--ink-300)', fontFamily: 'var(--font-serif)' }}>{draft.name.slice(0, 1) || '?'}</span>
                  <p className="fw-caption" style={{ marginTop: 'var(--sp-2)' }}>Portrait URL</p>
                </div>
              )}
            </div>

            <div className="fw-field">
              <label className="fw-field__label">Portrait URL</label>
              <input
                className="fw-input"
                disabled={disabled || saving}
                onChange={(event) => updateField('portraitUrl', event.target.value)}
                placeholder="https://..."
                value={draft.portraitUrl}
              />
            </div>

            <section className="fw-card">
              <p className="fw-caption" style={{ marginBottom: 'var(--sp-2)' }}>Weapon / Equipment</p>
              <textarea
                className="fw-input"
                disabled={disabled || saving}
                onChange={(event) => updateField('inventory', inventoryFromNames(textToList(event.target.value)))}
                rows={6}
                value={listToText(inventoryToNames(draft.inventory))}
              />
            </section>

            <section className="fw-card">
              <p className="fw-caption" style={{ marginBottom: 'var(--sp-2)' }}>Class Features</p>
              <textarea
                className="fw-input"
                disabled={disabled || saving}
                onChange={(event) => updateField('features', textToList(event.target.value))}
                rows={6}
                value={listToText(draft.features)}
              />
            </section>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <section className="fw-card">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
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
                    style={{ width: '5rem' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
                <div className="fw-field">
                  <label className="fw-field__label">Race</label>
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
                <div className="fw-field">
                  <label className="fw-field__label">Background</label>
                  <input
                    className="fw-input"
                    disabled={disabled || saving}
                    onChange={(event) => updateField('background', event.target.value)}
                    value={draft.background}
                  />
                </div>
                <div className="fw-field">
                  <label className="fw-field__label">Age</label>
                  <input
                    className="fw-input"
                    disabled={disabled || saving}
                    onChange={(event) => updateField('age', event.target.value)}
                    value={draft.age}
                  />
                </div>
                <div className="fw-field">
                  <label className="fw-field__label">Alignment</label>
                  <input
                    className="fw-input"
                    disabled={disabled || saving}
                    onChange={(event) => updateField('alignment', event.target.value)}
                    value={draft.alignment}
                  />
                </div>
                <div className="fw-field">
                  <label className="fw-field__label">Languages</label>
                  <input
                    className="fw-input"
                    disabled={disabled || saving}
                    onChange={(event) => updateField('languages', textToList(event.target.value))}
                    value={draft.languages.join(', ')}
                  />
                </div>
              </div>
            </section>

            <section className="fw-card">
              <p className="fw-caption" style={{ marginBottom: 'var(--sp-3)' }}>Ability Scores</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--sp-2)' }}>
                {Object.entries(draft.abilities).map(([key, score]) => {
                  const abilityKey = key as AbilityKey;
                  return (
                    <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-1)', textAlign: 'center' }}>
                      <span className="fw-caption">{shortAbilityLabels[abilityKey]}</span>
                      <strong className="fw-body-sm">{formatModifier(abilityModifier(score))}</strong>
                      <input
                        aria-label={abilityLabels[abilityKey]}
                        className="fw-input fw-input--mono"
                        disabled={disabled || saving}
                        max={30}
                        min={1}
                        onChange={updateAbility(abilityKey)}
                        style={{ textAlign: 'center', padding: 'var(--sp-2)' }}
                        type="number"
                        value={score}
                      />
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="fw-card">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--sp-3)' }}>
                <div className="fw-field">
                  <label className="fw-field__label">HP</label>
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
                <div className="fw-field">
                  <label className="fw-field__label">
                    <Tooltip label="Armor Class — ค่าที่คนตียากให้ถึง">AC</Tooltip>
                  </label>
                  <input
                    className="fw-input fw-input--mono"
                    disabled={disabled || saving}
                    max={30}
                    min={1}
                    onChange={updateNumber('armorClass', 1, 30)}
                    type="number"
                    value={draft.armorClass}
                  />
                </div>
                <div className="fw-field">
                  <label className="fw-field__label">Speed</label>
                  <input
                    className="fw-input fw-input--mono"
                    disabled={disabled || saving}
                    max={200}
                    min={0}
                    onChange={updateNumber('speed', 0, 200)}
                    type="number"
                    value={draft.speed}
                  />
                </div>
                <div className="fw-field">
                  <label className="fw-field__label">Darkvision</label>
                  <input
                    className="fw-input fw-input--mono"
                    disabled={disabled || saving}
                    max={300}
                    min={0}
                    onChange={updateNumber('darkvision', 0, 300)}
                    type="number"
                    value={draft.darkvision}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
                  <span className="fw-caption">
                    <Tooltip label="ความชำนาญ — เพิ่มโบนัสตามเลเวล">Proficiency</Tooltip>
                  </span>
                  <strong className="fw-body-sm">{formatModifier(proficiencyBonus(draft.level))}</strong>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', cursor: 'pointer' }}>
                  <input
                    checked={draft.inspiration}
                    disabled={disabled || saving}
                    onChange={(event) => updateField('inspiration', event.target.checked)}
                    type="checkbox"
                  />
                  <span className="fw-body-sm">Inspiration</span>
                </label>
              </div>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
              <div className="fw-card">
                <p className="fw-caption" style={{ marginBottom: 'var(--sp-2)' }}>Skills</p>
                <textarea
                  className="fw-input"
                  disabled={disabled || saving}
                  onChange={(event) => updateField('skills', textToList(event.target.value))}
                  rows={5}
                  value={listToText(draft.skills)}
                />
              </div>
              <div className="fw-card">
                <p className="fw-caption" style={{ marginBottom: 'var(--sp-2)' }}>Proficiencies</p>
                <textarea
                  className="fw-input"
                  disabled={disabled || saving}
                  onChange={(event) => updateField('proficiencies', textToList(event.target.value))}
                  rows={5}
                  value={listToText(draft.proficiencies)}
                />
              </div>
              <div className="fw-card">
                <p className="fw-caption" style={{ marginBottom: 'var(--sp-2)' }}>Ritual / Spells</p>
                <textarea
                  className="fw-input"
                  disabled={disabled || saving}
                  onChange={(event) => updateField('spells', textToList(event.target.value))}
                  rows={5}
                  value={listToText(draft.spells)}
                />
              </div>
              <div className="fw-card">
                <p className="fw-caption" style={{ marginBottom: 'var(--sp-2)' }}>Personality Traits</p>
                <textarea
                  className="fw-input"
                  disabled={disabled || saving}
                  onChange={(event) => updateField('personalityTraits', textToList(event.target.value))}
                  rows={5}
                  value={listToText(draft.personalityTraits)}
                />
              </div>
            </div>

            <div className="fw-card">
              <p className="fw-caption" style={{ marginBottom: 'var(--sp-2)' }}>Backstory</p>
              <textarea
                className="fw-input"
                disabled={disabled || saving}
                onChange={(event) => updateField('backstory', event.target.value)}
                rows={7}
                value={draft.backstory}
              />
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}
