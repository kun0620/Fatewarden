import React from 'react';
import { Icon } from './Icons';

type ButtonVariant = 'default' | 'gold' | 'arcane' | 'blood' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconRight?: string;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', icon, iconRight, loading, disabled, children, className = '', ...props }, ref) => {
    const variants: Record<ButtonVariant, string> = {
      default: 'fw-btn',
      gold: 'fw-btn fw-btn-gold fw-btn--primary',
      arcane: 'fw-btn fw-btn-arcane',
      blood: 'fw-btn fw-btn-blood fw-btn--danger',
      ghost: 'fw-btn fw-btn-ghost fw-btn--ghost',
    };

    const sizes: Record<ButtonSize, string> = {
      sm: 'fw-btn-sm fw-btn--sm',
      md: '',
      lg: 'fw-btn-lg fw-btn--lg',
      icon: 'fw-btn-icon fw-btn--icon',
    };

    const classes = `${variants[variant]} ${sizes[size]} ${className}`.trim();

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {icon && <span aria-hidden="true">{Icon(icon, { size: 16 })}</span>}
        {children}
        {iconRight && <span aria-hidden="true">{Icon(iconRight, { size: 16 })}</span>}
        {loading && <span className="fw-btn-spinner" aria-hidden="true">…</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
