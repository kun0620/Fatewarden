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
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GameEvent } from '../../engine/events/types';
import { markCharacterDead } from '../../engine/run/runEngine';
import type { RunCombatant, RunSkill, RunState } from '../../engine/run/runTypes';
import { useGameStore } from '../../store/useGameStore';
import type { CombatAttackType } from '../../types';

interface CombatArenaProps {
  onCombatEnd: (won: boolean) => void;
  onCharacterDeath?: (combatant: RunCombatant) => void;
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

const TURN_TIMEOUT = 30;

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
    dmg: '1d8',
    targets: [1, 2],
    melee: true,
  };
}

type RunCombatantExt = RunCombatant & { attackBonus?: number; ac?: number; gold?: number };

function rollDice(diceStr: string): number {
  const match = diceStr.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return parseInt(diceStr) || 4;
  const count = parseInt(match[1]);
  const sides = parseInt(match[2]);
  const mod = parseInt(match[3] ?? '0');
  let total = mod;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total;
}

function resolveAttack(
  attacker: RunCombatantExt,
  target: RunCombatantExt,
  skill: RunSkill,
): { hit: boolean; damage: number; crit: boolean; roll: number } {
  const roll = Math.floor(Math.random() * 20) + 1;
  const crit = roll === 20;
  const attackBonus = attacker.attackBonus ?? 3;
  const hit = crit || roll + attackBonus >= (target.ac ?? 12);

  if (!hit) return { hit: false, damage: 0, crit: false, roll };

  const dmgStr = skill.dmg ?? '1d6';
  let damage = rollDice(dmgStr);
  if (crit) damage += rollDice(dmgStr);

  return { hit, damage, crit, roll };
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
  isCoOp,
  selectedSkill,
  setSelectedSkill,
  turnTimeLeft,
  onEndTurn,
}: {
  active: RunCombatant | null;
  isYourTurn: boolean;
  isCoOp: boolean;
  selectedSkill: RunSkill | null;
  setSelectedSkill: (skill: RunSkill | null) => void;
  turnTimeLeft: number;
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
    <>
      {isYourTurn && isCoOp && (
        <div className="wr-turn-timer">
          <div
            className={`wr-turn-timer-fill${turnTimeLeft < 10 ? ' wr-turn-timer-fill--urgent' : ''}`}
            style={{ width: `${(turnTimeLeft / TURN_TIMEOUT) * 100}%` }}
          />
          <span className="fw-caption fw-mono">{turnTimeLeft}s</span>
        </div>
      )}
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
        <button className="wr-btn wr-btn-ghost" type="button" disabled title="Coming soon">{WIcon('bag', { size: 12 })} Items</button>
        <button className="wr-btn wr-btn-ghost" type="button" onClick={onEndTurn}>{WIcon('arrowR', { size: 12 })} Pass</button>
        <button className="wr-btn wr-btn-violet" type="button" onClick={onEndTurn}>
          End Turn {WIcon('chevR', { size: 12 })}
        </button>
      </div>
    </div>
    </>
  );
}

