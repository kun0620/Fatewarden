import { Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import type { NodeType, RunCombatant, RunNode, RunState } from '../../engine/run/runTypes';
import { useGameStore } from '../../store/useGameStore';
import { CombatArena } from './CombatArena';
import { EventScreen } from './EventScreen';
import { RestScreen } from './RestScreen';
import { RunMapScreen } from './RunMapScreen';
import { RunSummaryScreen } from './RunSummaryScreen';
import { ShopScreen } from './ShopScreen';
import { TreasureScreen } from './TreasureScreen';
import { PortraitArt, WIcon } from './runVisuals';

function WardenSeal({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id="wr-shell-seal-fill" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#1a0e2a" />
          <stop offset="100%" stopColor="#050309" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#wr-shell-seal-fill)" stroke="#9B5DE5" strokeWidth="0.7" />
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
        <Settings size={14} strokeWidth={1.7} aria-hidden="true" />
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

function RunFrame({
  runState,
  hidePartyStrip,
  children,
}: {
  runState: RunState;
  hidePartyStrip?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="wr-app">
      <div className="wr-atmos" />
      <div className="wr-noise" />
      <div className="wr-vignette" />
      <RunTopBar runState={runState} />
      <div className="wr-stage">{children}</div>
      {!hidePartyStrip && <PartyStrip party={runState.party ?? []} />}
    </div>
  );
}

function getCurrentNode(runState: RunState): RunNode | null {
  const currentFloor = runState.floors[runState.currentFloor - 1]
    ?? runState.floors.find((floor) => floor.floorNumber === runState.currentFloor);
  return currentFloor?.nodes.find((node) => node.id === runState.currentNodeId) ?? null;
}

function isCombatNode(type: NodeType) {
  return type === 'combat' || type === 'elite' || type === 'boss';
}

export function RunShell() {
  const { runState, completeNode, endRun } = useGameStore();

  if (!runState) return null;

  if (runState.status === 'victory' || runState.status === 'defeat') {
    return (
      <RunFrame runState={runState} hidePartyStrip>
        <RunSummaryScreen />
      </RunFrame>
    );
  }

  if (!runState.currentNodeId) {
    return <RunMapScreen onNodeSelect={() => {}} />;
  }

  const currentNode = getCurrentNode(runState);

  if (!currentNode) {
    return <RunMapScreen onNodeSelect={() => {}} />;
  }

  if (isCombatNode(currentNode.type)) {
    return (
      <RunFrame runState={runState} hidePartyStrip>
        <CombatArena
          onCombatEnd={(won) => {
            if (!won) {
              endRun(false);
              return;
            }
            completeNode(currentNode.id, {
              type: 'combat',
              won: true,
              goldEarned: 0,
              enemiesKilled: runState.foes?.filter((foe) => foe.down || foe.hp <= 0).length ?? 0,
            });
          }}
        />
      </RunFrame>
    );
  }

  if (currentNode.type === 'mystery') {
    return (
      <RunFrame runState={runState}>
        <EventScreen />
      </RunFrame>
    );
  }

  if (currentNode.type === 'rest') {
    return (
      <RunFrame runState={runState}>
        <RestScreen />
      </RunFrame>
    );
  }

  if (currentNode.type === 'shop') {
    return (
      <RunFrame runState={runState}>
        <ShopScreen />
      </RunFrame>
    );
  }

  if (currentNode.type === 'treasure') {
    return (
      <RunFrame runState={runState}>
        <TreasureScreen />
      </RunFrame>
    );
  }

  return <RunMapScreen onNodeSelect={() => {}} />;
}

export default RunShell;
