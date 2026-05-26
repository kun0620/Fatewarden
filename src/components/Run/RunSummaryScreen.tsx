import { useGameStore } from '../../store/useGameStore';
import { WIcon } from './runVisuals';

interface RunSummaryScreenProps {
  onReturnToMenu?: () => void;
}

export function RunSummaryScreen({ onReturnToMenu }: RunSummaryScreenProps) {
  const { runState, startRun, endRun, setGameMode } = useGameStore();
  const isVictory = runState?.status === 'victory';
  const summary = runState?.summary;
  const stats = summary?.stats ?? [
    { l: 'Floors Cleared', v: String(runState?.floorsCleared ?? 0), c: 'gold' },
    { l: 'Enemies Slain', v: String(runState?.enemiesKilled ?? 0), c: 'blood' },
    { l: 'Gold Remaining', v: String(runState?.gold ?? 0), c: 'gold' },
  ];
  const wardenPoints = summary?.wp ?? runState?.wardenPointsEarned ?? 0;
  const floorReached = summary?.floor ?? runState?.currentFloor ?? 1;

  function runAgain() {
    if (!runState) return;
    startRun(runState.partyCharacterIds, runState.partyPositions, runState.sessionId);
  }

  function returnToMenu() {
    if (runState) endRun(runState.status === 'victory');
    setGameMode('lobby');
    onReturnToMenu?.();
  }

  return (
    <div className="wr-scene wr-screen-in">
      <div className="wr-scene-inner">
        <div className={`wr-summary-banner${isVictory ? '' : ' defeat'}`}>
          <div className="wr-summary-eyebrow">{isVictory ? 'The Run Endures' : 'The Wardens Have Fallen'}</div>
          <h1 className="wr-summary-title">{isVictory ? 'VICTORY' : 'DEFEATED'}</h1>
          <div className="wr-summary-subtitle">
            {isVictory
              ? 'You bested the keeper of this stratum. The fire descends with you.'
              : `The run ended on floor ${floorReached}. The fire dies, but the names remember.`}
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
            {stats.map((stat) => (
              <div key={stat.l} className="wr-stats-row">
                <span className="label">{stat.l}</span>
                <span className={`value ${stat.c ?? ''}`}>{stat.v}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="wr-wp-banner">
              <div className="wr-wp-label">Warden Points Earned</div>
              <div className="wr-wp-value">+{wardenPoints}</div>
              <div className="wr-wp-breakdown">
                {(summary?.wpBreakdown ?? [`Floor reached ${floorReached}`, `${runState?.enemiesKilled ?? 0} enemies slain`]).map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>

            {isVictory && (
              <div className="wr-stats-list">
                <div className="wr-stats-head">
                  {WIcon('star', { size: 13 })}
                  <h3>Unlocks</h3>
                </div>
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(summary?.unlocks ?? []).map((unlock) => (
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
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
          <button className="wr-btn wr-btn-violet wr-btn-lg" type="button" onClick={runAgain}>
            {WIcon('refresh', { size: 13 })} Run Again
          </button>
          <button className="wr-btn wr-btn-ghost" type="button" onClick={returnToMenu}>
            {WIcon('chevL', { size: 12 })} Return to Menu
          </button>
        </div>
      </div>
    </div>
  );
}

export default RunSummaryScreen;
