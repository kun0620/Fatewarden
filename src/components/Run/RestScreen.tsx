import { useState } from 'react';
import { REST_CHOICES } from '../../data/runEvents';
import type { RunNode, RunState } from '../../engine/run/runTypes';
import { useGameStore } from '../../store/useGameStore';
import { SceneCampfire, WIcon } from './runVisuals';

function getCurrentNode(runState: RunState): RunNode | null {
  return runState.floors
    .find((floor) => floor.floorNumber === runState.currentFloor)
    ?.nodes.find((node) => node.id === runState.currentNodeId) ?? null;
}

function isCaster(className: string | undefined) {
  return ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'].includes(className?.toLowerCase() ?? '');
}

export function RestScreen() {
  const { runState, activeCharacter, completeNode, dispatch, applyRunAllPartyHp } = useGameStore();
  const [chosen, setChosen] = useState<string | null>(null);
  const currentNode = runState ? getCurrentNode(runState) : null;

  function applyRest(choiceId: string) {
    if (!runState || !currentNode || !activeCharacter) return;
    setChosen(choiceId);

    if (choiceId === 'heal') {
      const baseHp = runState.party?.length
        ? Math.max(...runState.party.map((p) => p.hpMax))
        : (activeCharacter.maxHitPoints ?? activeCharacter.hitPoints ?? 10);
      const amount = Math.max(1, Math.ceil(baseHp * 0.3));
      applyRunAllPartyHp(amount);
    }

    if (choiceId === 'cond') {
      const condition = activeCharacter.activeConditions?.[0];
      if (condition) {
        dispatch({
          id: crypto.randomUUID(),
          type: 'remove_condition',
          sessionId: runState.sessionId,
          actorId: activeCharacter.id,
          targetId: activeCharacter.id,
          createdAt: new Date().toISOString(),
          source: 'user',
          condition,
          reason: 'Warden run rest',
        });
      }
    }

    if (choiceId === 'scribe' && isCaster(activeCharacter.className)) {
      dispatch({
        id: crypto.randomUUID(),
        type: 'LONG_REST',
        sessionId: runState.sessionId,
        actorId: activeCharacter.id,
        targetId: activeCharacter.id,
        createdAt: new Date().toISOString(),
        source: 'user',
        characterId: activeCharacter.id,
      });
    }

    completeNode(currentNode.id, { type: 'rest', choiceId });
  }

  if (!runState) {
    return (
      <div className="wr-scene wr-screen-in">
        <div className="wr-scene-inner">
          <div className="wr-narration">No rest node is active.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="wr-scene wr-screen-in">
      <div className="wr-scene-inner">
        <div style={{ textAlign: 'center' }}>
          <div className="wr-eyebrow">Camp · Floor {runState.currentFloor}</div>
          <h2 style={{ fontFamily: 'var(--wr-f-head)', fontSize: 28, letterSpacing: '0.14em', color: 'var(--wr-bone)', margin: '4px 0 10px', fontWeight: 500 }}>The Fire Holds</h2>
          <p style={{ fontFamily: 'var(--wr-f-body)', fontStyle: 'italic', fontSize: 16, color: 'var(--wr-text-2)', maxWidth: 540, margin: '0 auto' }}>
            You take stock. The walls are quiet for an hour, at least. Choose one act before pressing deeper.
          </p>
        </div>

        <div className="wr-campfire">
          <SceneCampfire />
        </div>

        <div className="wr-rest-grid">
          {REST_CHOICES.map((choice) => (
            <button
              key={choice.id}
              className={`wr-rest-tile ${choice.color}`}
              type="button"
              onClick={() => applyRest(choice.id)}
              disabled={Boolean(chosen && chosen !== choice.id)}
              style={chosen === choice.id ? { borderColor: 'var(--wr-gold-bright)', boxShadow: '0 0 0 1px var(--wr-gold), 0 10px 28px -8px rgba(184,134,11,0.5)' } : undefined}
            >
              <span className="wr-rest-tile-icon">{WIcon(choice.icon, { size: 22, stroke: 1.6 })}</span>
              <div className="wr-rest-tile-title">{choice.title}</div>
              <div className="wr-rest-tile-desc">{choice.description}</div>
              <div className="wr-rest-tile-effect">{choice.effect}</div>
              {chosen === choice.id && <span style={{ position: 'absolute', top: 12, right: 12, color: 'var(--wr-gold-bright)' }}>{WIcon('check', { size: 18, stroke: 2.4 })}</span>}
            </button>
          ))}
        </div>

        {chosen && (
          <div style={{ textAlign: 'center', marginTop: 4 }}>
            <button className="wr-btn wr-btn-gold wr-btn-lg" type="button" disabled>
              Settled · Press Deeper {WIcon('chevR', { size: 12 })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RestScreen;
