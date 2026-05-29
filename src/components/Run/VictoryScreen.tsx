import { useMemo, useState } from 'react';
import { calculateWPBreakdown, countCompletedNodes, getTotalRoomsCleared, getWardenRank } from '../../engine/run/wpCalculator';
import { useGameStore } from '../../store/useGameStore';
import { MetaProgressionScreen } from './MetaProgressionScreen';
import { WIcon } from './runVisuals';

interface VictoryScreenProps {
  onReturnToMenu?: () => void;
}

export function VictoryScreen({ onReturnToMenu }: VictoryScreenProps) {
  const [showMeta, setShowMeta] = useState(false);
  const { endRun, permanentProgress, runState, setGameMode, startRun } = useGameStore();
  const breakdown = useMemo(() => (runState ? calculateWPBreakdown(runState) : { items: [], total: 0 }), [runState]);

  if (showMeta) {
    return <MetaProgressionScreen onBack={() => setShowMeta(false)} />;
  }

  if (!runState) return null;

  const totalFloors = runState.depth ?? runState.floors.length;
  const roomsCleared = getTotalRoomsCleared(runState);
  const deaths = runState.deadCharacterIds.length;
  const wardenPoints = runState.summary?.wp ?? runState.wardenPointsEarned ?? breakdown.total;
  const totalPoints = permanentProgress.totalPoints + wardenPoints;
  const unlocks = runState.summary?.unlocks ?? [];

  function runAgain() {
    if (!runState) return;
    startRun({
      partyIds: runState.partyCharacterIds,
      positions: runState.partyPositions,
      sessionId: runState.sessionId,
      startingRelic: runState.relics[0]?.id,
    });
  }

  function returnToHearth() {
    if (runState) endRun(true);
    setGameMode('lobby');
    onReturnToMenu?.();
  }

  return (
    <div className="wr-scene wr-screen-in">
      <div className="wr-scene-inner">
        <div className="wr-summary-banner">
          <div className="wr-summary-eyebrow">The Run Endures</div>
          <h1 className="wr-summary-title">V I C T O R Y</h1>
          <div className="wr-summary-subtitle">
            &quot;You bested The Cinder-Reeve.
            <br />
            The fire descends with you.&quot;
          </div>
          <div className="wr-rule" style={{ maxWidth: 360, margin: '16px auto 0' }}>
            <span className="wr-rule-diamond" />
          </div>
        </div>

        <div className="wr-summary-grid">
          <div className="wr-stats-list">
            <div className="wr-stats-head">
              {WIcon('scroll', { size: 13 })}
              <h3>Chronicle of the Run</h3>
            </div>
            <div className="wr-stats-row">
              <span className="label">Floors descended</span>
              <span className="value gold">
                {runState.floorsCleared}/{totalFloors}
              </span>
            </div>
            <div className="wr-stats-row">
              <span className="label">Rooms cleared</span>
              <span className="value">{roomsCleared}</span>
            </div>
            <div className="wr-stats-row">
              <span className="label">Elites slain</span>
              <span className="value">{countCompletedNodes(runState, 'elite')}</span>
            </div>
            <div className="wr-stats-row">
              <span className="label">Deaths</span>
              <span className="value">{deaths}</span>
            </div>
            <div className="wr-stats-row">
              <span className="label">Gold collected</span>
              <span className="value gold">{runState.gold}</span>
            </div>
            <div className="wr-stats-row">
              <span className="label">Enemies slain</span>
              <span className="value">{runState.enemiesKilled}</span>
            </div>
          </div>

          <div className="wr-wp-banner">
            <div className="wr-wp-label">Warden Points Earned</div>
            <div className="wr-wp-value">+{wardenPoints.toLocaleString()}</div>
            <div className="wr-wp-breakdown" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 7 }}>
              {breakdown.items.map((item) => (
                <span key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span>{item.label}</span>
                  <b>+{item.amount}</b>
                </span>
              ))}
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: 'var(--wr-bone)' }}>
                <span>Total</span>
                <b>{totalPoints.toLocaleString()} WP</b>
              </span>
              <span style={{ color: 'var(--wr-gold-bright)' }}>{getWardenRank(totalPoints)}</span>
            </div>
          </div>
        </div>

        {unlocks.length > 0 && (
          <div className="wr-stats-list">
            <div className="wr-stats-head">
              {WIcon('star', { size: 13 })}
              <h3>Unlocks</h3>
            </div>
            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {unlocks.map((unlock) => (
                <div key={unlock.title} className="wr-unlock">
                  <span className="wr-unlock-icon">{WIcon(unlock.icon, { size: 16 })}</span>
                  <div className="wr-unlock-body">
                    <div className="wr-unlock-title">{unlock.title}</div>
                    <div className="wr-unlock-desc">{unlock.description}</div>
                  </div>
                  {unlock.isNew && <span className="wr-unlock-badge">New</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
          <button className="wr-btn wr-btn-violet wr-btn-lg" type="button" onClick={runAgain}>
            {WIcon('refresh', { size: 13 })} Run Again
          </button>
          <button className="wr-btn wr-btn-gold wr-btn-lg" type="button" onClick={() => setShowMeta(true)}>
            {WIcon('rune', { size: 13 })} Warden&apos;s Vault
          </button>
          <button className="wr-btn wr-btn-ghost wr-btn-lg" type="button" onClick={returnToHearth}>
            {WIcon('chevL', { size: 12 })} Hearth
          </button>
        </div>
      </div>
    </div>
  );
}

export default VictoryScreen;
