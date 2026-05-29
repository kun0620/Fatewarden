import {
  Archive,
  Bone,
  CircleHelp,
  Coins,
  Compass,
  Crown,
  Dice2,
  Feather,
  Flame,
  FlaskConical,
  Hammer,
  Map as MapIcon,
  Moon,
  Plus,
  Scroll,
  Settings,
  Shield,
  ShoppingBag,
  Skull,
  Sparkles,
  Sword,
  type LucideIcon,
} from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useGameStore } from '../../store/useGameStore';
import type { RunCombatant, RunFloor, RunNode, RunState } from '../../engine/run/runTypes';

interface RunMapScreenProps {
  createNodeVote?: (nodes: RunNode[]) => unknown;
  isCoOp?: boolean;
  onNodeSelect: (nodeId: string) => void;
}

interface NodePosition {
  x: number;
  y: number;
}

interface RunEdge {
  from: RunNode;
  to: RunNode;
}

const ICONS: Record<string, LucideIcon> = {
  anvil: Hammer,
  bag: ShoppingBag,
  bones: Bone,
  campfire: Flame,
  chest: Archive,
  coin: Coins,
  compass: Compass,
  crownSkull: Crown,
  dice2: Dice2,
  feather: Feather,
  flame: Flame,
  hammer: Hammer,
  map: MapIcon,
  moon: Moon,
  plus: Plus,
  potion: FlaskConical,
  question: CircleHelp,
  refresh: Sparkles,
  rune: Sparkles,
  scroll: Scroll,
  settings: Settings,
  shield: Shield,
  skull: Skull,
  sword: Sword,
};

const FALLBACK_NODE_LABELS: Record<string, string> = {
  combat: 'Skirmish',
  elite: 'Elite',
  boss: 'Floor Boss',
  rest: 'Camp',
  shop: 'Bazaar',
  treasure: 'Treasure',
  mystery: 'Mystery',
  forge: 'Forge',
  gamble: 'Gamble',
};

const NODE_ICONS: Record<RunNode['type'], string> = {
  combat: '⚔️',
  elite: '💀',
  boss: '👁',
  rest: '🏕',
  shop: '🛒',
  treasure: '💎',
  mystery: '🌀',
  forge: '🔨',
  gamble: '🎲',
};

function WIcon(name: string | undefined, options: { size?: number; stroke?: number } = {}): ReactNode {
  if (name && Object.values(NODE_ICONS).includes(name)) {
    return (
      <span style={{ fontSize: options.size ?? 16, lineHeight: 1 }} aria-hidden="true">
        {name}
      </span>
    );
  }
  const Icon = ICONS[name ?? ''] ?? Sparkles;
  return <Icon size={options.size ?? 16} strokeWidth={options.stroke ?? 1.7} aria-hidden="true" />;
}

function WardenSeal({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id="wr-seal-fill-map" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#1a0e2a" />
          <stop offset="100%" stopColor="#050309" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#wr-seal-fill-map)" stroke="#9B5DE5" strokeWidth="0.7" />
      <g stroke="#B8860B" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 22 l16 -10 l16 10" />
        <path d="M16 32 l16 -10 l16 10" strokeOpacity="0.7" />
        <path d="M16 42 l16 -10 l16 10" strokeOpacity="0.45" />
        <path d="M16 52 l16 -10 l16 10" strokeOpacity="0.25" />
      </g>
      <circle cx="32" cy="14" r="2" fill="#D4A028" />
    </svg>
  );
}

