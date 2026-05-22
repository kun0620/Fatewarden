import { useMemo, useState, type ReactNode } from 'react';
import { Icon } from './ui/Icons';

type BestiaryScreenProps = {
  onBack: () => void;
};

type Beast = {
  id: string;
  n: string;
  cr: number | string;
  xp: number;
  type: string;
  subtype: string;
  size: string;
  align?: string;
  hp?: number;
  hpDie?: string;
  ac?: number;
  acSrc?: string;
  spd?: string;
  env: string[];
  source: string;
  tags: string[];
  stats?: Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>;
  saves?: Record<string, number>;
  skills?: Record<string, number>;
  resist?: string[];
  immune?: string[];
  senses?: string;
  lang?: string;
  traits?: Array<{ n: string; t: string }>;
  actions?: Array<{ n: string; t: string }>;
  legendary?: Array<{ n: string; t: string }>;
  lore?: string;
  tactics?: string;
};

const BEASTS: Beast[] = [
  {
    id: 'cinder-reeve',
    n: 'Cinder-Reeve',
    cr: 7,
    xp: 2900,
    type: 'Undead',
    subtype: 'Patron',
    size: 'Medium',
    align: 'Lawful Evil',
    hp: 120,
    hpDie: '16d8 + 48',
    ac: 17,
    acSrc: 'natural / brass plating',
    spd: '30 ft, fly 30 ft (hover)',
    env: ['Crypt', 'Chapel', 'Ysavir-Under'],
    source: 'Volume Seven / Ch. 3',
    tags: ['Boss', 'Fire', 'Psychic'],
    stats: { STR: 16, DEX: 12, CON: 16, INT: 18, WIS: 17, CHA: 20 },
    saves: { CON: 7, WIS: 7, CHA: 9 },
    skills: { Insight: 7, Intimidation: 9, Perception: 7 },
    resist: ['Necrotic', 'Fire', 'Bludgeoning / non-magical'],
    immune: ['Poison', 'Charmed', 'Frightened', 'Poisoned'],
    senses: 'Darkvision 120 ft, Passive Perception 17',
    lang: 'Infernal, Cinder-Cant, Telepathy 120 ft',
    traits: [
      { n: 'Brass Aegis', t: 'While the censer above the Reeve burns, all attacks against it suffer disadvantage.' },
      { n: 'Patient God', t: 'If the Reeve has not moved for at least 1 round, its next attack scores a critical hit on 18-20.' },
      { n: 'Pact-Touched', t: 'Knows the truenames of all Warlock pact-holders within 120 ft. May expend a pact slot to compel a save with disadvantage.' },
    ],
    actions: [
      { n: 'Multiattack', t: 'The Reeve makes one Censer Slam attack and uses Brass Words, if available.' },
      { n: 'Censer Slam', t: 'Melee Weapon Attack: +9 to hit, 5 ft. Hit: 2d10+5 fire + 2d6 necrotic. Ignites flammables.' },
      { n: 'Brass Words (recharge 5-6)', t: 'Each creature in a 60-ft cone makes a DC 17 Wisdom save or takes 4d8 psychic and becomes Frightened until end of its next turn.' },
      { n: 'Bind Shadow (1/day)', t: "Pin one shadow within 30 ft to the floor for 1 minute. The shadow's owner is Restrained while pinned." },
    ],
    legendary: [
      { n: 'Glide', t: 'Move up to its speed without provoking opportunity attacks.' },
      { n: 'Speak in Past Tense', t: "Recite a true sentence from any creature's past. They make a DC 17 Wis save or take 4d6 psychic." },
      { n: 'Censer Flicker (cost 2)', t: 'Recharge Brass Words.' },
    ],
    lore: 'The Reeve has not moved since the Septine collapse. It does not have to. Its bargains run on a longer clock than your party.',
    tactics: 'Open with Brass Words at maximum cone. Use Patient God to hold position. Bind Shadow on the heaviest hitter.',
  },
  { id: 'brass-spear', n: 'Brass Spear', cr: 2, xp: 450, type: 'Construct', subtype: 'Minion', size: 'Medium', env: ['Chapel', 'Crypt'], tags: ['Bruiser'], source: 'Volume Seven / Bestiary' },
  { id: 'bound-shadow', n: 'Bound Shadow', cr: 1.5, xp: 700, type: 'Undead', subtype: 'Hazard', size: 'Large', env: ['Crypt'], tags: ['Hazard'], source: 'Volume Seven / Bestiary' },
  { id: 'censer-priest', n: 'Censer-priest', cr: 4, xp: 1100, type: 'Humanoid', subtype: 'Caster', size: 'Medium', env: ['Chapel'], tags: ['Caster', 'Cleric'], source: 'Volume Seven / Bestiary' },
  { id: 'soot-wretch', n: 'Soot-Wretch', cr: 0.5, xp: 100, type: 'Aberration', subtype: 'Swarm', size: 'Medium', env: ['Crypt', 'Forest'], tags: ['Swarm'], source: 'Volume Seven / Bestiary' },
  { id: 'brass-mastiff', n: 'Brass Mastiff', cr: 3, xp: 700, type: 'Construct', subtype: 'Bruiser', size: 'Medium', env: ['Chapel'], tags: ['Fire'], source: 'Volume Seven / Bestiary' },
  { id: 'pale-septine', n: 'Pale Septine', cr: 5, xp: 1800, type: 'Humanoid', subtype: 'Solo', size: 'Medium', env: ['Chapel'], tags: ['Caster', 'Boss'], source: 'Volume Seven / Ch. 2' },
  { id: 'cinder-rat', n: 'Cinder-rat Swarm', cr: 1, xp: 200, type: 'Beast', subtype: 'Swarm', size: 'Medium', env: ['Crypt'], tags: ['Swarm'], source: 'Core 5e / Adapted' },
  { id: 'black-censer', n: 'The Black Censer', cr: 6, xp: 2300, type: 'Object', subtype: 'Hazard', size: 'Large', env: ['Chapel'], tags: ['Boss', 'Object'], source: 'Volume Seven / Ch. 3' },
  { id: 'septine-warden', n: 'Septine Warden', cr: 3, xp: 700, type: 'Humanoid', subtype: 'Patrol', size: 'Medium', env: ['Ysavir', 'Chapel'], tags: ['Faction'], source: 'Volume Seven / Bestiary' },
  { id: 'lira-vael', n: 'Lira Vael', cr: '-', xp: 0, type: 'Humanoid', subtype: 'Civilian', size: 'Medium', env: ['The Reach'], tags: ['NPC'], source: "Custom / player character" },
  { id: 'halric-dale', n: 'Halric Dale', cr: 5, xp: 0, type: 'Humanoid', subtype: 'Ally', size: 'Medium', env: ['-'], tags: ['NPC', 'PC'], source: 'Custom / party' },
];

