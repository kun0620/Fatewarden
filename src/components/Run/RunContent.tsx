import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RunCombatant } from '../../engine/run/runTypes';
import { useRunPresence } from '../../hooks/useRunPresence';
import useVoteSystem from '../../hooks/useVoteSystem';
import { useGameStore } from '../../store/useGameStore';
import { LoadingState } from '../ui/States';
import { CharacterDeathScreen } from './CharacterDeathScreen';
import { CombatArena } from './CombatArena';
import { DefeatScreen } from './DefeatScreen';
import { EventScreen } from './EventScreen';
import { ForgeScreen } from './ForgeScreen';
import { GambleScreen } from './GambleScreen';
import { RestScreen } from './RestScreen';
import { AssemblyScreen } from './AssemblyScreen';
import { RunLobbyScreen } from './RunLobbyScreen';
import { RunIntroScreen } from './RunIntroScreen';
import { RunMapScreen } from './RunMapScreen';
import { ShopScreen } from './ShopScreen';
import { TreasureScreen } from './TreasureScreen';
import { VictoryScreen } from './VictoryScreen';
import { VotePanel } from './VotePanel';

export function RunContent() {
  const { activeSession, completeNode, currentUserId, endRun, runState, selectNode, sessionMembers, setGameMode } = useGameStore();
  const { activeVote, castMyVote, createNodeVote, hostOverride, timeLeft } = useVoteSystem();
  const { players } = useRunPresence();
  const [deadCharacter, setDeadCharacter] = useState<RunCombatant | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [introFloor, setIntroFloor] = useState(1);
  const seenRunIdRef = useRef<string | null>(runState?.id ?? null);
  const seenFloorRef = useRef<number | null>(runState?.currentFloor ?? null);
  const activeFloor = runState?.floors[runState.currentFloor - 1];
  const isHost = Boolean(activeSession && currentUserId && (activeSession.hostId ?? activeSession.createdBy) === currentUserId);
  const isCoOp = (sessionMembers?.length ?? 1) > 1;
  const sessionLoading = Boolean(
    activeSession?.mode === 'warden_run'
    && activeSession.runState
    && (!runState || runState.sessionId !== activeSession.id),
  );
  const roomNumber = useMemo(() => {
    if (!activeFloor || !runState?.currentNodeId) return 1;
    const index = activeFloor.nodes.findIndex((node) => node.id === runState.currentNodeId);
    return index >= 0 ? index + 1 : 1;
  }, [activeFloor, runState?.currentNodeId]);
  const alivePartyCount = useMemo(() => {
    if (!runState?.party?.length) return 0;
    return runState.party.filter((member) => member.hp > 0 && !member.down && !runState.deadCharacterIds.includes(member.id)).length;
  }, [runState?.deadCharacterIds, runState?.party]);
  const handleDescend = useCallback(() => setShowIntro(false), []);

  useEffect(() => {
    if (!runState || runState.status !== 'active') {
      if (!runState) {
        seenRunIdRef.current = null;
        seenFloorRef.current = null;
      }
      setShowIntro(false);
      return;
    }

    if (seenRunIdRef.current !== runState.id) {
      seenRunIdRef.current = runState.id;
      seenFloorRef.current = runState.currentFloor;
      setIntroFloor(runState.currentFloor);
      setShowIntro(true);
      return;
    }

    if (seenFloorRef.current !== runState.currentFloor) {
      seenFloorRef.current = runState.currentFloor;
      setIntroFloor(runState.currentFloor);
      setShowIntro(true);
    }
  }, [runState?.currentFloor, runState?.id, runState?.status]);

  const content = (() => {
    if (sessionLoading) {
      return (
        <div className="wr-app">
          <div className="wr-atmos" />
          <div className="wr-noise" />
          <div className="wr-vignette" />
          <div className="wr-stage" style={{ display: 'grid', placeItems: 'center' }}>
            <LoadingState label="Restoring Warden run..." size="lg" />
          </div>
        </div>
      );
    }

    if (!runState) {
      const isMultiplayer = (activeSession?.maxPlayers ?? activeSession?.partySize ?? 1) > 1;
      if (isMultiplayer) {
        return <RunLobbyScreen onBack={() => setGameMode('lobby')} />;
      }
      return <AssemblyScreen />;
    }

    if (showIntro) {
      return <RunIntroScreen floorNumber={introFloor} onDescend={handleDescend} />;
    }

    if (deadCharacter) {
      return (
        <CharacterDeathScreen
          aliveCount={alivePartyCount}
          combatant={deadCharacter}
          currentFloor={runState.currentFloor}
          enemiesKilled={runState.enemiesKilled}
          roomNumber={roomNumber}
          onContinue={() => setDeadCharacter(null)}
          onRunEnd={() => {
            endRun(false);
            setDeadCharacter(null);
          }}
        />
      );
    }

    if (runState.status === 'victory') {
      return <VictoryScreen />;
    }

    if (runState.status === 'defeat') {
      return <DefeatScreen />;
    }

    if (!runState.currentNodeId) {
      return <RunMapScreen createNodeVote={createNodeVote} isCoOp={isCoOp} onNodeSelect={selectNode} />;
    }

    const currentFloor = runState.floors[runState.currentFloor - 1];
    const currentNode = currentFloor?.nodes.find((node) => node.id === runState.currentNodeId);

    if (!currentNode) {
      return <RunMapScreen createNodeVote={createNodeVote} isCoOp={isCoOp} onNodeSelect={selectNode} />;
    }

    switch (currentNode.type) {
      case 'combat':
      case 'elite':
      case 'boss':
        return (
          <CombatArena
            onCharacterDeath={setDeadCharacter}
            onCombatEnd={(won) => {
              if (!runState?.currentNodeId) return;
              const deadFoes = runState.foes?.filter((f) => f.hp <= 0 || f.down) ?? [];
              completeNode(runState.currentNodeId, {
                type: 'combat',
                won,
                goldEarned: won ? deadFoes.length * 15 : 0,
                enemiesKilled: won ? deadFoes.length : 0,
              });
            }}
          />
        );
      case 'mystery':
        return <EventScreen />;
      case 'rest':
        return <RestScreen />;
      case 'shop':
        return <ShopScreen />;
      case 'treasure':
        return <TreasureScreen />;
      case 'forge':
        return <ForgeScreen />;
      case 'gamble':
        return <GambleScreen />;
      default:
        return <RunMapScreen createNodeVote={createNodeVote} isCoOp={isCoOp} onNodeSelect={selectNode} />;
    }
  })();

  return (
    <>
      {content}
      {activeVote?.status === 'open' && !showIntro && (
        <VotePanel
          vote={activeVote}
          players={Object.values(players)}
          currentUserId={currentUserId ?? ''}
          isHost={isHost}
          timeLeft={timeLeft}
          onVote={castMyVote}
          onOverride={hostOverride}
        />
      )}
    </>
  );
}

export default RunContent;
