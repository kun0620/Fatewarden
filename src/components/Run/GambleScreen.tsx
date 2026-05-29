import { useRef, useState } from 'react';
import { WARDEN_RUN_RELICS } from '../../data/relics';
import type { RunNode, RunRelic, RunState } from '../../engine/run/runTypes';
import { useGameStore } from '../../store/useGameStore';
import { WIcon } from './runVisuals';

type GambleState = 'idle' | 'rolling' | 'win' | 'lose';

function getCurrentNode(runState: RunState): RunNode | null {
  return runState.floors
    .find((floor) => floor.floorNumber === runState.currentFloor)
    ?.nodes.find((node) => node.id === runState.currentNodeId) ?? null;
}

function SceneAltar() {
  return (
    <svg viewBox="0 0 800 280" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true">
      <defs>
        <radialGradient id="wr-gamble-glow" cx="50%" cy="50%" r="45%">
          <stop offset="0%" stopColor="var(--wr-violet)" stopOpacity="0.45" />
          <stop offset="60%" stopColor="var(--wr-violet-deep)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--wr-bg)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="280" fill="var(--wr-bg-2)" />
      <ellipse cx="400" cy="160" rx="340" ry="120" fill="url(#wr-gamble-glow)" />
      <g fill="var(--wr-bg-1)" stroke="var(--wr-edge)" strokeWidth="1.4">
        <path d="M 320 230 L 480 230 L 460 200 L 340 200 Z" />
        <rect x="340" y="160" width="120" height="40" />
        <path d="M 350 160 L 450 160 L 460 130 L 340 130 Z" />
      </g>
      <g fill="none" stroke="var(--wr-violet-bright)" strokeWidth="1.4">
        <circle cx="370" cy="142" r="10" />
        <circle cx="365" cy="140" r="1.2" fill="var(--wr-violet-bright)" />
        <circle cx="375" cy="140" r="1.2" fill="var(--wr-violet-bright)" />
        <path d="M 365 148 Q 370 145 375 148" />
        <path d="M 365 142 L 365 152 M 370 142 L 370 153" stroke="var(--wr-violet-deep)" opacity="0.6" />

        <circle cx="430" cy="142" r="10" />
        <circle cx="425" cy="140" r="1.2" fill="var(--wr-violet-bright)" />
        <circle cx="435" cy="140" r="1.2" fill="var(--wr-violet-bright)" />
        <path d="M 425 148 Q 430 152 435 148" />
      </g>
      <g stroke="var(--wr-gold-bright)" strokeWidth="1.4" fill="var(--wr-bg-1)">
        <rect x="510" y="80" width="24" height="24" rx="3" transform="rotate(15 522 92)" />
        <rect x="540" y="120" width="20" height="20" rx="3" transform="rotate(-12 550 130)" />
        <circle cx="522" cy="92" r="1.5" fill="var(--wr-gold-bright)" transform="rotate(15 522 92)" />
        <circle cx="550" cy="130" r="1.5" fill="var(--wr-gold-bright)" />
      </g>
      {Array.from({ length: 18 }, (_, index) => (
        <circle
          key={`ember-${index}`}
          cx={200 + index * 25}
          cy={160 + (index % 3) * 30}
          r="1.2"
          fill="var(--wr-violet-bright)"
          opacity={0.5 + (index % 4) * 0.1}
        />
      ))}
    </svg>
  );
}