export function CombatArena({ onCharacterDeath, onCombatEnd }: CombatArenaProps) {
  const { runState, activeCharacter, currentUserId, dispatch, sessionMembers, advanceRunTurn, addRunGold } = useGameStore();
  const [selectedSkill, setSelectedSkill] = useState<RunSkill | null>(null);
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [log, setLog] = useState<CombatLogEntry[]>([]);
  const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_TIMEOUT);
  const [combatRound, setCombatRound] = useState(1);
  const prevActiveIdRef = useRef<string | null>(null);

  const party = useMemo(() => {
    if (runState?.party?.length) return runState.party;
    const actor = actorFromActiveCharacter(activeCharacter);
    return actor ? [actor] : [];
  }, [activeCharacter, runState?.party]);

  const foes = useMemo(() => runState?.foes ?? [], [runState?.foes]);
  const active = runState ? getActiveActor(runState, party, foes) : null;
  const activeActorUserId = useMemo(() => {
    if (!active) return null;
    return sessionMembers.find((member) => member.characterId === active.id)?.playerId ?? (active.you ? currentUserId : null);
  }, [active, currentUserId, sessionMembers]);
  const isCoOp = (sessionMembers?.length ?? 1) > 1;
  const isPartyMember = Boolean(active && party.some((p) => p.id === active.id));
  const isYourTurn = Boolean(
    active &&
    (activeActorUserId
      ? activeActorUserId === currentUserId
      : active.you || (!isCoOp && isPartyMember)),
  );
  const targetable = useMemo(() => validTargets(selectedSkill, active, party, foes), [active, foes, party, selectedSkill]);
  const currentRound = combatRound;

  function dispatchCombat(event: GameEvent) {
    const result = dispatch(event);
    return result.failed.length === 0;
  }

  function addCombatLog(text: string, crit?: boolean) {
    setLog((current) => [{ id: Date.now(), text, crit }, ...current].slice(0, 20));
  }

  function checkCombatEnd() {
    const currentRunState = useGameStore.getState().runState;
    if (!currentRunState) return;
    const allFoesDead = currentRunState.foes?.every((f) => f.hp <= 0 || f.down);
    if (allFoesDead) {
      const goldEarned = currentRunState.foes?.reduce((sum, f) => sum + ((f as RunCombatantExt).gold ?? 15), 0) ?? 0;
      addRunGold(goldEarned);
      onCombatEnd(true);
      return;
    }
    const allPartyDead = currentRunState.party?.every((p) => p.hp <= 0 || p.down);
    if (allPartyDead) {
      onCombatEnd(false);
    }
  }

  function handleEndTurn() {
    if (!runState) return;
    setSelectedSkill(null);
    advanceRunTurn();
  }

  useEffect(() => {
    if (!isYourTurn || !isCoOp) return;

    setTurnTimeLeft(TURN_TIMEOUT);
    const interval = window.setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          advanceRunTurn();
          window.clearInterval(interval);
          return TURN_TIMEOUT;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [active?.id, activeCharacter?.id, isCoOp, isYourTurn, runState]);

  useEffect(() => {
    const activeEntry = runState?.initiativeOrder?.find((e) => e.now);
    if (!activeEntry) return;
    const order = runState?.initiativeOrder ?? [];
    const isFirst = order.length > 0 && order[0]?.id === activeEntry.id;
    if (prevActiveIdRef.current && prevActiveIdRef.current !== activeEntry.id && isFirst) {
      setCombatRound((r) => r + 1);
    }
    prevActiveIdRef.current = activeEntry.id;
  }, [runState?.initiativeOrder]);

  useEffect(() => {
    const activeEntry = runState?.initiativeOrder?.find((e) => e.now);
    if (!activeEntry || activeEntry.side === 'ally') return;

    if (activeEntry.down) {
      advanceRunTurn();
      return;
    }

    const timer = window.setTimeout(() => {
      const current = useGameStore.getState().runState;
      if (!current) return;

      const activeFoe = current.foes?.find((f) => f.id === activeEntry.id);
      if (!activeFoe || activeFoe.hp <= 0 || activeFoe.down) {
        advanceRunTurn();
        return;
      }

      const targets = (current.party ?? []).filter((p) => !p.down && p.hp > 0);
      if (!targets.length) {
        onCombatEnd(false);
        return;
      }

      const target = targets.reduce((min, p) => (p.hp < min.hp ? p : min));
      const skill = activeFoe.skills?.[0] ?? {
        id: 'attack',
        name: 'Attack',
        kind: 'attack' as const,
        cost: 0,
        dmg: '1d6',
        targets: [1, 2, 3, 4] as Array<1 | 2 | 3 | 4>,
        melee: true,
      };

      const result = resolveAttack(activeFoe as RunCombatantExt, target as RunCombatantExt, skill);
      console.log('[ENEMY AI]', activeFoe.name, '→', target.name, result);

      if (result.hit) {
        const fallen = applyRunCombatantHp(target.id, 'ally', result.damage, false);
        if (fallen) onCharacterDeath?.(fallen);
        const floaterId = Date.now();
        setFloaters((cur) => [...cur, { id: floaterId, target: target.id, side: 'ally', value: `−${result.damage}${result.crit ? '!' : ''}`, type: 'damage', crit: result.crit }]);
        window.setTimeout(() => setFloaters((cur) => cur.filter((f) => f.id !== floaterId)), 1500);
        addCombatLog(
          `${activeFoe.name} attacks ${target.name} for ${result.damage}${result.crit ? ' — CRITICAL!' : ''}!`,
          result.crit,
        );
      } else {
        addCombatLog(`${activeFoe.name} misses ${target.name}! (rolled ${result.roll})`);
      }

      checkCombatEnd();
      advanceRunTurn();
    }, 1000);

    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runState?.initiativeOrder]);

  function handleFlee() {
    if (!runState || !activeCharacter) return;
    dispatchCombat({
      ...eventMeta(runState, activeCharacter.id, activeCharacter.id),
      type: 'COMBAT_END_ENCOUNTER',
      lootSummary: 'The party fled the Warden chamber.',
    });
    onCombatEnd(false);
  }

  function applyRunCombatantHp(targetId: string, targetSide: 'ally' | 'foe', amount: number, isHeal: boolean) {
    let fallen: RunCombatant | null = null;

    useGameStore.setState((state) => {
      const current = state.runState;
      if (!current) return {};

      const key = targetSide === 'ally' ? 'party' : 'foes';
      const actors = current[key] ?? [];
      let changed = false;
      const nextActors = actors.map((actor) => {
        if (actor.id !== targetId) return actor;
        const previousHp = actor.hp;
        const nextHp = isHeal
          ? Math.min(actor.hpMax, actor.hp + amount)
          : Math.max(0, actor.hp - amount);
        const nextActor: RunCombatant = {
          ...actor,
          hp: nextHp,
          down: nextHp <= 0,
        };
        changed = true;

        if (targetSide === 'ally' && previousHp > 0 && nextHp <= 0) {
          fallen = nextActor;
        }

        return nextActor;
      });

      if (!changed) return {};

      const nextRunState = {
        ...current,
        [key]: nextActors,
      };

      return {
        runState: fallen ? markCharacterDead(nextRunState, fallen.id) : nextRunState,
      };
    });

    return fallen;
  }

  function commitAction(targetId: string, targetSide: 'ally' | 'foe') {
    if (!runState || !active || !selectedSkill) return;
    const allActors = [...party, ...foes];
    const target = allActors.find((a) => a.id === targetId);
    if (!target) return;

    setSelectedSkill(null);

    const skill = selectedSkill;

    if (skill.kind === 'heal') {
      const healAmt = rollDice(skill.dmg ?? '1d6+2');
      applyRunCombatantHp(targetId, targetSide, healAmt, true);
      const value = `+${healAmt} HP`;
      const floaterId = Date.now();
      setFloaters((cur) => [...cur, { id: floaterId, target: targetId, side: targetSide, value, type: 'heal' }]);
      window.setTimeout(() => setFloaters((cur) => cur.filter((f) => f.id !== floaterId)), 1500);
      addCombatLog(`${active.name} heals ${target.name} for ${healAmt}`);
      advanceRunTurn();
      return;
    }

    if (skill.kind === 'buff' || skill.kind === 'util') {
      addCombatLog(`${active.name} uses ${skill.name}`);
      advanceRunTurn();
      return;
    }

    // attack / spell
    const result = resolveAttack(active as RunCombatantExt, target as RunCombatantExt, skill);
    if (!result.hit) {
      addCombatLog(`${active.name} misses ${target.name}! (rolled ${result.roll})`);
      advanceRunTurn();
      return;
    }

    const fallen = applyRunCombatantHp(targetId, targetSide, result.damage, false);
    if (fallen) onCharacterDeath?.(fallen);

    const value = `−${result.damage}${result.crit ? '!' : ''}`;
    const floaterId = Date.now();
    setFloaters((cur) => [...cur, { id: floaterId, target: targetId, side: targetSide, value, type: 'damage', crit: result.crit }]);
    window.setTimeout(() => setFloaters((cur) => cur.filter((f) => f.id !== floaterId)), 1500);
    addCombatLog(
      `${active.name} hits ${target.name} for ${result.damage}${result.crit ? ' — CRITICAL!' : ''}`,
      result.crit,
    );

    checkCombatEnd();
    advanceRunTurn();
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
          {log.slice(0, 10).map((entry) => (
            <div key={entry.id} className={`wr-combat-log-entry${entry.crit ? ' crit' : ''}`}>
              {entry.crit && <span className="crit">CRIT — </span>}
              {entry.text}
            </div>
          ))}
        </div>
      </div>

      <ActionBar
        active={active}
        isYourTurn={isYourTurn}
        isCoOp={isCoOp}
        selectedSkill={selectedSkill}
        setSelectedSkill={setSelectedSkill}
        turnTimeLeft={turnTimeLeft}
        onEndTurn={handleEndTurn}
      />
    </div>
  );
}

export default CombatArena;