const TABS = [
  { id: 'bestiary', label: 'Bestiary', icon: 'skull', count: 48 },
  { id: 'spells', label: 'Spells', icon: 'flame', count: 312 },
  { id: 'items', label: 'Items', icon: 'bag', count: 184 },
  { id: 'rules', label: 'Rules', icon: 'book', count: '-' },
  { id: 'conditions', label: 'Conditions', icon: 'alert', count: 14 },
] as const;

function Card({ children, className = '', elev, style }: { children: ReactNode; className?: string; elev?: boolean; style?: React.CSSProperties }) {
  return (
    <div className={`fw-card ${elev ? 'fw-card-elev' : ''} ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

function CardHead({ icon, right, title }: { icon: string; right?: ReactNode; title: string }) {
  return (
    <div className="fw-card-head">
      <div className="fw-card-title">
        {Icon(icon, { size: 13 })}
        <span>{title}</span>
      </div>
      {right}
    </div>
  );
}

function FilterGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="fw-eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{children}</div>
    </div>
  );
}

function FilterChip({ active, onClick, value }: { active?: boolean; onClick?: () => void; value: string }) {
  return (
    <button
      className={`fw-btn fw-btn-sm ${active ? '' : 'fw-btn-ghost'}`.trim()}
      onClick={onClick}
      style={{
        padding: '3px 9px',
        fontSize: 11,
        letterSpacing: 0,
        borderColor: active ? 'var(--gold-deep)' : 'var(--border-soft)',
        background: active ? 'rgba(214,168,79,0.12)' : 'transparent',
        color: active ? 'var(--gold-bright)' : 'var(--text-2)',
        textTransform: 'none',
      }}
      type="button"
    >
      {value}
    </button>
  );
}

function iconForType(type: string) {
  if (type === 'Undead') return 'skull';
  if (type === 'Construct') return 'shield';
  if (type === 'Beast') return 'compass';
  if (type === 'Object') return 'hex';
  if (type === 'Aberration') return 'sparkles';
  return 'user';
}

function BeastRow({ beast, onClick, selected }: { beast: Beast; onClick: () => void; selected: boolean }) {
  return (
    <button className={`fw-beast-row ${selected ? 'active' : ''}`.trim()} onClick={onClick} style={{ textAlign: 'left', width: '100%' }} type="button">
      <span className="fw-beast-thumb">{Icon(iconForType(beast.type), { size: 14 })}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {beast.n}
          {beast.tags.includes('Boss') ? <span className="fw-pill gold" style={{ fontSize: 8.5, padding: '0 5px' }}>Boss</span> : null}
          {beast.tags.includes('NPC') ? <span className="fw-pill" style={{ background: 'rgba(124,58,237,0.1)', borderColor: 'rgba(124,58,237,0.35)', color: 'var(--arcane-bright)', fontSize: 8.5, padding: '0 5px' }}>NPC</span> : null}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{beast.size} {beast.type} / {beast.subtype}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--gold-bright)' }}>CR {beast.cr}</div>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9.5, color: 'var(--text-4)' }}>{beast.xp ? `${beast.xp} XP` : '-'}</div>
      </div>
    </button>
  );
}

function abilityMod(value: number) {
  const mod = Math.floor((value - 10) / 2);
  return `${mod >= 0 ? '+' : ''}${mod}`;
}

function StatField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text)' }}>{value}</div>
    </div>
  );
}

function StatLine({ bold, label, text }: { bold?: boolean; label: string; text: string }) {
  return (
    <div style={{ padding: '5px 0', borderBottom: '1px dashed var(--border-soft)', fontSize: 12.5 }}>
      <b style={{ color: 'var(--gold)', marginRight: 6, fontFamily: 'var(--f-display)', letterSpacing: '0.04em', fontWeight: 500 }}>{label}.</b>
      <span style={{ color: bold ? 'var(--text)' : 'var(--text-2)', fontFamily: 'var(--f-serif)', fontWeight: bold ? 500 : 400 }}>{text}</span>
    </div>
  );
}

function Trait({ n, t }: { n: string; t: string }) {
  return (
    <div style={{ marginBottom: 10, fontSize: 13, lineHeight: 1.55 }}>
      <b style={{ color: 'var(--text)', fontFamily: 'var(--f-display)', letterSpacing: '0.02em', fontWeight: 500 }}>{n}.</b>{' '}
      <span style={{ color: 'var(--text-2)', fontFamily: 'var(--f-serif)' }}>{t}</span>
    </div>
  );
}

function BeastDetail({ beast }: { beast: Beast }) {
  if (!beast.stats) {
    return (
      <Card>
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--f-serif)', fontStyle: 'italic' }}>
          <div className="fw-display" style={{ fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>{beast.n}</div>
          <div style={{ marginBottom: 16 }}>{beast.size} {beast.type} / {beast.subtype} / CR {beast.cr}</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.55 }}>Full stat block not yet drafted. This entry exists as a campaign stub.</div>
          <button className="fw-btn fw-btn-gold fw-btn-sm" style={{ marginTop: 14 }} type="button">{Icon('sparkles', { size: 11 })} Generate stat block</button>
        </div>
      </Card>
    );
  }

  return (
    <Card elev className="fw-orn" style={{ overflow: 'hidden', position: 'sticky', top: 16 }}>
      <span className="fw-orn-c tl" />
      <span className="fw-orn-c tr" />
      <span className="fw-orn-c bl" />
      <span className="fw-orn-c br" />
      <div className="fw-beast-detail">
        <div className="fw-beast-detail-head">
          <div className="fw-beast-portrait">
            <div className="fw-beast-portrait-inner">{Icon(iconForType(beast.type), { size: 42 })}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
              {beast.tags.map((tag) => <span key={tag} className="fw-pill" style={{ fontSize: 9 }}>{tag}</span>)}
            </div>
            <h2 className="fw-display" style={{ fontSize: 22, color: 'var(--text)', lineHeight: 1.1, marginBottom: 4 }}>{beast.n}</h2>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', fontFamily: 'var(--f-serif)' }}>
              {beast.size} {beast.type} / {beast.align}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ fontSize: 10.5 }} type="button">{Icon('plus', { size: 10 })} Add to encounter</button>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ fontSize: 10.5 }} type="button">{Icon('dice', { size: 10 })} Roll initiative</button>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: '3px 8px' }} type="button">{Icon('kebab', { size: 11 })}</button>
            </div>
          </div>
        </div>

        <div className="fw-statblock">
          <div className="fw-statblock-row">
            <StatField label="Armor Class" value={`${beast.ac} (${beast.acSrc})`} />
            <StatField label="Hit Points" value={`${beast.hp} (${beast.hpDie})`} />
            <StatField label="Speed" value={beast.spd ?? '-'} />
          </div>

          <div className="fw-statblock-abil">
            {Object.entries(beast.stats).map(([ability, value]) => (
              <div key={ability}>
                <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>{ability}</div>
                <div className="fw-display" style={{ fontSize: 18, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--gold-bright)' }}>({abilityMod(value)})</div>
              </div>
            ))}
          </div>

          {beast.saves ? <StatLine label="Saving Throws" text={Object.entries(beast.saves).map(([key, value]) => `${key} +${value}`).join(', ')} /> : null}
          {beast.skills ? <StatLine label="Skills" text={Object.entries(beast.skills).map(([key, value]) => `${key} +${value}`).join(', ')} /> : null}
          {beast.resist ? <StatLine label="Resistances" text={beast.resist.join(', ')} /> : null}
          {beast.immune ? <StatLine label="Condition Immunities" text={beast.immune.join(', ')} /> : null}
          <StatLine label="Senses" text={beast.senses ?? '-'} />
          <StatLine label="Languages" text={beast.lang ?? '-'} />
          <StatLine label="Challenge" text={`${beast.cr} (${beast.xp.toLocaleString()} XP)`} bold />

          <div className="fw-statblock-section">
            <div className="fw-display" style={{ fontSize: 14, color: 'var(--gold-bright)', marginBottom: 8 }}>Traits</div>
            {beast.traits?.map((trait) => <Trait key={trait.n} {...trait} />)}
          </div>

          <div className="fw-statblock-section">
            <div className="fw-display" style={{ fontSize: 14, color: 'var(--gold-bright)', marginBottom: 8 }}>Actions</div>
            {beast.actions?.map((action) => <Trait key={action.n} {...action} />)}
          </div>

          {beast.legendary ? (
            <div className="fw-statblock-section">
              <div className="fw-display" style={{ fontSize: 14, color: 'var(--gold-bright)', marginBottom: 4 }}>Legendary Actions</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', fontFamily: 'var(--f-serif)', fontStyle: 'italic', marginBottom: 8 }}>3 actions / round. Only at the end of another creature's turn.</div>
              {beast.legendary.map((action) => <Trait key={action.n} {...action} />)}
            </div>
          ) : null}
        </div>

        <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Lore</div>
            <p className="fw-serif" style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, fontStyle: 'italic' }}>{beast.lore}</p>
          </div>
          <div>
            <div className="fw-eyebrow" style={{ marginBottom: 6, color: 'var(--gold)' }}>{Icon('sword', { size: 10 })} Tactics (DM only)</div>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, padding: 10, background: 'var(--bg-deep)', border: '1px dashed var(--border)', borderRadius: 6 }}>{beast.tactics}</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingTop: 10, borderTop: '1px dashed var(--border-soft)', fontSize: 10.5, color: 'var(--text-4)', fontFamily: 'var(--f-mono)' }}>
            <span>Environment: {beast.env.join(' / ')}</span>
            <span>Source: {beast.source}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PlaceholderPanel({ icon, title }: { icon: string; title: string }) {
  return (
    <Card>
      <CardHead icon={icon} title={title} />
      <div style={{ padding: 28, color: 'var(--text-3)', fontFamily: 'var(--f-serif)', fontStyle: 'italic' }}>
        This compendium section is staged with the prototype layout and ready for live rules data.
      </div>
    </Card>
  );
}

export function BestiaryScreen({ onBack }: BestiaryScreenProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('bestiary');
  const [selectedId, setSelectedId] = useState('cinder-reeve');
  const [query, setQuery] = useState('');
  const [crFilter, setCrFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  const filtered = useMemo(() => BEASTS.filter((beast) => {
    if (query && !beast.n.toLowerCase().includes(query.toLowerCase())) return false;
    if (crFilter === '0-2' && !(beast.cr !== '-' && Number(beast.cr) <= 2)) return false;
    if (crFilter === '3-5' && !(beast.cr !== '-' && Number(beast.cr) >= 3 && Number(beast.cr) <= 5)) return false;
    if (crFilter === '6-10' && !(beast.cr !== '-' && Number(beast.cr) >= 6 && Number(beast.cr) <= 10)) return false;
    if (crFilter === '11+' && !(beast.cr !== '-' && Number(beast.cr) >= 11)) return false;
    if (typeFilter !== 'All' && beast.type !== typeFilter) return false;
    return true;
  }), [crFilter, query, typeFilter]);

  const selected = BEASTS.find((beast) => beast.id === selectedId) ?? BEASTS[0];

  return (
    <div className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page" style={{ maxWidth: 1480, paddingTop: 20 }}>
        <div className="fw-page-head" style={{ marginBottom: 16 }}>
          <div>
            <div className="fw-eyebrow">The Stacks</div>
            <h1>Bestiary &amp; Compendium</h1>
            <div className="sub">Creature lore, rules reference, hand-tagged for the Cinder-Reeve campaign.</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="fw-btn fw-btn-ghost" onClick={onBack} type="button">{Icon('chevL', { size: 12 })} Hearth</button>
            <button className="fw-btn fw-btn-ghost" type="button">{Icon('plus', { size: 12 })} Homebrew</button>
            <button className="fw-btn fw-btn-gold" type="button">{Icon('sparkles', { size: 12 })} Generate creature</button>
          </div>
        </div>

        <div className="fw-tabs" style={{ marginBottom: 16 }}>
          {TABS.map((item) => (
            <button
              className={`fw-tab ${tab === item.id ? 'active' : ''}`.trim()}
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              type="button"
            >
              {Icon(item.icon, { size: 11 })} {item.label}
              <span style={{ marginLeft: 4, fontFamily: 'var(--f-mono)', fontSize: 9.5, color: 'var(--text-4)' }}>{item.count}</span>
            </button>
          ))}
          <span style={{ flex: 1, borderBottom: '1px solid var(--border-soft)' }} />
        </div>

        {tab === 'bestiary' ? (
          <div className="fw-bestiary-grid">
            <div className="fw-bestiary-col fw-bestiary-filters">
              <Card>
                <div style={{ padding: 12 }}>
                  <div className="fw-input-wrap" style={{ marginBottom: 12 }}>
                    <span className="fw-input-icon">{Icon('search', { size: 13 })}</span>
                    <input className="fw-input has-icon" placeholder="Search creatures..." value={query} onChange={(event) => setQuery(event.target.value)} />
                  </div>

                  <FilterGroup label="Challenge Rating">
                    {['All', '0-2', '3-5', '6-10', '11+'].map((value) => (
                      <FilterChip key={value} value={value} active={crFilter === value} onClick={() => setCrFilter(value)} />
                    ))}
                  </FilterGroup>

                  <FilterGroup label="Type">
                    {['All', 'Humanoid', 'Construct', 'Undead', 'Aberration', 'Beast', 'Object'].map((value) => (
                      <FilterChip key={value} value={value} active={typeFilter === value} onClick={() => setTypeFilter(value)} />
                    ))}
                  </FilterGroup>

                  <FilterGroup label="Environment">
                    {['Crypt', 'Chapel', 'Ysavir-Under', 'Forest', 'The Reach'].map((value) => <FilterChip key={value} value={value} />)}
                  </FilterGroup>

                  <FilterGroup label="Source">
                    {['Volume Seven', 'Core 5e', 'Custom'].map((value) => <FilterChip key={value} value={value} />)}
                  </FilterGroup>

                  <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => { setQuery(''); setCrFilter('All'); setTypeFilter('All'); }} type="button">
                    {Icon('x', { size: 11 })} Reset filters
                  </button>
                </div>
              </Card>
            </div>

            <div className="fw-bestiary-col">
              <Card style={{ display: 'flex', flexDirection: 'column' }}>
                <CardHead icon="skull" title={`Creatures / ${filtered.length}`} right={<button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: '3px 8px' }} type="button">{Icon('filter', { size: 10 })} Sort</button>} />
                <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 720, overflow: 'auto' }}>
                  {filtered.map((beast) => <BeastRow key={beast.id} beast={beast} selected={beast.id === selected.id} onClick={() => setSelectedId(beast.id)} />)}
                  {filtered.length === 0 ? (
                    <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--f-serif)', fontStyle: 'italic' }}>
                      The page is blank. Nothing in your library matches that.
                    </div>
                  ) : null}
                </div>
              </Card>
            </div>

            <div className="fw-bestiary-col fw-bestiary-detail">
              <BeastDetail beast={selected} />
            </div>
          </div>
        ) : null}

        {tab === 'spells' ? <PlaceholderPanel icon="flame" title="Spells / Pact and arcane focus" /> : null}
        {tab === 'items' ? <PlaceholderPanel icon="bag" title="Items / 184 in library" /> : null}
        {tab === 'rules' ? <PlaceholderPanel icon="book" title="Rules / 5e SRD and house rules" /> : null}
        {tab === 'conditions' ? <PlaceholderPanel icon="alert" title="Conditions / 14" /> : null}
      </div>
    </div>
  );
}
