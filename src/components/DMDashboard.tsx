import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Icon } from './ui/Icons';

type DMDashboardProps = {
  user: User;
  onBack: () => void;
};

type SectionId = 'overview' | 'encounter' | 'initiative' | 'npcs' | 'scenes' | 'audio';

const SECTIONS: Array<[SectionId, string, string]> = [
  ['overview', 'Overview', 'home'],
  ['encounter', 'Encounter', 'sword'],
  ['initiative', 'Initiative', 'zap'],
  ['npcs', 'NPCs', 'users'],
  ['scenes', 'Scenes & Handouts', 'map'],
  ['audio', 'Audio', 'volume'],
];

function Card({ children, elev, className = '', style }: { children: React.ReactNode; elev?: boolean; className?: string; style?: React.CSSProperties }) {
  return <div className={`fw-card ${elev ? 'fw-card-elev' : ''} ${className}`.trim()} style={style}>{children}</div>;
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

function Toggle({ on }: { on: boolean }) {
  return <button className={`fw-toggle ${on ? 'on' : ''}`.trim()} type="button" aria-pressed={on} />;
}

function SecretRow({ who, detail }: { who: string; detail: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span className="fw-pill gold" style={{ fontSize: 9, padding: '0 6px', flexShrink: 0, marginTop: 2 }}>{who}</span>
      <span style={{ color: 'var(--text-2)', fontStyle: 'italic' }}>{detail}</span>
    </div>
  );
}

function ThreadRow({ heat, title, sub }: { heat: 'hot' | 'warm' | 'cold'; title: string; sub: string }) {
  const color = heat === 'hot' ? 'var(--blood-bright)' : heat === 'warm' ? 'var(--gold-bright)' : 'var(--text-3)';
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 8, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: 50, background: color, boxShadow: heat === 'hot' ? '0 0 8px var(--blood-bright)' : 'none', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: 'var(--text)' }}>{title}</div>
        <div style={{ fontSize: 10.5, color: 'var(--text-4)' }}>{sub}</div>
      </div>
      <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" style={{ padding: '2px 6px' }}>{Icon('chevR', { size: 11 })}</button>
    </div>
  );
}

