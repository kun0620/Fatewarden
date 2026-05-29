import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { loadDashboard, relativeTimeLabel, type DashboardCampaign } from '../lib/dashboard';
import { joinGameSession } from '../lib/sessions';
import { useGameStore } from '../store/useGameStore';
import type { GameSession, VaultCharacter } from '../types';
import { FateSeal } from './ui/Brand';
import { Icon } from './ui/Icons';

type RoomModal = 'create' | 'join' | 'continue' | null;

type MainMenuProps = {
  user: User;
  roomModal: RoomModal;
  onRoomModalChange: (modal: RoomModal) => void;
  onRequestEnterSession: (session: GameSession) => void;
  onRequestLibrary?: () => void;
  onRequestSettings?: () => void;
  onRequestRoomSetup: () => void;
  onRequestLobby?: () => void;
  onRequestCharSheet?: () => void;
  onRequestDmDash?: () => void;
  onRequestBestiary?: () => void;
  onRequestWardenRun?: () => void;
  onRequestWardenVault?: () => void;
  onSignOut: () => void;
};

type CharacterSummary = {
  id: string;
  name: string;
  role: string;
  hp: number;
  hpMax: number;
  status: string;
  initials: string;
  color: string;
};

type RoomSummary = {
  id: string;
  live: boolean;
  code: string;
  name: string;
  host: string;
  mode: string;
  players: number;
  max: number;
  session: GameSession;
};

type RecentCampaign = {
  id: string;
  name: string;
  sessionLabel: string;
  when: string;
  note: string;
  session?: GameSession;
};

