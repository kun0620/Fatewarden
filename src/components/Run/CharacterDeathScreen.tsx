import { useEffect, useMemo } from 'react';
import type { RunCombatant } from '../../engine/run/runTypes';
import { PortraitArt, WIcon } from './runVisuals';

const EPITAPHS: Record<string, string[]> = {
  barbarian: [
    'Rage spent, legend kindled.',
    'The last roar shook the stone.',
    'Death found fury waiting.',
  ],
  bard: [
    'The final song lingers in the dark.',
    'The tale pauses, but does not end.',
    'Even silence remembers the verse.',
  ],
  cleric: [
    'The light fades, but lingers.',
    'Faith carried them far.',
    'The gods take back their own.',
  ],
  druid: [
    'The wild reclaims its keeper.',
    'Root and bone return to the earth.',
    'The old green silence closes in.',
  ],
  fighter: [
    'Stood firm until the end.',
    'The sword never wavered.',
    'Death found a worthy foe.',
  ],
  monk: [
    'The final breath found stillness.',
    'Discipline endured beyond pain.',
    'The body falls. The lesson remains.',
  ],
  paladin: [
    'The oath burns beyond the grave.',
    'Duty held the line.',
    'The last vow was kept.',
  ],
  ranger: [
    'The hunt is over.',
    'The arrow found no mark.',
    'The wild reclaims the hunter.',
  ],
  rogue: [
    'Even shadows must rest.',
    'The last step, taken.',
    'Darkness claims its own.',
  ],
  sorcerer: [
    'The bloodline sparks once more, then fades.',
    'Power returns to the storm.',
    'The final surge lit the dark.',
  ],
  warlock: [
    'The pact falls silent.',
    'The patron watches from beyond.',
    'A bargain ends in ash.',
  ],
  wizard: [
    'The last spell was cast.',
    'Knowledge returns to the void.',
    'The arcane flame is extinguished.',
  ],
  default: [
    'The warden stood firm until the end.',
    'The dungeon remembers.',
    'Another soul claimed by the dark.',
  ],
};

function getEpitaph(className?: string): string {
  const pool = EPITAPHS[className?.toLowerCase() ?? ''] ?? EPITAPHS.default;
  return pool[Math.floor(Math.random() * pool.length)] ?? EPITAPHS.default[0];
}

interface CharacterDeathScreenProps {
  aliveCount: number;
  combatant: RunCombatant;
  currentFloor: number;
  enemiesKilled: number;
  onContinue: () => void;
  onRunEnd: () => void;
  roomNumber: number;
}

export function CharacterDeathScreen({
  aliveCount,
  combatant,
  currentFloor,
  enemiesKilled,
  onContinue,
  onRunEnd,
  roomNumber,
}: CharacterDeathScreenProps) {
  const epitaph = useMemo(() => getEpitaph(combatant.className), [combatant.className]);
  const allFallen = aliveCount <= 0;

  useEffect(() => {
    if (!allFallen) return;
    const timer = window.setTimeout(onRunEnd, 3000);
    return () => window.clearTimeout(timer);
  }, [allFallen, onRunEnd]);

  return (
    <div className="wr-death-overlay wr-death-screen" role="dialog" aria-modal="true">
      <div className="wr-death-card">
        <div className="wr-death-rune">
          <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden="true">
            <circle cx="30" cy="30" r="26" stroke="#8B1538" strokeWidth="1.5" fill="none" />
            <circle cx="30" cy="30" r="20" stroke="#5B2A8C" strokeWidth="1" strokeDasharray="2 4" fill="none" />
            <path d="M 15 30 L 30 15 L 45 30 L 30 45 Z" stroke="#C53456" fill="none" strokeWidth="1.2" />
          </svg>
        </div>

        <div className="wr-death-portrait">
          <div className="wr-death-portrait-art">
            <PortraitArt kind={combatant.portrait ?? combatant.className} color={combatant.color} />
          </div>
          <div className="wr-death-skull">{WIcon('skull', { size: 42 })}</div>
        </div>

        <div className="wr-eyebrow" style={{ color: 'var(--wr-blood-bright)', marginTop: 14 }}>
          A Light Goes Out
        </div>
        <div className="wr-death-name">
          {combatant.name.toUpperCase()} <span style={{ color: 'var(--wr-text-3)' }}>has fallen</span>
        </div>
        <div className="wr-rule" style={{ maxWidth: 240, margin: '10px auto' }}>
          <span className="wr-rule-diamond" style={{ background: 'var(--wr-blood)' }} />
        </div>
        <div className="wr-death-epitaph">"{epitaph} The flame remembers."</div>

        <div className="wr-death-stats">
          <div><span className="wr-eyebrow">Class</span><b>{combatant.className ?? 'Warden'}</b></div>
          <div><span className="wr-eyebrow">Survived</span><b>Floor {currentFloor}, Room {roomNumber}</b></div>
          <div><span className="wr-eyebrow">Enemies Slain</span><b>{enemiesKilled}</b></div>
        </div>

        <div className="wr-death-foot">
          <div style={{ fontSize: 12, color: 'var(--wr-text-3)', fontStyle: 'italic', flex: 1, textAlign: 'left' }}>
            {allFallen
              ? 'No wardens still stand. The run ends here.'
              : `${aliveCount} warden${aliveCount === 1 ? '' : 's'} still stand. The run continues if any survive.`}
          </div>
          {!allFallen && (
            <button className="wr-btn wr-btn-blood" onClick={onContinue} type="button">
              Continue {WIcon('arrowR', { size: 13 })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CharacterDeathScreen;
