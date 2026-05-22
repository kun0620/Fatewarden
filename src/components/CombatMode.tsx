import { useMemo, useState } from 'react';
import type { GameEvent } from '../engine/events/types';
import type { EncounterState } from '../types';
import { Icon } from './ui/Icons';

type CombatModeProps = {
  encounter?: EncounterState | null;
  activeCharacterId?: string;
  onDispatchCombatEvent?: (event: GameEvent) => Promise<void> | void;
  onExit: () => void;
};

type CombatToken = {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  hpMax: number;
  ac: number;
  init: number;
  color: string;
  you?: boolean;
  foe?: boolean;
  boss?: boolean;
  down?: boolean;
  conditions?: Array<{ k: string; bad?: boolean; buff?: boolean }>;
};

type ActionState = {
  action: boolean;
  bonus: boolean;
  reaction: boolean;
  moveUsed: number;
};

type AttackFlowState = {
  kind: 'attack';
  weapon: { n: string; dmg: string; toHit: number };
};

type SpellFlowState = {
  kind: 'spell';
  spell: { n: string; lvl: string; cost: string; toHit?: number; curse?: boolean };
};

type FlowState = AttackFlowState | SpellFlowState | null;

const MAP_W = 22;
const MAP_H = 14;
const CELL = 34;

