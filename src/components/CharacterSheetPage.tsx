import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Icon } from './ui/Icons';

type CharacterSheetPageProps = {
  user: User;
  onBack: () => void;
};

type TabId = 'skills' | 'features' | 'spells' | 'items' | 'lore';

const ABILITIES: Array<[string, number, number]> = [
  ['STR', 9, -1],
  ['DEX', 14, 2],
  ['CON', 12, 1],
  ['INT', 13, 1],
  ['WIS', 11, 0],
  ['CHA', 18, 4],
];

const SKILLS: Array<[string, string, number, boolean]> = [
  ['Acrobatics', 'DEX', 2, false],
  ['Animal Handling', 'WIS', 0, false],
  ['Arcana', 'INT', 4, true],
  ['Athletics', 'STR', -1, false],
  ['Deception', 'CHA', 7, true],
  ['History', 'INT', 1, false],
  ['Insight', 'WIS', 0, false],
  ['Intimidation', 'CHA', 7, true],
  ['Investigation', 'INT', 1, false],
  ['Medicine', 'WIS', 0, false],
  ['Nature', 'INT', 1, false],
  ['Perception', 'WIS', 3, true],
  ['Performance', 'CHA', 4, false],
  ['Persuasion', 'CHA', 7, true],
  ['Religion', 'INT', 4, true],
  ['Sleight of Hand', 'DEX', 2, false],
  ['Stealth', 'DEX', 2, false],
  ['Survival', 'WIS', 3, true],
];

const SAVES: Array<[string, number, boolean]> = [
  ['STR', -1, false],
  ['DEX', 2, false],
  ['CON', 1, false],
  ['INT', 1, false],
  ['WIS', 3, true],
  ['CHA', 7, true],
];

const sgn = (value: number) => (value >= 0 ? `+${value}` : `${value}`);

