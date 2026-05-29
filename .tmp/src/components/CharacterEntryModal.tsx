import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { demoCharacter } from '../data/demo';
import { createEmptyInventory, inventoryFromNames } from '../lib/inventory';
import { attachVaultCharacterToSession, listVaultCharacters, saveVaultCharacter } from '../lib/characters';
import type { AbilityKey, Character, GameSession, VaultCharacter } from '../types';
import { Icon } from './ui/Icons';
import { Card, CardHead, Field, Tile } from './ui/Primitives';

/* ── Constants ─────────────────────────────────────────── */

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_LABELS: Record<AbilityKey, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
};

const RACES = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Tiefling', 'Half-Orc', 'Gnome', 'Dragonborn'];

const CLASSES: { name: string; icon: string; desc: string }[] = [
  { name: 'Fighter',  icon: 'sword',    desc: 'Master of arms and tactics' },
  { name: 'Wizard',   icon: 'wand',     desc: 'Scholar of arcane secrets' },
  { name: 'Rogue',    icon: 'eye',      desc: 'Shadow and subterfuge' },
  { name: 'Cleric',   icon: 'shield',   desc: 'Divine conduit and healer' },
  { name: 'Ranger',   icon: 'compass',  desc: 'Hunter of the wild places' },
  { name: 'Bard',     icon: 'sparkles', desc: 'Weaver of magic and story' },
  { name: 'Paladin',  icon: 'crown',    desc: 'Oath-bound holy warrior' },
  { name: 'Druid',    icon: 'flame',    desc: 'Voice of the living world' },
];

const BACKGROUNDS = [
  'Acolyte', 'Criminal', 'Folk Hero', 'Noble',
  'Outlander', 'Sage', 'Soldier', 'Urchin',
];

const GEAR_ITEMS = [
  { id: 'rapier',   icon: 'sword',    name: 'Rapier',           type: 'Weapon' },
  { id: 'leather',  icon: 'shield',   name: 'Leather Armour',   type: 'Armour' },
  { id: 'patron',   icon: 'flame',    name: "Patron's Gift",    type: 'Focus'  },
  { id: 'tome',     icon: 'sparkles', name: 'Arcane Tome',      type: 'Lore'   },
  { id: 'pack',     icon: 'bag',      name: "Explorer's Pack",  type: 'Pack'   },
  { id: 'tools',    icon: 'scroll',   name: "Thieves' Tools",   type: 'Tools'  },
  { id: 'kit',      icon: 'bag',      name: "Adventurer's Kit", type: 'Pack'   },
  { id: 'dagger',   icon: 'sword',    name: 'Silver Dagger',    type: 'Weapon' },
];

const ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
];

/* ── Helpers ───────────────────────────────────────────── */

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function mod(score: number): string {
  const m = Math.floor((score - 10) / 2);
  return (m >= 0 ? '+' : '') + m;
}