const TOOLS = [
  { id: 'cursor', icon: 'compass', label: 'Select' },
  { id: 'measure', icon: 'zap', label: 'Measure' },
  { id: 'cone', icon: 'flame', label: 'Cone 15' },
  { id: 'sphere', icon: 'hex', label: 'Sphere 20' },
  { id: 'line', icon: 'arrowR', label: 'Line 30' },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function tokenFromEncounter(encounter: EncounterState, activeCharacterId?: string): CombatToken[] {
  return encounter.combatants.map((combatant, index) => ({
    id: combatant.id,
    name: combatant.name,
    x: 4 + (index % 6) * 2,
    y: combatant.type === 'enemy' ? 4 + (index % 4) : 8 + (index % 3),
    hp: combatant.hitPoints,
    hpMax: combatant.maxHitPoints,
    ac: combatant.armorClass,
    init: combatant.initiative,
    color: combatant.type === 'enemy' ? '#b45309' : '#d6a84f',
    you: Boolean(activeCharacterId && (combatant.characterId === activeCharacterId || combatant.id === `pc-${activeCharacterId}`)),
    foe: combatant.type === 'enemy',
    boss: combatant.isBoss,
    down: combatant.hitPoints <= 0 || combatant.status === 'dead' || combatant.status === 'dying',
    conditions: combatant.conditions.map((condition) => ({ k: condition, bad: true })),
  }));
}

export function CombatMode({ activeCharacterId, encounter, onDispatchCombatEvent, onExit }: CombatModeProps) {
  const [localTokens, setTokens] = useState<CombatToken[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [tool, setTool] = useState('cursor');
  const [round, setRound] = useState(1);
  const [turnIdx, setTurnIdx] = useState(0);
  const [actionState, setActionState] = useState<ActionState>({ action: false, bonus: false, reaction: false, moveUsed: 0 });
  const [flow, setFlow] = useState<FlowState>(null);

  const encounterTokens = useMemo(
    () => (encounter ? tokenFromEncounter(encounter, activeCharacterId) : null),
    [activeCharacterId, encounter],
  );
  const tokens = encounterTokens ?? localTokens;

  const order = useMemo(() => [...tokens].sort((a, b) => b.init - a.init), [tokens]);
  const currentTurnIdx = encounter ? encounter.activeIndex : turnIdx;
  const current = order[currentTurnIdx] ?? order[0];
  const selected = tokens.find((token) => token.id === selectedId) ?? order[0];
  const isYourTurn = Boolean(selected?.you && current?.id === selected.id);
  const moveLeft = Math.max(0, 30 - actionState.moveUsed);
  const quickAmount = selected ? Math.max(1, Math.ceil(selected.hpMax * 0.1)) : 1;

  const moveCells = useMemo(() => {
    if (!selected?.you || !isYourTurn || moveLeft <= 0) return new Set<string>();
    const range = Math.floor(moveLeft / 5);
    const cells = new Set<string>();
    for (let dy = -range; dy <= range; dy += 1) {
      for (let dx = -range; dx <= range; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) <= range) {
          const x = selected.x + dx;
          const y = selected.y + dy;
          if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) cells.add(`${x}:${y}`);
        }
      }
    }
    return cells;
  }, [isYourTurn, moveLeft, selected]);

  const onCellClick = (x: number, y: number) => {
    const token = tokens.find((item) => item.x === x && item.y === y);
    if (token) {
      setSelectedId(token.id);
      return;
    }
    if (!selected) return;
    if (!selected?.you || !isYourTurn || !moveCells.has(`${x}:${y}`)) return;
    const dist = Math.max(Math.abs(x - selected.x), Math.abs(y - selected.y)) * 5;
    if (encounter && onDispatchCombatEvent) {
      void onDispatchCombatEvent({
        id: crypto.randomUUID(),
        type: 'COMBAT_MOVE',
        sessionId: encounter.id,
        actorId: selected.id,
        targetId: selected.id,
        createdAt: new Date().toISOString(),
        source: 'user',
        combatantId: selected.id,
        feet: dist,
      });
    } else {
      setTokens((items) => items.map((item) => item.id === selected.id ? { ...item, x, y } : item));
    }
    setActionState((state) => ({ ...state, moveUsed: clamp(state.moveUsed + dist, 0, 30) }));
  };

  const endTurn = () => {
    if (!selected || !order.length) return;
    if (encounter && onDispatchCombatEvent) {
      void onDispatchCombatEvent({
        id: crypto.randomUUID(),
        type: 'COMBAT_ADVANCE_TURN',
        sessionId: encounter.id,
        actorId: current?.id ?? selected.id,
        targetId: current?.id ?? selected.id,
        createdAt: new Date().toISOString(),
        source: 'user',
        direction: 1,
      });
      return;
    }
    setTurnIdx((idx) => {
      const next = (idx + 1) % order.length;
      if (next === 0) setRound((value) => value + 1);
      return next;
    });
    setActionState({ action: false, bonus: false, reaction: false, moveUsed: 0 });
  };

  const applyDamage = (amount: number) => {
    if (!selected) return;
    if (encounter && onDispatchCombatEvent) {
      void onDispatchCombatEvent({
        id: crypto.randomUUID(),
        type: 'apply_damage',
        sessionId: encounter.id,
        actorId: current?.id ?? selected.id,
        targetId: selected.id,
        createdAt: new Date().toISOString(),
        source: 'user',
        amount,
      });
      return;
    }
    setTokens((items) => items.map((item) => item.id === selected.id ? { ...item, hp: clamp(item.hp - amount, 0, item.hpMax), down: item.hp - amount <= 0 } : item));
  };

  const heal = (amount: number) => {
    if (!selected) return;
    if (encounter && onDispatchCombatEvent) {
      void onDispatchCombatEvent({
        id: crypto.randomUUID(),
        type: 'recover_hp',
        sessionId: encounter.id,
        actorId: current?.id ?? selected.id,
        targetId: selected.id,
        createdAt: new Date().toISOString(),
        source: 'user',
        amount,
        recoveryKind: 'healing',
      });
      return;
    }
    setTokens((items) => items.map((item) => item.id === selected.id ? { ...item, hp: clamp(item.hp + amount, 0, item.hpMax), down: false } : item));
  };

  return (
    <div className="fw-combat-mode">
      <div className="fw-init-ticker">
        <div className="fw-init-round">
          <span className="fw-pill blood fw-pulse-dot"><span /> Round {encounter?.round ?? round}</span>
          <span className="fw-eyebrow" style={{ color: 'var(--gold)' }}>Combat - Tactical</span>
        </div>
        <div className="fw-init-chain">
          {order.map((token, index) => (
            <button
              key={token.id}
              className={`fw-init-pill ${index === currentTurnIdx ? 'current' : ''} ${token.foe ? 'foe' : 'ally'} ${token.down ? 'down' : ''}`}
              type="button"
              onClick={() => setSelectedId(token.id)}
            >
              <span className="fw-mono">{token.init}</span>
              <span className="fw-avatar sm" style={{ background: `linear-gradient(135deg, ${token.color}44, #15101f)` }}>{initials(token.name)}</span>
              <span>{token.name}</span>
              <span className="fw-mono">{token.hp}/{token.hpMax}</span>
              {index === currentTurnIdx ? <span className="fw-now">NOW</span> : null}
            </button>
          ))}
        </div>
        <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={onExit} type="button">
          {Icon('x', { size: 11 })} End combat
        </button>
      </div>

      <div className="fw-combat-main">
        <section className="fw-combat-map-wrap">
          <div className="fw-map-tools">
            {TOOLS.map((item) => (
              <button key={item.id} className={`fw-map-tool ${tool === item.id ? 'active' : ''}`} type="button" onClick={() => setTool(item.id)}>
                {Icon(item.icon, { size: 13 })}<span>{item.label}</span>
              </button>
            ))}
            <span style={{ flex: 1 }} />
            <span className="fw-mono" style={{ color: 'var(--text-3)', fontSize: 10.5 }}>
              {tool === 'cursor' ? `Selected - ${selected.name}` : `${tool.toUpperCase()} ready`}
            </span>
          </div>

          <svg className="fw-battlemap" viewBox={`0 0 ${MAP_W * CELL} ${MAP_H * CELL}`} role="img" aria-label="Tactical battle map">
            <defs>
              <radialGradient id="fw-censer-light" cx="50%" cy="44%" r="45%">
                <stop offset="0%" stopColor="rgba(214,168,79,0.36)" />
                <stop offset="60%" stopColor="rgba(124,58,237,0.12)" />
                <stop offset="100%" stopColor="rgba(6,5,10,0)" />
              </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill="#08070d" />
            <rect width="100%" height="100%" fill="url(#fw-censer-light)" />
            <path d="M72 370 C160 300 222 312 310 260 S500 180 672 210" fill="none" stroke="rgba(214,168,79,0.18)" strokeWidth="16" strokeLinecap="round" />
            <circle cx="390" cy="225" r="58" fill="rgba(214,168,79,0.08)" stroke="rgba(214,168,79,0.36)" strokeWidth="2" strokeDasharray="6 8" />
            <rect x="486" y="118" width="172" height="128" rx="10" fill="rgba(153,27,27,0.10)" stroke="rgba(153,27,27,0.26)" />

            {Array.from({ length: MAP_W * MAP_H }, (_, index) => {
              const x = index % MAP_W;
              const y = Math.floor(index / MAP_W);
              const hasMove = moveCells.has(`${x}:${y}`);
              return (
                <rect
                  key={`${x}:${y}`}
                  className={`fw-map-cell ${hasMove ? 'move' : ''}`}
                  x={x * CELL}
                  y={y * CELL}
                  width={CELL}
                  height={CELL}
                  onClick={() => onCellClick(x, y)}
                />
              );
            })}

            {tokens.map((token) => {
              const cx = token.x * CELL + CELL / 2;
              const cy = token.y * CELL + CELL / 2;
              const active = token.id === selected.id;
              const acting = token.id === current?.id;
              return (
                <g key={token.id} className={`fw-map-token ${token.foe ? 'foe' : 'ally'} ${active ? 'selected' : ''} ${token.down ? 'down' : ''}`} onClick={() => setSelectedId(token.id)}>
                  {acting ? <circle cx={cx} cy={cy} r="22" fill="none" stroke="var(--gold-bright)" strokeWidth="2" strokeDasharray="4 4" /> : null}
                  <circle cx={cx} cy={cy} r="15" fill={token.color} opacity={token.down ? 0.38 : 0.88} />
                  <circle cx={cx} cy={cy} r="15" fill="none" stroke={active ? 'var(--gold-bright)' : token.foe ? 'var(--blood-bright)' : 'var(--border)'} strokeWidth={active ? 3 : 1.5} />
                  <text x={cx} y={cy + 4} textAnchor="middle" fill="#fff7ed" fontSize="9" fontFamily="var(--f-display)" pointerEvents="none">{initials(token.name)}</text>
                </g>
              );
            })}
          </svg>

          <TurnHud
            actionState={actionState}
            current={current}
            isYourTurn={isYourTurn}
            moveLeft={moveLeft}
            onAction={() => setActionState((state) => ({ ...state, action: true }))}
            onDash={() => setActionState((state) => ({ ...state, action: true, moveUsed: Math.max(0, state.moveUsed - 30) }))}
            onEndTurn={endTurn}
          />
        </section>

        <aside className="fw-token-inspector">
          {selected ? (
            <TokenInspector token={selected} onDamage={() => applyDamage(quickAmount)} onHeal={() => heal(quickAmount)} />
          ) : (
            <div className="fw-empty">No combatant selected.</div>
          )}
        </aside>
      </div>

      {flow?.kind === 'attack' ? (
        <AttackFlow
          flow={flow}
          tokens={tokens}
          onClose={() => setFlow(null)}
          onApply={(targetId, amount) => {
            setTokens((items) => items.map((item) => item.id === targetId ? { ...item, hp: clamp(item.hp - amount, 0, item.hpMax), down: item.hp - amount <= 0 } : item));
            setActionState((state) => ({ ...state, action: true }));
            setFlow(null);
          }}
        />
      ) : null}

      {flow?.kind === 'spell' ? (
        <SpellCastFlow
          flow={flow}
          tokens={tokens}
          onClose={() => setFlow(null)}
          onApply={(targetId, amount, isCurse) => {
            setTokens((items) => items.map((item) => {
              if (item.id !== targetId) return item;
              if (isCurse) return { ...item, conditions: [...(item.conditions ?? []), { k: 'Cursed (Hex)', bad: true }] };
              return { ...item, hp: clamp(item.hp - amount, 0, item.hpMax), down: item.hp - amount <= 0 };
            }));
            setActionState((state) => isCurse ? { ...state, bonus: true } : { ...state, action: true });
            setFlow(null);
          }}
        />
      ) : null}
    </div>
  );
}

