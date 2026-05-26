import { useMemo, useState } from 'react';
import { WARDEN_RUN_SHOP } from '../../data/runEvents';
import type { RunNode, RunShopItem, RunState } from '../../engine/run/runTypes';
import { useGameStore } from '../../store/useGameStore';
import type { Item, ItemCategory, ItemRarity } from '../../types';
import { PortraitArt, WIcon } from './runVisuals';

function getCurrentNode(runState: RunState): RunNode | null {
  return runState.floors
    .find((floor) => floor.floorNumber === runState.currentFloor)
    ?.nodes.find((node) => node.id === runState.currentNodeId) ?? null;
}

function normalizeRarity(rarity: string): ItemRarity {
  if (['common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact'].includes(rarity)) return rarity as ItemRarity;
  return 'common';
}

function categoryForItem(item: RunShopItem): ItemCategory {
  if (item.icon === 'potion') return 'consumable';
  if (item.icon === 'anvil') return 'material';
  return 'misc';
}

function createShopItem(item: RunShopItem): Item {
  return {
    id: item.id,
    templateId: item.id,
    name: item.name,
    description: item.description,
    category: categoryForItem(item),
    rarity: normalizeRarity(item.rarity),
    weight: 0,
    value: item.price,
    quantity: 1,
    equipped: false,
    attunement: false,
    attuned: false,
    effects: [],
  };
}

export function ShopScreen() {
  const { runState, activeCharacter, spendRunGold, completeNode, dispatch } = useGameStore();
  const [purchased, setPurchased] = useState<string[]>([]);
  const [stockOffset, setStockOffset] = useState(0);
  const currentNode = runState ? getCurrentNode(runState) : null;
  const visibleItems = useMemo(() => {
    const stock = WARDEN_RUN_SHOP.items;
    if (!stock.length) return [];
    return Array.from({ length: Math.min(4, stock.length) }, (_, index) => stock[(index + stockOffset) % stock.length]);
  }, [stockOffset]);

  function buy(item: RunShopItem) {
    if (!runState || !activeCharacter) return;
    const result = spendRunGold(item.price);
    if (result.error) return;
    if (item.reroll) {
      setStockOffset((current) => current + 1);
      return;
    }

    dispatch({
      id: crypto.randomUUID(),
      type: 'add_item',
      sessionId: runState.sessionId,
      actorId: activeCharacter.id,
      targetId: activeCharacter.id,
      createdAt: new Date().toISOString(),
      source: 'user',
      item: createShopItem(item),
    });
    setPurchased((current) => (current.includes(item.id) ? current : [...current, item.id]));
  }

  function leaveShop() {
    if (!currentNode) return;
    completeNode(currentNode.id, { type: 'shop', purchased });
  }

  if (!runState) {
    return (
      <div className="wr-scene wr-screen-in">
        <div className="wr-scene-inner">
          <div className="wr-narration">No shop node is active.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="wr-scene wr-screen-in">
      <div className="wr-scene-inner">
        <div className="wr-shop-merchant">
          <div className="wr-shop-merchant-portrait">
            <PortraitArt kind="merchant" color="#9B5DE5" />
          </div>
          <div className="wr-shop-merchant-text">
            <div className="name">{WARDEN_RUN_SHOP.merchant.name}</div>
            <div className="quote">"{WARDEN_RUN_SHOP.merchant.quote}"</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div className="wr-gold-display">
              <span className="wr-gold-coin">G</span>
              <span className="wr-gold-amount">{runState.gold}</span>
            </div>
            <span className="wr-eyebrow">Your Purse</span>
          </div>
        </div>

        <div className="wr-rule"><span className="wr-rule-diamond" /></div>

        <div className="wr-shop-grid">
          {visibleItems.map((item) => {
            const isPurchased = purchased.includes(item.id);
            const cant = runState.gold < item.price;
            return (
              <button key={item.id} className={`wr-shop-item ${item.rarity}`} disabled={isPurchased || cant} type="button" onClick={() => buy(item)}>
                <div className="wr-item-frame">
                  <span className="wr-item-rarity">{item.reroll ? 'Action' : item.rarity}</span>
                  <span style={{ color: item.rarity === 'legendary' ? 'var(--wr-gold-bright)' : item.rarity === 'rare' ? 'var(--wr-violet-bright)' : 'var(--wr-gold-bright)' }}>
                    {WIcon(item.icon, { size: 44, stroke: 1.2 })}
                  </span>
                </div>
                <div className="wr-item-name">{item.name}</div>
                <div className="wr-item-desc">{item.description}</div>
                <div className="wr-item-price-row">
                  <span className={`wr-price ${cant ? 'cant' : ''}${isPurchased ? 'sold' : ''}`}>
                    <span className="wr-gold-coin" style={{ width: 14, height: 14, fontSize: 7 }}>G</span>
                    {item.price}
                  </span>
                  <span style={{ fontFamily: 'var(--wr-f-head)', fontSize: 9, letterSpacing: '0.18em', color: isPurchased ? 'var(--wr-good)' : cant ? 'var(--wr-blood-bright)' : 'var(--wr-text-3)', textTransform: 'uppercase' }}>
                    {isPurchased ? 'Acquired' : cant ? 'Too Costly' : item.reroll ? 'Trade' : 'Buy'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button className="wr-btn wr-btn-violet" type="button" onClick={leaveShop}>
            {WIcon('arrowR', { size: 12 })} Leave Bazaar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShopScreen;
