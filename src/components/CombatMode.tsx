import { useMemo, useState } from 'react';
import { Icon } from './ui/Icons';

type CombatModeProps = {
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

const MAP_W = 22;
const MAP_H = 14;
const CELL = 34;

const INITIAL_TOKENS: CombatToken[] = [
  { id: 'aedric', name: 'Aedric Vael', x: 5, y: 8, hp: 38, hpMax: 52, ac: 16, init: 19, color: '#d6a84f', you: true, conditions: [{ k: 'Hex ward', buff: true }] },
  { id: 'kessra', name: 'Kessra', x: 4, y: 6, hp: 26, hpMax: 26, ac: 14, init: 17, color: '#7c3aed' },
  { id: 'mirenna', name: 'Mirenna', x: 6, y: 5, hp: 31, hpMax: 38, ac: 15, init: 14, color: '#22c55e' },
  { id: 'halric', name: 'Halric Dale', x: 7, y: 9, hp: 9, hpMax: 44, ac: 18, init: 11, color: '#60a5fa', conditions: [{ k: 'Frightened', bad: true }] },
  { id: 'reeve', name: 'Cinder-Reeve', x: 16, y: 6, hp: 86, hpMax: 110, ac: 17, init: 18, color: '#991b1b', foe: true, boss: true, conditions: [{ k: 'Burning', bad: true }] },
  { id: 'spear-a', name: 'Brass Spear A', x: 14, y: 5, hp: 22, hpMax: 28, ac: 15, init: 13, color: '#b45309', foe: true },
  { id: 'spear-b', name: 'Brass Spear B', x: 18, y: 8, hp: 0, hpMax: 28, ac: 15, init: 7, color: '#b45309', foe: true, down: true, conditions: [{ k: 'Down', bad: true }] },
];

const TOOLS = [
  { id: 'cursor', icon: 'compass', label: 'Select' },
  { id: 'measure', icon: 'zap', label: 'Measure' },
  { id: 'cone', icon: 'flame', label: 'Cone 15' },
  { id: 'sphere', icon: 'hex', label: 'Sphere 20' },
  { id: 'line', icon: 'arrowR', label: 'Line 30' },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function CombatMode({ onExit }: CombatModeProps) {
  const [tokens, setTokens] = useState<CombatToken[]>(INITIAL_TOKENS);
  const [selectedId, setSelectedId] = useState('aedric');
  const [tool, setTool] = useState('cursor');
  const [round, setRound] = useState(3);
  const [turnIdx, setTurnIdx] = useState(0);
  const [actionState, setActionState] = useState<ActionState>({ action: false, bonus: false, reaction: false, moveUsed: 0 });

  const order = useMemo(() => [...tokens].sort((a, b) => b.init - a.init), [tokens]);
  const current = order[turnIdx] ?? order[0];
  const selected = tokens.find((token) => token.id === selectedId) ?? order[0];
  const isYourTurn = current?.id === 'aedric';
  const moveLeft = Math.max(0, 30 - actionState.moveUsed);

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
    if (!selected?.you || !isYourTurn || !moveCells.has(`${x}:${y}`)) return;
    const dist = Math.max(Math.abs(x - selected.x), Math.abs(y - selected.y)) * 5;
    setTokens((items) => items.map((item) => item.id === selected.id ? { ...item, x, y } : item));
    setActionState((state) => ({ ...state, moveUsed: clamp(state.moveUsed + dist, 0, 30) }));
  };

  const endTurn = () => {
    setTurnIdx((idx) => {
      const next = (idx + 1) % order.length;
      if (next === 0) setRound((value) => value + 1);
      return next;
    });
    setActionState({ action: false, bonus: false, reaction: false, moveUsed: 0 });
  };

  const applyDamage = (amount: number) => {
    setTokens((items) => items.map((item) => item.id === selected.id ? { ...item, hp: clamp(item.hp - amount, 0, item.hpMax), down: item.hp - amount <= 0 } : item));
  };

  const heal = (amount: number) => {
    setTokens((items) => items.map((item) => item.id === selected.id ? { ...item, hp: clamp(item.hp + amount, 0, item.hpMax), down: false } : item));
  };

  return (
    <div className="fw-combat-mode">
      <div className="fw-init-ticker">
        <div className="fw-init-round">
          <span className="fw-pill blood fw-pulse-dot"><span /> Round {round}</span>
          <span className="fw-eyebrow" style={{ color: 'var(--gold)' }}>Combat - Tactical</span>
        </div>
        <div className="fw-init-chain">
          {order.map((token, index) => (
            <button
              key={token.id}
              className={`fw-init-pill ${index === turnIdx ? 'current' : ''} ${token.foe ? 'foe' : 'ally'} ${token.down ? 'down' : ''}`}
              type="button"
              onClick={() => setSelectedId(token.id)}
            >
              <span className="fw-mono">{token.init}</span>
              <span className="fw-avatar sm" style={{ background: `linear-gradient(135deg, ${token.color}44, #15101f)` }}>{initials(token.name)}</span>
              <span>{token.name}</span>
              <span className="fw-mono">{token.hp}/{token.hpMax}</span>
              {index === turnIdx ? <span className="fw-now">NOW</span> : null}
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
            onBonus={() => setActionState((state) => ({ ...state, bonus: true }))}
            onDash={() => setActionState((state) => ({ ...state, action: true, moveUsed: Math.max(0, state.moveUsed - 30) }))}
            onEndTurn={endTurn}
          />
        </section>

        <aside className="fw-token-inspector">
          <TokenInspector token={selected} onDamage={() => applyDamage(7)} onHeal={() => heal(8)} />
        </aside>
      </div>
    </div>
  );
}

function TurnHud({
  actionState,
  current,
  isYourTurn,
  moveLeft,
  onAction,
  onBonus,
  onDash,
  onEndTurn,
}: {
  actionState: ActionState;
  current?: CombatToken;
  isYourTurn: boolean;
  moveLeft: number;
  onAction: () => void;
  onBonus: () => void;
  onDash: () => void;
  onEndTurn: () => void;
}) {
  if (!isYourTurn) {
    return (
      <div className="fw-turn-hud not-yours">
        <span className={current?.foe ? 'fw-turn-dot foe' : 'fw-turn-dot'} />
        <div>
          <div className="fw-eyebrow">Now Acting</div>
          <div className="fw-display" style={{ color: 'var(--text)', fontSize: 16 }}>{current?.name}</div>
        </div>
        <span style={{ flex: 1 }} />
        <span className="fw-serif" style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>
          {current?.foe ? 'Hold breath. The Reeve does not blink.' : 'Wait for your turn.'}
        </span>
      </div>
    );
  }

  return (
    <div className="fw-turn-hud yours">
      <div className="fw-turn-title">
        <div className="fw-eyebrow" style={{ color: 'var(--gold)' }}>Your Turn</div>
        <div className="fw-display">Aedric Vael</div>
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
        <button className="fw-btn fw-btn-gold" disabled={actionState.action} type="button" onClick={onAction}>{Icon('flame', { size: 12 })} Attack <span className="fw-mini-cost">1A</span></button>
        <button className="fw-btn fw-btn-arcane" disabled={actionState.action} type="button" onClick={onAction}>{Icon('flame', { size: 12 })} Blast <span className="fw-mini-cost">1A</span></button>
        <button className="fw-btn fw-btn-ghost" disabled={actionState.bonus} type="button" onClick={onBonus}>{Icon('skull', { size: 12 })} Hex <span className="fw-mini-cost">1BA</span></button>
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
        <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">{Icon('sparkles', { size: 11 })} Condition</button>
        <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">{Icon('eye', { size: 11 })} Statblock</button>
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

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
