import { Backpack, Coins, FlaskConical, Hammer, Shield, Sword, Trash2, Wrench } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  calcACFromInventory,
  calcCarryWeight,
} from '../lib/inventory';
import { useGameStore } from '../store/useGameStore';
import { Tooltip } from './ui/Tooltip';
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
  const [equipToast, setEquipToast] = useState('');
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
    const wasEquipped = item.equipped;
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
      setEquipToast(`${wasEquipped ? 'Unequipped' : 'Equipped'}: ${item.name}`);
      globalThis.setTimeout(() => setEquipToast(''), 2000);
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
    <section className="fw-panel">
      <div className="fw-panel__header">
        <div>
          <p className="fw-caption">Inventory</p>
          <h2 className="fw-h2">Pack &amp; Equipment</h2>
        </div>
      </div>

      <div role="tablist" aria-label="Inventory tabs" style={{ display: 'flex', gap: 'var(--sp-2)' }}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'equipment'}
          className={`fw-btn fw-btn--sm ${activeTab === 'equipment' ? 'fw-btn--primary' : 'fw-btn--ghost'}`}
          onClick={() => setActiveTab('equipment')}
        >
          Equipment
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'backpack'}
          className={`fw-btn fw-btn--sm ${activeTab === 'backpack' ? 'fw-btn--primary' : 'fw-btn--ghost'}`}
          onClick={() => setActiveTab('backpack')}
        >
          Backpack
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'currency'}
          className={`fw-btn fw-btn--sm ${activeTab === 'currency' ? 'fw-btn--primary' : 'fw-btn--ghost'}`}
          onClick={() => setActiveTab('currency')}
        >
          Currency
        </button>
      </div>

      {activeTab === 'equipment' ? (
        <div className="fw-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          <p className="fw-body-sm">
            <Tooltip label="Armor Class — ค่าที่คนตียากให้ถึง">AC</Tooltip> (equipped): <strong>{computedAc}</strong>
          </p>
          <p className="fw-body-sm">
            Weapon:{' '}
            <strong>
              {equippedWeapon ? `${equippedWeapon.name} (${equippedWeapon.weapon?.damageDice ?? '-'} ${equippedWeapon.weapon?.damageType ?? ''})` : 'None'}
            </strong>
          </p>
          <p className="fw-body-sm">
            Armor: <strong>{equippedArmor ? `${equippedArmor.name} (AC ${equippedArmor.armor?.baseAC ?? '-'})` : 'None'}</strong>
          </p>
        </div>
      ) : null}

      {activeTab === 'backpack' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {inventory.items.length ? (
            inventory.items.map((item) => {
              const Icon = categoryIcon[item.category] ?? Backpack;
              return (
                <article className="fw-card" key={item.id} style={{ display: 'flex', gap: 'var(--sp-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2rem', flexShrink: 0, color: 'var(--ink-300)' }}>
                    <Icon size={16} aria-hidden="true" />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <strong className="fw-body-sm">{item.name}</strong>
                      <small className="fw-caption">{formatWeight(item.weight * item.quantity)}</small>
                    </div>
                    <p className="fw-caption">{item.category} · qty {item.quantity}</p>
                    <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                      <button type="button" className="fw-btn fw-btn--ghost fw-btn--sm" disabled={disabled} onClick={() => toggleEquip(item)}>
                        {item.equipped ? 'Unequip' : 'Equip'}
                      </button>
                      <button type="button" className="fw-btn fw-btn--ghost fw-btn--sm" disabled={disabled} onClick={() => changeQuantity(item, -1)}>
                        -
                      </button>
                      <button type="button" className="fw-btn fw-btn--ghost fw-btn--sm" disabled={disabled} onClick={() => changeQuantity(item, 1)}>
                        +
                      </button>
                      <button type="button" className="fw-btn fw-btn--danger fw-btn--sm" disabled={disabled} onClick={() => removeBackpackItem(item)}>
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="fw-caption">No items in backpack.</p>
          )}
        </div>
      ) : null}

      {activeTab === 'currency' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--sp-2)' }}>
            {(Object.keys(inventory.currency) as CurrencyKey[]).map((coin) => (
              <div className="fw-field" key={coin} style={{ alignItems: 'center', textAlign: 'center' }}>
                <label className="fw-field__label" style={{ textAlign: 'center' }}>{coin.toUpperCase()}</label>
                <input
                  className="fw-input fw-input--mono"
                  type="number"
                  min={0}
                  step={1}
                  style={{ textAlign: 'center' }}
                  value={inventory.currency[coin]}
                  disabled={disabled}
                  onChange={(event) => updateCurrency(coin, event.target.value)}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            <button type="button" className="fw-btn fw-btn--ghost fw-btn--sm" disabled={disabled} onClick={() => quickConvert('pp', 'gp')}>
              PP→GP
            </button>
            <button type="button" className="fw-btn fw-btn--ghost fw-btn--sm" disabled={disabled} onClick={() => quickConvert('gp', 'sp')}>
              GP→SP
            </button>
            <button type="button" className="fw-btn fw-btn--ghost fw-btn--sm" disabled={disabled} onClick={() => quickConvert('sp', 'cp')}>
              SP→CP
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        <p className="fw-caption">
          Carry weight: <strong>{formatWeight(totalWeight)}</strong> / <strong>{formatWeight(inventory.maxCarryWeight)}</strong>
        </p>
        <div className="fw-hp" aria-label="Carry weight usage" data-state={carryRatio > 90 ? 'bleed' : carryRatio > 65 ? 'low' : 'full'}>
          <div className="fw-hp__fill" style={{ width: `${carryRatio}%` }} />
        </div>
      </div>
      {equipToast ? (
        <div className="fw-toast fw-toast--success">
          <strong>{equipToast}</strong>
        </div>
      ) : null}
    </section>
  );
}
