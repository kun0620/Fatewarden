import React, { ReactNode } from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
}

interface TabBarProps<T extends string = string> {
  tabs: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
  style?: React.CSSProperties;
  /** compact: smaller font + tighter padding (for sidebar tabs) */
  compact?: boolean;
}

export function TabBar<T extends string = string>({
  tabs,
  active,
  onChange,
  className = '',
  style,
  compact = false,
}: TabBarProps<T>) {
  return (
    <div className={`fw-tabs ${className}`} role="tablist" style={style}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          className={`fw-tab ${active === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
          style={compact ? { flex: 1, justifyContent: 'center', padding: '10px 8px' } : undefined}
        >
          {tab.icon && (
            <span style={{ display: 'flex', alignItems: 'center' }}>{tab.icon}</span>
          )}
          {tab.label}
          {tab.badge != null && (
            <span
              className="fw-pill fw-pill-blood"
              style={{ marginLeft: 4, padding: '1px 5px', fontSize: 9 }}
            >
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
