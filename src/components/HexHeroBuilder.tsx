import { Boxes, Compass, Save } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  calculateHexHeroStats,
  hexAbilityKeys,
  hexAbilityLabels,
  hexSkillKeys,
  hexSkillLabels,
  hexStatKeys,
  hexStatLabels,
  hexVitalKeys,
  hexVitalLabels,
  normalizeHexHeroBuild,
} from '../lib/hexplore';
import type { Character, HexAbilityKey, HexHeroBuild, HexSkillKey, HexStatKey, HexVitalKey } from '../types';

type HexHeroBuilderProps = {
  character: Character;
  disabled?: boolean;
  onSave?: (character: Character) => Promise<void>;
  status?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function numberValue(event: ChangeEvent<HTMLInputElement>, min: number, max: number) {
  return clamp(event.target.valueAsNumber, min, max);
}

export function HexHeroBuilder({ character, disabled = false, onSave, status }: HexHeroBuilderProps) {
  const [heroName, setHeroName] = useState(character.name);
  const [draft, setDraft] = useState<HexHeroBuild>(() => normalizeHexHeroBuild(character.systemData.hexplore));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHeroName(character.name);
    setDraft(normalizeHexHeroBuild(character.systemData.hexplore));
  }, [character]);

  const finalStats = useMemo(() => calculateHexHeroStats(draft), [draft]);
  const validation = useMemo(() => {
    const issues: string[] = [];
    if (!heroName.trim()) issues.push('Hero name is required.');
    if (!draft.role.name.trim()) issues.push('Role name is required.');
    if (!draft.race.name.trim()) issues.push('Race name is required.');
    if (finalStats.vitals.health <= 0) issues.push('Health must be above 0.');
    if (finalStats.vitals.energy <= 0) issues.push('Energy must be above 0.');
    return issues;
  }, [draft, finalStats, heroName]);

  function updateRole<K extends keyof HexHeroBuild['role']>(key: K, value: HexHeroBuild['role'][K]) {
    setDraft((current) => ({
      ...current,
      role: {
        ...current.role,
        [key]: value,
      },
    }));
  }

  function updateRace<K extends keyof HexHeroBuild['race']>(key: K, value: HexHeroBuild['race'][K]) {
    setDraft((current) => ({
      ...current,
      race: {
        ...current.race,
        [key]: value,
      },
    }));
  }

  function updateAbility(key: HexAbilityKey, value: Partial<HexHeroBuild['role']['abilities'][HexAbilityKey]>) {
    setDraft((current) => ({
      ...current,
      role: {
        ...current.role,
        abilities: {
          ...current.role.abilities,
          [key]: {
            ...current.role.abilities[key],
            ...value,
          },
        },
      },
    }));
  }

  function updateSkill(key: HexSkillKey, value: number) {
    setDraft((current) => ({
      ...current,
      role: {
        ...current.role,
        skills: {
          ...current.role.skills,
          [key]: value,
        },
      },
    }));
  }

  function updateVital(key: HexVitalKey, value: number) {
    setDraft((current) => ({
      ...current,
      role: {
        ...current.role,
        vitals: {
          ...current.role.vitals,
          [key]: value,
        },
      },
    }));
  }

  function updateModifier(key: HexStatKey, value: number) {
    updateRace('modifiers', {
      ...draft.race.modifiers,
      [key]: value,
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!onSave || validation.length) return;

    setSaving(true);
    await onSave({
      ...character,
      name: heroName.trim(),
      ancestry: draft.race.name.trim(),
      className: draft.role.name.trim(),
      hitPoints: finalStats.vitals.health,
      maxHitPoints: finalStats.vitals.health,
      skills: hexSkillKeys.map((key) => `${hexSkillLabels[key]} ${finalStats.skills[key]}`),
      systemData: {
        ...character.systemData,
        hexplore: draft,
      },
    });
    setSaving(false);
  }

  return (
    <form className="panel hex-hero-panel" onSubmit={submit}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">HEXplore</p>
          <h2>{heroName || 'Hero Build'}</h2>
        </div>
        <span className="level-pill">
          <Compass size={14} aria-hidden="true" />
          Hero
        </span>
      </div>

      <div className="hex-builder-grid">
        <section className="hex-builder-section">
          <div className="hex-section-title">
            <Boxes size={16} aria-hidden="true" />
            Identity
          </div>
          <label>
            Hero name
            <input
              disabled={disabled || saving}
              onChange={(event) => setHeroName(event.target.value)}
              value={heroName}
            />
          </label>
          <div className="hex-two-col">
            <label>
              Role
              <input
                disabled={disabled || saving}
                onChange={(event) => updateRole('name', event.target.value)}
                placeholder="Custom role"
                value={draft.role.name}
              />
            </label>
            <label>
              Race
              <input
                disabled={disabled || saving}
                onChange={(event) => updateRace('name', event.target.value)}
                placeholder="Custom race"
                value={draft.race.name}
              />
            </label>
          </div>
          <div className="hex-two-col">
            <label>
              Role category
              <input
                disabled={disabled || saving}
                onChange={(event) => updateRole('category', event.target.value)}
                placeholder="Utility, striker, healer..."
                value={draft.role.category}
              />
            </label>
            <label>
              Favored opponent
              <input
                disabled={disabled || saving}
                onChange={(event) => updateRole('favoredOpponent', event.target.value)}
                value={draft.role.favoredOpponent}
              />
            </label>
          </div>
        </section>

        <section className="hex-builder-section">
          <div className="hex-section-title">Abilities</div>
          {hexAbilityKeys.map((key) => (
            <div className="hex-ability-row" key={key}>
              <label>
                {hexAbilityLabels[key]} name
                <input
                  disabled={disabled || saving}
                  onChange={(event) => updateAbility(key, { name: event.target.value })}
                  value={draft.role.abilities[key].name}
                />
              </label>
              <label>
                Base
                <input
                  disabled={disabled || saving}
                  max={30}
                  min={0}
                  onChange={(event) => updateAbility(key, { base: numberValue(event, 0, 30) })}
                  type="number"
                  value={draft.role.abilities[key].base}
                />
              </label>
              <label>
                Energy
                <input
                  disabled={disabled || saving}
                  max={30}
                  min={0}
                  onChange={(event) => updateAbility(key, { energyCost: numberValue(event, 0, 30) })}
                  type="number"
                  value={draft.role.abilities[key].energyCost}
                />
              </label>
              <label className="hex-wide-field">
                Summary
                <textarea
                  disabled={disabled || saving}
                  onChange={(event) => updateAbility(key, { summary: event.target.value })}
                  rows={2}
                  value={draft.role.abilities[key].summary}
                />
              </label>
            </div>
          ))}
        </section>

        <section className="hex-builder-section">
          <div className="hex-section-title">Scores</div>
          <div className="hex-score-grid">
            {hexSkillKeys.map((key) => (
              <label key={key}>
                {hexSkillLabels[key]}
                <input
                  disabled={disabled || saving}
                  max={30}
                  min={0}
                  onChange={(event) => updateSkill(key, numberValue(event, 0, 30))}
                  type="number"
                  value={draft.role.skills[key]}
                />
              </label>
            ))}
            {hexVitalKeys.map((key) => (
              <label key={key}>
                {hexVitalLabels[key]}
                <input
                  disabled={disabled || saving}
                  max={99}
                  min={0}
                  onChange={(event) => updateVital(key, numberValue(event, 0, 99))}
                  type="number"
                  value={draft.role.vitals[key]}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="hex-builder-section">
          <div className="hex-section-title">Race modifiers</div>
          <div className="hex-mod-grid">
            {hexStatKeys.map((key) => (
              <label key={key}>
                {hexStatLabels[key]}
                <input
                  disabled={disabled || saving}
                  max={30}
                  min={-30}
                  onChange={(event) => updateModifier(key, numberValue(event, -30, 30))}
                  type="number"
                  value={draft.race.modifiers[key]}
                />
              </label>
            ))}
          </div>
          <label>
            Race notes
            <textarea
              disabled={disabled || saving}
              onChange={(event) => updateRace('notes', event.target.value)}
              rows={3}
              value={draft.race.notes}
            />
          </label>
        </section>

        <section className="hex-builder-section">
          <div className="hex-section-title">Resources</div>
          <div className="hex-two-col">
            <label>
              Food rating
              <input
                disabled={disabled || saving}
                max={30}
                min={0}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, foodRating: numberValue(event, 0, 30) }))
                }
                type="number"
                value={draft.foodRating}
              />
            </label>
            <label>
              Gold
              <input
                disabled={disabled || saving}
                max={999}
                min={0}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, gold: numberValue(event, 0, 999) }))
                }
                type="number"
                value={draft.gold}
              />
            </label>
          </div>
          <label>
            Backpack notes
            <textarea
              disabled={disabled || saving}
              onChange={(event) => setDraft((current) => ({ ...current, backpackNotes: event.target.value }))}
              rows={3}
              value={draft.backpackNotes}
            />
          </label>
        </section>

        <section className="hex-preview">
          <div className="hex-section-title">Final preview</div>
          <div className="hex-final-grid">
            {hexAbilityKeys.map((key) => (
              <div key={key}>
                <span>{draft.role.abilities[key].name || hexAbilityLabels[key]}</span>
                <strong>{finalStats.abilities[key]}</strong>
                <small>
                  base {draft.role.abilities[key].base} / race {draft.race.modifiers[key] >= 0 ? '+' : ''}
                  {draft.race.modifiers[key]}
                </small>
              </div>
            ))}
            {hexSkillKeys.map((key) => (
              <div key={key}>
                <span>{hexSkillLabels[key]}</span>
                <strong>{finalStats.skills[key]}</strong>
                <small>
                  base {draft.role.skills[key]} / race {draft.race.modifiers[key] >= 0 ? '+' : ''}
                  {draft.race.modifiers[key]}
                </small>
              </div>
            ))}
            {hexVitalKeys.map((key) => (
              <div key={key}>
                <span>{hexVitalLabels[key]}</span>
                <strong>{finalStats.vitals[key]}</strong>
                <small>
                  base {draft.role.vitals[key]} / race {draft.race.modifiers[key] >= 0 ? '+' : ''}
                  {draft.race.modifiers[key]}
                </small>
              </div>
            ))}
          </div>
          <p className={validation.length ? 'hex-validation warning' : 'hex-validation'}>
            {validation.length ? validation.join(' ') : 'Ready to save. Full official catalog can plug into this shape later.'}
          </p>
        </section>
      </div>

      <div className="character-actions">
        {status ? <p className="form-message">{status}</p> : null}
        <button className="secondary-button" disabled={disabled || saving || !onSave || Boolean(validation.length)} type="submit">
          <Save size={17} aria-hidden="true" />
          {saving ? 'Saving...' : 'Save Hero'}
        </button>
      </div>
    </form>
  );
}
