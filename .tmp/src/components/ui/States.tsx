import React, { ReactNode } from 'react';
import { Icon } from './Icons';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => {
  return (
    <div className="fw-empty-state">
      {icon && (
        <div className="fw-empty-state-icon">
          {Icon(icon, { size: 32 })}
        </div>
      )}
      <h3 className="fw-empty-state-title">{title}</h3>
      {description && <p className="fw-empty-state-description">{description}</p>}
      {action && <div className="fw-empty-state-action">{action}</div>}
    </div>
  );
};

interface LoadingStateProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingState = ({ label = 'Loading…', size = 'md' }: LoadingStateProps) => {
  const sizeClass = {
    sm: 'fw-loading-sm',
    md: 'fw-loading-md',
    lg: 'fw-loading-lg',
  }[size];

  return (
    <div className="fw-loading-state">
      <div className={`fw-loading-state-spinner fw-rune-spin ${sizeClass}`} />
      <p className="fw-loading-state-label">{label}</p>
    </div>
  );
};

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export const ErrorState = ({
  title = 'Something went wrong',
  description,
  action,
}: ErrorStateProps) => {
  return (
    <div className="fw-error-state">
      <div className="fw-error-state-icon">
        {Icon('alert', { size: 32 })}
      </div>
      <h3 className="fw-error-state-title">{title}</h3>
      {description && <p className="fw-error-state-description">{description}</p>}
      {action && <div className="fw-error-state-action">{action}</div>}
    </div>
  );
};
