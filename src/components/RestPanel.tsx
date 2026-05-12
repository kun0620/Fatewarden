import { BedDouble, Dice6, MoonStar } from 'lucide-react';
import { useState } from 'react';
import { getHitDieType } from '../engine/character/rest';
import type { Character } from '../types';

type RestPanelProps = {
  character: Character;
  busy?: boolean;
  disabled?: boolean;
  onShortRest: (hitDiceSpent: number) => Promise<void> | void;
  onLongRest: () => Promise<void> | void;
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

export function RestPanel({ character, busy = false, disabled = false, onLongRest, onShortRest }: RestPanelProps) {
  const [hitDiceSpent, setHitDiceSpent] = useState(1);
  const maxSpend = Math.max(0, character.hitDice);
  const canShortRest = !disabled && !busy && maxSpend > 0;
  const clampedSpend = clamp(hitDiceSpent, 1, Math.max(1, maxSpend));

  return (
    <section className="panel rest-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Recovery</p>
          <h2>Rest Actions</h2>
        </div>
        <BedDouble size={22} aria-hidden="true" />
      </div>

      <div className="rest-stats-grid">
        <div className="rest-stat">
          <span>Hit Dice</span>
          <strong>
            {character.hitDice}/{character.maxHitDice}
          </strong>
        </div>
        <div className="rest-stat">
          <span>Hit Die</span>
          <strong>{getHitDieType(character.className)}</strong>
        </div>
        <div className="rest-stat">
          <span>Exhaustion</span>
          <strong>{character.exhaustionLevel}</strong>
        </div>
      </div>

      <div className="stack-form">
        <label>
          Spend Hit Dice
          <input
            disabled={!canShortRest}
            max={Math.max(1, maxSpend)}
            min={1}
            onChange={(event) => setHitDiceSpent(event.target.valueAsNumber)}
            type="number"
            value={clampedSpend}
          />
        </label>
        <button className="secondary-button" disabled={!canShortRest} onClick={() => void onShortRest(clampedSpend)} type="button">
          <Dice6 size={16} aria-hidden="true" />
          Short Rest
        </button>
      </div>

      <button className="primary-button" disabled={disabled || busy} onClick={() => void onLongRest()} type="button">
        <MoonStar size={16} aria-hidden="true" />
        Long Rest
      </button>
    </section>
  );
}
