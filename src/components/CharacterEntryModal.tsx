import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { classes, getClassById } from '../data/classes';
import { itemTemplates } from '../data/items';
import { races, getRaceById, getSubraceById } from '../data/races';
import type { RaceDefinition, SubraceDefinition } from '../data/races';
import {
  attachVaultCharacterToSession,
  listVaultCharacters,
  saveVaultCharacter,
} from '../lib/characters';
import { calcProficiencyBonus } from '../lib/characterDerived';
import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  BACKGROUND_PRESETS,
  POINT_BUY_BUDGET,
  STANDARD_ARRAY,
  applyRacialBonuses,
  clampAbility,
  finalizeCharacter,
  formatModifier,
  getClassStartingEquipment,
  inventoryFromEquipmentNames,
  isPointBuyValid,
  makeCharacterDraft,
  pointBuySpent,
  abilityModifier,
} from '../lib/characterBuilder';
import type { AbilityMethod } from '../lib/characterBuilder';
import type { AbilityKey, Character, GameSession, VaultCharacter } from '../types';
import { Icon } from './ui/Icons';

type CharacterEntryModalProps = {
  session: GameSession;
  user: User;
  onCancel: () => void;
  onEnter: (session: GameSession, character: Character) => void;
};

type View = 'select' | 'edit';
type Step = 'race' | 'class' | 'abilities' | 'background' | 'equipment' | 'review';

const STEPS: Array<{ id: Step; label: string; icon: string; desc: string }> = [
  { id: 'race', label: 'Race', icon: 'user', desc: 'Lineage and blood' },
  { id: 'class', label: 'Class', icon: 'sword', desc: 'Calling and craft' },
  { id: 'abilities', label: 'Abilities', icon: 'dice', desc: 'Strength of the dice' },
  { id: 'background', label: 'Background', icon: 'scroll', desc: 'Where you come from' },
  { id: 'equipment', label: 'Equipment', icon: 'bag', desc: 'What you carry' },
  { id: 'review', label: 'Review', icon: 'eye', desc: 'Bind the pact' },
];

const ALIGNMENTS = [
  'Lawful Good',
  'Neutral Good',
  'Chaotic Good',
  'Lawful Neutral',
  'True Neutral',
  'Chaotic Neutral',
  'Lawful Evil',
  'Neutral Evil',
  'Chaotic Evil',
];

const itemPickerOptions = Object.values(itemTemplates).slice(0, 36);

function shortAbility(key: AbilityKey) {
  return key.toUpperCase();
}

function safeId() {
  return crypto.randomUUID();
}

