import { useMemo, useState } from 'react';
import type { RunNode, RunState } from '../../engine/run/runTypes';
import { useGameStore } from '../../store/useGameStore';
import type { Item, VaultCharacter } from '../../types';
import { WIcon } from './runVisuals';

type ForgeItemKind = 'weapon' | 'armor' | 'consumable' | 'accessory';

type ForgeItem = {
  characterId: string;
  ownerName: string;
  id: string;
  item: Item;
  kind: ForgeItemKind;
};

type UpgradeOption = {
  id: string;
  label: string;
  desc: string;
  color: 'blood' | 'gold' | 'violet';
  icon: string;
};

const WEAPON_UPGRADES: UpgradeOption[] = [
  { id: 'damage_plus', label: '+1 Damage Die', desc: 'd6 -> d8', color: 'blood', icon: 'sword' },
  { id: 'attack_plus', label: '+1 Attack', desc: '+1 to hit', color: 'violet', icon: 'rune' },
];

const ARMOR_UPGRADES: UpgradeOption[] = [
  { id: 'ac_plus', label: '+1 Armor Class', desc: 'AC +1', color: 'gold', icon: 'shield' },
  { id: 'resist', label: 'Resistance', desc: '-1 damage taken', color: 'violet', icon: 'rune' },
];

const CONSUMABLE_UPGRADES: UpgradeOption[] = [
  { id: 'charges', label: '+2 Charges', desc: 'more uses', color: 'violet', icon: 'sparkles' },
  { id: 'potency', label: '+50% Effect', desc: 'stronger heal', color: 'gold', icon: 'rune' },
];

function getCurrentNode(runState: RunState): RunNode | null {
  return runState.floors
    .find((floor) => floor.floorNumber === runState.currentFloor)
    ?.nodes.find((node) => node.id === runState.currentNodeId) ?? null;
}

function getItemKind(item: Item): ForgeItemKind | null {
  if (item.weapon) return 'weapon';
  if (item.armor) return 'armor';
  if (item.category === 'consumable') return 'consumable';
  if (item.equipped) return 'accessory';
  return null;
}

function getForgeOptions(kind: ForgeItemKind): UpgradeOption[] {
  if (kind === 'weapon') return WEAPON_UPGRADES;
  if (kind === 'armor') return ARMOR_UPGRADES;
  if (kind === 'consumable') return CONSUMABLE_UPGRADES;
  return ARMOR_UPGRADES;
}

function getItemDetail(item: Item, kind: ForgeItemKind): string {
  if (kind === 'weapon' && item.weapon) return `${item.weapon.damageDice} ${item.weapon.damageType}`;
  if (kind === 'armor' && item.armor) return item.armor.type === 'shield' ? 'shield' : `AC ${item.armor.baseAC}`;
  if (kind === 'consumable') return `qty ${item.quantity}`;
  return item.category;
}

function buildPartyItems(partyCharacterIds: string[], vaultCharacters: VaultCharacter[]): ForgeItem[] {
  return partyCharacterIds.flatMap((characterId) => {
    const character = vaultCharacters.find((entry) => entry.id === characterId);
    if (!character) return [];

    return character.inventory.items
      .map((item): ForgeItem | null => {
        const kind = getItemKind(item);
        if (!kind) return null;
        if (kind !== 'consumable' && !item.equipped) return null;
        return {
          characterId,
          ownerName: character.name,
          id: `${characterId}:${item.id}`,
          item,
          kind,
        };
      })
      .filter((item): item is ForgeItem => Boolean(item));
  });
}

