import { useMemo } from 'react';
import { calculateWPBreakdown, getTotalRoomsCleared, getWardenRank } from '../../engine/run/wpCalculator';
import { useGameStore } from '../../store/useGameStore';
import { WIcon } from './runVisuals';

interface DefeatScreenProps {
  onReturnToMenu?: () => void;
}

export function DefeatScreen({ onReturnToMenu }: DefeatScreenProps) {
  const { endRun, permanentProgress, runState, setGameMode, startRun, vaultCharacters } = useGameStore();
  const breakdown = useMemo(() => (runState ? calculateWPBreakdown(runState) : { items: [], total: 0 }), [runState]);

  if (!runState) return null;

  const totalFloors = runState.depth ?? runState.floors.length;
  const roomsCleared = getTotalRoomsCleared(runState);
  const wardenPoints = runState.summary?.wp ?? runState.wardenPointsEarned ?? breakdown.total;
  const totalPoints = permanentProgress.totalPoints + wardenPoints;
  const fallenNames = runState.deadCharacterIds.map((id) => {
    const vaultCharacter = vaultCharacters.find((character) => character.id === id);
    const partyMember = runState.party?.find((member) => member.id === id);
    return vaultCharacter?.name ?? partyMember?.name ?? 'Unknown Warden';
  });

  function tryAgain() {
    if (!runState) return;
    startRun({
      partyIds: runState.partyCharacterIds,
      positions: runState.partyPositions,
      sessionId: runState.sessionId,
      startingRelic: runState.relics[0]?.id,
    });
  }

  function returnToHearth() {
    if (runState) endRun(false);
    setGameMode('lobby');
    onReturnToMenu?.();
  }

  return (
    <div className="wr-scene wr-screen-in">
      <div className="wr-scene-inner">
        <div className="wr-summary-banner defeat">
          <div className="wr-summary-eyebrow">The Dungeon Claims You</div>
          <h1 className="wr-summary-title">D E F E A T E D</h1>
          <div style={{ color: 'var(--wr-blood-bright)', marginTop: 10 }}>{WIcon('skull', { size: 40, stroke: 1.3 })}</div>
          <div className="wr-summary-subtitle">&quot;Another soul claimed by the dark.&quot;</div>
          <div className="wr-rule" style={{ maxWidth: 360, margin: '16px auto 0' }}>
            <span className="wr-rule-diamond" />
          </div>
        </div>

        <div className="wr-summary-grid">
          <div className="wr-stats-list">
            <div className="wr-stats-head">
              {WIcon('scroll', { size: 13 })}
              <h3>Chronicle</h3>
            </div>
            <div className="wr-stats-row">
              <span className="label">Floor reached</span>
              <span className="value gold">
                {runState.currentFloor}/{totalFloors}
              </span>
            </div>
            <div className="wr-stats-row">
              <span className="label">Rooms cleared</span>
              <span className="value">{roomsCleared}</span>
            </div>
            <div className="wr-stats-row">
              <span className="label">Enemies slain</span>
              <span className="value">{runState.enemiesKilled}</span>
            </div>
            <div className="wr-stats-row">
              <span className="label">Deaths</span>
              <span className="value">{runState.deadCharacterIds.length}</span>
            </div>
            <div className="wr-stats-row">
              <span className="label">Cause</span>
              <span className="value">Party wipe</span>
            </div>
            {fallenNames.length > 0 && (
              <div className="wr-stats-row" style={{ alignItems: 'flex-start' }}>
                <span className="label">Fallen wardens</span>
                <span className="value" style={{ display: 'flex', flexDirection: 'column', gap: 5, textAlign: 'right' }}>
                  {fallenNames.map((name, index) => (
                    <span key={`${name}-${index}`}>· {name}</span>
                  ))}
                </span>
              </div>
            )}
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
              <span style={{ color: 'var(--wr-gold-bright)' }}>Rank: {getWardenRank(totalPoints)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
          <button className="wr-btn wr-btn-blood wr-btn-lg" type="button" onClick={tryAgain}>
            {WIcon('refresh', { size: 13 })} Try Again
          </button>
          <button className="wr-btn wr-btn-ghost wr-btn-lg" type="button" onClick={returnToHearth}>
            {WIcon('chevL', { size: 12 })} Return to Hearth
          </button>
        </div>
      </div>
    </div>
  );
}

export default DefeatScreen;
