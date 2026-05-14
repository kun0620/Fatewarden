import { ArrowLeft, BookOpen, Cog, DoorOpen, LogOut, Plus, ScrollText, Users } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { listJoinedSessions } from '../lib/sessions';
import { listVaultCharacters } from '../lib/characters';
import type { GameSession, VaultCharacter } from '../types';
import { SessionLobby, type RoomModal } from './SessionLobby';

type MenuView = 'home' | 'characters' | 'library' | 'settings';

type MainMenuProps = {
  user: User;
  roomModal: RoomModal;
  onRoomModalChange: (modal: RoomModal) => void;
  onRequestEnterSession: (session: GameSession) => void;
  onSignOut: () => void;
};

type MenuCardProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary';
};

function MenuCard({ icon, title, subtitle, onClick, disabled, variant = 'default' }: MenuCardProps) {
  return (
    <button
      className={`fw-menu-card ${variant === 'primary' ? 'fw-menu-card--primary' : ''}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
      aria-label={`${title}. ${subtitle}`}
    >
      <div className="fw-menu-card__icon">{icon}</div>
      <h3 className="fw-menu-card__title">{title}</h3>
      <p className="fw-menu-card__subtitle">{subtitle}</p>
    </button>
  );
}

type ComingSoonPanelProps = {
  title: string;
  copy: string;
};

function ComingSoonPanel({ title, copy }: ComingSoonPanelProps) {
  return (
    <div className="fw-coming-soon">
      <h2 className="fw-h2">{title}</h2>
      <p className="fw-caption" style={{ marginTop: 'var(--sp-3)' }}>{copy}</p>
    </div>
  );
}

type CharactersListProps = {
  items: VaultCharacter[];
  error?: string;
};

function CharactersList({ items, error }: CharactersListProps) {
  if (error) {
    return (
      <div className="fw-menu--list">
        <p className="fw-caption" style={{ color: 'var(--ink-400)' }}>Unable to load characters: {error}</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="fw-menu--list">
        <p className="fw-caption">No characters yet. Create one in a session and save to vault.</p>
      </div>
    );
  }

  return (
    <div className="fw-menu--list">
      {items.map((char) => (
        <div className="fw-menu--list-item" key={char.id}>
          <div className="fw-menu--list-item-col">
            <p className="fw-body-sm">{char.name}</p>
            <span className="fw-caption">
              {char.className} / Level {char.level} / {char.ancestry}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MainMenu({
  user,
  roomModal,
  onRoomModalChange,
  onRequestEnterSession,
  onSignOut,
}: MainMenuProps) {
  const [view, setView] = useState<MenuView>('home');
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [vaultChars, setVaultChars] = useState<VaultCharacter[]>([]);
  const [vaultError, setVaultError] = useState('');

  useEffect(() => {
    let alive = true;
    listJoinedSessions()
      .then((rows) => {
        if (alive) setSessions(rows);
      })
      .catch(() => {
        // Silent fail — show empty state
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (view !== 'characters') return;
    let alive = true;
    setVaultError('');

    listVaultCharacters(user)
      .then((chars) => {
        if (alive) setVaultChars(chars);
      })
      .catch((error) => {
        if (alive) setVaultError(error instanceof Error ? error.message : 'Unknown error');
      });

    return () => {
      alive = false;
    };
  }, [view, user]);

  const latestSession = sessions[0] ?? null;

  if (view === 'home') {
    return (
      <>
        <section className="fw-menu">
          <div className="fw-menu__header">
            <p className="fw-caption">Main Menu</p>
            <h1 className="fw-h2">Choose your next move</h1>
          </div>

          <div className="fw-menu__grid">
            <MenuCard
              icon={<ScrollText size={20} aria-hidden="true" />}
              title="Continue Adventure"
              subtitle={latestSession?.title ?? 'No saved adventures'}
              disabled={!latestSession}
              onClick={() => {
                if (latestSession) {
                  onRequestEnterSession(latestSession);
                }
              }}
              variant="primary"
            />
            <MenuCard
              icon={<Plus size={20} aria-hidden="true" />}
              title="Create New Room"
              subtitle="Forge a new realm"
              onClick={() => onRoomModalChange('create')}
            />
            <MenuCard
              icon={<DoorOpen size={20} aria-hidden="true" />}
              title="Join Room"
              subtitle="Cross the threshold"
              onClick={() => onRoomModalChange('join')}
            />
            <MenuCard
              icon={<Users size={20} aria-hidden="true" />}
              title="My Characters"
              subtitle={`${vaultChars.length} bound`}
              onClick={() => setView('characters')}
            />
            <MenuCard
              icon={<BookOpen size={20} aria-hidden="true" />}
              title="Campaign Library"
              subtitle="Coming soon"
              disabled
              onClick={() => setView('library')}
            />
            <MenuCard
              icon={<Cog size={20} aria-hidden="true" />}
              title="Settings"
              subtitle="Coming soon"
              disabled
              onClick={() => setView('settings')}
            />
          </div>

          <div className="fw-menu__footer">
            <button className="fw-btn fw-btn--ghost" onClick={onSignOut} type="button">
              <LogOut size={18} aria-hidden="true" />
              Sign Out
            </button>
            <p className="fw-caption">Hub for everything before you enter the cockpit.</p>
          </div>
        </section>

        <SessionLobby
          modalsOnly
          user={user}
          roomModal={roomModal}
          onRoomModalChange={onRoomModalChange}
          onRequestEnterSession={onRequestEnterSession}
          onSignOut={onSignOut}
        />
      </>
    );
  }

  return (
    <section className="fw-menu fw-menu--subview">
      <button className="fw-btn fw-btn--ghost" onClick={() => setView('home')} type="button">
        <ArrowLeft size={18} aria-hidden="true" />
        Back to menu
      </button>

      {view === 'characters' && <CharactersList items={vaultChars} error={vaultError} />}
      {view === 'library' && (
        <ComingSoonPanel
          title="Campaign Library"
          copy="Long-form arcs ที่เชื่อมหลาย session — ยังไม่พร้อม"
        />
      )}
      {view === 'settings' && (
        <ComingSoonPanel
          title="Settings"
          copy="Preferences สำหรับ DM tools, theme, accessibility — กำลังตามมา"
        />
      )}
    </section>
  );
}