function stepIndex(step: Step) {
  return STEPS.findIndex((item) => item.id === step);
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getSelectionDarkvision(race?: RaceDefinition, subrace?: SubraceDefinition) {
  const base = race?.darkvision ?? 0;
  const superiorDarkvision =
    subrace?.traits.some((trait) => trait.name.toLowerCase().includes('superior darkvision')) ?? false;
  return superiorDarkvision ? Math.max(base, 120) : base;
}

export function CharacterEntryModal({ session, user, onCancel, onEnter }: CharacterEntryModalProps) {
  const [characters, setCharacters] = useState<VaultCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<VaultCharacter | null>(null);
  const [draft, setDraft] = useState<Character>(() => makeCharacterDraft());
  const [view, setView] = useState<View>('select');
  const [step, setStep] = useState<Step>('race');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [abilityMethod, setAbilityMethod] = useState<AbilityMethod>('standard-array');
  const [baseAbilities, setBaseAbilities] = useState<Partial<Record<AbilityKey, number>>>({
    str: 15,
    dex: 14,
    con: 13,
    int: 12,
    wis: 10,
    cha: 8,
  });
  const [standardAssignment, setStandardAssignment] = useState<Record<AbilityKey, number | ''>>({
    str: 15,
    dex: 14,
    con: 13,
    int: 12,
    wis: 10,
    cha: 8,
  });
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [customItem, setCustomItem] = useState('');
  const [vaultSearch, setVaultSearch] = useState('');

  const raceId = draft.systemData.creation?.raceId ?? races[0].id;
  const selectedRace = getRaceById(raceId) ?? races[0];
  const subraceId = draft.systemData.creation?.subraceId;
  const selectedSubrace = subraceId ? getSubraceById(selectedRace.id, subraceId) : selectedRace.subraces?.[0];
  const classId = draft.systemData.creation?.classId ?? classes[0].id;
  const selectedClass = getClassById(classId) ?? classes[0];
  const finalAbilities = useMemo(
    () => applyRacialBonuses(baseAbilities, selectedRace, selectedSubrace),
    [baseAbilities, selectedRace, selectedSubrace],
  );
  const pointBuyTotal = pointBuySpent(baseAbilities);
  const stepPosition = stepIndex(step);
  const hasUsableDraft = Boolean(draft.name.trim() && draft.ancestry.trim() && draft.className.trim());
  const filteredCharacters = useMemo(() => {
    const query = vaultSearch.trim().toLowerCase();
    if (!query) return characters;
    return characters.filter((character) =>
      [character.name, character.ancestry, character.subrace, character.className, character.background]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [characters, vaultSearch]);

  useEffect(() => {
    let alive = true;
    setMessage('Loading character vault...');
    listVaultCharacters(user)
      .then((rows) => {
        if (!alive) return;
        setCharacters(rows);
        setSelectedCharacter(rows[0] ?? null);
        setMessage(rows.length ? 'Choose a saved character or create a new one.' : 'No vault characters yet. Build your first hero.');
      })
      .catch((error: Error) => {
        if (alive) setMessage(error.message);
      });
    return () => {
      alive = false;
    };
  }, [user]);

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      ancestry: selectedRace.name,
      race: selectedRace.name,
      subrace: selectedSubrace?.name ?? '',
      abilities: finalAbilities,
      languages: unique([...selectedRace.languages, ...current.languages]),
      speed: selectedRace.speed,
      darkvision: getSelectionDarkvision(selectedRace, selectedSubrace),
      systemData: {
        ...current.systemData,
        creation: {
          ...current.systemData.creation,
          abilityMethod,
          baseAbilities,
          raceId: selectedRace.id,
          subraceId: selectedSubrace?.id,
        },
      },
    }));
  }, [abilityMethod, baseAbilities, finalAbilities, selectedRace, selectedSubrace]);

  function syncClass(nextClassId: string) {
    const classData = getClassById(nextClassId) ?? classes[0];
    const equipment = getClassStartingEquipment(classData);
    setSelectedEquipment(equipment);
    setDraft((current) =>
      finalizeCharacter({
        ...current,
        className: classData.name,
        skills: classData.skillChoices.slice(0, classData.skillChoiceCount),
        inventory: inventoryFromEquipmentNames(equipment, current.abilities.str),
        systemData: {
          ...current.systemData,
          creation: {
            ...current.systemData.creation,
            classId: classData.id,
            skillChoices: classData.skillChoices.slice(0, classData.skillChoiceCount),
            equipmentMode: 'class',
            selectedEquipment: equipment,
          },
        },
      }),
    );
  }

  function startNewCharacter() {
    const next = makeCharacterDraft();
    const classData = getClassById(next.systemData.creation?.classId ?? classes[0].id) ?? classes[0];
    setDraft(next);
    setBaseAbilities(next.systemData.creation?.baseAbilities ?? next.abilities);
    setSelectedEquipment(getClassStartingEquipment(classData));
    setAbilityMethod('standard-array');
    setStandardAssignment({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 });
    setStep('race');
    setView('edit');
    setMessage('');
  }

  function editFromVault(character: VaultCharacter) {
    const creationBase = character.systemData.creation?.baseAbilities ?? character.abilities;
    setSelectedCharacter(character);
    setDraft(character);
    setBaseAbilities(creationBase);
    setAbilityMethod(character.systemData.creation?.abilityMethod ?? 'manual');
    setSelectedEquipment(character.systemData.creation?.selectedEquipment ?? getClassStartingEquipment(selectedClass));
    setStep('race');
    setView('edit');
  }

  function updateDraft<K extends keyof Character>(key: K, value: Character[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateBaseAbility(key: AbilityKey, value: number) {
    setBaseAbilities((current) => ({ ...current, [key]: clampAbility(value, abilityMethod === 'point-buy' ? 8 : 1, abilityMethod === 'point-buy' ? 15 : 30) }));
  }

  function assignStandardAbility(key: AbilityKey, value: number | '') {
    setStandardAssignment((current) => {
      const next = { ...current, [key]: value };
      setBaseAbilities(
        ABILITY_KEYS.reduce((acc, ability) => {
          acc[ability] = typeof next[ability] === 'number' ? next[ability] : 10;
          return acc;
        }, {} as Partial<Record<AbilityKey, number>>),
      );
      return next;
    });
  }

  function toggleSkill(skill: string) {
    setDraft((current) => {
      const chosen = current.skills.includes(skill)
        ? current.skills.filter((item) => item !== skill)
        : [...current.skills, skill].slice(0, selectedClass.skillChoiceCount);
      return {
        ...current,
        skills: chosen,
        systemData: {
          ...current.systemData,
          creation: {
            ...current.systemData.creation,
            skillChoices: chosen,
          },
        },
      };
    });
  }

  function toggleEquipment(name: string) {
    setSelectedEquipment((current) => {
      const next = current.includes(name) ? current.filter((item) => item !== name) : [...current, name];
      setDraft((draftCurrent) => ({
        ...draftCurrent,
        inventory: inventoryFromEquipmentNames(next, draftCurrent.abilities.str),
        systemData: {
          ...draftCurrent.systemData,
          creation: {
            ...draftCurrent.systemData.creation,
            equipmentMode: 'class',
            selectedEquipment: next,
          },
        },
      }));
      return next;
    });
  }

  function addCustomItem() {
    const template = itemTemplates[customItem];
    if (!template) return;
    toggleEquipment(template.name);
    setCustomItem('');
  }

  function applyBackgroundPreset(presetId: string) {
    const preset = BACKGROUND_PRESETS.find((item) => item.id === presetId) ?? BACKGROUND_PRESETS[0];
    setDraft((current) => ({
      ...current,
      background: preset.name,
      skills: unique([...current.skills, ...preset.skills]),
      personality: preset.personality,
      personalityTraits: [preset.personality.traits, preset.personality.ideals, preset.personality.bonds, preset.personality.flaws].filter(Boolean),
      backstory: preset.personality.backstory ?? current.backstory,
    }));
  }

  function canAdvance() {
    if (step === 'abilities') {
      if (abilityMethod === 'point-buy') return isPointBuyValid(baseAbilities);
      if (abilityMethod === 'standard-array') {
        const assigned = Object.values(standardAssignment).filter((value): value is number => typeof value === 'number');
        return assigned.length === 6 && new Set(assigned).size === 6;
      }
    }
    return true;
  }

  function nextStep() {
    if (!canAdvance()) return;
    setStep(STEPS[Math.min(STEPS.length - 1, stepPosition + 1)].id);
  }

  function previousStep() {
    setStep(STEPS[Math.max(0, stepPosition - 1)].id);
  }

  async function enterWithCharacter(character: VaultCharacter) {
    setBusy(true);
    setMessage('');
    try {
      const attached = await attachVaultCharacterToSession(character.id, session.id, user);
      onEnter(session, attached);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not attach character.');
    }
    setBusy(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!hasUsableDraft || !canAdvance()) return;
    setBusy(true);
    setMessage('');
    try {
      const finalCharacter = finalizeCharacter({
        ...draft,
        id: draft.id === 'char-draft' ? safeId() : draft.id,
      });
      const saved = await saveVaultCharacter(finalCharacter, user);
      setCharacters((current) => [saved, ...current.filter((character) => character.id !== saved.id)]);
      setSelectedCharacter(saved);
      const attached = await attachVaultCharacterToSession(saved.id, session.id, user);
      onEnter(session, attached);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save character.');
    }
    setBusy(false);
  }

  return (
    <div className="fw-backdrop" role="presentation">
      <section className={view === 'select' ? 'fw-modal fw-character-builder fw-character-builder--vault' : 'fw-modal fw-character-builder'} aria-modal="true" role="dialog">
        <header className="fw-modal__header fw-character-modal-head">
          <div>
            <p className="fw-caption">Character Setup</p>
            <h2 className="fw-h2">{view === 'select' ? 'Choose Your Warden' : draft.name || 'Build a Character'}</h2>
          </div>
          <button className="fw-btn fw-btn--ghost" onClick={onCancel} type="button">
            {Icon('x', { size: 14 })}
            Cancel
          </button>
        </header>

        {view === 'select' ? (
          <div className="fw-scroll fw-character-vault-source">
            <div className="fw-page">
              <div className="fw-page-head">
                <div>
                  <div className="fw-eyebrow">The Hearth / Vault</div>
                  <h1>My Characters</h1>
                  <div className="sub">
                    Bind a vault warden to {session.title}. {characters.length} in the vault.
                  </div>
                </div>
                <div className="fw-character-vault-actions">
                  <button className="fw-btn fw-btn--ghost" onClick={onCancel} type="button">
                    {Icon('chevL', { size: 12 })}
                    Hearth
                  </button>
                  <button className="fw-btn fw-btn--primary" onClick={startNewCharacter} type="button">
                    {Icon('plus', { size: 15 })}
                    Forge new warden
                  </button>
                </div>
              </div>

              <div className="fw-card fw-vault-filter-card">
                <div className="fw-vault-filter-strip">
                  <label className="fw-input-wrap fw-character-vault-search">
                    {Icon('search', { size: 13 })}
                    <input
                      className="fw-input"
                      onChange={(event) => setVaultSearch(event.target.value)}
                      placeholder="Search by name, class, race..."
                      value={vaultSearch}
                    />
                  </label>
                  <div className="fw-vault-pill-row">
                    <button className="fw-vault-pill active" type="button">
                      All <span className="fw-vault-pill-count">{characters.length}</span>
                    </button>
                    <button className="fw-vault-pill" type="button">
                      Active <span className="fw-vault-pill-count">{selectedCharacter ? 1 : 0}</span>
                    </button>
                    <button className="fw-vault-pill" type="button">
                      Drafts <span className="fw-vault-pill-count">0</span>
                    </button>
                  </div>
                  <span className="fw-vault-filter-spacer" />
                  <span className="fw-eyebrow">Class</span>
                  <select className="fw-input fw-character-vault-class" aria-label="Class filter" value="All" onChange={() => undefined}>
                    <option>All</option>
                  </select>
                </div>
              </div>

              {filteredCharacters.length ? (
                <div className="fw-vault-grid fw-character-vault-grid">
                  {filteredCharacters.map((character) => {
                    const isSelected = selectedCharacter?.id === character.id;
                    const hpPercent = character.maxHitPoints > 0
                      ? Math.max(0, Math.min(100, Math.round((character.hitPoints / character.maxHitPoints) * 100)))
                      : 0;
                    return (
                      <article className={isSelected ? 'fw-vault-card active' : 'fw-vault-card'} key={character.id}>
                        <div className="fw-vault-card-portrait">
                          <div className="fw-vault-portrait-inner">{character.name.slice(0, 2).toUpperCase()}</div>
                          <span className="fw-vault-level">Lv {character.level}</span>
                          <span className={isSelected ? 'fw-vault-status active' : 'fw-vault-status'}>
                            <span className="fw-vault-status-dot" />
                            {isSelected ? 'Selected for this table' : 'Vault warden'}
                          </span>
                        </div>
                        <div className="fw-vault-card-body">
                          <div className="fw-vault-card-title">{character.name}</div>
                          <div className="fw-caption">
                            {character.subrace || character.ancestry} / {character.className} / {character.alignment || 'Unbound'}
                          </div>
                          <p className="fw-serif-muted">
                            {character.backstory || 'Bind a name to your dice.'}
                          </p>
                          <div className="fw-vault-mini">
                            <span>HP <strong>{character.hitPoints}/{character.maxHitPoints}</strong></span>
                            <span>AC <strong>{character.armorClass}</strong></span>
                            <span>LV <strong>{character.level}</strong></span>
                          </div>
                          <span className="fw-vault-hp" aria-hidden="true">
                            <span style={{ width: `${hpPercent}%` }} />
                          </span>
                          <div className="fw-vault-card-actions-row">
                            <button className="fw-btn fw-btn--primary" disabled={busy} onClick={() => void enterWithCharacter(character)} type="button">
                              {Icon('play', { size: 11 })}
                              Enter Table
                            </button>
                            <button className="fw-btn fw-btn--ghost" onClick={() => editFromVault(character)} type="button">
                              {Icon('cog', { size: 11 })}
                              Edit
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  <button className="fw-vault-newcard" onClick={startNewCharacter} type="button">
                    <span className="fw-vault-newcard-icon">{Icon('plus', { size: 28 })}</span>
                    <span className="fw-display">Forge new warden</span>
                    <span className="fw-serif-muted">Bind a name to your dice.</span>
                  </button>
                </div>
              ) : (
                <div className="fw-card fw-character-vault-empty">
                  <div>{Icon('users', { size: 36 })}</div>
                  <div className="fw-display">No wardens found</div>
                  <p className="fw-serif-muted">{message || 'The vault is silent on this account.'}</p>
                  <button className="fw-btn fw-btn--primary" onClick={startNewCharacter} type="button">
                    {Icon('plus', { size: 12 })}
                    Forge new warden
                  </button>
                </div>
              )}

              <div className="fw-character-vault-help">
                <span>{Icon('info', { size: 14 })}</span>
                <div>
                  Joining a table creates a session snapshot. HP, conditions, and inventory changes stay with that table until you choose to write them back.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form className="fw-builder-layout fw-character-wizard-source" onSubmit={submit}>
            <aside className="fw-card fw-builder-portrait fw-builder-preview-source fw-orn">
              <span className="corner tl" />
              <span className="corner tr" />
              <div className="fw-character-sigil">{draft.name.slice(0, 2).toUpperCase() || 'FW'}</div>
              <input
                className="fw-input"
                onChange={(event) => updateDraft('name', event.target.value)}
                placeholder="Character name"
                value={draft.name}
              />
              <select className="fw-input" onChange={(event) => updateDraft('alignment', event.target.value)} value={draft.alignment}>
                <option value="">Alignment</option>
                {ALIGNMENTS.map((alignment) => (
                  <option key={alignment} value={alignment}>
                    {alignment}
                  </option>
                ))}
              </select>
              <div className="fw-builder-statline">
                <span>AC <strong>{draft.armorClass}</strong></span>
                <span>HP <strong>{draft.maxHitPoints}</strong></span>
                <span>Speed <strong>{draft.speed}</strong></span>
              </div>
              <div className="fw-builder-preview-meta">
                <span>{draft.subrace || draft.ancestry}</span>
                <span>{draft.className}</span>
                <span>Lv {draft.level}</span>
              </div>
              <button className="fw-btn fw-btn--ghost" onClick={() => setView('select')} type="button">
                Back to Vault
              </button>
            </aside>

            <main className="fw-card fw-builder-wizard fw-fade">
              <header className="fw-wizard-head">
                <div>
                  <p className="eyebrow">Forge a Warden / Step {stepPosition + 1} of {STEPS.length}</p>
                  <h2 className="fw-display">{STEPS[stepPosition]?.label ?? 'Character'}</h2>
                  <p className="fw-serif-muted">{STEPS[stepPosition]?.desc ?? 'Build the pact.'}</p>
                </div>
                <div className="fw-wizard-head-actions">
                  <button className="fw-btn fw-btn--ghost" onClick={() => setView('select')} type="button">
                    {Icon('chevL', { size: 12 })} Vault
                  </button>
                  <button className="fw-btn fw-btn--ghost" disabled={!hasUsableDraft || busy} type="submit">
                    {Icon('scroll', { size: 12 })} Save draft
                  </button>
                </div>
              </header>

              <div className="fw-stepper fw-stepper-source">
                {STEPS.map((item, index) => (
                  <button
                    className={step === item.id ? 'fw-step active' : index < stepPosition ? 'fw-step done' : 'fw-step'}
                    key={item.id}
                    onClick={() => setStep(item.id)}
                    type="button"
                  >
                    <span className="fw-step-bullet">
                      {index < stepPosition ? Icon('check', { size: 11 }) : <span>{index + 1}</span>}
                    </span>
                    <span>
                      <span className="fw-step-label">{item.label}</span>
                      <span className="fw-step-desc">{item.desc}</span>
                    </span>
                  </button>
                ))}
              </div>

              {step === 'race' ? (
                <section className="fw-builder-section">
                  <div className="fw-section-head">
                    <p className="fw-caption">Step 1</p>
                    <h3 className="fw-h3">Race and lineage</h3>
                  </div>
                  <div className="fw-choice-grid">
                    {races.map((race) => (
                      <button
                        className={selectedRace.id === race.id ? 'fw-choice-tile active' : 'fw-choice-tile'}
                        key={race.id}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            systemData: {
                              ...current.systemData,
                              creation: {
                                ...current.systemData.creation,
                                raceId: race.id,
                                subraceId: race.subraces?.[0]?.id,
                              },
                            },
                          }))
                        }
                        type="button"
                      >
                        <strong>{race.name}</strong>
                        <span>{race.description}</span>
                      </button>
                    ))}
                  </div>
                  {selectedRace.subraces?.length ? (
                    <div className="fw-field">
                      <label className="fw-field__label">Subrace</label>
                      <select
                        className="fw-input"
                        value={selectedSubrace?.id ?? ''}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            systemData: {
                              ...current.systemData,
                              creation: { ...current.systemData.creation, subraceId: event.target.value },
                            },
                          }))
                        }
                      >
                        {selectedRace.subraces.map((subrace) => (
                          <option key={subrace.id} value={subrace.id}>
                            {subrace.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {step === 'class' ? (
                <section className="fw-builder-section">
                  <div className="fw-section-head">
                    <p className="fw-caption">Step 2</p>
                    <h3 className="fw-h3">Class and training</h3>
                  </div>
                  <div className="fw-choice-grid">
                    {classes.map((classData) => (
                      <button
                        className={selectedClass.id === classData.id ? 'fw-choice-tile active' : 'fw-choice-tile'}
                        key={classData.id}
                        onClick={() => syncClass(classData.id)}
                        type="button"
                      >
                        <strong>{classData.name}</strong>
                        <span>d{classData.hitDie} hit die / saves {classData.savingThrows.join(', ').toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                  <div className="fw-card fw-card--soft">
                    <p className="fw-caption">Choose {selectedClass.skillChoiceCount} skills</p>
                    <div className="fw-pill-row">
                      {selectedClass.skillChoices.map((skill) => (
                        <button className={draft.skills.includes(skill) ? 'fw-pill active' : 'fw-pill'} key={skill} onClick={() => toggleSkill(skill)} type="button">
                          {skill}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}

              {step === 'abilities' ? (
                <section className="fw-builder-section">
                  <div className="fw-section-head">
                    <p className="fw-caption">Step 3</p>
                    <h3 className="fw-h3">Ability scores</h3>
                  </div>
                  <div className="fw-segmented">
                    {(['standard-array', 'point-buy', 'manual'] as AbilityMethod[]).map((method) => (
                      <button className={abilityMethod === method ? 'active' : ''} key={method} onClick={() => setAbilityMethod(method)} type="button">
                        {method.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                  {abilityMethod === 'point-buy' ? (
                    <p className={pointBuyTotal > POINT_BUY_BUDGET ? 'fw-caption danger' : 'fw-caption'}>
                      Point buy spent {pointBuyTotal}/{POINT_BUY_BUDGET}
                    </p>
                  ) : null}
                  <div className="fw-ability-builder-grid">
                    {ABILITY_KEYS.map((key) => {
                      const base = baseAbilities[key] ?? 10;
                      const finalScore = finalAbilities[key];
                      return (
                        <div className="fw-ability-build-card" key={key}>
                          <span className="fw-caption">{shortAbility(key)}</span>
                          <strong>{finalScore}</strong>
                          <span>{formatModifier(abilityModifier(finalScore))}</span>
                          {abilityMethod === 'standard-array' ? (
                            <select
                              className="fw-input"
                              onChange={(event) => assignStandardAbility(key, event.target.value ? Number(event.target.value) : '')}
                              value={standardAssignment[key]}
                            >
                              <option value="">Assign</option>
                              {STANDARD_ARRAY.map((score) => (
                                <option key={score} value={score}>
                                  {score}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              className="fw-input fw-input--mono"
                              max={abilityMethod === 'point-buy' ? 15 : 30}
                              min={abilityMethod === 'point-buy' ? 8 : 1}
                              onChange={(event: ChangeEvent<HTMLInputElement>) => updateBaseAbility(key, event.target.valueAsNumber)}
                              type="number"
                              value={base}
                            />
                          )}
                          <small>base {base} / race +{finalScore - base}</small>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {step === 'background' ? (
                <section className="fw-builder-section">
                  <div className="fw-section-head">
                    <p className="fw-caption">Step 4</p>
                    <h3 className="fw-h3">Background and personality</h3>
                  </div>
                  <div className="fw-card fw-card--soft fw-character-identity-card">
                    <div className="fw-card-body">
                      <label className="fw-field">
                        <span className="fw-field__label">Character Name</span>
                        <input
                          className="fw-input"
                          onChange={(event) => updateDraft('name', event.target.value)}
                          placeholder="Rowan Vael"
                          value={draft.name}
                        />
                      </label>
                      <label className="fw-field">
                        <span className="fw-field__label">Alignment</span>
                        <select className="fw-input" onChange={(event) => updateDraft('alignment', event.target.value)} value={draft.alignment}>
                          <option value="">Alignment</option>
                          {ALIGNMENTS.map((alignment) => (
                            <option key={alignment} value={alignment}>
                              {alignment}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                  <div className="fw-choice-grid compact">
                    {BACKGROUND_PRESETS.map((preset) => (
                      <button className={draft.background === preset.name ? 'fw-choice-tile active' : 'fw-choice-tile'} key={preset.id} onClick={() => applyBackgroundPreset(preset.id)} type="button">
                        <strong>{preset.name}</strong>
                        <span>{preset.skills.join(', ')}</span>
                      </button>
                    ))}
                  </div>
                  <div className="fw-personality-grid">
                    {(['traits', 'ideals', 'bonds', 'flaws'] as const).map((key) => (
                      <label className="fw-field" key={key}>
                        <span className="fw-field__label">{key}</span>
                        <textarea
                          className="fw-input"
                          rows={3}
                          value={draft.personality?.[key] ?? ''}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              personality: {
                                traits: current.personality?.traits ?? '',
                                ideals: current.personality?.ideals ?? '',
                                bonds: current.personality?.bonds ?? '',
                                flaws: current.personality?.flaws ?? '',
                                backstory: current.personality?.backstory ?? current.backstory,
                                [key]: event.target.value,
                              },
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <label className="fw-field">
                    <span className="fw-field__label">Backstory</span>
                    <textarea className="fw-input" onChange={(event) => updateDraft('backstory', event.target.value)} rows={4} value={draft.backstory} />
                  </label>
                </section>
              ) : null}

              {step === 'equipment' ? (
                <section className="fw-builder-section">
                  <div className="fw-section-head">
                    <p className="fw-caption">Step 5</p>
                    <h3 className="fw-h3">Starting gear</h3>
                  </div>
                  <div className="fw-card fw-card--soft">
                    <p className="fw-caption">Class starting equipment</p>
                    <div className="fw-equipment-list">
                      {getClassStartingEquipment(selectedClass).map((item) => (
                        <label className={selectedEquipment.includes(item) ? 'fw-check-row active' : 'fw-check-row'} key={item}>
                          <input checked={selectedEquipment.includes(item)} onChange={() => toggleEquipment(item)} type="checkbox" />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="fw-field">
                    <label className="fw-field__label">Item template picker</label>
                    <div className="fw-inline-control">
                      <select className="fw-input" onChange={(event) => setCustomItem(event.target.value)} value={customItem}>
                        <option value="">Add optional item</option>
                        {itemPickerOptions.map((item) => (
                          <option key={item.templateId} value={item.templateId}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <button className="fw-btn fw-btn--ghost" onClick={addCustomItem} type="button">
                        Add
                      </button>
                    </div>
                  </div>
                </section>
              ) : null}

              {step === 'review' ? (
                <section className="fw-builder-section">
                  <div className="fw-section-head">
                    <p className="fw-caption">Step 6</p>
                    <h3 className="fw-h3">Review before table</h3>
                  </div>
                  <div className="fw-review-grid">
                    <div><span>Name</span><strong>{draft.name || 'Unnamed'}</strong></div>
                    <div><span>Lineage</span><strong>{draft.subrace || draft.ancestry}</strong></div>
                    <div><span>Class</span><strong>{draft.className}</strong></div>
                    <div><span>Background</span><strong>{draft.background || 'Unwritten'}</strong></div>
                    <div><span>Skills</span><strong>{draft.skills.join(', ') || 'None'}</strong></div>
                    <div><span>Gear</span><strong>{selectedEquipment.length} items</strong></div>
                  </div>
                  <p className="fw-body-sm">This will save the character to your vault, then attach a session snapshot to {session.title}.</p>
                </section>
              ) : null}

              <footer className="fw-builder-actions fw-wizard-foot">
                <button className="fw-btn fw-btn-ghost" disabled={stepPosition === 0 || busy} onClick={previousStep} type="button">
                  {Icon('chevL', { size: 12 })} Back
                </button>
                <span className="fw-caption">{stepPosition + 1} / {STEPS.length}</span>
                {step !== 'review' ? (
                  <button className="fw-btn fw-btn-gold" disabled={!canAdvance() || busy} onClick={nextStep} type="button">
                    Next / {STEPS[stepPosition + 1]?.label} {Icon('chevR', { size: 12 })}
                  </button>
                ) : (
                  <button className="fw-btn fw-btn-gold fw-btn-lg" disabled={!hasUsableDraft || busy} type="submit">
                    {busy ? 'Saving...' : 'Bind the pact'}
                  </button>
                )}
              </footer>
            </main>

            <aside className="fw-card fw-builder-context fw-builder-live-source">
              <span className="fw-orn-c tl" />
              <span className="fw-orn-c tr" />
              <span className="fw-orn-c bl" />
              <span className="fw-orn-c br" />
              <div className="fw-character-sigil fw-builder-live-sigil">{draft.name.slice(0, 2).toUpperCase() || 'FW'}</div>
              <h3 className="fw-h3 fw-builder-live-name">{draft.name || 'Unbound'}</h3>
              <p className="fw-serif-muted fw-builder-live-subtitle">
                {draft.subrace || draft.ancestry} / {draft.className} / Level {draft.level}
              </p>
              <div className="fw-divider"><span className="fw-eyebrow">Vitals</span></div>
              <div className="fw-builder-live-vitals">
                <span>AC <strong>{draft.armorClass}</strong></span>
                <span>HP <strong>{draft.maxHitPoints}</strong></span>
                <span>PB <strong>+{calcProficiencyBonus(draft.level)}</strong></span>
              </div>
              <div className="fw-divider"><span className="fw-eyebrow">Abilities</span></div>
              <div className="fw-summary-stack">
                {ABILITY_KEYS.map((key) => (
                  <div key={key}>
                    <span>{ABILITY_LABELS[key]}</span>
                    <strong>{finalAbilities[key]} {formatModifier(abilityModifier(finalAbilities[key]))}</strong>
                  </div>
                ))}
              </div>
              <div className="fw-divider"><span className="fw-eyebrow">Features</span></div>
              <div className="fw-pill-row">
                {draft.features.slice(0, 8).map((feature) => <span className="fw-pill" key={feature}>{feature}</span>)}
              </div>
            </aside>
          </form>
        )}
      </section>
    </div>
  );
}
