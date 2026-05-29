import React from 'react';

export function FateSeal({
  size = 64,
  animate = true,
  style,
  className,
}: {
  size?: number;
  animate?: boolean;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", ...style }} className={className}>
      <defs>
        <radialGradient id="seal-fill" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#1a1428" />
          <stop offset="100%" stopColor="#08070d" />
        </radialGradient>
        <linearGradient id="seal-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EAC074" />
          <stop offset="100%" stopColor="#8A6A2C" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#seal-fill)" stroke="url(#seal-gold)" strokeWidth="0.8" />
      <g className={animate ? "fw-rune-spin" : ""} style={{ transformOrigin: "50px 50px" }}>
        <circle cx="50" cy="50" r="40" fill="none" stroke="#D6A84F" strokeOpacity="0.35" strokeDasharray="2 4" />
        <g fontFamily="Cinzel" fontSize="4.4" fill="#D6A84F" fillOpacity="0.6" letterSpacing="3">
          <text x="50" y="14" textAnchor="middle">FATE · WARDEN · ARCANUM · LUMEN</text>
        </g>
      </g>
      <g stroke="url(#seal-gold)" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 50 Q50 28 78 50 Q50 72 22 50z" />
        <circle cx="50" cy="50" r="9" />
        <circle cx="50" cy="50" r="4" fill="#D6A84F" stroke="none"/>
        <path d="M50 22 v6 M50 72 v6 M22 50 h6 M72 50 h6" />
        <path d="M30 30l5 5 M70 30l-5 5 M30 70l5-5 M70 70l-5-5" strokeOpacity="0.7" />
      </g>
    </svg>
  );
}

export function FateLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const px = size === "sm" ? 22 : size === "lg" ? 36 : 28;
  const fs = size === "sm" ? 13 : size === "lg" ? 20 : 15;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <FateSeal size={px} animate={false} />
      <div className="fw-display" style={{ fontSize: fs, letterSpacing: "0.18em", color: "var(--text)" }}>
        FATE<span style={{ color: "var(--gold)" }}>·</span>WARDEN
      </div>
    </div>
  );
}