function SceneForge() {
  return (
    <svg viewBox="0 0 800 280" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true">
      <defs>
        <radialGradient id="wr-forge-glow" cx="50%" cy="60%" r="40%">
          <stop offset="0%" stopColor="#D4A028" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#8B1538" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#050309" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="280" fill="#0a0612" />
      <ellipse cx="400" cy="200" rx="320" ry="100" fill="url(#wr-forge-glow)" />
      <g fill="#1a1024" stroke="#3a2849" strokeWidth="1.2">
        <path d="M 300 220 L 500 220 L 480 200 L 320 200 Z" />
        <rect x="340" y="170" width="120" height="30" fill="#251735" />
        <path d="M 360 170 L 440 170 L 440 100 L 360 100 Z" />
        <path d="M 460 110 Q 510 110 520 130 Q 510 140 460 130 Z" />
      </g>
      {Array.from({ length: 18 }, (_, index) => (
        <circle
          key={`coal-${index}`}
          cx={350 + (index * 7) % 100}
          cy={195 + (index % 3) * 4}
          r={2 + (index % 3)}
          fill={index % 2 ? '#D4A028' : '#C53456'}
          opacity="0.7"
        />
      ))}
      <g stroke="#9B5DE5" strokeWidth="2" fill="#1a1024">
        <rect x="380" y="40" width="40" height="20" rx="2" />
        <rect x="395" y="58" width="10" height="80" />
      </g>
      {Array.from({ length: 12 }, (_, index) => (
        <circle
          key={`spark-${index}`}
          cx={395 + (index % 5) * 8 - 16}
          cy={140 + (index % 4) * 10}
          r="1.2"
          fill="#D4A028"
          opacity="0.85"
        />
      ))}
    </svg>
  );
}

