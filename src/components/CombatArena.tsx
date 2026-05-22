import React, { useState, useMemo, useEffect } from 'react';
import { Icon } from './ui/Icons';
import { useGameData } from '../hooks/useGameData';
import type { Character, CombatAttackType } from '../types';

/* ── Constants ───────────────────────────────────────────────────────────────── */

const MAP_W = 22, MAP_H = 14, CELL = 36;

/* ── Types ───────────────────────────────────────────────────────────────────── */

type Condition = { k: string; buff?: boolean; bad?: boolean };

type CombatToken = {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  foe?: boolean;
  ally?: boolean;
  you?: boolean;
  hp: number;
  hpMax: number;
  ac: number;
  init: number;
  conditions?: Condition[];
  boss?: boolean;
  down?: boolean;
};

type Terrain = { kind: 'altar' | 'pew' | 'circle' | 'stair'; x: number; y: number; w: number; h: number };
type Light   = { x: number; y: number; r: number; color: string };

type AttackWeapon = { n: string; dmg: string; toHit: number };
type SpellData    = { n: string; lvl: string; cost: string; dmg?: string; save?: string; toHit?: number; curse?: boolean };
type FlowState    =
  | { kind: 'attack'; weapon: AttackWeapon; source: string; target: CombatToken | null }
  | { kind: 'spell';  spell: SpellData;    source: string; target: CombatToken | null }
  | null;

type HitRoll   = { raw: number; total: number; all: number[]; crit: boolean; fumble: boolean };
type DmgRoll   = { dice: number[]; bonus: number; total: number };
type SpellResult = {
  rolls?: Array<{ r: number; total: number; hit: boolean; dmg: number; crit: boolean }>;
  totalDmg?: number;
  curse?: boolean;
};

type ActionBudget = { action: boolean; bonus: boolean; reaction: boolean; moveUsed: number };
type Cell = { x: number; y: number };

export type CombatChange = {
  kind: 'damage' | 'heal' | 'condition';
  target: string;
  amount?: number;
  source?: string;
  condition?: string;
};

export interface CombatArenaProps {
  onExit: () => void;
  onChange?: (change: CombatChange) => void;
}

/* ── Static map data ─────────────────────────────────────────────────────────── */

const TERRAIN: Terrain[] = [
  { kind: 'altar',  x: 10, y: 2,  w: 2, h: 2 },
  { kind: 'pew',    x: 3,  y: 5,  w: 5, h: 1 },
  { kind: 'pew',    x: 14, y: 5,  w: 5, h: 1 },
  { kind: 'pew',    x: 3,  y: 7,  w: 5, h: 1 },
  { kind: 'pew',    x: 14, y: 7,  w: 5, h: 1 },
  { kind: 'circle', x: 9,  y: 4,  w: 4, h: 4 },
  { kind: 'stair',  x: 9,  y: 12, w: 4, h: 2 },
];

const LIGHTS: Light[] = [
  { x: 11, y: 3,  r: 5,   color: 'gold'  },
  { x: 4,  y: 11, r: 2.5, color: 'torch' },
  { x: 18, y: 11, r: 2.5, color: 'torch' },
];

function combatantPosition(index: number, foe: boolean): Cell {
  return {
    x: foe ? 14 + (index % 5) : 5 + (index % 5),
    y: foe ? 4 + Math.floor(index / 5) * 2 : 8 + Math.floor(index / 5) * 2,
  };
}

function tokenFromCharacter(character: Character): CombatToken {
  return {
    id: `pc-${character.id}`,
    name: character.name,
    x: 5,
    y: 8,
    color: '#7C3AED',
    ally: true,
    you: true,
    hp: character.hitPoints,
    hpMax: character.maxHitPoints,
    ac: character.armorClass,
    init: character.systemData.derivedStats?.initiative ?? Math.floor((character.abilities.dex - 10) / 2),
    conditions: character.activeConditions.map((condition) => ({ k: condition, bad: true })),
    down: character.hitPoints <= 0,
  };
}

