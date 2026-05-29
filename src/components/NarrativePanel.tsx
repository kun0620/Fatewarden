/**
 * NarrativePanel — ported from design4 screens-narrative-uikit.jsx
 * 4 tabs: Scene | Journal | Companion | Relations
 * All local state only — no engine/store touches
 */
import React, { useState, useMemo } from 'react';
import { Icon } from './ui/Icons';
import { Seg } from './ui/Primitives';
import { TabBar } from './ui/TabBar';
import type { SceneState } from '../engine/scene/sceneTypes';
import type { CompanionSheet } from '../engine/companion/companionTypes';
import type { JournalEntry as EngineJournalEntry } from '../engine/journal/journalTypes';
import type { AffinityRecord } from '../engine/relationship/relationshipTypes';
import type { GameEvent } from '../engine/events/types';

/* ============================================================
   DATA CONSTANTS
   ============================================================ */

type SceneModeKey = 'exploration' | 'combat' | 'social' | 'rest' | 'horror' | 'transition';
interface SceneModeInfo {
  label: string;
  color: string;
  glow: string;
  tone: string;
  icon: string;
}
const SCENE_MODES: Record<SceneModeKey, SceneModeInfo> = {
  exploration: { label: 'Exploration', color: '#5EEAD4', glow: 'rgba(94,234,212,0.4)',  tone: 'curious, descriptive',  icon: 'compass' },
  combat:      { label: 'Combat',      color: '#C72D2D', glow: 'rgba(199,45,45,0.5)',   tone: 'urgent, tactical',      icon: 'sword'   },
  social:      { label: 'Social',      color: '#F59E0B', glow: 'rgba(245,158,11,0.4)',  tone: 'warm, diplomatic',      icon: 'users'   },
  rest:        { label: 'Rest',        color: '#EAC074', glow: 'rgba(234,192,116,0.4)', tone: 'calm, reflective',      icon: 'heart'   },
  horror:      { label: 'Horror',      color: '#84CC16', glow: 'rgba(132,204,22,0.4)',  tone: 'oppressive, uncertain', icon: 'skull'   },
  transition:  { label: 'Transition',  color: '#A8A29E', glow: 'rgba(168,162,158,0.3)', tone: 'neutral',               icon: 'chevR'   },
};

interface AffinityTier { range: [number, number]; label: string; color: string; }
const AFFINITY_TIERS: AffinityTier[] = [
  { range: [76, 100],   label: 'Allied',      color: '#86EFAC' },
  { range: [26, 75],    label: 'Friendly',    color: '#5EEAD4' },
  { range: [-25, 25],   label: 'Neutral',     color: '#A8A29E' },
  { range: [-75, -26],  label: 'Unfriendly',  color: '#F59E0B' },
  { range: [-100, -76], label: 'Hostile',     color: '#C72D2D' },
];
const affinityTier = (v: number): AffinityTier =>
  AFFINITY_TIERS.find(t => v >= t.range[0] && v <= t.range[1]) ?? AFFINITY_TIERS[2];

interface LoyaltyTier { range: [number, number]; label: string; color: string; }
const LOYALTY_TIERS: LoyaltyTier[] = [
  { range: [75, 100], label: 'Devoted',  color: '#EAC074' },
  { range: [50, 74],  label: 'Friendly', color: '#86EFAC' },
  { range: [25, 49],  label: 'Neutral',  color: '#A8A29E' },
  { range: [1, 24],   label: 'Hostile',  color: '#F87171' },
  { range: [0, 0],    label: 'Betrayal', color: '#C72D2D' },
];
const loyaltyTier = (v: number): LoyaltyTier =>
  LOYALTY_TIERS.find(t => v >= t.range[0] && v <= t.range[1]) ?? LOYALTY_TIERS[2];

type EntryTypeKey = 'memory' | 'clue' | 'quest' | 'recap';
interface EntryTypeInfo { label: string; icon: string; color: string; glyph: string; }
const ENTRY_TYPES: Record<EntryTypeKey, EntryTypeInfo> = {
  memory: { label: 'Memory',       icon: 'scroll', color: '#EAC074', glyph: '📖' },
  clue:   { label: 'Clue',         icon: 'eye',    color: '#A271FF', glyph: '🔍' },
  quest:  { label: 'Quest Update', icon: 'sword',  color: '#5EEAD4', glyph: '⚔️' },
  recap:  { label: 'Recap',        icon: 'book',   color: '#F59E0B', glyph: '📜' },
};

/* ============================================================
   SECTION 10.1 — SCENE MODE
   ============================================================ */

function SceneModeBadges() {
  const [active, setActive] = useState<SceneModeKey>('exploration');
  const cur = SCENE_MODES[active];
  return (
    <div>
      <div className="fw-scene-modes">
        {(Object.entries(SCENE_MODES) as [SceneModeKey, SceneModeInfo][]).map(([k, m]) => (
          <button key={k} onClick={() => setActive(k)}
            className={'fw-scene-mode' + (active === k ? ' active' : '')}
            style={{
              borderColor: active === k ? m.color : 'var(--border-soft)',
              background: active === k ? `linear-gradient(180deg, ${m.color}22, ${m.color}06)` : 'var(--surface-2)',
              boxShadow: active === k ? `0 0 18px -4px ${m.glow}` : 'none',
            }}>
            <span style={{ color: m.color }}>{Icon(m.icon, { size: 16 })}</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div className="fw-display" style={{ fontSize: 13, color: active === k ? m.color : 'var(--text)' }}>{m.label}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--f-serif)', fontStyle: 'italic' }}>{m.tone}</div>
            </div>
          </button>
        ))}
      </div>
      <div className="fw-scene-active-preview" style={{ borderColor: cur.color + '55', background: `linear-gradient(180deg, ${cur.color}11, transparent)` }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="fw-scene-pill" style={{ background: cur.color, color: 'rgba(13,10,22,0.85)' }}>
            {Icon(cur.icon, { size: 12 })} {cur.label}
          </span>
          <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-2)', fontStyle: 'italic', fontFamily: 'var(--f-serif)' }}>
            Narrator tone shifts to · <b style={{ color: cur.color, fontStyle: 'normal', fontFamily: 'var(--f-display)', letterSpacing: '0.04em' }}>{cur.tone}</b>
          </span>
        </div>
      </div>
    </div>
  );
}