function Card({ children, elev, className = '', style }: { children: React.ReactNode; elev?: boolean; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`fw-card ${elev ? 'fw-card-elev' : ''} ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

function CardHead({ icon, title, right }: { icon: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="fw-card-head">
      {Icon(icon, { size: 16 })}
      <h3>{title}</h3>
      {right ? <div style={{ marginLeft: 'auto' }}>{right}</div> : null}
    </div>
  );
}

function VitalTile({ label, value, sub, small, gold }: { label: string; value: string; sub: string; small?: boolean; gold?: boolean }) {
  return (
    <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-soft)', borderRadius: 6, padding: '10px 8px', textAlign: 'center' }}>
      <div className="fw-eyebrow" style={{ fontSize: small ? 8.5 : 9.5, marginBottom: 4 }}>{label}</div>
      <div className="fw-display" style={{ fontSize: small ? 18 : 22, color: gold ? 'var(--gold-bright)' : 'var(--text)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2, fontFamily: 'var(--f-serif)', fontStyle: 'italic' }}>{sub}</div>
    </div>
  );
}

function ResourceBar({ label, cur, max, color, diamond }: { label: string; cur: number; max: number; color: 'gold' | 'arcane'; diamond?: boolean }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-3)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--text-2)' }}>{cur} / {max}</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: max }).map((_, index) => {
          const active = index < cur;
          return (
            <span
              key={index}
              style={{
                flex: 1,
                height: 10,
                borderRadius: diamond ? 0 : 3,
                transform: diamond ? 'skewX(-25deg)' : 'none',
                background: active
                  ? color === 'arcane'
                    ? 'linear-gradient(180deg, var(--arcane-bright), var(--arcane-deep))'
                    : 'linear-gradient(180deg, var(--gold-bright), var(--gold-deep))'
                  : 'var(--bg-deep)',
                border: `1px solid ${active ? (color === 'arcane' ? 'var(--arcane)' : 'var(--gold-deep)') : 'var(--border-soft)'}`,
                boxShadow: active ? (color === 'arcane' ? '0 0 4px rgba(124,58,237,0.5)' : '0 0 4px rgba(214,168,79,0.4)') : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function RpLine({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="fw-eyebrow" style={{ fontSize: 9.5, color: 'var(--gold)', marginBottom: 2 }}>{label}</div>
      <div style={{ color: 'var(--text-2)', fontStyle: 'italic' }}>&quot;{text}&quot;</div>
    </div>
  );
}

function SheetItem({ icon, name, tag, qty, special, lore }: { icon: string; name: string; tag: string; qty?: number; special?: boolean; lore?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: 10, marginBottom: 4, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 5, alignItems: 'center' }}>
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 5,
          background: special ? 'rgba(214,168,79,0.10)' : lore ? 'rgba(124,58,237,0.10)' : 'rgba(255,255,255,0.025)',
          border: `1px solid ${special ? 'var(--gold-deep)' : lore ? 'rgba(124,58,237,0.4)' : 'var(--border-soft)'}`,
          display: 'grid',
          placeItems: 'center',
          color: special ? 'var(--gold-bright)' : lore ? 'var(--arcane-bright)' : 'var(--text-3)',
        }}
      >
        {Icon(icon, { size: 12 })}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text)' }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{tag}</div>
      </div>
      {qty ? <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-2)' }}>x{qty}</span> : null}
      <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" style={{ padding: '2px 6px' }}>{Icon('kebab', { size: 12 })}</button>
    </div>
  );
}

function SkillsPanel() {
  return (
    <Card>
      <CardHead icon="eye" title="Skills" right={<span style={{ fontSize: 11, color: 'var(--text-3)' }}>filled = proficient</span>} />
      <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
        {SKILLS.map(([name, ability, mod, proficient]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px dashed var(--border-soft)' }}>
            <span style={{ width: 12, height: 12, borderRadius: 50, border: `1px solid ${proficient ? 'var(--gold)' : 'var(--border)'}`, background: proficient ? 'var(--gold)' : 'transparent', flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: proficient ? 'var(--text)' : 'var(--text-2)', flex: 1 }}>{name}</span>
            <span style={{ fontSize: 9.5, color: 'var(--text-4)', letterSpacing: '0.1em' }}>{ability}</span>
            <span className="fw-mono" style={{ fontSize: 13, color: proficient ? 'var(--gold-bright)' : 'var(--text-2)', minWidth: 28, textAlign: 'right' }}>{sgn(mod)}</span>
            <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" style={{ padding: '2px 6px' }}>{Icon('dice', { size: 10 })}</button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FeaturesPanel() {
  const features = [
    { kind: 'Race', name: 'Darkvision', text: 'See in dim light as bright, and in darkness as dim. 60 ft.' },
    { kind: 'Race', name: 'Hellish Resistance', text: 'Resistance to fire damage.' },
    { kind: 'Class', name: 'Pact Magic', text: '2 spell slots that recover on a short rest. Spell save DC 15, +7 to hit.', important: true },
    { kind: 'Class', name: 'Pact of the Tome', text: 'A Book of Shadows. Gain 3 cantrips from any class.', important: true },
    { kind: 'Class', name: 'Eldritch Invocations', text: "Agonizing Blast / Repelling Blast / Devil's Sight / Book of Ancient Secrets.", important: true },
    { kind: 'BG', name: 'Wanderer', text: 'Excellent memory for maps and geography. Recall general layouts of regions traveled.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {features.map((feature) => (
        <Card key={feature.name} style={{ borderColor: feature.important ? 'rgba(214,168,79,0.3)' : 'var(--border-soft)' }}>
          <div style={{ padding: '12px 16px', display: 'flex', gap: 12 }}>
            <span className="fw-pill" style={{ height: 'fit-content', marginTop: 2 }}>{feature.kind}</span>
            <div style={{ flex: 1 }}>
              <div className="fw-display" style={{ fontSize: 14, color: feature.important ? 'var(--gold-bright)' : 'var(--text)', marginBottom: 4 }}>{feature.name}</div>
              <div className="fw-serif" style={{ fontSize: 13.5, color: 'var(--text-2)', fontStyle: 'italic', lineHeight: 1.55 }}>{feature.text}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function SpellsPanel() {
  const spellGroups = [
    {
      level: 'Cantrip',
      spells: [
        ['Eldritch Blast', '1A / 120 ft / 2 beams / 1d10+4 force each', true],
        ['Thaumaturgy', '1A / 30 ft / sensory effect', false],
        ['Mage Hand', '1A / 30 ft / 10 lb / invisible (tome)', false],
      ],
    },
    {
      level: 'Pact (Lv 4)',
      spells: [
        ['Hex', '1BA / 90 ft / 1d6 necrotic per hit / 1h conc', true],
        ['Misty Step', '1BA / 30 ft / teleport', false],
        ['Counterspell', 'Reaction / 60 ft / interrupt cast', false],
        ['Hunger of Hadar', '1A / 150 ft / 20 ft sphere / 1m conc', false],
      ],
    },
    {
      level: 'Arcanum (Lv 6)',
      spells: [['Circle of Death', '1A / 150 ft / 60 ft sphere / 8d6 necrotic / 1 long rest', false]],
    },
  ] as const;

  return (
    <div>
      <div style={{ padding: 14, background: 'linear-gradient(180deg, rgba(124,58,237,0.07), rgba(124,58,237,0.02))', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 50, background: 'rgba(124,58,237,0.15)', border: '1px solid var(--arcane)', display: 'grid', placeItems: 'center', color: 'var(--arcane-bright)' }}>
          {Icon('flame', { size: 18 })}
        </div>
        <div style={{ flex: 1 }}>
          <div className="fw-display" style={{ fontSize: 14, color: 'var(--text)' }}>Pact Magic / Charisma</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--f-serif)', fontStyle: 'italic' }}>
            Spell save DC <b style={{ color: 'var(--gold-bright)' }}>15</b> / Spell attack <b style={{ color: 'var(--gold-bright)' }}>+7</b> / 2 slots per short rest
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2].map((slot) => (
            <span key={slot} style={{ width: 26, height: 26, borderRadius: 6, background: slot === 1 ? 'var(--bg-deep)' : 'linear-gradient(180deg, var(--arcane-bright), var(--arcane-deep))', border: `1px solid ${slot === 1 ? 'var(--border)' : 'var(--arcane)'}`, display: 'grid', placeItems: 'center', color: slot === 1 ? 'var(--text-4)' : '#fff', fontFamily: 'var(--f-mono)', fontSize: 11 }}>{slot === 1 ? 'used' : '4'}</span>
          ))}
        </div>
      </div>

      {spellGroups.map((group) => (
        <Card key={group.level} style={{ marginBottom: 12 }}>
          <CardHead icon="flame" title={group.level} right={<span style={{ fontSize: 11, color: 'var(--text-3)' }}>{group.spells.length} known</span>} />
          <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {group.spells.map(([name, detail, active]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: active ? 'rgba(124,58,237,0.07)' : 'var(--surface-2)', border: `1px solid ${active ? 'rgba(124,58,237,0.3)' : 'var(--border-soft)'}`, borderRadius: 6 }}>
                <span style={{ color: active ? 'var(--arcane-bright)' : 'var(--gold)' }}>{Icon('flame', { size: 13 })}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--f-mono)' }}>{detail}</div>
                </div>
                {active ? <span className="fw-pill" style={{ background: 'rgba(124,58,237,0.18)', borderColor: 'var(--arcane)', color: 'var(--arcane-bright)', fontSize: 9.5 }}>Active</span> : null}
                <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" style={{ padding: '3px 8px', fontSize: 10.5 }}>{Icon('dice', { size: 10 })} Cast</button>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function ItemsPanel() {
  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            ['GP', '47', '#D6A84F'],
            ['SP', '12', '#A8A29E'],
            ['EP', '2', '#B8B0A4'],
            ['CP', '30', '#8C5A3C'],
          ].map(([label, value, color]) => (
            <div key={label} style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-soft)', borderRadius: 6, padding: 10, textAlign: 'center' }}>
              <div className="fw-eyebrow" style={{ fontSize: 10, color }}>{label}</div>
              <div className="fw-display" style={{ fontSize: 22, color: 'var(--text)', lineHeight: 1.1 }}>{value}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <CardHead icon="sword" title="Equipped" right={<span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--f-mono)' }}>Carry 34 / 90 lb</span>} />
        <div style={{ padding: 8 }}>
          <SheetItem icon="flame" name="Staff of the Cinder-Reeve" tag="Pact weapon / 1d8+4 fire / attuned" special />
          <SheetItem icon="shield" name="Leather armor" tag="AC 11 + Dex modifier" />
          <SheetItem icon="sword" name="Light crossbow" tag="1d8 piercing / 80/320 ft / 5 lb" />
          <SheetItem icon="sword" name="Dagger" tag="1d4 piercing / finesse / thrown 20/60" />
        </div>
      </Card>

      <Card>
        <CardHead icon="bag" title="Carried" />
        <div style={{ padding: 8 }}>
          <SheetItem icon="heart" name="Potion of Healing" tag="2d4+2 HP / standard" qty={2} />
          <SheetItem icon="sparkles" name="Bone-tablet fragment" tag="Quest / Embers arc" lore />
          <SheetItem icon="sparkles" name="Brass censer-key" tag="Trinket / binding-resonance" lore />
          <SheetItem icon="book" name="Book of Shadows" tag="Pact tome / 3 cantrips" special />
        </div>
      </Card>
    </div>
  );
}

function LorePanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card>
        <CardHead icon="scroll" title="Backstory" right={<button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">{Icon('sparkles', { size: 11 })} Edit</button>} />
        <div style={{ padding: '14px 18px', fontFamily: 'var(--f-serif)', fontSize: 15, color: 'var(--text-2)', lineHeight: 1.7, fontStyle: 'italic' }}>
          Born to a sept of cinder-priests in the Reach. At fourteen, signed a pact with the <b style={{ color: 'var(--gold-bright)', fontStyle: 'normal' }}>Cinder-Reeve</b> to spare a sister&apos;s life, and has carried the brass collar of that bargain ever since.
          <br /><br />
          Wandered the Border-Reach for three summers as a courier-by-trade and a question-asker by night. Joined the party at Brask&apos;s Hold the morning after the bone-tablet went missing.
        </div>
      </Card>

      <Card>
        <CardHead icon="users" title="Allies & Enemies" />
        <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            ['Lira Vael', 'Sister / Allied', 'In the Reach. Believes I died at fourteen.', 'good'],
            ['Brother Halric', 'Companion / Allied', 'Cleric of Solm. Currently bleeding out.', 'good'],
            ['The Cinder-Reeve', 'Patron / Owed', 'Speaks through brass. Watches always.', 'neutral'],
            ['Mother Censer', 'Enemy', 'Knows my real name. Once was kin.', 'bad'],
          ].map(([name, rel, desc, tone]) => (
            <div key={name} style={{ padding: 10, background: 'var(--surface-2)', border: `1px solid ${tone === 'good' ? 'rgba(34,197,94,0.3)' : tone === 'bad' ? 'rgba(153,27,27,0.4)' : 'var(--border-soft)'}`, borderRadius: 6 }}>
              <div className="fw-display" style={{ fontSize: 13, color: 'var(--text)' }}>{name}</div>
              <div style={{ fontSize: 10.5, color: tone === 'good' ? '#86EFAC' : tone === 'bad' ? '#FCA5A5' : 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>{rel}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, fontFamily: 'var(--f-serif)', fontStyle: 'italic', lineHeight: 1.4 }}>{desc}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function CharacterSheetPage({ user, onBack }: CharacterSheetPageProps) {
  const [tab, setTab] = useState<TabId>('skills');
  const [hpCurrent, setHpCurrent] = useState(38);
  const [tempHp, setTempHp] = useState(0);
  const [deathSuccesses, setDeathSuccesses] = useState(0);
  const [deathFails, setDeathFails] = useState(0);
  const hpMax = 52;
  const hpPct = (hpCurrent / hpMax) * 100;
  const hpColor = hpPct > 50 ? 'var(--success)' : hpPct > 25 ? 'var(--warning)' : 'var(--blood-bright)';
  const initials = (user.email?.split('@')[0] || 'Aedric Vael').slice(0, 2).toUpperCase();

  return (
    <div className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page" style={{ maxWidth: 1480 }}>
        <div className="fw-cs-header fw-orn">
          <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
          <span className="fw-orn-c bl" /><span className="fw-orn-c br" />
          <div className="fw-cs-portrait">
            <div className="fw-cs-portrait-inner">{initials}</div>
            <span className="fw-cs-level">7</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="fw-eyebrow" style={{ color: 'var(--gold)', marginBottom: 4 }}>Character Sheet / Active</div>
            <h1 className="fw-display" style={{ fontSize: 36, color: 'var(--text)', lineHeight: 1.05, letterSpacing: '0.04em' }}>Aedric Vael</h1>
            <div className="fw-serif" style={{ fontStyle: 'italic', fontSize: 16, color: 'var(--text-2)', marginTop: 6 }}>
              Tiefling Warlock / The Cinder-Reeve / Outlander
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <span className="fw-pill gold">{Icon('crown', { size: 10 })} The Hollow Crown of Ysavir</span>
              <span className="fw-pill dim">XP 23,400 / 34,000</span>
              <span className="fw-pill">Aedric / @{user.email?.split('@')[0] || 'aedric_v'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" onClick={onBack}>{Icon('chevL', { size: 11 })} Back</button>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">{Icon('scroll', { size: 11 })} Export PDF</button>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">{Icon('link', { size: 11 })} Share</button>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">{Icon('cog', { size: 11 })} Edit</button>
              <button className="fw-btn fw-btn-gold fw-btn-sm" type="button">{Icon('sparkles', { size: 11 })} Level Up</button>
            </div>
            <div style={{ marginTop: 4, fontSize: 10.5, color: 'var(--text-4)', fontFamily: 'var(--f-mono)', letterSpacing: '0.04em' }}>
              last edit / 2d ago / before Session 15
            </div>
          </div>
        </div>

        <div className="fw-cs-grid">
          <div className="fw-cs-col">
            <Card elev className="fw-orn" style={{ overflow: 'hidden' }}>
              <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
              <span className="fw-orn-c bl" /><span className="fw-orn-c br" />
              <div style={{ padding: '16px 18px', textAlign: 'center', background: 'radial-gradient(ellipse at 50% 0%, rgba(153,27,27,0.18), transparent 70%)' }}>
                <div className="fw-eyebrow" style={{ color: 'var(--text-3)', marginBottom: 4 }}>Hit Points</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
                  <span className="fw-display" style={{ fontSize: 48, lineHeight: 1, color: hpColor }}>{hpCurrent}</span>
                  <span style={{ fontFamily: 'var(--f-display)', fontSize: 22, color: 'var(--text-3)' }}>/ {hpMax}</span>
                </div>
                {tempHp > 0 ? <div style={{ marginTop: 4, fontSize: 11.5, color: 'var(--arcane-bright)', fontFamily: 'var(--f-mono)' }}>+{tempHp} temp HP</div> : null}
                <div style={{ marginTop: 12, height: 6, background: 'var(--bg-deep)', borderRadius: 50, overflow: 'hidden', border: '1px solid var(--border-soft)' }}>
                  <div style={{ height: '100%', width: `${hpPct}%`, background: `linear-gradient(90deg, var(--blood), ${hpColor})`, transition: 'width 0.25s' }} />
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'center' }}>
                  <button className="fw-btn fw-btn-blood fw-btn-sm" type="button" onClick={() => setHpCurrent((hp) => Math.max(0, hp - 5))}>{Icon('minus', { size: 11 })} 5</button>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" onClick={() => setHpCurrent((hp) => Math.max(0, hp - 1))}>{Icon('minus', { size: 11 })} 1</button>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" onClick={() => setHpCurrent((hp) => Math.min(hpMax, hp + 1))}>{Icon('plus', { size: 11 })} 1</button>
                  <button className="fw-btn fw-btn-gold fw-btn-sm" type="button" onClick={() => setHpCurrent((hp) => Math.min(hpMax, hp + 5))}>{Icon('plus', { size: 11 })} 5</button>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'center' }}>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" onClick={() => setTempHp((hp) => hp + 5)} style={{ fontSize: 10.5 }}>{Icon('shield', { size: 10 })} +Temp</button>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" onClick={() => setHpCurrent(hpMax)} style={{ fontSize: 10.5 }}>{Icon('heart', { size: 10 })} Full heal</button>
                </div>
              </div>

              {hpCurrent === 0 ? (
                <div style={{ borderTop: '1px solid var(--border-soft)', padding: '10px 18px', background: 'rgba(153,27,27,0.05)' }}>
                  <div className="fw-eyebrow" style={{ color: 'var(--blood-bright)', marginBottom: 6 }}>Death Saves</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {[
                      ['Successes', deathSuccesses, setDeathSuccesses, 'var(--success)'],
                      ['Failures', deathFails, setDeathFails, 'var(--blood-bright)'],
                    ].map(([label, count, setter, color]) => (
                      <div key={label as string}>
                        <div style={{ fontSize: 10, color: color as string, marginBottom: 3 }}>{label as string}</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[0, 1, 2].map((index) => (
                            <button
                              key={index}
                              type="button"
                              aria-label={`${label as string} ${index + 1}`}
                              onClick={() => (setter as React.Dispatch<React.SetStateAction<number>>)((count as number) === index + 1 ? index : index + 1)}
                              style={{ width: 18, height: 18, borderRadius: 50, border: `1px solid ${color as string}`, background: index < (count as number) ? (color as string) : 'transparent', cursor: 'pointer', padding: 0 }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}>
                    {Icon('dice', { size: 11 })} Roll Death Save
                  </button>
                </div>
              ) : null}
            </Card>

            <Card>
              <CardHead icon="shield" title="Combat Vitals" />
              <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <VitalTile label="AC" value="14" sub="leather + Dex" />
                <VitalTile label="INIT" value="+2" sub="Dex" gold />
                <VitalTile label="SPD" value="30" sub="ft / round" />
                <VitalTile label="PROF" value="+3" sub="Lv 7" />
                <VitalTile label="PASS / PERC" value="13" sub="10 + Wis" small />
                <VitalTile label="HIT DICE" value="5/7" sub="d8" />
              </div>
            </Card>

            <Card>
              <CardHead icon="dice" title="Ability Scores" />
              <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {ABILITIES.map(([ability, value, mod]) => (
                  <div key={ability} style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: 10, position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span className="fw-eyebrow" style={{ fontSize: 10 }}>{ability}</span>
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-3)' }}>{value}</span>
                    </div>
                    <div className="fw-display" style={{ fontSize: 26, color: 'var(--gold-bright)', lineHeight: 1.1, marginTop: 2 }}>{sgn(mod)}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHead icon="shield" title="Saving Throws" />
              <div style={{ padding: '8px 12px 12px' }}>
                {SAVES.map(([ability, mod, proficient]) => (
                  <div key={ability} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px dashed var(--border-soft)' }}>
                    <span style={{ width: 12, height: 12, borderRadius: 50, border: `1px solid ${proficient ? 'var(--gold)' : 'var(--border)'}`, background: proficient ? 'var(--gold)' : 'transparent', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-2)', flex: 1, letterSpacing: '0.04em' }}>{ability}</span>
                    <span className="fw-mono" style={{ fontSize: 13, color: proficient ? 'var(--gold-bright)' : 'var(--text-2)', minWidth: 30, textAlign: 'right' }}>{sgn(mod)}</span>
                    <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" style={{ padding: '2px 6px' }}>{Icon('dice', { size: 10 })}</button>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHead icon="eye" title="Senses & Languages" />
              <div style={{ padding: 12, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.7 }}>
                <div><b style={{ color: 'var(--text)' }}>Darkvision</b> 60 ft (Tiefling)</div>
                <div><b style={{ color: 'var(--text)' }}>Resistance:</b> Fire (Tiefling)</div>
                <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--text-3)' }}>Common / Infernal / Cinder-Cant</div>
              </div>
            </Card>
          </div>

          <div className="fw-cs-col">
            <div className="fw-tabs">
              {[
                ['skills', 'Skills', 'eye'],
                ['features', 'Features', 'sparkles'],
                ['spells', 'Spells', 'flame'],
                ['items', 'Inventory', 'bag'],
                ['lore', 'Lore & Notes', 'scroll'],
              ].map(([id, label, icon]) => (
                <button key={id} type="button" className={`fw-tab ${tab === id ? 'active' : ''}`.trim()} onClick={() => setTab(id as TabId)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {Icon(icon, { size: 11 })} {label}
                </button>
              ))}
              <span style={{ flex: 1, borderBottom: '1px solid var(--border-soft)' }} />
            </div>
            <div style={{ marginTop: 16 }}>
              {tab === 'skills' ? <SkillsPanel /> : null}
              {tab === 'features' ? <FeaturesPanel /> : null}
              {tab === 'spells' ? <SpellsPanel /> : null}
              {tab === 'items' ? <ItemsPanel /> : null}
              {tab === 'lore' ? <LorePanel /> : null}
            </div>
          </div>

          <div className="fw-cs-col">
            <Card>
              <CardHead icon="alert" title="Conditions" right={<button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" style={{ padding: '2px 8px' }}>{Icon('plus', { size: 10 })}</button>} />
              <div style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                <span className="fw-cond buff">Bless / 6 rd</span>
                <span className="fw-cond bleed">Cursed / until rest</span>
              </div>
            </Card>

            <Card>
              <CardHead icon="flame" title="Resources" />
              <div style={{ padding: '12px 14px' }}>
                <ResourceBar label="Pact Slots (Lv 4)" cur={1} max={2} color="arcane" />
                <ResourceBar label="Hit Dice (d8)" cur={5} max={7} color="gold" />
                <ResourceBar label="Inspiration" cur={1} max={1} color="gold" diamond />
                <ResourceBar label="Channel Patron" cur={0} max={1} color="arcane" />
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" style={{ flex: 1, justifyContent: 'center' }}>{Icon('flame', { size: 11 })} Short Rest</button>
                  <button className="fw-btn fw-btn-gold fw-btn-sm" type="button" style={{ flex: 1, justifyContent: 'center' }}>{Icon('sparkles', { size: 11 })} Long Rest</button>
                </div>
              </div>
            </Card>

            <Card>
              <CardHead icon="dice" title="Quick Rolls" />
              <div style={{ padding: '8px 10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  ['Eldritch Blast', '2d10 + 4 force', 'flame', true],
                  ['Hex Damage', '1d6 necrotic', 'skull', false],
                  ['Persuasion', '1d20 + 7', 'users', false],
                  ['Stealth', '1d20 + 2', 'eye', false],
                  ['Initiative', '1d20 + 2', 'zap', false],
                ].map(([name, dice, icon, primary]) => (
                  <button key={name as string} className="fw-btn fw-btn-ghost" type="button" style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px', fontSize: 12, borderColor: primary ? 'var(--gold-deep)' : undefined, background: primary ? 'rgba(214,168,79,0.06)' : undefined }}>
                    <span style={{ color: primary ? 'var(--gold-bright)' : 'var(--gold)' }}>{Icon(icon as string, { size: 12 })}</span>
                    <span style={{ flex: 1, textAlign: 'left' }}>{name as string}</span>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--text-3)' }}>{dice as string}</span>
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <CardHead icon="heart" title="Roleplay" />
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'var(--f-serif)', fontSize: 13.5, lineHeight: 1.55 }}>
                <RpLine label="Ideal" text="A bargain is the only honest covenant." />
                <RpLine label="Bond" text="My sister, Lira, must never know what I gave for her." />
                <RpLine label="Flaw" text="I keep returning to the brass censer when the dreams come." />
                <RpLine label="Trait" text="I count my own heartbeats when nervous." />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