function diceAverage(dice: string | undefined, fallback: number) {
  if (!dice) return fallback;
  const match = dice.match(/(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/i);
  if (!match) return fallback;
  const count = Number(match[1]);
  const sides = Number(match[2]);
  const sign = match[3] === '-' ? -1 : 1;
  const bonus = match[4] ? Number(match[4]) * sign : 0;
  return Math.max(1, Math.round(count * ((sides + 1) / 2) + bonus));
}

/* ── Main Component ──────────────────────────────────────────────────────────── */

export function CombatArena({ onExit, onChange }: CombatArenaProps) {
  const { combatState, activeCharacter, dispatch, eventMeta } = useGameData();

  const playerCharacterId = activeCharacter?.id ?? '';
  const storeTokens = useMemo(() => {
    if (combatState?.combatants?.length) {
      return combatState.combatants.map((c, index) => {
        const foe = c.type !== 'player';
        const pos = combatantPosition(index, foe);
        return {
          id: c.id,
          name: c.name,
          x: pos.x,
          y: pos.y,
          color: foe ? '#991B1B' : '#7C3AED',
          foe,
          ally: !foe,
          you: c.characterId === playerCharacterId || c.id === playerCharacterId || c.id === `pc-${playerCharacterId}`,
          hp: c.hitPoints,
          hpMax: c.maxHitPoints,
          ac: c.armorClass,
          init: c.initiative,
          boss: c.isBoss,
          down: c.hitPoints <= 0 || c.status === 'dead' || c.status === 'dying',
          conditions: c.conditions.map((condition) => ({ k: condition, bad: true })),
        } as CombatToken;
      });
    }
    return activeCharacter ? [tokenFromCharacter(activeCharacter)] : [];
  }, [activeCharacter, combatState, playerCharacterId]);

  const [tokens,      setTokens]      = useState<CombatToken[]>(storeTokens);
  const [selectedId,  setSelectedId]  = useState(tokens.find(t => t.you)?.id ?? tokens[0]?.id ?? '');
  const [tool,        setTool]        = useState('cursor');
  const [round,       setRound]       = useState(combatState?.round ?? 1);
  const [turnIdx,     setTurnIdx]     = useState(combatState?.activeIndex ?? 0);
  const [actionState, setActionState] = useState<ActionBudget>({ action: false, bonus: false, reaction: false, moveUsed: 0 });
  const [flow,        setFlow]        = useState<FlowState>(null);
  const [hover,       setHover]       = useState<Cell | null>(null);
  const [measure,     setMeasure]     = useState<{ from: Cell; to?: Cell } | null>(null);

  const order      = useMemo(() => [...tokens].sort((a, b) => b.init - a.init), [tokens]);
  const current    = order[turnIdx] ?? order[0];
  const selected   = tokens.find(t => t.id === selectedId) ?? null;
  const isYourTurn = current?.you === true;

  useEffect(() => {
    setTokens(storeTokens);
    setRound(combatState?.round ?? 1);
    setTurnIdx(combatState?.activeIndex ?? 0);
    setSelectedId((currentId) => {
      if (storeTokens.some((token) => token.id === currentId)) return currentId;
      return storeTokens.find((token) => token.you)?.id ?? storeTokens[0]?.id ?? '';
    });
  }, [combatState?.activeIndex, combatState?.round, storeTokens]);

  function dispatchCombatChange(token: CombatToken, kind: 'damage' | 'heal', amount: number) {
    if (!combatState) {
      setTokens(ts => ts.map(t => t.id === token.id ? {
        ...t,
        hp: kind === 'damage' ? Math.max(0, t.hp - amount) : Math.min(t.hpMax, t.hp + amount),
        down: kind === 'damage' ? t.hp - amount <= 0 : false,
      } : t));
      onChange?.({ kind, target: token.name, amount });
      return;
    }
    const meta = {
      ...eventMeta(activeCharacter?.id ?? token.id),
      sessionId: combatState.id,
      actorId: activeCharacter?.id ?? token.id,
      targetId: token.id,
    };
    const result = kind === 'damage'
      ? dispatch({
          ...meta,
          type: 'apply_damage',
          amount,
        })
      : dispatch({
          ...meta,
          type: 'recover_hp',
          amount,
          recoveryKind: 'healing',
        });
    if (!result.failed.length) {
      onChange?.({ kind, target: token.name, amount });
    }
  }

  function dispatchCondition(token: CombatToken, condition: string) {
    if (!combatState) return false;
    const result = dispatch({
      ...eventMeta(activeCharacter?.id ?? token.id),
      type: 'apply_condition',
      sessionId: combatState.id,
      actorId: activeCharacter?.id ?? token.id,
      targetId: token.id,
      condition,
      notes: 'Combat arena condition action',
    });
    if (!result.failed.length) {
      onChange?.({ kind: 'condition', target: token.name, condition });
      return true;
    }
    return false;
  }

  function preferredTarget() {
    if (selected && selected.foe && !selected.down) return selected;
    return tokens.find((token) => token.foe && !token.down) ?? null;
  }

  function dispatchAttack(attackType: CombatAttackType) {
    if (!combatState || !current || actionState.action) return;
    const target = preferredTarget();
    if (!target || target.id === current.id) return;
    const equippedWeapon = activeCharacter?.inventory.items.find((item) => item.equipped && item.weapon);
    const spellAttackBonus = activeCharacter?.systemData.derivedStats?.spellAttackBonus;
    const proficiencyBonus = activeCharacter?.systemData.derivedStats?.proficiencyBonus ?? 0;
    const attackBonus = attackType === 'spell' ? spellAttackBonus ?? proficiencyBonus : proficiencyBonus;
    const damageAmount = attackType === 'spell'
      ? diceAverage('1d10', Math.max(1, Math.ceil((activeCharacter?.level ?? 1) / 2)))
      : diceAverage(equippedWeapon?.weapon?.damageDice, Math.max(1, proficiencyBonus + 1));
    const damageType = attackType === 'spell' ? 'force' : equippedWeapon?.weapon?.damageType ?? 'bludgeoning';
    const result = dispatch({
      ...eventMeta(activeCharacter?.id ?? current.id),
      type: 'COMBAT_ATTACK',
      sessionId: combatState.id,
      actorId: activeCharacter?.id ?? current.id,
      targetId: target.id,
      actorCombatantId: current.id,
      targetCombatantId: target.id,
      attackType,
      advantageMode: 'normal',
      attackBonus,
      damageAmount,
      damageType,
    });
    if (!result.failed.length) {
      setActionState((state) => ({ ...state, action: true }));
      onChange?.({ kind: 'damage', target: target.name, amount: damageAmount, source: attackType === 'spell' ? 'Spell attack' : equippedWeapon?.name ?? 'Attack' });
    }
  }

  function dispatchHex() {
    if (!combatState || actionState.bonus) return;
    const target = preferredTarget();
    if (!target) return;
    if (!dispatchCondition(target, 'Cursed (Hex)')) return;
    if (current) {
      const result = dispatch({
        ...eventMeta(activeCharacter?.id ?? current.id),
        type: 'COMBAT_USE_ACTION',
        sessionId: combatState.id,
        actorId: activeCharacter?.id ?? current.id,
        targetId: current.id,
        combatantId: current.id,
        actionKind: 'bonusAction',
      });
      if (!result.failed.length) setActionState((state) => ({ ...state, bonus: true }));
    }
  }

  function endCombatMode() {
    if (combatState) {
      dispatch({
        ...eventMeta(activeCharacter?.id ?? combatState.id),
        type: 'COMBAT_END_ENCOUNTER',
        sessionId: combatState.id,
        actorId: activeCharacter?.id ?? combatState.id,
        targetId: combatState.id,
      });
    }
    onExit();
  }

  const onCellClick = (x: number, y: number) => {
    if (tool === 'measure') {
      if (!measure || measure.to) setMeasure({ from: { x, y } });
      else setMeasure({ ...measure, to: { x, y } });
      return;
    }
    const tk = tokens.find(t => t.x === x && t.y === y);
    if (tk) { setSelectedId(tk.id); return; }
    if (selected?.you && isYourTurn) {
      const dist = Math.max(Math.abs(x - selected.x), Math.abs(y - selected.y)) * 5;
      if (dist <= 30 - actionState.moveUsed) {
        if (combatState) {
          dispatch({
            ...eventMeta(activeCharacter?.id ?? selected.id),
            type: 'COMBAT_MOVE',
            sessionId: combatState.id,
            actorId: activeCharacter?.id ?? selected.id,
            targetId: selected.id,
            combatantId: selected.id,
            feet: dist,
          });
        }
        setTokens(ts => ts.map(t => t.id === selectedId ? { ...t, x, y } : t));
        setActionState(a => ({ ...a, moveUsed: a.moveUsed + dist }));
      }
    }
  };

  const endTurn = () => {
    if (!order.length) return;
    if (combatState && current) {
      dispatch({
        ...eventMeta(activeCharacter?.id ?? current.id),
        type: 'COMBAT_ADVANCE_TURN',
        sessionId: combatState.id,
        actorId: activeCharacter?.id ?? current.id,
        targetId: current.id,
        direction: 1,
      });
    }
    setTurnIdx(i => (i + 1) % order.length);
    if (turnIdx === order.length - 1) setRound(r => r + 1);
    setActionState({ action: false, bonus: false, reaction: false, moveUsed: 0 });
    setFlow(null);
  };

  if (!combatState?.combatants.length) {
    return (
      <div className="fw-combat-mode">
        <div className="fw-init-ticker">
          <div className="fw-init-round">
            <span className="fw-pill blood">Round 1</span>
            <span className="fw-eyebrow" style={{ color: 'var(--gold)' }}>Combat · Tactical</span>
          </div>
          <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={onExit} style={{ flexShrink: 0 }}>
            {Icon('x', { size: 11 })} Exit
          </button>
        </div>
        <div className="fw-combat-main">
          <div className="fw-combat-map-wrap">
            <div className="fw-map-tools">
              <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--f-mono)' }}>
                No combatants in store
              </span>
            </div>
            <div className="fw-battlemap" style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
              <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
                <div className="fw-display" style={{ fontSize: 18, color: 'var(--text)' }}>No active encounter</div>
                <div className="fw-serif" style={{ fontSize: 13, marginTop: 6 }}>Start or sync an encounter before opening the tactical table.</div>
              </div>
            </div>
          </div>
          <aside className="fw-token-inspector" />
        </div>
      </div>
    );
  }

  return (
    <div className="fw-combat-mode">
      <InitiativeTicker order={order} turnIdx={turnIdx} round={round} onExit={endCombatMode} />

      <div className="fw-combat-main">
        <div className="fw-combat-map-wrap">
          <div className="fw-map-tools">
            <ToolBtn id="cursor"  icon="compass" label="Select"    tool={tool} setTool={setTool} />
            <ToolBtn id="measure" icon="zap"     label="Measure"   tool={tool} setTool={setTool} />
            <ToolBtn id="cone"    icon="flame"   label="Cone 15"   tool={tool} setTool={setTool} />
            <ToolBtn id="sphere"  icon="hex"     label="Sphere 20" tool={tool} setTool={setTool} />
            <ToolBtn id="line"    icon="arrowR"  label="Line 30"   tool={tool} setTool={setTool} />
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--f-mono)' }}>
              {tool === 'measure' && measure?.from && !measure?.to && 'Click target cell'}
              {selected && tool === 'cursor' && `Selected · ${selected.name}`}
            </span>
          </div>

          <BattleMap
            tokens={tokens}
            selectedId={selectedId}
            current={current}
            tool={tool}
            onCellClick={onCellClick}
            hover={hover}
            setHover={setHover}
            measure={measure}
            isYourTurn={isYourTurn}
            moveBudget={30 - actionState.moveUsed}
            selected={selected}
          />

          <TurnHUD
            isYourTurn={isYourTurn}
            current={current}
            actionState={actionState}
            onBonus={() => !actionState.bonus && setActionState(a => ({ ...a, bonus: true }))}
            onAttack={() => dispatchAttack('melee')}
            onBlast={() => dispatchAttack('spell')}
            onHex={dispatchHex}
            onAction={() => {
              if (actionState.action) return;
              if (combatState && current) {
                dispatch({
                  ...eventMeta(activeCharacter?.id ?? current.id),
                  type: 'COMBAT_USE_ACTION',
                  sessionId: combatState.id,
                  actorId: activeCharacter?.id ?? current.id,
                  targetId: current.id,
                  combatantId: current.id,
                  actionKind: 'action',
                });
              }
              setActionState(a => ({ ...a, action: true }));
            }}
            onDash={() => {
              if (actionState.action) return;
              if (combatState && current) {
                dispatch({
                  ...eventMeta(activeCharacter?.id ?? current.id),
                  type: 'COMBAT_USE_ACTION',
                  sessionId: combatState.id,
                  actorId: activeCharacter?.id ?? current.id,
                  targetId: current.id,
                  combatantId: current.id,
                  actionKind: 'action',
                });
              }
              setActionState(a => ({ ...a, action: true, moveUsed: Math.max(0, a.moveUsed - 30) }));
            }}
            onEndTurn={endTurn}
          />
        </div>

        <aside className="fw-token-inspector">
          {selected && (
            <TokenInspector
              token={selected}
              onChange={onChange}
              onDamage={(token, amount) => dispatchCombatChange(token, 'damage', amount)}
              onHeal={(token, amount) => dispatchCombatChange(token, 'heal', amount)}
            />
          )}
        </aside>
      </div>

      {flow?.kind === 'attack' && (
        <AttackFlow
          flow={flow}
          setFlow={setFlow}
          tokens={tokens}
          setTokens={setTokens}
          actionState={actionState}
          setActionState={setActionState}
          onChange={onChange}
          onApplyDamage={(target, amount, source) => {
            dispatchCombatChange(target, 'damage', amount);
          }}
        />
      )}
      {flow?.kind === 'spell' && (
        <SpellCastFlow
          flow={flow}
          setFlow={setFlow}
          tokens={tokens}
          setTokens={setTokens}
          actionState={actionState}
          setActionState={setActionState}
          onChange={onChange}
          onApplyDamage={(target, amount, source) => {
            dispatchCombatChange(target, 'damage', amount);
          }}
          onApplyCondition={(target, condition) => dispatchCondition(target, condition)}
        />
      )}
    </div>
  );
}