function RealityStability() {
  const [level, setLevel] = useState(2);
  const tiers = [
    { l: 0, n: 'Stable',     desc: 'Everything is as it appears.',   effect: 'no effect' },
    { l: 1, n: 'Unstable',   desc: 'Things shift at the edges.',     effect: 'subtle shimmer' },
    { l: 2, n: 'Fracturing', desc: 'Reality bends and warps.',       effect: 'distortion · audio gap' },
    { l: 3, n: 'Broken',     desc: 'Nothing here can be trusted.',   effect: 'heavy distortion · color drift' },
  ];
  return (
    <div className="fw-reality">
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, alignItems: 'stretch' }}>
        <div>
          <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Stability tiers · click to set</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {tiers.map(t => (
              <button key={t.l} onClick={() => setLevel(t.l)}
                className={'fw-reality-tier' + (level === t.l ? ' active' : '')}
                style={{ borderColor: level === t.l ? '#84CC16' : 'var(--border-soft)', background: level === t.l ? 'rgba(132,204,22,0.06)' : 'var(--surface-2)' }}>
                <span className="fw-mono" style={{ fontSize: 11, width: 16, color: '#84CC16' }}>{t.l}</span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text)' }}>{t.n}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontStyle: 'italic', fontFamily: 'var(--f-serif)' }}>{t.desc}</div>
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-4)', fontFamily: 'var(--f-mono)' }}>{t.effect}</span>
              </button>
            ))}
          </div>
        </div>
        <div className={'fw-reality-preview lvl-' + level}>
          <div className="fw-reality-glitch" />
          <div style={{ position: 'relative', padding: 16 }}>
            <div className="fw-eyebrow" style={{ color: '#84CC16', marginBottom: 6 }}>Preview · distortion</div>
            <div className="fw-display" style={{ fontSize: 16, color: 'var(--text)', lineHeight: 1.3, marginBottom: 8 }}>The chapel breathes.</div>
            <p className="fw-serif" style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5, fontStyle: 'italic' }}>
              The brazen censer burns blue, then violet, then nothing at all. You blink and the wall is closer.
            </p>
            <div className="fw-reality-bar">
              {[0,1,2,3].map(i => (
                <span key={i} style={{
                  background: i <= level ? '#84CC16' : 'var(--bg-deep)',
                  boxShadow: i <= level ? '0 0 6px #84CC16' : 'none',
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ThreatClock {
  id: number; name: string; current: number; max: number; trigger: string; color: string;
}

function ThreatClockWidget({ clock, onAdvance, onRetreat }: { clock: ThreatClock; onAdvance: () => void; onRetreat: () => void }) {
  const pct = clock.current / clock.max;
  const triggered = clock.current >= clock.max;
  const size = 120, r = 50, cx = size / 2, cy = size / 2;
  const segments = Array.from({ length: clock.max }, (_, i) => {
    const a1 = (i / clock.max) * Math.PI * 2 - Math.PI / 2;
    const a2 = ((i + 1) / clock.max) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
    const x2 = cx + Math.cos(a2) * r, y2 = cy + Math.sin(a2) * r;
    const filled = i < clock.current;
    const tierColor = pct < 0.5 ? '#A8A29E' : pct < 0.75 ? '#F59E0B' : pct < 1 ? '#F87171' : 'var(--blood-bright)';
    return (
      <path key={i}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
        fill={filled ? tierColor : 'var(--bg-deep)'}
        stroke="var(--bg)"
        strokeWidth="2"
      />
    );
  });
  return (
    <div className={'fw-threat-card' + (triggered ? ' triggered' : '')}>
      <div className="fw-threat-clock-svg">
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          {segments}
          <circle cx={cx} cy={cy} r={r * 0.55} fill="var(--surface-2)" stroke="var(--border)" />
          <text x={cx} y={cy + 5} textAnchor="middle" fill="var(--text)" fontFamily="Cinzel" fontSize="18">
            {clock.current}/{clock.max}
          </text>
        </svg>
      </div>
      <div className="fw-display" style={{ fontSize: 13, color: triggered ? 'var(--blood-bright)' : 'var(--text)', textAlign: 'center', marginTop: 8 }}>
        {clock.name}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', fontFamily: 'var(--f-serif)', textAlign: 'center', marginTop: 4, lineHeight: 1.4 }}>
        {triggered
          ? <span style={{ color: 'var(--blood-bright)' }}>TRIGGERED · {clock.trigger}</span>
          : <>"{clock.trigger}"</>}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 10, justifyContent: 'center' }}>
        <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={onRetreat}>{Icon('minus', { size: 10 })} Retreat</button>
        <button className="fw-btn fw-btn-blood fw-btn-sm" onClick={onAdvance}>{Icon('plus', { size: 10 })} Advance</button>
      </div>
    </div>
  );
}

function ThreatClocks() {
  const [clocks, setClocks] = useState<ThreatClock[]>([
    { id: 1, name: 'The ritual completes',    current: 4, max: 6, trigger: 'A demon is summoned.',               color: 'var(--blood-bright)' },
    { id: 2, name: 'Halric bleeds out',        current: 2, max: 4, trigger: 'Halric dies. Death save fails.',     color: '#F87171' },
    { id: 3, name: 'Reinforcements arrive',    current: 1, max: 8, trigger: 'Brass-Spear reserves enter.',        color: '#F59E0B' },
  ]);
  const advance = (id: number) => setClocks(cs => cs.map(c => c.id === id ? { ...c, current: Math.min(c.max, c.current + 1) } : c));
  const retreat = (id: number) => setClocks(cs => cs.map(c => c.id === id ? { ...c, current: Math.max(0, c.current - 1) } : c));
  return (
    <div className="fw-threat-grid">
      {clocks.map(c => (
        <ThreatClockWidget key={c.id} clock={c} onAdvance={() => advance(c.id)} onRetreat={() => retreat(c.id)} />
      ))}
      <button className="fw-threat-new">
        <span style={{ color: 'var(--text-4)' }}>{Icon('plus', { size: 22 })}</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>New clock</span>
      </button>
    </div>
  );
}

function DangerLevel() {
  const [level, setLevel] = useState(3);
  const tiers = [
    { l: 0, n: 'None',    desc: 'Truly safe — only flavor.',    color: 'var(--success)'     },
    { l: 1, n: 'Low',     desc: 'Background tension.',          color: '#86EFAC'            },
    { l: 2, n: 'Medium',  desc: 'Threats present.',             color: '#F59E0B'            },
    { l: 3, n: 'High',    desc: 'Hostile and waiting.',         color: '#F87171'            },
    { l: 4, n: 'Extreme', desc: 'Imminent violence/death.',     color: 'var(--blood-bright)' },
  ];
  const cur = tiers[level];
  return (
    <div className="fw-danger">
      <div className="fw-danger-head">
        <div>
          <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Danger Level</div>
          <div className="fw-display" style={{ fontSize: 22, color: cur.color }}>{cur.n}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', fontFamily: 'var(--f-serif)' }}>{cur.desc}</div>
        </div>
        <span className="fw-pill" style={{ background: cur.color + '22', borderColor: cur.color, color: cur.color, marginLeft: 'auto' }}>
          {cur.n} · L{level}
        </span>
      </div>
      <div className="fw-danger-bar">
        {tiers.map(t => (
          <button key={t.l} onClick={() => setLevel(t.l)}
            className="fw-danger-seg"
            style={{
              background: t.l <= level ? t.color : 'var(--bg-deep)',
              boxShadow: t.l === level ? `0 0 10px ${t.color}` : 'none',
              borderColor: t.l <= level ? t.color : 'var(--border-soft)',
            }}
            title={t.n}>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: t.l <= level ? 'rgba(0,0,0,0.6)' : 'var(--text-4)' }}>{t.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

type ObjState = 'active' | 'completed' | 'failed';
interface Objective { id: number; t: string; state: ObjState; flavor: string; }

function ObjectivesList() {
  const [items, setItems] = useState<Objective[]>([
    { id: 1, t: 'Confront the Cinder-Reeve',       state: 'active',    flavor: 'It has not moved since you arrived.' },
    { id: 2, t: 'Reach the chapel beneath Ysavir', state: 'completed', flavor: 'Done. The brass doors are open.' },
    { id: 3, t: 'Save Halric Dale',                state: 'active',    flavor: 'He bleeds at the threshold.' },
    { id: 4, t: 'Keep the bone-tablet hidden',     state: 'failed',    flavor: 'The Reeve saw it. Of course it did.' },
    { id: 5, t: 'Recover the brass censer-chain',  state: 'active',    flavor: 'Still in the binding circle.' },
  ]);
  const cycle = (id: number) => setItems(xs =>
    xs.map(x => x.id === id ? { ...x, state: (x.state === 'active' ? 'completed' : x.state === 'completed' ? 'failed' : 'active') as ObjState } : x)
  );
  return (
    <div className="fw-objs">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(it => (
          <div key={it.id} className={'fw-obj-row ' + it.state}>
            <button className={'fw-obj-mark ' + it.state} onClick={() => cycle(it.id)}>
              {it.state === 'completed' && Icon('check', { size: 12 })}
              {it.state === 'failed' && Icon('x', { size: 12 })}
              {it.state === 'active' && <span className="fw-obj-pulse" />}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 13,
                color: it.state !== 'active' ? 'var(--text-3)' : 'var(--text)',
                textDecoration: it.state === 'completed' ? 'line-through' : 'none',
              }}>{it.t}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-4)', fontStyle: 'italic', fontFamily: 'var(--f-serif)', marginTop: 2 }}>{it.flavor}</div>
            </div>
            <span className={'fw-obj-state ' + it.state}>{it.state}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon('plus', { size: 11 })} Add objective</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--f-mono)' }}>
          {items.filter(i => i.state === 'active').length} active · {items.filter(i => i.state === 'completed').length} done · {items.filter(i => i.state === 'failed').length} failed
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   SECTION 10.2 — JOURNAL
   ============================================================ */

interface JournalEntry { type: EntryTypeKey; auto: boolean; title: string; time: string; body: string; tags?: string[]; }

function JournalTimeline() {
  const entries: JournalEntry[] = [
    { type: 'recap',  auto: true,  title: 'Session 15 · The Hollow Crown',         time: '2 days ago',     body: 'The party reached the chapel. Halric fell. The Cinder-Reeve waited.' },
    { type: 'memory', auto: true,  title: 'Halric stabilized — barely',            time: 'session 15',     body: "The warlock's Medicine check (DC 13 → 17). He breathes shallow, but breathes." },
    { type: 'clue',   auto: false, title: 'Brass-Chain liturgy fragment',          time: 'Session 15 mid', body: 'Pew 4, second board from north. Words match Mother Censer\'s old prayers.', tags: ['bone-tablet', 'Mother Censer'] },
    { type: 'quest',  auto: true,  title: 'Confront the Cinder-Reeve · active',   time: 'Session 15',     body: 'The Reeve speaks. We have not answered yet.' },
    { type: 'memory', auto: false, title: 'Note: the Reeve uses past tense only', time: '1h ago',          body: 'Worth checking against the binding circle inscriptions.', tags: ['Cinder-Reeve'] },
  ];
  return (
    <div className="fw-journal-timeline">
      {entries.map((e, i) => {
        const t = ENTRY_TYPES[e.type];
        return (
          <div key={i} className="fw-journal-row" style={{ borderLeftColor: t.color }}>
            <div className="fw-journal-row-head">
              <span className="fw-journal-icon" style={{ background: t.color + '22', borderColor: t.color, color: t.color }}>
                {Icon(t.icon, { size: 12 })}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--f-display)', letterSpacing: '0.02em' }}>{e.title}</span>
                  <span className="fw-pill" style={{ fontSize: 9, padding: '0 5px', borderColor: t.color + '55', color: t.color, background: t.color + '11' }}>{t.label}</span>
                  {e.auto
                    ? <span className="fw-pill" style={{ fontSize: 8.5, padding: '0 5px', background: 'rgba(124,58,237,0.10)', borderColor: 'rgba(124,58,237,0.35)', color: 'var(--arcane-bright)' }}>AUTO</span>
                    : <span className="fw-pill gold" style={{ fontSize: 8.5, padding: '0 5px' }}>Player note</span>}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-4)', fontFamily: 'var(--f-mono)' }}>{e.time}</div>
              </div>
            </div>
            <p className="fw-serif" style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, fontStyle: e.auto ? 'normal' : 'italic', paddingLeft: 32, marginTop: 4 }}>{e.body}</p>
            {e.tags && (
              <div style={{ display: 'flex', gap: 4, marginTop: 6, paddingLeft: 32, flexWrap: 'wrap' }}>
                {e.tags.map(tag => <span key={tag} className="fw-pill dim" style={{ fontSize: 9, padding: '0 5px' }}>#{tag}</span>)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function JournalFullView() {
  const [filter, setFilter] = useState<'all' | EntryTypeKey>('all');
  const filterBtns: Array<['all' | EntryTypeKey, string, string, string | null]> = [
    ['all', 'All', 'var(--text-2)', null],
    ...( Object.entries(ENTRY_TYPES) as [EntryTypeKey, EntryTypeInfo][] ).map(([k, t]) => [k, t.label, t.color, t.icon] as ['all' | EntryTypeKey, string, string, string]),
  ];
  return (
    <div className="fw-journal-full">
      <div className="fw-journal-toolbar">
        <div className="fw-input-wrap" style={{ flex: '1 1 240px', maxWidth: 320 }}>
          <span className="fw-input-icon">{Icon('search', { size: 12 })}</span>
          <input className="fw-input has-icon" placeholder="Search entries, tags, NPCs…" />
        </div>
        <div className="fw-journal-filters">
          {filterBtns.map(([k, l, c, ic]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={'fw-journal-filter' + (filter === k ? ' active' : '')}
              style={{ borderColor: filter === k ? c : 'var(--border-soft)', color: filter === k ? c : 'var(--text-3)', background: filter === k ? c + '11' : 'transparent' }}>
              {ic && Icon(ic, { size: 10 })} {l}
            </button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <button className="fw-btn fw-btn-gold fw-btn-sm">{Icon('plus', { size: 11 })} New note</button>
      </div>
      <div className="fw-journal-sessions">
        {[
          { s: 'Session 15 · The Hollow Crown',       d: '2 days ago',  count: 12, open: true },
          { s: 'Session 14 · Brass-Spear ambush',     d: '9 days ago',  count: 8,  open: false },
          { s: 'Session 13 · Return to Ysavir',       d: '16 days ago', count: 14, open: false },
        ].map((s, i) => (
          <div key={i} className="fw-journal-session">
            <div className="fw-journal-session-head">
              <div className="fw-display" style={{ fontSize: 14, color: 'var(--text)' }}>{s.s}</div>
              <span style={{ fontSize: 10.5, color: 'var(--text-4)', fontFamily: 'var(--f-mono)' }}>{s.d} · {s.count} entries</span>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: '2px 6px', fontSize: 10 }}>{Icon('chevD', { size: 10 })}</button>
            </div>
            {s.open && (
              <div style={{ paddingLeft: 14, marginTop: 6 }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', fontStyle: 'italic', fontFamily: 'var(--f-serif)' }}>
                  Auto-recap · player notes · clue-board fragments · 4 quest updates
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   SECTION 10.3 — COMPANION
   ============================================================ */

type CompanionType = 'beast' | 'npc' | 'summon' | 'hireling';
type BehaviorMode = 'Aggressive' | 'Defensive' | 'Support' | 'Passive';
type ControlMode = 'Auto' | 'Manual';

interface Companion {
  id: number; name: string; type: CompanionType; hp: number; hpMax: number;
  ac: number; spd: number; atk: string; color: string; loyalty: number;
  behavior: BehaviorMode; control: ControlMode; active: boolean;
  conditions: string[]; desc: string;
}

const COMPANION_TYPE_LABELS: Record<CompanionType, string> = { beast: 'Beast', npc: 'NPC', summon: 'Summon', hireling: 'Hireling' };

function CompanionCard() {
  const companions: Companion[] = [
    { id: 1, name: 'Thorn-Hide',     type: 'beast',  hp: 24, hpMax: 32, ac: 13, spd: 40, atk: '1d6+3 piercing', color: '#22C55E', loyalty: 88,  behavior: 'Defensive', control: 'Auto',   active: true,  conditions: ['Bond · Mirenna'],             desc: 'Wolf bonded to Mirenna.' },
    { id: 2, name: 'Brother Aldric', type: 'npc',    hp: 14, hpMax: 28, ac: 15, spd: 30, atk: '1d8+1 piercing', color: '#A271FF', loyalty: 62,  behavior: 'Support',   control: 'Manual', active: true,  conditions: ['Cleric of the Old Faith'],    desc: 'Hireling, knows the chapel.' },
    { id: 3, name: 'Bound Spectre',  type: 'summon', hp: 12, hpMax: 12, ac: 11, spd: 40, atk: '1d4+2 force',    color: '#5EEAD4', loyalty: 100, behavior: 'Aggressive',control: 'Auto',   active: false, conditions: ['Concentration · Find Familiar'], desc: 'Familiar summoned this session.' },
  ];
  return (
    <div className="fw-comp-grid">
      {companions.map(c => {
        const lTier = loyaltyTier(c.loyalty);
        const initials = c.name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
        return (
          <div key={c.id} className={'fw-comp-card' + (c.active ? '' : ' dim')}>
            <div className="fw-comp-portrait" style={{ background: `linear-gradient(135deg, ${c.color}33, #15101f)`, borderColor: c.color }}>
              <span className="fw-display" style={{ fontSize: 22, color: 'var(--text)' }}>{initials}</span>
              <span className="fw-comp-type-pill" style={{ background: c.color, color: 'rgba(0,0,0,0.7)' }}>{COMPANION_TYPE_LABELS[c.type]}</span>
            </div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <div className="fw-display" style={{ fontSize: 14, color: 'var(--text)' }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', fontFamily: 'var(--f-serif)' }}>{c.desc}</div>
              </div>
              <div className="fw-stat-bar">
                <span className="lbl">HP</span>
                <div className="fw-bar hp bar"><i style={{ width: `${(c.hp / c.hpMax) * 100}%` }} /></div>
                <span className="num">{c.hp}/{c.hpMax}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--text-3)' }}>
                <span>AC <b style={{ color: 'var(--text)' }}>{c.ac}</b></span>
                <span>SPD <b style={{ color: 'var(--text)' }}>{c.spd}</b></span>
                <span>ATK <b style={{ color: 'var(--text)' }}>{c.atk}</b></span>
              </div>
              <div className="fw-loyalty-mini">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-3)' }}>Loyalty</span>
                  <span style={{ color: lTier.color, fontFamily: 'var(--f-mono)' }}>{c.loyalty} · {lTier.label}</span>
                </div>
                <div className="fw-loyalty-bar"><div style={{ width: c.loyalty + '%', background: lTier.color }} /></div>
              </div>
              <div style={{ display: 'flex', gap: 4, fontSize: 10.5 }}>
                <span className="fw-pill dim" style={{ fontSize: 9.5 }}>{c.behavior}</span>
                <span className="fw-pill dim" style={{ fontSize: 9.5 }}>{c.control}</span>
                {!c.active && <span className="fw-pill" style={{ fontSize: 9.5, background: 'rgba(168,162,158,0.10)', color: 'var(--text-4)' }}>Dormant</span>}
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 10.5 }}>{Icon('eye', { size: 10 })} Sheet</button>
                <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: '3px 8px' }}>{Icon('kebab', { size: 11 })}</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BehaviorControl() {
  const [behavior, setBehavior] = useState<BehaviorMode>('Defensive');
  const [control, setControl] = useState<ControlMode>('Auto');
  const behaviors: Array<{ v: BehaviorMode; desc: string; color: string; icon: string }> = [
    { v: 'Aggressive', desc: 'Target lowest-HP enemy.',           color: 'var(--blood-bright)', icon: 'sword'  },
    { v: 'Defensive',  desc: 'Protect owner. Interpose on hits.', color: 'var(--gold)',          icon: 'shield' },
    { v: 'Support',    desc: 'Heal ally lowest HP (1d4 + WIS).',  color: 'var(--success)',       icon: 'heart'  },
    { v: 'Passive',    desc: 'Skip turn. Hold position.',         color: 'var(--text-3)',        icon: 'minus'  },
  ];
  return (
    <div className="fw-bhv">
      <div>
        <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Behavior</div>
        <div className="fw-bhv-grid">
          {behaviors.map(b => (
            <button key={b.v} onClick={() => setBehavior(b.v)}
              className={'fw-bhv-card' + (behavior === b.v ? ' active' : '')}
              style={{ borderColor: behavior === b.v ? b.color : 'var(--border-soft)', background: behavior === b.v ? b.color + '11' : 'var(--surface-2)' }}>
              <span style={{ color: b.color }}>{Icon(b.icon, { size: 18 })}</span>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div className="fw-display" style={{ fontSize: 12.5, color: behavior === b.v ? b.color : 'var(--text)' }}>{b.v}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontStyle: 'italic', fontFamily: 'var(--f-serif)' }}>{b.desc}</div>
              </div>
              {behavior === b.v && <span style={{ color: b.color }}>{Icon('check', { size: 13 })}</span>}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Control mode</div>
        <div className="fw-control-toggle">
          {(['Auto', 'Manual'] as ControlMode[]).map(m => (
            <button key={m} onClick={() => setControl(m)}
              className={'fw-control-btn' + (control === m ? ' active' : '')}>
              {Icon(m === 'Auto' ? 'wand' : 'compass', { size: 12 })}
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>{m}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontStyle: 'italic', fontFamily: 'var(--f-serif)' }}>
                  {m === 'Auto' ? 'AI resolves based on behavior + loyalty' : 'Owner picks each action manually'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoyaltyMeter() {
  const [val, setVal] = useState(62);
  const tier = loyaltyTier(val);
  const history = [
    { d: '1h ago',      v: -8,  reason: 'Argued with companion over the brass key' },
    { d: 'Session 14',  v: +5,  reason: 'Shared loot fairly' },
    { d: 'Session 13',  v: +15, reason: 'Saved companion from death save' },
  ];
  const loyaltyDesc: Record<string, string> = {
    Devoted:  'Will risk death for the party.',
    Friendly: 'Follows behavior orders willingly.',
    Neutral:  'Hesitates on risky orders. Often passive.',
    Hostile:  'Disobeys. May counter the party.',
    Betrayal: 'Will defect or attack at first chance.',
  };
  return (
    <div className="fw-loyalty">
      <div className="fw-loyalty-head">
        <div style={{ flex: 1 }}>
          <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Brother Aldric · loyalty</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span className="fw-display" style={{ fontSize: 40, color: tier.color, lineHeight: 1 }}>{val}</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>/ 100</span>
            <span className="fw-pill" style={{ background: tier.color + '22', borderColor: tier.color, color: tier.color }}>{tier.label}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', fontFamily: 'var(--f-serif)', marginTop: 4 }}>
            {loyaltyDesc[tier.label]}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => setVal(v => Math.max(0, v - 5))}>{Icon('minus', { size: 10 })} −5</button>
          <button className="fw-btn fw-btn-gold fw-btn-sm" onClick={() => setVal(v => Math.min(100, v + 5))}>{Icon('plus', { size: 10 })} +5</button>
        </div>
      </div>
      <div className="fw-loyalty-track">
        {[...LOYALTY_TIERS].reverse().map(t => (
          <span key={t.label} className="fw-loyalty-tier-mark" style={{
            left: `${Math.max(0, t.range[0])}%`,
            width: `${Math.min(100, t.range[1]) - Math.max(0, t.range[0]) + 1}%`,
            borderColor: t.color + '44',
            background: t.color + '08',
          }}>
            <span style={{ fontSize: 9, color: t.color, fontFamily: 'var(--f-mono)' }}>{t.label}</span>
          </span>
        ))}
        <div className="fw-loyalty-bar" style={{ position: 'relative', marginTop: 26 }}>
          <div style={{ width: val + '%', background: `linear-gradient(90deg, var(--blood-bright), ${tier.color})` }} />
        </div>
        <input type="range" min="0" max="100" value={val} onChange={e => setVal(+e.target.value)} className="fw-loyalty-input" />
      </div>
      <div className="fw-loyalty-history">
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Recent changes</div>
        {history.map((h, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '5px 8px', background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 5, marginBottom: 4 }}>
            <span className="fw-mono" style={{ fontSize: 11, color: h.v > 0 ? 'var(--success)' : 'var(--blood-bright)', width: 32, textAlign: 'center' }}>
              {h.v > 0 ? '+' : ''}{h.v}
            </span>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--f-serif)', fontStyle: 'italic' }}>{h.reason}</span>
            <span style={{ fontSize: 10, color: 'var(--text-4)', fontFamily: 'var(--f-mono)' }}>{h.d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   SECTION 10.4 — RELATIONSHIP
   ============================================================ */

interface NPC { id: number; n: string; role: string; aff: number; quote: string; color: string; }
const NPCS: NPC[] = [
  { id: 1, n: 'Brother Aldric',        role: 'Cleric of the Old Faith',  aff: 62,  quote: 'The secrets of the cathedral belong only to the pure.',           color: '#A271FF' },
  { id: 2, n: 'The Cinder-Reeve',      role: 'Patron · Antagonist',      aff: -65, quote: 'The shadow has not moved. Neither have I.',                       color: '#C72D2D' },
  { id: 3, n: 'Mother Censer',         role: "The warlock's old kin",         aff: -88, quote: 'You forget — the collar was mine first.',                         color: '#F87171' },
  { id: 4, n: "Brask of Brask's Hold", role: 'Innkeep · Ally',           aff: 92,  quote: 'Send word when you breathe again, lad.',                         color: '#D6A84F' },
  { id: 5, n: 'Lira Vael',             role: 'Sister · Off-screen',      aff: 70,  quote: 'You? My brother died in the Reach.',                          color: '#86EFAC' },
  { id: 6, n: 'Septine warden',        role: 'Faction · Neutral',        aff: 8,   quote: 'Walk softly. The Sept is watching.',                              color: '#A8A29E' },
];

function AffinityCard() {
  const [val, setVal] = useState(62);
  const tier = affinityTier(val);
  const npc = NPCS[0];
  const initials = npc.n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="fw-aff-card" style={{ borderColor: tier.color + '55' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
        <span className="fw-avatar lg" style={{ background: `linear-gradient(135deg, ${npc.color}44, #15101f)`, borderColor: npc.color }}>{initials}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fw-display" style={{ fontSize: 16, color: 'var(--text)' }}>{npc.n}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', fontStyle: 'italic', fontFamily: 'var(--f-serif)' }}>{npc.role}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
            <span className="fw-pill" style={{ background: tier.color + '22', borderColor: tier.color, color: tier.color }}>{tier.label}</span>
            <span style={{ fontFamily: 'var(--f-display)', fontSize: 18, color: tier.color }}>{val > 0 ? '+' : ''}{val}</span>
          </div>
        </div>
      </div>
      <div className="fw-aff-bar-wrap">
        <div className="fw-aff-tier-labels">
          {[...AFFINITY_TIERS].reverse().map(t => (
            <span key={t.label} style={{ color: t.color }}>{t.label}</span>
          ))}
        </div>
        <div className="fw-aff-bar">
          <div className="fw-aff-fill" style={{
            background: `linear-gradient(90deg, ${AFFINITY_TIERS[4].color} 0%, ${AFFINITY_TIERS[3].color} 25%, ${AFFINITY_TIERS[2].color} 50%, ${AFFINITY_TIERS[1].color} 75%, ${AFFINITY_TIERS[0].color} 100%)`,
          }} />
          <div className="fw-aff-marker" style={{ left: `${(val + 100) / 2}%`, background: tier.color, boxShadow: `0 0 12px ${tier.color}` }}>
            <span className="fw-mono">{val > 0 ? '+' : ''}{val}</span>
          </div>
          <span className="fw-aff-midline" />
        </div>
        <div className="fw-aff-bar-scale">
          <span>−100</span><span>−50</span><span>0</span><span>+50</span><span>+100</span>
        </div>
      </div>
      <blockquote className="fw-aff-quote">
        <span style={{ color: tier.color, marginRight: 6 }}>"</span>
        {npc.quote}
        <span style={{ color: tier.color, marginLeft: 6 }}>"</span>
      </blockquote>
      <div className="fw-aff-actions">
        <button className="fw-btn fw-btn-blood fw-btn-sm" onClick={() => setVal(v => Math.max(-100, v - 5))}>{Icon('minus', { size: 11 })} Decrease</button>
        <button className="fw-btn fw-btn-gold fw-btn-sm" onClick={() => setVal(v => Math.min(100, v + 5))}>{Icon('plus', { size: 11 })} Increase</button>
        <span style={{ flex: 1 }} />
        <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon('history', { size: 11 })} History</button>
      </div>
    </div>
  );
}

function RelationshipPanel() {
  const [filter, setFilter] = useState('all');
  const list = NPCS.filter(n => filter === 'all' || affinityTier(n.aff).label.toLowerCase() === filter);
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} className={'fw-rel-filter' + (filter === 'all' ? ' active' : '')}>
          All <span className="fw-mono">{NPCS.length}</span>
        </button>
        {AFFINITY_TIERS.map(t => {
          const count = NPCS.filter(n => affinityTier(n.aff).label === t.label).length;
          return (
            <button key={t.label} onClick={() => setFilter(t.label.toLowerCase())}
              className={'fw-rel-filter' + (filter === t.label.toLowerCase() ? ' active' : '')}
              style={{ borderColor: filter === t.label.toLowerCase() ? t.color : 'var(--border-soft)', color: filter === t.label.toLowerCase() ? t.color : 'var(--text-3)' }}>
              {t.label} <span className="fw-mono">{count}</span>
            </button>
          );
        })}
      </div>
      <div className="fw-rel-list">
        {list.map(n => {
          const t = affinityTier(n.aff);
          const initials = n.n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
          return (
            <div key={n.id} className="fw-rel-row" style={{ borderColor: t.color + '33' }}>
              <span className="fw-avatar" style={{ background: `linear-gradient(135deg, ${n.color}44, #15101f)`, borderColor: n.color }}>{initials}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--f-display)', letterSpacing: '0.02em' }}>{n.n}</span>
                  <span className="fw-pill" style={{ background: t.color + '22', borderColor: t.color, color: t.color, fontSize: 9, padding: '0 6px' }}>{t.label}</span>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontStyle: 'italic', fontFamily: 'var(--f-serif)' }}>{n.role}</div>
              </div>
              <div className="fw-rel-bar">
                <span className="fw-rel-bar-track">
                  <span className="fw-rel-bar-mid" />
                  <span className="fw-rel-bar-marker" style={{ left: `${(n.aff + 100) / 2}%`, background: t.color, boxShadow: `0 0 8px ${t.color}` }} />
                </span>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: t.color, minWidth: 32, textAlign: 'right' }}>{n.aff > 0 ? '+' : ''}{n.aff}</span>
              </div>
              <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm">{Icon('chevR', { size: 11 })}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AffinityHistory() {
  const [segVal, setSegVal] = useState('All');
  const events = [
    { d: '1h ago',         v: -8,  reason: 'The warlock refused to share the bone-tablet rubbing', src: 'Player choice' },
    { d: 'Session 15 mid', v: +12, reason: 'Helped Aldric tend to Halric',                    src: 'Player choice' },
    { d: 'Session 14 end', v: +5,  reason: 'Defended the cathedral relic',                    src: 'Player choice' },
    { d: 'Session 14 mid', v: -3,  reason: 'Made a joke about the Old Faith in front of Aldric', src: 'Player choice' },
    { d: 'Session 13',     v: +20, reason: 'Saved Aldric from the spectral hounds',           src: 'Combat outcome · auto' },
    { d: 'Session 12',     v: 0,   reason: "First met at Brask's Hold",                       src: 'Initial' },
  ];
  let runningTotal = 0;
  return (
    <div className="fw-aff-history">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span className="fw-avatar lg" style={{ background: 'linear-gradient(135deg, #A271FF44, #15101f)', borderColor: '#A271FF' }}>BA</span>
        <div style={{ flex: 1 }}>
          <div className="fw-display" style={{ fontSize: 15, color: 'var(--text)' }}>Brother Aldric · affinity timeline</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--f-serif)', fontStyle: 'italic' }}>6 events recorded · current 62 · Friendly</div>
        </div>
        <Seg value={segVal} onChange={setSegVal} options={['All', 'Player', 'Auto']} />
      </div>
      <div className="fw-aff-history-timeline">
        {[...events].reverse().map((e, i) => {
          runningTotal += e.v;
          return (
            <div key={i} className="fw-aff-history-row">
              <span className="fw-aff-history-line" />
              <span className="fw-aff-history-dot" style={{ background: e.v > 0 ? 'var(--success)' : e.v < 0 ? 'var(--blood-bright)' : 'var(--text-3)' }} />
              <div style={{ flex: 1, paddingLeft: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="fw-mono" style={{ fontSize: 13, color: e.v > 0 ? 'var(--success)' : e.v < 0 ? 'var(--blood-bright)' : 'var(--text-3)' }}>
                    {e.v > 0 ? '+' : ''}{e.v}
                  </span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--text-4)' }}>→ {runningTotal}</span>
                  <span className="fw-pill dim" style={{ fontSize: 8.5, padding: '0 5px' }}>{e.src}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 10, color: 'var(--text-4)', fontFamily: 'var(--f-mono)' }}>{e.d}</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-2)', fontFamily: 'var(--f-serif)', fontStyle: 'italic', marginTop: 2 }}>{e.reason}</div>
              </div>
            </div>
          );
        }).reverse()}
      </div>
    </div>
  );
}

/* ============================================================
   MAIN PANEL
   ============================================================ */

type NarrTab = 'scene' | 'journal' | 'companion' | 'relations';

const DANGER_INDEX: Record<string, number> = { none: 0, low: 1, medium: 2, high: 3, extreme: 4 };
const ENGINE_TO_ENTRY_TYPE: Record<string, EntryTypeKey> = {
  memory: 'memory', clue: 'clue', quest_update: 'quest', recap: 'recap',
};

export type NarrativePanelProps = {
  sceneState: SceneState | null;
  companions: CompanionSheet[];
  journalEntries: EngineJournalEntry[];
  relationships: AffinityRecord[];
  onDispatch: (event: GameEvent) => void;
  onAddJournalEntry: (entry: Omit<EngineJournalEntry, 'id' | 'createdAt'>) => void;
  onAdjustAffinity: (characterId: string, npcId: string, npcName: string, delta: number, reason: string) => void;
  characterId: string;
  sessionId: string;
  isHost?: boolean;
  className?: string;
};

export function NarrativePanel({
  sceneState,
  companions,
  journalEntries,
  relationships,
  onDispatch,
  onAddJournalEntry,
  onAdjustAffinity,
  characterId,
  sessionId,
  className,
}: NarrativePanelProps) {
  const [tab, setTab] = useState<NarrTab>('scene');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteType, setNoteType] = useState<EngineJournalEntry['type']>('memory');

  const tabs = useMemo(() => [
    { id: 'scene' as NarrTab,     label: 'Scene'     },
    { id: 'journal' as NarrTab,   label: 'Journal'   },
    { id: 'companion' as NarrTab, label: 'Companion' },
    { id: 'relations' as NarrTab, label: 'Relations' },
  ], []);

  function handleAddNote() {
    if (!noteTitle.trim()) return;
    onAddJournalEntry({ sessionId, characterId, type: noteType, title: noteTitle.trim(), content: noteBody.trim(), tags: [] });
    setNoteTitle('');
    setNoteBody('');
  }

  function dispatchLoyaltyChange(companionId: string, delta: number) {
    onDispatch({
      type: 'COMPANION_LOYALTY_CHANGE',
      id: crypto.randomUUID(),
      sessionId,
      actorId: characterId,
      targetId: companionId,
      createdAt: new Date().toISOString(),
      source: 'user' as const,
      companionId,
      delta,
    } as unknown as GameEvent);
  }

  const curMode = (sceneState?.mode ?? 'exploration') as SceneModeKey;
  const modeInfo = SCENE_MODES[curMode];

  return (
    <div className={'fw-narr-panel' + (className ? ' ' + className : '')} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <TabBar tabs={tabs} active={tab} onChange={setTab} compact />

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── SCENE TAB ── */}
        {tab === 'scene' && (
          <>
            {sceneState ? (
              <>
                <div>
                  <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Scene Mode</div>
                  <div className="fw-scene-active-preview" style={{ borderColor: modeInfo.color + '55', background: `linear-gradient(180deg,${modeInfo.color}11,transparent)`, marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span className="fw-scene-pill" style={{ background: modeInfo.color, color: 'rgba(13,10,22,0.85)' }}>
                        {Icon(modeInfo.icon, { size: 12 })} {modeInfo.label}
                      </span>
                      <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-2)', fontStyle: 'italic', fontFamily: 'var(--f-serif)' }}>
                        Narrator tone · <b style={{ color: modeInfo.color, fontStyle: 'normal', fontFamily: 'var(--f-display)' }}>{modeInfo.tone}</b>
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Danger Level</div>
                  <DangerLevel key={DANGER_INDEX[sceneState.flags.dangerLevel]} />
                </div>
                <div>
                  <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Threat Clocks</div>
                  {sceneState.threatClocks.length > 0 ? (
                    <div className="fw-threat-grid">
                      {sceneState.threatClocks.map(tc => {
                        const pct = tc.current / tc.max;
                        const triggered = tc.current >= tc.max;
                        const sz = 120, r = 50, cx = sz / 2, cy = sz / 2;
                        const segs = Array.from({ length: tc.max }, (_, i) => {
                          const a1 = (i / tc.max) * Math.PI * 2 - Math.PI / 2;
                          const a2 = ((i + 1) / tc.max) * Math.PI * 2 - Math.PI / 2;
                          const x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
                          const x2 = cx + Math.cos(a2) * r, y2 = cy + Math.sin(a2) * r;
                          const clr = pct < 0.5 ? '#A8A29E' : pct < 0.75 ? '#F59E0B' : pct < 1 ? '#F87171' : 'var(--blood-bright)';
                          return <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`} fill={i < tc.current ? clr : 'var(--bg-deep)'} stroke="var(--bg)" strokeWidth="2" />;
                        });
                        return (
                          <div key={tc.id} className={'fw-threat-card' + (triggered ? ' triggered' : '')}>
                            <div className="fw-threat-clock-svg">
                              <svg viewBox={`0 0 ${sz} ${sz}`} width={sz} height={sz}>
                                {segs}
                                <circle cx={cx} cy={cy} r={r * 0.55} fill="var(--surface-2)" stroke="var(--border)" />
                                <text x={cx} y={cy + 5} textAnchor="middle" fill="var(--text)" fontFamily="Cinzel" fontSize="18">{tc.current}/{tc.max}</text>
                              </svg>
                            </div>
                            <div className="fw-display" style={{ fontSize: 13, color: triggered ? 'var(--blood-bright)' : 'var(--text)', textAlign: 'center', marginTop: 8 }}>{tc.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', fontFamily: 'var(--f-serif)', textAlign: 'center', marginTop: 4, lineHeight: 1.4 }}>
                              {triggered ? <span style={{ color: 'var(--blood-bright)' }}>TRIGGERED · {tc.triggerEvent}</span> : <>"{tc.triggerEvent}"</>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <ThreatClocks />
                  )}
                </div>
                <div>
                  <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Reality Stability</div>
                  <RealityStability />
                </div>
                <div>
                  <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Objectives</div>
                  {sceneState.objectives.length > 0 ? (
                    <div className="fw-objs">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {sceneState.objectives.map(obj => (
                          <div key={obj.id} className={'fw-obj-row ' + obj.status}>
                            <div className={'fw-obj-mark ' + obj.status}>
                              {obj.status === 'completed' && Icon('check', { size: 12 })}
                              {obj.status === 'failed' && Icon('x', { size: 12 })}
                              {obj.status === 'active' && <span className="fw-obj-pulse" />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, color: obj.status === 'failed' ? 'var(--blood-bright)' : obj.status === 'completed' ? 'var(--success)' : 'var(--text)', textDecoration: obj.status === 'completed' ? 'line-through' : 'none' }}>
                                {obj.description}
                              </div>
                            </div>
                            <span className={'fw-obj-state ' + obj.status}>{obj.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <ObjectivesList />
                  )}
                </div>
              </>
            ) : (
              <>
                <div><div className="fw-eyebrow" style={{ marginBottom: 8 }}>Scene Mode</div><SceneModeBadges /></div>
                <div><div className="fw-eyebrow" style={{ marginBottom: 8 }}>Danger Level</div><DangerLevel /></div>
                <div><div className="fw-eyebrow" style={{ marginBottom: 8 }}>Threat Clocks</div><ThreatClocks /></div>
                <div><div className="fw-eyebrow" style={{ marginBottom: 8 }}>Reality Stability</div><RealityStability /></div>
                <div><div className="fw-eyebrow" style={{ marginBottom: 8 }}>Objectives</div><ObjectivesList /></div>
              </>
            )}
          </>
        )}

        {/* ── JOURNAL TAB ── */}
        {tab === 'journal' && (
          <>
            <div className="fw-card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Add Note</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(['memory', 'clue', 'quest_update', 'recap'] as EngineJournalEntry['type'][]).map(t => {
                  const key = (ENGINE_TO_ENTRY_TYPE[t] ?? 'memory') as EntryTypeKey;
                  const info = ENTRY_TYPES[key];
                  return (
                    <button key={t} onClick={() => setNoteType(t)}
                      className={'fw-journal-filter' + (noteType === t ? ' active' : '')}
                      style={{ borderColor: noteType === t ? info.color : 'var(--border-soft)', color: noteType === t ? info.color : 'var(--text-3)', background: noteType === t ? info.color + '11' : 'transparent', fontSize: 10.5 }}>
                      {Icon(info.icon, { size: 10 })} {info.label}
                    </button>
                  );
                })}
              </div>
              <input className="fw-input" placeholder="Title…" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} style={{ fontSize: 13 }} />
              <textarea className="fw-input" placeholder="Content (optional)…" value={noteBody} onChange={e => setNoteBody(e.target.value)} style={{ fontSize: 12, minHeight: 60, resize: 'vertical' }} />
              <button className="fw-btn fw-btn-gold fw-btn-sm" onClick={handleAddNote} style={{ alignSelf: 'flex-end' }}>
                {Icon('plus', { size: 11 })} Add Entry
              </button>
            </div>
            {journalEntries.length > 0 ? (
              <div>
                <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Entries ({journalEntries.length})</div>
                <div className="fw-journal-timeline">
                  {[...journalEntries].reverse().map(entry => {
                    const typeKey = (ENGINE_TO_ENTRY_TYPE[entry.type] ?? 'memory') as EntryTypeKey;
                    const t = ENTRY_TYPES[typeKey];
                    return (
                      <div key={entry.id} className="fw-journal-row" style={{ borderLeftColor: t.color }}>
                        <div className="fw-journal-row-head">
                          <span className="fw-journal-icon" style={{ background: t.color + '22', borderColor: t.color, color: t.color }}>{Icon(t.icon, { size: 12 })}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--f-display)', letterSpacing: '0.02em' }}>{entry.title}</span>
                              <span className="fw-pill" style={{ fontSize: 9, padding: '0 5px', borderColor: t.color + '55', color: t.color, background: t.color + '11' }}>{t.label}</span>
                            </div>
                            <div style={{ fontSize: 10.5, color: 'var(--text-4)', fontFamily: 'var(--f-mono)' }}>{new Date(entry.createdAt).toLocaleString()}</div>
                          </div>
                        </div>
                        {entry.content && <p className="fw-serif" style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, fontStyle: 'italic', paddingLeft: 32, marginTop: 4 }}>{entry.content}</p>}
                        {entry.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 6, paddingLeft: 32, flexWrap: 'wrap' }}>
                            {entry.tags.map(tag => <span key={tag} className="fw-pill dim" style={{ fontSize: 9, padding: '0 5px' }}>#{tag}</span>)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div><div className="fw-eyebrow" style={{ marginBottom: 8 }}>Session Log</div><JournalFullView /></div>
                <div><div className="fw-eyebrow" style={{ marginBottom: 8 }}>Recent Entries</div><JournalTimeline /></div>
              </>
            )}
          </>
        )}

        {/* ── COMPANION TAB ── */}
        {tab === 'companion' && (
          <>
            {companions.length > 0 ? (
              <div>
                <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Active Companions ({companions.length})</div>
                <div className="fw-comp-grid">
                  {companions.map(c => {
                    const lTier = loyaltyTier(c.loyalty.current);
                    const initials = c.name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
                    const typeColor = c.type === 'beast' ? '#22C55E' : c.type === 'npc' ? '#A271FF' : c.type === 'summon' ? '#5EEAD4' : '#EAC074';
                    return (
                      <div key={c.id} className={'fw-comp-card' + (c.isActive ? '' : ' dim')}>
                        <div className="fw-comp-portrait" style={{ background: `linear-gradient(135deg,${typeColor}33,#15101f)`, borderColor: typeColor }}>
                          <span className="fw-display" style={{ fontSize: 22, color: 'var(--text)' }}>{initials}</span>
                          <span className="fw-comp-type-pill" style={{ background: typeColor, color: 'rgba(0,0,0,0.7)' }}>{c.type}</span>
                        </div>
                        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div className="fw-display" style={{ fontSize: 14, color: 'var(--text)' }}>{c.name}</div>
                          <div className="fw-stat-bar">
                            <span className="lbl">HP</span>
                            <div className="fw-bar hp bar"><i style={{ width: `${(c.characterSnapshot.hitPoints / c.characterSnapshot.maxHitPoints) * 100}%` }} /></div>
                            <span className="num">{c.characterSnapshot.hitPoints}/{c.characterSnapshot.maxHitPoints}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6, fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--text-3)' }}>
                            <span>AC <b style={{ color: 'var(--text)' }}>{c.characterSnapshot.armorClass}</b></span>
                            <span>SPD <b style={{ color: 'var(--text)' }}>{c.characterSnapshot.speed}</b></span>
                          </div>
                          <div className="fw-loyalty-mini">
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
                              <span style={{ color: 'var(--text-3)' }}>Loyalty</span>
                              <span style={{ color: lTier.color, fontFamily: 'var(--f-mono)' }}>{c.loyalty.current} · {lTier.label}</span>
                            </div>
                            <div className="fw-loyalty-bar"><div style={{ width: c.loyalty.current + '%', background: lTier.color }} /></div>
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <span className="fw-pill dim" style={{ fontSize: 9.5 }}>{c.behavior}</span>
                            <span className="fw-pill dim" style={{ fontSize: 9.5 }}>{c.controlMode}</span>
                            {!c.isActive && <span className="fw-pill" style={{ fontSize: 9.5, color: 'var(--text-4)' }}>Dormant</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                            <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => dispatchLoyaltyChange(c.id, -5)}>{Icon('minus', { size: 10 })} −5</button>
                            <button className="fw-btn fw-btn-gold fw-btn-sm" onClick={() => dispatchLoyaltyChange(c.id, 5)}>{Icon('plus', { size: 10 })} +5</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div><div className="fw-eyebrow" style={{ marginBottom: 8 }}>Active Companions</div><CompanionCard /></div>
                <div><div className="fw-eyebrow" style={{ marginBottom: 8 }}>Behavior · Control</div><BehaviorControl /></div>
                <div><div className="fw-eyebrow" style={{ marginBottom: 8 }}>Loyalty Meter</div><LoyaltyMeter /></div>
              </>
            )}
          </>
        )}

        {/* ── RELATIONS TAB ── */}
        {tab === 'relations' && (
          <>
            {relationships.length > 0 ? (
              <div>
                <div className="fw-eyebrow" style={{ marginBottom: 8 }}>NPC Affinity ({relationships.length})</div>
                <div className="fw-rel-list">
                  {relationships.map(rec => {
                    const t = affinityTier(rec.affinity);
                    const initials = rec.npcName.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <div key={rec.id} className="fw-rel-row" style={{ borderColor: t.color + '33' }}>
                        <span className="fw-avatar" style={{ background: 'var(--surface-2)', borderColor: t.color }}>{initials}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--f-display)', letterSpacing: '0.02em' }}>{rec.npcName}</span>
                            <span className="fw-pill" style={{ background: t.color + '22', borderColor: t.color, color: t.color, fontSize: 9, padding: '0 6px' }}>{t.label}</span>
                          </div>
                          {rec.npcRole && <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontStyle: 'italic', fontFamily: 'var(--f-serif)' }}>{rec.npcRole}</div>}
                        </div>
                        <div className="fw-rel-bar">
                          <span className="fw-rel-bar-track">
                            <span className="fw-rel-bar-mid" />
                            <span className="fw-rel-bar-marker" style={{ left: `${(rec.affinity + 100) / 2}%`, background: t.color, boxShadow: `0 0 8px ${t.color}` }} />
                          </span>
                          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: t.color, minWidth: 32, textAlign: 'right' }}>{rec.affinity > 0 ? '+' : ''}{rec.affinity}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => onAdjustAffinity(rec.characterId, rec.npcId, rec.npcName, -5, 'Manual adjustment')}>{Icon('minus', { size: 9 })}</button>
                          <button className="fw-btn fw-btn-gold fw-btn-sm" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => onAdjustAffinity(rec.characterId, rec.npcId, rec.npcName, 5, 'Manual adjustment')}>{Icon('plus', { size: 9 })}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div><div className="fw-eyebrow" style={{ marginBottom: 8 }}>NPC Affinity</div><AffinityCard /></div>
                <div><div className="fw-eyebrow" style={{ marginBottom: 8 }}>All NPCs</div><RelationshipPanel /></div>
                <div><div className="fw-eyebrow" style={{ marginBottom: 8 }}>Affinity History</div><AffinityHistory /></div>
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
}
