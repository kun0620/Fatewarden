import React, { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Icon } from './ui/Icons';
import { Card, CardHead, Field, Seg, Tile } from './ui/Primitives';
import { attachVaultCharacterToSession, saveVaultCharacter } from '../lib/characters';
import {
  finalizeCharacter,
  getClassStartingEquipment,
  inventoryFromEquipmentNames,
  makeCharacterDraft,
} from '../lib/characterBuilder';
import { classes, getClassByName } from '../data/classes';
import { draconicAncestries, getAllTraits, getTotalAbilityBonus, getDraconicAncestry, races } from '../data/races';
import type { AbilityKey, Character, GameSession } from '../types';

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const STEPS = [
  { id: 'race',      label: 'Race',       icon: 'user',   desc: 'Lineage and blood' },
  { id: 'class',     label: 'Class',      icon: 'sword',  desc: 'Calling and craft' },
  { id: 'abilities', label: 'Abilities',  icon: 'dice',   desc: 'Strength of the dice' },
  { id: 'back',      label: 'Background', icon: 'scroll', desc: 'Where you come from' },
  { id: 'gear',      label: 'Equipment',  icon: 'bag',    desc: 'What you carry' },
  { id: 'review',    label: 'Review',     icon: 'check',  desc: 'Bind the pact' },
] as const;
type StepId = typeof STEPS[number]['id'];

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_LABELS: Record<AbilityKey, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
};

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const POINT_COST: Record<number, number> = { 8:0, 9:1, 10:2, 11:3, 12:4, 13:5, 14:7, 15:9 };

const BG_PRESETS: Record<string, { traits: string; ideals: string; bonds: string; flaws: string }> = {
  Acolyte:   { traits: 'I quote scripture for every occasion.',        ideals: 'Faith is the only honest covenant.',            bonds: 'I will rebuild my fallen temple.',           flaws: 'I am suspicious of strangers.' },
  Charlatan: { traits: 'I love a good disguise.',                      ideals: 'Nothing is more beautiful than a perfect con.', bonds: 'I owe a debt to a forgotten patron.',        flaws: "I can't resist a mark." },
  'Folk Hero':{ traits: 'I judge people by their actions, not words.', ideals: 'Justice. The downtrodden must rise.',            bonds: 'My home village shaped me.',                flaws: 'I am stubborn to a fault.' },
  Noble:     { traits: 'My eloquence is a weapon.',                    ideals: 'Responsibility. I serve those beneath my station.', bonds: 'My family name is everything.',          flaws: 'I cannot believe I am ever wrong.' },
  Outlander: { traits: 'I count my own heartbeats when nervous.',      ideals: 'A bargain is the only honest covenant.',        bonds: 'My sister, Lira, must never know what I gave for her.', flaws: 'I keep returning to the brass censer when the dreams come.' },
  Sage:      { traits: 'I read until the candle dies, then I light another.', ideals: 'Knowledge above all.',                  bonds: "My research is my life's work.",            flaws: 'I miss the obvious while chasing the obscure.' },
  Soldier:   { traits: "I follow orders, but I won't follow them off a cliff.", ideals: 'Discipline keeps the line.',            bonds: 'I would die for my unit.',                  flaws: 'I freeze at the memory of one bad day.' },
  Hermit:    { traits: 'I speak slowly. The world rushes enough.',     ideals: 'Solitude is the truest teacher.',              bonds: 'What I learned must be told.',              flaws: 'I find people exhausting.' },
};

/* ------------------------------------------------------------------ */
/* Wizard state                                                         */
/* ------------------------------------------------------------------ */

type AbilityMap = Record<AbilityKey, number>;
type RacialBonus = Partial<Record<AbilityKey, number>>;

interface WizardData {
  name: string;
  pronouns: string;
  playerName: string;
  campaignName: string;
  race: string;
  subrace: string;
  draconicAncestry: string;
  cls: string;
  subclass: string;
  background: string;
  alignment: string;
  method: 'Standard Array' | 'Point buy' | 'Roll 4d6' | 'Manual';
  abilities: AbilityMap;
  racialBonus: RacialBonus;
  skills: string[];
  gearChoice: 'starting' | 'gold';
  startingGold: number;
  traits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  backstory: string;
}

const DEFAULT_DATA: WizardData = {
  name: '',
  pronouns: 'they / them',
  playerName: '',
  campaignName: '',
  race: 'Tiefling',
  subrace: '',
  draconicAncestry: '',
  cls: 'Warlock',
  subclass: '',
  background: 'Outlander',
  alignment: 'Chaotic Neutral',
  method: 'Point buy',
  abilities: { str: 9, dex: 14, con: 12, int: 13, wis: 11, cha: 16 },
  racialBonus: { cha: 2, int: 1 },
  skills: ['Arcana', 'Deception'],
  gearChoice: 'starting',
  startingGold: 80,
  traits: 'I count my own heartbeats when nervous.',
  ideals: 'A bargain is the only honest covenant.',
  bonds: 'My sister, Lira, must never know what I gave for her.',
  flaws: 'I keep returning to the brass censer when the dreams come.',
  backstory: 'Born to a sept of cinder-priests in the Reach.',
};

function findRaceByName(name: string) {
  return races.find((race) => race.name.toLowerCase() === name.toLowerCase()) ?? races[0]!;
}