export function ForgeScreen() {
  const { completeNode, runState, vaultCharacters } = useGameStore();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedUpgrade, setSelectedUpgrade] = useState<string | null>(null);
  const [forged, setForged] = useState(false);
  const currentNode = runState ? getCurrentNode(runState) : null;
  const partyItems = useMemo(
    () => (runState ? buildPartyItems(runState.partyCharacterIds, vaultCharacters) : []),
    [runState, vaultCharacters],
  );
  const selectedItem = partyItems.find((entry) => entry.id === selectedItemId) ?? null;
  const upgradeOptions = selectedItem ? getForgeOptions(selectedItem.kind) : [];

  function selectItem(itemId: string) {
    if (forged) return;
    setSelectedItemId(itemId);
    setSelectedUpgrade(null);
  }

  function leaveForge() {
    if (!currentNode) return;
    completeNode(currentNode.id, { type: 'forge', itemId: 'none', upgradeId: 'none' });
  }

  function forgeItem() {
    if (!currentNode || !selectedItem || !selectedUpgrade || forged) return;
    setForged(true);
    // TODO: apply mechanical stat change to vaultCharacter (requires Supabase update)
    // upgradeId recorded in completeNode for future migration
    window.setTimeout(() => {
      completeNode(currentNode.id, {
        type: 'forge',
        itemId: selectedItem.item.id,
        upgradeId: selectedUpgrade,
      });
    }, 2000);
  }

  if (!runState) {
    return (
      <div className="wr-scene wr-screen-in">
        <div className="wr-scene-inner">
          <div className="wr-narration">No forge node is active.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="wr-scene wr-screen-in">
      <div className="wr-scene-inner">
        <div className="wr-event-banner">
          <div className="wr-event-banner-art">
            <SceneForge />
          </div>
          <div className="wr-event-banner-fade" />
          <div className="wr-event-banner-title">
            <div className="eyebrow" style={{ color: 'var(--wr-gold-bright)' }}>The Forge Awaits</div>
            <h2>An Anvil in the Dark</h2>
          </div>
        </div>

        <div className="wr-narration">
          <p>Shape your iron. The dark yields to the prepared.</p>
        </div>

        <div className="wr-forge-grid">
          <div className="wr-panel" style={{ padding: 12 }}>
            <div className="wr-eyebrow" style={{ marginBottom: 8 }}>Select Item to Forge</div>
            {partyItems.length === 0 ? (
              <div className="wr-narration" style={{ margin: 0, fontSize: 14 }}>
                No equipped party items are ready for the anvil.
              </div>
            ) : (
              partyItems.map((entry) => {
                const isActive = entry.id === selectedItemId;
                const isForged = forged && isActive;
                return (
                  <button
                    key={entry.id}
                    className={`wr-forge-row ${isActive ? 'active' : ''}`}
                    type="button"
                    onClick={() => selectItem(entry.id)}
                    disabled={forged}
                    style={isForged ? { boxShadow: '0 0 28px -10px var(--wr-gold-bright)' } : undefined}
                  >
                    <div className="wr-forge-row-ic">{WIcon(entry.kind === 'weapon' ? 'sword' : entry.kind === 'armor' ? 'shield' : 'rune', { size: 18 })}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--wr-f-head)', fontSize: 12, letterSpacing: '0.08em', color: 'var(--wr-bone)' }}>
                        {entry.item.name} <span style={{ color: 'var(--wr-gold-bright)', fontFamily: 'var(--wr-f-mono)' }}>{entry.item.rarity}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--wr-text-3)', fontStyle: 'italic' }}>
                        {entry.ownerName} · {getItemDetail(entry.item, entry.kind)}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--wr-edge-soft)', fontSize: 11, color: 'var(--wr-text-3)', fontStyle: 'italic', textAlign: 'center' }}>
              One forging permitted per visit.
            </div>
          </div>

          <div className="wr-panel wr-forge-detail">
            <div className="wr-corn tl" /><div className="wr-corn tr" /><div className="wr-corn bl" /><div className="wr-corn br" />
            <div className="wr-eyebrow" style={{ color: 'var(--wr-gold-bright)', marginBottom: 10 }}>Upgrade Options</div>

            {selectedItem ? (
              <>
                <div className="wr-forge-current">
                  <div className="wr-forge-current-ic">{WIcon(selectedItem.kind === 'weapon' ? 'sword' : selectedItem.kind === 'armor' ? 'shield' : 'rune', { size: 32 })}</div>
                  <div>
                    <div style={{ fontFamily: 'var(--wr-f-head)', fontSize: 16, letterSpacing: '0.10em', color: 'var(--wr-bone)' }}>{selectedItem.item.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--wr-text-2)', fontStyle: 'italic', marginTop: 2 }}>
                      {selectedItem.ownerName} · current: {getItemDetail(selectedItem.item, selectedItem.kind)}
                    </div>
                  </div>
                  <span style={{ flex: 1 }} />
                  <div className="wr-forge-arrow">
                    {selectedItem.kind} {WIcon('arrowR', { size: 14 })} <b style={{ color: 'var(--wr-gold-bright)' }}>+1</b>
                  </div>
                </div>

                <div className="wr-forge-options">
                  {upgradeOptions.map((option) => (
                    <button
                      key={option.id}
                      className={`wr-forge-opt ${option.color} ${selectedUpgrade === option.id ? 'selected' : ''}`}
                      type="button"
                      onClick={() => setSelectedUpgrade(option.id)}
                      disabled={forged}
                    >
                      <div className="wr-forge-opt-ic">{WIcon(option.icon, { size: 18 })}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, letterSpacing: '0.04em', color: 'var(--wr-bone)' }}>{option.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--wr-text-3)', fontStyle: 'italic', marginTop: 2 }}>{option.desc}</div>
                      </div>
                      <span className={`wr-forge-check ${selectedUpgrade === option.id ? 'on' : ''}`}>{WIcon('check', { size: 11 })}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="wr-narration" style={{ margin: 0, fontSize: 14 }}>
                Choose a weapon, armor, or charged item from the party list.
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="wr-btn wr-btn-ghost" type="button" onClick={leaveForge} disabled={forged} style={{ flex: 1, justifyContent: 'center' }}>
                Leave {WIcon('chevR', { size: 12 })}
              </button>
              <button className="wr-btn wr-btn-gold wr-btn-lg" type="button" disabled={!selectedItem || !selectedUpgrade || forged} onClick={forgeItem} style={{ flex: 2, justifyContent: 'center' }}>
                {forged ? <>{WIcon('check', { size: 14 })} Forged</> : <>{WIcon('hammer', { size: 14 })} Forge Item {WIcon('chevR', { size: 12 })}</>}
              </button>
            </div>

            {forged && selectedItem && (
              <div className="wr-forge-result">
                {WIcon('sparkles', { size: 14 })} <b>{selectedItem.item.name}</b> has been forged.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgeScreen;
