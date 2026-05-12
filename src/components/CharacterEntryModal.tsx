import { Pencil, Save, Shield, Sparkles, UserPlus, Users, X } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { demoCharacter } from '../data/demo';
import { createEmptyInventory, inventoryFromNames } from '../lib/inventory';
import { attachVaultCharacterToSession, listVaultCharacters, saveVaultCharacter } from '../lib/characters';
import type { AbilityKey, Character, GameSession, VaultCharacter } from '../types';

const abilityLabels: Record<AbilityKey, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

type CharacterEntryModalProps = {
  session: GameSession;
  user: User;
  onCancel: () => void;
  onEnter: (session: GameSession, character: Character) => void;
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

export function CharacterEntryModal({ session, user, onCancel, onEnter }: CharacterEntryModalProps) {
  const [characters, setCharacters] = useState<VaultCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<VaultCharacter | null>(null);
  const [draft, setDraft] = useState<Character>(makeDraft());
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Loading character vault');

  const hasUsableDraft = useMemo(
    () => Boolean(draft.name.trim() && draft.className.trim() && draft.ancestry.trim()),
    [draft],
  );

  useEffect(() => {
    let alive = true;
    setMessage('Loading character vault');
    listVaultCharacters(user)
      .then((rows) => {
        if (!alive) return;
        setCharacters(rows);
        setSelectedCharacter(rows[0] ?? null);
        setDraft(rows[0] ?? makeDraft());
        setMessage(rows.length ? 'Choose a saved character for this table.' : 'Create a character to enter this table.');
      })
      .catch((error: Error) => {
        if (alive) setMessage(error.message);
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
    setSelectedCharacter(character);
    setDraft(character);
    setIsSetupOpen(false);
    setMessage(`${character.name} is ready for ${session.title}.`);
  }

  function newCharacter() {
    setSelectedCharacter(null);
    setDraft(makeDraft());
    setIsSetupOpen(true);
    setMessage('New character draft ready.');
  }

  function editCharacter() {
    setDraft(selectedCharacter ?? makeDraft());
    setIsSetupOpen(true);
  }

  async function attachCharacter(vaultCharacter: VaultCharacter) {
    setBusy(true);
    setMessage('');
    try {
      const sessionCharacter = await attachVaultCharacterToSession(vaultCharacter.id, session.id, user);
      onEnter(session, sessionCharacter);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not enter table with this character.');
    }
    setBusy(false);
  }

  async function useTemplate(template: Character) {
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
      setSelectedCharacter(saved);
      setDraft(saved);
      const sessionCharacter = await attachVaultCharacterToSession(saved.id, session.id, user);
      onEnter(session, sessionCharacter);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not use template.');
    }
    setBusy(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!hasUsableDraft) return;

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
      setSelectedCharacter(saved);
      setDraft(saved);
      setIsSetupOpen(false);
      const sessionCharacter = await attachVaultCharacterToSession(saved.id, session.id, user);
      onEnter(session, sessionCharacter);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save character.');
    }
    setBusy(false);
  }

  return (
    <div className="fw-backdrop" role="presentation">
      <section aria-modal="true" className="fw-modal" role="dialog" style={{ width: 'min(560px, 95vw)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="fw-modal__header">
          <div>
            <p className="fw-caption">Enter Table</p>
            <h2 className="fw-h2">Choose your character</h2>
            <small className="fw-caption">{session.title}</small>
          </div>
          <button aria-label="Cancel table entry" className="fw-btn fw-btn--icon" onClick={onCancel} type="button">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div style={{ padding: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="fw-card fw-card--elevated" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-4)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
              <p className="fw-caption">Selected for this table</p>
              <strong className="fw-body-sm">{selectedCharacter?.name ?? 'No character selected'}</strong>
              <p className="fw-caption">
                {selectedCharacter
                  ? `Lv ${selectedCharacter.level} ${selectedCharacter.ancestry} ${selectedCharacter.className}`
                  : 'Choose a saved hero, use a preset, or create a custom character.'}
              </p>
            </div>
            <button
              className="fw-btn fw-btn--primary"
              disabled={busy || !selectedCharacter}
              onClick={() => selectedCharacter && void attachCharacter(selectedCharacter)}
              type="button"
            >
              <Users size={16} aria-hidden="true" />
              Use Character
            </button>
          </div>

          {characters.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {characters.map((character) => (
                <button
                  className={`fw-btn fw-btn--ghost`}
                  data-selected={selectedCharacter?.id === character.id ? 'true' : undefined}
                  disabled={busy}
                  key={character.id}
                  onClick={() => selectCharacter(character)}
                  style={{
                    justifyContent: 'flex-start',
                    gap: 'var(--sp-3)',
                    ...(selectedCharacter?.id === character.id ? { borderColor: 'var(--accent)', color: 'var(--ink-100)' } : {}),
                  }}
                  type="button"
                >
                  <Users size={16} aria-hidden="true" />
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
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

          <div>
            <p className="fw-caption" style={{ marginBottom: 'var(--sp-2)' }}>Quick Heroes</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)' }}>
              {characterTemplates.map((template) => (
                <button
                  className="fw-btn fw-btn--ghost"
                  disabled={busy}
                  key={template.id}
                  onClick={() => void useTemplate(template)}
                  style={{ justifyContent: 'flex-start', gap: 'var(--sp-3)' }}
                  type="button"
                >
                  <Users size={16} aria-hidden="true" />
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                    <strong>{template.name}</strong>
                    <small className="fw-caption">
                      Lv {template.level} {template.ancestry} {template.className}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <button className="fw-btn fw-btn--ghost" disabled={busy} onClick={newCharacter} type="button">
              <UserPlus size={17} aria-hidden="true" />
              Custom Character
            </button>
            <button className="fw-btn fw-btn--ghost" disabled={busy || !selectedCharacter} onClick={editCharacter} type="button">
              <Pencil size={17} aria-hidden="true" />
              Adjust Selected
            </button>
          </div>

          {isSetupOpen ? (
            <form style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }} onSubmit={submit}>
              <hr className="fw-divider" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
                <div className="fw-field">
                  <label className="fw-field__label">Name</label>
                  <input
                    className="fw-input"
                    disabled={busy}
                    onChange={(event) => updateField('name', event.target.value)}
                    placeholder="Character name"
                    value={draft.name}
                  />
                </div>
                <div className="fw-field">
                  <label className="fw-field__label">Level</label>
                  <input
                    className="fw-input fw-input--mono"
                    disabled={busy}
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
                    disabled={busy}
                    onChange={(event) => updateField('ancestry', event.target.value)}
                    placeholder="Human, Elf, Dwarf"
                    value={draft.ancestry}
                  />
                </div>
                <div className="fw-field">
                  <label className="fw-field__label">Class</label>
                  <input
                    className="fw-input"
                    disabled={busy}
                    onChange={(event) => updateField('className', event.target.value)}
                    placeholder="Fighter, Wizard, Rogue"
                    value={draft.className}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
                <div className="fw-field" style={{ flex: 1 }}>
                  <label className="fw-field__label">
                    <Shield size={13} aria-hidden="true" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    AC
                  </label>
                  <input
                    aria-label="Vault armor class"
                    className="fw-input fw-input--mono"
                    disabled={busy}
                    max={30}
                    min={1}
                    onChange={updateNumber('armorClass', 1, 30)}
                    style={{ textAlign: 'center' }}
                    type="number"
                    value={draft.armorClass}
                  />
                </div>
                <div className="fw-field" style={{ flex: 2 }}>
                  <label className="fw-field__label">
                    <Sparkles size={13} aria-hidden="true" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    HP
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                    <input
                      aria-label="Vault hit points"
                      className="fw-input fw-input--mono"
                      disabled={busy}
                      max={999}
                      min={0}
                      onChange={updateNumber('hitPoints', 0, 999)}
                      style={{ flex: 1, textAlign: 'center' }}
                      type="number"
                      value={draft.hitPoints}
                    />
                    <span className="fw-caption">/</span>
                    <input
                      aria-label="Vault max hit points"
                      className="fw-input fw-input--mono"
                      disabled={busy}
                      max={999}
                      min={1}
                      onChange={updateNumber('maxHitPoints', 1, 999)}
                      style={{ flex: 1, textAlign: 'center' }}
                      type="number"
                      value={draft.maxHitPoints}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--sp-2)' }}>
                {Object.entries(draft.abilities).map(([key, score]) => (
                  <div className="fw-field" key={key} style={{ alignItems: 'center', textAlign: 'center' }}>
                    <label className="fw-field__label" style={{ textAlign: 'center' }}>{abilityLabels[key as AbilityKey]}</label>
                    <input
                      aria-label={`Vault ${abilityLabels[key as AbilityKey]}`}
                      className="fw-input fw-input--mono"
                      disabled={busy}
                      max={30}
                      min={1}
                      onChange={updateAbility(key as AbilityKey)}
                      style={{ textAlign: 'center' }}
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
                  disabled={busy}
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
                <button className="fw-btn fw-btn--ghost" disabled={busy} onClick={newCharacter} type="button">
                  <UserPlus size={17} aria-hidden="true" />
                  New
                </button>
                <button className="fw-btn fw-btn--primary" disabled={busy || !hasUsableDraft} type="submit">
                  <Save size={17} aria-hidden="true" />
                  {busy ? 'Saving...' : 'Save and Enter'}
                </button>
              </div>
            </form>
          ) : null}

          {message ? <p className="fw-caption">{message}</p> : null}
        </div>
      </section>
    </div>
  );
}