/* ── Initiative Ticker ───────────────────────────────────────────────────────── */

function InitiativeTicker({ order, turnIdx, round, onExit }: {
  order: CombatToken[];
  turnIdx: number;
  round: number;
  onExit: () => void;
}) {
  return (
    <div className="fw-init-ticker">
      <div className="fw-init-round">
        <span className="fw-pill blood" style={{ animation: 'fw-glow-pulse 2.4s infinite' }}>
          <span style={{ width: 5, height: 5, borderRadius: 50, background: 'currentColor' }} /> Round {round}
        </span>
        <span className="fw-eyebrow" style={{ color: 'var(--gold)' }}>Combat · Tactical</span>
      </div>
      <div className="fw-init-chain">
        {order.map((t, i) => (
          <div
            key={t.id}
            className={[
              'fw-init-pill',
              i === turnIdx ? 'current' : '',
              t.foe ? 'foe' : 'ally',
              t.down ? 'down' : '',
            ].filter(Boolean).join(' ')}
          >
            <span className="fw-mono" style={{ fontSize: 10.5 }}>{t.init}</span>
            <span className="fw-avatar sm" style={{ background: `linear-gradient(135deg, ${t.color}44, #15101f)`, fontSize: 9 }}>
              {t.name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            <span style={{ fontSize: 11, color: t.down ? 'var(--text-3)' : 'var(--text-2)' }}>{t.name}</span>
            <span className="fw-mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>{t.hp}/{t.hpMax}</span>
            {i === turnIdx && <span style={{ color: 'var(--blood-bright)', fontSize: 9, letterSpacing: '0.12em' }}>NOW</span>}
          </div>
        ))}
      </div>
      <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={onExit} style={{ flexShrink: 0 }}>
        {Icon('x', { size: 11 })} End combat
      </button>
    </div>
  );
}

/* ── Battle Map ──────────────────────────────────────────────────────────────── */

function BattleMap({ tokens, selectedId, current, tool, onCellClick, hover, setHover, measure, isYourTurn, moveBudget, selected }: {
  tokens: CombatToken[];
  selectedId: string;
  current: CombatToken | undefined;
  tool: string;
  onCellClick: (x: number, y: number) => void;
  hover: Cell | null;
  setHover: (c: Cell | null) => void;
  measure: { from: Cell; to?: Cell } | null;
  isYourTurn: boolean;
  moveBudget: number;
  selected: CombatToken | null;
}) {
  const w = MAP_W * CELL, h = MAP_H * CELL;

  const moveCells = useMemo<Cell[]>(() => {
    if (!selected?.you || !isYourTurn || moveBudget <= 0) return [];
    const range = Math.floor(moveBudget / 5);
    const cells: Cell[] = [];
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.max(Math.abs(dx), Math.abs(dy)) <= range) {
          const nx = selected.x + dx, ny = selected.y + dy;
          if (nx >= 0 && ny >= 0 && nx < MAP_W && ny < MAP_H) cells.push({ x: nx, y: ny });
        }
      }
    }
    return cells;
  }, [selected, isYourTurn, moveBudget]);

  const measureDist = (measure?.from && measure?.to)
    ? Math.max(Math.abs(measure.from.x - measure.to.x), Math.abs(measure.from.y - measure.to.y)) * 5
    : null;

  return (
    <div className="fw-battlemap" style={{ aspectRatio: `${w} / ${h}` }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
        <defs>
          <radialGradient id="bm-floor" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#1f1830" />
            <stop offset="100%" stopColor="#08070d" />
          </radialGradient>
          <radialGradient id="bm-gold-light">
            <stop offset="0%" stopColor="rgba(234,192,116,0.45)" />
            <stop offset="100%" stopColor="rgba(214,168,79,0)" />
          </radialGradient>
          <radialGradient id="bm-torch-light">
            <stop offset="0%" stopColor="rgba(214,168,79,0.3)" />
            <stop offset="100%" stopColor="rgba(214,168,79,0)" />
          </radialGradient>
          <pattern id="bm-grid" width={CELL} height={CELL} patternUnits="userSpaceOnUse">
            <path d={`M ${CELL} 0 L 0 0 0 ${CELL}`} fill="none" stroke="rgba(214,168,79,0.07)" strokeWidth="0.8" />
          </pattern>
        </defs>

        <rect width={w} height={h} fill="url(#bm-floor)" />

        {LIGHTS.map((l, i) => (
          <circle key={i} cx={(l.x + 0.5) * CELL} cy={(l.y + 0.5) * CELL} r={l.r * CELL}
            fill={`url(#bm-${l.color === 'gold' ? 'gold' : 'torch'}-light)`} />
        ))}

        {TERRAIN.map((t, i) => <TerrainShape key={i} t={t} />)}

        <rect width={w} height={h} fill="url(#bm-grid)" />

        {moveCells.map((c, i) => (
          <rect key={i} x={c.x * CELL} y={c.y * CELL} width={CELL} height={CELL}
            fill="rgba(124,58,237,0.10)" stroke="rgba(124,58,237,0.3)" strokeWidth="0.5" />
        ))}

        {hover && (
          <rect x={hover.x * CELL} y={hover.y * CELL} width={CELL} height={CELL}
            fill="rgba(214,168,79,0.10)" stroke="var(--gold)" strokeWidth="1" pointerEvents="none" />
        )}

        {tool === 'cone'   && hover && selected && <ConeTemplate   from={selected} to={hover} />}
        {tool === 'sphere' && hover             && <SphereTemplate center={hover} radius={4} />}
        {tool === 'line'   && hover && selected && <LineTemplate   from={selected} to={hover} />}

        {measure?.from && measure?.to && (
          <g>
            <line
              x1={(measure.from.x + 0.5) * CELL} y1={(measure.from.y + 0.5) * CELL}
              x2={(measure.to.x  + 0.5) * CELL}  y2={(measure.to.y  + 0.5) * CELL}
              stroke="var(--gold-bright)" strokeWidth="2" strokeDasharray="4 4"
            />
            <circle cx={(measure.to.x + 0.5) * CELL} cy={(measure.to.y + 0.5) * CELL} r={6} fill="var(--gold-bright)" />
            <text x={(measure.to.x + 0.5) * CELL + 12} y={(measure.to.y + 0.5) * CELL - 8}
              fill="var(--gold-bright)" fontSize="14" fontFamily="JetBrains Mono">
              {measureDist} ft
            </text>
          </g>
        )}

        {Array.from({ length: MAP_H }).map((_, y) =>
          Array.from({ length: MAP_W }).map((_, x) => (
            <rect key={`${x}-${y}`}
              x={x * CELL} y={y * CELL} width={CELL} height={CELL}
              fill="transparent"
              onMouseEnter={() => setHover({ x, y })}
              onMouseLeave={() => setHover(null)}
              onClick={() => onCellClick(x, y)}
              style={{ cursor: tool === 'cursor' ? 'default' : 'crosshair' }}
            />
          ))
        )}

        {tokens.map(tk => (
          <MapToken key={tk.id} tk={tk} selected={tk.id === selectedId} current={tk.id === current?.id} />
        ))}
      </svg>

      {selected && <TokenTooltip tk={selected} />}
    </div>
  );
}

