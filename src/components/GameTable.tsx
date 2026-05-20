import React, { useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Icon } from './ui/Icons';
import { Field, Seg, Toggle } from './ui/Primitives';
import { useGameStore } from '../store/useGameStore';
import { InventoryPanel } from './InventoryPanel';
import type { Character, EncounterState, GameSession, StoryMessage } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

type LeftTab   = 'party' | 'char' | 'bag' | 'quests';
type RightTab  = 'dice' | 'combat' | 'ai' | 'tools';
type StoryTab  = 'story' | 'chat' | 'lore';
type ActionMode = 'speak' | 'act' | 'aside';

interface DiceResult {
  die: string;
  value: number;
  bonus: string;
  target: number;
  kind: 'crit' | 'success' | 'fumble' | 'failure';
}

interface PendingChange {
  kind: string;
  target?: string;
  amount?: number | string;
  source?: string;
  item?: string;
  by?: string;
  from?: string;
  aiProposed?: boolean;
}

export interface GameTableProps {
  user: User;
  activeSession: GameSession;
  character: Character | null;
  messages: StoryMessage[];
  onLeave: () => void;
  onSendMessage?: (text: string, mode: ActionMode) => Promise<void>;
  onDiceRoll?: (result: DiceResult) => void;
  onUpdateCharacter?: (character: Character) => void | Promise<void>;
  onCombatChange?: (change: PendingChange) => void;
  combatMode?: boolean;
  onToggleCombat?: (active: boolean) => void;
  /** Slot for CombatModeView (STEP 5 will provide this) */
  combatView?: React.ReactNode;
}

// ─── Mock party (fallback if real party not available) ───────────────────────

const PARTY_MOCK = [
  { id: 1, name: 'Aedric Vael',      cls: 'Warlock',  lvl: 7, hp: 38, hpMax: 52, ac: 14, you: true,  color: '#7C3AED', initials: 'AE' },
  { id: 2, name: 'Kessra Ironwake',  cls: 'Fighter',  lvl: 7, hp: 64, hpMax: 70, ac: 19,             color: '#D6A84F', initials: 'KI' },
  { id: 3, name: 'Mirenna Thornhart',cls: 'Druid',    lvl: 7, hp: 41, hpMax: 56, ac: 16,             color: '#22C55E', initials: 'MT' },
  { id: 4, name: 'Halric Dale',      cls: 'Cleric',   lvl: 6, hp: 0,  hpMax: 48, ac: 18, down: true, color: '#A8A29E', initials: 'HD' },
];

