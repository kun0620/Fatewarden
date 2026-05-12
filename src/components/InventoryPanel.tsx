import { Backpack, Coins, FlaskConical, Hammer, Shield, Sword, Trash2, Wrench } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  calcACFromInventory,
  calcCarryWeight,
} from '../lib/inventory';
import { useGameStore } from '../store/useGameStore';
import type { Character, Inventory, Item, ItemCategory } from '../types';

type InventoryPanelProps = {
  character: Character;
  onUpdateCharacter: (character: Character) => void | Promise<void>;
  disabled?: boolean;
};

type TabKey = 'equipment' | 'backpack' | 'currency';
type CurrencyKey = keyof Inventory['currency'];

const categoryIcon: Record<ItemCategory, typeof Backpack> = {
  weapon: Sword,
  armor: Shield,
  shield: Shield,
  gear: Backpack,
  consumable: FlaskConical,
  tool: Wrench,
  material: Hammer,
  quest: Backpack,
  currency: Coins,
  misc: Backpack,
};

function formatWeight(weight: number) {
  return `${weight.toFixed(2)} lb`;
}

function findEquippedWeapon(items: Item[]) {
  return items.find((item) => item.equipped && item.weapon);
}

function findEquippedArmor(items: Item[]) {
  return items.find((item) => item.equipped && item.armor && item.armor.type !== 'shield');
}