/* ── Terrain ─────────────────────────────────────────────────────────────────── */

function TerrainShape({ t }: { t: Terrain }) {
  if (t.kind === 'altar') {
    return (
      <g>
        <rect x={t.x * CELL + 4} y={t.y * CELL + 4} width={t.w * CELL - 8} height={t.h * CELL - 8} rx={4}
          fill="rgba(214,168,79,0.10)" stroke="var(--gold-deep)" strokeWidth="1" />
        <text x={(t.x + t.w / 2) * CELL} y={(t.y + t.h / 2) * CELL + 4} textAnchor="middle"
          fill="var(--gold)" fontSize="10" fontFamily="Cinzel" letterSpacing="2">ALTAR</text>
      </g>
    );
  }
  if (t.kind === 'pew') {
    return <rect x={t.x * CELL + 2} y={t.y * CELL + 8} width={t.w * CELL - 4} height={t.h * CELL - 16}
      rx={2} fill="rgba(20,17,29,0.7)" stroke="rgba(214,168,79,0.18)" strokeWidth="0.6" />;
  }
  if (t.kind === 'circle') {
    const cx = (t.x + t.w / 2) * CELL, cy = (t.y + t.h / 2) * CELL, r = (t.w / 2) * CELL - 4;
    return (
      <g>
        <circle cx={cx} cy={cy} r={r} fill="rgba(124,58,237,0.08)" stroke="rgba(124,58,237,0.5)" strokeWidth="1.2" strokeDasharray="3 3" />
        <circle cx={cx} cy={cy} r={r * 0.65} fill="none" stroke="rgba(124,58,237,0.35)" strokeWidth="0.8" />
        <text x={cx} y={cy + 4} textAnchor="middle" fill="rgba(124,58,237,0.7)" fontSize="9" fontFamily="Cinzel" letterSpacing="3">BINDING</text>
      </g>
    );
  }
  if (t.kind === 'stair') {
    return (
      <g>
        <rect x={t.x * CELL} y={t.y * CELL} width={t.w * CELL} height={t.h * CELL} fill="rgba(20,17,29,0.6)" />
        {[0, 1, 2, 3].map(i => (
          <line key={i} x1={t.x * CELL} y1={t.y * CELL + i * 16} x2={(t.x + t.w) * CELL} y2={t.y * CELL + i * 16}
            stroke="rgba(214,168,79,0.2)" strokeWidth="0.8" />
        ))}
        <text x={(t.x + t.w / 2) * CELL} y={(t.y + t.h - 0.3) * CELL} textAnchor="middle"
          fill="rgba(214,168,79,0.4)" fontSize="9" fontFamily="Cinzel" letterSpacing="2">DESCENT</text>
      </g>
    );
  }
  return null;
}

/* ── Map Token ───────────────────────────────────────────────────────────────── */