const SUGGESTIONS_MOCK = [
  'Step inside the warding circle.',
  'Speak to the held shadow.',
  'Disrupt the binding deliberately.',
  'Search the chapel for the missing censer-chain.',
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function GameTable({
  user,
  activeSession,
  character,
  messages,
  onLeave,
  onSendMessage,
  onDiceRoll,
  onUpdateCharacter,
  onCombatChange,
  combatMode = false,
  onToggleCombat,
  combatView,
}: GameTableProps) {
  const { sceneState, combatState } = useGameStore();

  const [leftTab,      setLeftTab]      = useState<LeftTab>('party');
  const [rightTab,     setRightTab]     = useState<RightTab>('dice');
  const [storyTab,     setStoryTab]     = useState<StoryTab>('story');
  const [actionDraft,  setActionDraft]  = useState('');
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [diceResult,   setDiceResult]   = useState<DiceResult>({
    die: '1d20', value: 17, bonus: '+3', target: 15, kind: 'success',
  });
  const [rolling, setRolling] = useState(false);
  const [aiOn,    setAiOn]    = useState(true);
  const [aiTone,  setAiTone]  = useState('Balanced');
  const [aiStrict, setAiStrict] = useState('Standard');

  const storyRef = useRef<HTMLDivElement>(null);

  const handleChange = (change: PendingChange) => {
    onCombatChange?.(change);
    setPendingChange(change);
  };

  const rollDie = () => {
    setRolling(true);
    setTimeout(() => {
      const v = 1 + Math.floor(Math.random() * 20);
      const bonus = 3;
      const total = v + bonus;
      const kind: DiceResult['kind'] =
        v === 20 ? 'crit' : v === 1 ? 'fumble' : total >= 15 ? 'success' : 'failure';
      const result: DiceResult = { die: '1d20', value: v, bonus: '+3', target: 15, kind };
      setDiceResult(result);
      onDiceRoll?.(result);
      setRolling(false);
    }, 450);
  };

  const handleSend = async () => {
    if (!actionDraft.trim()) return;
    await onSendMessage?.(actionDraft, 'speak');
    setActionDraft('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Session Banner */}
      <GtSessionBanner
        session={activeSession}
        combatMode={combatMode}
        onToggleCombat={() => onToggleCombat?.(!combatMode)}
        onLeave={onLeave}
        party={PARTY_MOCK}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '300px 1fr 320px',
        flex: 1,
        minHeight: 0,
        gap: 0,
        borderTop: '1px solid var(--border-soft)',
      }}>

        {/* ── LEFT SIDEBAR ── */}
        <aside style={{
          borderRight: '1px solid var(--border-soft)',
          background: 'linear-gradient(180deg, rgba(20,17,29,0.5), rgba(11,10,16,0.2))',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}>
          <div className="fw-tabs" style={{ paddingInline: 8 }}>
            {([
              { id: 'party',  label: 'Party',     icon: 'users'  },
              { id: 'char',   label: 'You',        icon: 'user'   },
              { id: 'bag',    label: 'Inventory',  icon: 'bag'    },
              { id: 'quests', label: 'Quests',     icon: 'scroll' },
            ] as { id: LeftTab; label: string; icon: string }[]).map(t => (
              <div
                key={t.id}
                className={'fw-tab ' + (leftTab === t.id ? 'active' : '')}
                onClick={() => setLeftTab(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 8px', flex: 1, justifyContent: 'center' }}
              >
                {Icon(t.icon, { size: 11 })} {t.label}
              </div>
            ))}
          </div>

          <div className="fw-scroll" style={{ flex: 1, padding: 14 }}>
            {leftTab === 'party'  && <GtPartyPanel  party={PARTY_MOCK} onAttack={handleChange} />}
            {leftTab === 'char'   && <GtCharPanel   character={character} />}
            {leftTab === 'bag'    && (character
              ? <InventoryPanel character={character} onUpdateCharacter={onUpdateCharacter ?? (() => {})} />
              : <GtInventoryStub onUse={handleChange} />
            )}
            {leftTab === 'quests' && <GtQuestsPanel />}
          </div>
        </aside>

        {/* ── CENTER ── */}
        <main style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          background: 'linear-gradient(180deg, rgba(20,17,29,0.2), rgba(11,10,16,0))',
        }}>
          {combatMode && combatView ? combatView : (
            <>
              <GtSceneHeader sceneState={sceneState} />

              {/* Story tabs */}
              <div className="fw-tabs" style={{ paddingInline: 18, marginTop: 4 }}>
                {([
                  { id: 'story', label: 'Story Log',   icon: 'scroll' },
                  { id: 'chat',  label: 'Table Chat',  icon: 'users'  },
                  { id: 'lore',  label: 'Lore',        icon: 'book'   },
                ] as { id: StoryTab; label: string; icon: string }[]).map(t => (
                  <div
                    key={t.id}
                    className={'fw-tab ' + (storyTab === t.id ? 'active' : '')}
                    onClick={() => setStoryTab(t.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {Icon(t.icon, { size: 11 })} {t.label}
                  </div>
                ))}
                <span style={{ flex: 1, borderBottom: '1px solid var(--border-soft)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBlock: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    Session — · ongoing
                  </span>
                  <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm">
                    {Icon('search', { size: 12 })}
                  </button>
                </div>
              </div>

              {/* Story log */}
              <div ref={storyRef} className="fw-scroll" style={{ flex: 1, padding: '18px 28px', minHeight: 0 }}>
                {messages.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-4)', fontStyle: 'italic', fontFamily: 'var(--f-serif)', fontSize: 14 }}>
                    The table is set. The candles burn.
                  </div>
                ) : messages.map((msg, i) => (
                  <GtStoryEntry key={msg.id ?? i} message={msg} />
                ))}
                <GtRollRequest dice={diceResult} onRoll={rollDie} rolling={rolling} />
              </div>

              <GtActionInput
                value={actionDraft}
                setValue={setActionDraft}
                suggestions={SUGGESTIONS_MOCK}
                onSend={handleSend}
                onRollDice={rollDie}
              />
            </>
          )}
        </main>

        {/* ── RIGHT SIDEBAR ── */}
        <aside style={{
          borderLeft: '1px solid var(--border-soft)',
          background: 'linear-gradient(180deg, rgba(20,17,29,0.5), rgba(11,10,16,0.2))',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}>
          <div className="fw-tabs" style={{ paddingInline: 8 }}>
            {([
              { id: 'dice',   label: 'Dice',      icon: 'dice'   },
              { id: 'combat', label: 'Combat',    icon: 'sword'  },
              { id: 'ai',     label: 'AI Warden', icon: 'wand'   },
              { id: 'tools',  label: 'Tools',     icon: 'cog'    },
            ] as { id: RightTab; label: string; icon: string }[]).map(t => (
              <div
                key={t.id}
                className={'fw-tab ' + (rightTab === t.id ? 'active' : '')}
                onClick={() => setRightTab(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 6px', flex: 1, justifyContent: 'center', fontSize: 10 }}
              >
                {Icon(t.icon, { size: 11 })} {t.label}
              </div>
            ))}
          </div>

          <div className="fw-scroll" style={{ flex: 1, padding: 14 }}>
            {rightTab === 'dice'   && <GtDicePanel result={diceResult} onRoll={rollDie} rolling={rolling} />}
            {rightTab === 'combat' && <GtCombatPanel encounter={combatState} onChange={handleChange} />}
            {rightTab === 'ai'     && <GtAIDMPanel on={aiOn} setOn={setAiOn} tone={aiTone} setTone={setAiTone} strict={aiStrict} setStrict={setAiStrict} onChange={handleChange} />}
            {rightTab === 'tools'  && <GtToolsPanel />}
          </div>
        </aside>
      </div>

      {pendingChange && (
        <GtConfirmModal change={pendingChange} onClose={() => setPendingChange(null)} />
      )}
    </div>
  );
}

// ─── Session Banner ───────────────────────────────────────────────────────────

interface SessionBannerProps {
  session: GameSession;
  combatMode: boolean;
  onToggleCombat: () => void;
  onLeave: () => void;
  party: typeof PARTY_MOCK;
}

function GtSessionBanner({ session, combatMode, onToggleCombat, onLeave, party }: SessionBannerProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '10px 18px',
      background: combatMode
        ? 'linear-gradient(180deg, rgba(153,27,27,0.10), transparent)'
        : 'linear-gradient(180deg, rgba(124,58,237,0.05), transparent)',
      borderBottom: '1px solid var(--border-soft)',
      transition: 'background 0.3s',
    }}>
      <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={onLeave}>
        {Icon('chevL', { size: 11 })} Leave table
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {combatMode ? (
          <span className="fw-pill blood" style={{ animation: 'fw-glow-pulse 2s infinite' }}>
            <span style={{ width: 6, height: 6, borderRadius: 50, background: 'currentColor' }} /> Combat · Active
          </span>
        ) : (
          <span className="fw-pill blood">
            <span style={{ width: 6, height: 6, borderRadius: 50, background: 'currentColor' }} /> Live
          </span>
        )}
        <span className="fw-display" style={{ fontSize: 14, letterSpacing: '0.08em', color: 'var(--text)' }}>
          {session?.title ?? 'Untitled Session'}
        </span>
        {session?.theme?.tone && (
          <span style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--text-3)', fontSize: 13 }}>
            · {session.theme.tone}
          </span>
        )}
      </div>

      <span style={{ flex: 1 }} />

      <button
        className={'fw-btn ' + (combatMode ? 'fw-btn-blood' : 'fw-btn-ghost') + ' fw-btn-sm'}
        onClick={onToggleCombat}
      >
        {Icon(combatMode ? 'scroll' : 'sword', { size: 12 })} {combatMode ? 'Resume story' : 'Run encounter'}
      </button>

      <div style={{ display: 'flex', marginRight: 4, marginLeft: 8 }}>
        {party.slice(0, 4).map((p, i) => (
          <div
            key={p.id}
            className={'fw-avatar sm ' + (p.you ? 'dm' : '')}
            style={{ marginLeft: i ? -8 : 0, background: `linear-gradient(135deg, ${p.color}33, #15101f)`, position: 'relative' }}
          >
            {p.initials}
            <span className="dot" style={{ background: p.down ? 'var(--blood)' : p.you ? 'var(--gold)' : 'var(--success)' }} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button className="fw-btn fw-btn-icon fw-btn-ghost">{Icon('mic',    { size: 14 })}</button>
        <button className="fw-btn fw-btn-icon fw-btn-ghost">{Icon('volume', { size: 14 })}</button>
        <button className="fw-btn fw-btn-icon fw-btn-ghost">{Icon('kebab',  { size: 14 })}</button>
      </div>
    </div>
  );
}

// ─── Left: Party Panel ────────────────────────────────────────────────────────

interface PartyMember {
  id: number; name: string; cls: string; lvl: number;
  hp: number; hpMax: number; ac: number;
  you?: boolean; down?: boolean; color: string; initials: string;
}

function GtPartyPanel({ party, onAttack }: { party: PartyMember[]; onAttack: (c: PendingChange) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="fw-eyebrow" style={{ marginBottom: 2 }}>Party</div>
      {party.map((p, i) => (
        <div
          key={p.id}
          style={{
            display: 'flex', gap: 10, padding: 10,
            background: p.you ? 'linear-gradient(180deg, rgba(214,168,79,0.07), rgba(214,168,79,0.01))' : 'var(--surface)',
            border: '1px solid ' + (p.you ? 'rgba(214,168,79,0.4)' : p.down ? 'rgba(153,27,27,0.4)' : 'var(--border-soft)'),
            borderRadius: 8, position: 'relative', opacity: p.down ? 0.85 : 1,
          }}
        >
          {i === 0 && <span style={{ position: 'absolute', left: -1, top: 8, bottom: 8, width: 2, background: 'var(--gold)', borderRadius: 2 }} />}
          <div className="fw-avatar" style={{ background: `linear-gradient(135deg, ${p.color}33, #15101f)`, borderColor: p.down ? 'var(--blood)' : 'var(--border)' }}>
            {p.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 500 }}>{p.name}</div>
              {p.you  && <span className="fw-pill gold"  style={{ padding: '0 6px', fontSize: 9 }}>You</span>}
              {p.down && <span className="fw-pill blood" style={{ padding: '0 6px', fontSize: 9 }}>Down</span>}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{p.cls} · Lv {p.lvl}</div>
            <div className="fw-stat-bar" style={{ marginTop: 6 }}>
              <span className="lbl">HP</span>
              <div className="fw-bar hp bar"><i style={{ width: `${(p.hp / p.hpMax) * 100}%` }} /></div>
              <span className="num">{p.hp}/{p.hpMax}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--f-mono)' }}>
              <span>AC <b style={{ color: 'var(--text)' }}>{p.ac}</b></span>
              {p.down && <span style={{ color: 'var(--blood-bright)' }}>Death saves pending</span>}
            </div>
          </div>
        </div>
      ))}
      <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ justifyContent: 'center' }}
        onClick={() => onAttack({ kind: 'damage', target: 'Aedric', amount: 7, source: 'Brass spear hit' })}>
        {Icon('alert', { size: 11 })} Simulate incoming damage
      </button>
    </div>
  );
}

// ─── Left: Character Panel ────────────────────────────────────────────────────

function GtCharPanel({ character }: { character: Character | null }) {
  const name     = character?.name ?? 'Aedric Vael';
  const cls      = character?.className ?? 'Warlock';
  const lvl      = character?.level ?? 7;
  const race     = character?.race ?? 'Tiefling';
  const hp       = character?.hitPoints ?? 38;
  const hpMax    = character?.maxHitPoints ?? 52;
  const ac       = character?.armorClass ?? 14;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div className="fw-avatar lg" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), #15101f)', borderColor: 'var(--gold-deep)' }}>
          {name.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div className="fw-display" style={{ fontSize: 15, color: 'var(--text)' }}>{name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{race} {cls} · Lv {lvl}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        {[
          { lbl: 'HP', val: `${hp} / ${hpMax}`, tone: 'hp' },
          { lbl: 'AC', val: String(ac) },
          { lbl: 'SPD', val: '30 ft' },
        ].map(s => (
          <div key={s.lbl} style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-soft)', borderRadius: 6, padding: 6, textAlign: 'center' }}>
            <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>{s.lbl}</div>
            <div className="fw-display" style={{ fontSize: 14, color: s.tone === 'hp' ? 'var(--blood-bright)' : 'var(--gold-bright)', lineHeight: 1.1 }}>{s.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Left: Inventory Stub (STEP 4 will replace this) ─────────────────────────

function GtInventoryStub({ onUse }: { onUse: (c: PendingChange) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Inventory</div>
      {[
        { id: 'staff',  n: 'Staff of the Cinder-Reeve', tag: 'Pact weapon · 1d8 fire', icon: 'flame',    action: true },
        { id: 'potion', n: "Healer's Potion",            tag: '2d4+2 HP · standard',    icon: 'potion',   action: true },
        { id: 'key',    n: 'Brass censer-key',           tag: 'Binding-resonance trinket', icon: 'sparkles' },
        { id: 'tablet', n: 'Bone-tablet fragment',       tag: 'Embers arc clue',         icon: 'scroll'   },
      ].map(it => (
        <div key={it.id} style={{ display: 'flex', gap: 8, padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 6 }}>
          <span style={{ color: 'var(--gold)', display: 'grid', placeItems: 'center', width: 24 }}>{Icon(it.icon, { size: 13 })}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: 'var(--text)' }}>{it.n}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{it.tag}</div>
          </div>
          {it.action && (
            <button className="fw-btn fw-btn-gold fw-btn-sm"
              onClick={() => onUse({ kind: 'use-item', item: it.n, amount: '2d4+2 HP' })}
              style={{ fontSize: 10.5, padding: '3px 8px' }}>
              Use
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Left: Quests Panel ───────────────────────────────────────────────────────

function GtQuestsPanel() {
  const quests = [
    { title: 'The Gilded Tomb', kind: 'Main', active: true,
      steps: [
        { d: 'Reach the chapel beneath Ysavir.', done: true },
        { d: 'Confront the Cinder-Reeve.', done: true },
        { d: 'Decide the fate of the held shadow.', done: false, current: true },
        { d: 'Recover the brass censer-chain.', done: false },
      ] },
    { title: 'The Bone-tablet', kind: 'Side', active: false,
      steps: [{ d: 'Reassemble three fragments.', done: false, progress: '2 / 3' }, { d: "Find the tablet's reader.", done: false }] },
    { title: 'A Letter to Lira', kind: 'Personal', active: false,
      steps: [{ d: 'Write a letter, then never send it.', done: false }] },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {quests.map((q, qi) => (
        <div key={qi} style={{
          background: q.active ? 'linear-gradient(180deg, rgba(214,168,79,0.06), rgba(214,168,79,0.01))' : 'var(--surface)',
          border: '1px solid ' + (q.active ? 'rgba(214,168,79,0.3)' : 'var(--border-soft)'),
          borderRadius: 8, padding: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className="fw-pill dim">{q.kind}</span>
            <div className="fw-display" style={{ fontSize: 13, color: 'var(--text)' }}>{q.title}</div>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {q.steps.map((s, si) => (
              <li key={si} style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.4, fontFamily: 'var(--f-serif)', color: s.done ? 'var(--text-3)' : ('current' in s && s.current) ? 'var(--gold-bright)' : 'var(--text-2)' }}>
                <span style={{ width: 14, height: 14, borderRadius: 50, border: '1px solid ' + (s.done ? 'var(--gold-deep)' : ('current' in s && s.current) ? 'var(--gold-bright)' : 'var(--border)'), background: s.done ? 'rgba(214,168,79,0.2)' : 'transparent', display: 'grid', placeItems: 'center', color: 'var(--gold-bright)', flexShrink: 0, marginTop: 2 }}>
                  {s.done && Icon('check', { size: 9 })}
                </span>
                <span style={{ flex: 1, fontStyle: ('current' in s && s.current) ? 'italic' : 'normal', textDecoration: s.done ? 'line-through' : 'none' }}>{s.d}</span>
                {'progress' in s && s.progress && <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}>{String(s.progress)}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ─── Center: Scene Header ─────────────────────────────────────────────────────

function GtSceneHeader({ sceneState }: { sceneState: { name?: string; description?: string } | null }) {
  const title = sceneState?.name ?? 'Chapel of the Gilded Censer';
  const desc  = sceneState?.description ?? 'A low chapel built into the under-cathedral. The brazen censer above the altar still burns — barely.';

  return (
    <div style={{ padding: '18px 28px 0', position: 'relative' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
        {/* Scene thumbnail */}
        <div style={{ width: 200, height: 110, borderRadius: 8, background: 'linear-gradient(135deg, #1d1828, #06050b)', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 35% 30%, rgba(214,168,79,0.32), transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(124,58,237,0.3), transparent 65%)' }} />
          <svg style={{ position: 'absolute', inset: 0 }} width="100%" height="100%" viewBox="0 0 200 110" preserveAspectRatio="xMidYMid slice">
            <g fill="none" stroke="rgba(214,168,79,0.25)" strokeWidth="0.6">
              <path d="M0 88 L40 82 L70 76 L100 80 L140 70 L180 78 L200 75 V110 H0 Z" fill="rgba(0,0,0,0.4)" />
              <circle cx="100" cy="40" r="14" fill="rgba(214,168,79,0.5)" stroke="rgba(214,168,79,0.6)" />
            </g>
          </svg>
          <span style={{ position: 'absolute', left: 8, top: 8, fontSize: 10, color: 'var(--gold-bright)', fontFamily: 'var(--f-mono)', textShadow: '0 0 6px rgba(0,0,0,0.8)' }}>SCENE</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Current Scene</div>
          <div className="fw-display" style={{ fontSize: 22, color: 'var(--text)', letterSpacing: '0.04em' }}>{title}</div>
          <p className="fw-serif" style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.55, marginTop: 6, fontStyle: 'italic' }}>{desc}</p>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <span className="fw-pill dim">Indoor</span>
            <span className="fw-pill dim">Dim light · 15 ft</span>
            <span className="fw-pill">{Icon('sparkles', { size: 10 })} Faint divination</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Center: Story Entry ──────────────────────────────────────────────────────

function GtStoryEntry({ message }: { message: StoryMessage }) {
  const kind = message.speaker === 'dm' ? 'scene' : message.speaker === 'system' ? 'ai' : 'action';

  if (kind === 'scene') {
    return (
      <div className="fw-fade" style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <div className="fw-avatar dm" style={{ background: 'linear-gradient(135deg, rgba(214,168,79,0.3), #15101f)' }}>DM</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="fw-display" style={{ fontSize: 11.5, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold-bright)' }}>Dungeon Master</span>
            <span style={{ fontSize: 10, color: 'var(--text-4)', fontFamily: 'var(--f-mono)' }}>just now</span>
          </div>
          <p className="fw-serif" style={{ fontSize: 16, color: 'var(--text)', lineHeight: 1.6 }}>{message.body}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fw-fade" style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
      <div className="fw-avatar sm" style={{ background: 'linear-gradient(135deg, rgba(168,162,158,0.3), #15101f)' }}>
        {(message.author ?? 'P').slice(0, 2).toUpperCase()}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>
          <b style={{ color: 'var(--text-2)' }}>{message.author ?? 'Player'}</b> · action
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.55 }}>{message.body}</p>
      </div>
    </div>
  );
}

// ─── Center: Roll Request ─────────────────────────────────────────────────────

function GtRollRequest({ dice, onRoll, rolling }: { dice: DiceResult; onRoll: () => void; rolling: boolean }) {
  return (
    <div className="fw-fade" style={{ padding: 14, marginBottom: 18, background: 'linear-gradient(180deg, rgba(214,168,79,0.07), rgba(214,168,79,0.01))', border: '1px solid rgba(214,168,79,0.4)', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--gold)' }}>{Icon('dice', { size: 16 })}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text)' }}>
            <b style={{ color: 'var(--gold-bright)' }}>DM requests:</b> Charisma (Persuasion)
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--f-mono)' }}>
            {dice.die} {dice.bonus} · DC {dice.target}
          </div>
        </div>
        <button className="fw-btn fw-btn-gold" onClick={onRoll}>
          <svg className={'fw-d20 ' + (rolling ? 'rolling' : '')} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l8.5 5v8L12 21 3.5 16V8z"/><path d="M12 3v18M3.5 8L20.5 16M20.5 8L3.5 16"/>
          </svg>
          Roll {dice.die}{dice.bonus}
        </button>
        <button className="fw-btn fw-btn-ghost">Adv</button>
        <button className="fw-btn fw-btn-ghost">Dis</button>
      </div>
    </div>
  );
}

// ─── Center: Action Input ─────────────────────────────────────────────────────

interface ActionInputProps {
  value: string;
  setValue: (v: string) => void;
  suggestions: string[];
  onSend: () => void;
  onRollDice: () => void;
}

function GtActionInput({ value, setValue, suggestions, onSend, onRollDice }: ActionInputProps) {
  const [mode, setMode] = useState<ActionMode>('speak');

  const placeholder = mode === 'speak'
    ? 'Speak — in character to the table…'
    : mode === 'act'
    ? 'Describe your action. The Warden will request rolls.'
    : 'Whisper to the DM only…';

  return (
    <div style={{ borderTop: '1px solid var(--border-soft)', padding: 16, background: 'linear-gradient(180deg, rgba(11,10,16,0), rgba(11,10,16,0.5))' }}>
      {/* Suggestions */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <span className="fw-eyebrow" style={{ alignSelf: 'center', marginRight: 4, color: 'var(--arcane-bright)' }}>
          {Icon('sparkles', { size: 10 })} Suggested
        </span>
        {suggestions.map((s, i) => (
          <button key={i} className="fw-btn fw-btn-ghost fw-btn-sm" style={{ fontSize: 11.5, padding: '4px 10px', borderColor: 'rgba(124,58,237,0.3)', color: 'var(--text-2)' }}
            onClick={() => setValue(s)}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: 1, background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
          {/* Mode buttons */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            {([
              { id: 'speak', label: 'Speak',         icon: 'users' },
              { id: 'act',   label: 'Act',            icon: 'sword' },
              { id: 'aside', label: 'Aside (DM only)', icon: 'eye'  },
            ] as { id: ActionMode; label: string; icon: string }[]).map(t => (
              <button key={t.id} onClick={() => setMode(t.id)}
                className="fw-btn fw-btn-ghost fw-btn-sm"
                style={{ padding: '3px 8px', fontSize: 11, color: mode === t.id ? 'var(--gold-bright)' : 'var(--text-3)', borderColor: mode === t.id ? 'var(--gold-deep)' : 'transparent', background: mode === t.id ? 'rgba(214,168,79,0.08)' : 'transparent' }}>
                {Icon(t.icon, { size: 10 })} {t.label}
              </button>
            ))}
          </div>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSend(); }}
            placeholder={placeholder}
            rows={2}
            style={{ width: '100%', background: 'transparent', border: 0, outline: 0, resize: 'none', color: 'var(--text)', fontFamily: 'var(--f-serif)', fontSize: 15, lineHeight: 1.5, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button className="fw-btn fw-btn-icon fw-btn-ghost" onClick={onRollDice}>{Icon('dice', { size: 14 })}</button>
          <button className="fw-btn fw-btn-icon fw-btn-ghost">{Icon('sparkles', { size: 14 })}</button>
        </div>
        <button className="fw-btn fw-btn-gold fw-btn-lg" style={{ height: '100%' }} onClick={onSend}>
          {Icon('send', { size: 13 })} Commit
        </button>
      </div>
    </div>
  );
}

// ─── Right: Dice Panel ────────────────────────────────────────────────────────

const DICE_FACES = [
  { n: 'd4',   v: 4  }, { n: 'd6',   v: 6  }, { n: 'd8',  v: 8  },
  { n: 'd10',  v: 10 }, { n: 'd12',  v: 12 },
  { n: 'd20',  v: 20, primary: true },
  { n: 'd100', v: 100 },
];

function GtDicePanel({ result, onRoll, rolling }: { result: DiceResult; onRoll: () => void; rolling: boolean }) {
  const colorByKind = (k: DiceResult['kind']) =>
    k === 'crit' ? 'var(--gold-bright)' : k === 'fumble' ? 'var(--blood-bright)' : 'var(--text)';
  const labelByKind = (k: DiceResult['kind']) =>
    k === 'crit' ? 'Critical.' : k === 'success' ? 'Success.' : k === 'fumble' ? 'Fumble.' : 'Failure.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Last roll display */}
      <div style={{ background: 'var(--bg-deep)', border: '1px solid ' + (result.kind === 'crit' ? 'var(--gold)' : result.kind === 'success' ? 'var(--gold-deep)' : 'var(--border)'), borderRadius: 10, padding: 18, textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: result.kind === 'crit' ? '0 0 30px -6px rgba(214,168,79,0.5)' : 'none' }}>
        {result.kind === 'crit' && <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(214,168,79,0.18), transparent 70%)' }} />}
        <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Last Roll · {result.die}{result.bonus}</div>
        <div className={'fw-display ' + (rolling ? 'fw-die-shake' : '')} style={{ fontSize: 56, lineHeight: 1, color: colorByKind(result.kind) }}>
          {result.value}
          <span style={{ fontSize: 22, color: 'var(--text-3)' }}> {result.bonus}</span>
        </div>
        <div style={{ marginTop: 4, fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-3)' }}>
          = {result.value + 3} vs DC {result.target}
        </div>
        <div style={{ marginTop: 6, fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 13, color: colorByKind(result.kind) }}>
          {labelByKind(result.kind)}
        </div>
      </div>

      {/* Quick dice grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span className="fw-eyebrow">Quick Dice</span>
          <div className="fw-seg">
            {['Normal', 'Adv', 'Dis'].map(o => (
              <button key={o} className="fw-seg-btn">{o}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {DICE_FACES.map(d => (
            <button key={d.n} onClick={d.primary ? onRoll : undefined}
              className="fw-btn"
              style={{ padding: '12px 0', justifyContent: 'center', flexDirection: 'column', gap: 0, background: d.primary ? 'linear-gradient(180deg, #2A1F3D, #15101f)' : 'var(--surface-2)', borderColor: d.primary ? 'var(--gold-deep)' : 'var(--border-soft)', color: d.primary ? 'var(--gold-bright)' : 'var(--text-2)', boxShadow: d.primary ? '0 0 16px -4px rgba(214,168,79,0.3)' : 'none' }}>
              <span className="fw-display" style={{ fontSize: 16, letterSpacing: '0.06em' }}>{d.n}</span>
              <span style={{ fontSize: 9, color: 'var(--text-4)', fontFamily: 'var(--f-mono)' }}>1–{d.v}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Saved rolls */}
      <div>
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Saved Rolls</div>
        {[
          { n: 'Eldritch Blast',   d: '2d10 + 4 · force',  icon: 'flame' },
          { n: 'Persuasion (CHA)', d: '1d20 + 6',           icon: 'users' },
          { n: 'Death Save',       d: '1d20',               icon: 'skull', blood: true },
        ].map((r, i) => (
          <button key={i} className="fw-btn fw-btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px', marginBottom: 4, fontSize: 12 }}>
            <span style={{ color: r.blood ? 'var(--blood-bright)' : 'var(--gold)' }}>{Icon(r.icon, { size: 12 })}</span>
            <span style={{ flex: 1, textAlign: 'left' }}>{r.n}</span>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--text-3)' }}>{r.d}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Right: Combat Panel ──────────────────────────────────────────────────────

interface CombatPanelProps {
  encounter: EncounterState | null;
  onChange: (c: PendingChange) => void;
}

function GtCombatPanel({ encounter, onChange }: CombatPanelProps) {
  if (!encounter) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <div className="fw-eyebrow" style={{ marginBottom: 8 }}>No Active Combat</div>
        <p className="fw-serif" style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic' }}>
          Start an encounter from the banner to begin tracking initiative.
        </p>
      </div>
    );
  }

  const combatants = encounter.combatants ?? [];
  const activeIdx  = encounter.activeIndex ?? 0;
  const round      = encounter.round ?? 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="fw-pill blood">
          <span style={{ width: 6, height: 6, borderRadius: 50, background: 'currentColor' }} /> Round {round}
        </span>
        <span style={{ flex: 1 }} />
        <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm">{Icon('chevR', { size: 12 })}</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {combatants.map((c, i) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: i === activeIdx ? 'linear-gradient(90deg, rgba(153,27,27,0.18), transparent)' : 'var(--surface)', border: '1px solid ' + (i === activeIdx ? 'var(--blood)' : 'var(--border-soft)'), borderRadius: 6, position: 'relative' }}>
            {i === activeIdx && <span style={{ position: 'absolute', left: -1, top: 6, bottom: 6, width: 2, background: 'var(--blood-bright)', borderRadius: 2 }} />}
            <span className="fw-mono" style={{ width: 24, fontSize: 13, color: 'var(--gold-bright)', textAlign: 'center' }}>{c.initiative}</span>
            <span style={{ width: 8, height: 8, borderRadius: 50, background: c.type === 'player' ? 'var(--success)' : 'var(--blood-bright)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text)', flex: 1 }}>{c.name}</span>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--text-3)' }}>{c.hitPoints}/{c.maxHitPoints}</span>
            {i === activeIdx && <span style={{ color: 'var(--blood-bright)', fontSize: 10 }}>NOW</span>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <button className="fw-btn fw-btn-blood" style={{ justifyContent: 'center' }} onClick={() => onChange({ kind: 'damage', target: 'Party', amount: 7, source: 'Enemy attack' })}>
          {Icon('minus', { size: 12 })} Damage
        </button>
        <button className="fw-btn fw-btn-ghost" style={{ justifyContent: 'center' }} onClick={() => onChange({ kind: 'heal', target: 'Party', amount: 9, source: "Healer's potion" })}>
          {Icon('heart', { size: 12 })} Heal
        </button>
        <button className="fw-btn fw-btn-ghost" style={{ justifyContent: 'center' }}>{Icon('sparkles', { size: 12 })} Condition</button>
        <button className="fw-btn fw-btn-ghost" style={{ justifyContent: 'center' }}>{Icon('plus',     { size: 12 })} NPC</button>
      </div>

      <button className="fw-btn fw-btn-gold" style={{ justifyContent: 'center' }}>
        End Turn {Icon('chevR', { size: 12 })}
      </button>
    </div>
  );
}

// ─── Right: AI DM Panel ───────────────────────────────────────────────────────

interface AIDMPanelProps {
  on: boolean; setOn: (v: boolean) => void;
  tone: string; setTone: (v: string) => void;
  strict: string; setStrict: (v: string) => void;
  onChange: (c: PendingChange) => void;
}

function GtAIDMPanel({ on, setOn, tone, setTone, strict, setStrict, onChange }: AIDMPanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'linear-gradient(180deg, rgba(124,58,237,0.10), rgba(124,58,237,0.02))', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 50, background: 'rgba(124,58,237,0.18)', border: '1px solid var(--arcane)', display: 'grid', placeItems: 'center', color: 'var(--arcane-bright)' }}>
          {Icon('wand', { size: 14 })}
        </div>
        <div style={{ flex: 1 }}>
          <div className="fw-display" style={{ fontSize: 12.5, color: 'var(--text)' }}>AI Warden</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', fontFamily: 'var(--f-serif)' }}>
            {on ? 'Assistant · awaits the DM.' : 'Off.'}
          </div>
        </div>
        <Toggle on={on} onChange={setOn} />
      </div>

      <Field label="Tone">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
          {['Balanced', 'Grim', 'Heroic', 'Mystery'].map(t => (
            <button key={t} onClick={() => setTone(t)}
              className={'fw-btn ' + (tone === t ? '' : 'fw-btn-ghost') + ' fw-btn-sm'}
              style={{ justifyContent: 'center', borderColor: tone === t ? 'var(--gold-deep)' : undefined, color: tone === t ? 'var(--gold-bright)' : undefined, background: tone === t ? 'rgba(214,168,79,0.08)' : undefined }}>
              {t}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Rule Strictness">
        <Seg value={strict} onChange={setStrict} options={['Casual', 'Standard', 'Hardcore']} />
      </Field>

      <div>
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Warden Actions</div>
        {[
          { icon: 'sparkles', name: 'Generate Scene',       desc: 'From recent log + chosen tone.' },
          { icon: 'alert',    name: 'Suggest Consequence',  desc: 'Outcome of last action.'       },
          { icon: 'book',     name: 'Ask Rules',            desc: 'RAW citation. No state change.' },
          { icon: 'users',    name: 'Voice NPC',            desc: 'Speak as the scene NPC.'       },
          { icon: 'map',      name: 'Random Encounter',     desc: 'By current region.'            },
        ].map(a => (
          <button key={a.name} className="fw-btn fw-btn-ghost" disabled={!on}
            style={{ width: '100%', padding: '8px 10px', justifyContent: 'flex-start', textAlign: 'left', borderColor: 'rgba(124,58,237,0.25)', marginBottom: 4 }}>
            <span style={{ color: 'var(--arcane-bright)' }}>{Icon(a.icon, { size: 12 })}</span>
            <div style={{ flex: 1, lineHeight: 1.2 }}>
              <div style={{ fontSize: 12, color: 'var(--text)' }}>{a.name}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{a.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-4)', fontStyle: 'italic', fontFamily: 'var(--f-serif)', lineHeight: 1.5, paddingInline: 4 }}>
        The Warden suggests. It never commits damage, conditions, death, or inventory loss without your approval.
      </div>
    </div>
  );
}

// ─── Right: Tools Panel ───────────────────────────────────────────────────────

function GtToolsPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Session Tools</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[
            { icon: 'pause',  label: 'Pause'    },
            { icon: 'scroll', label: 'Recap'    },
            { icon: 'bell',   label: 'Bell'     },
            { icon: 'bag',    label: 'Loot'     },
            { icon: 'map',    label: 'Map'      },
            { icon: 'layers', label: 'Handouts' },
          ].map(t => (
            <button key={t.label} className="fw-btn fw-btn-ghost" style={{ flexDirection: 'column', padding: '10px 6px', gap: 4 }}>
              <span style={{ color: 'var(--gold)' }}>{Icon(t.icon, { size: 14 })}</span>
              <span style={{ fontSize: 11 }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Rules · Conditions</div>
        <input className="fw-input" placeholder="Search rules, spells, conditions…" />
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { n: 'Prone',         t: 'Disadv on attack. Melee atks vs prone gain adv.'   },
            { n: 'Concentration', t: 'DC 10 or half damage CON save.'                    },
            { n: 'Unconscious',   t: 'Drops what holds. Auto-fails STR / DEX saves.'     },
          ].map((r, i) => (
            <div key={i} style={{ padding: 8, background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 5 }}>
              <div style={{ fontSize: 12, color: 'var(--text)' }}>{r.n}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--f-serif)', fontStyle: 'italic' }}>{r.t}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function GtConfirmModal({ change, onClose }: { change: PendingChange; onClose: () => void }) {
  const isDamage = change.kind === 'damage';
  const isHeal   = change.kind === 'heal';

  return (
    <div className="fw-overlay">
      <div className={'fw-modal ' + (isDamage ? '' : 'gold')}>
        <div className="fw-modal-head" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 28, height: 28, borderRadius: 50, background: isDamage ? 'rgba(153,27,27,0.18)' : 'rgba(214,168,79,0.15)', border: '1px solid ' + (isDamage ? 'var(--blood)' : 'var(--gold-deep)'), display: 'grid', placeItems: 'center', color: isDamage ? '#FCA5A5' : 'var(--gold-bright)' }}>
            {Icon(isDamage ? 'alert' : isHeal ? 'heart' : 'bag', { size: 14 })}
          </span>
          <div className="fw-display" style={{ fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase', color: isDamage ? '#FCA5A5' : 'var(--gold-bright)' }}>
            {isDamage ? 'Confirm Damage' : isHeal ? 'Confirm Healing' : 'Confirm Action'}
          </div>
          <span style={{ flex: 1 }} />
          <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" onClick={onClose}>{Icon('x', { size: 12 })}</button>
        </div>
        <div className="fw-modal-body" style={{ padding: '14px 16px' }}>
          <p className="fw-serif" style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.55, fontStyle: 'italic' }}>
            {isDamage && <><b style={{ color: 'var(--text)' }}>{change.target}</b> takes <b style={{ color: '#FCA5A5' }}>{change.amount}</b> damage. Source: <i>{change.source}</i>.</>}
            {isHeal   && <><b style={{ color: 'var(--text)' }}>{change.target}</b> recovers <b style={{ color: 'var(--gold-bright)' }}>{change.amount}</b> HP from <i>{change.source}</i>.</>}
            {!isDamage && !isHeal && <>{change.kind}: {JSON.stringify(change)}</>}
          </p>
          {change.aiProposed && (
            <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--arcane-bright)', fontFamily: 'var(--f-serif)', fontStyle: 'italic', display: 'flex', gap: 6, alignItems: 'center' }}>
              {Icon('wand', { size: 12 })} Proposed by the AI Warden — your approval finalizes it.
            </div>
          )}
        </div>
        <div className="fw-modal-foot">
          <button className="fw-btn fw-btn-ghost" onClick={onClose}>Reject</button>
          <button className={'fw-btn ' + (isDamage ? 'fw-btn-blood' : 'fw-btn-gold')} onClick={onClose}>
            {Icon('check', { size: 12 })} Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
