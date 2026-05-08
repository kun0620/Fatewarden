import { Compass, Moon, ShieldCheck, Sparkles, Swords, type LucideIcon } from 'lucide-react';
import { gamePhases, getGamePhaseDefinition } from '../lib/gamePhases';
import type { GamePhase } from '../types';

type GamePhasePanelProps = {
  busy?: boolean;
  disabled?: boolean;
  phase: GamePhase;
  onChangePhase: (phase: GamePhase) => void;
};

const phaseIcons = {
  setup: ShieldCheck,
  exploration: Compass,
  combat: Swords,
  rest: Moon,
} satisfies Record<GamePhase, LucideIcon>;

export function GamePhasePanel({ busy = false, disabled = false, phase, onChangePhase }: GamePhasePanelProps) {
  const current = getGamePhaseDefinition(phase);
  const CurrentIcon = phaseIcons[current.id];

  return (
    <section className="panel phase-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Game Flow</p>
          <h2>{current.label}</h2>
        </div>
        <CurrentIcon size={22} aria-hidden="true" />
      </div>

      <p className="phase-description">{current.description}</p>

      <div className="phase-grid" aria-label="Game phase">
        {gamePhases.map((item) => {
          const Icon = phaseIcons[item.id] ?? Sparkles;
          return (
            <button
              className={item.id === phase ? 'active' : ''}
              disabled={busy || disabled || item.id === phase}
              key={item.id}
              onClick={() => onChangePhase(item.id)}
              type="button"
            >
              <Icon size={15} aria-hidden="true" />
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
