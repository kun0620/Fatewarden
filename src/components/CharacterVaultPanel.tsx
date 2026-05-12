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
    <section className="panel vault-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Character Vault</p>
          <h2>{selectedCharacter ? selectedCharacter.name : 'Choose Hero'}</h2>
        </div>
        <span className={selectedCharacter ? 'status connected' : 'status'}>
          {selectedCharacter ? 'Ready' : 'Required'}
        </span>
      </div>

      <div className="vault-selected-card">
        <div>
          <span>Selected</span>
          <strong>{selectedCharacter?.name ?? 'No character selected'}</strong>
          <small>
            {selectedCharacter
              ? `Lv ${selectedCharacter.level} ${selectedCharacter.ancestry} ${selectedCharacter.className}`
              : 'Pick a saved hero or use a quick preset.'}
          </small>
        </div>
        <button className="secondary-button" disabled={!user || busy} onClick={() => setIsVaultOpen(true)} type="button">
          <Users size={16} aria-hidden="true" />
          Open Vault
        </button>
      </div>

      <div className="character-actions">
        <button className="secondary-button" disabled={!user || busy} onClick={() => setIsVaultOpen(true)} type="button">
          <Users size={17} aria-hidden="true" />
          Choose
        </button>
        <button className="secondary-button" disabled={!user || busy} onClick={newCharacter} type="button">
          <UserPlus size={17} aria-hidden="true" />
          Custom
        </button>
        <button className="primary-button" disabled={!user || busy || !selectedCharacter} onClick={editCharacter} type="button">
          <Pencil size={17} aria-hidden="true" />
          Adjust
        </button>
      </div>

      {message ? <p className="form-message">{message}</p> : null}

      {isVaultOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section aria-modal="true" className="character-setup-modal vault-picker-modal" role="dialog">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">Character Vault</p>
                <h2>Choose before table</h2>
              </div>
              <button aria-label="Close character vault" className="icon-button" onClick={() => setIsVaultOpen(false)} type="button">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {characters.length ? (
              <div className="vault-list">
                {characters.map((character) => (
                  <button
                    className={selectedCharacter?.id === character.id ? 'active' : ''}
                    key={character.id}
                    onClick={() => selectCharacter(character)}
                    type="button"
                  >
                    <Users size={16} aria-hidden="true" />
                    <span>
                      <strong>{character.name}</strong>
                      <small>
                        Lv {character.level} {character.ancestry} {character.className}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-state">No saved characters yet. Use a quick hero below or create a custom one.</p>
            )}

            <div className="vault-template-grid">
              {characterTemplates.map((template) => (
                <button disabled={!user || busy} key={template.id} onClick={() => void useTemplate(template)} type="button">
                  <Users size={16} aria-hidden="true" />
                  <span>
                    <strong>{template.name}</strong>
                    <small>
                      Lv {template.level} {template.ancestry} {template.className}
                    </small>
                  </span>
                </button>
              ))}
            </div>

            <div className="character-actions">
              <button className="secondary-button" disabled={!user || busy} onClick={newCharacter} type="button">
                <UserPlus size={17} aria-hidden="true" />
                Custom Character
              </button>
              <button className="primary-button" disabled={!user || busy || !selectedCharacter} onClick={editCharacter} type="button">
                <Pencil size={17} aria-hidden="true" />
                Adjust Selected
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isSetupOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section aria-modal="true" className="character-setup-modal" role="dialog">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">Character Setup</p>
                <h2>{draft.name.trim() || 'Custom Hero'}</h2>
              </div>
              <button aria-label="Close character setup" className="icon-button" onClick={() => setIsSetupOpen(false)} type="button">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form className="stack-form vault-form" onSubmit={submit}>
        <div className="character-editor-grid">
          <label>
            Name
            <input
              disabled={!user || busy}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="Character name"
              value={draft.name}
            />
          </label>
          <label>
            Level
            <input
              disabled={!user || busy}
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
              disabled={!user || busy}
              onChange={(event) => updateField('ancestry', event.target.value)}
              placeholder="Human, Elf, Dwarf"
              value={draft.ancestry}
            />
          </label>
          <label>
            Class
            <input
              disabled={!user || busy}
              onChange={(event) => updateField('className', event.target.value)}
              placeholder="Fighter, Wizard, Rogue"
              value={draft.className}
            />
          </label>
        </div>

        <div className="vitals-grid">
          <div className="vital">
            <Shield size={18} aria-hidden="true" />
            <span>AC</span>
            <input
              aria-label="Vault armor class"
              disabled={!user || busy}
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
                aria-label="Vault hit points"
                disabled={!user || busy}
                max={999}
                min={0}
                onChange={updateNumber('hitPoints', 0, 999)}
                type="number"
                value={draft.hitPoints}
              />
              <span>/</span>
              <input
                aria-label="Vault max hit points"
                disabled={!user || busy}
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

        <label className="skills-editor">
          Skills
          <input
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
        </label>

        <div className="character-actions">
          <button className="secondary-button" disabled={!user || busy} onClick={newCharacter} type="button">
            <UserPlus size={17} aria-hidden="true" />
            New
          </button>
          <button className="primary-button" disabled={!user || busy || !hasUsableDraft} type="submit">
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