function Card({ children, className = '', elev, style }: { children: ReactNode; className?: string; elev?: boolean; style?: CSSProperties }) {
  return (
    <div className={`fw-card ${elev ? 'fw-card-elev' : ''} ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

function CardHead({ icon, right, title }: { icon: string; right?: ReactNode; title: string }) {
  return (
    <div className="fw-card-head">
      <div className="fw-card-title">
        {Icon(icon, { size: 13 })}
        <span>{title}</span>
      </div>
      {right}
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: 96,
        display: 'grid',
        placeItems: 'center',
        padding: 18,
        border: '1px dashed var(--border-soft)',
        borderRadius: 8,
        color: 'var(--text-3)',
        fontFamily: 'var(--f-serif)',
        fontSize: 13,
        fontStyle: 'italic',
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
}

function SkeletonRows({ count = 2 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div className="fw-skeleton-row" key={index}>
          <span />
          <i />
        </div>
      ))}
    </>
  );
}

function MainMenuModal({
  featured,
  modal,
  onClose,
  onJoin,
  onResume,
}: {
  featured?: GameSession;
  modal: RoomModal;
  onClose: () => void;
  onJoin?: (code: string) => Promise<void>;
  onResume: () => void;
}) {
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!modal) return null;

  const isJoin = modal === 'join' || modal === 'create';

  return (
    <div
      className="fw-proto-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section className="fw-proto-menu-modal fw-orn" aria-modal="true" role="dialog">
        <span className="fw-orn-c tl" />
        <span className="fw-orn-c tr" />
        <span className="fw-orn-c bl" />
        <span className="fw-orn-c br" />
        <button className="fw-proto-modal-close" onClick={onClose} type="button" aria-label="Close">
          {Icon('x', { size: 13 })}
        </button>

        <div className="fw-eyebrow">{isJoin ? 'Open a Gate' : 'Session Recap'}</div>
        <h2 className="fw-display">{isJoin ? 'Join room' : (featured?.title ?? 'No active chronicle')}</h2>
        <p className="fw-serif">
          {isJoin
            ? 'Enter an invite code from your table.'
            : 'Your party is still at the table. Review the last scene, then return when ready.'}
        </p>

        {isJoin ? (
          <form className="fw-proto-code-box" onSubmit={async (event) => {
            event.preventDefault();
            if (!onJoin) return;
            setBusy(true);
            setJoinError('');
            try {
              await onJoin(joinCode);
            } catch (error) {
              setJoinError(error instanceof Error ? error.message : 'Could not join room.');
            } finally {
              setBusy(false);
            }
          }}>
            <label htmlFor="room-code">Invite code</label>
            <input id="room-code" className="fw-input" onChange={(event) => setJoinCode(event.target.value)} placeholder="YSAV-9217" value={joinCode} />
            {joinError ? <p className="fw-auth-message is-error">{joinError}</p> : null}
            <div className="fw-proto-modal-actions">
              <button className="fw-btn fw-btn-ghost" onClick={onClose} type="button">Cancel</button>
              <button className="fw-btn fw-btn-gold" disabled={busy || !joinCode.trim()} type="submit">
                {busy ? 'Opening...' : 'Open lobby'} {Icon('arrowR', { size: 12 })}
              </button>
            </div>
          </form>
        ) : (
          <div className="fw-proto-recap-box">
            <div>
              <span className="fw-pill gold">{featured ? featured.phase : 'hearth'}</span>
              <span className="fw-pill dim">{featured?.playMode ?? 'campaign'}</span>
            </div>
            <strong>{featured ? 'The table is waiting.' : 'Create or join a room to begin.'}</strong>
            <span>{featured ? `${featured.theme} / ${featured.ruleStrictness}` : 'Recent campaign notes will appear here once a session exists.'}</span>
            <div className="fw-proto-modal-actions">
              <button className="fw-btn fw-btn-ghost" onClick={onClose} type="button">Dismiss</button>
              <button className="fw-btn fw-btn-gold" disabled={!featured} onClick={onResume} type="button">
                Resume session {Icon('arrowR', { size: 12 })}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ActionTile({
  arcane,
  desc,
  gold,
  icon,
  onClick,
  title,
}: {
  arcane?: boolean;
  desc: string;
  gold?: boolean;
  icon: string;
  onClick?: () => void;
  title: string;
}) {
  const color = gold ? 'var(--gold-bright)' : arcane ? 'var(--arcane-bright)' : 'var(--text-2)';

  return (
    <button
      className="fw-card"
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: 16,
        cursor: 'pointer',
        color: 'var(--text)',
        borderColor: gold ? 'rgba(214,168,79,0.3)' : arcane ? 'rgba(124,58,237,0.3)' : 'var(--border-soft)',
        background: gold
          ? 'linear-gradient(180deg, rgba(214,168,79,0.07), rgba(214,168,79,0.01))'
          : arcane
            ? 'linear-gradient(180deg, rgba(124,58,237,0.08), rgba(124,58,237,0.01))'
            : 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        alignItems: 'flex-start',
        font: 'inherit',
      }}
      type="button"
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid var(--border-soft)',
          display: 'grid',
          placeItems: 'center',
          color,
        }}
      >
        {Icon(icon, { size: 16 })}
      </div>
      <div>
        <div className="fw-display" style={{ fontSize: 13, color: 'var(--text)', letterSpacing: '0.08em' }}>
          {title}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{desc}</div>
      </div>
    </button>
  );
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'FW';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

export function MainMenu({
  user,
  roomModal,
  onRoomModalChange,
  onRequestEnterSession,
  onRequestLibrary,
  onRequestSettings,
  onRequestRoomSetup,
  onRequestLobby,
  onRequestCharSheet,
  onRequestDmDash,
  onRequestWardenRun,
  onRequestWardenVault,
}: MainMenuProps) {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [vaultChars, setVaultChars] = useState<VaultCharacter[]>([]);
  const [campaigns, setCampaigns] = useState<DashboardCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const setVaultCharacters = useGameStore((state) => state.setVaultCharacters);

  useEffect(() => {
    let alive = true;
    let interval: number | undefined;

    async function load() {
      if (alive) {
        setDashboardError('');
        setLoading((current) => current || !sessions.length);
      }
      try {
        const data = await loadDashboard(user);
        if (!alive) return;
        setSessions(data.sessions);
        setVaultChars(data.characters);
        setVaultCharacters(data.characters);
        setCampaigns(data.campaigns);
      } catch (error) {
        if (alive) setDashboardError(error instanceof Error ? error.message : 'Could not load dashboard.');
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    interval = window.setInterval(() => void load(), 30_000);

    return () => {
      alive = false;
      if (interval) window.clearInterval(interval);
    };
  }, [roomModal, setVaultCharacters, user]);

  const recentSessions = useMemo(() => sessions.slice(0, 4), [sessions]);
  const featured = recentSessions[0];

  const characterSummary = useMemo<CharacterSummary[]>(() => (
    vaultChars
      .filter((character) => character.name.trim().length > 0)
      .slice(0, 4)
      .map((character, index) => ({
        id: character.id,
        name: character.name,
        role: `${character.ancestry} ${character.className} - ${character.level}`,
        hp: character.hitPoints,
        hpMax: character.maxHitPoints,
        status: character.updatedAt ? `Updated ${relativeTimeLabel(character.updatedAt)}` : 'Vault character',
        initials: initialsFor(character.name),
        color: ['#7C3AED', '#D6A84F', '#22C55E', '#A8A29E'][index % 4],
      }))
  ), [vaultChars]);

  const roomSummary = useMemo<RoomSummary[]>(() => (
    sessions.slice(0, 2).map((session) => ({
      id: session.id,
      live: session.status !== 'ended' && (session.phase === 'combat' || session.phase === 'exploration'),
      code: session.joinCode,
      name: session.title,
      host: session.createdBy === user.id ? 'You' : 'Host',
      mode: session.playMode?.toUpperCase() ?? 'AI DM Mode',
      players: Math.max(1, Math.min(6, (session as { partySize?: number }).partySize ?? 1)),
      max: Math.max(1, (session as { partySize?: number }).partySize ?? 5),
      session,
    }))
  ), [sessions, user.id]);

  const recentCampaigns = useMemo<RecentCampaign[]>(() => (
    campaigns.slice(0, 3).map((campaign) => ({
      id: campaign.id,
      name: campaign.title,
      note: campaign.summary || `Acts ${campaign.actsCount} - levels ${campaign.levelMin}-${campaign.levelMax}`,
      when: relativeTimeLabel(campaign.updatedAt),
      sessionLabel: campaign.session ? 'SESSION' : 'CAMPAIGN',
      session: campaign.session,
    }))
  ), [campaigns]);

  const party = characterSummary.slice(0, 4);

  return (
    <>
      <div className="fw-scroll" style={{ flex: 1 }}>
        <div className="fw-page" style={{ paddingTop: 20 }}>
          <Card elev className="fw-fade fw-orn" style={{ overflow: 'hidden', marginBottom: 28, padding: 0 }}>
            <span className="fw-orn-c tl" />
            <span className="fw-orn-c tr" />
            <span className="fw-orn-c bl" />
            <span className="fw-orn-c br" />
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', minHeight: 280 }}>
              <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="fw-pill gold">{Icon('flame', { size: 11 })} Continue Adventure</span>
                  <span className="fw-pill dim">{Icon('history', { size: 11 })} {featured ? 'Last played recently' : 'No session yet'}</span>
                </div>
                <div>
                  <div className="fw-eyebrow" style={{ marginBottom: 6 }}>{featured ? 'Current Chronicle' : 'New Chronicle'}</div>
                  <h1 className="fw-display" style={{ fontSize: 36, lineHeight: 1.05 }}>
                    {featured ? featured.title : (
                      <>
                        Gather your party<br />
                        <span style={{ color: 'var(--gold)' }}>at the table</span>
                      </>
                    )}
                  </h1>
                </div>
                <p className="fw-serif" style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.55, maxWidth: 540, fontStyle: 'italic' }}>
                  {featured
                    ? 'Your party is still at the table. Continue where the story left off.'
                    : 'Create a room or join an invite to begin a chronicle.'}
                </p>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                  <button className="fw-btn fw-btn-gold fw-btn-lg" disabled={!featured} onClick={() => featured && onRequestEnterSession(featured)} type="button">
                    {Icon('play', { size: 14 })} {featured ? 'Resume Session' : 'No Session'}
                  </button>
                  <button className="fw-btn fw-btn-ghost" onClick={() => onRoomModalChange('continue')} type="button">
                    {Icon('scroll', { size: 14 })} Session recap
                  </button>
                  <span style={{ flex: 1 }} />
                  <div style={{ display: 'flex', marginRight: 4 }}>
                    {party.map((member, index) => (
                      <div key={member.id} className="fw-avatar sm" style={{ marginLeft: index ? -8 : 0, background: `linear-gradient(135deg, ${member.color}33, #15101f)` }}>
                        {member.initials}
                      </div>
                    ))}
                  </div>
                  <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{party.length} characters</span>
                </div>
              </div>
              <div style={{ position: 'relative', background: 'linear-gradient(135deg, #1a1428 0%, #0a0814 100%)', borderLeft: '1px solid var(--border-soft)', overflow: 'hidden' }}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'radial-gradient(ellipse at 30% 40%, rgba(214,168,79,0.18), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(124,58,237,0.22), transparent 60%)',
                  }}
                />
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: 0.6 }}>
                  <FateSeal size={260} animate />
                </div>
                <div style={{ position: 'absolute', left: 20, bottom: 20, right: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className="fw-pill">{featured ? featured.phase : 'Hearth'}</span>
                  <span className="fw-pill dim">{featured?.playMode ?? 'Campaign ready'}</span>
                  <span className="fw-pill blood">{roomSummary.length ? 'Rooms available' : 'Setup needed'}</span>
                </div>
              </div>
            </div>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 28 }}>
            <ActionTile icon="plus" gold title="Create Room" desc="New game, your rules" onClick={onRequestRoomSetup} />
            <ActionTile icon="login" title="Join Room" desc="With invite code" onClick={() => onRoomModalChange('join')} />
            <ActionTile icon="users" title="My Characters" desc={`${characterSummary.length} in vault`} onClick={() => onRequestCharSheet?.()} />
            <ActionTile icon="crown" gold title="DM Dashboard" desc={featured ? featured.title : 'Table controls'} onClick={() => onRequestDmDash?.()} />
            <ActionTile icon="hex" title="Warden's Run" desc="Roguelite dungeon" onClick={() => onRequestWardenRun?.()} />
            <ActionTile icon="hex" arcane title="Warden's Vault" desc="Spend Warden Points" onClick={() => onRequestWardenVault?.()} />
            <ActionTile icon="cog" title="Settings" desc="Audio - Rules - Theme" onClick={() => onRequestSettings?.()} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 28 }}>
            <Card>
              <CardHead
                icon="users"
                title="My Characters"
                right={<button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => onRequestCharSheet?.()} type="button">{Icon('plus', { size: 12 })} New</button>}
              />
              {dashboardError ? <div style={{ padding: '12px 12px 0', color: 'var(--text-3)' }}>{dashboardError}</div> : null}
              <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {loading ? <SkeletonRows count={4} /> : characterSummary.length ? characterSummary.map((character) => {
                  const hpPercent = Math.max(0, Math.min(100, Math.round((character.hp / Math.max(1, character.hpMax)) * 100)));
                  return (
                    <div key={character.id} style={{ display: 'flex', gap: 12, padding: 12, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8 }}>
                      <div className="fw-avatar lg" style={{ background: `linear-gradient(135deg, ${character.color}33, #15101f)` }}>{character.initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="fw-display" style={{ fontSize: 14, color: 'var(--text)' }}>{character.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 8 }}>{character.role}</div>
                        <div className="fw-stat-bar">
                          <span className="lbl">HP</span>
                          <div className="fw-bar hp bar"><i style={{ width: `${hpPercent}%` }} /></div>
                          <span className="num">{character.hp}/{character.hpMax}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, fontFamily: 'var(--f-serif)', fontStyle: 'italic' }}>{character.status}</div>
                      </div>
                    </div>
                  );
                }) : <EmptyState>No vault characters yet. Create a character to fill this roster.</EmptyState>}
              </div>
            </Card>

            <Card>
              <CardHead icon="hex" title="Active Rooms" right={<button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={onRequestLobby} type="button">View all</button>} />
              {dashboardError ? <div style={{ padding: '12px 12px 0', color: 'var(--text-3)' }}>{dashboardError}</div> : null}
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {loading ? <SkeletonRows count={2} /> : roomSummary.length ? roomSummary.map((room) => (
                  <div key={room.id} style={{ padding: 12, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {room.live ? <span className="fw-pill blood"><span style={{ width: 6, height: 6, borderRadius: 50, background: 'currentColor' }} /> Live</span> : <span className="fw-pill dim">Lobby</span>}
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-3)' }}>{room.code}</span>
                      <span style={{ flex: 1 }} />
                      <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => void navigator.clipboard?.writeText(room.code)} type="button">{Icon('copy', { size: 11 })}</button>
                    </div>
                    <div className="fw-display" style={{ fontSize: 15, color: 'var(--text)' }}>{room.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-3)' }}>
                      <span>{room.host}</span>
                      <span>-</span>
                      <span>{room.mode}</span>
                      <span style={{ flex: 1 }} />
                      <span>{room.players}/{room.max}</span>
                      <button className="fw-btn fw-btn-gold fw-btn-sm" onClick={() => onRequestEnterSession(room.session)} type="button">
                        {room.live ? <>Rejoin {Icon('arrowR', { size: 11 })}</> : <>Open lobby {Icon('arrowR', { size: 11 })}</>}
                      </button>
                    </div>
                  </div>
                )) : <EmptyState>No active rooms yet. Create a room or join with an invite code.</EmptyState>}
                <button className="fw-btn fw-btn-ghost" onClick={() => onRoomModalChange('join')} style={{ justifyContent: 'center' }} type="button">
                  {Icon('plus', { size: 12 })} Join with code
                </button>
              </div>
            </Card>
          </div>

          <Card>
            <CardHead
              icon="scroll"
              title="Recent Campaigns"
              right={
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">{Icon('filter', { size: 11 })} Filter</button>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => onRequestLibrary?.()} type="button">View library {Icon('arrowR', { size: 11 })}</button>
                </div>
              }
            />
            <div style={{ padding: '8px 8px 16px' }}>
              {loading ? <SkeletonRows count={2} /> : recentCampaigns.length ? recentCampaigns.map((campaign, index) => (
                <div key={campaign.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 16, padding: '14px 12px', alignItems: 'center', borderBottom: index === recentCampaigns.length - 1 ? 'none' : '1px solid var(--border-soft)' }}>
                  <div style={{ width: 96, height: 56, borderRadius: 6, background: 'linear-gradient(135deg, #1a1428, #0c0a14)', border: '1px solid var(--border-soft)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: index === 0 ? 'radial-gradient(ellipse at 30% 30%, rgba(214,168,79,0.35), transparent 60%)' : 'radial-gradient(ellipse at 70% 60%, rgba(124,58,237,0.35), transparent 60%)' }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <div className="fw-display" style={{ fontSize: 14 }}>{campaign.name}</div>
                      <span className="fw-pill dim">{campaign.sessionLabel}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{campaign.when}</span>
                    </div>
                    <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--text-2)', fontSize: 14 }}>{campaign.note}</div>
                  </div>
                  <button
                    className="fw-btn fw-btn-ghost"
                    onClick={() => campaign.session ? onRequestEnterSession(campaign.session) : onRequestLibrary?.()}
                    type="button"
                  >
                    Open
                  </button>
                </div>
              )) : <EmptyState>No recent campaigns yet. Your played sessions will appear here.</EmptyState>}
            </div>
          </Card>
        </div>
      </div>

      <MainMenuModal
        featured={featured}
        modal={roomModal}
        onClose={() => onRoomModalChange(null)}
        onJoin={async (code) => {
          const session = await joinGameSession(code, user);
          onRoomModalChange(null);
          onRequestEnterSession(session);
        }}
        onResume={() => {
          if (featured) onRequestEnterSession(featured);
        }}
      />
    </>
  );
}
