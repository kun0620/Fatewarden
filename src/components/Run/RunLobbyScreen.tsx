import { useMemo, useState } from 'react';
import { updateMemberReady } from '../../lib/sessions';
import { WARDEN_RUN_RELICS } from '../../data/relics';
import { useGameStore } from '../../store/useGameStore';
import type { SessionMember, VaultCharacter } from '../../types';
import { WIcon, PortraitArt } from './runVisuals';

type RunPosition = 1 | 2 | 3 | 4;

type LobbySeat =
  | {
      kind: 'filled';
      member: SessionMember;
      character: VaultCharacter | null;
      isHost: boolean;
      isYou: boolean;
      displayName: string;
      ready: boolean;
      online: boolean;
    }
  | {
      kind: 'empty';
      index: number;
    };

interface RunLobbyScreenProps {
  onBack: () => void;
}

function getRoomCode(session: ReturnType<typeof useGameStore.getState>['activeSession']) {
  return session?.roomCode ?? session?.joinCode ?? '------';
}

function getDisplayName(member: SessionMember, isYou: boolean) {
  if (isYou) return 'You';
  return `Warden ${member.playerId.slice(0, 4).toUpperCase()}`;
}

function getInitials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function getShareLink(code: string) {
  if (typeof window === 'undefined') return code;
  const url = new URL(window.location.href);
  url.searchParams.set('code', code);
  return url.toString();
}

function assignedPositions(characterIds: string[]) {
  return characterIds.reduce<Record<string, RunPosition>>((positions, characterId, index) => {
    positions[characterId] = Math.min(index + 1, 4) as RunPosition;
    return positions;
  }, {});
}

function buildSeats(
  members: SessionMember[],
  vaultCharacters: VaultCharacter[],
  currentUserId: string | null,
  hostId: string | undefined,
  maxSeats: number,
): LobbySeat[] {
  const charactersById = new Map(vaultCharacters.map((character) => [character.id, character]));
  const filled = members
    .filter((member) => member.status !== 'kicked')
    .slice(0, maxSeats)
    .map<LobbySeat>((member) => {
      const isYou = Boolean(currentUserId && member.playerId === currentUserId);
      return {
        kind: 'filled',
        member,
        character: member.characterId ? charactersById.get(member.characterId) ?? null : null,
        isHost: member.role === 'host' || member.playerId === hostId,
        isYou,
        displayName: getDisplayName(member, isYou),
        ready: member.isReady,
        online: member.status === 'online',
      };
    });

  return [
    ...filled,
    ...Array.from({ length: Math.max(0, maxSeats - filled.length) }, (_, index) => ({
      kind: 'empty' as const,
      index: filled.length + index,
    })),
  ];
}