export function GambleScreen() {
  const { activeCharacter, addRunGold, addRunRelic, applyRunPartyHp, completeNode, dispatch, runState, vaultCharacters } = useGameStore();
  const [state, setState] = useState<GambleState>('idle');
  const [roll, setRoll] = useState<number | null>(null);
  const [wonRelic, setWonRelic] = useState<RunRelic | null>(null);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const completeTimeoutRef = useRef<number | null>(null);
  const currentNode = runState ? getCurrentNode(runState) : null;

  function clearRollTimers() {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (completeTimeoutRef.current !== null) {
      window.clearTimeout(completeTimeoutRef.current);
      completeTimeoutRef.current = null;
    }
  }

  function completeGamble(finalRoll: number) {
    if (!currentNode) return;
    completeNode(currentNode.id, { type: 'gamble', roll: finalRoll });
  }

  function applyLossDamage() {
    if (!runState?.party) return;
    for (const member of runState.party) {
      if (member.down) continue;
      const damage = Math.max(1, Math.floor(member.hpMax * 0.2));
      applyRunPartyHp(member.id, -damage);
    }
  }

  function handleRoll() {
    if (!runState || !currentNode || state === 'rolling' || state === 'win' || state === 'lose') return;
    clearRollTimers();

    const finalRoll = Math.floor(Math.random() * 20) + 1;
    setState('rolling');
    setWonRelic(null);
    setRoll(Math.floor(Math.random() * 20) + 1);

    intervalRef.current = window.setInterval(() => {
      setRoll(Math.floor(Math.random() * 20) + 1);
    }, 100);

    timeoutRef.current = window.setTimeout(() => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      setRoll(finalRoll);
      if (finalRoll >= 11) {
        const relic = WARDEN_RUN_RELICS[Math.floor(Math.random() * WARDEN_RUN_RELICS.length)];
        setState('win');
        addRunGold(100);
        if (relic) {
          setWonRelic(relic);
          addRunRelic(relic);
        }
      } else {
        setState('lose');
        applyLossDamage();
      }

      completeTimeoutRef.current = window.setTimeout(() => completeGamble(finalRoll), 2000);
    }, 1500);
  }

  function leaveQuietly() {
    clearRollTimers();
    if (!currentNode) return;
    completeNode(currentNode.id, { type: 'gamble', roll: 0 });
  }

  if (!runState) {
    return (
      <div className="wr-scene wr-screen-in">
        <div className="wr-scene-inner">
          <div className="wr-narration">No gamble node is active.</div>
        </div>
      </div>
    );
  }

  const resultTone = state === 'win' ? 'good' : state === 'lose' ? 'bad' : 'neutral';
  const resultTitle = state === 'win'
    ? `THE FATES SMILE - Roll: ${roll ?? '-'}`
    : state === 'lose'
      ? `THE ALTAR TAKES ITS DUE - Roll: ${roll ?? '-'}`
      : 'The altar waits for the cast.';

  return (
    <div className="wr-scene wr-screen-in">
      <div className="wr-scene-inner">
        <div className="wr-event-banner">
          <div className="wr-event-banner-art">
            <SceneAltar />
          </div>
          <div className="wr-event-banner-fade" />
          <div className="wr-event-banner-title">
            <div className="eyebrow" style={{ color: 'var(--wr-violet-bright)' }}>An Altar of Two Faces</div>
            <h2>Fate Decides</h2>
          </div>
        </div>

        <div className="wr-narration">
          <p>The altar asks only one thing: your luck.</p>
        </div>

        <div className="wr-gamble-grid">
          <div className="wr-panel wr-gamble-stake">
            <div className="wr-corn tl" /><div className="wr-corn tr" /><div className="wr-corn bl" /><div className="wr-corn br" />
            <div className="wr-eyebrow" style={{ color: 'var(--wr-gold-bright)' }}>Cast the Die</div>

            <div className={`wr-die-stage ${state === 'rolling' ? 'rolling' : ''} ${state === 'win' || state === 'lose' ? 'settled' : ''}`}>
              <div className={`wr-die-face ${roll === null ? 'idle' : `roll-${resultTone}`} ${state === 'rolling' ? 'wr-dice-rolling' : ''}`}>
                <span>{roll ?? 'd20'}</span>
              </div>
            </div>

            {(state === 'win' || state === 'lose') && (
              <div className={`wr-die-result tone-${resultTone}`}>
                <div className="wr-eyebrow" style={{ marginBottom: 4 }}>Result</div>
                <div style={{ fontFamily: 'var(--wr-f-head)', fontSize: 16, letterSpacing: '0.10em', color: 'var(--wr-bone)' }}>
                  {resultTitle}
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: 'var(--wr-text-2)', fontStyle: 'italic' }}>
                  {state === 'win' ? `+100 Gold${wonRelic ? ` + ${wonRelic.name} obtained` : ''}` : 'All wardens lose 20% HP'}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button
                className="wr-btn wr-btn-ghost"
                type="button"
                onClick={leaveQuietly}
                disabled={state === 'rolling' || state === 'win' || state === 'lose'}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Leave quietly {WIcon('chevR', { size: 12 })}
              </button>
              <button
                className="wr-btn wr-btn-violet wr-btn-lg"
                type="button"
                onClick={handleRoll}
                disabled={state === 'rolling' || state === 'win' || state === 'lose'}
                style={{ flex: 2, justifyContent: 'center' }}
              >
                {WIcon('rune', { size: 15 })} {state === 'rolling' ? 'Rolling...' : 'Roll the Dice'}
              </button>
            </div>
          </div>

          <div className="wr-panel wr-gamble-table">
            <div className="wr-eyebrow" style={{ marginBottom: 8 }}>Stakes</div>
            <div className={`wr-gamble-row tone-good ${state === 'win' ? 'hit' : ''}`}>
              <div className="wr-gamble-roll">11+</div>
              <div className="wr-gamble-bar"><span style={{ width: '50%' }} /></div>
              <div className="wr-gamble-desc">Roll high &gt; +100 Gold + Relic</div>
            </div>
            <div className={`wr-gamble-row tone-bad ${state === 'lose' ? 'hit' : ''}`}>
              <div className="wr-gamble-roll">1-10</div>
              <div className="wr-gamble-bar"><span style={{ width: '50%' }} /></div>
              <div className="wr-gamble-desc">Roll low &gt; All lose 20% HP</div>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--wr-text-3)', fontStyle: 'italic' }}>
              The altar keeps no ledger, only outcomes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GambleScreen;
