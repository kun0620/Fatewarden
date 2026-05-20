import React from 'react';

interface HpBarProps {
  current: number;
  max: number;
  temp?: number;          // temp HP shown as extra segment
  showNumbers?: boolean;  // show "cur / max" text
  compact?: boolean;      // no numbers, bar only
  className?: string;
}

/** Returns bar color variant based on HP percentage */
function hpVariant(pct: number): string {
  if (pct <= 0) return 'dead';
  if (pct < 0.25) return 'critical';
  if (pct < 0.5) return 'bloodied';
  return 'healthy';
}

export const HpBar = ({
  current,
  max,
  temp = 0,
  showNumbers = true,
  compact = false,
  className = '',
}: HpBarProps) => {
  const clamped = Math.max(0, Math.min(current, max));
  const pct = max > 0 ? clamped / max : 0;
  const tempPct = max > 0 ? Math.min(temp, max - clamped) / max : 0;
  const variant = hpVariant(pct);

  const barStyle: React.CSSProperties = {
    '--hp-pct': `${pct * 100}%`,
    '--hp-temp-pct': `${tempPct * 100}%`,
  } as React.CSSProperties;

  return (
    <div className={`fw-stat-bar ${className}`} style={compact ? { gap: 0 } : undefined}>
      {!compact && showNumbers && (
        <span className="lbl" style={{ color: 'var(--text-2)', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'var(--f-mono)' }}>HP</span>
      )}
      <span className="bar" style={{ flex: 1, position: 'relative' }}>
        <div className={`fw-bar hp fw-bar--${variant}`} style={barStyle}>
          <i style={{ width: `${pct * 100}%` }} />
          {tempPct > 0 && (
            <i
              style={{
                width: `${tempPct * 100}%`,
                background: 'rgba(100,200,255,0.5)',
                position: 'absolute',
                left: `${pct * 100}%`,
                top: 0, bottom: 0,
              }}
            />
          )}
        </div>
      </span>
      {!compact && showNumbers && (
        <span className="num" style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: pct < 0.25 ? 'var(--blood-bright)' : 'var(--text-2)' }}>
          {current}/{max}
          {temp > 0 && <span style={{ color: 'rgba(100,200,255,0.8)', marginLeft: 2 }}>+{temp}</span>}
        </span>
      )}
    </div>
  );
};
