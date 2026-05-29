import React, { ReactNode } from 'react';

interface StatBoxProps {
  label: string;
  value: ReactNode;
  sub?: string;
  gold?: boolean;
}

export const StatBox = ({ label, value, sub, gold }: StatBoxProps) => {
  return (
    <div className="fw-stat-card">
      <div className="fw-stat-card-label">{label}</div>
      <div className={`fw-stat-card-value ${gold ? 'gold' : ''}`}>{value}</div>
      {sub && <div className="fw-stat-card-sub">{sub}</div>}
    </div>
  );
};

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'default' | 'hp' | 'mp' | 'xp';
}

export const ProgressBar = ({ value, max, variant = 'default' }: ProgressBarProps) => {
  const percentage = max ? (value / max) * 100 : value;
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

  const variantClass = variant === 'default' ? 'fw-bar' : `fw-bar ${variant}`;

  return (
    <div className={variantClass}>
      <i style={{ width: `${clampedPercentage}%` }} />
    </div>
  );
};

interface StatBarProps {
  label: string;
  value: number;
  max: number;
  variant?: 'default' | 'hp' | 'mp' | 'xp';
}

export const StatBar = ({ label, value, max, variant = 'default' }: StatBarProps) => {
  const percentage = (value / max) * 100;
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

  const variantClass = variant === 'default' ? 'fw-stat-bar' : `fw-stat-bar fw-stat-bar-${variant}`;

  return (
    <div className={variantClass}>
      <span className="lbl">{label}</span>
      <span className="bar">
        <div className={`fw-bar ${variant}`}>
          <i style={{ width: `${clampedPercentage}%` }} />
        </div>
      </span>
      <span className="num">{value}/{max}</span>
    </div>
  );
};
