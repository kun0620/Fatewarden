import { ArrowRightLeft, Backpack, Coins, Crosshair, FlaskConical, Hammer, Shield, Sword, Trash2, Wrench, Zap } from 'lucide-react';
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
  potion: FlaskConical,
  scroll: Backpack,
  tool: Wrench,
  material: Hammer,
  ammunition: Crosshair,
  quest: Backpack,
  currency: Coins,
  misc: Backpack,
};

const CURRENCY_LABELS: Record<CurrencyKey, string> = {
  pp: 'Platinum',
  gp: 'Gold',
  ep: 'Electrum',
  sp: 'Silver',
  cp: 'Copper',
};

const CURRENCY_KEYS: CurrencyKey[] = ['pp', 'gp', 'ep', 'sp', 'cp'];

function formatWeight(weight: number) {
  return `${weight.toFixed(2)} lb`;
}

function findEquippedWeapon(items: Item[]) {
  return items.find((item) => item.equipped && item.weapon);
}

function findEquippedArmor(items: Item[]) {
  return items.find((item) => item.equipped && item.armor && item.armor.type !== 'shield');
}

function findEquippedShield(items: Item[]) {
  return items.find((item) => item.equipped && item.armor?.type === 'shield');
}

export function InventoryPanel({ character, onUpdateCharacter, disabled = false }: InventoryPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('equipment');
  const [equipToast, setEquipToast] = useState('');
  const [convertFrom, setConvertFrom] = useState<CurrencyKey>('gp');
  const [convertTo, setConvertTo] = useState<CurrencyKey>('sp');
  const [convertAmount, setConvertAmount] = useState(1);
  const { dispatch, eventMeta, setActiveCharacter } = useGameStore();
  const inventory = character.inventory;

  useEffect(() => {
    setActiveCharacter(character);
  }, [character, setActiveCharacter]);

  const equippedWeapon = useMemo(() => findEquippedWeapon(inventory.items), [inventory.items]);
  const equippedArmor = useMemo(() => findEquippedArmor(inventory.items), [inventory.items]);
  const equippedShield = useMemo(() => findEquippedShield(inventory.items), [inventory.items]);
  const attunedCount = useMemo(() => inventory.items.filter((i) => i.attuned).length, [inventory.items]);
  const totalWeight = useMemo(() => calcCarryWeight(inventory), [inventory]);
  const computedAc = useMemo(() => calcACFromInventory(inventory, character.abilities.dex), [inventory, character.abilities.dex]);
  const carryRatio = Math.max(0, Math.min(100, (totalWeight / Math.max(1, inventory.maxCarryWeight)) * 100));

  function showToast(msg: string) {
    setEquipToast(msg);
    globalThis.setTimeout(() => setEquipToast(''), 2000);
  }

  function unequipSlot(item: Item) {
    const event = {
      ...eventMeta(character.id),
      type: 'unequip_item' as const,
      itemId: item.id,
    };
    const result = dispatch(event);
    if (result.character) {
      void onUpdateCharacter(result.character);
      showToast(`Unequipped: ${item.name}`);
    }
  }

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
      showToast(`${wasEquipped ? 'Unequipped' : 'Equipped'}: ${item.name}`);
    }
  }

  function toggleAttune(item: Item) {
    const event = {
      ...eventMeta(character.id),
      type: 'attune_item' as const,
      itemId: item.id,
      attuned: !item.attuned,
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

  function executeCurrencyConvert() {
    if (convertFrom === convertTo || convertAmount <= 0) return;
    const event = {
      ...eventMeta(character.id),
      type: 'update_currency' as const,
      from: convertFrom,
      to: convertTo,
      amount: convertAmount,
    };
    const result = dispatch(event);
    if (result.character) {
      void onUpdateCharacter(result.character);
      showToast(`Converted ${convertAmount} ${convertFrom.toUpperCase()} → ${convertTo.toUpperCase()}`);
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
    <section className="fw-panel fw-inventory-panel">
      <div className="fw-panel__header">
        <div>
          <p className="fw-caption">Inventory</p>
          <h2 className="fw-h2">Arsenal &amp; Pack</h2>
        </div>
      </div>

      <div role="tablist" aria-label="Inventory tabs" className="fw-inventory-tabs">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'equipment'}
          className={`fw-btn fw-btn--sm fw-inventory-tabs__btn ${activeTab === 'equipment' ? 'fw-btn--primary' : 'fw-btn--ghost'}`}
          onClick={() => setActiveTab('equipment')}
        >
          Equipment
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'backpack'}
          className={`fw-btn fw-btn--sm fw-inventory-tabs__btn ${activeTab === 'backpack' ? 'fw-btn--primary' : 'fw-btn--ghost'}`}
          onClick={() => setActiveTab('backpack')}
        >
          Backpack
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'currency'}
          className={`fw-btn fw-btn--sm fw-inventory-tabs__btn ${activeTab === 'currency' ? 'fw-btn--primary' : 'fw-btn--ghost'}`}
          onClick={() => setActiveTab('currency')}
        >
          Currency
        </button>
      </div>

      {/* EQUIPMENT TAB */}
      {activeTab === 'equipment' ? (
        <div className="fw-card fw-inventory-equipment">
          <div className="fw-inventory-equipment__doll">
            <article className="fw-inventory-slot">
              <p className="fw-caption">Head</p>
              <strong className="fw-body-sm">Open</strong>
            </article>

            <article className="fw-inventory-slot">
              <p className="fw-caption">Body</p>
              <strong className="fw-body-sm">{equippedArmor ? equippedArmor.name : 'Unarmored'}</strong>
              <span className="fw-caption">{equippedArmor?.armor ? `AC ${equippedArmor.armor.baseAC}` : 'AC base'}</span>
              {equippedArmor ? (
                <button type="button" className="fw-btn fw-btn--ghost fw-btn--sm" disabled={disabled} onClick={() => unequipSlot(equippedArmor)}>
                  Unequip
                </button>
              ) : null}
            </article>

            <article className="fw-inventory-slot">
              <p className="fw-caption">Hands</p>
              <strong className="fw-body-sm">Ready</strong>
            </article>

            <article className="fw-inventory-slot">
              <p className="fw-caption">Weapon</p>
              <strong className="fw-body-sm">{equippedWeapon ? equippedWeapon.name : 'Unarmed'}</strong>
              <span className="fw-caption">
                {equippedWeapon?.weapon
                  ? `${equippedWeapon.weapon.damageDice} ${equippedWeapon.weapon.damageType}`
                  : '1 + STR bludgeoning'}
              </span>
              {equippedWeapon ? (
                <button type="button" className="fw-btn fw-btn--ghost fw-btn--sm" disabled={disabled} onClick={() => unequipSlot(equippedWeapon)}>
                  Unequip
                </button>
              ) : null}
            </article>

            <article className="fw-inventory-slot">
              <p className="fw-caption">Off-hand</p>
              <strong className="fw-body-sm">{equippedShield ? equippedShield.name : 'Open'}</strong>
              <span className="fw-caption">{equippedShield ? '+2 AC' : 'No shield'}</span>
              {equippedShield ? (
                <button type="button" className="fw-btn fw-btn--ghost fw-btn--sm" disabled={disabled} onClick={() => unequipSlot(equippedShield)}>
                  Unequip
                </button>
              ) : null}
            </article>

            <article className="fw-inventory-slot">
              <p className="fw-caption">Accessory</p>
              <strong className="fw-body-sm">Open</strong>
            </article>
          </div>

          <div className="fw-inventory-equipment__stats">
            <p className="fw-body-sm">
              <Tooltip label="Armor Class — ค่าที่คนตียากให้ถึง">AC</Tooltip>: <strong>{computedAc}</strong>
            </p>
            <p className="fw-body-sm">
              Weapon damage:{' '}
              <strong>
                {equippedWeapon?.weapon
                  ? `${equippedWeapon.weapon.damageDice} ${equippedWeapon.weapon.damageType}`
                  : '1 + STR bludgeoning'}
              </strong>
            </p>
          </div>
        </div>
      ) : null}

      {/* BACKPACK TAB */}
      {activeTab === 'backpack' ? (
        <div className="fw-inventory-backpack">
          <div className="fw-inventory-attunement-bar">
            <Zap size={12} aria-hidden="true" />
            <span className="fw-caption">
              Attuned: <strong>{attunedCount}</strong> / 3
            </span>
          </div>

          {inventory.items.length ? (
            inventory.items.map((item) => {
              const Icon = categoryIcon[item.category] ?? Backpack;
              return (
                <article className="fw-card fw-inventory-item" key={item.id}>
                  <div className="fw-inventory-item__icon">
                    <Icon size={16} aria-hidden="true" />
                  </div>
                  <div className="fw-inventory-item__content">
                    <div className="fw-inventory-item__head">
                      <strong className="fw-body-sm">{item.name}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {item.attuned ? (
                          <span className="fw-pill fw-pill--arcane" style={{ fontSize: 10, padding: '1px 5px', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            <Zap size={9} aria-hidden="true" /> Attuned
                          </span>
                        ) : null}
                        <small className="fw-caption">{formatWeight(item.weight * item.quantity)}</small>
                      </div>
                    </div>
                    <p className="fw-caption">{item.category} · qty {item.quantity}</p>
                    <div className="fw-inventory-item__actions">
                      <button type="button" className="fw-btn fw-btn--ghost fw-btn--sm" disabled={disabled} onClick={() => toggleEquip(item)}>
                        {item.equipped ? 'Unequip' : 'Equip'}
                      </button>
                      {item.attunement ? (
                        <button
                          type="button"
                          className={`fw-btn fw-btn--sm ${item.attuned ? 'fw-btn--arcane' : 'fw-btn--ghost'}`}
                          disabled={disabled || (!item.attuned && attunedCount >= 3)}
                          title={!item.attuned && attunedCount >= 3 ? 'Max 3 attuned items' : undefined}
                          onClick={() => toggleAttune(item)}
                        >
                          <Zap size={12} aria-hidden="true" />
                          {item.attuned ? 'Unattuned' : 'Attune'}
                        </button>
                      ) : null}
                      <button type="button" className="fw-btn fw-btn--ghost fw-btn--sm" disabled={disabled} onClick={() => changeQuantity(item, -1)}>
                        −
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

      {/* CURRENCY TAB */}
      {activeTab === 'currency' ? (
        <div className="fw-inventory-currency">
          <div className="fw-inventory-currency__grid">
            {CURRENCY_KEYS.map((coin) => (
              <div className="fw-field fw-inventory-currency__cell" key={coin}>
                <label className="fw-field__label">{coin.toUpperCase()}</label>
                <input
                  className="fw-input fw-input--mono"
                  type="number"
                  min={0}
                  step={1}
                  value={inventory.currency[coin]}
                  disabled={disabled}
                  onChange={(e) => updateCurrency(coin, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="fw-inventory-currency__convert">
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

          <div className="fw-inventory-currency__convert-form">
            <p className="fw-caption" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowRightLeft size={12} aria-hidden="true" /> Convert Currency
            </p>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="fw-field" style={{ flex: '1 1 70px', minWidth: 70 }}>
                <label className="fw-field__label">Amount</label>
                <input
                  className="fw-input fw-input--mono"
                  type="number"
                  min={1}
                  step={1}
                  value={convertAmount}
                  disabled={disabled}
                  onChange={(e) => setConvertAmount(Math.max(1, Math.trunc(Number(e.target.value) || 1)))}
                />
              </div>
              <div className="fw-field" style={{ flex: '1 1 80px', minWidth: 80 }}>
                <label className="fw-field__label">From</label>
                <select
                  className="fw-select"
                  value={convertFrom}
                  disabled={disabled}
                  onChange={(e) => setConvertFrom(e.target.value as CurrencyKey)}
                >
                  {CURRENCY_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k.toUpperCase()} — {CURRENCY_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fw-field" style={{ flex: '1 1 80px', minWidth: 80 }}>
                <label className="fw-field__label">To</label>
                <select
                  className="fw-select"
                  value={convertTo}
                  disabled={disabled}
                  onChange={(e) => setConvertTo(e.target.value as CurrencyKey)}
                >
                  {CURRENCY_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k.toUpperCase()} — {CURRENCY_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="fw-btn fw-btn--primary fw-btn--sm"
                disabled={disabled || convertFrom === convertTo || convertAmount <= 0 || inventory.currency[convertFrom] < convertAmount}
                onClick={executeCurrencyConvert}
              >
                Convert
              </button>
            </div>
            <p className="fw-caption" style={{ marginTop: 4, opacity: 0.6 }}>
              Available: {inventory.currency[convertFrom]} {convertFrom.toUpperCase()}
            </p>
          </div>
        </div>
      ) : null}

      <div className="fw-inventory-encumbrance">
        <p className="fw-caption">
          Carry weight: <strong>{formatWeight(totalWeight)}</strong> / <strong>{formatWeight(inventory.maxCarryWeight)}</strong>
        </p>
        <div
          className="fw-hp"
          aria-label="Carry weight usage"
          data-state={carryRatio > 90 ? 'bleed' : carryRatio > 65 ? 'low' : 'full'}
        >
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