function Header({ dmName, onBack }: { dmName: string; onBack: () => void }) {
  const party = [
    { i: 'AE', n: 'Sample Warlock', c: 'Warlock 7', st: 'Ready', color: '#7C3AED', ok: true },
    { i: 'KI', n: 'Kessra', c: 'Martial 7', st: 'Ready', color: '#D6A84F', ok: true },
    { i: 'MT', n: 'Mirenna', c: 'Druid 7', st: 'Ready', color: '#22C55E', ok: true },
    { i: 'HD', n: 'Halric', c: 'Cleric 6', st: 'Unconscious', color: '#A8A29E', ok: false },
  ];

  return (
    <Card elev className="fw-orn" style={{ overflow: 'hidden', marginBottom: 24 }}>
      <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
      <span className="fw-orn-c bl" /><span className="fw-orn-c br" />
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.9fr', minHeight: 200 }}>
        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="fw-pill gold">{Icon('crown', { size: 11 })} DM Dashboard</span>
            <span className="fw-pill blood" style={{ animation: 'fw-glow-pulse 2.4s infinite' }}>
              <span style={{ width: 5, height: 5, borderRadius: 50, background: 'currentColor' }} /> Session 16 / tonight 20:00
            </span>
            <span className="fw-pill dim">Prep / 78% complete</span>
            <span className="fw-pill dim">DM / {dmName}</span>
          </div>
          <div>
            <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Act III / The Gilded Tomb</div>
            <h1 className="fw-display" style={{ fontSize: 34, lineHeight: 1.05, color: 'var(--text)' }}>
              The Hollow Crown<br /><span style={{ color: 'var(--gold-bright)' }}>of Ysavir</span>
            </h1>
          </div>
          <p className="fw-serif" style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, fontStyle: 'italic', maxWidth: 560 }}>
            They left the chapel mid-binding. Halric is down. The Cinder-Reeve is patient. Tonight, it speaks. If they free the held shadow, the brass chain frays. If they do not, the chapel reaches up.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
            <button className="fw-btn fw-btn-gold fw-btn-lg" type="button">{Icon('play', { size: 14 })} Start Session 16</button>
            <button className="fw-btn fw-btn-ghost" type="button">{Icon('scroll', { size: 12 })} Session 15 recap</button>
            <button className="fw-btn fw-btn-ghost" type="button">{Icon('sparkles', { size: 12 })} AI Warden brief</button>
            <button className="fw-btn fw-btn-ghost" type="button" onClick={onBack}>{Icon('chevL', { size: 12 })} Back</button>
          </div>
        </div>
        <div style={{ position: 'relative', background: 'linear-gradient(135deg, #1a1428 0%, #0a0814 100%)', borderLeft: '1px solid var(--border-soft)', padding: 22 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 70% 80%, rgba(124,58,237,0.22), transparent 60%)' }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="fw-eyebrow" style={{ marginBottom: 2 }}>The Party</div>
            {party.map((member) => (
              <div key={member.i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'rgba(20,17,29,0.55)', border: '1px solid var(--border-soft)', borderRadius: 5 }}>
                <span className="fw-avatar sm" style={{ background: `linear-gradient(135deg, ${member.color}33, #15101f)`, fontSize: 10 }}>{member.i}</span>
                <div style={{ flex: 1, minWidth: 0, fontSize: 11.5 }}>
                  <div style={{ color: 'var(--text)' }}>{member.n}</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 10 }}>{member.c}</div>
                </div>
                <span style={{ fontSize: 10, color: member.ok ? 'var(--success)' : 'var(--blood-bright)', fontFamily: 'var(--f-mono)' }}>{member.st}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function OverviewSection() {
  const beats = [
    { t: 'Cold open / the Cinder-Reeve speaks', dur: '10 min', kind: 'Roleplay', done: true },
    { t: "Halric stabilizes (or does not)", dur: '5 min', kind: 'Decision', done: true },
    { t: 'Binding circle / INT(Arcana) DC 17, CHA DC 15', dur: '15 min', kind: 'Skill', current: true },
    { t: 'If they free the shadow / Brass-chain ambush', dur: '30 min', kind: 'Combat' },
    { t: 'If they do not / Chapel reaches up', dur: '30 min', kind: 'Combat' },
    { t: 'Resolution / descent to Act IV', dur: '10 min', kind: 'Roleplay' },
  ];
  const checklist = [
    ['Review Session 15 log', true],
    ['Re-read Brass-Chain ambush', true],
    ['Statblock: Cinder-Reeve', true],
    ['Statblock: Brass Spear x2', true],
    ['Statblock: Bound Shadow', false],
    ['NPC voices / Reeve, Halric', true],
    ['Handouts: Binding circle map', true],
    ['Handouts: Bone-tablet rubbing', false],
    ['Soundboard: chapel ambience', true],
    ['Soundboard: combat cue', true],
    ['Player secrets / refresh', true],
    ['XP budget calculated', false],
  ] as const;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card>
          <CardHead icon="scroll" title="Tonight's Beats" right={<button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">{Icon('plus', { size: 11 })} Add beat</button>} />
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {beats.map((beat) => (
              <div key={beat.t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: beat.current ? 'linear-gradient(90deg, rgba(214,168,79,0.10), transparent)' : 'var(--surface-2)', border: `1px solid ${beat.current ? 'rgba(214,168,79,0.45)' : 'var(--border-soft)'}`, borderRadius: 6, opacity: beat.done ? 0.55 : 1 }}>
                <span style={{ width: 18, height: 18, borderRadius: 50, border: `1px solid ${beat.done ? 'var(--gold-deep)' : beat.current ? 'var(--gold)' : 'var(--border)'}`, background: beat.done ? 'rgba(214,168,79,0.2)' : 'transparent', display: 'grid', placeItems: 'center', color: 'var(--gold-bright)', flexShrink: 0 }}>
                  {beat.done ? Icon('check', { size: 10 }) : null}
                  {beat.current ? <span style={{ width: 6, height: 6, borderRadius: 50, background: 'var(--gold-bright)', animation: 'fw-glow-pulse 2s infinite' }} /> : null}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', textDecoration: beat.done ? 'line-through' : 'none' }}>{beat.t}</div>
                </div>
                <span className="fw-pill" style={{ fontSize: 9.5 }}>{beat.kind}</span>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--text-3)', width: 50, textAlign: 'right' }}>{beat.dur}</span>
              </div>
            ))}
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', color: 'var(--text-3)', fontSize: 11.5, fontFamily: 'var(--f-mono)' }}>
              <span>Total budget</span><span style={{ flex: 1, height: 1, background: 'var(--border-soft)' }} /><span style={{ color: 'var(--gold-bright)' }}>~ 1h 40m</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHead icon="check" title="Prep Checklist" right={<span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--f-mono)' }}>9 / 12 / 75%</span>} />
          <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
            {checklist.map(([text, done]) => (
              <label key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px dashed var(--border-soft)', fontSize: 12.5, color: done ? 'var(--text-3)' : 'var(--text)', cursor: 'pointer' }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${done ? 'var(--gold)' : 'var(--border)'}`, background: done ? 'rgba(214,168,79,0.15)' : 'transparent', display: 'grid', placeItems: 'center', color: 'var(--gold-bright)', flexShrink: 0 }}>{done ? Icon('check', { size: 9 }) : null}</span>
                <span style={{ textDecoration: done ? 'line-through' : 'none', flex: 1 }}>{text}</span>
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead icon="scroll" title="DM Notes" right={<button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">{Icon('sparkles', { size: 11 })} Suggest</button>} />
          <div style={{ padding: 14 }}>
            <textarea className="fw-textarea" rows={6} defaultValue={"REMEMBER: The Cinder-Reeve does not speak in present tense. Always past or future.\n\nIf the warlock tries to bargain, he must invoke the brass collar. The Reeve will refuse twice before listening.\n\nMirenna's elk = 13 HP left. Do not forget."} />
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card style={{ borderColor: 'rgba(124,58,237,0.3)' }}>
          <CardHead icon="lock" title="Player Secrets" right={<span className="fw-pill" style={{ background: 'rgba(124,58,237,0.15)', borderColor: 'var(--arcane)', color: 'var(--arcane-bright)', fontSize: 9 }}>DM only</span>} />
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5, fontFamily: 'var(--f-serif)', lineHeight: 1.5 }}>
            <SecretRow who="Warlock" detail="The Cinder-Reeve is his sister's true patron, not his." />
            <SecretRow who="Kessra" detail="Owes a debt to the Brass Sept. They will collect this Act." />
            <SecretRow who="Mirenna" detail="Her elk is the wandering soul of her grandmother." />
            <SecretRow who="Halric" detail="If he dies tonight, Solm will resurrect him at a cost." />
          </div>
        </Card>

        <Card>
          <CardHead icon="dice" title="DM Quick Rolls" />
          <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              ['Random NPC name', 'd100 table', 'users'],
              ['Wandering encounter', 'd20 / Ysavir', 'compass'],
              ['Weather', 'd10', 'sparkles'],
              ['Loot / Tier 2', 'd100', 'bag'],
              ['Critical narration', 'd8 table', 'flame'],
            ].map(([name, dice, icon]) => (
              <button key={name} className="fw-btn fw-btn-ghost" type="button" style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px', fontSize: 12 }}>
                <span style={{ color: 'var(--gold)' }}>{Icon(icon, { size: 12 })}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{name}</span>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--text-3)' }}>{dice}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead icon="scroll" title="Open Threads" right={<span style={{ fontSize: 11, color: 'var(--text-3)' }}>5 active</span>} />
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ThreadRow heat="hot" title="Bone-tablet / 2 of 3 fragments" sub="Touched session 14" />
            <ThreadRow heat="warm" title="The warlock's collar / who else can see it?" sub="Promised reveal Act III" />
            <ThreadRow heat="warm" title="Brass Sept's collector" sub="Should appear by S18" />
            <ThreadRow heat="cold" title="Lira's letter / unsent" sub="Player-driven" />
            <ThreadRow heat="cold" title="The wandering elk's first name" sub="Mirenna does not know yet" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function EncounterSection() {
  const selected = [
    { n: 'Cinder-Reeve', cr: 7, xp: 2900, qty: 1, kind: 'Solo / Boss' },
    { n: 'Brass Spear', cr: 2, xp: 450, qty: 2, kind: 'Minion' },
    { n: 'Bound Shadow', cr: 1.5, xp: 700, qty: 1, kind: 'Hazard' },
  ];
  const library = [
    ['Cinder-Reeve', 'Undead / Fire', 'Boss', '7', '2900', true],
    ['Brass Spear', 'Construct', 'Minion', '2', '450', true],
    ['Bound Shadow', 'Undead', 'Hazard', '1.5', '700', true],
    ['Censer-priest', 'Humanoid / Cleric', 'Caster', '4', '1100', false],
    ['Soot-wretch', 'Aberration', 'Swarm', '0.5', '100', false],
    ['Brass Mastiff', 'Construct / Fire', 'Bruiser', '3', '700', false],
  ] as const;
  const totalXp = selected.reduce((sum, item) => sum + item.xp * item.qty, 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
      <Card>
        <CardHead icon="skull" title="Bestiary / Region: Ysavir-Under" right={<button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">{Icon('filter', { size: 11 })} Filter</button>} />
        <div style={{ padding: 10 }}>
          <input className="fw-input" placeholder="Search creatures / stat blocks / tags..." style={{ marginBottom: 10 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {library.map(([name, type, kind, cr, xp, active]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: active ? 'rgba(214,168,79,0.05)' : 'var(--surface-2)', border: `1px solid ${active ? 'rgba(214,168,79,0.3)' : 'var(--border-soft)'}`, borderRadius: 5 }}>
                <span style={{ width: 32, height: 32, borderRadius: 5, background: 'var(--bg-deep)', border: '1px solid var(--border-soft)', display: 'grid', placeItems: 'center', color: active ? 'var(--gold)' : 'var(--text-3)', flexShrink: 0 }}>{Icon('skull', { size: 14 })}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{name}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{type} / {kind}</div>
                </div>
                <div style={{ width: 60, textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--gold-bright)' }}>CR {cr}</div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9.5, color: 'var(--text-4)' }}>{xp} XP</div>
                </div>
                <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" style={{ padding: '2px 8px' }}>{active ? Icon('check', { size: 11 }) : Icon('plus', { size: 11 })}</button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card elev>
          <CardHead icon="sword" title="Built Encounter" right={<span className="fw-pill blood">HARD</span>} />
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selected.map((item) => (
              <div key={item.n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 6 }}>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{item.n}</span>
                <span className="fw-pill" style={{ fontSize: 9.5 }}>{item.kind}</span>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-3)' }}>x{item.qty}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border-soft)', fontFamily: 'var(--f-mono)', fontSize: 11 }}>
              <span style={{ color: 'var(--text-3)' }}>Adjusted XP</span>
              <span style={{ color: 'var(--gold-bright)' }}>{totalXp.toLocaleString()}</span>
            </div>
            <button className="fw-btn fw-btn-gold" type="button" style={{ justifyContent: 'center' }}>{Icon('play', { size: 12 })} Load into Table</button>
          </div>
        </Card>
        <Card>
          <CardHead icon="skull" title="Boss Focus" />
          <div style={{ padding: 14, fontFamily: 'var(--f-serif)', color: 'var(--text-2)', lineHeight: 1.55, fontStyle: 'italic' }}>
            Brass Words: 60 ft. WIS save DC 17 or take 4d8 psychic and become frightened until end of next turn.
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <button className="fw-btn fw-btn-blood fw-btn-sm" type="button">{Icon('zap', { size: 11 })} Brass Words</button>
              <button className="fw-btn fw-btn-blood fw-btn-sm" type="button">{Icon('flame', { size: 11 })} Censer Slam</button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function InitiativeSection() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <Card>
        <CardHead icon="zap" title="Initiative / Round 1" right={<span className="fw-pill gold">Active: Cinder-Reeve</span>} />
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            ['22', 'Kessra', 'Ally', true],
            ['19', 'Cinder-Reeve', 'Boss', false],
            ['17', 'Warlock', 'Ally', true],
            ['14', 'Mirenna', 'Ally', true],
            ['8', 'Halric (down)', 'Ally', true],
          ].map(([ini, name, kind, ally]) => (
            <div key={name as string} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: name === 'Cinder-Reeve' ? 'rgba(153,27,27,0.08)' : 'var(--surface-2)', border: `1px solid ${name === 'Cinder-Reeve' ? 'rgba(153,27,27,0.35)' : 'var(--border-soft)'}`, borderRadius: 6 }}>
              <span style={{ width: 28, fontFamily: 'var(--f-mono)', fontSize: 14, color: 'var(--gold-bright)', textAlign: 'center' }}>{ini}</span>
              <span style={{ width: 9, height: 9, borderRadius: 50, background: ally ? 'var(--success)' : 'var(--blood-bright)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>{name as string}</span>
              <span className="fw-pill" style={{ fontSize: 9 }}>{kind as string}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CardHead icon="plus" title="Quick Add" />
        <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" style={{ justifyContent: 'center' }}>{Icon('user', { size: 11 })} NPC</button>
          <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" style={{ justifyContent: 'center' }}>{Icon('skull', { size: 11 })} Monster</button>
          <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" style={{ justifyContent: 'center' }}>{Icon('hex', { size: 11 })} Hazard</button>
          <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" style={{ justifyContent: 'center' }}>{Icon('dice', { size: 11 })} Re-roll</button>
        </div>
      </Card>
    </div>
  );
}

function NpcsSection() {
  const npcs = [
    ['The Cinder-Reeve', 'Patron / Antagonist', 'Brass-rasping. Past or future, never present.', 'Patient', true],
    ['Halric Dale', 'Party Cleric / Down', 'Northern lilt, careful breaths.', 'Bleeding', false],
    ['Mother Censer', "The warlock's old kin", 'Whisper-soft, mother-sharp.', 'Watchful', false],
    ["Brask of Brask's Hold", 'Innkeep / Ally', 'Slow, fond, often drunk.', 'Worried', false],
    ['Lira Vael', 'Sister / Off-screen', 'Bright, fast, terrible at lying.', 'Unaware', false],
    ['Septine warden', 'Faction / Neutral', 'Liturgical. Speaks in benedictions.', 'Curious', false],
  ] as const;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
      {npcs.map(([name, role, voice, mood, important]) => (
        <Card key={name} style={{ borderColor: important ? 'rgba(214,168,79,0.3)' : 'var(--border-soft)' }}>
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span className="fw-avatar lg" style={{ background: important ? 'linear-gradient(135deg, rgba(214,168,79,0.3), #15101f)' : 'linear-gradient(135deg, rgba(124,58,237,0.25), #15101f)', borderColor: important ? 'var(--gold-deep)' : 'var(--border)' }}>{name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="fw-display" style={{ fontSize: 14, color: 'var(--text)' }}>{name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{role}</div>
              </div>
              <span className="fw-pill" style={{ fontSize: 9.5 }}>{mood}</span>
            </div>
            <div style={{ paddingTop: 10, borderTop: '1px dashed var(--border-soft)' }}>
              <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Voice</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--f-serif)', fontStyle: 'italic', marginBottom: 10 }}>{voice}</div>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" style={{ width: '100%', justifyContent: 'center' }}>{Icon('scroll', { size: 11 })} Notes</button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ScenesSection() {
  const scenes = [
    ['Chapel of the Gilded Censer', 'Indoor / Dim', true],
    ['Brass-Chain ambush', 'Combat / Tight', false],
    ['Binding Circle (close-up)', 'Hazard / Detail', false],
    ['Descent to Act IV', 'Transition / Stair', false],
  ] as const;
  const handouts = [
    ['Binding circle / drafted map', 'Image / PNG / 1.2 MB', 'auto on beat 3', 'hex'],
    ['Bone-tablet rubbing #2', 'Image / WebP / 0.8 MB', 'manual', 'scroll'],
    ['Letter: Lira to the warlock', 'Document / MD', 'DM only / drop after combat', 'mail'],
    ['Ysavir-under quick map', 'Image / JPG / 2.4 MB', 'shared on entry', 'map'],
  ] as const;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
      <Card>
        <CardHead icon="map" title="Scenes" right={<button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">{Icon('plus', { size: 11 })} Add</button>} />
        <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {scenes.map(([name, tag, current]) => (
            <div key={name} style={{ position: 'relative', overflow: 'hidden', border: `1px solid ${current ? 'var(--gold-deep)' : 'var(--border-soft)'}`, borderRadius: 8, height: 150, background: 'linear-gradient(135deg, rgba(214,168,79,0.28), rgba(124,58,237,0.24))', cursor: 'pointer' }}>
              {current ? <span className="fw-pill gold" style={{ position: 'absolute', top: 8, left: 8, fontSize: 9.5 }}><span style={{ width: 5, height: 5, borderRadius: 50, background: 'var(--gold-bright)' }} /> Current</span> : null}
              <div style={{ position: 'absolute', inset: 0, opacity: 0.32, background: 'radial-gradient(circle at 50% 45%, var(--gold), transparent 20%), linear-gradient(160deg, transparent 45%, rgba(0,0,0,0.55))' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10, background: 'linear-gradient(180deg, transparent, rgba(6,5,10,0.92))' }}>
                <div className="fw-display" style={{ fontSize: 13, color: 'var(--text)' }}>{name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 1 }}>{tag}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CardHead icon="layers" title="Handouts" right={<button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">{Icon('plus', { size: 11 })} Upload</button>} />
        <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {handouts.map(([name, type, share, icon]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 5 }}>
              <span style={{ width: 30, height: 30, borderRadius: 5, background: 'var(--bg-deep)', border: '1px solid var(--border-soft)', display: 'grid', placeItems: 'center', color: 'var(--gold)' }}>{Icon(icon, { size: 13 })}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: 'var(--text)' }}>{name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--f-mono)' }}>{type}</div>
              </div>
              <span style={{ fontSize: 10, color: 'var(--gold-bright)', fontStyle: 'italic', fontFamily: 'var(--f-serif)', maxWidth: 130, textAlign: 'right' }}>{share}</span>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" style={{ padding: '3px 8px' }}>{Icon('send', { size: 11 })}</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AudioSection() {
  const [playing, setPlaying] = useState('chapel-ambience');
  const [vol, setVol] = useState(60);
  const ambience = [
    ['chapel-ambience', 'Chapel / censer & wind', 'Brooding', '8:00 loop'],
    ['under-cathedral', 'Under-cathedral chant', 'Dread', '12:00 loop'],
    ['ysavir-streets', 'Ysavir streets / night', 'Travel', '10:00 loop'],
    ['combat-low', 'Combat / low drums', 'Tension', '6:00 loop'],
    ['combat-high', 'Combat / brass and fire', 'Climax', '5:00 loop'],
    ['silence', 'Held silence (room tone)', 'Reveal', 'manual'],
  ] as const;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card elev style={{ overflow: 'hidden' }}>
          <div style={{ padding: 18, background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.18), transparent 70%)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <button style={{ width: 52, height: 52, borderRadius: 50, background: 'linear-gradient(180deg, var(--gold-bright), var(--gold-deep))', border: '1px solid var(--gold)', color: '#1a1428', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 0 20px -4px rgba(214,168,79,0.5)' }} type="button">{Icon('pause', { size: 20 })}</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Now playing / ambience</div>
              <div className="fw-display" style={{ fontSize: 18, color: 'var(--text)' }}>Chapel / censer &amp; wind</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--f-mono)' }}>02:14 / 08:00 / looping</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', minWidth: 180 }}>
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Master {vol}%</div>
              <input type="range" min={0} max={100} value={vol} onChange={(event) => setVol(Number(event.target.value))} style={{ width: 160, accentColor: 'var(--gold)' }} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHead icon="volume" title="Ambience" />
          <div style={{ padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ambience.map(([id, name, mood, dur]) => {
              const on = id === playing;
              return (
                <button key={id} className="fw-btn" type="button" onClick={() => setPlaying(id)} style={{ padding: 12, justifyContent: 'flex-start', alignItems: 'flex-start', flexDirection: 'column', textAlign: 'left', gap: 4, background: on ? 'linear-gradient(180deg, rgba(214,168,79,0.10), rgba(214,168,79,0.02))' : 'var(--surface-2)', borderColor: on ? 'var(--gold-deep)' : 'var(--border-soft)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                    <span style={{ color: on ? 'var(--gold-bright)' : 'var(--text-3)' }}>{Icon(on ? 'pause' : 'play', { size: 12 })}</span>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{name}</span>
                    <span className="fw-pill" style={{ fontSize: 9 }}>{mood}</span>
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--text-4)', fontFamily: 'var(--f-mono)', marginLeft: 20 }}>{dur}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card>
          <CardHead icon="zap" title="One-shots / SFX" />
          <div style={{ padding: 10, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
            {[
              ['Censer cracks', 'flame'],
              ['Brass-chain chime', 'bell'],
              ['Bound shadow cry', 'skull'],
              ['Stone door slam', 'hex'],
              ['Heartbeat thump', 'heart'],
              ['Revelation sting', 'sparkles'],
            ].map(([name, icon]) => (
              <button key={name} className="fw-btn fw-btn-ghost" type="button" style={{ flexDirection: 'column', padding: 10, gap: 4 }}>
                {Icon(icon, { size: 16 })}
                <span style={{ fontSize: 10.5, color: 'var(--text-2)' }}>{name}</span>
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <CardHead icon="cog" title="Audio Routing" />
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12 }}>
            {[
              ['Players hear ambience', true],
              ['Players hear SFX', true],
              ['Ducking when DM speaks', true],
              ['Fade on scene change', false],
            ].map(([label, on]) => (
              <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, color: 'var(--text-2)' }}>{label as string}</span>
                <Toggle on={on as boolean} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function DMDashboard({ user, onBack }: DMDashboardProps) {
  const [section, setSection] = useState<SectionId>('overview');
  const dmName = user.email?.split('@')[0] ?? 'Maelis';

  return (
    <div className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page" style={{ maxWidth: 1480 }}>
        <Header dmName={dmName} onBack={onBack} />

        <div className="fw-tabs" style={{ marginBottom: 20 }}>
          {SECTIONS.map(([id, label, icon]) => (
            <button key={id} type="button" className={`fw-tab ${section === id ? 'active' : ''}`.trim()} onClick={() => setSection(id)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {Icon(icon, { size: 11 })} {label}
            </button>
          ))}
          <span style={{ flex: 1, borderBottom: '1px solid var(--border-soft)' }} />
        </div>

        {section === 'overview' ? <OverviewSection /> : null}
        {section === 'encounter' ? <EncounterSection /> : null}
        {section === 'initiative' ? <InitiativeSection /> : null}
        {section === 'npcs' ? <NpcsSection /> : null}
        {section === 'scenes' ? <ScenesSection /> : null}
        {section === 'audio' ? <AudioSection /> : null}
      </div>
    </div>
  );
}
