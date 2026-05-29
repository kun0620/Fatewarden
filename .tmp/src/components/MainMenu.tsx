import {
  ArrowRight,
  Bell,
  BookOpen,
  Copy,
  DoorOpen,
  Flame,
  Home,
  History,
  LibraryBig,
  LogOut,
  Map,
  Plus,
  Play,
  Search,
  ScrollText,
  Settings,
  Sparkles,
  Sword,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { listVaultCharacters } from '../lib/characters';
import { listJoinedSessions } from '../lib/sessions';
import type { GameSession, VaultCharacter } from '../types';
import { SessionLobby, type RoomModal } from './SessionLobby';

type MainMenuProps = {
  user: User;
  roomModal: RoomModal;
  onRoomModalChange: (modal: RoomModal) => void;
  onRequestEnterSession: (session: GameSession) => void;
  onRequestLibrary?: () => void;
  onRequestSettings?: () => void;
  onRequestRoomSetup: () => void;
  onSignOut: () => void;
};

type MenuCardProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'gold' | 'arcane';
};

type CharacterCardProps = {
  character: VaultCharacter;
};

type ActiveRoomCardProps = {
  isOwner: boolean;
  session: GameSession;
  onEnter: (session: GameSession) => void;
};

type EmptyCardProps = {
  body: string;
  title: string;
};