export function RunLobbyScreen({ onBack }: RunLobbyScreenProps) {
  const {
    activeSession,
    currentUserId,
    dispatch,
    runState,
    sessionMembers,
    setRuntimeSessionMembers,
    startRun,
    vaultCharacters,
  } = useGameStore();
  const [toast, setToast] = useState('');
  const [busyReady, setBusyReady] = useState(false);
  const [localReady, setLocalReady] = useState<Record<string, boolean>>({});
  const [startingRelic] = useState(() =>
    WARDEN_RUN_RELICS[Math.floor(Math.random() * WARDEN_RUN_RELICS.length)],
  );

  const maxSeats = Math.min(activeSession?.maxPlayers ?? activeSession?.partySize ?? 4, 4);
  const roomCode = getRoomCode(activeSession);
  const hostId = activeSession?.hostId ?? activeSession?.createdBy;
  const isWardenRun = activeSession?.mode === 'warden_run';
  const gameMode = isWardenRun ? 'warden_run' : 'lobby';
  const seats = useMemo(
    () => buildSeats(sessionMembers, vaultCharacters, currentUserId, hostId, maxSeats),
    [currentUserId, hostId, maxSeats, sessionMembers, vaultCharacters],
  );
  const currentMember = sessionMembers.find((member) => currentUserId && member.playerId === currentUserId);
  const currentReady = currentMember
    ? currentMember.isReady
    : Boolean(currentUserId && localReady[currentUserId]);
  const isHost = Boolean(currentUserId && currentUserId === hostId)
    || currentMember?.role === 'host'
    || (!hostId && seats.some((seat) => seat.kind === 'filled' && seat.isYou));
  const occupiedSeats = seats.filter((seat) => seat.kind === 'filled');
  const readyCount = occupiedSeats.filter((seat) => seat.ready || (seat.isYou && currentReady)).length;
  const boundCharacterIds = occupiedSeats
    .map((seat) => (seat.kind === 'filled' ? seat.character?.id : null))
    .filter((id): id is string => Boolean(id));
  const allOccupiedReady = occupiedSeats.length > 0
    && occupiedSeats.every((seat) => seat.kind === 'filled' && (seat.ready || (seat.isYou && currentReady)));
  const canBegin = isHost && currentReady && boundCharacterIds.length >= 1 && allOccupiedReady;

  async function copyText(value: string, message: string) {
    await navigator.clipboard?.writeText(value);
    setToast(message);
    window.setTimeout(() => setToast(''), 1800);
  }

  async function toggleReady() {
    const nextReady = !currentReady;
    if (currentUserId) {
      setLocalReady((current) => ({ ...current, [currentUserId]: nextReady }));
    }

    dispatch({
      id: crypto.randomUUID(),
      type: 'SESSION_PLAYER_READY',
      sessionId: activeSession?.id ?? 'local-session',
      actorId: currentUserId ?? 'local-user',
      createdAt: new Date().toISOString(),
      source: 'user',
      ready: nextReady,
    } as never);

    if (!activeSession || !currentUserId) {
      setToast(nextReady ? 'Marked ready.' : 'Ready mark removed.');
      return;
    }

    setBusyReady(true);
    try {
      const updated = await updateMemberReady(activeSession.id, currentUserId, nextReady);
      if (updated) {
        setRuntimeSessionMembers(
          sessionMembers.map((member) => (member.id === updated.id ? updated : member)),
        );
      }
      setToast(nextReady ? 'Marked ready.' : 'Ready mark removed.');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not update ready state.');
    } finally {
      setBusyReady(false);
      window.setTimeout(() => setToast(''), 1800);
    }
  }

  function beginRun() {
    if (!canBegin || !startingRelic) return;
    startRun({
      partyIds: boundCharacterIds.slice(0, 4),
      positions: assignedPositions(boundCharacterIds.slice(0, 4)),
      sessionId: activeSession?.id,
      startingRelic: startingRelic.id,
    });
  }

  function openCharacterVault() {
    window.dispatchEvent(new CustomEvent('fatewarden:open-character-vault'));
  }

  function invite() {
    void copyText(getShareLink(roomCode), 'Invite link copied!');
  }

  return (
    <div className="wr-app">
      <div className="wr-atmos" />
      <div className="wr-noise" />
      <div className="wr-vignette" />

      <main className="wr-scene">
        <div className="wr-scene-inner" style={{ maxWidth: 1100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="wr-btn wr-btn-ghost wr-btn-sm" onClick={onBack} type="button">
            {WIcon('chevL', { size: 11 })} Back
          </button>
          <div className="wr-eyebrow">Lobby · Waiting Room · {gameMode === 'warden_run' ? "Warden's Run" : 'Table'}</div>
          <span style={{ flex: 1 }} />
          <span className="wr-chip" style={{ color: 'var(--wr-violet-bright)', borderColor: 'var(--wr-violet-deep)' }}>
            <span className="wr-presence-dot online pulse" /> {readyCount}/{maxSeats} ready
          </span>
        </div>

        <div className="wr-lobby-head">
          <div style={{ flex: 1 }}>
            <div className="wr-eyebrow">Room name</div>
            <div style={{ fontFamily: 'var(--wr-f-head)', fontSize: 28, letterSpacing: '0.14em', color: 'var(--wr-bone)', marginTop: 2 }}>
              {activeSession?.title ?? "Warden's Run"}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 12, color: 'var(--wr-text-3)', fontStyle: 'italic' }}>
              <span>Mode: <b style={{ color: 'var(--wr-text-2)', fontStyle: 'normal' }}>Warden's Run</b></span>
              <span>·</span>
              <span>{occupiedSeats.length}/{maxSeats} seats filled</span>
              {runState && (
                <>
                  <span>·</span>
                  <span>Run active</span>
                </>
              )}
            </div>
          </div>

          <div className="wr-lobby-code">
            <div className="wr-eyebrow" style={{ fontSize: 9 }}>Room code</div>
            <div
              className="wr-lobby-code-val"
              onClick={() => void copyText(roomCode, 'Code copied!')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  void copyText(roomCode, 'Code copied!');
                }
              }}
              role="button"
              tabIndex={0}
            >
              {roomCode}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button className="wr-btn wr-btn-sm" onClick={() => void copyText(roomCode, 'Code copied!')} type="button">
                {WIcon('scroll', { size: 11 })} Copy
              </button>
              <button className="wr-btn wr-btn-sm wr-btn-ghost" onClick={() => void copyText(getShareLink(roomCode), 'Share link copied!')} type="button">
                {WIcon('compass', { size: 11 })} Share link
              </button>
            </div>
          </div>
        </div>

        {toast && (
          <div className="wr-chip gold" style={{ marginTop: 12 }}>
            {toast}
          </div>
        )}

        <div className="wr-seats-grid">
          {seats.map((seat, index) => (
            <div
              className={
                seat.kind === 'filled'
                  ? `wr-seat ${seat.ready || (seat.isYou && currentReady) ? 'ready' : 'filled'} ${seat.isYou ? 'you' : ''}`
                  : 'wr-seat empty'
              }
              key={seat.kind === 'filled' ? seat.member.id : `empty-${seat.index}`}
            >
              <div className="wr-seat-num">Seat {index + 1}</div>
              {seat.kind === 'filled' ? (
                <>
                  <div className="wr-seat-portrait">
                    {seat.character?.portraitUrl ? (
                      <img alt="" src={seat.character.portraitUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : seat.character ? (
                      <PortraitArt kind={seat.character.id} color={seat.isYou ? '#D4A028' : '#9B5DE5'} />
                    ) : (
                      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--wr-text-3)', fontFamily: 'var(--wr-f-head)', fontSize: 24 }}>
                        {getInitials(seat.displayName)}
                      </div>
                    )}
                    {seat.isHost && <div className="wr-seat-host">{WIcon('star', { size: 11 })} Host</div>}
                  </div>
                  <div className="wr-seat-name">
                    <span className={`wr-presence-dot ${seat.online ? 'online' : 'offline'}`} /> {seat.displayName}
                    {seat.isYou && <span style={{ color: 'var(--wr-gold-bright)', fontSize: 9 }}> · YOU</span>}
                  </div>
                  <div className="wr-seat-handle">{seat.online ? 'Online' : 'Offline'}</div>
                  <div className="wr-seat-bound">
                    {seat.character
                      ? <>Bound: <b>{seat.character.name} · {seat.character.className}</b></>
                      : <span style={{ color: 'var(--wr-warn)' }}>Awaiting sigil</span>}
                  </div>
                  <div className={`wr-seat-status ${seat.ready || (seat.isYou && currentReady) ? 'ready' : ''}`}>
                    {seat.ready || (seat.isYou && currentReady)
                      ? <>{WIcon('check', { size: 11 })} Ready</>
                      : <>Awaiting sigil</>}
                  </div>
                </>
              ) : (
                <>
                  <div className="wr-seat-portrait empty">{WIcon('plus', { size: 28 })}</div>
                  <div className="wr-seat-name" style={{ color: 'var(--wr-text-3)' }}>Open seat</div>
                  <div className="wr-seat-handle">Waiting for a warden...</div>
                  <button className="wr-btn wr-btn-sm wr-btn-ghost" onClick={invite} style={{ marginTop: 8, width: '100%', justifyContent: 'center' }} type="button">
                    Invite
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="wr-lobby-controls">
          <div style={{ flex: 1 }}>
            <div className="wr-eyebrow">The Table</div>
            <div style={{ marginTop: 2, fontSize: 13, color: 'var(--wr-text-2)' }}>
              {currentMember?.characterId
                ? <>Character bound. <button className="wr-btn wr-btn-sm wr-btn-ghost" onClick={openCharacterVault} style={{ marginLeft: 4 }} type="button">Change</button></>
                : <>No character bound yet. <button className="wr-btn wr-btn-sm" onClick={openCharacterVault} type="button">Bind Character</button></>}
            </div>
          </div>

          {!isHost && (
            <button className={`wr-btn ${currentReady ? 'wr-btn-ghost' : 'wr-btn-violet'}`} disabled={busyReady} onClick={() => void toggleReady()} type="button">
              {currentReady ? <>{WIcon('x', { size: 12 })} Unmark</> : <>{WIcon('check', { size: 12 })} Mark Ready</>}
            </button>
          )}

          {isHost ? (
            <>
              <button className={`wr-btn ${currentReady ? 'wr-btn-ghost' : 'wr-btn-violet'}`} disabled={busyReady} onClick={() => void toggleReady()} type="button">
                {currentReady ? <>{WIcon('check', { size: 12 })} Host Ready</> : <>{WIcon('check', { size: 12 })} Mark Ready</>}
              </button>
              <button
                className={`wr-btn wr-btn-lg ${canBegin ? 'wr-btn-gold' : ''}`}
                disabled={!canBegin}
                onClick={beginRun}
                title={canBegin ? 'Begin the run' : 'At least one bound ready warden is required.'}
                type="button"
              >
                Begin Run {WIcon('arrowR', { size: 14 })}
              </button>
            </>
          ) : (
            <button className="wr-btn wr-btn-ghost wr-btn-lg" disabled type="button">
              Waiting for host
            </button>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}

export default RunLobbyScreen;
