import { useMemo, useState } from 'react';
import { WARDEN_RUN_EVENTS, getRunEvent, type RunEvent, type RunEventChoice } from '../../data/runEvents';
import { getRelic } from '../../data/relics';
import type { RunNode, RunState } from '../../engine/run/runTypes';
import { useGameStore } from '../../store/useGameStore';
import type { Item } from '../../types';
import { SceneChapel, WIcon } from './runVisuals';

function getCurrentNode(runState: RunState): RunNode | null {
  return runState.floors
    .find((floor) => floor.floorNumber === runState.currentFloor)
    ?.nodes.find((node) => node.id === runState.currentNodeId) ?? null;
}

function chooseFallbackEvent(nodeId: string | null): RunEvent {
  const pool = WARDEN_RUN_EVENTS;
  if (!pool.length) throw new Error('WARDEN_RUN_EVENTS is empty.');
  const seed = [...(nodeId ?? 'event')].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return pool[seed % pool.length];
}

function createMysteryItem(choice: RunEventChoice): Item {
  return {
    id: `${choice.consequence.value}`,
    templateId: `${choice.consequence.value}`,
    name: choice.consequence.description,
    description: choice.consequence.description,
    category: 'misc',
    rarity: 'common',
    weight: 0,
    value: 0,
    quantity: 1,
    equipped: false,
    attunement: false,
    attuned: false,
    effects: [],
  };
}

export function EventScreen() {
  const { runState, activeCharacter, completeNode, addRunGold, addRunRelic, applyRunPartyHp, dispatch } = useGameStore();
  const [chosen, setChosen] = useState<string | null>(null);
  const currentNode = runState ? getCurrentNode(runState) : null;
  const event = useMemo(() => {
    if (!runState) return null;
    return (currentNode?.eventId ? getRunEvent(currentNode.eventId) : null) ?? chooseFallbackEvent(currentNode?.id ?? runState.id);
  }, [currentNode?.eventId, currentNode?.id, runState]);

  function applyChoice(choice: RunEventChoice) {
    if (!runState || !currentNode || !activeCharacter) return;
    setChosen(choice.id);
    const consequence = choice.consequence;

    if (consequence.type === 'gold' && typeof consequence.value === 'number') {
      addRunGold(consequence.value);
    }
    if (consequence.type === 'heal' && typeof consequence.value === 'number') {
      applyRunPartyHp(activeCharacter.id, consequence.value);
    }
    if (consequence.type === 'damage' && typeof consequence.value === 'number') {
      applyRunPartyHp(activeCharacter.id, -consequence.value);
    }
    if (consequence.type === 'relic' && typeof consequence.value === 'string') {
      const relic = getRelic(consequence.value);
      if (relic) addRunRelic(relic);
    }
    if (consequence.type === 'item') {
      dispatch({
        id: crypto.randomUUID(),
        type: 'add_item',
        sessionId: runState.sessionId,
        actorId: activeCharacter.id,
        targetId: activeCharacter.id,
        createdAt: new Date().toISOString(),
        source: 'user',
        item: createMysteryItem(choice),
      });
    }

    completeNode(currentNode.id, { type: 'mystery', choiceId: choice.id, outcomeId: String(consequence.value) });
  }

  if (!runState || !event) {
    return (
      <div className="wr-scene wr-screen-in">
        <div className="wr-scene-inner">
          <div className="wr-narration">No mystery event is active.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="wr-scene wr-screen-in">
      <div className="wr-scene-inner">
        <div className="wr-event-banner">
          <div className="wr-event-banner-art">
            <SceneChapel />
          </div>
          <div className="wr-event-banner-fade" />
          <div className="wr-event-banner-title">
            <div className="eyebrow">Mystery Encounter</div>
            <h2>{event.title}</h2>
          </div>
        </div>

        <div className="wr-rule"><span className="wr-rule-diamond" /></div>

        <div className="wr-narration">
          {(event.narration?.length ? event.narration : [event.description]).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="wr-rule"><span className="wr-rule-diamond" /></div>

        <div className="wr-eyebrow" style={{ textAlign: 'center', marginTop: -4 }}>What do you do?</div>

        <div className="wr-choice-list">
          {event.choices.map((choice, index) => (
            <button key={choice.id} className="wr-choice" disabled={Boolean(chosen && chosen !== choice.id)} type="button" onClick={() => applyChoice(choice)}>
              <span className="wr-choice-mark">{String.fromCharCode(65 + index)}</span>
              <span className="wr-choice-body">
                <div className="wr-choice-title">{choice.title ?? choice.label}</div>
                <div className="wr-choice-desc">{choice.desc ?? choice.consequence.description}</div>
                {choice.tags && choice.tags.length > 0 && (
                  <div className="wr-choice-meta">
                    {choice.tags.map((tag) => (
                      <span key={`${choice.id}-${tag.k}`} className={`wr-tag ${tag.c}`}>{tag.k}</span>
                    ))}
                  </div>
                )}
              </span>
              {chosen === choice.id && (
                <span style={{ alignSelf: 'center', margin: '0 14px', color: 'var(--wr-violet-bright)' }}>{WIcon('check', { size: 18, stroke: 2.2 })}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EventScreen;