function makeDraft(): Character {
  return {
    ...demoCharacter,
    id: 'char-draft',
    name: '',
    ancestry: '',
    className: '',
    background: '',
    alignment: '',
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

const QUICK_TEMPLATES: Character[] = [
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

/* ── Types ─────────────────────────────────────────────── */

type CharacterEntryModalProps = {
  session: GameSession;
  user: User;
  onCancel: () => void;
  onEnter: (session: GameSession, character: Character) => void;
};

type View = 'select' | 'edit';
type Tab = 'identity' | 'stats' | 'back' | 'gear';

/* ── Component ─────────────────────────────────────────── */

export function CharacterEntryModal({ session, user, onCancel, onEnter }: CharacterEntryModalProps) {
  /* State */
  const [characters, setCharacters] = useState<VaultCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<VaultCharacter | null>(null);
  const [draft, setDraft] = useState<Character>(makeDraft());
  const [view, setView] = useState<View>('select');
  const [tab, setTab] = useState<Tab>('identity');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedGear, setSelectedGear] = useState<string[]>([]);
  const [ideal, setIdeal] = useState('');
  const [bond, setBond] = useState('');
  const [flaw, setFlaw] = useState('');
  const [trait, setTrait] = useState('');

  const hasUsableDraft = useMemo(
    () => Boolean(draft.name.trim() && draft.className.trim() && draft.ancestry.trim()),
    [draft],
  );

  /* Load vault characters */
  useEffect(() => {
    let alive = true;
    listVaultCharacters(user)
      .then((rows) => {
        if (!alive) return;
        setCharacters(rows);
        if (rows.length) setSelectedCharacter(rows[0]);
      })
      .catch((error: Error) => {
        if (alive) setMessage(error.message);
      });
    return () => { alive = false; };
  }, [user]);

  /* Field helpers */
  function updateField<K extends keyof Character>(key: K, value: Character[K]) {
    setDraft((c) => ({ ...c, [key]: value }));
  }

  function updateAbility(key: AbilityKey, delta: number) {
    setDraft((c) => ({
      ...c,
      abilities: { ...c.abilities, [key]: clamp(c.abilities[key] + delta, 1, 20) },
    }));
  }

  function updateAbilityInput(key: AbilityKey) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const value = clamp(e.target.valueAsNumber, 1, 20);
      setDraft((c) => ({ ...c, abilities: { ...c.abilities, [key]: value } }));
    };
  }

  function toggleGear(id: string) {
    setSelectedGear((g) => g.includes(id) ? g.filter((x) => x !== id) : [...g, id]);
  }

  /* Navigation */
  function openCreate() {
    setDraft(makeDraft());
    setSelectedCharacter(null);
    setSelectedGear([]);
    setIdeal(''); setBond(''); setFlaw(''); setTrait('');
    setTab('identity');
    setView('edit');
  }

  function openEdit(character: VaultCharacter) {
    setDraft(character);
    setSelectedCharacter(character);
    const traits = character.personalityTraits ?? [];
    setIdeal(traits[0] ?? '');
    setBond(traits[1] ?? '');
    setFlaw(traits[2] ?? '');
    setTrait(traits[3] ?? '');
    setTab('identity');
    setView('edit');
  }

  /* Supabase actions — preserved verbatim from original */
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
        { ...template, id: 'char-demo-template', hitPoints: Math.min(template.hitPoints, template.maxHitPoints) },
        user,
      );
      setCharacters((c) => [saved, ...c.filter((x) => x.id !== saved.id)]);
      const sessionCharacter = await attachVaultCharacterToSession(saved.id, session.id, user);
      onEnter(session, sessionCharacter);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not use template.');
    }
    setBusy(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!hasUsableDraft) return;
    setBusy(true);
    setMessage('');
    try {
      const saved = await saveVaultCharacter(
        {
          ...draft,
          hitPoints: Math.min(draft.hitPoints, draft.maxHitPoints),
          skills: draft.skills.map((s) => s.trim()).filter(Boolean),
          personalityTraits: [ideal, bond, flaw, trait].filter(Boolean),
          features: selectedGear.map((id) => GEAR_ITEMS.find((g) => g.id === id)?.name ?? id),
        },
        user,
      );
      setCharacters((c) => [saved, ...c.filter((x) => x.id !== saved.id)]);
      setSelectedCharacter(saved);
      const sessionCharacter = await attachVaultCharacterToSession(saved.id, session.id, user);
      onEnter(session, sessionCharacter);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save character.');
    }
    setBusy(false);
  }

  /* ── Render: Select View ───────────────────────────────── */
  if (view === 'select') {
    return (
      <div className="fw-scroll" style={{ flex: 1, height: '100vh', background: 'var(--bg, #0B0A10)', overflowY: 'auto' }}>
        <div className="fw-page">
          {/* Page header */}
          <div className="fw-page-head">
            <div>
              <p className="fw-eyebrow">{session.title}</p>
              <h1>Choose Your Character</h1>
              <p className="sub">Select a saved hero or forge a new one</p>
            </div>
            <div className="fw-page-head-actions">
              <button className="fw-btn fw-btn-ghost" onClick={onCancel} type="button">
                {Icon('chevL', { size: 15 })} Back
              </button>
              <button className="fw-btn fw-btn-gold" onClick={openCreate} type="button">
                {Icon('plus', { size: 15 })} Create New Character
              </button>
            </div>
          </div>

          {/* Vault characters */}
          {characters.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <p className="fw-eyebrow" style={{ marginBottom: 12 }}>Your Characters</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {characters.map((character) => (
                  <div
                    key={character.id}
                    className={`fw-char-card ${selectedCharacter?.id === character.id ? 'active' : ''}`}
                    onClick={() => setSelectedCharacter(character)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="fw-avatar lg">
                        {character.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--f-display)', fontSize: 16, color: 'var(--text)' }}>
                          {character.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--f-serif)', fontStyle: 'italic' }}>
                          Lv {character.level} {character.ancestry} {character.className}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'space-between', marginTop: 4 }}>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          HP <span style={{ color: 'var(--gold-bright)' }}>{character.hitPoints}</span>
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          AC <span style={{ color: 'var(--gold-bright)' }}>{character.armorClass}</span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="fw-btn fw-btn-ghost fw-btn-sm"
                          disabled={busy}
                          onClick={(e) => { e.stopPropagation(); openEdit(character); }}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="fw-btn fw-btn-gold fw-btn-sm"
                          disabled={busy}
                          onClick={(e) => { e.stopPropagation(); void attachCharacter(character); }}
                          type="button"
                        >
                          {busy ? '…' : 'Select'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Templates */}
          <div>
            <p className="fw-eyebrow" style={{ marginBottom: 12 }}>Quick Heroes</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {QUICK_TEMPLATES.map((template) => (
                <div key={template.id} className="fw-char-card" style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="fw-avatar" style={{ background: 'var(--surface-3)' }}>
                      {template.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontFamily: 'var(--f-display)', color: 'var(--text)' }}>
                        {template.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
                        Lv {template.level} {template.ancestry} {template.className}
                      </div>
                    </div>
                  </div>
                  <button
                    className="fw-btn fw-btn-ghost fw-btn-sm"
                    disabled={busy}
                    onClick={() => void useTemplate(template)}
                    style={{ width: '100%', marginTop: 8 }}
                    type="button"
                  >
                    {busy ? 'Entering…' : 'Use Hero'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {message && (
            <p style={{ marginTop: 16, fontSize: 12, color: 'var(--danger, #F87171)' }}>{message}</p>
          )}
        </div>
      </div>
    );
  }

  /* ── Render: Edit View (3-column prototype layout) ─────── */
  const selectedClass = CLASSES.find((c) => c.name === draft.className);
  const totalPoints = Object.values(draft.abilities).reduce((s, v) => s + v, 0);

  return (
    <form
      onSubmit={submit}
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg, #0B0A10)', overflow: 'hidden' }}
    >
      <div className="fw-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="fw-page">
          {/* Page header */}
          <div className="fw-page-head">
            <div>
              <p className="fw-eyebrow">Character Setup — {session.title}</p>
              <h1>{draft.name || 'New Character'}</h1>
              <p className="sub">Forge your identity before the session begins</p>
            </div>
            <div className="fw-page-head-actions">
              <button className="fw-btn fw-btn-ghost" onClick={() => setView('select')} type="button">
                {Icon('chevL', { size: 15 })} Back
              </button>
              <button className="fw-btn fw-btn-ghost" disabled={busy} onClick={openCreate} type="button">
                {Icon('plus', { size: 15 })} New Character
              </button>
              <button
                className="fw-btn fw-btn-gold"
                disabled={busy || !hasUsableDraft}
                type="submit"
              >
                {Icon('arrowR', { size: 15 })}
                {busy ? 'Entering…' : 'Enter Session'}
              </button>
            </div>
          </div>

          {/* 3-column grid */}
          <div className="fw-char-setup-grid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr 320px', gap: 20, alignItems: 'start' }}>

            {/* LEFT — Character Preview Card */}
            <div style={{ position: 'sticky', top: 20 }}>
              <div className="fw-card fw-card-elev fw-orn">
                <div className="fw-orn-c tl" /><div className="fw-orn-c tr" />
                <div className="fw-orn-c bl" /><div className="fw-orn-c br" />

                {/* Portrait */}
                <div style={{
                  height: 220,
                  background: 'linear-gradient(135deg, var(--surface-3, #251E33), var(--surface, #14111D))',
                  borderRadius: '8px 8px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    background: 'var(--surface-2, #1D1828)',
                    border: '2px solid var(--gold-deep, #8A6A2C)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 36,
                    fontFamily: 'var(--f-display)',
                    color: 'var(--gold-bright, #EAC074)',
                  }}>
                    {draft.name ? draft.name.slice(0, 1).toUpperCase() : '?'}
                  </div>
                </div>

                {/* Summary */}
                <div style={{ padding: 16, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 20, color: 'var(--text)' }}>
                    {draft.name || 'Unnamed Warden'}
                  </div>
                  <div style={{ fontSize: 13, fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--text-2)' }}>
                    {[draft.ancestry, draft.className, draft.level ? `Level ${draft.level}` : null].filter(Boolean).join(' · ') || 'Choose race & class'}
                  </div>

                  {/* Divider with "Vitals" */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border-soft)' }} />
                    <span className="fw-eyebrow">Vitals</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border-soft)' }} />
                  </div>

                  {/* Vitals grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div className="fw-vital">
                      <span className="fw-vital-label">HP</span>
                      <span className="fw-vital-value">{draft.hitPoints}</span>
                      <span style={{ fontSize: 9, color: 'var(--text-3)' }}>/ {draft.maxHitPoints}</span>
                    </div>
                    <div className="fw-vital">
                      <span className="fw-vital-label">AC</span>
                      <span className="fw-vital-value">{draft.armorClass}</span>
                    </div>
                    <div className="fw-vital">
                      <span className="fw-vital-label">SPD</span>
                      <span className="fw-vital-value">{draft.speed ?? 30}</span>
                      <span style={{ fontSize: 9, color: 'var(--text-3)' }}>ft</span>
                    </div>
                  </div>

                  {/* Alignment pill */}
                  {draft.alignment && (
                    <div style={{ marginTop: 4 }}>
                      <span className="fw-pill fw-pill-dim" style={{ fontSize: 11 }}>
                        {draft.alignment}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CENTER — Tabbed Editor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* Tabs */}
              <div className="fw-tabs" style={{ marginBottom: 16 }}>
                {(['identity', 'stats', 'back', 'gear'] as Tab[]).map((t) => (
                  <button
                    key={t}
                    className={`fw-tab ${tab === t ? 'active' : ''}`}
                    onClick={() => setTab(t)}
                    type="button"
                  >
                    {{ identity: 'Identity', stats: 'Ability Scores', back: 'Background', gear: 'Starting Gear' }[t]}
                  </button>
                ))}
              </div>

              {/* Identity Tab */}
              {tab === 'identity' && (
                <div className="fw-fade" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Name & Lineage */}
                  <Card>
                    <CardHead icon="user" title="Name & Lineage" />
                    <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
                        <Field label="Character Name">
                          <input
                            className="fw-input"
                            disabled={busy}
                            onChange={(e) => updateField('name', e.target.value)}
                            placeholder="Enter your character's name"
                            style={{ width: '100%' }}
                            value={draft.name}
                          />
                        </Field>
                        <Field label="Alignment">
                          <select
                            className="fw-input"
                            disabled={busy}
                            onChange={(e) => updateField('alignment', e.target.value)}
                            style={{ width: '100%' }}
                            value={draft.alignment}
                          >
                            <option value="">Select…</option>
                            {ALIGNMENTS.map((a) => (
                              <option key={a} value={a}>{a}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <Field label="Race / Lineage">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {RACES.map((race) => (
                            <button
                              key={race}
                              className={`fw-btn fw-btn-sm ${draft.ancestry === race ? 'fw-btn-gold' : 'fw-btn-ghost'}`}
                              disabled={busy}
                              onClick={() => updateField('ancestry', race)}
                              type="button"
                            >
                              {race}
                            </button>
                          ))}
                        </div>
                      </Field>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <Field label="HP">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input
                              className="fw-input"
                              disabled={busy}
                              max={999}
                              min={0}
                              onChange={(e) => updateField('hitPoints', clamp(e.target.valueAsNumber, 0, 999))}
                              style={{ flex: 1, textAlign: 'center' }}
                              type="number"
                              value={draft.hitPoints}
                            />
                            <span style={{ color: 'var(--text-3)', fontSize: 12 }}>/</span>
                            <input
                              className="fw-input"
                              disabled={busy}
                              max={999}
                              min={1}
                              onChange={(e) => updateField('maxHitPoints', clamp(e.target.valueAsNumber, 1, 999))}
                              style={{ flex: 1, textAlign: 'center' }}
                              type="number"
                              value={draft.maxHitPoints}
                            />
                          </div>
                        </Field>
                        <Field label="Armor Class">
                          <input
                            className="fw-input"
                            disabled={busy}
                            max={30}
                            min={1}
                            onChange={(e) => updateField('armorClass', clamp(e.target.valueAsNumber, 1, 30))}
                            style={{ textAlign: 'center' }}
                            type="number"
                            value={draft.armorClass}
                          />
                        </Field>
                      </div>
                    </div>
                  </Card>

                  {/* Class Picker */}
                  <Card>
                    <CardHead icon="sword" title="Class" />
                    <div className="fw-card-body">
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                        {CLASSES.map((cls) => (
                          <Tile
                            key={cls.name}
                            active={draft.className === cls.name}
                            desc={cls.desc}
                            icon={cls.icon}
                            onClick={() => updateField('className', cls.name)}
                            title={cls.name}
                          />
                        ))}
                      </div>
                      {selectedClass && (
                        <div style={{
                          marginTop: 12,
                          padding: 12,
                          background: 'var(--surface-2)',
                          borderRadius: 6,
                          border: '1px solid var(--border-soft)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                        }}>
                          <div style={{
                            width: 44,
                            height: 44,
                            background: 'var(--surface-3)',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--gold)',
                          }}>
                            {Icon(selectedClass.icon, { size: 20 })}
                          </div>
                          <div>
                            <div style={{ fontFamily: 'var(--f-display)', fontSize: 14, color: 'var(--text)' }}>
                              {selectedClass.name}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>
                              {selectedClass.desc}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {/* Ability Scores Tab */}
              {tab === 'stats' && (
                <div className="fw-fade" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Card>
                    <CardHead icon="sparkles" title="Ability Scores" />
                    <div className="fw-card-body">
                      <div className="fw-ability-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                        {ABILITY_KEYS.map((key) => {
                          const score = draft.abilities[key];
                          return (
                            <div key={key} className="fw-stat-box-setup">
                              <span className="fw-eyebrow">{ABILITY_LABELS[key]}</span>
                              <input
                                className="fw-stat-score"
                                disabled={busy}
                                max={20}
                                min={1}
                                onChange={updateAbilityInput(key)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  textAlign: 'center',
                                  width: '100%',
                                  color: 'var(--text)',
                                  fontFamily: 'var(--f-display)',
                                  fontSize: 28,
                                  fontWeight: 600,
                                  outline: 'none',
                                }}
                                type="number"
                                value={score}
                              />
                              <span className="fw-stat-mod">{mod(score)}</span>
                              <div className="fw-stat-btns">
                                <button
                                  className="fw-btn fw-btn-icon fw-btn-sm"
                                  disabled={busy || score <= 1}
                                  onClick={() => updateAbility(key, -1)}
                                  type="button"
                                >
                                  {Icon('minus', { size: 12 })}
                                </button>
                                <button
                                  className="fw-btn fw-btn-icon fw-btn-sm"
                                  disabled={busy || score >= 20}
                                  onClick={() => updateAbility(key, 1)}
                                  type="button"
                                >
                                  {Icon('plus', { size: 12 })}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{
                        marginTop: 12,
                        padding: '8px 12px',
                        background: 'var(--surface-2)',
                        borderRadius: 6,
                        border: '1px solid var(--border-soft)',
                        fontSize: 12,
                        color: 'var(--text-3)',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}>
                        <span>Total ability sum: <span style={{ color: 'var(--gold)' }}>{totalPoints}</span></span>
                        <span style={{ fontStyle: 'italic' }}>Standard array total: 73</span>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Background Tab */}
              {tab === 'back' && (
                <div className="fw-fade" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Card>
                    <CardHead icon="scroll" title="Background" />
                    <div className="fw-card-body">
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                        {BACKGROUNDS.map((bg) => (
                          <Tile
                            key={bg}
                            active={draft.background === bg}
                            onClick={() => updateField('background', bg)}
                            title={bg}
                          />
                        ))}
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <CardHead icon="book" title="Personal History" />
                    <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <Field label="Backstory">
                        <textarea
                          className="fw-input fw-textarea"
                          disabled={busy}
                          onChange={(e) => updateField('backstory', e.target.value)}
                          placeholder="Describe your character's history…"
                          rows={5}
                          style={{ width: '100%', resize: 'vertical' }}
                          value={draft.backstory}
                        />
                      </Field>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="Ideal">
                          <input className="fw-input" disabled={busy} onChange={(e) => setIdeal(e.target.value)} placeholder="What drives you?" style={{ width: '100%' }} value={ideal} />
                        </Field>
                        <Field label="Bond">
                          <input className="fw-input" disabled={busy} onChange={(e) => setBond(e.target.value)} placeholder="What ties you to others?" style={{ width: '100%' }} value={bond} />
                        </Field>
                        <Field label="Flaw">
                          <input className="fw-input" disabled={busy} onChange={(e) => setFlaw(e.target.value)} placeholder="Your greatest weakness?" style={{ width: '100%' }} value={flaw} />
                        </Field>
                        <Field label="Trait">
                          <input className="fw-input" disabled={busy} onChange={(e) => setTrait(e.target.value)} placeholder="A distinctive trait?" style={{ width: '100%' }} value={trait} />
                        </Field>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Starting Gear Tab */}
              {tab === 'gear' && (
                <div className="fw-fade">
                  <Card>
                    <CardHead icon="bag" title="Starting Gear" />
                    <div className="fw-card-body">
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {GEAR_ITEMS.map((item) => {
                          const active = selectedGear.includes(item.id);
                          return (
                            <div
                              key={item.id}
                              className={`fw-gear-item ${active ? 'active' : ''}`}
                              onClick={() => toggleGear(item.id)}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="fw-gear-icon" style={active ? { borderColor: 'var(--arcane)', color: 'var(--arcane-bright)' } : { color: 'var(--text-3)' }}>
                                {Icon(item.icon, { size: 16 })}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--f-display)' }}>
                                  {item.name}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{item.type}</div>
                              </div>
                              <div style={{ width: 18, height: 18, borderRadius: 3, border: `1px solid ${active ? 'var(--arcane)' : 'var(--border)'}`, background: active ? 'rgba(124,58,237,0.3)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {active && Icon('check', { size: 11, color: 'var(--arcane-bright)' })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Error message */}
              {message && (
                <p style={{ fontSize: 12, color: 'var(--danger, #F87171)', marginTop: 8 }}>{message}</p>
              )}
            </div>

            {/* RIGHT — Party + Pacts */}
            <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Your Party */}
              <Card>
                <CardHead icon="users" title="Your Party" />
                <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                    <div className="fw-avatar dm" style={{ fontSize: 11 }}>DM</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--f-display)' }}>AI Warden</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Dungeon Master</div>
                    </div>
                    <span className="fw-pill fw-pill-arcane" style={{ fontSize: 10 }}>Live</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                    <div className="fw-avatar">{user.email?.slice(0, 1).toUpperCase() ?? 'Y'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--f-display)' }}>
                        {draft.name || 'You'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
                        {draft.className || 'Setting up…'}
                      </div>
                    </div>
                    <span className="fw-pill fw-pill-dim" style={{ fontSize: 10 }}>You</span>
                  </div>
                  {/* Invite slot */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px',
                    border: '1px dashed var(--border-soft)',
                    borderRadius: 6,
                    color: 'var(--text-3)',
                    fontSize: 12,
                    cursor: 'default',
                  }}>
                    {Icon('plus', { size: 14 })} Waiting for players
                  </div>
                </div>
              </Card>

              {/* Session Pacts */}
              <Card>
                <CardHead icon="scroll" title="Session Pacts" />
                <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    'I will respect the narrative and other players',
                    'I accept the consequences of my character\'s choices',
                    'I will engage with the world as it is presented',
                    'I acknowledge the AI Warden as final arbiter',
                  ].map((pact, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 14,
                        height: 14,
                        border: '1px solid var(--gold-deep)',
                        borderRadius: 3,
                        background: 'rgba(214,168,79,0.15)',
                        flexShrink: 0,
                        marginTop: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {Icon('check', { size: 9, color: 'var(--gold)' })}
                      </div>
                      <span style={{ fontSize: 12, fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--text-2)', lineHeight: 1.5 }}>
                        {pact}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

          </div>
        </div>
      </div>
    </form>
  );
}
