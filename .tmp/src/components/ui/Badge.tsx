import React, { ReactNode } from 'react';

type BadgeVariant = 'arcane' | 'gold' | 'blood' | 'dim' | 'success';

interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  children: ReactNode;
}

export const Badge = ({ variant = 'arcane', dot, children }: BadgeProps) => {
  const variants: Record<BadgeVariant, string> = {
    arcane: 'fw-pill fw-pill-arcane',
    gold: 'fw-pill fw-pill-gold',
    blood: 'fw-pill fw-pill-blood',
    dim: 'fw-pill fw-pill-dim',
    success: 'fw-pill fw-pill-success',
  };

  return (
    <div className={variants[variant]}>
      {dot && <span className="fw-pill-dot" />}
      {children}
    </div>
  );
};

type CondVariant = 'default' | 'bleed' | 'buff';

interface ConditionChipProps {
  variant?: CondVariant;
  children: ReactNode;
}

export const ConditionChip = ({ variant = 'default', children }: ConditionChipProps) => {
  const variants: Record<CondVariant, string> = {
    default: 'fw-cond',
    bleed: 'fw-cond fw-cond-bleed',
    buff: 'fw-cond fw-cond-buff',
  };

  return <div className={variants[variant]}>{children}</div>;
};
