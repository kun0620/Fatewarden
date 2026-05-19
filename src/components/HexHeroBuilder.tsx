import { ChevronLeft, ChevronRight, Compass, Save, Shield, Sparkles, Sword } from 'lucide-react';
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

type BuilderStep = 'identity' | 'class' | 'scores' | 'background' | 'review';

const STEP_ORDER: BuilderStep[] = ['identity', 'class', 'scores', 'background', 'review'];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function numberValue(event: ChangeEvent<HTMLInputElement>, min: number, max: number) {
  return clamp(event.target.valueAsNumber, min, max);
}

function stepIndex(step: BuilderStep) {
  return STEP_ORDER.indexOf(step);
}

export function HexHeroBuilder({ character, disabled = false, onSave, status }: HexHeroBuilderProps) {
  const [heroName, setHeroName] = useState(character.name);
  const [draft, setDraft] = useState<HexHeroBuild>(() => normalizeHexHeroBuild(character.systemData.hexplore));
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<BuilderStep>('identity');

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
    setDraft((current) => ({ ...current, role: { ...current.role, [key]: value } }));
  }

  function updateRace<K extends keyof HexHeroBuild['race']>(key: K, value: HexHeroBuild['race'][K]) {
    setDraft((current) => ({ ...current, race: { ...current.race, [key]: value } }));
  }

  function updateAbility(key: HexAbilityKey, value: Partial<HexHeroBuild['role']['abilities'][HexAbilityKey]>) {
    setDraft((current) => ({
      ...current,
      role: {
        ...current.role,
        abilities: {
          ...current.role.abilities,
          [key]: { ...current.role.abilities[key], ...value },
        },
      },
    }));
  }

  function updateSkill(key: HexSkillKey, value: number) {
    setDraft((current) => ({ ...current, role: { ...current.role, skills: { ...current.role.skills, [key]: value } } }));
  }

  function updateVital(key: HexVitalKey, value: number) {
    setDraft((current) => ({ ...current, role: { ...current.role, vitals: { ...current.role.vitals, [key]: value } } }));
  }

  function updateModifier(key: HexStatKey, value: number) {
    updateRace('modifiers', { ...draft.race.modifiers, [key]: value });
  }

  function goNext() {
    const index = stepIndex(step);
    if (index < STEP_ORDER.length - 1) setStep(STEP_ORDER[index + 1]);
  }

  function goBack() {
    const index = stepIndex(step);
    if (index > 0) setStep(STEP_ORDER[index - 1]);
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
      systemData: { ...character.systemData, hexplore: draft },
    });
    setSaving(false);
  }

  return (
    <form className="fw-panel hex-hero-panel" onSubmit={submit}>
      <div className="fw-panel__header">
        <div>
          <p className="fw-caption">HEXplore</p>
          <h2 className="fw-h2">{heroName || 'Hero Build'}</h2>
        </div>
        <span className="level-pill">
          <Compass aria-hidden="true" size={14} />
          Hero
        </span>
      </div>

      <div className="hex-wizard">
        <div className="hex-wizard__steps" aria-label="Progress">
          {STEP_ORDER.map((item, index) => {
            const active = item === step;
            const done = index < stepIndex(step);
            return (
              <button className={`hex-step ${active ? 'is-active' : ''} ${done ? 'is-done' : ''}`} key={item} onClick={() => setStep(item)} type="button">
                <span className="hex-step__dot">{done ? '◆' : '◇'}</span>
                <span className="hex-step__label">{item}</span>
              </button>
            );
          })}
        </div>

        {step === 'identity' ? (
          <section className="hex-step-card fw-card--framed">
            <h3 className="fw-h2">Name & Ancestry</h3>
            <p className="fw-body">Bind the hero name and lineage before the pact takes shape.</p>
            <div className="hex-two-col">
              <div className="fw-field">
                <label className="fw-field__label">Hero name</label>
                <input className="fw-input" disabled={disabled || saving} onChange={(event) => setHeroName(event.target.value)} value={heroName} />
              </div>
              <div className="fw-field">
                <label className="fw-field__label">Race</label>
                <input className="fw-input" disabled={disabled || saving} onChange={(event) => updateRace('name', event.target.value)} value={draft.race.name} />
              </div>
            </div>
            <div className="hex-two-col">
              <div className="fw-field">
                <label className="fw-field__label">Role category</label>
                <input className="fw-input" disabled={disabled || saving} onChange={(event) => updateRole('category', event.target.value)} value={draft.role.category} />
              </div>
              <div className="fw-field">
                <label className="fw-field__label">Favored opponent</label>
                <input className="fw-input" disabled={disabled || saving} onChange={(event) => updateRole('favoredOpponent', event.target.value)} value={draft.role.favoredOpponent} />
              </div>
            </div>
          </section>
        ) : null}

        {step === 'class' ? (
          <section className="hex-step-card fw-card--framed">
            <h3 className="fw-h2">Class Selection</h3>
            <p className="fw-body">Choose an archetype, then refine role details for this hero.</p>
            <div className="hex-class-grid">
              {[
                { key: 'Warden', icon: Shield, desc: 'Defensive frontline with oath-bound resilience.' },
                { key: 'Blademind', icon: Sword, desc: 'Aggressive striker focused on burst damage.' },
                { key: 'Arcanist', icon: Sparkles, desc: 'Control and utility through arcane channels.' },
              ].map((preset) => (
                <button
                  className={`hex-class-card ${draft.role.name === preset.key ? 'is-active' : ''}`}
                  key={preset.key}
                  onClick={() => updateRole('name', preset.key)}
                  type="button"
                >
                  <preset.icon aria-hidden="true" size={20} />
                  <strong>{preset.key}</strong>
                  <span>{preset.desc}</span>
                </button>
              ))}
            </div>
            <div className="fw-field">
              <label className="fw-field__label">Role (custom)</label>
              <input className="fw-input" disabled={disabled || saving} onChange={(event) => updateRole('name', event.target.value)} value={draft.role.name} />
            </div>
          </section>
        ) : null}

        {step === 'scores' ? (
          <section className="hex-step-card fw-card--framed">
            <h3 className="fw-h2">Ability Scores</h3>
            <p className="fw-body">Tune base stats and resource pools before final modifiers are sealed.</p>
            <div className="hex-ability-grid">
              {hexSkillKeys.map((key) => (
                <div className="hex-score-box" key={key}>
                  <span className="fw-caption">{hexSkillLabels[key]}</span>
                  <strong className="fw-mono">{finalStats.skills[key]}</strong>
                  <small className="fw-mono">
                    {draft.role.skills[key]} {draft.race.modifiers[key] >= 0 ? '+' : ''}
                    {draft.race.modifiers[key]}
                  </small>
                  <input className="fw-input fw-input--mono" disabled={disabled || saving} max={30} min={0} onChange={(event) => updateSkill(key, numberValue(event, 0, 30))} type="number" value={draft.role.skills[key]} />
                </div>
              ))}
            </div>
            <div className="hex-two-col">
              {hexVitalKeys.map((key) => (
                <div className="fw-field" key={key}>
                  <label className="fw-field__label">{hexVitalLabels[key]}</label>
                  <input className="fw-input fw-input--mono" disabled={disabled || saving} max={99} min={0} onChange={(event) => updateVital(key, numberValue(event, 0, 99))} type="number" value={draft.role.vitals[key]} />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {step === 'background' ? (
          <section className="hex-step-card fw-card--framed">
            <h3 className="fw-h2">Background & Traits</h3>
            <p className="fw-body">Record lore, burden, and supplies carried into the next chapter.</p>
            <div className="hex-two-col">
              <div className="fw-field">
                <label className="fw-field__label">Race notes</label>
                <textarea className="fw-input" disabled={disabled || saving} onChange={(event) => updateRace('notes', event.target.value)} rows={4} value={draft.race.notes} />
              </div>
              <div className="fw-field">
                <label className="fw-field__label">Backpack notes</label>
                <textarea className="fw-input" disabled={disabled || saving} onChange={(event) => setDraft((current) => ({ ...current, backpackNotes: event.target.value }))} rows={4} value={draft.backpackNotes} />
              </div>
            </div>
            <div className="hex-two-col">
              <div className="fw-field">
                <label className="fw-field__label">Food rating</label>
                <input className="fw-input fw-input--mono" disabled={disabled || saving} max={30} min={0} onChange={(event) => setDraft((current) => ({ ...current, foodRating: numberValue(event, 0, 30) }))} type="number" value={draft.foodRating} />
              </div>
              <div className="fw-field">
                <label className="fw-field__label">Gold</label>
                <input className="fw-input fw-input--mono" disabled={disabled || saving} max={999} min={0} onChange={(event) => setDraft((current) => ({ ...current, gold: numberValue(event, 0, 999) }))} type="number" value={draft.gold} />
              </div>
            </div>
          </section>
        ) : null}

        {step === 'review' ? (
          <section className="hex-step-card fw-card--framed">
            <h3 className="fw-h2">Review</h3>
            <p className="fw-body">Your fate is now inscribed in the Grimoire.</p>

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
              {validation.length ? validation.join(' ') : 'Ready to save.'}
            </p>
          </section>
        ) : null}

        <div className="hex-wizard__actions">
          <button className="fw-btn fw-btn-ghost" disabled={step === 'identity'} onClick={goBack} type="button">
            <ChevronLeft aria-hidden="true" size={15} />
            Back
          </button>
          {step !== 'review' ? (
            <button className="fw-btn fw-btn-gold" onClick={goNext} type="button">
              Continue
              <ChevronRight aria-hidden="true" size={15} />
            </button>
          ) : (
            <button className="fw-btn fw-btn-gold hex-save-cta" disabled={disabled || saving || !onSave || Boolean(validation.length)} type="submit">
              <Save aria-hidden="true" size={17} />
              {saving ? 'Saving...' : 'Seal the Pact'}
            </button>
          )}
        </div>

        {status ? <p className="fw-caption">{status}</p> : null}
      </div>

      <div className="hex-hidden-fields" aria-hidden="true">
        {hexAbilityKeys.map((key) => (
          <div key={key}>
            <input className="fw-input" disabled={disabled || saving} onChange={(event) => updateAbility(key, { name: event.target.value })} type="hidden" value={draft.role.abilities[key].name} />
            <input className="fw-input" disabled={disabled || saving} onChange={(event) => updateAbility(key, { base: numberValue(event, 0, 30) })} type="hidden" value={draft.role.abilities[key].base} />
            <input className="fw-input" disabled={disabled || saving} onChange={(event) => updateAbility(key, { energyCost: numberValue(event, 0, 30) })} type="hidden" value={draft.role.abilities[key].energyCost} />
            <input className="fw-input" disabled={disabled || saving} onChange={(event) => updateAbility(key, { summary: event.target.value })} type="hidden" value={draft.role.abilities[key].summary} />
          </div>
        ))}
        {hexStatKeys.map((key) => (
          <input className="fw-input" disabled={disabled || saving} key={key} onChange={(event) => updateModifier(key, numberValue(event, -30, 30))} type="hidden" value={draft.race.modifiers[key]} />
        ))}
      </div>
    </form>
  );
}