function findSubraceByName(raceName: string, subraceName: string) {
  const race = findRaceByName(raceName);
  if (!subraceName) return undefined;
  return race.subraces.find((subrace) => subrace.name.toLowerCase() === subraceName.toLowerCase());
}

function findClassByWizardName(name: string) {
  return getClassByName(name) ?? classes[0]!;
}

function formatAbilityBonus(bonus: RacialBonus) {
  const parts = ABILITY_KEYS
    .filter((key) => bonus[key])
    .map((key) => `+${bonus[key]} ${ABILITY_LABELS[key]}`);
  return parts.length ? parts.join(', ') : 'No fixed bonus';
}

function wizardRaceBonus(raceName: string, subraceName: string): RacialBonus {
  const race = findRaceByName(raceName);
  const subrace = findSubraceByName(race.name, subraceName);
  return getTotalAbilityBonus(race.id, subrace?.id);
}

function wizardTraits(raceName: string, subraceName: string) {
  const race = findRaceByName(raceName);
  const subrace = findSubraceByName(race.name, subraceName);
  return getAllTraits(race.id, subrace?.id);
}

function getXpThreshold(level: number): number {
  const thresholds = [
    0, 300, 900, 2700, 6500, 14000,
    23000, 34000, 48000, 64000, 85000,
    100000, 120000, 140000, 165000,
    195000, 225000, 265000, 305000, 355000,
  ];
  return thresholds[level] ?? 355000;
}

function buildCharacterFromWizard(data: WizardData, userId: string): Character {
  const race = findRaceByName(data.race);
  const subrace = findSubraceByName(race.name, data.subrace);
  const classData = findClassByWizardName(data.cls);
  const selectedEquipment = data.gearChoice === 'starting' ? getClassStartingEquipment(classData) : [];
  const baseDraft = makeCharacterDraft();
  const inventory =
    data.gearChoice === 'starting'
      ? inventoryFromEquipmentNames(selectedEquipment, data.abilities.str)
      : baseDraft.inventory;
  const personality = {
    traits: data.traits,
    ideals: data.ideals,
    bonds: data.bonds,
    flaws: data.flaws,
    backstory: data.backstory,
  };

  return finalizeCharacter({
    ...baseDraft,
    id: crypto.randomUUID(),
    userId,
    name: data.name.trim() || 'Unnamed Warden',
    pronouns: data.pronouns,
    playerName: data.playerName.trim() || undefined,
    campaignName: data.campaignName.trim() || undefined,
    ancestry: race.name,
    race: race.name,
    subrace: subrace?.name ?? '',
    draconicAncestry: race.id === 'dragonborn' ? data.draconicAncestry : undefined,
    className: classData.name,
    subclass: data.subclass,
    level: 1,
    xp: 0,
    xpThreshold: getXpThreshold(1),
    background: data.background,
    alignment: data.alignment,
    languages: [...race.languages],
    proficiencies: [],
    abilities: data.abilities,
    skills: data.skills,
    inventory,
    features: [],
    spells: [],
    spellsKnown: [],
    backstory: data.backstory,
    personality,
    personalityTraits: [data.traits, data.ideals, data.bonds, data.flaws].filter(Boolean),
    savingThrows: classData.savingThrows,
    systemData: {
      ...baseDraft.systemData,
      creation: {
        raceId: race.id,
        subraceId: subrace?.id,
        draconicAncestryId: race.id === 'dragonborn' ? data.draconicAncestry : undefined,
        classId: classData.id,
        abilityMethod:
          data.method === 'Standard Array'
            ? 'standard-array'
            : data.method === 'Point buy'
              ? 'point-buy'
              : 'manual',
        baseAbilities: data.abilities,
        skillChoices: data.skills,
        equipmentMode: data.gearChoice === 'starting' ? 'class' : 'gold',
        selectedEquipment,
        goldRolled: data.gearChoice === 'gold' ? data.startingGold : undefined,
      },
    },
  });
}

/* ------------------------------------------------------------------ */
/* Main component                                                       */
/* ------------------------------------------------------------------ */

interface CharacterWizardScreenProps {
  user: User | null;
  onBack: () => void;
  onSaved?: () => void;
  session?: GameSession | null;
  onBound?: (session: GameSession, character: Character) => void;
}

