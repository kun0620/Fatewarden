import React, { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  variant?: 'default' | 'gold';
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export const Dialog = ({
  open,
  onClose,
  title,
  variant = 'default',
  children,
  footer,
  width = 520,
}: DialogProps) => {
  if (!open) return null;

  // Guard for SSR
  if (typeof document === 'undefined') return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const variantClass = variant === 'gold' ? 'fw-modal gold fw-modal-gold' : 'fw-modal';

  const content = (
    <div className="fw-overlay" onClick={handleBackdropClick}>
      <div className={variantClass} style={{ width: `${width}px` }}>
        {title && (
          <div className="fw-modal-head">
            <h2 className="fw-h3">{title}</h2>
            <button
              className="fw-btn fw-btn-ghost fw-btn-icon fw-btn--icon fw-modal-close"
              onClick={onClose}
              aria-label="Close dialog"
            >
              ×
            </button>
          </div>
        )}
        <div className="fw-modal-body">{children}</div>
        {footer && <div className="fw-modal-foot">{footer}</div>}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