function TurnHud({
  actionState,
  current,
  isYourTurn,
  moveLeft,
  onAction,
  onDash,
  onEndTurn,
}: {
  actionState: ActionState;
  current?: CombatToken;
  isYourTurn: boolean;
  moveLeft: number;
  onAction: () => void;
  onDash: () => void;
  onEndTurn: () => void;
}) {
  if (!isYourTurn) {
    return (
      <div className="fw-turn-hud not-yours">
        <span className={current?.foe ? 'fw-turn-dot foe' : 'fw-turn-dot'} />
        <div>
          <div className="fw-eyebrow">Now Acting</div>
          <div className="fw-display" style={{ color: 'var(--text)', fontSize: 16 }}>{current?.name ?? 'No active combatant'}</div>
        </div>
        <span style={{ flex: 1 }} />
        <span className="fw-serif" style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>
          {current ? (current.foe ? 'Enemy turn.' : 'Wait for your turn.') : 'Create or join an encounter to start combat.'}
        </span>
      </div>
    );
  }

  return (
    <div className="fw-turn-hud yours">
      <div className="fw-turn-title">
        <div className="fw-eyebrow" style={{ color: 'var(--gold)' }}>Your Turn</div>
        <div className="fw-display">{current?.name ?? 'Your character'}</div>
      </div>
      <div className="fw-action-budget">
        <BudgetSlot label="Action" used={actionState.action} icon="sword" />
        <BudgetSlot label="Bonus" used={actionState.bonus} icon="zap" gold />
        <BudgetSlot label="Reaction" used={actionState.reaction} icon="shield" />
        <div className="fw-budget-move">
          <div className="fw-eyebrow">Move</div>
          <div><span className="fw-mono">{moveLeft}</span><span> / 30 ft</span></div>
          <i style={{ width: `${(moveLeft / 30) * 100}%` }} />
        </div>
      </div>
      <div className="fw-quick-actions">
        <button className="fw-btn fw-btn-gold" disabled title="Character attack actions are not wired to runtime action data yet." type="button">{Icon('flame', { size: 12 })} Attack <span className="fw-mini-cost">1A</span></button>
        <button className="fw-btn fw-btn-arcane" disabled title="Character spell actions are not wired to runtime spell data yet." type="button">{Icon('flame', { size: 12 })} Blast <span className="fw-mini-cost">1A</span></button>
        <button className="fw-btn fw-btn-ghost" disabled title="Character bonus actions are not wired to runtime action data yet." type="button">{Icon('skull', { size: 12 })} Hex <span className="fw-mini-cost">1BA</span></button>
        <button className="fw-btn fw-btn-ghost" disabled={actionState.action} type="button" onClick={onDash}>{Icon('arrowR', { size: 12 })} Dash</button>
      </div>
      <button className="fw-btn fw-btn-blood fw-btn-lg" type="button" onClick={onEndTurn}>
        End Turn {Icon('chevR', { size: 12 })}
      </button>
    </div>
  );
}