export function CharacterWizardScreen({ user, onBack, onSaved, session, onBound }: CharacterWizardScreenProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [data, setData] = useState<WizardData>(DEFAULT_DATA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setField = <K extends keyof WizardData>(k: K, v: WizardData[K]) =>
    setData(d => ({ ...d, [k]: v }));

  const step = STEPS[stepIdx];

  const next = () => setStepIdx(i => Math.min(STEPS.length - 1, i + 1));
  const prev = () => setStepIdx(i => Math.max(0, i - 1));

  async function bindPact() {
    if (!user) { onSaved?.(); onBack(); return; }
    setSaving(true);
    setError('');
    try {
      const char = buildCharacterFromWizard(data, user.id);
      const saved = await saveVaultCharacter(char, user);
      if (session) {
        const attached = await attachVaultCharacterToSession(saved.id, session.id, user);
        onBound?.(session, attached);
        return;
      }
      onSaved?.();
      onBack();
    } catch (err) {
      console.error('Save failed', err);
      setError(err instanceof Error ? err.message : 'Could not bind this pact.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page" style={{ maxWidth: 1480, paddingTop: 18 }}>
        {/* HEADER */}
        <div className="fw-wizard-head">
          <div>
            <div className="fw-eyebrow" style={{ color: 'var(--gold)' }}>
              Forge a Warden · Step {stepIdx + 1} of {STEPS.length}
            </div>
            <h1 className="fw-display" style={{ fontSize: 30, color: 'var(--text)', margin: '4px 0 4px', letterSpacing: '0.04em' }}>
              {step.label}
            </h1>
            <div style={{ fontSize: 14, color: 'var(--text-3)', fontStyle: 'italic', fontFamily: 'var(--f-serif)' }}>
              {step.desc}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="fw-btn fw-btn-ghost" onClick={onBack}>
              {Icon('chevL', { size: 12 })} {session ? 'Choose character' : 'Vault'}
            </button>
            <button className="fw-btn fw-btn-ghost" disabled>
              {Icon('scroll', { size: 12 })} Save draft
            </button>
          </div>
        </div>
        {error && (
          <div className="fw-card" style={{ marginBottom: 12, padding: 12, color: 'var(--blood-bright)' }}>
            {error}
          </div>
        )}

        {/* STEPPER */}
        <div className="fw-stepper">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStepIdx(i)}
              className={'fw-step ' + (i === stepIdx ? 'active ' : '') + (i < stepIdx ? 'done ' : '')}
            >
              <span className="fw-step-bullet">
                {i < stepIdx ? Icon('check', { size: 11 }) : <span>{i + 1}</span>}
              </span>
              <div style={{ textAlign: 'left' }}>
                <div className="fw-step-label">{s.label}</div>
                <div className="fw-step-desc">{s.desc}</div>
              </div>
              {i < STEPS.length - 1 && <span className="fw-step-line" />}
            </button>
          ))}
        </div>

        {/* MAIN GRID */}
        <div className="fw-wizard-grid">
          <div className="fw-fade">
            {step.id === 'race'      && <StepRace data={data} setField={setField} />}
            {step.id === 'class'     && <StepClass data={data} setField={setField} />}
            {step.id === 'abilities' && <StepAbilities data={data} setField={setField} setData={setData} />}
            {step.id === 'back'      && <StepBackground data={data} setField={setField} />}
            {step.id === 'gear'      && <StepGear data={data} setField={setField} />}
            {step.id === 'review'    && <StepReview data={data} setField={setField} />}
          </div>

          {/* Sticky preview */}
          <CharPreview data={data} />
        </div>

        {/* FOOTER */}
        <div className="fw-wizard-foot">
          <button className="fw-btn fw-btn-ghost" onClick={prev} disabled={stepIdx === 0}>
            {Icon('chevL', { size: 12 })} Back
          </button>
          <div style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-3)' }}>
            {stepIdx + 1} / {STEPS.length}
          </div>
          {stepIdx === STEPS.length - 1 ? (
            <button className="fw-btn fw-btn-gold fw-btn-lg" onClick={bindPact} disabled={saving}>
              {saving ? 'Binding…' : <>{Icon('check', { size: 13 })} Bind the pact</>}
            </button>
          ) : (
            <button className="fw-btn fw-btn-gold" onClick={next}>
              Next · {STEPS[stepIdx + 1].label} {Icon('chevR', { size: 12 })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sticky preview                                                       */
/* ------------------------------------------------------------------ */

function CharPreview({ data }: { data: WizardData }) {
  const mod = (v: number) => Math.floor((v - 10) / 2);
  const sgn = (v: number) => (v >= 0 ? '+' + v : String(v));
  const final = (k: AbilityKey) => (data.abilities[k] ?? 10) + (data.racialBonus[k] ?? 0);
  const preview = buildCharacterFromWizard(data, 'preview-user');

  return (
    <div style={{ position: 'sticky', top: 20 }}>
      <Card elev className="fw-orn" style={{ overflow: 'hidden' }}>
        <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
        <span className="fw-orn-c bl" /><span className="fw-orn-c br" />

        {/* Portrait hero */}
        <div style={{ position: 'relative', height: 200, background: 'linear-gradient(180deg, #1a1428 0%, #08070d 100%)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, rgba(124,58,237,0.42), transparent 60%)' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <div style={{
              width: 110, height: 110, borderRadius: '50%',
              background: 'linear-gradient(135deg, #2a1f3d, #0c0a14)',
              border: '2px solid var(--gold-deep)',
              boxShadow: '0 0 40px -10px rgba(214,168,79,0.6)',
              display: 'grid', placeItems: 'center',
              fontFamily: 'var(--f-display)', fontSize: 42, color: 'var(--gold-bright)',
            }}>
              {(data.name || '—').split(' ').map(x => x[0] ?? '').join('').slice(0, 2).toUpperCase() || '—'}
            </div>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div className="fw-display" style={{ fontSize: 20, color: 'var(--text)', textAlign: 'center' }}>
            {data.name || 'Unbound'}
          </div>
          <div className="fw-serif" style={{ fontSize: 12.5, color: 'var(--text-3)', textAlign: 'center', fontStyle: 'italic', marginTop: 2 }}>
            {data.race}{data.subrace ? ` · ${data.subrace}` : ''} · {data.cls} · Lv 1
          </div>

          <div className="fw-divider" style={{ marginTop: 14, marginBottom: 12 }}>
            <span className="fw-eyebrow">Abilities</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {ABILITY_KEYS.map(k => {
              const val = final(k);
              const m = mod(val);
              const hasBonus = (data.racialBonus[k] ?? 0) > 0;
              return (
                <div key={k} style={{
                  background: 'var(--bg-deep)',
                  border: '1px solid ' + (hasBonus ? 'rgba(124,58,237,0.3)' : 'var(--border-soft)'),
                  borderRadius: 6, padding: 6, textAlign: 'center', position: 'relative',
                }}>
                  <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>{ABILITY_LABELS[k]}</div>
                  <div className="fw-display" style={{ fontSize: 18, color: 'var(--text)', lineHeight: 1 }}>{val}</div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: m >= 0 ? 'var(--gold-bright)' : 'var(--text-3)' }}>{sgn(m)}</div>
                  {hasBonus && (
                    <span style={{ position: 'absolute', top: 2, right: 4, fontSize: 8, color: 'var(--arcane-bright)', fontFamily: 'var(--f-mono)' }}>
                      +{data.racialBonus[k]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="fw-divider" style={{ marginTop: 14, marginBottom: 12 }}>
            <span className="fw-eyebrow">Vitals</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            <Vital label="HP" value={String(preview.maxHitPoints)} />
            <Vital label="AC" value={String(preview.armorClass)} />
            <Vital label="SPD" value={String(preview.speed)} />
          </div>

          {data.skills.length > 0 && (
            <>
              <div className="fw-divider" style={{ marginTop: 14, marginBottom: 8 }}>
                <span className="fw-eyebrow">Skill picks</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {data.skills.map(s => (
                  <span key={s} className="fw-pill gold" style={{ fontSize: 9.5 }}>{s}</span>
                ))}
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function Vital({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-soft)', borderRadius: 6, padding: '6px 4px', textAlign: 'center' }}>
      <div className="fw-eyebrow" style={{ fontSize: 9.5 }}>{label}</div>
      <div className="fw-display" style={{ fontSize: 15, color: 'var(--gold-bright)' }}>{value}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pill helper                                                          */
/* ------------------------------------------------------------------ */

function Pill({ label, v, accent }: { label: string; v: string; accent?: 'gold' }) {
  return (
    <div style={{
      padding: '8px 12px', flex: 1,
      background: 'var(--bg-deep)',
      border: '1px solid ' + (accent === 'gold' ? 'rgba(214,168,79,0.4)' : 'var(--border-soft)'),
      borderRadius: 6,
    }}>
      <div className="fw-eyebrow" style={{ fontSize: 9 }}>{label}</div>
      <div style={{ fontSize: 13, color: accent === 'gold' ? 'var(--gold-bright)' : 'var(--text)', marginTop: 2, fontFamily: 'var(--f-serif)' }}>{v}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 1 — Race                                                        */
/* ------------------------------------------------------------------ */

type SetField<D> = <K extends keyof D>(k: K, v: D[K]) => void;

function StepRace({ data, setField }: { data: WizardData; setField: SetField<WizardData> }) {
  const cur = findRaceByName(data.race);
  const selectedSubrace = findSubraceByName(cur.name, data.subrace);
  const selectedDraconicAncestry = getDraconicAncestry(data.draconicAncestry) ?? draconicAncestries[0];
  const traits = wizardTraits(data.race, data.subrace);

  const pickRace = (raceName: string) => {
    const race = findRaceByName(raceName);
    const subrace = race.subraces[0];
    setField('race', race.name);
    setField('subrace', subrace?.name ?? '');
    setField('draconicAncestry', race.id === 'dragonborn' ? draconicAncestries[0].id : '');
    setField('racialBonus', getTotalAbilityBonus(race.id, subrace?.id));
  };

  const pickSubrace = (subraceName: string) => {
    const subrace = cur.subraces.find((item) => item.name === subraceName);
    setField('subrace', subrace?.name ?? '');
    setField('racialBonus', getTotalAbilityBonus(cur.id, subrace?.id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHead icon="user" title="Lineage" right={
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--f-serif)', fontStyle: 'italic' }}>SRD 5.1 - {races.length} races</span>
        } />
        <div className="fw-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {races.map(race => (
            <Tile
              key={race.id}
              title={race.name}
              desc={formatAbilityBonus(getTotalAbilityBonus(race.id, race.subraces[0]?.id))}
              icon="user"
              active={data.race === race.name}
              onClick={() => pickRace(race.name)}
            />
          ))}
        </div>
      </Card>

      {cur.subraces.length > 0 && (
        <Card>
          <CardHead icon="users" title={`${data.race} - Subrace`} />
          <div className="fw-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {cur.subraces.map(s => (
              <Tile
                key={s.id}
                title={s.name}
                desc={s.description}
                active={data.subrace === s.name}
                onClick={() => pickSubrace(s.name)}
              />
            ))}
          </div>
        </Card>
      )}

      {cur.id === 'dragonborn' && (
        <Card>
          <CardHead icon="flame" title="Draconic Ancestry" />
          <div className="fw-card-body" style={{ display: 'grid', gap: 10 }}>
            <select
              className="fw-input"
              onChange={(event) => setField('draconicAncestry', event.target.value)}
              value={selectedDraconicAncestry.id}
            >
              {draconicAncestries.map((ancestry) => (
                <option key={ancestry.id} value={ancestry.id}>
                  {ancestry.id[0].toUpperCase() + ancestry.id.slice(1)} - {ancestry.element}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Pill label="Element" v={selectedDraconicAncestry.element} accent="gold" />
              <Pill label="Breath" v={selectedDraconicAncestry.breath} />
              <Pill label="Save" v={selectedDraconicAncestry.save.toUpperCase()} />
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHead icon="sparkles" title={`Racial Traits - ${data.race}`} />
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
            <Pill label="Ability bonus" v={formatAbilityBonus(wizardRaceBonus(data.race, data.subrace))} accent="gold" />
            <Pill label="Speed" v={`${cur.speed} ft`} />
            <Pill label="Languages" v={cur.languages.join(', ')} />
          </div>
          {selectedSubrace && (
            <p className="fw-serif" style={{ margin: '0 0 12px', color: 'var(--text-3)', fontSize: 13, fontStyle: 'italic' }}>
              {selectedSubrace.description}
            </p>
          )}
          <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Traits</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {traits.map(t => (
              <div key={t.name} style={{ padding: 12, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 6, display: 'flex', gap: 10 }}>
                <span style={{ color: 'var(--gold)' }}>{Icon('sparkles', { size: 12 })}</span>
                <div>
                  <div className="fw-display" style={{ fontSize: 13, color: 'var(--text)' }}>{t.name}</div>
                  <div style={{ marginTop: 3, color: 'var(--text-3)', fontSize: 12, lineHeight: 1.45 }}>{t.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 2 — Class                                                       */
/* ------------------------------------------------------------------ */

function StepClass({ data, setField }: { data: WizardData; setField: SetField<WizardData> }) {
  const cls = findClassByWizardName(data.cls);
  const toggleSkill = (s: string) => {
    if (data.skills.includes(s)) {
      setField('skills', data.skills.filter(x => x !== s));
    } else if (data.skills.length < cls.skillChoiceCount) {
      setField('skills', [...data.skills, s]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHead icon="sword" title="Class" right={
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--f-serif)', fontStyle: 'italic' }}>Subclass chosen at level 3 (preview below)</span>
        } />
        <div className="fw-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {classes.map(c => (
            <Tile key={c.id} title={c.name} icon="sword" active={data.cls === c.name}
              onClick={() => { setField('cls', c.name); setField('subclass', ''); setField('skills', []); }}
              desc={`${c.hitDie} - ${c.primaryAbilities.map((key) => ABILITY_LABELS[key]).join('/')}`}
            />
          ))}
        </div>
      </Card>

      <Card>
        <CardHead icon="sparkles" title={`${data.cls} - Class Features`} />
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <Pill label="Hit Die" v={cls.hitDie} accent="gold" />
            <Pill label="Primary" v={cls.primaryAbilities.map((key) => ABILITY_LABELS[key]).join(' / ')} />
            <Pill label="Saves" v={cls.savingThrows.map((key) => ABILITY_LABELS[key]).join(' / ')} />
            <Pill label="Skills" v={`Choose ${cls.skillChoiceCount}`} />
          </div>

          <div className="fw-eyebrow" style={{ marginBottom: 8 }}>
            Skill Proficiencies - pick {cls.skillChoiceCount} ({data.skills.length}/{cls.skillChoiceCount})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {cls.skillChoices.map(s => {
              const on = data.skills.includes(s);
              const full = !on && data.skills.length >= cls.skillChoiceCount;
              return (
                <button key={s} onClick={() => toggleSkill(s)} disabled={full}
                  className={'fw-btn fw-btn-sm ' + (on ? '' : 'fw-btn-ghost')}
                  style={{
                    borderColor: on ? 'var(--gold-deep)' : undefined,
                    color: on ? 'var(--gold-bright)' : full ? 'var(--text-4)' : undefined,
                    background: on ? 'rgba(214,168,79,0.10)' : undefined,
                    opacity: full ? 0.4 : 1,
                  }}
                >
                  {on && Icon('check', { size: 10 })} {s}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {cls.subclasses.length > 0 && (
        <Card>
          <CardHead icon="crown" title="Subclass - preview" />
          <div className="fw-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {cls.subclasses.map(s => (
              <Tile key={s.name} title={s.name} active={data.subclass === s.name} onClick={() => setField('subclass', s.name)} desc={s.description} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 3 — Abilities                                                   */
/* ------------------------------------------------------------------ */

function StepAbilities({ data, setField, setData }: {
  data: WizardData;
  setField: SetField<WizardData>;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
}) {
  const method = data.method;
  const mod = (v: number) => Math.floor((v - 10) / 2);
  const sgn = (v: number) => (v >= 0 ? '+' + v : String(v));

  const setAbility = (k: AbilityKey, v: number) =>
    setData(d => ({ ...d, abilities: { ...d.abilities, [k]: v } }));

  const total = Object.values(data.abilities).reduce((a, b) => a + (POINT_COST[b] ?? 0), 0);
  const pointBudget = 27;
  const pointsLeft = pointBudget - total;

  const usedCopy = [...Object.values(data.abilities)];
  const remainingArray = STANDARD_ARRAY.filter(v => {
    const idx = usedCopy.indexOf(v);
    if (idx !== -1) { usedCopy[idx] = -1; return false; }
    return true;
  });

  const methodOptions: WizardData['method'][] = ['Standard Array', 'Point buy', 'Roll 4d6', 'Manual'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHead icon="dice" title="Generation Method" right={
          <Seg value={method} onChange={v => setField('method', v)} options={methodOptions} />
        } />
        <div style={{ padding: 14, fontSize: 12.5, color: 'var(--text-3)', fontFamily: 'var(--f-serif)', fontStyle: 'italic', lineHeight: 1.6 }}>
          {method === 'Standard Array' && 'The dice are already cast. Distribute 15, 14, 13, 12, 10, 8 — one to each ability. Racial bonuses apply after.'}
          {method === 'Point buy' && 'Begin with 8 in every ability. You have 27 points. Cannot exceed 15 before racial bonuses.'}
          {method === 'Roll 4d6' && 'Roll 4d6, drop the lowest, six times. The dice are honest. Take what you\'re given.'}
          {method === 'Manual' && 'Enter what you like. The DM will know.'}
        </div>
      </Card>

      {method === 'Point buy' && (
        <Card style={{ borderColor: pointsLeft < 0 ? 'var(--blood)' : pointsLeft === 0 ? 'var(--gold-deep)' : undefined }}>
          <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Point Pool</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Spend up to 27 points. Cost: 8→0, 9→1, 10→2, 11→3, 12→4, 13→5, <b>14→7</b>, <b>15→9</b>.
              </div>
            </div>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 28, color: pointsLeft < 0 ? 'var(--blood-bright)' : pointsLeft === 0 ? 'var(--success)' : 'var(--gold-bright)', lineHeight: 1 }}>
              {pointsLeft}<span style={{ fontSize: 14, color: 'var(--text-3)' }}>/{pointBudget}</span>
            </div>
            <div style={{ width: 160, height: 6, background: 'var(--bg-deep)', borderRadius: 50, border: '1px solid var(--border-soft)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: Math.min(100, (total / pointBudget) * 100) + '%', background: pointsLeft < 0 ? 'var(--blood-bright)' : pointsLeft === 0 ? 'var(--success)' : 'var(--gold)', transition: 'width 0.2s' }} />
            </div>
          </div>
        </Card>
      )}

      {method === 'Standard Array' && (
        <Card>
          <div style={{ padding: 14 }}>
            <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Pool · assign one value to each ability</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STANDARD_ARRAY.map((v, i) => {
                const used = !remainingArray.includes(v);
                return (
                  <div key={i} style={{
                    width: 44, height: 44, borderRadius: 6,
                    display: 'grid', placeItems: 'center',
                    fontFamily: 'var(--f-display)', fontSize: 18,
                    background: used ? 'var(--bg-deep)' : 'linear-gradient(180deg, rgba(214,168,79,0.15), rgba(214,168,79,0.03))',
                    border: '1px solid ' + (used ? 'var(--border-soft)' : 'var(--gold-deep)'),
                    color: used ? 'var(--text-4)' : 'var(--gold-bright)',
                    opacity: used ? 0.4 : 1,
                    textDecoration: used ? 'line-through' : 'none',
                  }}>{v}</div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHead icon="dice" title="Assign Scores" right={
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--f-serif)', fontStyle: 'italic' }}>Racial bonuses apply after assignment</span>
        } />
        <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          {ABILITY_KEYS.map(k => {
            const v = data.abilities[k];
            const racial = data.racialBonus[k] ?? 0;
            const finalVal = v + racial;
            const m = mod(finalVal);
            const max = method === 'Point buy' ? 15 : 20;
            const min = method === 'Point buy' ? 8 : 3;
            const canInc = method === 'Point buy'
              ? (v < 15 && ((POINT_COST[v + 1] ?? 99) - (POINT_COST[v] ?? 0)) <= pointsLeft)
              : v < max;
            const canDec = v > min;

            if (method === 'Standard Array') {
              return (
                <div key={k} className="fw-abil-tile">
                  <div className="fw-eyebrow" style={{ marginBottom: 4 }}>{ABILITY_LABELS[k]}</div>
                  <select
                    className="fw-select"
                    value={v}
                    onChange={e => setAbility(k, Number(e.target.value))}
                    style={{ width: '100%', textAlign: 'center', padding: '6px 4px', marginBottom: 6 }}
                  >
                    {[...new Set([v, ...remainingArray])].sort((a, b) => b - a).map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                  {racial > 0 && <div style={{ fontSize: 9.5, color: 'var(--arcane-bright)', fontFamily: 'var(--f-mono)', marginBottom: 2 }}>+{racial} racial</div>}
                  <div className="fw-display" style={{ fontSize: 28, color: 'var(--gold-bright)', lineHeight: 1 }}>{finalVal}</div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: m >= 0 ? 'var(--gold-bright)' : 'var(--text-3)' }}>{sgn(m)}</div>
                </div>
              );
            }

            return (
              <div key={k} className="fw-abil-tile">
                <div className="fw-eyebrow" style={{ marginBottom: 4 }}>{ABILITY_LABELS[k]}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 6 }}>
                  <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" onClick={() => canDec && setAbility(k, v - 1)} disabled={!canDec}>{Icon('minus', { size: 10 })}</button>
                  <span style={{ fontFamily: 'var(--f-display)', fontSize: 22, color: 'var(--text)', width: 28, textAlign: 'center' }}>{v}</span>
                  <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" onClick={() => canInc && setAbility(k, v + 1)} disabled={!canInc}>{Icon('plus', { size: 10 })}</button>
                </div>
                {racial > 0 && <div style={{ fontSize: 9.5, color: 'var(--arcane-bright)', fontFamily: 'var(--f-mono)' }}>+{racial} racial</div>}
                <div className="fw-display" style={{ fontSize: 24, color: 'var(--gold-bright)', lineHeight: 1.1, marginTop: 4 }}>{finalVal}</div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: m >= 0 ? 'var(--gold-bright)' : 'var(--text-3)' }}>{sgn(m)}</div>
                {method === 'Point buy' && <div style={{ fontSize: 9, color: 'var(--text-4)', marginTop: 2, fontFamily: 'var(--f-mono)' }}>cost {POINT_COST[v] ?? '?'}</div>}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 4 — Background                                                  */
/* ------------------------------------------------------------------ */

function StepBackground({ data, setField }: { data: WizardData; setField: SetField<WizardData> }) {
  const applyPreset = (bg: string) => {
    const p = BG_PRESETS[bg];
    if (!p) return;
    setField('background', bg);
    setField('traits', p.traits);
    setField('ideals', p.ideals);
    setField('bonds', p.bonds);
    setField('flaws', p.flaws);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHead icon="user" title="Name & Alignment" />
        <div className="fw-card-body" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 14 }}>
          <Field label="Character Name">
            <input className="fw-input" value={data.name} onChange={e => setField('name', e.target.value)} placeholder="Enter name…" />
          </Field>
          <Field label="Pronouns">
            <input className="fw-input" value={data.pronouns} onChange={e => setField('pronouns', e.target.value)} />
          </Field>
          <Field label="Alignment">
            <select className="fw-select" value={data.alignment} onChange={e => setField('alignment', e.target.value)}>
              {['Lawful Good','Neutral Good','Chaotic Good','Lawful Neutral','True Neutral','Chaotic Neutral','Lawful Evil','Neutral Evil','Chaotic Evil'].map(a => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardHead icon="book" title="Background" right={
          <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled>{Icon('sparkles', { size: 11 })} AI suggest</button>
        } />
        <div className="fw-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {Object.keys(BG_PRESETS).map(bg => (
            <Tile key={bg} title={bg} active={data.background === bg} onClick={() => applyPreset(bg)} desc={BG_PRESETS[bg]!.traits} />
          ))}
        </div>
        <div style={{ padding: '0 16px 16px', fontSize: 11.5, color: 'var(--text-3)', fontStyle: 'italic', fontFamily: 'var(--f-serif)' }}>
          Selecting a background auto-fills personality fields below. You can still edit.
        </div>
      </Card>

      <Card>
        <CardHead icon="scroll" title="Personal History" />
        <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Backstory" hint="A few sentences. Where they're from, what binds them.">
            <textarea className="fw-textarea" rows={4} value={data.backstory} onChange={e => setField('backstory', e.target.value)} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Trait"><input className="fw-input" value={data.traits} onChange={e => setField('traits', e.target.value)} /></Field>
            <Field label="Ideal"><input className="fw-input" value={data.ideals} onChange={e => setField('ideals', e.target.value)} /></Field>
            <Field label="Bond"><input className="fw-input" value={data.bonds} onChange={e => setField('bonds', e.target.value)} /></Field>
            <Field label="Flaw"><input className="fw-input" value={data.flaws} onChange={e => setField('flaws', e.target.value)} /></Field>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 5 — Equipment                                                   */
/* ------------------------------------------------------------------ */

function StepGear({ data, setField }: { data: WizardData; setField: SetField<WizardData> }) {
  const classData = findClassByWizardName(data.cls);
  const startingGear = getClassStartingEquipment(classData).map((name) => {
    const lower = name.toLowerCase();
    const isArmor = lower.includes('armor') || lower.includes('shield');
    const isPack = lower.includes('pack');
    const isFocus = lower.includes('focus') || lower.includes('symbol') || lower.includes('component');

    return {
      n: name,
      t: `${classData.name} starting equipment`,
      icon: isArmor ? 'shield' : isPack ? 'bag' : isFocus ? 'sparkles' : 'sword',
      special: isFocus,
      lore: false,
    };
  });

  const gearOptions = [
    { value: 'starting' as const, label: 'Take class kit' },
    { value: 'gold' as const, label: `Take ${data.startingGold} GP instead` },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHead icon="bag" title="Starting Equipment" right={
          <Seg value={data.gearChoice} onChange={v => setField('gearChoice', v)} options={gearOptions} />
        } />
        <div className="fw-card-body">
          {data.gearChoice === 'starting' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {startingGear.map((g, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: 10,
                  background: 'var(--surface-2)',
                  border: '1px solid ' + (g.special ? 'var(--gold-deep)' : g.lore ? 'rgba(124,58,237,0.3)' : 'var(--border-soft)'),
                  borderRadius: 6,
                }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center',
                    background: g.special ? 'rgba(214,168,79,0.10)' : g.lore ? 'rgba(124,58,237,0.10)' : 'rgba(255,255,255,0.025)',
                    border: '1px solid ' + (g.special ? 'var(--gold-deep)' : g.lore ? 'rgba(124,58,237,0.4)' : 'var(--border-soft)'),
                    color: g.special ? 'var(--gold-bright)' : g.lore ? 'var(--arcane-bright)' : 'var(--text-3)',
                  }}>
                    {Icon(g.icon, { size: 12 })}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--text)' }}>{g.n}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{g.t}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 32, textAlign: 'center', background: 'var(--bg-deep)', border: '1px dashed var(--border)', borderRadius: 8 }}>
              <div className="fw-display" style={{ fontSize: 36, color: 'var(--gold-bright)', lineHeight: 1 }}>{data.startingGold} GP</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', fontFamily: 'var(--f-serif)', marginTop: 6 }}>
                You'll spend this in the marketplace before session one.
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 6 — Review                                                      */
/* ------------------------------------------------------------------ */

function StepReview({ data, setField }: { data: WizardData; setField: SetField<WizardData> }) {
  const mod = (v: number) => Math.floor((v - 10) / 2);
  const sgn = (v: number) => (v >= 0 ? '+' + v : String(v));
  const preview = buildCharacterFromWizard(data, 'preview-user');
  const classData = findClassByWizardName(data.cls);
  const requiredSkillCount = classData.skillChoiceCount;
  const spellSaveDC = preview.systemData.derivedStats?.spellSaveDC;

  const checks: [string, boolean, string][] = [
    ['Race chosen',    !!data.race,                               data.race + (data.subrace ? ` · ${data.subrace}` : '')],
    ['Class chosen',   !!data.cls,                                data.cls],
    ['Skills picked',  data.skills.length >= requiredSkillCount,  data.skills.join(', ') || '—'],
    ['Abilities set',  Object.values(data.abilities).every(v => v > 0), `Method: ${data.method}`],
    ['Background set', !!data.background,                          data.background],
    ['Name bound',     !!data.name,                               data.name],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card elev className="fw-orn" style={{ overflow: 'hidden' }}>
        <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
        <span className="fw-orn-c bl" /><span className="fw-orn-c br" />
        <div style={{ padding: 24, textAlign: 'center', background: 'radial-gradient(ellipse at 50% 0%, rgba(214,168,79,0.18), transparent 70%)' }}>
          <div className="fw-eyebrow" style={{ color: 'var(--gold)', marginBottom: 6 }}>The Compact</div>
          <h2 className="fw-display" style={{ fontSize: 32, color: 'var(--text)', letterSpacing: '0.04em' }}>{data.name || 'Unbound'}</h2>
          <div className="fw-serif" style={{ fontSize: 15, color: 'var(--text-2)', marginTop: 4, fontStyle: 'italic' }}>
            {data.race}{data.subrace ? ` · ${data.subrace}` : ''} · {data.cls} · {data.background}
          </div>
          <div className="fw-serif" style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2, fontStyle: 'italic' }}>
            {data.alignment} · {data.pronouns}
          </div>
        </div>
      </Card>

      <Card>
        <CardHead icon="book" title="Campaign Meta" />
        <div className="fw-card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Player Name (optional)">
            <input
              className="fw-input"
              onChange={(event) => setField('playerName', event.target.value)}
              placeholder="ชื่อผู้เล่นจริง"
              value={data.playerName}
            />
          </Field>
          <Field label="Campaign Name (optional)">
            <input
              className="fw-input"
              onChange={(event) => setField('campaignName', event.target.value)}
              placeholder="ชื่อ campaign"
              value={data.campaignName}
            />
          </Field>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <CardHead icon="dice" title="Abilities · with racial" />
          <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {ABILITY_KEYS.map(k => {
              const f = data.abilities[k] + (data.racialBonus[k] ?? 0);
              return (
                <div key={k} style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-soft)', borderRadius: 6, padding: 8, textAlign: 'center' }}>
                  <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>{ABILITY_LABELS[k]}</div>
                  <div className="fw-display" style={{ fontSize: 18, color: 'var(--gold-bright)', lineHeight: 1 }}>{f}</div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--text-3)' }}>{sgn(mod(f))}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHead icon="shield" title="Derived" />
          <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            <Pill label="Max HP" v={String(preview.maxHitPoints)} accent="gold" />
            <Pill label="AC" v={String(preview.armorClass)} />
            <Pill label="Speed" v={`${preview.speed} ft`} />
            <Pill label="Init" v={sgn(mod(data.abilities.dex))} />
            <Pill label="Prof" v={`+${preview.systemData.derivedStats?.proficiencyBonus ?? 2}`} />
            <Pill label="Spell DC" v={spellSaveDC ? String(spellSaveDC) : '—'} accent="gold" />
          </div>
        </Card>
      </div>

      <Card>
        <CardHead icon="scroll" title="Personality" />
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="fw-serif" style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, fontStyle: 'italic', paddingLeft: 12, borderLeft: '1px solid var(--gold-deep)' }}>
            {data.backstory || '(No backstory yet.)'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
            {[['Trait', data.traits], ['Ideal', data.ideals], ['Bond', data.bonds], ['Flaw', data.flaws]].map(([label, text]) => (
              <div key={label} style={{ padding: 10, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 6 }}>
                <div className="fw-eyebrow" style={{ fontSize: 9, color: 'var(--gold)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-2)', fontStyle: 'italic', fontFamily: 'var(--f-serif)', lineHeight: 1.5 }}>"{text}"</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHead icon="check" title="Pre-flight" />
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {checks.map(([label, ok, v]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 5 }}>
              <span style={{ width: 18, height: 18, borderRadius: 50, background: ok ? 'rgba(34,197,94,0.18)' : 'rgba(214,168,79,0.10)', color: ok ? 'var(--success)' : 'var(--gold)', display: 'grid', placeItems: 'center' }}>
                {Icon(ok ? 'check' : 'alert', { size: 10 })}
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--text-2)', flex: 1 }}>{label}</span>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-3)' }}>{v}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
