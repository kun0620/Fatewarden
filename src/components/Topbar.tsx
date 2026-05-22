import type { User } from '@supabase/supabase-js';
import { useMemo, useState } from 'react';
import type { AppStage } from '../lib/appFlow';
import { Icon } from './ui/Icons';

const CRUMBS: Record<AppStage, [string, string]> = {
  'local-play': ['At the Table', 'Local Play'],
  login: ['Hearth', 'Sign in'],
  menu: ['Hearth', 'Main Menu'],
  'room-setup': ['Hearth', 'Forge a Room'],
  'character-setup': ['Hearth', 'Bind your character'],
  lobby: ['Hearth', 'Lobby'],
  'char-sheet': ['Hearth', 'Character Sheet'],
  'char-vault': ['Hearth', 'Character Vault'],
  'char-wizard': ['Hearth', 'New Character'],
  'dm-dashboard': ['At the Table', 'DM Dashboard'],
  game: ['At the Table', 'Session'],
  bestiary: ['The Stacks', 'Bestiary'],
  library: ['The Stacks', 'Campaign Library'],
  'campaign-creator': ['The Forge', 'Campaign Creator'],
  'ai-campaign-generator': ['The Forge', 'AI Campaign Generator'],
  settings: ["The Scribe's Desk", 'Settings'],
};

type TopbarProps = {
  stage: AppStage;
  user: User | null;
  onRequestSettings?: () => void;
  onSignOut?: () => void;
};

export function Topbar({ onRequestSettings, onSignOut, stage, user }: TopbarProps) {
  const [root, leaf] = CRUMBS[stage] ?? CRUMBS.menu;
  const [open, setOpen] = useState(false);
  const initials = useMemo(() => {
    const source = user?.user_metadata?.displayName || user?.user_metadata?.username || user?.email || 'FW';
    return String(source)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  return (
    <header className="fw-topbar">
      <div className="fw-crumb">
        <span>{root}</span>
        {Icon('chevR', { size: 10 })}
        <b>{leaf}</b>
      </div>
      <div className="fw-topbar-spacer" />
      <div className="fw-search">
        {Icon('search', { size: 12 })}
        <input placeholder="Search campaigns, characters, rules..." />
        <kbd>Ctrl K</kbd>
      </div>
      <button type="button" className="fw-btn fw-btn-ghost fw-btn-sm">
        {Icon('scroll', { size: 11 })} Bestiary
      </button>
      {user ? (
        <div className="fw-topbar-account">
          <button className="fw-avatar sm" onClick={() => setOpen((next) => !next)} type="button" aria-label="Account menu">
            {initials}
          </button>
          {open ? (
            <div className="fw-topbar-account-menu">
              <strong>{user.user_metadata?.displayName || user.email}</strong>
              <span>{user.email}</span>
              <button onClick={() => { setOpen(false); onRequestSettings?.(); }} type="button">Profile</button>
              <button onClick={() => { setOpen(false); onRequestSettings?.(); }} type="button">Settings</button>
              <button onClick={() => { setOpen(false); onSignOut?.(); }} type="button">Sign Out</button>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
