import type { Inventory, Item } from '../types';

type CurrencyKey = keyof Inventory['currency'];

export function createEmptyInventory(maxCarryWeight = 150): Inventory {
  return {
    items: [],
    maxCarryWeight,
    currency: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
  };
}

function toItemName(templateId: string) {
  return templateId
    .split('-')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}

export function inventoryFromNames(names: string[], maxCarryWeight = 150): Inventory {
  const items: Item[] = names
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({
      id: crypto.randomUUID(),
      templateId: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name,
      description: '',
      category: 'misc',
      rarity: 'common',
      weight: 0,
      value: 0,
      quantity: 1,
      equipped: false,
      attunement: false,
      attuned: false,
      effects: [],
    }));

  return {
    ...createEmptyInventory(maxCarryWeight),
    items,
  };
}

export function inventoryToNames(inventory: Inventory | null | undefined): string[] {
  if (!inventory) return [];
  return inventory.items
    .map((item) => item.name?.trim() || (item.templateId ? toItemName(item.templateId) : 'Item'))
    .filter(Boolean);
}

function abilityModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

function isArmorItem(item: Item) {
  return Boolean(item.armor && item.armor.type !== 'shield');
}

function isShieldItem(item: Item) {
  return item.armor?.type === 'shield' || item.category === 'shield';
}

function isWeaponItem(item: Item) {
  return Boolean(item.weapon) || item.category === 'weapon';
}

function isTwoHandedWeapon(item: Item) {
  return Boolean(item.weapon?.properties.includes('two_handed'));
}

export function calcCarryWeight(inventory: Inventory): number {
  return inventory.items.reduce((sum, item) => sum + item.weight * Math.max(0, item.quantity), 0);
}

export function isEncumbered(inventory: Inventory, strScore: number): boolean {
  const carryLimit = Math.max(1, strScore) * 15;
  return calcCarryWeight(inventory) > carryLimit;
}

export function calcACFromInventory(inventory: Inventory, dexScore: number): number {
  const dexMod = abilityModifier(dexScore);
  const equippedArmor = inventory.items.find((item) => item.equipped && isArmorItem(item));
  const equippedShields = inventory.items.filter((item) => item.equipped && isShieldItem(item));

  let baseAc = 10 + dexMod;
  if (equippedArmor?.armor) {
    const maxDex = equippedArmor.armor.maxDexBonus;
    const dexPart = typeof maxDex === 'number' ? Math.min(dexMod, maxDex) : dexMod;
    baseAc = equippedArmor.armor.baseAC + dexPart;
  }

  const shieldBonus = equippedShields.reduce((sum, shield) => sum + (shield.armor?.baseAC ?? 2), 0);

  return Math.max(1, baseAc + shieldBonus);
}

export function addItem(inventory: Inventory, item: Item): Inventory {
  const existing = inventory.items.find(
    (current) => Boolean(item.templateId) && current.templateId === item.templateId && !current.equipped && !item.equipped,
  );

  if (existing && existing.templateId && existing.category === item.category) {
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

export function removeItem(inventory: Inventory, itemId: string): Inventory {
  return {
    ...inventory,
    items: inventory.items.filter((item) => item.id !== itemId),
  };
}

export function equipItem(inventory: Inventory, itemId: string): Inventory {
  const target = inventory.items.find((item) => item.id === itemId);
  if (!target) return inventory;

  const next = inventory.items.map((item) => ({ ...item }));
  const targetIndex = next.findIndex((item) => item.id === itemId);
  if (targetIndex < 0) return inventory;

  if (isArmorItem(target)) {
    for (let i = 0; i < next.length; i += 1) {
      if (i !== targetIndex && isArmorItem(next[i])) {
        next[i].equipped = false;
      }
    }
  }

  if (isShieldItem(target)) {
    for (let i = 0; i < next.length; i += 1) {
      if (i !== targetIndex && isWeaponItem(next[i]) && next[i].equipped && isTwoHandedWeapon(next[i])) {
        next[i].equipped = false;
      }
    }
  }

  if (isWeaponItem(target)) {
    for (let i = 0; i < next.length; i += 1) {
      if (i !== targetIndex && isWeaponItem(next[i])) {
        next[i].equipped = false;
      }
    }

    if (isTwoHandedWeapon(target)) {
      for (let i = 0; i < next.length; i += 1) {
        if (i !== targetIndex && isShieldItem(next[i])) {
          next[i].equipped = false;
        }
      }
    }
  }

  next[targetIndex].equipped = true;

  return {
    ...inventory,
    items: next,
  };
}

export function unequipItem(inventory: Inventory, itemId: string): Inventory {
  return {
    ...inventory,
    items: inventory.items.map((item) => (item.id === itemId ? { ...item, equipped: false } : item)),
  };
}

export function updateQuantity(inventory: Inventory, itemId: string, delta: number): Inventory {
  const target = inventory.items.find((item) => item.id === itemId);
  if (!target) return inventory;

  const nextQuantity = Math.max(0, target.quantity + Math.trunc(delta));
  if (nextQuantity <= 0) {
    return removeItem(inventory, itemId);
  }

  return {
    ...inventory,
    items: inventory.items.map((item) => (item.id === itemId ? { ...item, quantity: nextQuantity } : item)),
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

  const fromValueCp = cpPerCoin[from] * value;
  const toCount = Math.floor(fromValueCp / cpPerCoin[to]);
  if (toCount <= 0) return inventory;

  return {
    ...inventory,
    currency: {
      ...inventory.currency,
      [from]: inventory.currency[from] - value,
      [to]: inventory.currency[to] + toCount,
    },
  };
}