export function InventoryPanel({ character, onUpdateCharacter, disabled = false }: InventoryPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('equipment');
  const { dispatch, eventMeta, setActiveCharacter } = useGameStore();
  const inventory = character.inventory;

  useEffect(() => {
    setActiveCharacter(character);
  }, [character, setActiveCharacter]);

  const equippedWeapon = useMemo(() => findEquippedWeapon(inventory.items), [inventory.items]);
  const equippedArmor = useMemo(() => findEquippedArmor(inventory.items), [inventory.items]);
  const totalWeight = useMemo(() => calcCarryWeight(inventory), [inventory]);
  const computedAc = useMemo(() => calcACFromInventory(inventory, character.abilities.dex), [inventory, character.abilities.dex]);
  const carryRatio = Math.max(0, Math.min(100, (totalWeight / Math.max(1, inventory.maxCarryWeight)) * 100));

  function toggleEquip(item: Item) {
    const event = item.equipped
      ? {
          ...eventMeta(character.id),
          type: 'unequip_item' as const,
          itemId: item.id,
        }
      : {
          ...eventMeta(character.id),
          type: 'equip_item' as const,
          itemId: item.id,
          slot: 'main_hand' as const,
        };
    const result = dispatch(event);
    if (result.character) {
      void onUpdateCharacter(result.character);
    }
  }

  function changeQuantity(item: Item, delta: number) {
    const event = {
      ...eventMeta(character.id),
      type: 'update_quantity' as const,
      itemId: item.id,
      delta,
    };
    const result = dispatch(event);
    if (result.character) {
      void onUpdateCharacter(result.character);
    }
  }

  function removeBackpackItem(item: Item) {
    const event = {
      ...eventMeta(character.id),
      type: 'remove_item' as const,
      itemId: item.id,
    };
    const result = dispatch(event);
    if (result.character) {
      void onUpdateCharacter(result.character);
    }
  }

  function updateCurrency(field: CurrencyKey, value: string) {
    const nextValue = Math.max(0, Math.trunc(Number(value) || 0));
    const event = {
      ...eventMeta(character.id),
      type: 'update_currency' as const,
      from: field,
      to: field,
      amount: nextValue,
    };
    const result = dispatch(event);
    if (result.character) {
      void onUpdateCharacter(result.character);
    }
  }

  function quickConvert(from: CurrencyKey, to: CurrencyKey) {
    const available = inventory.currency[from];
    if (available <= 0) return;
    const event = {
      ...eventMeta(character.id),
      type: 'update_currency' as const,
      from,
      to,
      amount: 1,
    };
    const result = dispatch(event);
    if (result.character) {
      void onUpdateCharacter(result.character);
    }
  }

  return (
    <section className="panel inventory-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Inventory</p>
          <h2>Pack & Equipment</h2>
        </div>
      </div>

      <div className="segmented-control compact" role="tablist" aria-label="Inventory tabs">
        <button type="button" className={activeTab === 'equipment' ? 'active' : ''} onClick={() => setActiveTab('equipment')}>
          Equipment
        </button>
        <button type="button" className={activeTab === 'backpack' ? 'active' : ''} onClick={() => setActiveTab('backpack')}>
          Backpack
        </button>
        <button type="button" className={activeTab === 'currency' ? 'active' : ''} onClick={() => setActiveTab('currency')}>
          Currency
        </button>
      </div>

      {activeTab === 'equipment' ? (
        <div className="stack-form">
          <div className="status">
            AC (equipped): <strong>{computedAc}</strong>
          </div>
          <div className="status">
            Weapon:{' '}
            <strong>
              {equippedWeapon ? `${equippedWeapon.name} (${equippedWeapon.weapon?.damageDice ?? '-'} ${equippedWeapon.weapon?.damageType ?? ''})` : 'None'}
            </strong>
          </div>
          <div className="status">
            Armor: <strong>{equippedArmor ? `${equippedArmor.name} (AC ${equippedArmor.armor?.baseAC ?? '-'})` : 'None'}</strong>
          </div>
        </div>
      ) : null}

      {activeTab === 'backpack' ? (
        <div className="party-list">
          {inventory.items.length ? (
            inventory.items.map((item) => {
              const Icon = categoryIcon[item.category] ?? Backpack;
              return (
                <article className="party-card" key={item.id}>
                  <div className="party-avatar">
                    <Icon size={16} aria-hidden="true" />
                  </div>
                  <div className="party-info">
                    <div className="party-header">
                      <strong>{item.name}</strong>
                      <small>{formatWeight(item.weight * item.quantity)}</small>
                    </div>
                    <small>
                      {item.category} · qty {item.quantity}
                    </small>
                    <div className="character-actions">
                      <button type="button" className="secondary-button" disabled={disabled} onClick={() => toggleEquip(item)}>
                        {item.equipped ? 'Unequip' : 'Equip'}
                      </button>
                      <button type="button" className="secondary-button" disabled={disabled} onClick={() => changeQuantity(item, -1)}>
                        -
                      </button>
                      <button type="button" className="secondary-button" disabled={disabled} onClick={() => changeQuantity(item, 1)}>
                        +
                      </button>
                      <button type="button" className="secondary-button" disabled={disabled} onClick={() => removeBackpackItem(item)}>
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="form-message">No items in backpack.</p>
          )}
        </div>
      ) : null}

      {activeTab === 'currency' ? (
        <div className="character-editor-grid">
          {(Object.keys(inventory.currency) as CurrencyKey[]).map((coin) => (
            <label key={coin}>
              {coin.toUpperCase()}
              <input
                type="number"
                min={0}
                step={1}
                value={inventory.currency[coin]}
                disabled={disabled}
                onChange={(event) => updateCurrency(coin, event.target.value)}
              />
            </label>
          ))}
          <div className="character-actions">
            <button type="button" className="secondary-button" disabled={disabled} onClick={() => quickConvert('pp', 'gp')}>
              PP→GP
            </button>
            <button type="button" className="secondary-button" disabled={disabled} onClick={() => quickConvert('gp', 'sp')}>
              GP→SP
            </button>
            <button type="button" className="secondary-button" disabled={disabled} onClick={() => quickConvert('sp', 'cp')}>
              SP→CP
            </button>
          </div>
        </div>
      ) : null}

      <div className="status">
        Carry weight: <strong>{formatWeight(totalWeight)}</strong> / <strong>{formatWeight(inventory.maxCarryWeight)}</strong>
      </div>
      <div className="weight-bar" aria-label="Carry weight usage">
        <div className="weight-bar-fill" style={{ width: `${carryRatio}%` }} />
      </div>
    </section>
  );
}
