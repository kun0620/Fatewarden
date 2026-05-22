import { ArrowRightLeft, Backpack, Coins, Crosshair, FlaskConical, Hammer, Shield, Sword, Trash2, Wrench, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useGameData } from '../hooks/useGameData';
import {
  calcACFromInventory,
  calcCarryWeight,
} from '../lib/inventory';
import { Tooltip } from './ui/Tooltip';
import type { GameEvent, InventoryEquipSlot } from '../engine/events/types';
import type { Character, Inventory, Item, ItemCategory } from '../types';

type InventoryPanelProps = {
  character?: Character | null;
  onUpdateCharacter?: (character: Character) => void | Promise<void>;
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

function equipSlotFor(item: Item): InventoryEquipSlot {
  if (item.armor?.type === 'shield' || item.category === 'shield') return 'off_hand';
  if (item.armor) return 'armor';
  if (item.weapon?.properties.includes('two_handed')) return 'two_handed';
  return 'main_hand';
}

function canConsume(item: Item) {
  return item.category === 'consumable' || item.category === 'potion' || item.category === 'scroll';
}

export function InventoryPanel({ character, onUpdateCharacter, disabled = false }: InventoryPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('equipment');
  const [equipToast, setEquipToast] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [convertFrom, setConvertFrom] = useState<CurrencyKey>('gp');
  const [convertTo, setConvertTo] = useState<CurrencyKey>('sp');
  const [convertAmount, setConvertAmount] = useState(1);
  const { character: storeCharacter, dispatch, eventMeta, setActiveCharacter } = useGameData();
  const activeCharacter = character ?? storeCharacter;
  const inventory = activeCharacter?.inventory ?? null;
  const inventoryItems = inventory?.items ?? [];

  useEffect(() => {
    if (activeCharacter) setActiveCharacter(activeCharacter);
  }, [activeCharacter, setActiveCharacter]);

  const equippedWeapon = useMemo(() => findEquippedWeapon(inventoryItems), [inventoryItems]);
  const equippedArmor = useMemo(() => findEquippedArmor(inventoryItems), [inventoryItems]);
  const equippedShield = useMemo(() => findEquippedShield(inventoryItems), [inventoryItems]);
  const attunedCount = useMemo(() => inventoryItems.filter((item) => item.attuned).length, [inventoryItems]);
  const totalWeight = useMemo(() => (inventory ? calcCarryWeight(inventory) : 0), [inventory]);
  const computedAc = useMemo(
    () => (inventory && activeCharacter ? calcACFromInventory(inventory, activeCharacter.abilities.dex) : 10),
    [inventory, activeCharacter],
  );
  const carryRatio = Math.max(0, Math.min(100, (totalWeight / Math.max(1, inventory?.maxCarryWeight ?? 1)) * 100));

  function showToast(msg: string) {
    setEquipToast(msg);
    globalThis.setTimeout(() => setEquipToast(''), 2000);
  }

  async function applyInventoryEvent(event: GameEvent, successMessage?: string) {
    if (!activeCharacter) return;
    setBusyAction(event.id);
    setActiveCharacter(activeCharacter);
    const result = dispatch(event);
    if (result.failed.length) {
      showToast(result.failed[0]);
      setBusyAction('');
      return;
    }
    if (result.character) await onUpdateCharacter?.(result.character);
    if (successMessage) showToast(successMessage);
    setBusyAction('');
  }

  function unequipSlot(item: Item) {
    if (!activeCharacter) return;
    void applyInventoryEvent({
      ...eventMeta(activeCharacter.id),
      type: 'unequip_item',
      targetId: activeCharacter.id,
      itemId: item.id,
    }, `Unequipped: ${item.name}`);
  }

  function toggleEquip(item: Item) {
    if (!activeCharacter) return;
    const wasEquipped = item.equipped;
    const event = item.equipped
      ? {
          ...eventMeta(activeCharacter.id),
          type: 'unequip_item' as const,
          targetId: activeCharacter.id,
          itemId: item.id,
        }
      : {
          ...eventMeta(activeCharacter.id),
          type: 'equip_item' as const,
          targetId: activeCharacter.id,
          itemId: item.id,
          slot: equipSlotFor(item),
        };
    void applyInventoryEvent(event, `${wasEquipped ? 'Unequipped' : 'Equipped'}: ${item.name}`);
  }

  function toggleAttune(item: Item) {
    if (!activeCharacter) return;
    void applyInventoryEvent({
      ...eventMeta(activeCharacter.id),
      type: 'attune_item',
      targetId: activeCharacter.id,
      itemId: item.id,
      attuned: !item.attuned,
    }, `${item.attuned ? 'Unattuned' : 'Attuned'}: ${item.name}`);
  }

  function changeQuantity(item: Item, delta: number) {
    if (!activeCharacter) return;
    void applyInventoryEvent({
      ...eventMeta(activeCharacter.id),
      type: 'update_quantity',
      targetId: activeCharacter.id,
      itemId: item.id,
      delta,
    });
  }

  function removeBackpackItem(item: Item) {
    if (!activeCharacter) return;
    void applyInventoryEvent({
      ...eventMeta(activeCharacter.id),
      type: 'remove_item',
      targetId: activeCharacter.id,
      itemId: item.id,
    }, `Removed: ${item.name}`);
  }

  function consumeBackpackItem(item: Item) {
    if (!activeCharacter) return;
    void applyInventoryEvent({
      ...eventMeta(activeCharacter.id),
      type: 'consume_item',
      targetId: activeCharacter.id,
      itemId: item.id,
      quantity: 1,
    }, `Consumed: ${item.name}`);
  }

  function updateCurrency(field: CurrencyKey, value: string) {
    if (!activeCharacter) return;
    const nextValue = Math.max(0, Math.trunc(Number(value) || 0));
    void applyInventoryEvent({
      ...eventMeta(activeCharacter.id),
      type: 'update_currency',
      targetId: activeCharacter.id,
      from: field,
      to: field,
      amount: nextValue,
    });
  }

  function executeCurrencyConvert() {
    if (!activeCharacter) return;
    if (convertFrom === convertTo || convertAmount <= 0) return;
    void applyInventoryEvent({
      ...eventMeta(activeCharacter.id),
      type: 'update_currency',
      targetId: activeCharacter.id,
      from: convertFrom,
      to: convertTo,
      amount: convertAmount,
    }, `Converted ${convertAmount} ${convertFrom.toUpperCase()} -> ${convertTo.toUpperCase()}`);
  }

  function quickConvert(from: CurrencyKey, to: CurrencyKey) {
    if (!activeCharacter || !inventory) return;
    const available = inventory.currency[from];
    if (available <= 0) return;
    void applyInventoryEvent({
      ...eventMeta(activeCharacter.id),
      type: 'update_currency',
      targetId: activeCharacter.id,
      from,
      to,
      amount: 1,
    });
  }

  if (!activeCharacter || !inventory) {
    return (
      <section className="fw-panel fw-inventory-panel">
        <div className="fw-panel__header">
          <div>
            <p className="fw-caption">Inventory</p>
            <h2 className="fw-h2">No character selected</h2>
          </div>
        </div>
        <p className="fw-caption">Choose or create a character before managing equipment and currency.</p>
      </section>
    );
  }

  const actionDisabled = disabled || Boolean(busyAction);

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
                <button type="button" className="fw-btn fw-btn--ghost fw-btn--sm" disabled={actionDisabled} onClick={() => unequipSlot(equippedArmor)}>
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
                  : 'Unarmed strike'}
              </span>
              {equippedWeapon ? (
                <button type="button" className="fw-btn fw-btn--ghost fw-btn--sm" disabled={actionDisabled} onClick={() => unequipSlot(equippedWeapon)}>
                  Unequip
                </button>
              ) : null}
            </article>

            <article className="fw-inventory-slot">
              <p className="fw-caption">Off-hand</p>
              <strong className="fw-body-sm">{equippedShield ? equippedShield.name : 'Open'}</strong>
              <span className="fw-caption">{equippedShield?.armor ? `+${equippedShield.armor.baseAC - 10} AC` : 'No shield'}</span>
              {equippedShield ? (
                <button type="button" className="fw-btn fw-btn--ghost fw-btn--sm" disabled={actionDisabled} onClick={() => unequipSlot(equippedShield)}>
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
              <Tooltip label="Armor Class">AC</Tooltip>: <strong>{computedAc}</strong>
            </p>
            <p className="fw-body-sm">
              Weapon damage:{' '}
              <strong>
                {equippedWeapon?.weapon
                  ? `${equippedWeapon.weapon.damageDice} ${equippedWeapon.weapon.damageType}`
                  : 'Unarmed strike'}
              </strong>
            </p>
          </div>
        </div>
      ) : null}

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
                    <p className="fw-caption">{item.category} / qty {item.quantity}</p>
                    <div className="fw-inventory-item__actions">
                      <button type="button" className="fw-btn fw-btn--ghost fw-btn--sm" disabled={actionDisabled} onClick={() => toggleEquip(item)}>
                        {item.equipped ? 'Unequip' : 'Equip'}
                      </button>
                      {item.attunement ? (
                        <button
                          type="button"
                          className={`fw-btn fw-btn--sm ${item.attuned ? 'fw-btn--arcane' : 'fw-btn--ghost'}`}
                          disabled={actionDisabled || (!item.attuned && attunedCount >= 3)}
                          title={!item.attuned && attunedCount >= 3 ? 'Max 3 attuned items' : undefined}
                          onClick={() => toggleAttune(item)}
                        >
                          <Zap size={12} aria-hidden="true" />
                          {item.attuned ? 'Unattuned' : 'Attune'}
                        </button>
                      ) : null}
                      {canConsume(item) ? (
                        <button type="button" className="fw-btn fw-btn--ghost fw-btn--sm" disabled={actionDisabled} onClick={() => consumeBackpackItem(item)}>
                          Consume
                        </button>
                      ) : null}
                      <button type="button" className="fw-btn fw-btn--ghost fw-btn--sm" disabled={actionDisabled} onClick={() => changeQuantity(item, -1)}>
                        -
                      </button>
                      <button type="button" className="fw-btn fw-btn--ghost fw-btn--sm" disabled={actionDisabled} onClick={() => changeQuantity(item, 1)}>
                        +
                      </button>
                      <button type="button" className="fw-btn fw-btn--danger fw-btn--sm" disabled={actionDisabled} onClick={() => removeBackpackItem(item)}>
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
                  disabled={actionDisabled}
                  onChange={(event) => updateCurrency(coin, event.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="fw-inventory-currency__convert">
            <button type="button" className="fw-btn fw-btn--ghost fw-btn--sm" disabled={actionDisabled} onClick={() => quickConvert('pp', 'gp')}>
              PP-&gt;GP
            </button>
            <button type="button" className="fw-btn fw-btn--ghost fw-btn--sm" disabled={actionDisabled} onClick={() => quickConvert('gp', 'sp')}>
              GP-&gt;SP
            </button>
            <button type="button" className="fw-btn fw-btn--ghost fw-btn--sm" disabled={actionDisabled} onClick={() => quickConvert('sp', 'cp')}>
              SP-&gt;CP
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
                  disabled={actionDisabled}
                  onChange={(event) => setConvertAmount(Math.max(1, Math.trunc(Number(event.target.value) || 1)))}
                />
              </div>
              <div className="fw-field" style={{ flex: '1 1 80px', minWidth: 80 }}>
                <label className="fw-field__label">From</label>
                <select
                  className="fw-select"
                  value={convertFrom}
                  disabled={actionDisabled}
                  onChange={(event) => setConvertFrom(event.target.value as CurrencyKey)}
                >
                  {CURRENCY_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {key.toUpperCase()} - {CURRENCY_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fw-field" style={{ flex: '1 1 80px', minWidth: 80 }}>
                <label className="fw-field__label">To</label>
                <select
                  className="fw-select"
                  value={convertTo}
                  disabled={actionDisabled}
                  onChange={(event) => setConvertTo(event.target.value as CurrencyKey)}
                >
                  {CURRENCY_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {key.toUpperCase()} - {CURRENCY_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="fw-btn fw-btn--primary fw-btn--sm"
                disabled={actionDisabled || convertFrom === convertTo || convertAmount <= 0 || inventory.currency[convertFrom] < convertAmount}
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
