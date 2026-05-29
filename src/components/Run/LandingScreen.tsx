import { ArrowRight, Compass } from 'lucide-react';

interface LandingScreenProps {
  activeRunLabel?: string;
  hasActiveRun?: boolean;
  onEnterTable: () => void;
  sessionLabel?: string;
}

export function LandingScreen({
  activeRunLabel,
  hasActiveRun = false,
  onEnterTable,
  sessionLabel,
}: LandingScreenProps) {
  return (
    <div className="wr-app">
      <div className="wr-atmos" />
      <div className="wr-noise" />
      <div className="wr-vignette" />

      <main className="wr-landing">
        <div className="wr-landing-art" aria-hidden="true">
          <svg viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
            <defs>
              <radialGradient id="wr-landing-glow" cx="50%" cy="62%" r="55%">
                <stop offset="0%" stopColor="#9B5DE5" stopOpacity="0.35" />
                <stop offset="55%" stopColor="#3a1e58" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#050309" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="wr-landing-floor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0d0719" stopOpacity="0" />
                <stop offset="100%" stopColor="#050309" stopOpacity="1" />
              </linearGradient>
            </defs>

            <rect width="1200" height="720" fill="#080414" />
            <ellipse cx="600" cy="440" rx="600" ry="240" fill="url(#wr-landing-glow)">
              <animate attributeName="opacity" values="0.75;1;0.75" dur="6s" repeatCount="indefinite" />
            </ellipse>

            <g fill="#040208" stroke="#231434" strokeWidth="1.2">
              <path d="M 360 720 V 360 Q 360 220 600 200 Q 840 220 840 360 V 720 Z" />
              <path d="M 600 200 V 720" stroke="#1b1028" strokeWidth="1.5" />
              <path d="M 400 720 V 380 Q 400 260 600 240 Q 800 260 800 380 V 720" stroke="#1b1028" fill="none" />
              <path d="M 440 720 V 400 Q 440 300 600 280 Q 760 300 760 400 V 720" stroke="#1b1028" fill="none" />
              <rect x="350" y="356" width="22" height="18" fill="#2a1b3a" />
              <rect x="828" y="356" width="22" height="18" fill="#2a1b3a" />
            </g>

            <g>
              <ellipse cx="305" cy="520" rx="30" ry="8" fill="#3b1a5a" />
              <path d="M 300 520 Q 290 470 305 440 Q 320 470 310 520 Z" fill="#9B5DE5" opacity="0.85">
                <animate attributeName="opacity" values="0.55;0.95;0.55" dur="2.8s" repeatCount="indefinite" />
              </path>
              <path d="M 302 510 Q 296 480 308 460 Q 314 480 306 510 Z" fill="#D4A028" opacity="0.95" />
              <ellipse cx="895" cy="520" rx="30" ry="8" fill="#3b1a5a" />
              <path d="M 890 520 Q 880 470 895 440 Q 910 470 900 520 Z" fill="#9B5DE5" opacity="0.85">
                <animate attributeName="opacity" values="0.95;0.55;0.95" dur="3.1s" repeatCount="indefinite" />
              </path>
              <path d="M 892 510 Q 886 480 898 460 Q 904 480 896 510 Z" fill="#D4A028" opacity="0.95" />
            </g>

            {Array.from({ length: 26 }).map((_, index) => (
              <circle
                key={index}
                cx={120 + (index * 37) % 960 + (index % 3) * 10}
                cy={520 - (index * 17) % 280}
                r={(index % 3) + 1}
                fill={index % 3 === 0 ? '#D4A028' : '#9B5DE5'}
                opacity={0.35 + (index % 5) / 10}
              >
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values={`0 0; 0 ${-14 - (index % 4) * 6}; 0 0`}
                  dur={`${4 + (index % 5)}s`}
                  repeatCount="indefinite"
                />
                <animate attributeName="opacity" values="0.15;0.65;0.15" dur={`${3 + (index % 6)}s`} repeatCount="indefinite" />
              </circle>
            ))}

            <rect x="0" y="480" width="1200" height="240" fill="url(#wr-landing-floor)" />
          </svg>
        </div>

        <section className="wr-landing-frame" aria-labelledby="warden-run-title">
          <div className="wr-landing-eyebrow">A descent for one to four wardens</div>
          <h1 id="warden-run-title" className="wr-landing-title">
            FATE<span style={{ color: 'var(--wr-gold)' }}>·</span>WARDEN
          </h1>
          <div className="wr-landing-sub">Warden&apos;s Run</div>
          <div className="wr-rule" style={{ maxWidth: 320, margin: '20px auto' }}>
            <span className="wr-rule-diamond" />
          </div>
          <p className="wr-landing-flavor">
            Awaiting your move. The table remembers every oath, every fracture, and every door left unopened.
          </p>

          <div className="wr-landing-cta">
            <button className="wr-btn wr-btn-gold wr-btn-lg" onClick={onEnterTable} type="button">
              <Compass size={15} aria-hidden="true" /> Enter the Table <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>

          <div className="wr-landing-foot">
            <span className={`wr-presence-dot ${hasActiveRun ? 'online pulse' : 'offline'}`} />
            {hasActiveRun ? `Awaiting Your Move - ${activeRunLabel ?? 'active run'}` : (sessionLabel ?? 'No active run bound to this gate')}
          </div>
        </section>
      </main>
    </div>
  );
}

export default LandingScreen;