function MapToken({ tk, selected, current }: { tk: CombatToken; selected: boolean; current: boolean }) {
  const cx = (tk.x + 0.5) * CELL, cy = (tk.y + 0.5) * CELL, r = CELL * 0.4;
  const hpPct = tk.hp / tk.hpMax;
  const initials = tk.name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
  const arcLen = 2 * Math.PI * (r + 2);

  return (
    <g style={{ pointerEvents: 'none' }}>
      {selected && <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="var(--gold-bright)" strokeWidth="1.6" />}
      {current && (
        <circle cx={cx} cy={cy} r={r + 7} fill="none" stroke="var(--blood-bright)" strokeWidth="1.2" strokeDasharray="3 3">
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="6s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx={cx} cy={cy} r={r} fill={tk.color} fillOpacity={tk.down ? 0.3 : 0.85}
        stroke={tk.foe ? 'var(--blood)' : 'var(--gold)'} strokeWidth="1.2" />
      <text x={cx} y={cy + 4} textAnchor="middle" fill="#fff" fontSize="11"
        fontFamily="Cinzel" fontWeight="600" opacity={tk.down ? 0.5 : 1}>{initials}</text>
      <circle cx={cx} cy={cy} r={r + 2} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={r + 2} fill="none"
        stroke={hpPct > 0.5 ? '#22C55E' : hpPct > 0.25 ? '#F59E0B' : '#EF4444'}
        strokeWidth="2"
        strokeDasharray={`${arcLen * hpPct} ${arcLen}`}
        transform={`rotate(-90 ${cx} ${cy})`} />
      {tk.you && <circle cx={cx + r * 0.7} cy={cy - r * 0.7} r={4} fill="var(--gold-bright)" stroke="var(--bg)" strokeWidth="1" />}
      {tk.down && (
        <g>
          <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="var(--blood-bright)" strokeWidth="1.5" />
          <text x={cx} y={cy + r + 12} textAnchor="middle" fontSize="8" fill="var(--blood-bright)" fontFamily="JetBrains Mono" letterSpacing="1">0 HP</text>
        </g>
      )}
      {tk.conditions?.slice(0, 3).map((c, i) => (
        <circle key={i} cx={cx - r + i * 6} cy={cy + r - 2} r={3}
          fill={c.bad ? 'var(--blood-bright)' : c.buff ? '#86EFAC' : 'var(--gold-bright)'}
          stroke="var(--bg)" strokeWidth="1" />
      ))}
    </g>
  );
}

/* ── Templates ───────────────────────────────────────────────────────────────── */

function ConeTemplate({ from, to }: { from: Cell; to: Cell }) {
  const cx = (from.x + 0.5) * CELL, cy = (from.y + 0.5) * CELL;
  const angle = Math.atan2((to.y + 0.5) * CELL - cy, (to.x + 0.5) * CELL - cx);
  const len = 15 / 5 * CELL, half = len * Math.tan(Math.PI / 4);
  const p1 = [cx + Math.cos(angle) * len + Math.cos(angle + Math.PI / 2) * half, cy + Math.sin(angle) * len + Math.sin(angle + Math.PI / 2) * half];
  const p2 = [cx + Math.cos(angle) * len - Math.cos(angle + Math.PI / 2) * half, cy + Math.sin(angle) * len - Math.sin(angle + Math.PI / 2) * half];
  return <polygon points={`${cx},${cy} ${p1[0]},${p1[1]} ${p2[0]},${p2[1]}`} fill="rgba(214,168,79,0.18)" stroke="var(--gold)" strokeWidth="1" />;
}

function SphereTemplate({ center, radius }: { center: Cell; radius: number }) {
  return <circle cx={(center.x + 0.5) * CELL} cy={(center.y + 0.5) * CELL} r={radius * CELL} fill="rgba(124,58,237,0.18)" stroke="var(--arcane)" strokeWidth="1" />;
}

function LineTemplate({ from, to }: { from: Cell; to: Cell }) {
  const cx = (from.x + 0.5) * CELL, cy = (from.y + 0.5) * CELL;
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const len = 30 / 5 * CELL;
  return <line x1={cx} y1={cy} x2={cx + Math.cos(angle) * len} y2={cy + Math.sin(angle) * len}
    stroke="var(--gold)" strokeWidth={CELL * 0.6} strokeOpacity="0.25" strokeLinecap="round" />;
}

/* ── Token Tooltip ───────────────────────────────────────────────────────────── */

function TokenTooltip({ tk }: { tk: CombatToken }) {
  return (
    <div className="fw-token-tooltip" style={{ borderColor: tk.foe ? 'var(--blood)' : 'var(--gold-deep)' }}>
      <div style={{ fontSize: 11.5, color: 'var(--text)', fontWeight: 500 }}>{tk.name}</div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--f-mono)' }}>HP {tk.hp}/{tk.hpMax} · AC {tk.ac}</div>
    </div>
  );
}

/* ── Tool Button ─────────────────────────────────────────────────────────────── */

function ToolBtn({ id, icon, label, tool, setTool }: {
  id: string; icon: string; label: string; tool: string; setTool: (t: string) => void;
}) {
  return (
    <button onClick={() => setTool(id)} className={'fw-map-tool ' + (tool === id ? 'active' : '')} title={label}>
      {Icon(icon, { size: 13 })}
      <span style={{ fontSize: 10, marginLeft: 4 }}>{label}</span>
    </button>
  );
}

/* ── Token Inspector ─────────────────────────────────────────────────────────── */

function TokenInspector({
  token,
  onChange,
  onDamage,
  onHeal,
}: {
  token: CombatToken;
  onChange?: (c: CombatChange) => void;
  onDamage: (token: CombatToken, amount: number) => void;
  onHeal: (token: CombatToken, amount: number) => void;
}) {
  const hpPct = (token.hp / token.hpMax) * 100;
  const quickAmount = Math.max(1, Math.ceil(token.hpMax * 0.1));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: token.foe ? 'rgba(153,27,27,0.10)' : 'rgba(214,168,79,0.05)', border: '1px solid ' + (token.foe ? 'rgba(153,27,27,0.35)' : 'var(--border)'), borderRadius: 8 }}>
        <span className="fw-avatar" style={{ background: `linear-gradient(135deg, ${token.color}44, #15101f)`, borderColor: token.foe ? 'var(--blood)' : 'var(--gold-deep)' }}>
          {token.name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fw-display" style={{ fontSize: 14, color: 'var(--text)' }}>{token.name}</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
            Initiative <b style={{ color: 'var(--gold-bright)', fontFamily: 'var(--f-mono)' }}>{token.init}</b> · {token.foe ? 'Hostile' : token.you ? 'You' : 'Ally'}
          </div>
        </div>
        {token.boss && <span className="fw-pill gold" style={{ fontSize: 9 }}>BOSS</span>}
        {token.you  && <span className="fw-pill gold" style={{ fontSize: 9 }}>You</span>}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
          <span>HP</span>
          <span style={{ fontFamily: 'var(--f-mono)', color: hpPct > 50 ? 'var(--success)' : hpPct > 25 ? 'var(--warning)' : 'var(--blood-bright)' }}>
            {token.hp} / {token.hpMax}
          </span>
        </div>
        <div style={{ height: 6, background: 'var(--bg-deep)', border: '1px solid var(--border-soft)', borderRadius: 50, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: hpPct + '%', background: `linear-gradient(90deg, var(--blood), ${hpPct > 50 ? 'var(--success)' : hpPct > 25 ? 'var(--warning)' : 'var(--blood-bright)'})` }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <MiniStat label="AC"   v={token.ac} />
        <MiniStat label="SPD"  v="30 ft" />
        <MiniStat label="INIT" v={`+${token.init - 12}`} />
      </div>

      {token.conditions && token.conditions.length > 0 && (
        <div>
          <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Conditions</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {token.conditions.map((c, i) => (
              <span key={i} className={'fw-cond ' + (c.bad ? 'bleed' : c.buff ? 'buff' : '')}>{c.k}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <button className="fw-btn fw-btn-blood fw-btn-sm" style={{ justifyContent: 'center' }}
          onClick={() => onDamage(token, quickAmount)}>
          {Icon('minus', { size: 11 })} Damage
        </button>
        <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ justifyContent: 'center' }}
          onClick={() => onHeal(token, quickAmount)}>
          {Icon('heart', { size: 11 })} Heal
        </button>
        <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled title="Condition picker is not wired to an existing event yet." type="button" style={{ justifyContent: 'center' }}>{Icon('sparkles', { size: 11 })} Condition</button>
        <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled title="Statblock view is not wired yet." type="button" style={{ justifyContent: 'center' }}>{Icon('eye', { size: 11 })} Statblock</button>
      </div>
    </div>
  );
}

function MiniStat({ label, v }: { label: string; v: string | number }) {
  return (
    <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-soft)', borderRadius: 5, padding: '6px 4px', textAlign: 'center' }}>
      <div className="fw-eyebrow" style={{ fontSize: 9 }}>{label}</div>
      <div className="fw-display" style={{ fontSize: 14, color: 'var(--gold-bright)' }}>{v}</div>
    </div>
  );
}

/* ── Turn HUD ────────────────────────────────────────────────────────────────── */

function TurnHUD({ isYourTurn, current, actionState, onAction, onAttack, onBlast, onHex, onBonus, onDash, onEndTurn }: {
  isYourTurn: boolean;
  current: CombatToken | undefined;
  actionState: ActionBudget;
  onAction: () => void;
  onAttack: () => void;
  onBlast: () => void;
  onHex: () => void;
  onBonus: () => void;
  onDash: () => void;
  onEndTurn: () => void;
}) {
  if (!isYourTurn) {
    return (
      <div className="fw-turn-hud not-yours">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 12, height: 12, borderRadius: 50, background: current?.foe ? 'var(--blood-bright)' : 'var(--success)' }} />
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Now Acting</div>
            <div className="fw-display" style={{ fontSize: 16, color: 'var(--text)' }}>{current?.name}</div>
          </div>
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--text-3)', fontSize: 13 }}>
            {current?.foe ? 'Hold breath. The Reeve does not blink.' : 'Wait for your turn.'}
          </span>
        </div>
      </div>
    );
  }

  const moveLeft = 30 - actionState.moveUsed;
  return (
    <div className="fw-turn-hud yours">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flexShrink: 0 }}>
          <div className="fw-eyebrow" style={{ color: 'var(--gold)', marginBottom: 2 }}>YOUR TURN</div>
          <div className="fw-display" style={{ fontSize: 18, color: 'var(--text)' }}>{current?.name ?? 'You'}</div>
        </div>

        <div className="fw-action-budget">
          <BudgetSlot label="Action"   used={actionState.action}   icon="sword"  />
          <BudgetSlot label="Bonus"    used={actionState.bonus}    icon="zap"    gold />
          <BudgetSlot label="Reaction" used={actionState.reaction} icon="shield" />
          <div className="fw-budget-move">
            <div className="fw-eyebrow" style={{ fontSize: 9 }}>Move</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="fw-mono" style={{ fontSize: 13, color: moveLeft > 0 ? 'var(--gold-bright)' : 'var(--text-3)' }}>{moveLeft}</span>
              <span style={{ fontSize: 10, color: 'var(--text-4)' }}>/ 30 ft</span>
            </div>
            <div style={{ height: 3, background: 'var(--bg-deep)', borderRadius: 50, marginTop: 3 }}>
              <div style={{ height: '100%', width: (moveLeft / 30) * 100 + '%', background: 'var(--gold-bright)', borderRadius: 50 }} />
            </div>
          </div>
        </div>

        <span style={{ flex: 1 }} />

        <div className="fw-quick-actions">
          <button className="fw-btn fw-btn-gold" disabled={actionState.action} onClick={onAttack} type="button">
            {Icon('flame', { size: 12 })} Attack <span className="fw-mini-cost">1A</span>
          </button>
          <button className="fw-btn fw-btn-arcane" disabled={actionState.action} onClick={onBlast} type="button">
            {Icon('flame', { size: 12 })} Blast <span className="fw-mini-cost">1A</span>
          </button>
          <button className="fw-btn fw-btn-ghost" disabled={actionState.bonus} onClick={onHex} type="button">
            {Icon('skull', { size: 12 })} Hex <span className="fw-mini-cost">1BA</span>
          </button>
          <button className="fw-btn fw-btn-ghost" disabled={actionState.action} onClick={onDash}>
            {Icon('arrowR', { size: 12 })} Dash
          </button>
          <button className="fw-btn fw-btn-ghost" disabled={actionState.action} onClick={onAction}>
            {Icon('shield', { size: 12 })} Dodge
          </button>
          <button className="fw-btn fw-btn-ghost" disabled title="More combat actions are not wired yet." type="button">{Icon('kebab', { size: 12 })}</button>
        </div>

        <button className="fw-btn fw-btn-blood fw-btn-lg" onClick={onEndTurn}>
          End Turn {Icon('chevR', { size: 12 })}
        </button>
      </div>
    </div>
  );
}

