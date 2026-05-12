import { Pencil, Save, Shield, Sparkles, UserPlus, Users, X } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { demoCharacter } from '../data/demo';
import { createEmptyInventory, inventoryFromNames } from '../lib/inventory';
import { listVaultCharacters, saveVaultCharacter } from '../lib/characters';
import type { AbilityKey, Character, VaultCharacter } from '../types';

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
    className: '',
    background: '',
    skills: [],
    inventory: createEmptyInventory(),
    features: [],
    spells: [],
    backstory: '',
    personalityTraits: [],
    portraitUrl: '',
    systemData: {},
  };
}

const characterTemplates: Character[] = [
  demoCharacter,
  {
    ...demoCharacter,
    id: 'char-template-fighter',
    name: 'Kael Veynor',
    ancestry: 'Human',
    className: 'Fighter',
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
    backstory: 'A careful arcanist chasing the pattern behind a spreading violet curse.',
  },
  {
    ...demoCharacter,
    id: 'char-template-rogue',
    name: 'Nyx Vale',
    ancestry: 'Halfling',
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

export function CharacterVaultPanel({ onSelectCharacter, selectedCharacter, user }: CharacterVaultPanelProps) {
  const [characters, setCharacters] = useState<VaultCharacter[]>([]);
  const [draft, setDraft] = useState<Character>(makeDraft());
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const hasUsableDraft = useMemo(
    () => Boolean(draft.name.trim() && draft.className.trim() && draft.ancestry.trim()),
    [draft],
  );

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
          id: 'char-demo-template',
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user || !hasUsableDraft) return;

    setBusy(true);
    setMessage('');
    try {
      const saved = await saveVaultCharacter(
        {
          ...draft,
          hitPoints: Math.min(draft.hitPoints, draft.maxHitPoints),
          skills: draft.skills.map((skill) => skill.trim()).filter(Boolean),
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

      <div className="fw-card fw-card--elevated" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-3)', gap: 'var(--sp-3)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
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

      <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
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
          <section aria-modal="true" className="fw-modal" role="dialog">
            <div className="fw-modal__header">
              <div>
                <p className="fw-caption">Character Vault</p>
                <h2 className="fw-h2">Choose before table</h2>
              </div>
              <button aria-label="Close character vault" className="fw-btn fw-btn--icon" onClick={() => setIsVaultOpen(false)} type="button">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {characters.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {characters.map((character) => (
                  <button
                    className={selectedCharacter?.id === character.id ? 'fw-btn fw-btn--ghost active' : 'fw-btn fw-btn--ghost'}
                    key={character.id}
                    onClick={() => selectCharacter(character)}
                    style={{ justifyContent: 'flex-start', gap: 'var(--sp-2)' }}
                    type="button"
                  >
                    <Users size={16} aria-hidden="true" />
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <strong>{character.name}</strong>
                      <small className="fw-caption">
                        Lv {character.level} {character.ancestry} {character.className}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="fw-caption">No saved characters yet. Use a quick hero below or create a custom one.</p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
              {characterTemplates.map((template) => (
                <button
                  className="fw-btn fw-btn--ghost"
                  disabled={!user || busy}
                  key={template.id}
                  onClick={() => void useTemplate(template)}
                  style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--sp-1)' }}
                  type="button"
                >
                  <Users size={16} aria-hidden="true" />
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <strong>{template.name}</strong>
                    <small className="fw-caption">
                      Lv {template.level} {template.ancestry} {template.className}
                    </small>
                  </span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
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

            <form style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }} onSubmit={submit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--sp-3)' }}>
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
                  <input
                    className="fw-input"
                    disabled={!user || busy}
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
                    disabled={!user || busy}
                    onChange={(event) => updateField('ancestry', event.target.value)}
                    placeholder="Human, Elf, Dwarf"
                    value={draft.ancestry}
                  />
                </div>
                <div className="fw-field">
                  <label className="fw-field__label">Class</label>
                  <input
                    className="fw-input"
                    disabled={!user || busy}
                    onChange={(event) => updateField('className', event.target.value)}
                    placeholder="Fighter, Wizard, Rogue"
                    value={draft.className}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  <Shield size={18} aria-hidden="true" />
                  <span>AC</span>
                  <input
                    className="fw-input"
                    aria-label="Vault armor class"
                    disabled={!user || busy}
                    max={30}
                    min={1}
                    onChange={updateNumber('armorClass', 1, 30)}
                    style={{ width: 64 }}
                    type="number"
                    value={draft.armorClass}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  <Sparkles size={18} aria-hidden="true" />
                  <span>HP</span>
                  <input
                    className="fw-input"
                    aria-label="Vault hit points"
                    disabled={!user || busy}
                    max={999}
                    min={0}
                    onChange={updateNumber('hitPoints', 0, 999)}
                    style={{ width: 64 }}
                    type="number"
                    value={draft.hitPoints}
                  />
                  <span>/</span>
                  <input
                    className="fw-input"
                    aria-label="Vault max hit points"
                    disabled={!user || busy}
                    max={999}
                    min={1}
                    onChange={updateNumber('maxHitPoints', 1, 999)}
                    style={{ width: 64 }}
                    type="number"
                    value={draft.maxHitPoints}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-2)' }}>
                {Object.entries(draft.abilities).map(([key, score]) => (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-1)' }} key={key}>
                    <span className="fw-caption">{abilityLabels[key as AbilityKey]}</span>
                    <input
                      className="fw-input"
                      aria-label={`Vault ${abilityLabels[key as AbilityKey]}`}
                      disabled={!user || busy}
                      max={30}
                      min={1}
                      onChange={updateAbility(key as AbilityKey)}
                      style={{ textAlign: 'center', width: '100%' }}
                      type="number"
                      value={score}
                    />
                  </div>
                ))}
              </div>

              <div className="fw-field">
                <label className="fw-field__label">Skills</label>
                <input
                  className="fw-input"
                  disabled={!user || busy}
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

              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
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
