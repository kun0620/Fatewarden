import type { User } from '@supabase/supabase-js';
import { Icon } from './ui/Icons';
import { FateSeal } from './ui/Brand';
import type { AppStage } from '../lib/appFlow';

type RailBtnProps = {
  icon: string;
  label: string;
  active?: boolean;
  badge?: string;
  disabled?: boolean;
  onClick?: () => void;
};

function RailBtn({ icon, label, active, badge, disabled, onClick }: RailBtnProps) {
  return (
    <button
      type="button"
      className={`fw-rail-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      disabled={disabled}
      style={disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
    >
      {Icon(icon, { size: 17 })}
      <span className="fw-rail-label">{label}</span>
      {badge ? (
        <span
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            minWidth: 14,
            height: 14,
            padding: '0 3px',
            background: 'var(--blood)',
            border: '1px solid var(--bg)',
            borderRadius: 8,
            color: '#FFE6E6',
            fontSize: 9,
            fontFamily: 'var(--f-mono)',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 0 6px rgba(153,27,27,0.6)',
          }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function initialsFor(user: User | null): string {
  const source = user?.email ?? '';
  const handle = source.split('@')[0] ?? '';
  const letters = handle.replace(/[^a-zA-Z]/g, '');
  if (letters.length >= 2) return letters.slice(0, 2).toUpperCase();
  if (letters.length === 1) return letters.toUpperCase();
  return 'AE';
}

type AppRailProps = {
  activeStage: AppStage;
  hasActiveSession: boolean;
  user: User | null;
  onNavigate: (target: 'menu' | 'game' | 'char-sheet' | 'char-vault' | 'char-wizard' | 'dm-dashboard' | 'bestiary' | 'library' | 'settings') => void;
  onSignOut: () => void;
};

export function AppRail({ activeStage, hasActiveSession, user, onNavigate, onSignOut }: AppRailProps) {
  const isHearth = activeStage === 'menu' || activeStage === 'room-setup' || activeStage === 'character-setup' || activeStage === 'lobby';

  return (
    <nav className="fw-rail">
      <div className="fw-rail-logo">
        <FateSeal size={36} animate={false} />
      </div>
      <RailBtn icon="home" label="Hearth" active={isHearth} onClick={() => onNavigate('menu')} />
      <RailBtn
        icon="dice"
        label="Play"
        active={activeStage === 'game' || activeStage === 'local-play'}
        disabled={!hasActiveSession && activeStage !== 'local-play'}
        onClick={() => onNavigate('game')}
      />
      <RailBtn icon="scroll" label="Sheet" active={activeStage === 'char-sheet'} onClick={() => onNavigate('char-sheet')} />
      <RailBtn icon="users" label="Vault" active={activeStage === 'char-vault' || activeStage === 'char-wizard'} onClick={() => onNavigate('char-vault')} />
      <RailBtn icon="crown" label="DM" active={activeStage === 'dm-dashboard'} onClick={() => onNavigate('dm-dashboard')} />
      <RailBtn icon="skull" label="Bestiary" active={activeStage === 'bestiary'} onClick={() => onNavigate('bestiary')} />
      <RailBtn icon="book" label="Library" active={activeStage === 'library'} onClick={() => onNavigate('library')} />
      <RailBtn icon="map" label="World" disabled />
      <span style={{ flex: 1 }} />
      <RailBtn icon="bell" label="Notices" badge="3" />
      <RailBtn icon="cog" label="Settings" active={activeStage === 'settings'} onClick={() => onNavigate('settings')} />
      <RailBtn icon="logout" label="Logout" onClick={onSignOut} />
      <div style={{ marginTop: 6 }}>
        <button
          type="button"
          className="fw-avatar sm dm"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.3), #15101f)',
            cursor: 'pointer',
            border: 0,
          }}
          onClick={() => onNavigate('settings')}
          title={user?.email ?? 'Account'}
          aria-label="Account settings"
        >
          {initialsFor(user)}
        </button>
      </div>
    </nav>
  );
}
