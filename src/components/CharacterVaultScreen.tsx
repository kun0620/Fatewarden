import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Icon } from './ui/Icons';
import { Card } from './ui/Primitives';
import {
  attachVaultCharacterToSession,
  deleteVaultCharacter,
  duplicateVaultCharacter,
  listVaultCharacters,
} from '../lib/characters';
import type { Character, GameSession, VaultCharacter } from '../types';

/* ------------------------------------------------------------------ */
/* Types                                                                 */
/* ------------------------------------------------------------------ */

type StatusKind = 'active' | 'draft' | 'retired' | 'archived';

interface VaultEntry {
  id: string;
  name: string;
  race: string;
  cls: string;
  level: number;
  background: string;
  alignment: string;
  hp: number;
  hpMax: number;
  ac: number;
  color: string;
  portrait: string;
  quote: string;
  status: string;
  statusKind: StatusKind;
  lastPlayed: string;
  abilities: Record<string, number>;
  tags: string[];
  source: 'real' | 'mock';
  raw?: VaultCharacter;
}

/* ------------------------------------------------------------------ */
/* Mock data (mirrors prototype)                                         */
/* ------------------------------------------------------------------ */

const MOCK_VAULT: VaultEntry[] = [
  {
    id: 'aedric-vael', name: 'Aedric Vael', race: 'Tiefling', cls: 'Warlock',
    level: 7, background: 'Outlander', alignment: 'Chaotic Neutral',
    hp: 38, hpMax: 52, ac: 14, color: '#7C3AED', portrait: 'AE',
    quote: 'A bargain is the only honest covenant.',
    status: 'Active · The Hollow Crown of Ysavir', statusKind: 'active', lastPlayed: '2d ago',
    abilities: { STR: 9, DEX: 14, CON: 12, INT: 13, WIS: 11, CHA: 18 },
    tags: ['Warlock', 'Pact of Tome', 'The Cinder-Reeve'], source: 'mock',
  },
  {
    id: 'vael-of-hold', name: 'Vael of Hold', race: 'Half-Orc', cls: 'Paladin',
    level: 5, background: 'Soldier', alignment: 'Lawful Good',
    hp: 0, hpMax: 60, ac: 18, color: '#D6A84F', portrait: 'VH',
    quote: 'I swore an oath. I will keep it.',
    status: 'Retired · Of Embers, season 2', statusKind: 'retired', lastPlayed: '3 months ago',
    abilities: { STR: 17, DEX: 11, CON: 14, INT: 9, WIS: 12, CHA: 15 },
    tags: ['Paladin', 'Oath of Devotion'], source: 'mock',
  },
  {
    id: 'quill-marrow', name: 'Quill Marrow', race: 'Halfling', cls: 'Rogue',
    level: 3, background: 'Charlatan', alignment: 'Chaotic Neutral',
    hp: 22, hpMax: 26, ac: 15, color: '#22C55E', portrait: 'QM',
    quote: 'I count the coin twice. Once for me.',
    status: 'Draft · Salt & Ash campaign', statusKind: 'draft', lastPlayed: '1 week ago',
    abilities: { STR: 8, DEX: 16, CON: 13, INT: 12, WIS: 11, CHA: 14 },
    tags: ['Rogue', 'Lightfoot'], source: 'mock',
  },
  {
    id: 'vesseline', name: 'Vesseline', race: 'Elf', cls: 'Wizard',
    level: 9, background: 'Sage', alignment: 'True Neutral',
    hp: 41, hpMax: 48, ac: 13, color: '#A8A29E', portrait: 'VE',
    quote: 'I read until the candle dies, then I light another.',
    status: 'Archived · Volume Six', statusKind: 'archived', lastPlayed: '11 months ago',
    abilities: { STR: 8, DEX: 14, CON: 12, INT: 18, WIS: 13, CHA: 11 },
    tags: ['Wizard', 'School of Divination'], source: 'mock',
  },
  {
    id: 'brask-thornhilt', name: 'Brask Thornhilt', race: 'Dwarf', cls: 'Cleric',
    level: 4, background: 'Acolyte', alignment: 'Lawful Neutral',
    hp: 32, hpMax: 36, ac: 18, color: '#C72D2D', portrait: 'BT',
    quote: 'Solm watches. So I work.',
    status: 'Active · The Brass Sept', statusKind: 'active', lastPlayed: '1d ago',
    abilities: { STR: 14, DEX: 10, CON: 15, INT: 11, WIS: 17, CHA: 12 },
    tags: ['Cleric', 'Life Domain'], source: 'mock',
  },
  {
    id: 'mira-of-thornveil', name: 'Mira of Thornveil', race: 'Wood Elf', cls: 'Ranger',
    level: 6, background: 'Outlander', alignment: 'Neutral Good',
    hp: 48, hpMax: 54, ac: 16, color: '#4ADE80', portrait: 'MI',
    quote: 'The wood remembers what we forget.',
    status: 'Draft', statusKind: 'draft', lastPlayed: '5d ago',
    abilities: { STR: 12, DEX: 17, CON: 13, INT: 11, WIS: 15, CHA: 10 },
    tags: ['Ranger', 'Hunter', 'Bow'], source: 'mock',
  },
];