function BudgetSlot({ label, used, icon, gold }: { label: string; used: boolean; icon: string; gold?: boolean }) {
  return (
    <div className={'fw-budget-slot ' + (used ? 'spent' : '')}>
      <div className="fw-eyebrow" style={{ fontSize: 9 }}>{label}</div>
      <span style={{ color: used ? 'var(--text-4)' : gold ? 'var(--gold-bright)' : 'var(--gold)' }}>
        {used ? Icon('x', { size: 14 }) : Icon(icon, { size: 14 })}
      </span>
    </div>
  );
}

/* ── Flow Modal Shell ────────────────────────────────────────────────────────── */

function FlowModal({ title, accent, onClose, children }: {
  title: string;
  accent: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fw-flow-overlay" onClick={onClose}>
      <div className={'fw-flow-modal accent-' + accent} onClick={e => e.stopPropagation()}>
        <div className="fw-flow-head">
          <div className="fw-display" style={{ fontSize: 16, color: 'var(--text)' }}>{title}</div>
          <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" onClick={onClose}>{Icon('x', { size: 12 })}</button>
        </div>
        <div className="fw-flow-body">{children}</div>
      </div>
    </div>
  );
}

/* ── Attack Flow ─────────────────────────────────────────────────────────────── */

function AttackFlow({ flow, setFlow, tokens, setTokens, actionState, setActionState, onChange, onApplyDamage }: {
  flow: Extract<FlowState, { kind: 'attack' }>;
  setFlow: (f: FlowState) => void;
  tokens: CombatToken[];
  setTokens: React.Dispatch<React.SetStateAction<CombatToken[]>>;
  actionState: ActionBudget;
  setActionState: React.Dispatch<React.SetStateAction<ActionBudget>>;
  onChange?: (c: CombatChange) => void;
  onApplyDamage?: (target: CombatToken, amount: number, source: string) => void;
}) {
  const [step,      setStep]      = useState<'target' | 'hit' | 'damage'>('target');
  const [target,    setTarget]    = useState<CombatToken | null>(null);
  const [hitRoll,   setHitRoll]   = useState<HitRoll | null>(null);
  const [advantage, setAdvantage] = useState<'normal' | 'adv' | 'dis'>('normal');
  const [dmgRoll,   setDmgRoll]   = useState<DmgRoll | null>(null);

  const foes = tokens.filter(t => t.foe && !t.down);

  const rollHit = () => {
    const r1 = 1 + Math.floor(Math.random() * 20);
    const r2 = 1 + Math.floor(Math.random() * 20);
    const used = advantage === 'adv' ? Math.max(r1, r2) : advantage === 'dis' ? Math.min(r1, r2) : r1;
    setHitRoll({ raw: used, total: used + flow.weapon.toHit, all: [r1, r2], crit: used === 20, fumble: used === 1 });
    setStep('hit');
  };

  const rollDmg = () => {
    const d1 = 1 + Math.floor(Math.random() * 8);
    const d2 = hitRoll?.crit ? 1 + Math.floor(Math.random() * 8) : 0;
    setDmgRoll({ dice: [d1, d2].filter(Boolean), bonus: 4, total: d1 + d2 + 4 });
    setStep('damage');
  };

  const apply = () => {
    if (!target || !dmgRoll) return;
    setTokens(ts => ts.map(t => t.id === target.id ? { ...t, hp: Math.max(0, t.hp - dmgRoll.total) } : t));
    setActionState(a => ({ ...a, action: true }));
    onApplyDamage?.(target, dmgRoll.total, flow.weapon.n) ?? onChange?.({ kind: 'damage', target: target.name, amount: dmgRoll.total, source: flow.weapon.n });
    setFlow(null);
  };

  const hit = !!(hitRoll && target && hitRoll.total >= target.ac);

  return (
    <FlowModal title={`Attack · ${flow.weapon.n}`} onClose={() => setFlow(null)} accent="blood">
      {step === 'target' && (
        <>
          <p className="fw-serif" style={{ fontStyle: 'italic', color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.55 }}>
            Pick a target. The staff burns warm in your palm.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
            {foes.map(f => (
              <button key={f.id} className="fw-btn fw-btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', padding: 10, borderColor: target?.id === f.id ? 'var(--blood)' : 'var(--border-soft)', background: target?.id === f.id ? 'rgba(153,27,27,0.10)' : 'transparent' }}
                onClick={() => setTarget(f)}>
                <span className="fw-avatar sm" style={{ background: `linear-gradient(135deg, ${f.color}44, #15101f)`, fontSize: 9 }}>
                  {f.name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()}
                </span>
                <span style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{f.name}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--f-mono)' }}>HP {f.hp}/{f.hpMax} · AC {f.ac}</div>
                </span>
                {target?.id === f.id && <span className="fw-pill blood">Selected</span>}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="fw-eyebrow">Roll</span>
            {(['normal', 'adv', 'dis'] as const).map(a => (
              <button key={a} className={'fw-btn fw-btn-sm ' + (advantage === a ? '' : 'fw-btn-ghost')}
                onClick={() => setAdvantage(a)}
                style={advantage === a ? { borderColor: 'var(--gold-deep)', color: 'var(--gold-bright)', background: 'rgba(214,168,79,0.08)' } : undefined}>
                {a === 'normal' ? 'Normal' : a === 'adv' ? 'Advantage' : 'Disadvantage'}
              </button>
            ))}
          </div>
          <div className="fw-flow-foot">
            <button className="fw-btn fw-btn-ghost" onClick={() => setFlow(null)}>Cancel</button>
            <button className="fw-btn fw-btn-blood" onClick={rollHit} disabled={!target}>
              {Icon('dice', { size: 12 })} Roll d20 + {flow.weapon.toHit}
            </button>
          </div>
        </>
      )}

      {step === 'hit' && hitRoll && (
        <>
          <div style={{ textAlign: 'center', padding: 18 }}>
            <div className="fw-eyebrow" style={{ marginBottom: 8 }}>To Hit · vs AC {target?.ac}</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 8 }}>
              <span className="fw-display" style={{ fontSize: 48, color: hitRoll.crit ? 'var(--gold-bright)' : hitRoll.fumble ? 'var(--blood-bright)' : 'var(--text)' }}>{hitRoll.raw}</span>
              <span style={{ fontSize: 18, color: 'var(--text-3)' }}>+ {flow.weapon.toHit} =</span>
              <span className="fw-display" style={{ fontSize: 48, color: hit ? 'var(--success)' : 'var(--blood-bright)' }}>{hitRoll.total}</span>
            </div>
            {advantage !== 'normal' && (
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--f-mono)', marginTop: 6 }}>
                {advantage === 'adv' ? 'Advantage' : 'Disadvantage'} · rolls [{hitRoll.all.join(', ')}]
              </div>
            )}
            <div style={{ marginTop: 12, fontSize: 14, fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: hitRoll.crit ? 'var(--gold-bright)' : hit ? '#86EFAC' : '#FCA5A5' }}>
              {hitRoll.crit ? 'Critical hit. Brass cracks.' : hit ? `Hit. ${target?.name} reels.` : hitRoll.fumble ? 'Natural one. The staff falters.' : 'Miss. The blow goes wide.'}
            </div>
          </div>
          <div className="fw-flow-foot">
            <button className="fw-btn fw-btn-ghost" onClick={() => setStep('target')}>Re-target</button>
            {hit ? (
              <button className="fw-btn fw-btn-blood" onClick={rollDmg}>
                {Icon('dice', { size: 12 })} Roll {hitRoll.crit ? '2d8 + 4' : '1d8 + 4'} damage
              </button>
            ) : (
              <button className="fw-btn fw-btn-blood" onClick={() => { setActionState(a => ({ ...a, action: true })); setFlow(null); }}>
                Commit miss
              </button>
            )}
          </div>
        </>
      )}

      {step === 'damage' && dmgRoll && (
        <>
          <div style={{ textAlign: 'center', padding: 18 }}>
            <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Damage · fire</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 8 }}>
              {dmgRoll.dice.map((d, i) => <span key={i} className="fw-display" style={{ fontSize: 36, color: 'var(--gold-bright)' }}>{d}</span>)}
              <span style={{ fontSize: 18, color: 'var(--text-3)' }}>+ {dmgRoll.bonus} =</span>
              <span className="fw-display" style={{ fontSize: 48, color: 'var(--blood-bright)' }}>{dmgRoll.total}</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--text-2)' }}>
              {target?.name} drops to <b style={{ color: 'var(--text)', fontStyle: 'normal' }}>{Math.max(0, (target?.hp ?? 0) - dmgRoll.total)} / {target?.hpMax}</b>
            </div>
          </div>
          <div className="fw-flow-foot">
            <button className="fw-btn fw-btn-ghost" onClick={() => setFlow(null)}>Cancel</button>
            <button className="fw-btn fw-btn-gold fw-btn-lg" onClick={apply}>
              {Icon('check', { size: 13 })} Apply {dmgRoll.total} fire damage
            </button>
          </div>
        </>
      )}
    </FlowModal>
  );
}

