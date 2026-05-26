import { useState } from 'react';
import { TREASURE_REWARDS } from '../../data/runEvents';
import type { RunNode, RunState, RunTreasureReward } from '../../engine/run/runTypes';
import { useGameStore } from '../../store/useGameStore';
import type { Item, ItemRarity } from '../../types';
import { SceneChest, WIcon } from './runVisuals';

function getCurrentNode(runState: RunState): RunNode | null {
  return runState.floors
    .find((floor) => floor.floorNumber === runState.currentFloor)
    ?.nodes.find((node) => node.id === runState.currentNodeId) ?? null;
}

function normalizeRarity(rarity: string): ItemRarity {
  if (['common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact'].includes(rarity)) return rarity as ItemRarity;
  return 'common';
}

function createTreasureItem(reward: RunTreasureReward): Item {
  return {
    id: reward.id,
    templateId: reward.id,
    name: reward.name,
    description: reward.description,
    category: 'misc',
    rarity: normalizeRarity(reward.rarity),
    weight: 0,
    value: 0,
    quantity: 1,
    equipped: false,
    attunement: false,
    attuned: false,
    effects: [],
  };
}

export function TreasureScreen() {
  const { runState, activeCharacter, completeNode, dispatch } = useGameStore();
  const [chosen, setChosen] = useState<string | null>(null);
  const currentNode = runState ? getCurrentNode(runState) : null;
  const reward = TREASURE_REWARDS.find((item) => item.id === chosen) ?? null;

  function claimReward() {
    if (!runState || !activeCharacter || !currentNode || !reward) return;
    dispatch({
      id: crypto.randomUUID(),
      type: 'add_item',
      sessionId: runState.sessionId,
      actorId: activeCharacter.id,
      targetId: activeCharacter.id,
      createdAt: new Date().toISOString(),
      source: 'user',
      item: createTreasureItem(reward),
    });
    completeNode(currentNode.id, { type: 'treasure', itemId: reward.id });
  }

  function leaveChest() {
    if (!currentNode) return;
    completeNode(currentNode.id, { type: 'treasure', itemId: 'none' });
  }

  return (
    <div className="wr-scene wr-screen-in">
      <div className="wr-scene-inner wr-treasure-stage">
        <div className="wr-eyebrow">Treasure Found</div>
        <h2 style={{ fontFamily: 'var(--wr-f-head)', fontSize: 30, letterSpacing: '0.14em', color: 'var(--wr-bone)', margin: 0, fontWeight: 500 }}>The Brass Casket</h2>
        <div className="wr-narration" style={{ marginTop: -4, marginBottom: 10, maxWidth: 580 }}>
          The chest exhales rust. Three reliquaries within, only one will be remembered.
        </div>

        <div className="wr-treasure-chest">
          <SceneChest />
        </div>

        <div className="wr-treasure-divider">— Choose One —</div>

        <div className="wr-treasure-cards">
          {TREASURE_REWARDS.slice(0, 3).map((item) => (
            <button key={item.id} className={`wr-treasure-card ${chosen === item.id ? 'chosen' : ''}`} type="button" onClick={() => setChosen(item.id)} disabled={Boolean(chosen && chosen !== item.id)}>
              <div className="wr-treasure-card-frame">
                {WIcon(item.icon, { size: 56, stroke: 1.2 })}
              </div>
              <div style={{ fontFamily: 'var(--wr-f-head)', fontSize: 12.5, letterSpacing: '0.14em', color: 'var(--wr-bone)', textTransform: 'uppercase' }}>{item.name}</div>
              <div style={{ fontFamily: 'var(--wr-f-body)', fontStyle: 'italic', fontSize: 13.5, color: 'var(--wr-text-2)', lineHeight: 1.4 }}>{item.description}</div>
              {item.isCursed && <div className="wr-tag blood">Cursed</div>}
              <span className="wr-item-rarity" style={{ position: 'static', marginTop: 'auto', color: 'var(--wr-violet-bright)', border: '1px solid var(--wr-violet-deep)', padding: '1px 7px', borderRadius: 50, background: 'rgba(91,42,140,0.3)' }}>
                {item.rarity}
              </span>
            </button>
          ))}
        </div>

        {reward && (
          <button className="wr-btn wr-btn-gold wr-btn-lg" type="button" style={{ marginTop: 8 }} onClick={claimReward}>
            {WIcon('check', { size: 12 })} Claim · {reward.name}
          </button>
        )}

        <button className="wr-btn wr-btn-ghost wr-btn-sm" type="button" onClick={leaveChest}>
          {WIcon('x', { size: 11 })} Leave the chest, take none
        </button>
      </div>
    </div>
  );
}

export default TreasureScreen;