function realToEntry(c: VaultCharacter): VaultEntry {
  const initials = c.name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();
  const colors: Record<string, string> = {
    Warlock: '#7C3AED', Wizard: '#A8A29E', Fighter: '#D6A84F', Paladin: '#D6A84F',
    Cleric: '#C72D2D', Rogue: '#22C55E', Druid: '#4ADE80', Ranger: '#4ADE80',
    Bard: '#F59E0B', Barbarian: '#EF4444', Monk: '#06B6D4', Sorcerer: '#8B5CF6',
  };
  return {
    id: c.id,
    name: c.name,
    race: c.race ?? c.ancestry ?? '—',
    cls: c.className,
    level: c.level,
    background: c.background,
    alignment: c.alignment,
    hp: c.hitPoints,
    hpMax: c.maxHitPoints,
    ac: c.armorClass,
    color: colors[c.className] ?? '#7C3AED',
    portrait: initials,
    quote: c.personality?.traits ?? c.backstory?.slice(0, 60) ?? '',
    status: c.updatedAt ? `Updated · ${new Date(c.updatedAt).toLocaleDateString()}` : 'Draft',
    statusKind: 'draft',
    lastPlayed: c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : '—',
    abilities: c.abilities as Record<string, number>,
    tags: [c.className, c.race ?? c.ancestry ?? ''],
    source: 'real',
    raw: c,
  };
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

interface CharacterVaultScreenProps {
  user: User | null;
  onBack: () => void;
  onOpenWizard: () => void;
  onOpenSheet: () => void;
  session?: GameSession | null;
  onBound?: (session: GameSession, character: Character) => void;
}

export function CharacterVaultScreen({
  user,
  onBack,
  onOpenWizard,
  onOpenSheet,
  session,
  onBound,
}: CharacterVaultScreenProps) {
  const [filter, setFilter] = useState<StatusKind | 'all'>('all');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [classFilter, setClassFilter] = useState('All');
  const [realChars, setRealChars] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [bindingId, setBindingId] = useState<string | null>(null);
  const [bindError, setBindError] = useState('');

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    listVaultCharacters(user)
      .then(chars => setRealChars(chars.map(realToEntry)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // Merge: real chars first, then mock for demo
  const allChars = useMemo(() =>
    session ? realChars : (realChars.length > 0 ? realChars : MOCK_VAULT),
    [realChars, session]
  );

  const classes = useMemo(() =>
    ['All', ...Array.from(new Set(allChars.map(c => c.cls)))],
    [allChars]
  );

  const filtered = useMemo(() => allChars.filter(c => {
    if (filter !== 'all' && c.statusKind !== filter) return false;
    if (classFilter !== 'All' && c.cls !== classFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!c.name.toLowerCase().includes(q) &&
          !c.cls.toLowerCase().includes(q) &&
          !c.race.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [allChars, filter, classFilter, query]);

  const counts: Record<string, number> = {
    all: allChars.length,
    active: allChars.filter(c => c.statusKind === 'active').length,
    draft: allChars.filter(c => c.statusKind === 'draft').length,
    retired: allChars.filter(c => c.statusKind === 'retired').length,
    archived: allChars.filter(c => c.statusKind === 'archived').length,
  };

  const VAULT_FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'draft', label: 'Drafts' },
    { id: 'retired', label: 'Retired' },
    { id: 'archived', label: 'Archived' },
  ] as const;

  async function handleDelete(entry: VaultEntry) {
    if (!entry.raw || !user) return;
    if (!window.confirm(`Delete "${entry.name}"? This cannot be undone.`)) return;
    await deleteVaultCharacter(entry.id, user);
    setRealChars(prev => prev.filter(c => c.id !== entry.id));
  }

  async function handleDuplicate(entry: VaultEntry) {
    if (!entry.raw || !user) return;
    const dup = await duplicateVaultCharacter(entry.raw, user);
    if (dup) setRealChars(prev => [realToEntry(dup), ...prev]);
  }

  async function handleBind(entry: VaultEntry) {
    if (!session) {
      onOpenSheet();
      return;
    }
    if (!entry.raw || !user) {
      setBindError('Create or import a real vault character before binding it to this table.');
      return;
    }

    setBindingId(entry.id);
    setBindError('');
    try {
      const attached = await attachVaultCharacterToSession(entry.id, session.id, user);
      onBound?.(session, attached);
    } catch (error) {
      setBindError(error instanceof Error ? error.message : 'Could not bind this character to the table.');
    } finally {
      setBindingId(null);
    }
  }

  return (
    <div className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page" style={{ maxWidth: 1480 }}>
        {/* HEADER */}
        <div className="fw-page-head" style={{ marginBottom: 18 }}>
          <div>
            <div className="fw-eyebrow">The Hearth · Vault</div>
            <h1>{session ? 'Choose your warden' : 'My Characters'}</h1>
            <div className="sub">
              {session ? `Bind a vault character to ${session.title}.` : "Every warden you've bound to dice."}{' '}
              {loading ? '…' : `${allChars.length} in the vault.`}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="fw-btn fw-btn-ghost" onClick={onBack}>
              {Icon('chevL', { size: 12 })} Hearth
            </button>
            <button className="fw-btn fw-btn-ghost" disabled>
              {Icon('link', { size: 12 })} Import JSON
            </button>
            <button className="fw-btn fw-btn-gold" onClick={onOpenWizard}>
              {Icon('plus', { size: 12 })} Forge new warden
            </button>
          </div>
        </div>

        {bindError && (
          <Card style={{ marginBottom: 12 }}>
            <div style={{ padding: 12, color: 'var(--blood-bright)' }}>{bindError}</div>
          </Card>
        )}

        {/* FILTER STRIP */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div className="fw-input-wrap" style={{ flex: '1 1 280px', maxWidth: 360 }}>
              <span className="fw-input-icon">{Icon('search', { size: 13 })}</span>
              <input
                className="fw-input has-icon"
                placeholder="Search by name, class, race…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {VAULT_FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={'fw-vault-pill ' + (filter === f.id ? 'active' : '')}
                >
                  {f.label}{' '}
                  <span className="fw-vault-pill-count">{counts[f.id] ?? 0}</span>
                </button>
              ))}
            </div>

            <span style={{ flex: 1 }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="fw-eyebrow" style={{ fontSize: 9.5 }}>Class</span>
              <select
                className="fw-select"
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
              >
                {classes.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 2, padding: 2, background: 'var(--bg-deep)', borderRadius: 6, border: '1px solid var(--border-soft)' }}>
              <button
                onClick={() => setView('grid')}
                className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm"
                style={{
                  background: view === 'grid' ? 'rgba(214,168,79,0.10)' : 'transparent',
                  color: view === 'grid' ? 'var(--gold-bright)' : 'var(--text-3)',
                }}
                title="Grid"
              >
                {Icon('hex', { size: 12 })}
              </button>
              <button
                onClick={() => setView('list')}
                className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm"
                style={{
                  background: view === 'list' ? 'rgba(214,168,79,0.10)' : 'transparent',
                  color: view === 'list' ? 'var(--gold-bright)' : 'var(--text-3)',
                }}
                title="List"
              >
                {Icon('scroll', { size: 12 })}
              </button>
            </div>
          </div>
        </Card>

        {/* RESULTS */}
        {loading ? (
          <Card>
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>
              <div className="fw-rune-spin" style={{ width: 32, height: 32, margin: '0 auto 12px', border: '2px solid var(--gold-deep)', borderTop: '2px solid var(--gold)', borderRadius: '50%' }} />
              <div className="fw-eyebrow">Loading vault…</div>
            </div>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <div style={{ padding: 64, textAlign: 'center', color: 'var(--text-3)' }}>
              <div style={{ marginBottom: 14, opacity: 0.5 }}>{Icon('users', { size: 36 })}</div>
              <div className="fw-display" style={{ fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>No wardens found</div>
              <div className="fw-serif" style={{ fontStyle: 'italic' }}>The vault is silent on this account.</div>
              <button className="fw-btn fw-btn-gold" style={{ marginTop: 16 }} onClick={onOpenWizard}>
                {Icon('plus', { size: 12 })} Forge new warden
              </button>
            </div>
          </Card>
        ) : view === 'grid' ? (
          <div className="fw-vault-grid">
            {filtered.map(c => (
              <VaultCard
                key={c.id}
                char={c}
                onOpenSheet={() => handleBind(c)}
                onEdit={onOpenWizard}
                onDelete={() => handleDelete(c)}
                onDuplicate={() => handleDuplicate(c)}
                ctaLabel={session ? (bindingId === c.id ? 'Binding...' : 'Bind pact') : undefined}
                disabled={Boolean(bindingId)}
              />
            ))}
            <button className="fw-vault-newcard" onClick={onOpenWizard}>
              <div className="fw-vault-newcard-icon">{Icon('plus', { size: 28 })}</div>
              <div className="fw-display" style={{ fontSize: 14, color: 'var(--text)' }}>Forge new warden</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', fontFamily: 'var(--f-serif)', fontStyle: 'italic', marginTop: 4 }}>
                Bind a name to your dice.
              </div>
            </button>
          </div>
        ) : (
          <Card>
            <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.map(c => (
                <VaultRow
                  key={c.id}
                  char={c}
                  onOpenSheet={() => handleBind(c)}
                  ctaLabel={session ? (bindingId === c.id ? 'Binding...' : 'Bind pact') : undefined}
                  disabled={Boolean(bindingId)}
                />
              ))}
            </div>
          </Card>
        )}

        {/* INFO STRIP */}
        <div style={{
          marginTop: 24, display: 'flex', gap: 12, padding: 14,
          background: 'var(--surface-2)', border: '1px dashed var(--border)',
          borderRadius: 8, fontSize: 12.5, color: 'var(--text-3)',
          fontFamily: 'var(--f-serif)', fontStyle: 'italic', lineHeight: 1.5,
        }}>
          <span style={{ color: 'var(--gold)' }}>{Icon('info', { size: 14 })}</span>
          <div style={{ flex: 1 }}>
            When you join a session, the vault makes a{' '}
            <b style={{ color: 'var(--text-2)', fontStyle: 'normal' }}>snapshot</b>{' '}
            — HP, conditions, and inventory changes stay in the session. When the session ends,
            you'll choose whether to write those changes back here.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* VaultCard (grid view)                                                */
/* ------------------------------------------------------------------ */

function VaultCard({ char, onOpenSheet, onEdit, onDelete, onDuplicate, ctaLabel, disabled }: {
  char: VaultEntry;
  onOpenSheet: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  ctaLabel?: string;
  disabled?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hpPct = char.hpMax > 0 ? (char.hp / char.hpMax) * 100 : 0;
  const dim = char.statusKind === 'retired' || char.statusKind === 'archived';

  return (
    <div className={'fw-vault-card' + (dim ? ' dim' : '') + (char.statusKind === 'draft' ? ' draft' : '')}>
      {/* Portrait area */}
      <div
        className="fw-vault-card-portrait"
        style={{ background: `linear-gradient(135deg, ${char.color}44, #06050b)` }}
      >
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 30%, ${char.color}33, transparent 65%)` }} />
        <div className="fw-vault-portrait-inner" style={{ borderColor: char.color }}>
          {char.portrait}
        </div>
        <span className="fw-vault-level">Lv {char.level}</span>

        {/* Kebab menu */}
        <button className="fw-vault-menu-btn" onClick={() => setMenuOpen(o => !o)}>
          {Icon('kebab', { size: 14 })}
        </button>
        {menuOpen && (
          <div className="fw-vault-menu" onMouseLeave={() => setMenuOpen(false)}>
            <button onClick={() => { setMenuOpen(false); onOpenSheet(); }}>
              {Icon('eye', { size: 11 })} Open sheet
            </button>
            <button onClick={() => { setMenuOpen(false); onEdit(); }}>
              {Icon('cog', { size: 11 })} Edit
            </button>
            <button onClick={() => { setMenuOpen(false); onDuplicate(); }}>
              {Icon('copy', { size: 11 })} Duplicate
            </button>
            <button disabled>{Icon('scroll', { size: 11 })} Export JSON</button>
            <button disabled>{Icon('sparkles', { size: 11 })} Level up</button>
            <button className="danger" onClick={() => { setMenuOpen(false); onDelete(); }}>
              {Icon('x', { size: 11 })} Delete
            </button>
          </div>
        )}

        {/* Status bar */}
        <div className="fw-vault-status">
          <span className={'fw-vault-status-dot ' + char.statusKind} />
          <span>{char.status}</span>
        </div>
      </div>

      {/* Body */}
      <div className="fw-vault-card-body">
        <div className="fw-display" style={{ fontSize: 16, color: 'var(--text)', marginBottom: 2 }}>
          {char.name}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', fontStyle: 'italic', fontFamily: 'var(--f-serif)' }}>
          {char.race} · {char.cls} · {char.alignment}
        </div>

        {char.quote && (
          <p className="fw-serif" style={{
            fontSize: 12.5, color: 'var(--text-2)', fontStyle: 'italic',
            lineHeight: 1.5, marginTop: 10, marginBottom: 10,
            paddingLeft: 8, borderLeft: '1px solid var(--gold-deep)',
          }}>
            "{char.quote}"
          </p>
        )}

        {/* Mini stats */}
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <div className="fw-vault-mini" style={{ flex: 1.4 }}>
            <div className="fw-eyebrow" style={{ fontSize: 8.5, marginBottom: 2 }}>HP</div>
            <div className="fw-mono" style={{
              fontSize: 12,
              color: hpPct > 50 ? 'var(--success)' : hpPct > 25 ? 'var(--warning)' : 'var(--blood-bright)',
            }}>
              {char.hp} / {char.hpMax}
            </div>
            <div style={{ height: 3, background: 'var(--bg-deep)', borderRadius: 50, overflow: 'hidden', marginTop: 4 }}>
              <div style={{
                height: '100%', width: hpPct + '%',
                background: hpPct > 50 ? 'var(--success)' : hpPct > 25 ? 'var(--warning)' : 'var(--blood-bright)',
              }} />
            </div>
          </div>
          <div className="fw-vault-mini">
            <div className="fw-eyebrow" style={{ fontSize: 8.5, marginBottom: 2 }}>AC</div>
            <div className="fw-mono" style={{ fontSize: 13, color: 'var(--text)' }}>{char.ac}</div>
          </div>
          <div className="fw-vault-mini">
            <div className="fw-eyebrow" style={{ fontSize: 8.5, marginBottom: 2 }}>LV</div>
            <div className="fw-mono" style={{ fontSize: 13, color: 'var(--gold-bright)' }}>{char.level}</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          <button
            className="fw-btn fw-btn-gold fw-btn-sm"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={onOpenSheet}
            disabled={disabled}
          >
            {ctaLabel ? <>{Icon('check', { size: 11 })} {ctaLabel}</> : char.statusKind === 'active'
              ? <>{Icon('play', { size: 11 })} Play</>
              : <>{Icon('eye', { size: 11 })} Open</>
            }
          </button>
          <button
            className="fw-btn fw-btn-ghost fw-btn-sm"
            style={{ padding: '5px 10px' }}
            title="Edit"
            onClick={onEdit}
          >
            {Icon('cog', { size: 11 })}
          </button>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 10, paddingTop: 10,
          borderTop: '1px dashed var(--border-soft)',
          fontSize: 10, color: 'var(--text-4)', fontFamily: 'var(--f-mono)',
        }}>
          <span>last played · {char.lastPlayed}</span>
          <span>{char.background}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* VaultRow (list view)                                                 */
/* ------------------------------------------------------------------ */

function VaultRow({
  char,
  onOpenSheet,
  ctaLabel,
  disabled,
}: {
  char: VaultEntry;
  onOpenSheet: () => void;
  ctaLabel?: string;
  disabled?: boolean;
}) {
  const hpPct = char.hpMax > 0 ? (char.hp / char.hpMax) * 100 : 0;
  return (
    <div className="fw-vault-row">
      <span
        className="fw-avatar lg"
        style={{
          background: `linear-gradient(135deg, ${char.color}44, #15101f)`,
          borderColor: char.color,
        }}
      >
        {char.portrait}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="fw-display" style={{ fontSize: 14, color: 'var(--text)' }}>{char.name}</div>
          <span className={'fw-vault-status-pill ' + char.statusKind}>{char.statusKind}</span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
          {char.race} · {char.cls} · Lv {char.level} · {char.background}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontFamily: 'var(--f-mono)', fontSize: 12 }}>
        <div style={{ width: 80 }}>
          <div style={{ fontSize: 9.5, color: 'var(--text-4)', letterSpacing: '0.1em' }}>HP</div>
          <div style={{ color: hpPct > 50 ? 'var(--success)' : hpPct > 25 ? 'var(--warning)' : 'var(--blood-bright)' }}>
            {char.hp}/{char.hpMax}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9.5, color: 'var(--text-4)', letterSpacing: '0.1em' }}>AC</div>
          <div style={{ color: 'var(--text)' }}>{char.ac}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={onOpenSheet}>
          {Icon('eye', { size: 11 })} Sheet
        </button>
        <button className="fw-btn fw-btn-gold fw-btn-sm" onClick={onOpenSheet} disabled={disabled}>
          {ctaLabel ? <>{Icon('check', { size: 11 })} {ctaLabel}</> : char.statusKind === 'active' ? <>{Icon('play', { size: 11 })} Play</> : 'Open'}
        </button>
        <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" disabled>
          {Icon('kebab', { size: 12 })}
        </button>
      </div>
    </div>
  );
}
