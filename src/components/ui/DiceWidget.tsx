import React from 'react';

type DieType = 4 | 6 | 8 | 10 | 12 | 20 | 100;

type DiceOutcome = 'crit' | 'success' | 'fumble' | 'failure' | 'neutral';

interface DiceWidgetProps {
  sides: DieType;
  result: number;
  outcome?: DiceOutcome;
  label?: string;         // e.g. "Perception"
  notation?: string;      // e.g. "1d20+3"
  rolling?: boolean;      // shake animation active
  className?: string;
}

const OUTCOME_COLOR: Record<DiceOutcome, string> = {
  crit:    'var(--gold-bright)',
  success: 'var(--arcane-bright)',
  fumble:  'var(--blood-bright)',
  failure: 'var(--text-3)',
  neutral: 'var(--text-2)',
};

const OUTCOME_LABEL: Record<DiceOutcome, string> = {
  crit:    'Critical!',
  success: 'Success',
  fumble:  'Fumble',
  failure: 'Failure',
  neutral: '—',
};

const OUTCOME_BORDER: Record<DiceOutcome, string> = {
  crit:    '1px solid var(--gold-deep)',
  success: '1px solid var(--arcane-deep)',
  fumble:  '1px solid var(--blood)',
  failure: '1px solid var(--border-soft)',
  neutral: '1px solid var(--border-soft)',
};

function deriveOutcome(sides: DieType, result: number, total?: number): DiceOutcome {
  if (sides === 20) {
    if (result === 20) return 'crit';
    if (result === 1) return 'fumble';
  }
  const check = total ?? result;
  if (check >= 15) return 'success';
  if (check >= 8) return 'neutral';
  return 'failure';
}

export const DiceWidget = ({
  sides,
  result,
  outcome,
  label,
  notation,
  rolling = false,
  className = '',
}: DiceWidgetProps) => {
  const resolvedOutcome = outcome ?? deriveOutcome(sides, result);
  const color = OUTCOME_COLOR[resolvedOutcome];
  const border = OUTCOME_BORDER[resolvedOutcome];
  const isD20 = sides === 20;

  return (
    <div
      className={`fw-card ${className}`}
      style={{
        padding: '12px 14px',
        border,
        background: 'var(--bg-deep)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        alignItems: 'center',
        minWidth: 80,
      }}
    >
      {label && (
        <span className="fw-eyebrow" style={{ fontSize: 9, letterSpacing: '0.12em', color: 'var(--text-3)' }}>
          {label} {notation && <span style={{ color: 'var(--gold-deep)' }}>· {notation}</span>}
        </span>
      )}

      <div
        className={`fw-display ${rolling ? 'fw-die-shake' : ''}`}
        style={{
          fontSize: isD20 ? 52 : 40,
          lineHeight: 1,
          color,
          transition: 'color 0.2s',
        }}
      >
        {result}
      </div>

      <span
        className="fw-serif"
        style={{ fontSize: 11, fontStyle: 'italic', color, opacity: 0.85 }}
      >
        {OUTCOME_LABEL[resolvedOutcome]}
      </span>

      <div
        className="fw-eyebrow"
        style={{ fontSize: 9, color: 'var(--text-4)', marginTop: 2 }}
      >
        d{sides}
      </div>
    </div>
  );
};
