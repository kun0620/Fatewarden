import { Save, X } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { inventoryFromNames, inventoryToNames } from '../lib/inventory';
import { recalculateCharacter } from '../lib/characterDerived';
import { abilityLabels, abilityModifier, formatModifier, proficiencyBonus } from '../lib/rules';
import { Tooltip } from './ui/Tooltip';
import type { AbilityKey, Character, CharacterPersonality } from '../types';

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

const abilityKeySet = new Set<AbilityKey>(['str', 'dex', 'con', 'int', 'wis', 'cha']);

function toAbilityKeys(values: string[] | undefined): AbilityKey[] | undefined {
  if (!values) return undefined;
  return values
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is AbilityKey => abilityKeySet.has(item as AbilityKey));
}

function mergePersonality(
  current: Character['personality'],
  patch: Partial<CharacterPersonality>,
): CharacterPersonality {
  return {
    traits: '',
    ideals: '',
    bonds: '',
    flaws: '',
    backstory: '',
    quote: '',
    ...(current ?? {}),
    ...patch,
  };
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
    await onSave(recalculateCharacter({
      ...draft,
      skills: draft.skills.map((skill) => skill.trim()).filter(Boolean),
      languages: draft.languages.map((language) => language.trim()).filter(Boolean),
      proficiencies: draft.proficiencies.map((item) => item.trim()).filter(Boolean),
      inventory: draft.inventory,
      features: draft.features.map((item) => item.trim()).filter(Boolean),
      spells: draft.spells.map((item) => item.trim()).filter(Boolean),
      spellsKnown: draft.spellsKnown?.map((item) => item.trim()).filter(Boolean),
      savingThrows: toAbilityKeys(draft.savingThrows),
      personalityTraits: draft.personalityTraits.map((item) => item.trim()).filter(Boolean),
    }));
    setSaving(false);
  }

  return (
    <div className="fw-backdrop" role="dialog" aria-modal="true" aria-label={`${draft.name} character sheet`}>
      <form
        className="fw-card fw-card--framed fw-grimoire-sheet"
        onSubmit={submit}
      >
        <header className="fw-panel__header fw-grimoire-sheet__header">
          <div className="fw-grimoire-sheet__brand">
            <p className="fw-caption">Fatewarden</p>
            <h2 className="fw-h2">{draft.name || 'Unnamed Wanderer'}</h2>
            <p className="fw-body-sm">The Grimoire of Destiny</p>
          </div>
          <div className="fw-grimoire-sheet__actions">
            {status ? <span className="fw-caption">{status}</span> : null}
            <button className="fw-btn fw-btn--ghost" disabled={disabled || saving || !onSave} type="submit">
              <Save size={17} aria-hidden="true" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button aria-label="Close character sheet" className="fw-btn fw-btn--icon" onClick={onClose} type="button">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="fw-grimoire-sheet__layout">
          <aside className="fw-grimoire-sheet__nav">
            <button className="fw-grimoire-sheet__nav-item" disabled title="Journal navigation is not wired in this sheet yet." type="button">Journal</button>
            <button className="fw-grimoire-sheet__nav-item" disabled title="Bestiary navigation is not wired in this sheet yet." type="button">Bestiary</button>
            <button className="fw-grimoire-sheet__nav-item fw-grimoire-sheet__nav-item--active" type="button">Grimoire</button>
            <button className="fw-grimoire-sheet__nav-item" disabled title="Ritual navigation is not wired in this sheet yet." type="button">Rituals</button>
            <button className="fw-grimoire-sheet__nav-item" disabled title="Vault navigation is not wired in this sheet yet." type="button">Vault</button>
          </aside>

          <div className="fw-grimoire-sheet__content">
            <section className="fw-grimoire-sheet__left">
              <div className="fw-grimoire-sheet__portrait">
                <div className="fw-grimoire-sheet__portrait-frame">
                  {draft.portraitUrl ? (
                    <img alt={`${draft.name} portrait`} src={draft.portraitUrl} className="fw-grimoire-sheet__portrait-image" />
                  ) : (
                    <div className="fw-grimoire-sheet__portrait-placeholder">
                      <span>{draft.name.slice(0, 1) || '?'}</span>
                      <p className="fw-caption">No portrait</p>
                    </div>
                  )}
                </div>
                <div className="fw-grimoire-sheet__quote">
                  <p className="fw-caption">Theme</p>
                  <p className="fw-body">"{draft.personality?.quote || 'Survive the dark, remember the oath.'}"</p>
                </div>
              </div>

              <div className="fw-card">
                <p className="fw-caption">Portrait URL</p>
                <input
                  className="fw-input"
                  disabled={disabled || saving}
                  onChange={(event) => updateField('portraitUrl', event.target.value)}
                  placeholder="https://..."
                  value={draft.portraitUrl}
                />
              </div>

              <div className="fw-card">
                <p className="fw-caption">Weapon / Equipment</p>
                <textarea
                  className="fw-input"
                  disabled={disabled || saving}
                  onChange={(event) => updateField('inventory', inventoryFromNames(textToList(event.target.value)))}
                  rows={6}
                  value={listToText(inventoryToNames(draft.inventory))}
                />
              </div>

              <div className="fw-card">
                <p className="fw-caption">Class Features</p>
                <textarea
                  className="fw-input"
                  disabled={disabled || saving}
                  onChange={(event) => updateField('features', textToList(event.target.value))}
                  rows={7}
                  value={listToText(draft.features)}
                />
              </div>
            </section>

            <section className="fw-grimoire-sheet__right">
              <section className="fw-card">
                <div className="fw-grimoire-sheet__identity-grid">
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
                    <label className="fw-field__label">Race</label>
                    <input
                      className="fw-input"
                      disabled={disabled || saving}
                      onChange={(event) => updateField('ancestry', event.target.value)}
                      value={draft.ancestry}
                    />
                  </div>
                  <div className="fw-field">
                    <label className="fw-field__label">Subrace</label>
                    <input
                      className="fw-input"
                      disabled={disabled || saving}
                      onChange={(event) => updateField('subrace', event.target.value)}
                      value={draft.subrace ?? ''}
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
                    <label className="fw-field__label">Subclass</label>
                    <input
                      className="fw-input"
                      disabled={disabled || saving}
                      onChange={(event) => updateField('subclass', event.target.value)}
                      value={draft.subclass ?? ''}
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
                <p className="fw-caption">Ability Scores</p>
                <div className="fw-grimoire-sheet__ability-grid">
                  {Object.entries(draft.abilities).map(([key, score]) => {
                    const abilityKey = key as AbilityKey;
                    return (
                      <div key={key} className="fw-grimoire-sheet__ability-cell">
                        <span className="fw-caption">{shortAbilityLabels[abilityKey]}</span>
                        <strong className="fw-h3">{score}</strong>
                        <span className="fw-body-sm">{formatModifier(abilityModifier(score))}</span>
                        <input
                          aria-label={abilityLabels[abilityKey]}
                          className="fw-input fw-input--mono"
                          disabled={disabled || saving}
                          max={30}
                          min={1}
                          onChange={updateAbility(abilityKey)}
                          type="number"
                          value={score}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="fw-grimoire-sheet__stats-row">
                <article className="fw-card">
                  <p className="fw-caption">HP</p>
                  <div className="fw-grimoire-sheet__hp-inline">
                    <input
                      aria-label="Hit points"
                      className="fw-input fw-input--mono"
                      disabled={disabled || saving}
                      max={999}
                      min={0}
                      onChange={updateNumber('hitPoints', 0, 999)}
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
                      type="number"
                      value={draft.maxHitPoints}
                    />
                  </div>
                </article>
                <article className="fw-card">
                  <p className="fw-caption">
                    <Tooltip label="Armor Class - harder to hit">AC</Tooltip>
                  </p>
                  <input
                    className="fw-input fw-input--mono"
                    disabled={disabled || saving}
                    max={30}
                    min={1}
                    onChange={updateNumber('armorClass', 1, 30)}
                    type="number"
                    value={draft.armorClass}
                  />
                </article>
                <article className="fw-card">
                  <p className="fw-caption">Speed</p>
                  <input
                    className="fw-input fw-input--mono"
                    disabled={disabled || saving}
                    max={200}
                    min={0}
                    onChange={updateNumber('speed', 0, 200)}
                    type="number"
                    value={draft.speed}
                  />
                </article>
                <article className="fw-card">
                  <p className="fw-caption">
                    <Tooltip label="Proficiency bonus by level">Proficiency</Tooltip>
                  </p>
                  <p className="fw-h3">{formatModifier(proficiencyBonus(draft.level))}</p>
                </article>
              </section>

              <section className="fw-grimoire-sheet__meta-grid">
                <div className="fw-card">
                  <p className="fw-caption">Skills</p>
                  <textarea
                    className="fw-input"
                    disabled={disabled || saving}
                    onChange={(event) => updateField('skills', textToList(event.target.value))}
                    rows={5}
                    value={listToText(draft.skills)}
                  />
                </div>
                <div className="fw-card">
                  <p className="fw-caption">Proficiencies</p>
                  <textarea
                    className="fw-input"
                    disabled={disabled || saving}
                    onChange={(event) => updateField('proficiencies', textToList(event.target.value))}
                    rows={5}
                    value={listToText(draft.proficiencies)}
                  />
                </div>
                <div className="fw-card">
                  <p className="fw-caption">Ritual / Spells</p>
                  <textarea
                    className="fw-input"
                    disabled={disabled || saving}
                    onChange={(event) => updateField('spells', textToList(event.target.value))}
                    rows={5}
                    value={listToText(draft.spells)}
                  />
                </div>
                <div className="fw-card">
                  <p className="fw-caption">Spells Known</p>
                  <textarea
                    className="fw-input"
                    disabled={disabled || saving}
                    onChange={(event) => updateField('spellsKnown', textToList(event.target.value))}
                    rows={5}
                    value={listToText(draft.spellsKnown ?? [])}
                  />
                </div>
                <div className="fw-card">
                  <p className="fw-caption">Saving Throws</p>
                  <textarea
                    className="fw-input"
                    disabled={disabled || saving}
                    onChange={(event) => updateField('savingThrows', toAbilityKeys(textToList(event.target.value)) ?? [])}
                    rows={5}
                    value={listToText(draft.savingThrows ?? [])}
                  />
                </div>
                <div className="fw-card">
                  <p className="fw-caption">Personality Traits</p>
                  <textarea
                    className="fw-input"
                    disabled={disabled || saving}
                    onChange={(event) => updateField('personalityTraits', textToList(event.target.value))}
                    rows={5}
                    value={listToText(draft.personalityTraits)}
                  />
                </div>
              </section>

              <section className="fw-grimoire-sheet__meta-grid">
                <div className="fw-card">
                  <p className="fw-caption">Ideals</p>
                  <textarea
                    className="fw-input"
                    disabled={disabled || saving}
                    onChange={(event) => updateField('personality', mergePersonality(draft.personality, { ideals: event.target.value }))}
                    rows={4}
                    value={draft.personality?.ideals ?? ''}
                  />
                </div>
                <div className="fw-card">
                  <p className="fw-caption">Bonds</p>
                  <textarea
                    className="fw-input"
                    disabled={disabled || saving}
                    onChange={(event) => updateField('personality', mergePersonality(draft.personality, { bonds: event.target.value }))}
                    rows={4}
                    value={draft.personality?.bonds ?? ''}
                  />
                </div>
                <div className="fw-card">
                  <p className="fw-caption">Flaws</p>
                  <textarea
                    className="fw-input"
                    disabled={disabled || saving}
                    onChange={(event) => updateField('personality', mergePersonality(draft.personality, { flaws: event.target.value }))}
                    rows={4}
                    value={draft.personality?.flaws ?? ''}
                  />
                </div>
                <div className="fw-card">
                  <p className="fw-caption">Quote</p>
                  <textarea
                    className="fw-input"
                    disabled={disabled || saving}
                    onChange={(event) => updateField('personality', mergePersonality(draft.personality, { quote: event.target.value }))}
                    rows={4}
                    value={draft.personality?.quote ?? ''}
                  />
                </div>
              </section>

              <section className="fw-card">
                <p className="fw-caption">Backstory</p>
                <textarea
                  className="fw-input"
                  disabled={disabled || saving}
                  onChange={(event) => updateField('backstory', event.target.value)}
                  rows={7}
                  value={draft.backstory}
                />
              </section>

              <section className="fw-card">
                <div className="fw-grimoire-sheet__misc-grid">
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
                  <label className="fw-grimoire-sheet__inspiration">
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
            </section>
          </div>
        </div>
      </form>
    </div>
  );
}
