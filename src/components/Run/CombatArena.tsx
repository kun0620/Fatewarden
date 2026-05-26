import {
  ArrowRight,
  ChevronRight,
  Clock,
  Crosshair,
  Eye,
  Flame,
  Heart,
  Shield,
  ShoppingBag,
  Sparkles,
  Sword,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import type { GameEvent } from '../../engine/events/types';
import type { RunCombatant, RunSkill, RunState } from '../../engine/run/runTypes';
import { useGameStore } from '../../store/useGameStore';
import type { CombatAttackType } from '../../types';

interface CombatArenaProps {
  onCombatEnd: (won: boolean) => void;
}

interface TargetRef {
  id: string;
  side: 'ally' | 'foe';
}

interface Floater {
  id: number;
  target: string;
  side: 'ally' | 'foe';
  value: string;
  type: 'damage' | 'heal';
  crit?: boolean;
}

interface CombatLogEntry {
  id: number;
  text: string;
  crit?: boolean;
}

const ICONS: Record<string, LucideIcon> = {
  arrowR: ArrowRight,
  bag: ShoppingBag,
  chevR: ChevronRight,
  clock: Clock,
  eye: Eye,
  flame: Flame,
  heart: Heart,
  reticle: Crosshair,
  shield: Shield,
  sparkles: Sparkles,
  sword: Sword,
  zap: Zap,
};

function WIcon(name: string, options: { size?: number; stroke?: number } = {}): ReactNode {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon size={options.size ?? 16} strokeWidth={options.stroke ?? 1.7} aria-hidden="true" />;
}

function PortraitArt({ kind, color, id }: { kind?: string; color?: string; id: string }) {
  const tint = color ?? '#9B5DE5';
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '-');

  return (
    <svg viewBox="0 0 100 130" preserveAspectRatio="xMidYMax meet" width="100%" height="100%" aria-hidden="true">
      <defs>
        <radialGradient id={`wr-combat-aura-${safeId}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={tint} stopOpacity="0.5" />
          <stop offset="100%" stopColor={tint} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`wr-combat-fig-${safeId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1428" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#0a0612" stopOpacity="0.96" />
          <stop offset="100%" stopColor="#050309" stopOpacity="1" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="60" r="50" fill={`url(#wr-combat-aura-${safeId})`} />
      <g stroke={tint} strokeWidth="0.8" fill="none" opacity="0.55">
        <circle cx="50" cy="38" r="18" />
        <path d="M32 38h36 M50 18v40" />
        {kind === 'foe' && <path d="M38 30 l-8 -10 M62 30 l8 -10" />}
      </g>
      <path
        fill={`url(#wr-combat-fig-${safeId})`}
        d="M50 30 a10 10 0 1 1 0.1 0 M30 130 v-20 c0-12 6-20 14-24 c-1-3 0-5 3-6 h6 c3 1 4 3 3 6 c8 4 14 12 14 24 v20 z"
      />
    </svg>
  );
}

function eventMeta(runState: RunState, actorId: string, targetId?: string) {
  return {
    id: crypto.randomUUID(),
    sessionId: runState.sessionId,
    actorId,
    targetId,
    createdAt: new Date().toISOString(),
    source: 'user' as const,
  };
}

function hpTone(actor: RunCombatant): 'high' | 'mid' | 'low' {
  const pct = actor.hpMax > 0 ? actor.hp / actor.hpMax : 0;
  if (pct <= 0.3) return 'low';
  if (pct <= 0.6) return 'mid';
  return 'high';
}

function getDamagePreview(skill: RunSkill): number {
  if (!skill.dmg) return skill.kind === 'heal' ? 12 : 8;
  const [minText, maxText] = skill.dmg.split('-');
  const min = Number(minText);
  const max = Number(maxText ?? minText);
  if (!Number.isFinite(min)) return 8;
  if (!Number.isFinite(max) || max <= min) return min;
  return min + Math.floor(Math.random() * (max - min + 1));
}

function getAttackType(skill: RunSkill): CombatAttackType {
  if (skill.kind !== 'attack') return 'melee';
  return skill.melee === false ? 'ranged' : 'melee';
}

function getFallbackSkill(): RunSkill {
  return {
    id: 'basic_attack',
    name: 'Attack',
    kind: 'attack',
    cost: 0,
    dmg: '6-10',
    targets: [1, 2],
    melee: true,
  };
}

function getActiveActor(runState: RunState, party: RunCombatant[], foes: RunCombatant[]): RunCombatant | null {
  const activeId = runState.initiativeOrder?.find((entry) => entry.now && !entry.down)?.id;
  if (activeId) {
    return [...party, ...foes].find((actor) => actor.id === activeId) ?? null;
  }
  return party.find((actor) => actor.you && !actor.down) ?? party.find((actor) => !actor.down) ?? foes.find((actor) => !actor.down) ?? null;
}

function validTargets(skill: RunSkill | null, active: RunCombatant | null, party: RunCombatant[], foes: RunCombatant[]): TargetRef[] {
  if (!skill || !active) return [];
  if (skill.kind === 'heal' || skill.self) {
    return party
      .filter((actor) => !actor.down && (skill.self ? actor.id === active.id : true))
      .map((actor) => ({ id: actor.id, side: 'ally' }));
  }
  if (skill.kind === 'buff') {
    return party.filter((actor) => !actor.down).map((actor) => ({ id: actor.id, side: 'ally' }));
  }
  const positions = skill.targets ?? [1, 2, 3, 4];
  return foes.filter((actor) => !actor.down && positions.includes(actor.pos)).map((actor) => ({ id: actor.id, side: 'foe' }));
}

function actorFromActiveCharacter(activeCharacter: ReturnType<typeof useGameStore.getState>['activeCharacter']): RunCombatant | null {
  if (!activeCharacter) return null;
  return {
    id: activeCharacter.id,
    name: activeCharacter.name,
    className: activeCharacter.className,
    hp: activeCharacter.hitPoints ?? activeCharacter.maxHitPoints ?? 1,
    hpMax: activeCharacter.maxHitPoints ?? activeCharacter.hitPoints ?? 1,
    block: 0,
    pos: 1,
    you: true,
    portrait: activeCharacter.className?.toLowerCase(),
    color: '#9B5DE5',
    conds: activeCharacter.activeConditions?.map((condition) => ({ k: condition, kind: 'debuff' })),
    skills: [getFallbackSkill()],
  };
}

function CombatantCard({
  actor,
  side,
  isActive,
  isTargetable,
  isHoverTarget,
  onHover,
  onClick,
  floater,
}: {
  actor: RunCombatant;
  side: 'ally' | 'foe';
  isActive?: boolean;
  isTargetable?: boolean;
  isHoverTarget?: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
  floater?: Floater;
}) {
  const hpPct = actor.hpMax > 0 ? Math.max(0, Math.min(100, (actor.hp / actor.hpMax) * 100)) : 0;
  const low = hpPct < 30 && hpPct > 0;
  const classes = ['wr-combatant', side];

  if (actor.down || actor.hp <= 0) classes.push('dead', 'wr-dead');
  if (isActive) classes.push('active', 'wr-combatant--active');
  if (isTargetable) classes.push('targetable');
  if (isHoverTarget && isTargetable) classes.push('target');

  return (
    <button
      type="button"
      className={classes.join(' ')}
      data-hp={hpTone(actor)}
      onClick={() => !(actor.down || actor.hp <= 0) && onClick(actor.id)}
      onMouseEnter={() => onHover(actor.id)}
      onMouseLeave={() => onHover(null)}
      disabled={actor.down || actor.hp <= 0}
    >
      <div className="wr-combatant-pos">
        Pos <b>{actor.pos}</b>
        {actor.you ? ' · You' : ''}
        {actor.boss ? ' · Boss' : ''}
      </div>

      <div className="wr-portrait">
        <span className="wr-pos-badge">{actor.pos}</span>
        {isTargetable && <span className="wr-target-reticle">{WIcon('reticle', { size: 16 })}</span>}
        <div className="wr-portrait-art">
          <PortraitArt kind={actor.portrait ?? side} color={actor.color} id={actor.id} />
        </div>

        {floater && <span className={`wr-floater ${floater.type}${floater.crit ? ' crit' : ''}`}>{floater.value}</span>}

        <div className="wr-portrait-banner">
          <div className="wr-portrait-name">{actor.name}</div>
          <div className="wr-portrait-class">{actor.className ?? (actor.boss ? 'Floor Boss' : side === 'foe' ? 'Enemy' : 'Adventurer')}</div>
        </div>
      </div>

      <div className="wr-combatant-hp">
        <div className="wr-hpbar" data-hp={hpTone(actor)}>
          <span className={`wr-hpbar-fill${low ? ' low' : ''}`} style={{ width: `${hpPct}%` }} />
        </div>
        <div className="wr-combatant-hp-row">
          <span className="icon">{WIcon('heart', { size: 11 })}</span>
          <span>
            <b>{Math.max(0, actor.hp)}</b> / {actor.hpMax}
          </span>
          {(actor.block ?? 0) > 0 && (
            <span style={{ marginLeft: 'auto', color: 'var(--wr-gold-bright)' }}>
              {WIcon('shield', { size: 10 })} {actor.block}
            </span>
          )}
        </div>

        <div className="wr-combatant-conds">
          {actor.conds?.map((condition, index) => (
            <span key={`${condition.k}-${index}`} className={`wr-cond-chip ${condition.kind}`}>
              {condition.k}
              {condition.n != null && <span className="wr-cond-num"> {condition.n}</span>}
            </span>
          ))}

          {side === 'foe' && actor.intent && !(actor.down || actor.hp <= 0) && (
            <span
              className="wr-cond-chip"
              style={{
                color: 'var(--wr-blood-bright)',
                borderColor: 'rgba(197,52,86,0.5)',
                background: 'rgba(139,21,56,0.18)',
              }}
            >
              {actor.intent.kind === 'attack' && (
                <>
                  {WIcon('sword', { size: 9, stroke: 2 })} {actor.intent.val}
                </>
              )}
              {actor.intent.kind === 'buff' && (
                <>
                  {WIcon('shield', { size: 9, stroke: 2 })} {actor.intent.val}
                </>
              )}
              {actor.intent.kind === 'debuff' && (
                <>
                  {WIcon('flame', { size: 9, stroke: 2 })} {actor.intent.val}
                </>
              )}
              {actor.intent.kind === 'channel' && (
                <>
                  {WIcon('zap', { size: 9, stroke: 2 })} {actor.intent.val}
                </>
              )}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function SkillButton({ skill, selected, onClick }: { skill: RunSkill; selected: boolean; onClick: () => void }) {
  const iconName = skill.kind === 'attack' ? (skill.melee ? 'sword' : 'flame') : skill.kind === 'heal' ? 'heart' : skill.kind === 'buff' ? 'shield' : 'sparkles';
  const iconColor =
    skill.kind === 'attack'
      ? 'var(--wr-blood-bright)'
      : skill.kind === 'heal'
        ? 'var(--wr-good)'
        : skill.kind === 'buff'
          ? 'var(--wr-violet-bright)'
          : 'var(--wr-gold-bright)';

  return (
    <button type="button" className={`wr-action-skill ${skill.kind}${selected ? ' selected' : ''}`} onClick={onClick}>
      <div className="wr-skill-head">
        <span style={{ color: iconColor }}>{WIcon(iconName, { size: 12, stroke: 2 })}</span>
        <span className="wr-skill-name">{skill.name}</span>
        <span className="wr-skill-cost">{skill.cost}</span>
      </div>
      <div className="wr-skill-meta">
        {skill.dmg && (
          <>
            <b>{skill.dmg}</b> dmg
          </>
        )}
        {skill.val && <span style={{ color: 'var(--wr-good)' }}>{skill.val}</span>}
      </div>
      {skill.targets && (
        <div className="wr-skill-targets">
          {[1, 2, 3, 4].map((pos) => (
            <span key={pos} className={`wr-skill-target-dot${skill.targets?.includes(pos as 1 | 2 | 3 | 4) ? ' on' : ''}`} />
          ))}
        </div>
      )}
    </button>
  );
}

function ActionBar({
  active,
  isYourTurn,
  selectedSkill,
  setSelectedSkill,
  onEndTurn,
}: {
  active: RunCombatant | null;
  isYourTurn: boolean;
  selectedSkill: RunSkill | null;
  setSelectedSkill: (skill: RunSkill | null) => void;
  onEndTurn: () => void;
}) {
  if (!active || active.down || active.hp <= 0) {
    return (
      <div className="wr-action-bar">
        <div className="wr-action-who" style={{ borderColor: 'var(--wr-edge)', background: 'var(--wr-panel)' }}>
          <div className="wr-action-who-name" style={{ color: 'var(--wr-text-3)' }}>NO ACTOR</div>
          <div className="wr-action-who-sub">Awaiting turn...</div>
        </div>
        <div />
        <div />
      </div>
    );
  }

  if (!isYourTurn) {
    return (
      <div className="wr-action-bar" style={{ gridTemplateColumns: '220px 1fr 160px' }}>
        <div className="wr-action-who" style={{ borderColor: 'var(--wr-blood-deep)', background: 'linear-gradient(180deg, rgba(139,21,56,0.10), rgba(139,21,56,0.02))' }}>
          <div className="wr-action-who-name" style={{ color: 'var(--wr-blood-bright)' }}>{active.name}</div>
          <div className="wr-action-who-sub">{active.you ? 'Your turn' : 'Now acting...'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px', fontFamily: 'var(--wr-f-body)', fontStyle: 'italic', color: 'var(--wr-text-3)', fontSize: 14, textAlign: 'center' }}>
          "{active.name} draws breath. The chamber holds it with them."
        </div>
        <div className="wr-action-side">
          <button className="wr-btn wr-btn-ghost" type="button">{WIcon('eye', { size: 11 })} Watch</button>
        </div>
      </div>
    );
  }

  const skills = active.skills?.length ? active.skills : [getFallbackSkill()];
  const defaultAttack = skills.find((skill) => skill.kind === 'attack') ?? getFallbackSkill();

  return (
    <div className="wr-action-bar">
      <div className="wr-action-who">
        <div className="wr-action-who-name">{active.name}</div>
        <div className="wr-action-who-sub">
          {active.className ?? 'Adventurer'} · pos <b style={{ color: 'var(--wr-violet-bright)' }}>{active.pos}</b>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <span className="wr-stat">{WIcon('heart', { size: 11 })} {active.hp}/{active.hpMax}</span>
          <span className="wr-stat">{WIcon('shield', { size: 11 })} {active.block ?? 0}</span>
          <span className="wr-stat" style={{ color: 'var(--wr-violet-bright)' }}>{WIcon('zap', { size: 11 })} {skills.length}</span>
        </div>
        {selectedSkill && (
          <div
            style={{
              marginTop: 6,
              padding: '6px 8px',
              background: 'rgba(155,93,229,0.12)',
              border: '1px solid var(--wr-violet)',
              borderRadius: 2,
              fontFamily: 'var(--wr-f-body)',
              fontSize: 12,
              fontStyle: 'italic',
              color: 'var(--wr-violet-bright)',
            }}
          >
            Pick a target →
          </div>
        )}
      </div>

      <div className="wr-action-grid">
        <SkillButton
          skill={defaultAttack}
          selected={selectedSkill?.id === defaultAttack.id}
          onClick={() => setSelectedSkill(selectedSkill?.id === defaultAttack.id ? null : defaultAttack)}
        />
        {skills
          .filter((skill) => skill.id !== defaultAttack.id)
          .map((skill) => (
            <SkillButton
              key={skill.id}
              skill={skill}
              selected={selectedSkill?.id === skill.id}
              onClick={() => setSelectedSkill(selectedSkill?.id === skill.id ? null : skill)}
            />
          ))}
      </div>

      <div className="wr-action-side">
        <button className="wr-btn wr-btn-ghost" type="button">{WIcon('bag', { size: 12 })} Items</button>
        <button className="wr-btn wr-btn-ghost" type="button" onClick={onEndTurn}>{WIcon('arrowR', { size: 12 })} Pass</button>
        <button className="wr-btn wr-btn-violet" type="button" onClick={onEndTurn}>
          End Turn {WIcon('chevR', { size: 12 })}
        </button>
      </div>
    </div>
  );
}

export function CombatArena({ onCombatEnd }: CombatArenaProps) {
  const { runState, activeCharacter, dispatch } = useGameStore();
  const [selectedSkill, setSelectedSkill] = useState<RunSkill | null>(null);
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [log, setLog] = useState<CombatLogEntry[]>([]);

  const party = useMemo(() => {
    if (runState?.party?.length) return runState.party;
    const actor = actorFromActiveCharacter(activeCharacter);
    return actor ? [actor] : [];
  }, [activeCharacter, runState?.party]);

  const foes = useMemo(() => runState?.foes ?? [], [runState?.foes]);
  const active = runState ? getActiveActor(runState, party, foes) : null;
  const isYourTurn = Boolean(active?.you);
  const targetable = useMemo(() => validTargets(selectedSkill, active, party, foes), [active, foes, party, selectedSkill]);
  const currentRound = Math.max(1, (runState?.floorsCleared ?? 0) + 1);

  function dispatchCombat(event: GameEvent) {
    const result = dispatch(event);
    return result.failed.length === 0;
  }

  function handleEndTurn() {
    if (!runState || !activeCharacter) return;
    setSelectedSkill(null);
    dispatchCombat({
      ...eventMeta(runState, activeCharacter.id, activeCharacter.id),
      type: 'COMBAT_ADVANCE_TURN',
      direction: 1,
    });
  }

  function handleFlee() {
    if (!runState || !activeCharacter) return;
    dispatchCombat({
      ...eventMeta(runState, activeCharacter.id, activeCharacter.id),
      type: 'COMBAT_END_ENCOUNTER',
      lootSummary: 'The party fled the Warden chamber.',
    });
    onCombatEnd(false);
  }

  function commitAction(targetId: string, targetSide: 'ally' | 'foe') {
    if (!runState || !active || !selectedSkill) return;
    const actorId = activeCharacter?.id ?? active.id;
    const isHeal = selectedSkill.kind === 'heal';
    const amount = getDamagePreview(selectedSkill);
    const crit = !isHeal && Math.random() < 0.2;
    const value = isHeal ? `+${amount} HP` : `−${amount}${crit ? '!' : ''}`;

    if (!isHeal) {
      dispatchCombat({
        ...eventMeta(runState, actorId, targetId),
        type: 'COMBAT_ATTACK',
        actorCombatantId: active.id,
        targetCombatantId: targetId,
        attackType: getAttackType(selectedSkill),
        damageAmount: amount,
        damageType: 'slashing',
      });
    }

    const floaterId = Date.now();
    setFloaters((current) => [...current, { id: floaterId, target: targetId, side: targetSide, value, type: isHeal ? 'heal' : 'damage', crit }]);
    window.setTimeout(() => setFloaters((current) => current.filter((floater) => floater.id !== floaterId)), 1500);
    setLog((current) => [{ id: floaterId, text: `${active.name} uses ${selectedSkill.name}: ${value}.`, crit }, ...current].slice(0, 6));
    setSelectedSkill(null);
  }

  if (!runState) {
    return (
      <div className="wr-combat-stage wr-screen-in">
        <div className="wr-action-bar">
          <div className="wr-action-who">
            <div className="wr-action-who-name">NO RUN ACTIVE</div>
            <div className="wr-action-who-sub">Start a Warden&apos;s Run to enter combat.</div>
          </div>
          <div />
          <div />
        </div>
      </div>
    );
  }

  return (
    <div className="wr-combat-stage wr-screen-in">
      <div className="wr-init-strip">
        <span className="wr-round-pill">
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--wr-blood-bright)' }} />
          Round <span className="num">{currentRound}</span>
        </span>
        <button className="wr-btn wr-btn-ghost" type="button" onClick={handleFlee}>
          Flee
        </button>
        <div className="wr-init-label">
          {WIcon('clock', { size: 11 })} Initiative
        </div>
        <div className="wr-init-track">
          {(runState.initiativeOrder ?? []).map((entry) => (
            <div key={entry.id} className={`wr-init-card ${entry.side === 'foe' ? 'foe' : 'ally'}${entry.now ? ' now' : ''}${entry.done ? ' done' : ''}`}>
              <div className="wr-init-card-mini">
                <PortraitArt kind={entry.portrait ?? entry.side} color={entry.color} id={`init-${entry.id}`} />
              </div>
              <div className="wr-init-card-init">{entry.init}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="wr-arena">
        <div className="wr-arena-bg" />

        <div className="wr-combat-row party">
          {[...party].sort((a, b) => b.pos - a.pos).map((actor) => (
            <CombatantCard
              key={actor.id}
              actor={actor}
              side="ally"
              isActive={actor.id === active?.id}
              isTargetable={targetable.some((target) => target.id === actor.id)}
              isHoverTarget={hoverTarget === actor.id}
              onHover={setHoverTarget}
              onClick={(id) => {
                if (selectedSkill && targetable.some((target) => target.id === id)) commitAction(id, 'ally');
              }}
              floater={floaters.find((floater) => floater.target === actor.id && floater.side === 'ally')}
            />
          ))}
        </div>

        <div className="wr-combat-vs">
          <div className="wr-combat-vs-line" />
          <div className="wr-combat-vs-mark" />
          <div>VS</div>
          <div className="wr-combat-vs-mark" />
          <div className="wr-combat-vs-line" />
        </div>

        <div className="wr-combat-row foes">
          {[...foes].sort((a, b) => a.pos - b.pos).map((actor) => (
            <CombatantCard
              key={actor.id}
              actor={actor}
              side="foe"
              isActive={actor.id === active?.id}
              isTargetable={targetable.some((target) => target.id === actor.id)}
              isHoverTarget={hoverTarget === actor.id}
              onHover={setHoverTarget}
              onClick={(id) => {
                if (selectedSkill && targetable.some((target) => target.id === id)) commitAction(id, 'foe');
              }}
              floater={floaters.find((floater) => floater.target === actor.id && floater.side === 'foe')}
            />
          ))}
        </div>

        <div className="wr-combat-log">
          {log.slice(0, 5).map((entry) => (
            <div key={entry.id} className="wr-combat-log-entry">
              {entry.crit && <span className="crit">CRIT — </span>}
              {entry.text}
            </div>
          ))}
        </div>
      </div>

      <ActionBar active={active} isYourTurn={isYourTurn} selectedSkill={selectedSkill} setSelectedSkill={setSelectedSkill} onEndTurn={handleEndTurn} />
    </div>
  );
}

export default CombatArena;