function MenuCard({ icon, title, subtitle, onClick, disabled, variant = 'default' }: MenuCardProps) {
  return (
    <button
      aria-label={`${title}. ${subtitle}`}
      className={`fw-main-menu__tile ${variant !== 'default' ? `is-${variant}` : ''}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <div className="fw-main-menu__tile-icon">{icon}</div>
      <h3 className="fw-main-menu__tile-title">{title}</h3>
      <p className="fw-main-menu__tile-subtitle">{subtitle}</p>
    </button>
  );
}

function CharacterCard({ character }: CharacterCardProps) {
  const hpPercent = Math.max(0, Math.min(100, Math.round((character.hitPoints / Math.max(1, character.maxHitPoints)) * 100)));
  return (
    <article className="fw-main-menu__character-card">
      <div aria-hidden="true" className="fw-main-menu__character-avatar">
        {character.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="fw-main-menu__character-meta">
        <p className="fw-main-menu__character-name">{character.name}</p>
        <p className="fw-main-menu__character-role">
          {character.ancestry} {character.className} · Lv {character.level}
        </p>
        <div className="fw-stat-bar">
          <span className="lbl">HP</span>
          <div className="fw-bar hp bar">
            <i style={{ width: `${hpPercent}%` }} />
          </div>
          <span className="num">
            {character.hitPoints}/{character.maxHitPoints}
          </span>
        </div>
      </div>
    </article>
  );
}

function ActiveRoomCard({ isOwner, onEnter, session }: ActiveRoomCardProps) {
  const [copied, setCopied] = useState(false);
  const joinedDate = new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  async function copyCode() {
    await navigator.clipboard?.writeText(session.joinCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <article className="fw-main-menu__room-card">
      <div className="fw-main-menu__room-card-top">
        <span className={`fw-pill ${session.phase === 'combat' ? 'fw-pill-blood' : 'fw-pill-dim'}`}>
          {session.phase === 'combat' ? 'Live' : 'Lobby'}
        </span>
        <span className="fw-main-menu__room-code">{session.joinCode}</span>
        <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => void copyCode()} type="button">
          <Copy size={12} aria-hidden="true" />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <h4 className="fw-main-menu__room-name">{session.title}</h4>
      <p className="fw-main-menu__room-meta">
        {session.playMode.toUpperCase()} · {session.theme.key.replaceAll('_', ' ')} · {joinedDate}
      </p>
      <div className="fw-main-menu__room-actions">
        <button className="fw-btn fw-btn-gold fw-btn-sm" onClick={() => onEnter(session)} type="button">
          {session.phase === 'setup' ? 'Open Lobby' : 'Rejoin'} <ArrowRight size={12} aria-hidden="true" />
        </button>
        {isOwner ? <span className="fw-pill fw-pill-gold">Host</span> : <span className="fw-pill fw-pill-dim">Member</span>}
      </div>
    </article>
  );
}

function EmptyCard({ body, title }: EmptyCardProps) {
  return (
    <div className="fw-main-menu__empty">
      <p className="fw-main-menu__empty-title">{title}</p>
      <p className="fw-main-menu__empty-body">{body}</p>
    </div>
  );
}

export function MainMenu({
  user,
  roomModal,
  onRoomModalChange,
  onRequestEnterSession,
  onRequestLibrary,
  onRequestSettings,
  onRequestRoomSetup,
  onSignOut,
}: MainMenuProps) {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [vaultChars, setVaultChars] = useState<VaultCharacter[]>([]);
  const [sessionsError, setSessionsError] = useState('');
  const [vaultError, setVaultError] = useState('');

  useEffect(() => {
    let alive = true;
    setSessionsError('');
    setVaultError('');

    listJoinedSessions()
      .then((rows) => {
        if (alive) setSessions(rows);
      })
      .catch((error) => {
        if (alive) setSessionsError(error instanceof Error ? error.message : 'Could not load sessions.');
      });

    listVaultCharacters(user)
      .then((chars) => {
        if (alive) setVaultChars(chars);
      })
      .catch((error) => {
        if (alive) setVaultError(error instanceof Error ? error.message : 'Could not load characters.');
      });

    return () => {
      alive = false;
    };
  }, [roomModal, user]);

  const latestSession = sessions[0] ?? null;
  const recentSessions = useMemo(() => sessions.slice(0, 4), [sessions]);
  const featuredParty = useMemo(() => vaultChars.slice(0, 4), [vaultChars]);

  return (
    <>
      <div className="fw-menu-shell">
        <aside className="fw-menu-shell__rail" aria-label="Main navigation">
          <div className="fw-menu-shell__rail-logo">FW</div>
          <button className="fw-menu-shell__rail-btn is-active" title="Main Menu" type="button">
            <Home size={18} aria-hidden="true" />
          </button>
          <button className="fw-menu-shell__rail-btn" onClick={onRequestRoomSetup} title="Room Setup" type="button">
            <Plus size={17} aria-hidden="true" />
          </button>
          <button className="fw-menu-shell__rail-btn" onClick={() => onRoomModalChange('continue')} title="Characters" type="button">
            <Users size={17} aria-hidden="true" />
          </button>
          <button
            className="fw-menu-shell__rail-btn"
            disabled={!onRequestLibrary}
            onClick={onRequestLibrary}
            title="Library"
            type="button"
          >
            <BookOpen size={17} aria-hidden="true" />
          </button>
          <button className="fw-menu-shell__rail-btn" disabled title="World Map" type="button">
            <Map size={17} aria-hidden="true" />
          </button>
          <div className="fw-menu-shell__rail-spacer" />
          <button className="fw-menu-shell__rail-btn" disabled title="Notifications" type="button">
            <Bell size={17} aria-hidden="true" />
          </button>
          <button
            className="fw-menu-shell__rail-btn"
            disabled={!onRequestSettings}
            onClick={onRequestSettings}
            title="Settings"
            type="button"
          >
            <Settings size={17} aria-hidden="true" />
          </button>
          <button className="fw-menu-shell__rail-btn" onClick={onSignOut} title="Sign out" type="button">
            <LogOut size={17} aria-hidden="true" />
          </button>
          <div className="fw-menu-shell__rail-user">{user.email?.slice(0, 2).toUpperCase() ?? 'U'}</div>
        </aside>

        <section className="fw-menu-shell__main">
          <header className="fw-menu-shell__topbar">
            <div className="fw-menu-shell__crumb">
              <span>Hearth</span>
              <span className="sep">&gt;</span>
              <strong>Main Menu</strong>
            </div>
            <div className="fw-menu-shell__search">
              <Search size={13} aria-hidden="true" />
              <input aria-label="Search campaigns and characters" placeholder="Search campaigns, characters, rules..." />
              <kbd>Ctrl+K</kbd>
            </div>
            <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled type="button">
              <ScrollText size={12} aria-hidden="true" />
              Bestiary
            </button>
            <button className="fw-btn fw-btn-icon fw-btn-ghost" disabled type="button">
              <Bell size={14} aria-hidden="true" />
            </button>
          </header>

          <div className="fw-main-menu-scroll">
            <div className="fw-main-menu-page">
              <section className="fw-main-menu">
            <article className="fw-main-menu__hero fw-orn">
              <span className="fw-orn-c tl" />
              <span className="fw-orn-c tr" />
              <span className="fw-orn-c bl" />
              <span className="fw-orn-c br" />
              <div className="fw-main-menu__hero-copy">
                <div className="fw-main-menu__hero-pills">
                  <span className="fw-pill fw-pill-gold">
                    <Flame size={11} aria-hidden="true" />
                    Continue Adventure
                  </span>
                  <span className="fw-pill fw-pill-dim">
                    <History size={11} aria-hidden="true" />
                    {latestSession ? 'Last played recently' : 'No saved table yet'}
                  </span>
                </div>
                <p className="fw-eyebrow">Act I - Fatewarden Chronicle</p>
                <h1 className="fw-display fw-main-menu__hero-title">
                  {latestSession ? latestSession.title : 'No adventure bound yet'}
                </h1>
                <p className="fw-main-menu__hero-desc">
                  {latestSession
                    ? 'Your party is waiting in the same shared timeline. Rejoin now or open a new realm.'
                    : 'Create your first room, invite the party, then step into the cockpit.'}
                </p>
                <div className="fw-main-menu__hero-actions">
                  <button
                    className="fw-btn fw-btn-gold fw-btn-lg"
                    disabled={!latestSession}
                    onClick={() => latestSession && onRequestEnterSession(latestSession)}
                    type="button"
                  >
                    <Play size={15} aria-hidden="true" />
                    {latestSession ? 'Resume Session' : 'No Session Yet'}
                  </button>
                  <button className="fw-btn fw-btn-ghost" onClick={() => onRoomModalChange('continue')} type="button">
                    <ScrollText size={14} aria-hidden="true" />
                    Session Recap
                  </button>
                  {featuredParty.length ? (
                    <div className="fw-main-menu__party-avatars" aria-hidden="true">
                      {featuredParty.map((character, index) => (
                        <span className="fw-main-menu__party-avatar" key={character.id} style={{ marginLeft: index ? -8 : 0 }}>
                          {character.name.slice(0, 2).toUpperCase()}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="fw-main-menu__hero-art" aria-hidden="true">
                <div className="fw-main-menu__hero-art-seal" />
                <div className="fw-main-menu__hero-art-tags">
                  <span className="fw-pill">{latestSession?.title ?? 'No room yet'}</span>
                  <span className="fw-pill fw-pill-dim">
                    {(latestSession?.theme.key ?? 'dark_fantasy').replaceAll('_', ' ')}
                  </span>
                  <span className={`fw-pill ${latestSession?.phase === 'combat' ? 'fw-pill-blood' : 'fw-pill-arcane'}`}>
                    {latestSession?.phase ?? 'setup'}
                  </span>
                </div>
              </div>
            </article>

            <div className="fw-main-menu__quick-grid">
              <MenuCard
                icon={<Plus size={16} aria-hidden="true" />}
                title="Create New Room"
                subtitle="Forge a new realm"
                onClick={onRequestRoomSetup}
                variant="gold"
              />
              <MenuCard
                icon={<DoorOpen size={16} aria-hidden="true" />}
                title="Join Room"
                subtitle="Enter with invite code"
                onClick={() => onRoomModalChange('join')}
              />
              <MenuCard
                icon={<Users size={16} aria-hidden="true" />}
                title="My Characters"
                subtitle={`${vaultChars.length} in your vault`}
                onClick={() => onRoomModalChange('continue')}
              />
              <MenuCard
                icon={<LibraryBig size={16} aria-hidden="true" />}
                title="Campaign Library"
                subtitle="Browse your chronicles"
                disabled={!onRequestLibrary}
                onClick={() => onRequestLibrary?.()}
              />
              <MenuCard
                icon={<Sparkles size={16} aria-hidden="true" />}
                title="AI Warden"
                subtitle="Solo mode later"
                disabled
                onClick={() => {}}
                variant="arcane"
              />
              <MenuCard
                icon={<Settings size={16} aria-hidden="true" />}
                title="Settings"
                subtitle="Audio - Theme - Rules"
                disabled={!onRequestSettings}
                onClick={() => onRequestSettings?.()}
              />
            </div>

            <section className="fw-main-menu__split">
              <article className="fw-main-menu__panel">
                <div className="fw-main-menu__panel-head">
                  <h3 className="fw-display">My Characters</h3>
                </div>
                {vaultError ? (
                  <EmptyCard title="Could not load characters" body={vaultError} />
                ) : vaultChars.length ? (
                  <div className="fw-main-menu__character-grid">
                    {vaultChars.slice(0, 4).map((character) => (
                      <CharacterCard character={character} key={character.id} />
                    ))}
                  </div>
                ) : (
                  <EmptyCard title="No character yet" body="Create one from Character Entry modal when you enter a room." />
                )}
              </article>

              <article className="fw-main-menu__panel">
                <div className="fw-main-menu__panel-head">
                  <h3 className="fw-display">Active Rooms</h3>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => onRoomModalChange('continue')} type="button">
                    View all
                  </button>
                </div>
                {sessionsError ? (
                  <EmptyCard title="Could not load rooms" body={sessionsError} />
                ) : sessions.length ? (
                  <div className="fw-main-menu__room-list">
                    {sessions.slice(0, 3).map((session) => (
                      <ActiveRoomCard
                        isOwner={session.createdBy === user.id}
                        key={session.id}
                        onEnter={onRequestEnterSession}
                        session={session}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyCard title="No active room" body="Create a room or join with code to see your table list." />
                )}
              </article>
            </section>

            <section className="fw-main-menu__panel">
              <div className="fw-main-menu__panel-head">
                <h3 className="fw-display">Recent Campaigns</h3>
                <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled type="button">
                  <BookOpen size={12} aria-hidden="true" />
                  Library soon
                </button>
              </div>
              {recentSessions.length ? (
                <div className="fw-main-menu__recent-list">
                  {recentSessions.map((session) => (
                    <button
                      className="fw-main-menu__recent-item"
                      key={session.id}
                      onClick={() => onRequestEnterSession(session)}
                      type="button"
                    >
                      <div className="fw-main-menu__recent-thumb" aria-hidden="true" />
                      <div className="fw-main-menu__recent-copy">
                        <p className="fw-main-menu__recent-title">{session.title}</p>
                        <p className="fw-main-menu__recent-meta">
                          {session.playMode.toUpperCase()} · {session.phase.toUpperCase()} · {session.joinCode}
                        </p>
                      </div>
                      <span className="fw-main-menu__recent-action">
                        Open <ArrowRight size={12} aria-hidden="true" />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyCard title="No campaign history yet" body="Your first completed scene will appear here after you play." />
              )}
            </section>
              </section>
            </div>
          </div>
        </section>
      </div>

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