function PortraitArt({ kind, color }: { kind?: string; color?: string }) {
  const tint = color ?? '#9B5DE5';
  const label = (kind ?? '?').slice(0, 2).toUpperCase();

  return (
    <svg viewBox="0 0 100 130" preserveAspectRatio="xMidYMax meet" width="100%" height="100%" aria-hidden="true">
      <defs>
        <radialGradient id={`wr-portrait-aura-${label}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={tint} stopOpacity="0.5" />
          <stop offset="100%" stopColor={tint} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`wr-portrait-fig-${label}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1428" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#0a0612" stopOpacity="0.96" />
          <stop offset="100%" stopColor="#050309" stopOpacity="1" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="60" r="50" fill={`url(#wr-portrait-aura-${label})`} />
      <g stroke={tint} strokeWidth="0.8" fill="none" opacity="0.55">
        <circle cx="50" cy="38" r="18" />
        <path d="M32 38h36 M50 18v40" />
      </g>
      <path
        fill={`url(#wr-portrait-fig-${label})`}
        d="M50 30 a10 10 0 1 1 0.1 0 M30 130 v-20 c0-12 6-20 14-24 c-1-3 0-5 3-6 h6 c3 1 4 3 3 6 c8 4 14 12 14 24 v20 z"
      />
    </svg>
  );
}

function getActiveFloor(runState: RunState): RunFloor | null {
  return runState.floors.find((floor) => floor.floorNumber === runState.currentFloor) ?? runState.floors[0] ?? null;
}

function getNodeInfo(runState: RunState, node: RunNode) {
  const displayType = node.displayType ?? node.type;
  const nodeInfo = runState.nodeInfo?.[displayType] ?? {
    label: node.label ?? FALLBACK_NODE_LABELS[node.type] ?? node.type,
    color: '',
    blurb: node.blurb ?? 'Advance deeper into the run.',
  };
  return {
    ...nodeInfo,
    icon: NODE_ICONS[node.type] ?? node.icon ?? 'question',
  };
}

function buildEdges(floor: RunFloor): RunEdge[] {
  const byId = new Map(floor.nodes.map((node) => [node.id, node]));
  return floor.nodes.flatMap((node) =>
    node.connectedTo
      .map((targetId) => byId.get(targetId))
      .filter((target): target is RunNode => target !== undefined)
      .map((target) => ({ from: node, to: target })),
  );
}

function getNodeCol(node: RunNode, floor: RunFloor) {
  const rowNodes = floor.nodes.filter((item) => item.row === node.row);
  const index = rowNodes.findIndex((item) => item.id === node.id);
  return index >= 0 ? index : node.col;
}

function getNodeX(node: RunNode, floor: RunFloor) {
  if (typeof node.x === 'number') return node.x * 100;
  const rowNodes = floor.nodes.filter((item) => item.row === node.row);
  if (rowNodes.length <= 1) return 50;
  const index = getNodeCol(node, floor);
  return ((index + 1) / (rowNodes.length + 1)) * 100;
}

function buildPositionOf(floor: RunFloor, totalH: number, rowH: number) {
  return (node: RunNode): NodePosition => ({
    x: getNodeX(node, floor),
    y: totalH - 80 - node.row * rowH,
  });
}

function RunTopBar({ runState }: { runState: RunState }) {
  const totalFloors = runState.depth ?? Math.max(runState.floors.length, runState.currentFloor);

  return (
    <div className="wr-topbar">
      <div className="wr-topbar-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WardenSeal size={32} />
          <div style={{ lineHeight: 1.05 }}>
            <div className="wr-topbar-floor-label">Warden&apos;s Run</div>
            <div className="wr-topbar-floor-value" style={{ fontSize: 13, letterSpacing: '0.16em' }}>
              Run <b style={{ color: 'var(--wr-gold-bright)' }}>#{runState.runNumber ?? 1}</b>
            </div>
          </div>
        </div>

        <div className="wr-topbar-divider" />

        <div className="wr-topbar-floor">
          <span className="wr-topbar-floor-label">Stratum</span>
          <span className="wr-topbar-floor-value">
            <b>{runState.currentFloor}</b> / {totalFloors}
          </span>
        </div>
      </div>

      <div className="wr-topbar-divider" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
        <span className="wr-eyebrow" style={{ flexShrink: 0 }}>Relics</span>
        <div className="wr-relics">
          {runState.relics.map((relic) => (
            <div key={relic.id} className={`wr-relic ${relic.rarity ?? ''}`} title={`${relic.name} - ${relic.description}`}>
              {WIcon(relic.icon, { size: 16, stroke: 1.5 })}
              {typeof relic.count === 'number' && relic.count > 1 && <span className="wr-relic-count">{relic.count}</span>}
            </div>
          ))}
          <button className="wr-relic" style={{ borderStyle: 'dashed', color: 'var(--wr-text-4)', background: 'transparent' }} title="Empty slot" type="button">
            {WIcon('plus', { size: 12 })}
          </button>
        </div>
      </div>

      <div className="wr-topbar-divider" />

      <div className="wr-topbar-floor">
        <span className="wr-topbar-floor-label">Warden Pts</span>
        <span className="wr-topbar-floor-value" style={{ color: 'var(--wr-violet-bright)', fontSize: 13 }}>
          {runState.wardenPointsEarned.toLocaleString()}
        </span>
      </div>

      <div className="wr-gold-display">
        <span className="wr-gold-coin">G</span>
        <span className="wr-gold-amount">{runState.gold}</span>
      </div>

      <button className="wr-btn wr-btn-icon wr-btn-ghost wr-btn-sm" title="Run options" type="button">
        {WIcon('settings', { size: 14 })}
      </button>
    </div>
  );
}

function PartyStrip({ party }: { party: RunCombatant[] }) {
  if (!party.length) return null;

  return (
    <div className="wr-party-strip">
      {party.map((member) => {
        const pct = member.hpMax > 0 ? Math.max(0, Math.min(100, (member.hp / member.hpMax) * 100)) : 0;
        const low = pct < 30 && pct > 0;
        return (
          <div key={member.id} className={`wr-party-mini${member.down ? ' down' : ''}`}>
            <div className="wr-party-mini-portrait">
              <PortraitArt kind={member.portrait} color={member.color} />
            </div>
            <div className="wr-party-mini-info">
              <div className="wr-party-mini-name">
                {member.name}
                {member.you && <span style={{ color: 'var(--wr-gold-bright)', marginLeft: 4, fontSize: 9 }}>YOU</span>}
              </div>
              <div className="wr-party-mini-class">{member.className}{member.down ? ' - fallen' : ''}</div>
            </div>
            <div className="wr-party-mini-hp">
              <div className="wr-hpbar">
                <span className={`wr-hpbar-fill${low ? ' low' : ''}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="wr-party-mini-hp-num"><b>{member.hp}</b>/{member.hpMax}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MapLegend({ runState }: { runState: RunState }) {
  const items: Array<RunNode['type']> = ['combat', 'elite', 'boss', 'rest', 'shop', 'treasure', 'mystery', 'forge', 'gamble'];

  return (
    <div style={{
      marginTop: 32,
      padding: '12px 16px',
      maxWidth: 720,
      marginLeft: 'auto',
      marginRight: 'auto',
      background: 'linear-gradient(180deg, rgba(40, 26, 54, 0.6), rgba(20, 9, 31, 0.7))',
      border: '1px solid var(--wr-edge)',
      borderRadius: 3,
    }}>
      <div className="wr-eyebrow" style={{ textAlign: 'center', marginBottom: 8 }}>Legend - Stratum Glyphs</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px 10px' }}>
        {items.map((type) => {
          const info = runState.nodeInfo?.[type] ?? {
            icon: 'question',
            label: FALLBACK_NODE_LABELS[type],
            color: '',
            blurb: '',
          };
          return (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: '1px solid var(--wr-edge)',
                background: 'var(--wr-bg-deep)',
                display: 'grid',
                placeItems: 'center',
                color: type === 'boss' || type === 'elite'
                  ? 'var(--wr-blood-bright)'
                  : type === 'shop' || type === 'mystery' || type === 'gamble'
                    ? 'var(--wr-violet-bright)'
                    : 'var(--wr-gold-bright)',
              }}>
                {WIcon(info.icon, { size: 13 })}
              </span>
              <span style={{ fontFamily: 'var(--wr-f-head)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--wr-text-2)', textTransform: 'uppercase' }}>{info.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DepthRail({ floor, depth }: { floor: number; depth: number }) {
  const stepCount = Math.max(1, depth);

  return (
    <div style={{
      position: 'absolute',
      right: 10,
      top: 24,
      bottom: 24,
      width: 36,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      pointerEvents: 'none',
      zIndex: 5,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'var(--wr-bg-deep)',
          border: '1px solid var(--wr-blood)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--wr-blood-bright)',
        }}>
          {WIcon('skull', { size: 12 })}
        </div>
        <span style={{ fontFamily: 'var(--wr-f-head)', fontSize: 8, letterSpacing: '0.2em', color: 'var(--wr-text-3)', writingMode: 'vertical-rl', textOrientation: 'mixed', textTransform: 'uppercase' }}>Depths</span>
      </div>

      <div style={{
        flex: 1,
        width: 2,
        margin: '12px 0',
        background: 'linear-gradient(180deg, var(--wr-blood-deep), var(--wr-gold-deep))',
        position: 'relative',
      }}>
        {Array.from({ length: stepCount + 1 }).map((_, i) => {
          const isCurrent = stepCount - i === floor;
          return (
            <div key={i} style={{
              position: 'absolute',
              left: '50%',
              top: `${(i / stepCount) * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: isCurrent ? 14 : 6,
              height: isCurrent ? 14 : 6,
              borderRadius: '50%',
              background: isCurrent ? 'var(--wr-gold-bright)' : stepCount - i < floor ? 'var(--wr-edge-hi)' : 'var(--wr-gold-deep)',
              boxShadow: isCurrent ? '0 0 12px var(--wr-gold-bright)' : 'none',
              border: isCurrent ? '1px solid var(--wr-bg)' : '0',
            }} />
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <span style={{ fontFamily: 'var(--wr-f-head)', fontSize: 8, letterSpacing: '0.2em', color: 'var(--wr-text-3)', writingMode: 'vertical-rl', textOrientation: 'mixed', textTransform: 'uppercase' }}>Surface</span>
        <div style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'var(--wr-bg-deep)',
          border: '1px solid var(--wr-gold-deep)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--wr-gold-bright)',
        }}>
          {WIcon('compass', { size: 12 })}
        </div>
      </div>
    </div>
  );
}

export function RunMapScreen({ createNodeVote, isCoOp = false, onNodeSelect }: RunMapScreenProps) {
  const runState = useGameStore((state) => state.runState);
  const activeCharacter = useGameStore((state) => state.activeCharacter);
  const selectNode = useGameStore((state) => state.selectNode);
  const [hovered, setHovered] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const party = useMemo<RunCombatant[]>(() => {
    if (runState?.party?.length) return runState.party;
    if (!activeCharacter) return [];
    return [{
      id: activeCharacter.id,
      name: activeCharacter.name,
      className: activeCharacter.className,
      portrait: activeCharacter.className.toLowerCase(),
      color: '#9B5DE5',
      hp: activeCharacter.hitPoints,
      hpMax: activeCharacter.maxHitPoints,
      pos: 1,
      you: true,
      down: activeCharacter.hitPoints <= 0,
      conds: activeCharacter.activeConditions.map((condition) => ({ k: condition, kind: 'debuff' })),
    }];
  }, [activeCharacter, runState?.party]);

  const floor = runState ? getActiveFloor(runState) : null;
  const nodes = floor?.nodes ?? [];
  const edges = floor ? buildEdges(floor) : [];
  const numLayers = nodes.length ? Math.max(...nodes.map((node) => node.row)) + 1 : 1;
  const rowH = 100;
  const totalH = numLayers * rowH + 120;
  const positionOf = floor ? buildPositionOf(floor, totalH, rowH) : null;
  const currentNode = nodes.find((node) => node.status === 'current') ?? nodes.find((node) => node.id === runState?.currentNodeId) ?? null;

  const handleNodeClick = (node: RunNode) => {
    if (!floor || node.status !== 'available') return;

    if (isCoOp) {
      const availableNodes = floor.nodes.filter((item) => item.status === 'available');
      void createNodeVote?.(availableNodes);
      return;
    }

    const result = selectNode(node.id);
    if (!result.error) onNodeSelect(node.id);
  };

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !currentNode || !positionOf) return;
    const { y } = positionOf(currentNode);
    const prev = el.style.scrollBehavior;
    el.style.scrollBehavior = 'auto';
    el.scrollTop = Math.max(0, y - el.clientHeight * 0.5);
    requestAnimationFrame(() => {
      el.style.scrollBehavior = prev;
    });
  }, [currentNode, positionOf]);

  if (!runState || !floor || !positionOf) {
    return (
      <div className="wr-app">
        <div className="wr-atmos" />
        <div className="wr-noise" />
        <div className="wr-vignette" />
        <div className="wr-stage">
          <div className="wr-map-stage">
            <div className="wr-map-scroll">
              <div className="wr-map-canvas wr-screen-in">
                <div className="wr-map-title">
                  <div className="wr-rule"><span className="wr-rule-diamond" /></div>
                  <h1>Warden&apos;s Run</h1>
                  <div className="sub">No active run</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const depth = runState.depth ?? Math.max(runState.floors.length, runState.currentFloor);
  const title = `Stratum ${runState.currentFloor}`;
  const bossLabel = floor.nodes.find((node) => node.id === floor.bossNodeId)?.label ?? 'the guardian';

  return (
    <div className="wr-app">
      <div className="wr-atmos" />
      <div className="wr-noise" />
      <div className="wr-vignette" />

      <RunTopBar runState={runState} />

      <div className="wr-stage">
        <div className="wr-map-stage">
          <div className="wr-map-scroll" ref={scrollRef}>
            <div className="wr-map-canvas wr-screen-in">
              <div className="wr-map-title">
                <div className="wr-rule"><span className="wr-rule-diamond" /></div>
                <h1>{title}</h1>
                <div className="sub">Floor {runState.currentFloor} of {depth} - {bossLabel} waits below</div>
              </div>

              <div className="wr-map-graph" style={{ height: totalH }}>
                <svg className="wr-map-svg" viewBox={`0 0 100 ${totalH}`} preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <pattern id="wr-path-dash" patternUnits="userSpaceOnUse" width="6" height="2">
                      <path d="M 0 1 L 4 1" stroke="rgba(184,134,11,0.45)" strokeWidth="1.2" />
                    </pattern>
                    <linearGradient id="wr-path-avail" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9B5DE5" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#5B2A8C" stopOpacity="0.7" />
                    </linearGradient>
                  </defs>
                  {edges.map(({ from, to }) => {
                    const start = positionOf(from);
                    const end = positionOf(to);
                    const isAvail = from.status === 'current' && to.status === 'available';
                    const isVisited = from.status === 'completed' && to.status === 'completed';
                    const my = (start.y + end.y) / 2;
                    const d = `M ${start.x} ${start.y} C ${start.x} ${my}, ${end.x} ${my}, ${end.x} ${end.y}`;
                    let stroke = 'rgba(58,40,73,0.7)';
                    let sw = 0.4;
                    let dash = '';
                    if (isVisited) {
                      stroke = 'rgba(184,134,11,0.45)';
                      sw = 0.45;
                      dash = '0.6 0.8';
                    }
                    if (isAvail) {
                      stroke = 'url(#wr-path-avail)';
                      sw = 0.7;
                      dash = '';
                    }
                    return (
                      <path
                        key={`${from.id}-${to.id}`}
                        d={d}
                        stroke={stroke}
                        strokeWidth={sw}
                        strokeDasharray={dash}
                        fill="none"
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}
                </svg>

                {nodes.map((node) => {
                  const info = getNodeInfo(runState, node);
                  const isCurrent = node.status === 'current';
                  const isCompleted = node.status === 'completed';
                  const isAvailable = node.status === 'available';
                  const isBoss = node.type === 'boss';
                  const { x, y } = positionOf(node);
                  const classes = ['wr-node'];
                  if (isCurrent) classes.push('current');
                  else if (isAvailable) classes.push('available');
                  else if (isCompleted) classes.push('visited');
                  else classes.push('locked');
                  if (node.type === 'elite') classes.push('elite');
                  if (isBoss) classes.push('boss');

                  return (
                    <button
                      key={node.id}
                      className={classes.join(' ')}
                      style={{ left: `${x}%`, top: y }}
                      disabled={!isAvailable}
                      onMouseEnter={() => setHovered(node.id)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => handleNodeClick(node)}
                      aria-label={info.label}
                      type="button"
                    >
                      <span className="wr-node-disc">
                        {WIcon(info.icon, { size: isBoss ? 36 : 26 })}
                      </span>
                      <span className="wr-node-label">{node.label ?? info.label}</span>

                      {hovered === node.id && (
                        <div className="wr-node-tip">
                          <div style={{ fontFamily: 'var(--wr-f-head)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--wr-bone)', marginBottom: 4 }}>{info.label}</div>
                          <div style={{ fontFamily: 'var(--wr-f-body)', fontStyle: 'italic', fontSize: 13, color: 'var(--wr-text-2)', lineHeight: 1.4 }}>{info.blurb}</div>
                          {isAvailable && (
                            <div style={{ marginTop: 6, fontFamily: 'var(--wr-f-head)', fontSize: 9, letterSpacing: '0.22em', color: 'var(--wr-violet-bright)' }}>
                              Click to advance
                            </div>
                          )}
                          {!isAvailable && !isCompleted && !isCurrent && (
                            <div style={{ marginTop: 6, fontFamily: 'var(--wr-f-head)', fontSize: 9, letterSpacing: '0.22em', color: 'var(--wr-text-4)' }}>
                              Reach via available paths
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <MapLegend runState={runState} />
            </div>
          </div>

          <DepthRail floor={runState.currentFloor} depth={depth} />
        </div>
      </div>

      <PartyStrip party={party} />
    </div>
  );
}

export default RunMapScreen;
