import React, { ReactNode } from 'react';
import { Icon } from './Icons';

export function Card({ elev, children, className = "", style }: { elev?: boolean, children: ReactNode, className?: string, style?: React.CSSProperties }) {
  return (
    <div className={`fw-card ${elev ? "fw-card-elev fw-card-elevated" : ""} ${className}`} style={style}>{children}</div>
  );
}

export function CardHead({ icon, title, right, glow }: { icon?: string, title: ReactNode, right?: ReactNode, glow?: boolean }) {
  return (
    <div className="fw-card-head" style={glow ? { boxShadow: "inset 0 -1px 0 rgba(214,168,79,0.18)" } : {}}>
      {icon && <span style={{ color: "var(--gold)" }}>{Icon(icon, { size: 15 })}</span>}
      <h3>{title}</h3>
      {right && <div className="fw-card-head-actions">{right}</div>}
    </div>
  );
}

export function Field({ label, hint, children, right }: { label?: string, hint?: string, children: ReactNode, right?: ReactNode }) {
  return (
    <div className="fw-field">
      {label && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="fw-label fw-field__label">{label}</span>
          <span style={{ flex: 1 }} />
          {right}
        </div>
      )}
      {children}
      {hint && <div className="fw-field__hint">{hint}</div>}
    </div>
  );
}

type SegOption<T extends string | number> = { value: T; label?: string };

export function Seg<T extends string | number>({ value, onChange, options }: { value: T, onChange: (v: T) => void, options: SegOption<T>[] | T[] }) {
  return (
    <div className="fw-seg">
      {options.map(o => {
        const val = typeof o === 'object' ? o.value : o;
        const label = typeof o === 'object' ? (o.label ?? o.value) : o;
        return (
          <button key={String(val)}
            className={"fw-seg-btn " + (val === value ? "active" : "")}
            onClick={() => onChange(val)}>{label}</button>
        );
      })}
    </div>
  );
}

export function Toggle({ on, onChange }: { on: boolean, onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className={"fw-toggle " + (on ? "on" : "")}
      data-on={on}
      aria-pressed={on}
      onClick={() => onChange(!on)}
    >
      <span className="fw-toggle__thumb" />
    </button>
  );
}

export function Tile({ active, onClick, title, desc, icon, children }: { active?: boolean, onClick?: () => void, title?: ReactNode, desc?: ReactNode, icon?: string, children?: ReactNode }) {
  return (
    <div className={"fw-tile " + (active ? "active" : "")} onClick={onClick}>
      {icon && <span style={{ color: active ? "var(--gold-bright)" : "var(--text-3)", marginBottom: 4 }}>{Icon(icon, { size: 18 })}</span>}
      {title && <div className="fw-tile-title">{title}</div>}
      {desc && <div className="fw-tile-desc">{desc}</div>}
      {children}
    </div>
  );
}

export function Panel({ title, icon, actions, glow, elev, children, className = "", style }: { title?: ReactNode, icon?: string, actions?: ReactNode, glow?: boolean, elev?: boolean, children: ReactNode, className?: string, style?: React.CSSProperties }) {
  return (
    <Card elev={elev} className={`fw-panel ${className}`} style={style}>
      <CardHead icon={icon} title={title} right={actions} glow={glow} />
      <div className="fw-card-body">{children}</div>
    </Card>
  );
}

export function Sidebar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <aside className={`fw-sidebar ${className}`}>{children}</aside>;
}

export function NavigationItem({
  label,
  icon,
  active,
  onClick,
  badge,
}: {
  label: string;
  icon?: string;
  active?: boolean;
  onClick?: () => void;
  badge?: ReactNode;
}) {
  return (
    <button type="button" className={`fw-nav-item ${active ? "active" : ""}`} onClick={onClick}>
      {icon && <span className="fw-nav-item-icon">{Icon(icon, { size: 16 })}</span>}
      <span className="fw-nav-item-label">{label}</span>
      {badge ? <span className="fw-nav-item-badge">{badge}</span> : null}
    </button>
  );
}