function BudgetSlot({ label, used, icon, gold }: { label: string; used: boolean; icon: string; gold?: boolean }) {
  return (
    <div className={`fw-budget-slot ${used ? 'spent' : ''}`}>
      <div className="fw-eyebrow">{label}</div>
      <span style={{ color: used ? 'var(--text-4)' : gold ? 'var(--gold-bright)' : 'var(--gold)' }}>
        {used ? Icon('x', { size: 14 }) : Icon(icon, { size: 14 })}
      </span>
    </div>
  );
}

function TokenInspector({ token, onDamage, onHeal }: { token: CombatToken; onDamage: () => void; onHeal: () => void }) {
  const hpPct = Math.round((token.hp / token.hpMax) * 100);
  return (
    <div className="fw-token-panel">
      <div className={`fw-token-head ${token.foe ? 'foe' : ''}`}>
        <span className="fw-avatar" style={{ background: `linear-gradient(135deg, ${token.color}44, #15101f)` }}>{initials(token.name)}</span>
        <div>
          <div className="fw-display" style={{ color: 'var(--text)', fontSize: 14 }}>{token.name}</div>
          <p>Initiative <b>{token.init}</b> - {token.foe ? 'Hostile' : token.you ? 'You' : 'Ally'}</p>
        </div>
        {token.boss ? <span className="fw-pill gold">BOSS</span> : null}
      </div>
      <div>
        <div className="fw-token-row"><span>HP</span><span className="fw-mono">{token.hp} / {token.hpMax}</span></div>
        <div className="fw-hp-track"><i style={{ width: `${hpPct}%` }} /></div>
      </div>
      <div className="fw-mini-stat-grid">
        <MiniStat label="AC" value={token.ac} />
        <MiniStat label="SPD" value="30 ft" />
        <MiniStat label="INIT" value={`+${Math.max(0, token.init - 12)}`} />
      </div>
      {token.conditions?.length ? (
        <div>
          <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Conditions</div>
          <div className="fw-cond-row">
            {token.conditions.map((condition) => (
              <span key={condition.k} className={`fw-cond ${condition.bad ? 'bleed' : condition.buff ? 'buff' : ''}`}>{condition.k}</span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="fw-token-actions">
        <button className="fw-btn fw-btn-blood fw-btn-sm" type="button" onClick={onDamage}>{Icon('minus', { size: 11 })} Damage</button>
        <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" onClick={onHeal}>{Icon('heart', { size: 11 })} Heal</button>
        <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled title="Condition picker is not wired to an existing event yet." type="button">{Icon('sparkles', { size: 11 })} Condition</button>
        <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled title="Statblock view is not wired yet." type="button">{Icon('eye', { size: 11 })} Statblock</button>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="fw-mini-stat">
      <div className="fw-eyebrow">{label}</div>
      <div className="fw-display">{value}</div>
    </div>
  );
}

function FlowModal({
  title,
  accent,
  onClose,
  children,
}: {
  title: string;
  accent: 'blood' | 'arcane';
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fw-flow-overlay" onClick={onClose} role="presentation">
      <div className={`fw-flow-modal accent-${accent}`} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="fw-flow-head">
          <div className="fw-display" style={{ fontSize: 16, color: 'var(--text)' }}>{title}</div>
          <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" onClick={onClose} type="button">{Icon('x', { size: 12 })}</button>
        </div>
        <div className="fw-flow-body">{children}</div>
      </div>
    </div>
  );
}

function d(sides: number) {
  return 1 + Math.floor(Math.random() * sides);
}

function AttackFlow({
  flow,
  tokens,
  onClose,
  onApply,
}: {
  flow: AttackFlowState;
  tokens: CombatToken[];
  onClose: () => void;
  onApply: (targetId: string, amount: number) => void;
}) {
  const foes = tokens.filter((token) => token.foe && !token.down);
  const [target, setTarget] = useState<CombatToken | null>(null);
  const [advantage, setAdvantage] = useState<'normal' | 'adv' | 'dis'>('normal');
  const [step, setStep] = useState<'target' | 'hit' | 'damage'>('target');
  const [hitRoll, setHitRoll] = useState<{ raw: number; total: number; crit: boolean; fumble: boolean } | null>(null);
  const [dmgRoll, setDmgRoll] = useState<{ dice: number[]; bonus: number; total: number } | null>(null);

  const hit = Boolean(hitRoll && target && hitRoll.total >= target.ac);

  const rollHit = () => {
    const r1 = d(20);
    const r2 = d(20);
    const used = advantage === 'adv' ? Math.max(r1, r2) : advantage === 'dis' ? Math.min(r1, r2) : r1;
    setHitRoll({ raw: used, total: used + flow.weapon.toHit, crit: used === 20, fumble: used === 1 });
    setStep('hit');
  };

  const rollDmg = () => {
    const d1 = d(8);
    const d2 = hitRoll?.crit ? d(8) : 0;
    const total = d1 + d2 + 4;
    setDmgRoll({ dice: [d1, d2].filter(Boolean), bonus: 4, total });
    setStep('damage');
  };

  return (
    <FlowModal title={`Attack - ${flow.weapon.n}`} accent="blood" onClose={onClose}>
      {step === 'target' ? (
        <>
          <p className="fw-serif" style={{ fontStyle: 'italic', color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.55 }}>
            Pick a target. The staff burns warm in your palm.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
            {foes.map((foe) => (
              <button
                key={foe.id}
                className="fw-btn fw-btn-ghost"
                type="button"
                onClick={() => setTarget(foe)}
                style={{ width: '100%', justifyContent: 'flex-start', padding: 10, borderColor: target?.id === foe.id ? 'var(--blood)' : 'var(--border-soft)', background: target?.id === foe.id ? 'rgba(153,27,27,0.1)' : 'transparent' }}
              >
                <span className="fw-avatar sm" style={{ background: `linear-gradient(135deg, ${foe.color}44, #15101f)` }}>{initials(foe.name)}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{foe.name}</div>
                  <div className="fw-mono" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>HP {foe.hp}/{foe.hpMax} - AC {foe.ac}</div>
                </span>
                {target?.id === foe.id ? <span className="fw-pill blood">Selected</span> : null}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="fw-eyebrow">Roll</span>
            {(['normal', 'adv', 'dis'] as const).map((mode) => (
              <button key={mode} className={`fw-btn fw-btn-sm ${advantage === mode ? '' : 'fw-btn-ghost'}`} type="button" onClick={() => setAdvantage(mode)}>
                {mode === 'normal' ? 'Normal' : mode === 'adv' ? 'Advantage' : 'Disadvantage'}
              </button>
            ))}
          </div>
          <div className="fw-flow-foot">
            <button className="fw-btn fw-btn-ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="fw-btn fw-btn-blood" type="button" disabled={!target} onClick={rollHit}>
              {Icon('dice', { size: 12 })} Roll d20 + {flow.weapon.toHit}
            </button>
          </div>
        </>
      ) : null}

      {step === 'hit' && hitRoll && target ? (
        <>
          <div style={{ textAlign: 'center', padding: 18 }}>
            <div className="fw-eyebrow" style={{ marginBottom: 8 }}>To Hit - vs AC {target.ac}</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 8 }}>
              <span className="fw-display" style={{ fontSize: 48, color: hitRoll.crit ? 'var(--gold-bright)' : hitRoll.fumble ? 'var(--blood-bright)' : 'var(--text)' }}>{hitRoll.raw}</span>
              <span style={{ fontSize: 18, color: 'var(--text-3)' }}>+ {flow.weapon.toHit} =</span>
              <span className="fw-display" style={{ fontSize: 48, color: hit ? 'var(--success)' : 'var(--blood-bright)' }}>{hitRoll.total}</span>
            </div>
            <div className="fw-serif" style={{ marginTop: 12, fontSize: 14, fontStyle: 'italic', color: hitRoll.crit ? 'var(--gold-bright)' : hit ? '#86EFAC' : '#FCA5A5' }}>
              {hitRoll.crit ? 'Critical hit. Brass cracks.' : hit ? `Hit. ${target.name} reels.` : hitRoll.fumble ? 'Natural one. The staff falters.' : 'Miss. The blow goes wide.'}
            </div>
          </div>
          <div className="fw-flow-foot">
            <button className="fw-btn fw-btn-ghost" type="button" onClick={() => setStep('target')}>Re-target</button>
            {hit ? (
              <button className="fw-btn fw-btn-blood" type="button" onClick={rollDmg}>{Icon('dice', { size: 12 })} Roll {hitRoll.crit ? '2d8 + 4' : '1d8 + 4'} damage</button>
            ) : (
              <button className="fw-btn fw-btn-blood" type="button" onClick={onClose}>Commit miss</button>
            )}
          </div>
        </>
      ) : null}

      {step === 'damage' && dmgRoll && target ? (
        <>
          <div style={{ textAlign: 'center', padding: 18 }}>
            <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Damage - fire</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 8 }}>
              {dmgRoll.dice.map((value, index) => <span key={index} className="fw-display" style={{ fontSize: 36, color: 'var(--gold-bright)' }}>{value}</span>)}
              <span style={{ fontSize: 18, color: 'var(--text-3)' }}>+ {dmgRoll.bonus} =</span>
              <span className="fw-display" style={{ fontSize: 48, color: 'var(--blood-bright)' }}>{dmgRoll.total}</span>
            </div>
            <div className="fw-serif" style={{ marginTop: 10, fontSize: 13, fontStyle: 'italic', color: 'var(--text-2)' }}>
              {target.name} drops to <b style={{ color: 'var(--text)', fontStyle: 'normal' }}>{Math.max(0, target.hp - dmgRoll.total)} / {target.hpMax}</b>
            </div>
          </div>
          <div className="fw-flow-foot">
            <button className="fw-btn fw-btn-ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="fw-btn fw-btn-gold fw-btn-lg" type="button" onClick={() => onApply(target.id, dmgRoll.total)}>
              {Icon('check', { size: 13 })} Apply {dmgRoll.total} fire damage
            </button>
          </div>
        </>
      ) : null}
    </FlowModal>
  );
}

function SpellCastFlow({
  flow,
  tokens,
  onClose,
  onApply,
}: {
  flow: SpellFlowState;
  tokens: CombatToken[];
  onClose: () => void;
  onApply: (targetId: string, amount: number, isCurse: boolean) => void;
}) {
  const isHex = Boolean(flow.spell.curse);
  const foes = tokens.filter((token) => token.foe && !token.down);
  const [target, setTarget] = useState<CombatToken | null>(null);
  const [step, setStep] = useState<'target' | 'result'>('target');
  const [result, setResult] = useState<{ curse?: boolean; rolls?: Array<{ r: number; total: number; hit: boolean; dmg: number; crit: boolean }>; totalDmg?: number } | null>(null);

  const rollAttack = () => {
    if (!target) return;
    const rolls = Array.from({ length: 2 }, () => {
      const r = d(20);
      const total = r + (flow.spell.toHit ?? 0);
      const isHit = total >= target.ac;
      const dmg = isHit ? d(10) + 4 + (r === 20 ? d(10) : 0) : 0;
      return { r, total, hit: isHit, dmg, crit: r === 20 };
    });
    setResult({ rolls, totalDmg: rolls.reduce((sum, beam) => sum + beam.dmg, 0) });
    setStep('result');
  };

  return (
    <FlowModal title={`Cast - ${flow.spell.n}`} accent="arcane" onClose={onClose}>
      {step === 'target' ? (
        <>
          <div style={{ display: 'flex', gap: 10, padding: 12, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, marginBottom: 14 }}>
            <span style={{ width: 36, height: 36, borderRadius: 50, background: 'rgba(124,58,237,0.18)', border: '1px solid var(--arcane)', display: 'grid', placeItems: 'center', color: 'var(--arcane-bright)' }}>
              {Icon('flame', { size: 16 })}
            </span>
            <div style={{ flex: 1 }}>
              <div className="fw-display" style={{ fontSize: 14, color: 'var(--text)' }}>{flow.spell.n}</div>
              <div className="fw-mono" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                Level {flow.spell.lvl} - {flow.spell.cost} - {isHex ? '1d6 necrotic on hit, 1h conc' : 'Spell atk +7 - 2 beams - 1d10+4 force each'}
              </div>
            </div>
          </div>
          <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Target</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {foes.map((foe) => (
              <button
                key={foe.id}
                className="fw-btn fw-btn-ghost"
                type="button"
                onClick={() => setTarget(foe)}
                style={{ width: '100%', justifyContent: 'flex-start', padding: 10, borderColor: target?.id === foe.id ? 'var(--arcane)' : 'var(--border-soft)', background: target?.id === foe.id ? 'rgba(124,58,237,0.1)' : 'transparent' }}
              >
                <span className="fw-avatar sm" style={{ background: `linear-gradient(135deg, ${foe.color}44, #15101f)` }}>{initials(foe.name)}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{foe.name}</div>
                  <div className="fw-mono" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>HP {foe.hp}/{foe.hpMax} - AC {foe.ac}</div>
                </span>
              </button>
            ))}
          </div>
          <div className="fw-flow-foot">
            <button className="fw-btn fw-btn-ghost" type="button" onClick={onClose}>Cancel</button>
            {isHex ? (
              <button className="fw-btn fw-btn-arcane" type="button" disabled={!target} onClick={() => { setResult({ curse: true }); setStep('result'); }}>
                {Icon('skull', { size: 12 })} Place curse
              </button>
            ) : (
              <button className="fw-btn fw-btn-arcane" type="button" disabled={!target} onClick={rollAttack}>
                {Icon('dice', { size: 12 })} Roll 2 beams - +7 each
              </button>
            )}
          </div>
        </>
      ) : null}

      {step === 'result' && result && target ? (
        <>
          {result.curse ? (
            <div style={{ textAlign: 'center', padding: 22 }}>
              <div style={{ color: 'var(--arcane-bright)', marginBottom: 12 }}>{Icon('skull', { size: 36 })}</div>
              <div className="fw-display" style={{ fontSize: 20, color: 'var(--text)', marginBottom: 6 }}>{target.name} is Cursed</div>
              <div className="fw-serif" style={{ fontStyle: 'italic', color: 'var(--text-2)', fontSize: 14, lineHeight: 1.5 }}>
                On each of your hits, 1d6 necrotic. Concentration - until rest or death.
              </div>
            </div>
          ) : (
            <div style={{ padding: 18 }}>
              <div className="fw-eyebrow" style={{ textAlign: 'center', marginBottom: 12 }}>Beams - vs AC {target.ac}</div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                {result.rolls?.map((beam, index) => (
                  <div key={index} style={{ flex: 1, maxWidth: 180, padding: 12, background: beam.hit ? 'rgba(34,197,94,0.06)' : 'rgba(153,27,27,0.06)', border: `1px solid ${beam.hit ? 'rgba(34,197,94,0.35)' : 'rgba(153,27,27,0.35)'}`, borderRadius: 8, textAlign: 'center' }}>
                    <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Beam {index + 1}</div>
                    <div className="fw-display" style={{ fontSize: 22, color: beam.hit ? 'var(--success)' : 'var(--blood-bright)' }}>{beam.total}</div>
                    <div className="fw-serif" style={{ marginTop: 6, fontSize: 11, fontStyle: 'italic', color: beam.hit ? '#86EFAC' : '#FCA5A5' }}>
                      {beam.crit ? 'Critical.' : beam.hit ? `Hit - ${beam.dmg} force` : 'Miss'}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, padding: 12, background: 'var(--bg-deep)', borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Total damage</span>
                <div className="fw-display" style={{ fontSize: 32, color: 'var(--blood-bright)' }}>{result.totalDmg}</div>
              </div>
            </div>
          )}
          <div className="fw-flow-foot">
            <button className="fw-btn fw-btn-ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="fw-btn fw-btn-gold fw-btn-lg" type="button" onClick={() => onApply(target.id, result.totalDmg ?? 0, Boolean(result.curse))}>
              {Icon('check', { size: 13 })} Commit
            </button>
          </div>
        </>
      ) : null}
    </FlowModal>
  );
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
