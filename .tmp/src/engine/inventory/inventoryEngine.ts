import type { Character, Inventory, Item } from '../../types';
import type { CombatParticipant } from '../combat/combatTypes';

type CurrencyKey = keyof Inventory['currency'];
export type InventoryItem = {
  id: string;
  name: string;
  category: Item['category'];
  quantity: number;
  weight: number;
  description?: string;
  rarity?: Item['rarity'];
  value?: number;
  equipped?: boolean;
  attunement?: boolean;
  attuned?: boolean;
  templateId?: string;
  weapon?: Item['weapon'];
  armor?: Item['armor'];
  effects?: Item['effects'];
  stackable?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function isArmor(item: Item): boolean {
  return Boolean(item.armor && item.armor.type !== 'shield');
}

function isShield(item: Item): boolean {
  return item.armor?.type === 'shield' || item.category === 'shield';
}

function isWeapon(item: Item): boolean {
  return Boolean(item.weapon) || item.category === 'weapon';
}

function isTwoHandedWeapon(item: Item): boolean {
  return Boolean(item.weapon?.properties.includes('two_handed'));
}

function isCharacter(value: Character | Inventory): value is Character {
  return typeof (value as Character).id === 'string' && typeof (value as Character).className === 'string';
}

function toInventoryItem(item: InventoryItem): Item {
  const value = typeof item.value === 'number' && Number.isFinite(item.value) ? item.value : 0;
  return {
    id: item.id,
    templateId: item.templateId,
    name: item.name,
    description: item.description ?? '',
    category: item.category,
    rarity: item.rarity ?? 'common',
    weight: Number.isFinite(item.weight) ? item.weight : 0,
    value,
    quantity: Math.max(1, Math.trunc(item.quantity || 1)),
    equipped: Boolean(item.equipped),
    attunement: Boolean(item.attunement),
    attuned: Boolean(item.attuned),
    weapon: item.weapon,
    armor: item.armor,
    effects: item.effects,
  };
}

function getAcEffectBonus(item: Item): number {
  if (!item.equipped || !item.effects?.length) return 0;
  return item.effects.reduce((sum, effect) => {
    if (effect.type !== 'bonus') return sum;
    const target = (effect.target ?? '').toLowerCase();
    if (target === 'ac' || target === 'armor_class' || target === 'armorclass') {
      return sum + effect.value;
    }
    return sum;
  }, 0);
}

export function calcCarryWeight(inventory: Inventory): number {
  return inventory.items.reduce((sum, item) => sum + item.weight * Math.max(0, item.quantity), 0);
}

export function isEncumbered(inventory: Inventory, strScore: number): boolean {
  return calcCarryWeight(inventory) > Math.max(1, strScore) * 15;
}

export function calcACFromInventory(inventory: Inventory, dexScore: number): number {
  const dexMod = getAbilityModifier(dexScore);
  const equippedArmor = inventory.items.find((item) => item.equipped && isArmor(item));
  const equippedShields = inventory.items.filter((item) => item.equipped && isShield(item));
  const equippedItems = inventory.items.filter((item) => item.equipped);

  let armorClass = 10 + dexMod;
  if (equippedArmor?.armor) {
    const maxDexBonus = equippedArmor.armor.maxDexBonus;
    const dexPart = typeof maxDexBonus === 'number' ? Math.min(dexMod, maxDexBonus) : dexMod;
    armorClass = equippedArmor.armor.baseAC + dexPart;
  }

  const shieldBonus = equippedShields.reduce((sum, shield) => sum + (shield.armor?.baseAC ?? 2), 0);
  const magicBonus = equippedItems.reduce((sum, item) => sum + getAcEffectBonus(item), 0);
  return Math.max(1, armorClass + shieldBonus + magicBonus);
}

function addInventoryItem(inventory: Inventory, item: Item): Inventory {
  const existing = inventory.items.find(
    (current) => Boolean(item.templateId) && current.templateId === item.templateId && !current.equipped && !item.equipped,
  );

  if (existing && existing.category === item.category) {
    return {
      ...inventory,
      items: inventory.items.map((current) =>
        current.id === existing.id
          ? { ...current, quantity: Math.max(0, current.quantity) + Math.max(1, item.quantity || 1) }
          : current,
      ),
    };
  }

  return {
    ...inventory,
    items: [...inventory.items, { ...item, quantity: Math.max(1, item.quantity || 1) }],
  };
}

function removeInventoryItem(inventory: Inventory, itemId: string): Inventory {
  return {
    ...inventory,
    items: inventory.items.filter((item) => item.id !== itemId),
  };
}

export function getInventoryState(character: Character): Inventory {
  return character.inventory;
}

export function hasItem(character: Character, itemId: string, quantity = 1): boolean {
  const item = character.inventory.items.find((entry) => entry.id === itemId);
  return Boolean(item && item.quantity >= Math.max(1, Math.trunc(quantity)));
}

export function addItem(inventory: Inventory, item: Item): Inventory;
export function addItem(character: Character, item: InventoryItem): Character;
export function addItem(target: Inventory | Character, item: Item | InventoryItem): Inventory | Character {
  if (isCharacter(target)) {
    return {
      ...target,
      inventory: addInventoryItem(target.inventory, toInventoryItem(item as InventoryItem)),
    };
  }
  return addInventoryItem(target, item as Item);
}

export function removeItem(inventory: Inventory, itemId: string): Inventory;
export function removeItem(character: Character, itemId: string, quantity?: number): Character;
export function removeItem(target: Inventory | Character, itemId: string, quantity = 1): Inventory | Character {
  if (isCharacter(target)) {
    const item = target.inventory.items.find((entry) => entry.id === itemId);
    if (!item) return target;
    const nextQuantity = Math.max(0, item.quantity - Math.max(1, Math.trunc(quantity)));
    const nextInventory = nextQuantity <= 0
      ? removeInventoryItem(target.inventory, itemId)
      : {
          ...target.inventory,
          items: target.inventory.items.map((entry) => (entry.id === itemId ? { ...entry, quantity: nextQuantity } : entry)),
        };
    return { ...target, inventory: nextInventory };
  }
  return removeInventoryItem(target, itemId);
}

export function equipItem(inventory: Inventory, itemId: string): Inventory {
  const target = inventory.items.find((item) => item.id === itemId);
  if (!target) return inventory;

  const items = inventory.items.map((item) => ({ ...item }));
  const targetIndex = items.findIndex((item) => item.id === itemId);
  if (targetIndex < 0) return inventory;

  if (isArmor(target)) {
    for (let i = 0; i < items.length; i += 1) {
      if (i !== targetIndex && isArmor(items[i])) {
        items[i].equipped = false;
      }
    }
  }

  if (isShield(target)) {
    for (let i = 0; i < items.length; i += 1) {
      if (i !== targetIndex && isWeapon(items[i]) && items[i].equipped && isTwoHandedWeapon(items[i])) {
        items[i].equipped = false;
      }
    }
    for (let i = 0; i < items.length; i += 1) {
      if (i !== targetIndex && isShield(items[i])) {
        items[i].equipped = false;
      }
    }
  }

  if (isWeapon(target)) {
    if (isTwoHandedWeapon(target)) {
      for (let i = 0; i < items.length; i += 1) {
        if (i !== targetIndex && (isWeapon(items[i]) || isShield(items[i]))) {
          items[i].equipped = false;
        }
      }
    } else {
      const equippedWeaponIndexes = items
        .map((item, index) => ({ item, index }))
        .filter(({ item, index }) => index !== targetIndex && item.equipped && isWeapon(item))
        .map(({ index }) => index);

      while (equippedWeaponIndexes.length >= 2) {
        const indexToUnequip = equippedWeaponIndexes.shift();
        if (typeof indexToUnequip === 'number') {
          items[indexToUnequip].equipped = false;
        }
      }
    }
  }

  items[targetIndex].equipped = true;
  return { ...inventory, items };
}

export function unequipItem(inventory: Inventory, itemId: string): Inventory {
  return {
    ...inventory,
    items: inventory.items.map((item) => (item.id === itemId ? { ...item, equipped: false } : item)),
  };
}

export function updateQuantity(inventory: Inventory, itemId: string, delta: number): Inventory {
  const item = inventory.items.find((entry) => entry.id === itemId);
  if (!item) return inventory;

  const nextQuantity = Math.max(0, item.quantity + Math.trunc(delta));
  if (nextQuantity <= 0) {
    return removeInventoryItem(inventory, itemId);
  }

  return {
    ...inventory,
    items: inventory.items.map((entry) => (entry.id === itemId ? { ...entry, quantity: nextQuantity } : entry)),
  };
}

const cpPerCoin: Record<CurrencyKey, number> = {
  pp: 1000,
  gp: 100,
  ep: 50,
  sp: 10,
  cp: 1,
};

export function convertCurrency(
  inventory: Inventory,
  from: CurrencyKey,
  to: CurrencyKey,
  amount: number,
): Inventory {
  const value = Math.max(0, Math.trunc(amount));
  if (value <= 0 || from === to) return inventory;
  if (inventory.currency[from] < value) return inventory;

  const totalCp = value * cpPerCoin[from];
  const toAmount = Math.floor(totalCp / cpPerCoin[to]);
  if (toAmount <= 0) return inventory;

  return {
    ...inventory,
    currency: {
      ...inventory.currency,
      [from]: inventory.currency[from] - value,
      [to]: inventory.currency[to] + toAmount,
    },
  };
}

export function rehydrateParticipant(participant: CombatParticipant, character: Character): CombatParticipant {
  const runtimeResistances = (character.systemData.raceRuntime as { resistances?: string[] } | undefined)?.resistances ?? [];
  return {
    ...participant,
    characterId: character.id,
    armorClass: calcACFromInventory(character.inventory, character.abilities.dex),
    conditions: [...character.activeConditions],
    resistances: Array.from(new Set(runtimeResistances)),
  };
}