/* ── Spell Cast Flow ─────────────────────────────────────────────────────────── */

function SpellCastFlow({ flow, setFlow, tokens, setTokens, actionState, setActionState, onChange, onApplyDamage, onApplyCondition }: {
  flow: Extract<FlowState, { kind: 'spell' }>;
  setFlow: (f: FlowState) => void;
  tokens: CombatToken[];
  setTokens: React.Dispatch<React.SetStateAction<CombatToken[]>>;
  actionState: ActionBudget;
  setActionState: React.Dispatch<React.SetStateAction<ActionBudget>>;
  onChange?: (c: CombatChange) => void;
  onApplyDamage?: (target: CombatToken, amount: number, source: string) => void;
  onApplyCondition?: (target: CombatToken, condition: string) => void;
}) {
  const [step,   setStep]   = useState<'target' | 'result'>('target');
  const [target, setTarget] = useState<CombatToken | null>(null);
  const [slot,   setSlot]   = useState('4');
  const [result, setResult] = useState<SpellResult | null>(null);
  const isHex   = !!flow.spell.curse;
  const foes    = tokens.filter(t => t.foe && !t.down);

  const rollAttack = () => {
    if (!target) return;
    const beams = isHex ? 1 : 2;
    const rolls = Array.from({ length: beams }, () => {
      const r = 1 + Math.floor(Math.random() * 20);
      const total = r + (flow.spell.toHit ?? 7);
      const hit = total >= target.ac;
      const dmg = hit ? (1 + Math.floor(Math.random() * 10)) + 4 + (r === 20 ? 1 + Math.floor(Math.random() * 10) : 0) : 0;
      return { r, total, hit, dmg, crit: r === 20 };
    });
    setResult({ rolls, totalDmg: rolls.reduce((a, b) => a + b.dmg, 0) });
    setStep('result');
  };

  const apply = () => {
    if (!target) return;
    if (isHex) {
      setTokens(ts => ts.map(t => t.id === target.id ? { ...t, conditions: [...(t.conditions ?? []), { k: 'Cursed (Hex)', bad: true }] } : t));
      setActionState(a => ({ ...a, bonus: true }));
      onApplyCondition?.(target, 'Cursed (Hex)') ?? onChange?.({ kind: 'condition', target: target.name, condition: 'Cursed (Hex)' });
    } else {
      setTokens(ts => ts.map(t => t.id === target.id ? { ...t, hp: Math.max(0, t.hp - (result?.totalDmg ?? 0)) } : t));
      setActionState(a => ({ ...a, action: true }));
      onApplyDamage?.(target, result?.totalDmg ?? 0, flow.spell.n) ?? onChange?.({ kind: 'damage', target: target.name, amount: result?.totalDmg, source: flow.spell.n });
    }
    setFlow(null);
  };

  return (
    <FlowModal title={`Cast · ${flow.spell.n}`} onClose={() => setFlow(null)} accent="arcane">
      {step === 'target' && (
        <>
          <div style={{ display: 'flex', gap: 10, padding: 12, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, marginBottom: 14 }}>
            <span style={{ width: 36, height: 36, borderRadius: 50, background: 'rgba(124,58,237,0.18)', border: '1px solid var(--arcane)', display: 'grid', placeItems: 'center', color: 'var(--arcane-bright)' }}>
              {Icon('flame', { size: 16 })}
            </span>
            <div style={{ flex: 1 }}>
              <div className="fw-display" style={{ fontSize: 14, color: 'var(--text)' }}>{flow.spell.n}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', fontFamily: 'var(--f-mono)' }}>
                Level {flow.spell.lvl} · {flow.spell.cost} · {isHex ? '1d6 necrotic on hit, 1h conc' : 'Spell atk +7 · 2 beams · 1d10+4 force each'}
              </div>
            </div>
          </div>

          {!isHex && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
              <span className="fw-eyebrow">Cast at</span>
              <span className="fw-pill" style={{ background: 'rgba(124,58,237,0.18)', borderColor: 'var(--arcane)', color: 'var(--arcane-bright)' }}>Cantrip · no slot</span>
            </div>
          )}
          {isHex && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
              <span className="fw-eyebrow">Slot</span>
              <button className={'fw-btn fw-btn-sm ' + (slot === '4' ? '' : 'fw-btn-ghost')} onClick={() => setSlot('4')}
                style={slot === '4' ? { background: 'rgba(124,58,237,0.15)', borderColor: 'var(--arcane)', color: 'var(--arcane-bright)' } : undefined}>
                Pact slot · Lv 4 (1 of 2)
              </button>
            </div>
          )}

          <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Target</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {foes.map(f => (
              <button key={f.id} className="fw-btn fw-btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', padding: 10, borderColor: target?.id === f.id ? 'var(--arcane)' : 'var(--border-soft)', background: target?.id === f.id ? 'rgba(124,58,237,0.10)' : 'transparent' }}
                onClick={() => setTarget(f)}>
                <span className="fw-avatar sm" style={{ background: `linear-gradient(135deg, ${f.color}44, #15101f)`, fontSize: 9 }}>
                  {f.name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()}
                </span>
                <span style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{f.name}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--f-mono)' }}>HP {f.hp}/{f.hpMax} · AC {f.ac}</div>
                </span>
                {target?.id === f.id && <span className="fw-pill" style={{ background: 'rgba(124,58,237,0.18)', borderColor: 'var(--arcane)', color: 'var(--arcane-bright)' }}>Selected</span>}
              </button>
            ))}
          </div>

          <div className="fw-flow-foot">
            <button className="fw-btn fw-btn-ghost" onClick={() => setFlow(null)}>Cancel</button>
            {isHex ? (
              <button className="fw-btn fw-btn-arcane" disabled={!target} onClick={() => { setResult({ curse: true }); setStep('result'); }}>
                {Icon('skull', { size: 12 })} Place curse
              </button>
            ) : (
              <button className="fw-btn fw-btn-arcane" disabled={!target} onClick={rollAttack}>
                {Icon('dice', { size: 12 })} Roll 2 beams · +7 each
              </button>
            )}
          </div>
        </>
      )}

      {step === 'result' && result && (
        <>
          {result.curse ? (
            <div style={{ textAlign: 'center', padding: 22 }}>
              <div style={{ color: 'var(--arcane-bright)', fontSize: 36, marginBottom: 12 }}>{Icon('skull', { size: 36 })}</div>
              <div className="fw-display" style={{ fontSize: 20, color: 'var(--text)', marginBottom: 6 }}>{target?.name} is Cursed</div>
              <div className="fw-serif" style={{ fontStyle: 'italic', color: 'var(--text-2)', fontSize: 14, lineHeight: 1.5 }}>
                On each of your hits, 1d6 necrotic. Disadvantage on chosen ability checks.<br />Concentration · until rest or death.
              </div>
            </div>
          ) : (
            <div style={{ padding: 18 }}>
              <div className="fw-eyebrow" style={{ textAlign: 'center', marginBottom: 12 }}>Beams · vs AC {target?.ac}</div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                {result.rolls?.map((r, i) => (
                  <div key={i} style={{ flex: 1, maxWidth: 180, padding: 12, background: r.hit ? 'rgba(34,197,94,0.06)' : 'rgba(153,27,27,0.06)', border: '1px solid ' + (r.hit ? 'rgba(34,197,94,0.35)' : 'rgba(153,27,27,0.35)'), borderRadius: 8, textAlign: 'center' }}>
                    <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Beam {i + 1}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 6 }}>
                      <span className="fw-display" style={{ fontSize: 22, color: r.crit ? 'var(--gold-bright)' : 'var(--text)' }}>{r.r}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-4)' }}>+7</span>
                      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>=</span>
                      <span className="fw-display" style={{ fontSize: 22, color: r.hit ? 'var(--success)' : 'var(--blood-bright)' }}>{r.total}</span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 11, color: r.hit ? '#86EFAC' : '#FCA5A5', fontFamily: 'var(--f-serif)', fontStyle: 'italic' }}>
                      {r.crit ? 'Critical.' : r.hit ? `Hit · ${r.dmg} force` : 'Miss'}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, padding: 12, background: 'var(--bg-deep)', borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Total damage</span>
                <div className="fw-display" style={{ fontSize: 32, color: 'var(--blood-bright)' }}>{result.totalDmg}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--f-serif)', fontStyle: 'italic', marginTop: 2 }}>
                  {target?.name} → <b style={{ color: 'var(--text)', fontStyle: 'normal' }}>{Math.max(0, (target?.hp ?? 0) - (result.totalDmg ?? 0))} / {target?.hpMax}</b>
                </div>
              </div>
            </div>
          )}
          <div className="fw-flow-foot">
            <button className="fw-btn fw-btn-ghost" onClick={() => setFlow(null)}>Cancel</button>
            <button className="fw-btn fw-btn-gold fw-btn-lg" onClick={apply}>
              {Icon('check', { size: 13 })} Commit
            </button>
          </div>
        </>
      )}
    </FlowModal>
  );
}
