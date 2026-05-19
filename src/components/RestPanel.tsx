import { BedDouble, Dice6, MoonStar, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
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

function parseDieSize(die: string) {
  const match = /d(\d+)/i.exec(die);
  return match ? Number(match[1]) : 8;
}

export function RestPanel({ character, busy = false, disabled = false, onLongRest, onShortRest }: RestPanelProps) {
  const [hitDiceSpent, setHitDiceSpent] = useState(1);
  const [summary, setSummary] = useState<string | null>(null);
  const maxSpend = Math.max(0, character.hitDice);
  const hitDie = getHitDieType(character.className);
  const canShortRest = !disabled && !busy && maxSpend > 0;
  const canLongRest = !disabled && !busy;
  const clampedSpend = clamp(hitDiceSpent, 1, Math.max(1, maxSpend));
  const dieSize = parseDieSize(hitDie);
  const estimatedRecovery = useMemo(() => Math.max(1, Math.round((dieSize / 2 + 0.5) * clampedSpend)), [clampedSpend, dieSize]);

  async function submitShortRest() {
    await onShortRest(clampedSpend);
    setSummary(`Short rest complete · spent ${clampedSpend}${hitDie}, estimated recovery ~${estimatedRecovery} HP.`);
  }

  async function submitLongRest() {
    await onLongRest();
    setSummary('Long rest complete · health and core resources restored.');
  }

  return (
    <section className="fw-panel rest-panel">
      <div className="fw-panel__header">
        <div>
          <p className="fw-caption">Respite</p>
          <h2 className="fw-h2">Rest Actions</h2>
        </div>
        <BedDouble aria-hidden="true" size={22} />
      </div>

      <div className="rest-panel__body">
        <article className="rest-panel__section">
          <p className="rest-panel__section-title">
            <Dice6 aria-hidden="true" size={14} />
            Short Rest
          </p>
          <p className="rest-panel__text">Spend Hit Dice to recover HP.</p>
          <p className="rest-panel__meta">
            Hit Dice remaining: <strong>{character.hitDice}</strong>/{character.maxHitDice} · Die {hitDie}
          </p>

          <div className="rest-panel__dice-row">
            {Array.from({ length: Math.max(1, maxSpend) }).map((_, index) => {
              const active = index < clampedSpend;
              return (
                <button
                  className={`rest-panel__die ${active ? 'is-active' : ''}`}
                  disabled={!canShortRest}
                  key={`die-${index}`}
                  onClick={() => setHitDiceSpent(index + 1)}
                  type="button"
                >
                  {hitDie}
                </button>
              );
            })}
          </div>

          <div className="rest-panel__estimate">Estimated recovery: ~{estimatedRecovery} HP</div>
          <button className="fw-btn fw-btn-ghost" disabled={!canShortRest} onClick={() => void submitShortRest()} type="button">
            <Dice6 aria-hidden="true" size={16} />
            Take Short Rest
          </button>
        </article>

        <div className="rest-panel__divider">or</div>

        <article className="rest-panel__section">
          <p className="rest-panel__section-title is-gold">
            <MoonStar aria-hidden="true" size={14} />
            Long Rest
          </p>
          <p className="rest-panel__text">Restore all HP and key resources.</p>
          <button className="fw-btn fw-btn-gold" disabled={!canLongRest} onClick={() => void submitLongRest()} type="button">
            <MoonStar aria-hidden="true" size={16} />
            Begin Long Rest
          </button>
        </article>

        {summary ? (
          <article className="rest-panel__summary">
            <p className="fw-caption">
              <Sparkles aria-hidden="true" size={12} />
              Recovery Summary
            </p>
            <p className="rest-panel__text">{summary}</p>
          </article>
        ) : null}
      </div>
    </section>
  );
}
