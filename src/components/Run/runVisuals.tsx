import {
  Anvil,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Coins,
  Feather,
  Flame,
  Hammer,
  Heart,
  Moon,
  RefreshCw,
  Scroll,
  Shield,
  Sparkles,
  Star,
  Sword,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

const ICONS: Record<string, LucideIcon> = {
  anvil: Anvil,
  arrowR: ArrowRight,
  check: Check,
  chevL: ArrowLeft,
  chevR: ChevronRight,
  coin: Coins,
  feather: Feather,
  flame: Flame,
  hammer: Hammer,
  heart: Heart,
  moon: Moon,
  potion: Heart,
  refresh: RefreshCw,
  rune: Sparkles,
  scroll: Scroll,
  shield: Shield,
  sparkles: Sparkles,
  star: Star,
  sword: Sword,
  x: X,
};

export function WIcon(name: string | undefined, options: { size?: number; stroke?: number } = {}): ReactNode {
  const Icon = ICONS[name ?? ''] ?? Sparkles;
  return <Icon size={options.size ?? 16} strokeWidth={options.stroke ?? 1.7} aria-hidden="true" />;
}

export function PortraitArt({ kind, color = '#9B5DE5' }: { kind?: string; color?: string }) {
  const safeId = (kind ?? 'run').replace(/[^a-zA-Z0-9_-]/g, '-');

  return (
    <svg viewBox="0 0 100 130" preserveAspectRatio="xMidYMax meet" width="100%" height="100%" aria-hidden="true">
      <defs>
        <radialGradient id={`wr-screen-portrait-aura-${safeId}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`wr-screen-portrait-fig-${safeId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1428" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#0a0612" stopOpacity="0.96" />
          <stop offset="100%" stopColor="#050309" stopOpacity="1" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="60" r="50" fill={`url(#wr-screen-portrait-aura-${safeId})`} />
      <g stroke={color} strokeWidth="0.8" fill="none" opacity="0.55">
        <circle cx="50" cy="38" r="18" />
        <path d="M32 38h36 M50 18v40" />
      </g>
      <path
        fill={`url(#wr-screen-portrait-fig-${safeId})`}
        d="M50 30 a10 10 0 1 1 0.1 0 M30 130 v-20 c0-12 6-20 14-24 c-1-3 0-5 3-6 h6 c3 1 4 3 3 6 c8 4 14 12 14 24 v20 z"
      />
    </svg>
  );
}

export function SceneChapel() {
  return (
    <svg viewBox="0 0 800 280" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="wr-sc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a0e2a" />
          <stop offset="60%" stopColor="#0a0612" />
          <stop offset="100%" stopColor="#050309" />
        </linearGradient>
        <radialGradient id="wr-sc-glow" cx="50%" cy="55%" r="40%">
          <stop offset="0%" stopColor="#D4A028" stopOpacity="0.5" />
          <stop offset="60%" stopColor="#8B1538" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0a0612" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="wr-sc-orb" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F5E6D3" />
          <stop offset="35%" stopColor="#D4A028" />
          <stop offset="100%" stopColor="#8B1538" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="280" fill="url(#wr-sc-sky)" />
      <rect width="800" height="280" fill="url(#wr-sc-glow)" />
      <path d="M0 280 V160 Q120 140 180 110 Q220 60 260 40 Q300 60 340 110 Q400 140 460 110 Q500 60 540 40 Q580 60 620 110 Q680 140 800 160 V280 z" fill="#0a0612" opacity="0.85" />
      <g fill="#050309" opacity="0.9">
        <rect x="80" y="110" width="22" height="170" />
        <rect x="180" y="80" width="26" height="200" />
        <rect x="594" y="80" width="26" height="200" />
        <rect x="698" y="110" width="22" height="170" />
      </g>
      <g>
        <rect x="370" y="180" width="60" height="50" fill="#1d1228" stroke="#6E4E08" strokeWidth="1" />
        <rect x="360" y="178" width="80" height="6" fill="#2a1b3a" stroke="#6E4E08" strokeWidth="1" />
      </g>
      <line x1="400" y1="40" x2="400" y2="130" stroke="#6E4E08" strokeWidth="1.2" strokeDasharray="3 4" />
      <circle cx="400" cy="140" r="44" fill="url(#wr-sc-orb)" opacity="0.9" />
      <circle cx="400" cy="140" r="14" fill="#F5E6D3" opacity="0.8" />
      <g opacity="0.55" transform="translate(280 110)">
        <path d="M30 0 a16 16 0 1 1 0.1 0 M10 130 v-22 c0-18 8-28 18-32 c-2-2 -2-5 0-7 c1-2 4-2 6 0 c2 2 2 5 0 7 c10 4 18 14 18 32 v22 z" fill="#000" />
        <path d="M52 130 q120 -8 220 0 q -110 30 -220 0 z" fill="#000" opacity="0.5" />
      </g>
    </svg>
  );
}

export function SceneCampfire() {
  return (
    <svg viewBox="0 0 460 220" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true">
      <defs>
        <radialGradient id="wr-cf-glow" cx="50%" cy="80%" r="55%">
          <stop offset="0%" stopColor="#D4A028" stopOpacity="0.8" />
          <stop offset="40%" stopColor="#8B1538" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0a0612" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="wr-cf-flame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#8B1538" />
          <stop offset="50%" stopColor="#D4A028" />
          <stop offset="100%" stopColor="#F5E6D3" />
        </linearGradient>
      </defs>
      <rect width="460" height="220" fill="#0a0612" />
      <ellipse cx="230" cy="200" rx="160" ry="40" fill="url(#wr-cf-glow)" />
      <g stroke="#3a2849" strokeWidth="1.5" fill="#1d1228">
        <ellipse cx="200" cy="178" rx="80" ry="10" />
        <line x1="160" y1="175" x2="180" y2="160" />
        <line x1="220" y1="160" x2="250" y2="175" />
        <line x1="170" y1="180" x2="155" y2="165" />
      </g>
      <path d="M210 165 Q220 130 230 145 Q235 110 240 140 Q255 100 250 145 Q260 135 245 170 Q230 175 210 165 z" fill="url(#wr-cf-flame)" />
      <path d="M222 155 Q228 130 232 148 Q240 130 240 152 Q236 168 222 155 z" fill="#F5E6D3" opacity="0.8" />
      <g fill="#000" opacity="0.85">
        <path d="M60 200 q-10 -50 18 -60 q24 8 16 60 z" />
        <path d="M380 200 q10 -50 -18 -60 q-24 8 -16 60 z" />
        <path d="M130 205 q-6 -30 12 -36 q14 4 8 36 z" opacity="0.8" />
        <path d="M310 205 q6 -30 -12 -36 q-14 4 -8 36 z" opacity="0.8" />
      </g>
    </svg>
  );
}

export function SceneChest() {
  return (
    <svg viewBox="0 0 220 160" preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true">
      <defs>
        <radialGradient id="wr-ch-glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#D4A028" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#9B5DE5" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0a0612" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="wr-ch-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2849" />
          <stop offset="100%" stopColor="#14091f" />
        </linearGradient>
        <linearGradient id="wr-ch-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EAC067" />
          <stop offset="100%" stopColor="#6E4E08" />
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="50" rx="100" ry="50" fill="url(#wr-ch-glow)" />
      <path d="M50 70 Q110 30 170 70 L170 90 L50 90 z" fill="url(#wr-ch-body)" stroke="#6E4E08" strokeWidth="1.5" />
      <rect x="40" y="88" width="140" height="60" fill="url(#wr-ch-body)" stroke="#6E4E08" strokeWidth="1.5" />
      <rect x="100" y="100" width="20" height="20" fill="url(#wr-ch-gold)" stroke="#3a2849" />
      <circle cx="110" cy="110" r="3" fill="#0a0612" />
      <line x1="60" y1="88" x2="60" y2="148" stroke="#6E4E08" strokeWidth="2" />
      <line x1="160" y1="88" x2="160" y2="148" stroke="#6E4E08" strokeWidth="2" />
    </svg>
  );
}
