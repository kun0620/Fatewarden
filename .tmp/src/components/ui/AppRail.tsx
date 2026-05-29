import React, { ReactNode } from 'react';
import { Icon } from './Icons';

interface RailBtnProps {
  icon: string;
  label: string;
  active?: boolean;
  badge?: string | number;
  onClick?: () => void;
}

export const RailBtn = ({ icon, label, active, badge, onClick }: RailBtnProps) => {
  return (
    <button
      type="button"
      className={`fw-app-rail-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
      <span className="fw-app-rail-btn-icon">{Icon(icon, { size: 20 })}</span>
      {badge && <span className="fw-app-rail-btn-badge">{badge}</span>}
      <span className="fw-app-rail-label">{label}</span>
    </button>
  );
};

interface AppRailProps {
  logo?: ReactNode;
  children: ReactNode;
  bottom?: ReactNode;
}

export const AppRail = ({ logo, children, bottom }: AppRailProps) => {
  return (
    <aside className="fw-app-rail">
      {logo && <div className="fw-app-rail-logo">{logo}</div>}
      <nav className="fw-app-rail-nav">{children}</nav>
      {bottom && <div className="fw-app-rail-bottom">{bottom}</div>}
    </aside>
  );
};
