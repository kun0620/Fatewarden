import { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

interface RunIntroScreenProps {
  floorNumber: number;
  floorName?: string;
  flavorText?: string;
  onDescend: () => void;
}

const FLOOR_NAMES = [
  'Stratum I — The Threshold',
  'Stratum II — The Ashen Way',
  'Stratum III — The Cinder-Reeve',
];

const FLOOR_FLAVOR = [
  'The gate remembers every warden who did not return.',
  'Ash rises where the old fires burned. Press deeper.',
  'Something waits at the bottom. It has always waited.',
];

function floorIndex(floorNumber: number) {
  return Math.max(0, Math.min(FLOOR_NAMES.length - 1, floorNumber - 1));
}

export function RunIntroScreen({
  floorNumber,
  floorName,
  flavorText,
  onDescend,
}: RunIntroScreenProps) {
  const index = floorIndex(floorNumber);
  const title = floorName ?? FLOOR_NAMES[index];
  const flavor = flavorText ?? FLOOR_FLAVOR[index];

  useEffect(() => {
    const timer = window.setTimeout(onDescend, 5000);
    return () => window.clearTimeout(timer);
  }, [onDescend]);

  return (
    <div className="wr-app">
      <div className="wr-atmos" />
      <div className="wr-noise" />
      <div className="wr-vignette" />

      <main className="wr-intro" aria-labelledby="run-intro-title">
        <div className="wr-intro-bg" aria-hidden="true">
          <svg viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
            <defs>
              <radialGradient id="wr-intro-glow" cx="50%" cy="55%" r="55%">
                <stop offset="0%" stopColor="#9B5DE5" stopOpacity="0.25" />
                <stop offset="50%" stopColor="#3a1e58" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#050309" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="1200" height="720" fill="#050309" />
            <ellipse cx="600" cy="400" rx="700" ry="240" fill="url(#wr-intro-glow)" />
            <g fill="#0c071a" stroke="#1b1028" strokeWidth="1">
              <path d="M 0 720 L 0 540 L 200 540 L 200 580 L 380 580 L 380 615 L 540 615 L 540 645 L 660 645 L 660 670 L 820 670 L 820 690 L 1200 690 L 1200 720 Z" />
            </g>
            <ellipse cx="600" cy="700" rx="500" ry="40" fill="#9B5DE5" opacity="0.15" />
          </svg>
        </div>

        <section className="wr-intro-content">
          <div className="wr-intro-eyebrow">Run descends</div>
          <h1 id="run-intro-title" className="wr-intro-title">
            {title.toUpperCase()}
          </h1>
          <div className="wr-rule" style={{ maxWidth: 360, margin: '20px auto' }}>
            <span className="wr-rule-diamond" />
          </div>
          <p className="wr-intro-flavor">{flavor}</p>
          <button className="wr-btn wr-btn-violet wr-btn-lg wr-intro-btn" onClick={onDescend} type="button">
            Descend <ArrowRight size={14} aria-hidden="true" />
          </button>
        </section>
      </main>
    </div>
  );
}

export default RunIntroScreen;
