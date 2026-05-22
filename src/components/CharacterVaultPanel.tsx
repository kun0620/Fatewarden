import {
  Copy,
  Download,
  Pencil,
  Save,
  Search,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { demoCharacter } from '../data/demo';
import { createEmptyInventory, inventoryFromNames } from '../lib/inventory';
import {
  deleteVaultCharacter,
  duplicateVaultCharacter,
  listVaultCharacters,
  saveVaultCharacter,
} from '../lib/characters';
import { downloadCharacterJson, readImportedCharacterFile } from '../lib/characterImportExport';
import type { AbilityKey, Character, CharacterPersonality, VaultCharacter } from '../types';

const abilityLabels: Record<AbilityKey, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

type CharacterVaultPanelProps = {
  onSelectCharacter: (character: VaultCharacter | null) => void;
  selectedCharacter: VaultCharacter | null;
  user: User | null;
};

function makeDraft(): Character {
  return {
    ...demoCharacter,
    id: 'char-demo-vault',
    name: '',
    ancestry: '',
    race: '',
    subrace: '',
    className: '',
    subclass: '',
    background: '',
    skills: [],
    inventory: createEmptyInventory(),
    features: [],
    spells: [],
    spellsKnown: [],
    savingThrows: [],
    backstory: '',
    personalityTraits: [],
    personality: {
      traits: '',
      ideals: '',
      bonds: '',
      flaws: '',
      backstory: '',
    },
    portraitUrl: '',
    systemData: {},
  };
}

const characterTemplates: Character[] = [
  demoCharacter,
  {
    ...demoCharacter,
    id: 'char-template-fighter',
    name: 'Sample Vanguard',
    ancestry: 'Human',
    race: 'Human',
    className: 'Figh' + 'ter',
    level: 3,
    armorClass: 16,
    hitPoints: 31,
    maxHitPoints: 31,
    abilities: { str: 16, dex: 13, con: 15, int: 10, wis: 12, cha: 10 },
    skills: ['Athletics', 'Intimidation', 'Survival'],
    inventory: inventoryFromNames(['Longsword', 'Shield', 'Chain mail', 'Explorer pack']),
    features: ['Fighting Style', 'Second Wind', 'Action Surge'],
    backstory: 'A sellsword with a quiet oath to defend people who cannot pay.',
  },
  {
    ...demoCharacter,
    id: 'char-template-wizard',
    name: 'Elira Moonquill',
    ancestry: 'High Elf',
    race: 'Elf',
    subrace: 'High Elf',
    className: 'Wizard',
    level: 3,
    armorClass: 12,
    hitPoints: 18,
    maxHitPoints: 18,
    abilities: { str: 8, dex: 14, con: 12, int: 17, wis: 13, cha: 10 },
    skills: ['Arcana', 'History', 'Investigation', 'Perception'],
    inventory: inventoryFromNames(['Quarterstaff', 'Spellbook', 'Component pouch', 'Scholar pack']),
    features: ['Arcane Recovery', 'Ritual Casting'],
    spells: ['Mage Armor', 'Magic Missile', 'Detect Magic'],
    spellsKnown: ['Mage Armor', 'Magic Missile', 'Detect Magic'],
    backstory: 'A careful arcanist chasing the pattern behind a spreading violet curse.',
  },
  {
    ...demoCharacter,
    id: 'char-template-rogue',
    name: 'Nyx Vale',
    ancestry: 'Halfling',
    race: 'Halfling',
    className: 'Rogue',
    level: 3,
    armorClass: 14,
    hitPoints: 22,
    maxHitPoints: 22,
    abilities: { str: 8, dex: 17, con: 13, int: 14, wis: 12, cha: 13 },
    skills: ['Stealth', 'Sleight of Hand', 'Investigation', 'Deception', 'Perception'],
    inventory: inventoryFromNames(['Rapier', 'Shortbow', 'Thieves tools', 'Burglar pack']),
    features: ['Sneak Attack', 'Cunning Action', 'Thieves Cant'],
    backstory: 'A nimble finder of locked doors, lost names, and inconvenient truths.',
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function textToList(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function listToText(value: string[] | undefined) {
  return (value ?? []).join(', ');
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

export function CharacterVaultPanel({ onSelectCharacter, selectedCharacter, user }: CharacterVaultPanelProps) {
  const [characters, setCharacters] = useState<VaultCharacter[]>([]);
  const [draft, setDraft] = useState<Character>(makeDraft());
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const hasUsableDraft = useMemo(
    () => Boolean(draft.name.trim() && draft.className.trim() && draft.ancestry.trim()),
    [draft],
  );

  const classOptions = useMemo(
    () => Array.from(new Set(characters.map((character) => character.className).filter(Boolean))).sort(),
    [characters],
  );

  const filteredCharacters = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return characters.filter((character) => {
      const matchesSearch =
        !needle ||
        [character.name, character.ancestry, character.subrace, character.className, character.subclass, character.background]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      const matchesClass = classFilter === 'all' || character.className === classFilter;
      const matchesLevel =
        levelFilter === 'all' ||
        (levelFilter === '1-4' && character.level >= 1 && character.level <= 4) ||
        (levelFilter === '5-10' && character.level >= 5 && character.level <= 10) ||
        (levelFilter === '11-16' && character.level >= 11 && character.level <= 16) ||
        (levelFilter === '17-20' && character.level >= 17 && character.level <= 20);
      return matchesSearch && matchesClass && matchesLevel;
    });
  }, [characters, classFilter, levelFilter, search]);

  useEffect(() => {
    if (!user) {
      setCharacters([]);
      onSelectCharacter(null);
      return;
    }

    let alive = true;
    setMessage('Loading character vault');
    listVaultCharacters(user)
      .then((rows) => {
        if (!alive) return;
        setCharacters(rows);
        const selected = rows.find((character) => character.id === selectedCharacter?.id) ?? rows[0] ?? null;
        onSelectCharacter(selected);
        if (selected) setDraft(selected);
        setMessage(rows.length ? 'Choose a character before entering a table.' : 'Create your first DnD character.');
      })
      .catch((error: Error) => {
        if (!alive) return;
        setMessage(error.message);
      });

    return () => {
      alive = false;
    };
  }, [user]);

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

  function selectCharacter(character: VaultCharacter) {
    onSelectCharacter(character);
    setDraft(character);
    setIsVaultOpen(false);
    setMessage(`${character.name} selected for table entry.`);
  }

  function newCharacter() {
    onSelectCharacter(null);
    setDraft(makeDraft());
    setIsVaultOpen(false);
    setIsSetupOpen(true);
    setMessage('New character draft ready.');
  }

  function editCharacter() {
    setDraft(selectedCharacter ?? makeDraft());
    setIsVaultOpen(false);
    setIsSetupOpen(true);
  }

  async function useTemplate(template: Character) {
    if (!user) return;

    setBusy(true);
    setMessage('');
    try {
      const saved = await saveVaultCharacter(
        {
          ...template,
          id: crypto.randomUUID(),
          hitPoints: Math.min(template.hitPoints, template.maxHitPoints),
        },
        user,
      );
      setCharacters((current) => [saved, ...current.filter((character) => character.id !== saved.id)]);
      onSelectCharacter(saved);
      setDraft(saved);
      setIsVaultOpen(false);
      setMessage(`${saved.name} saved and selected.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not use template.');
    }
    setBusy(false);
  }

  async function duplicateCharacter(character: VaultCharacter) {
    if (!user) return;
    setBusy(true);
    setMessage('');
    try {
      const saved = await duplicateVaultCharacter(character, user);
      setCharacters((current) => [saved, ...current]);
      onSelectCharacter(saved);
      setDraft(saved);
      setMessage(`${saved.name} duplicated.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not duplicate character.');
    }
    setBusy(false);
  }

  async function removeCharacter(character: VaultCharacter) {
    if (!user) return;
    const confirmed = window.confirm(`Delete ${character.name} from your vault?`);
    if (!confirmed) return;

    setBusy(true);
    setMessage('');
    try {
      await deleteVaultCharacter(character.id, user);
      const nextRows = characters.filter((item) => item.id !== character.id);
      setCharacters(nextRows);
      const nextSelected = selectedCharacter?.id === character.id ? nextRows[0] ?? null : selectedCharacter;
      onSelectCharacter(nextSelected);
      if (nextSelected) setDraft(nextSelected);
      setMessage(`${character.name} deleted from the vault.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete character.');
    }
    setBusy(false);
  }

  async function importCharacter(event: ChangeEvent<HTMLInputElement>) {
    if (!user) return;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setBusy(true);
    setMessage('');
    try {
      const result = await readImportedCharacterFile(file);
      if (!result.ok || !result.character) {
        setMessage(result.errors.join(' '));
        return;
      }

      const saved = await saveVaultCharacter(result.character, user);
      setCharacters((current) => [saved, ...current.filter((character) => character.id !== saved.id)]);
      onSelectCharacter(saved);
      setDraft(saved);
      setMessage(`${saved.name} imported and selected.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not import character.');
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user || !hasUsableDraft) return;

    setBusy(true);
    setMessage('');
    try {
      const saved = await saveVaultCharacter(
        {
          ...draft,
          race: draft.race || draft.ancestry,
          hitPoints: Math.min(draft.hitPoints, draft.maxHitPoints),
          skills: draft.skills.map((skill) => skill.trim()).filter(Boolean),
          savingThrows: toAbilityKeys(draft.savingThrows),
          spellsKnown: draft.spellsKnown?.map((item) => item.trim()).filter(Boolean),
          personality: {
            traits: draft.personality?.traits ?? draft.personalityTraits[0] ?? '',
            ideals: draft.personality?.ideals ?? '',
            bonds: draft.personality?.bonds ?? '',
            flaws: draft.personality?.flaws ?? '',
            backstory: draft.personality?.backstory ?? draft.backstory,
            quote: draft.personality?.quote ?? '',
          },
        },
        user,
      );
      setCharacters((current) => [saved, ...current.filter((character) => character.id !== saved.id)]);
      onSelectCharacter(saved);
      setDraft(saved);
      setIsSetupOpen(false);
      setMessage(`${saved.name} saved and selected.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save character.');
    }
    setBusy(false);
  }

  return (
    <section className="fw-panel vault-panel">
      <div className="fw-panel__header">
        <div>
          <p className="fw-caption">Character Vault</p>
          <h2 className="fw-h2">{selectedCharacter ? selectedCharacter.name : 'Choose Hero'}</h2>
        </div>
        <span className={selectedCharacter ? 'fw-caption connected' : 'fw-caption'}>
          {selectedCharacter ? 'Ready' : 'Required'}
        </span>
      </div>

      <div className="fw-card fw-card--elevated fw-vault-selected">
        <div>
          <span className="fw-caption">Selected</span>
          <strong>{selectedCharacter?.name ?? 'No character selected'}</strong>
          <small className="fw-caption">
            {selectedCharacter
              ? `Lv ${selectedCharacter.level} ${selectedCharacter.ancestry} ${selectedCharacter.className}`
              : 'Pick a saved hero or use a quick preset.'}
          </small>
        </div>
        <button className="fw-btn fw-btn--ghost" disabled={!user || busy} onClick={() => setIsVaultOpen(true)} type="button">
          <Users size={16} aria-hidden="true" />
          Open Vault
        </button>
      </div>

      <div className="fw-action-row">
        <button className="fw-btn fw-btn--ghost" disabled={!user || busy} onClick={() => setIsVaultOpen(true)} type="button">
          <Users size={17} aria-hidden="true" />
          Choose
        </button>
        <button className="fw-btn fw-btn--ghost" disabled={!user || busy} onClick={newCharacter} type="button">
          <UserPlus size={17} aria-hidden="true" />
          Custom
        </button>
        <button className="fw-btn fw-btn--primary" disabled={!user || busy || !selectedCharacter} onClick={editCharacter} type="button">
          <Pencil size={17} aria-hidden="true" />
          Adjust
        </button>
      </div>

      {message ? <p className="fw-caption">{message}</p> : null}

      {isVaultOpen ? (
        <div className="fw-backdrop" role="presentation">
          <section aria-modal="true" className="fw-modal fw-vault-modal" role="dialog">
            <div className="fw-modal__header">
              <div>
                <p className="fw-caption">Character Vault</p>
                <h2 className="fw-h2">Choose before table</h2>
              </div>
              <button aria-label="Close character vault" className="fw-btn fw-btn--icon" onClick={() => setIsVaultOpen(false)} type="button">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="fw-vault-toolbar">
              <label className="fw-input-wrap">
                <Search size={15} aria-hidden="true" />
                <input
                  className="fw-input"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, race, class..."
                  value={search}
                />
              </label>
              <select className="fw-input" onChange={(event) => setClassFilter(event.target.value)} value={classFilter}>
                <option value="all">All classes</option>
                {classOptions.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
              <select className="fw-input" onChange={(event) => setLevelFilter(event.target.value)} value={levelFilter}>
                <option value="all">All levels</option>
                <option value="1-4">Levels 1-4</option>
                <option value="5-10">Levels 5-10</option>
                <option value="11-16">Levels 11-16</option>
                <option value="17-20">Levels 17-20</option>
              </select>
              <input
                accept="application/json,.json"
                className="fw-hidden-input"
                onChange={(event) => void importCharacter(event)}
                ref={importInputRef}
                type="file"
              />
              <button className="fw-btn fw-btn--ghost" disabled={!user || busy} onClick={() => importInputRef.current?.click()} type="button">
                <Upload size={16} aria-hidden="true" />
                Import
              </button>
            </div>

            {filteredCharacters.length ? (
              <div className="fw-vault-grid">
                {filteredCharacters.map((character) => {
                  const isSelected = selectedCharacter?.id === character.id;
                  const hpPercent = character.maxHitPoints > 0
                    ? Math.max(0, Math.min(100, Math.round((character.hitPoints / character.maxHitPoints) * 100)))
                    : 0;

                  return (
                  <article className={isSelected ? 'fw-vault-card active' : 'fw-vault-card'} key={character.id}>
                    <button className="fw-vault-card-select" onClick={() => selectCharacter(character)} type="button">
                      <span className="fw-vault-card-portrait">
                        <span className="fw-vault-portrait-inner">{character.name.slice(0, 2).toUpperCase()}</span>
                        <span className="fw-vault-level">Lv {character.level}</span>
                        <span className={isSelected ? 'fw-vault-status active' : 'fw-vault-status'}>
                          <span className="fw-vault-status-dot" />
                          {isSelected ? 'Selected' : 'Vault'}
                        </span>
                        <span className="fw-vault-hp" aria-hidden="true">
                          <span style={{ width: `${hpPercent}%` }} />
                        </span>
                      </span>
                      <span className="fw-vault-card-body">
                        <span className="fw-vault-card-title">{character.name}</span>
                        <small className="fw-caption">
                          Lv {character.level} {character.ancestry}
                          {character.subrace ? ` (${character.subrace})` : ''} {character.className}
                          {character.subclass ? ` - ${character.subclass}` : ''}
                        </small>
                        <small className="fw-caption">
                          HP {character.hitPoints}/{character.maxHitPoints} / AC {character.armorClass} / {character.skills.length} skills
                        </small>
                      </span>
                    </button>
                    <div className="fw-vault-card__actions">
                      <button
                        aria-label={`Duplicate ${character.name}`}
                        className="fw-btn fw-btn--icon"
                        disabled={!user || busy}
                        onClick={() => void duplicateCharacter(character)}
                        type="button"
                      >
                        <Copy size={15} aria-hidden="true" />
                      </button>
                      <button
                        aria-label={`Export ${character.name}`}
                        className="fw-btn fw-btn--icon"
                        disabled={busy}
                        onClick={() => downloadCharacterJson(character)}
                        type="button"
                      >
                        <Download size={15} aria-hidden="true" />
                      </button>
                      <button
                        aria-label={`Delete ${character.name}`}
                        className="fw-btn fw-btn--icon danger"
                        disabled={!user || busy}
                        onClick={() => void removeCharacter(character)}
                        type="button"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                  );
                })}
              </div>
            ) : (
              <p className="fw-empty">No characters match that search. Import one, create a custom hero, or use a quick template.</p>
            )}

            <div className="fw-vault-template-grid">
              {characterTemplates.map((template) => (
                <button
                  className="fw-btn fw-btn--ghost fw-template-tile"
                  disabled={!user || busy}
                  key={template.id}
                  onClick={() => void useTemplate(template)}
                  type="button"
                >
                  <Users size={16} aria-hidden="true" />
                  <span>
                    <strong>{template.name}</strong>
                    <small className="fw-caption">
                      Lv {template.level} {template.ancestry} {template.className}
                    </small>
                  </span>
                </button>
              ))}
            </div>

            <div className="fw-action-row">
              <button className="fw-btn fw-btn--ghost" disabled={!user || busy} onClick={newCharacter} type="button">
                <UserPlus size={17} aria-hidden="true" />
                Custom Character
              </button>
              <button className="fw-btn fw-btn--primary" disabled={!user || busy || !selectedCharacter} onClick={editCharacter} type="button">
                <Pencil size={17} aria-hidden="true" />
                Adjust Selected
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isSetupOpen ? (
        <div className="fw-backdrop" role="presentation">
          <section aria-modal="true" className="fw-modal" role="dialog">
            <div className="fw-modal__header">
              <div>
                <p className="fw-caption">Character Setup</p>
                <h2 className="fw-h2">{draft.name.trim() || 'Custom Hero'}</h2>
              </div>
              <button aria-label="Close character setup" className="fw-btn fw-btn--icon" onClick={() => setIsSetupOpen(false)} type="button">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form className="fw-vault-edit-form" onSubmit={submit}>
              <div className="fw-vault-edit-grid">
                <div className="fw-field">
                  <label className="fw-field__label">Name</label>
                  <input
                    className="fw-input"
                    disabled={!user || busy}
                    onChange={(event) => updateField('name', event.target.value)}
                    placeholder="Character name"
                    value={draft.name}
                  />
                </div>
                <div className="fw-field">
                  <label className="fw-field__label">Level</label>
                  <input className="fw-input" disabled={!user || busy} max={20} min={1} onChange={updateNumber('level', 1, 20)} type="number" value={draft.level} />
                </div>
                <div className="fw-field">
                  <label className="fw-field__label">Race</label>
                  <input
                    className="fw-input"
                    disabled={!user || busy}
                    onChange={(event) => updateField('ancestry', event.target.value)}
                    placeholder="Human, Elf, Dwarf"
                    value={draft.ancestry}
                  />
                </div>
                <div className="fw-field">
                  <label className="fw-field__label">Subrace</label>
                  <input className="fw-input" disabled={!user || busy} onChange={(event) => updateField('subrace', event.target.value)} placeholder="High Elf" value={draft.subrace ?? ''} />
                </div>
                <div className="fw-field">
                  <label className="fw-field__label">Class</label>
                  <input className="fw-input" disabled={!user || busy} onChange={(event) => updateField('className', event.target.value)} placeholder="Warrior, Wizard, Rogue" value={draft.className} />
                </div>
                <div className="fw-field">
                  <label className="fw-field__label">Subclass</label>
                  <input className="fw-input" disabled={!user || busy} onChange={(event) => updateField('subclass', event.target.value)} placeholder="Champion, Evoker" value={draft.subclass ?? ''} />
                </div>
              </div>

              <div className="fw-action-row">
                <div className="fw-inline-control">
                  <Shield size={18} aria-hidden="true" />
                  <span>AC</span>
                  <input className="fw-input" aria-label="Vault armor class" disabled={!user || busy} max={30} min={1} onChange={updateNumber('armorClass', 1, 30)} type="number" value={draft.armorClass} />
                </div>
                <div className="fw-inline-control">
                  <Sparkles size={18} aria-hidden="true" />
                  <span>HP</span>
                  <input className="fw-input" aria-label="Vault hit points" disabled={!user || busy} max={999} min={0} onChange={updateNumber('hitPoints', 0, 999)} type="number" value={draft.hitPoints} />
                  <span>/</span>
                  <input className="fw-input" aria-label="Vault max hit points" disabled={!user || busy} max={999} min={1} onChange={updateNumber('maxHitPoints', 1, 999)} type="number" value={draft.maxHitPoints} />
                </div>
              </div>

              <div className="fw-vault-ability-grid">
                {Object.entries(draft.abilities).map(([key, score]) => (
                  <div className="fw-ability-build-card" key={key}>
                    <span className="fw-caption">{abilityLabels[key as AbilityKey]}</span>
                    <input
                      className="fw-input"
                      aria-label={`Vault ${abilityLabels[key as AbilityKey]}`}
                      disabled={!user || busy}
                      max={30}
                      min={1}
                      onChange={updateAbility(key as AbilityKey)}
                      type="number"
                      value={score}
                    />
                  </div>
                ))}
              </div>

              <div className="fw-vault-edit-grid">
                <div className="fw-field">
                  <label className="fw-field__label">Skills</label>
                  <input className="fw-input" disabled={!user || busy} onChange={(event) => updateField('skills', textToList(event.target.value))} value={listToText(draft.skills)} />
                </div>
                <div className="fw-field">
                  <label className="fw-field__label">Saving Throws</label>
                  <input className="fw-input" disabled={!user || busy} onChange={(event) => updateField('savingThrows', toAbilityKeys(textToList(event.target.value)) ?? [])} value={listToText(draft.savingThrows)} />
                </div>
                <div className="fw-field">
                  <label className="fw-field__label">Spells Known</label>
                  <input className="fw-input" disabled={!user || busy} onChange={(event) => updateField('spellsKnown', textToList(event.target.value))} value={listToText(draft.spellsKnown)} />
                </div>
                <div className="fw-field">
                  <label className="fw-field__label">Background</label>
                  <input className="fw-input" disabled={!user || busy} onChange={(event) => updateField('background', event.target.value)} value={draft.background} />
                </div>
              </div>

              <div className="fw-personality-grid">
                <textarea className="fw-input" disabled={!user || busy} onChange={(event) => updateField('personality', mergePersonality(draft.personality, { traits: event.target.value }))} placeholder="Personality traits" rows={3} value={draft.personality?.traits ?? ''} />
                <textarea className="fw-input" disabled={!user || busy} onChange={(event) => updateField('personality', mergePersonality(draft.personality, { ideals: event.target.value }))} placeholder="Ideals" rows={3} value={draft.personality?.ideals ?? ''} />
                <textarea className="fw-input" disabled={!user || busy} onChange={(event) => updateField('personality', mergePersonality(draft.personality, { bonds: event.target.value }))} placeholder="Bonds" rows={3} value={draft.personality?.bonds ?? ''} />
                <textarea className="fw-input" disabled={!user || busy} onChange={(event) => updateField('personality', mergePersonality(draft.personality, { flaws: event.target.value }))} placeholder="Flaws" rows={3} value={draft.personality?.flaws ?? ''} />
              </div>

              <div className="fw-action-row">
                <button className="fw-btn fw-btn--ghost" disabled={!user || busy} onClick={newCharacter} type="button">
                  <UserPlus size={17} aria-hidden="true" />
                  New
                </button>
                <button className="fw-btn fw-btn--primary" disabled={!user || busy || !hasUsableDraft} type="submit">
                  <Save size={17} aria-hidden="true" />
                  {busy ? 'Saving...' : 'Save Character'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
