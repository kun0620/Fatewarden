import type { Character, Item } from '../../../types';
import {
  addItem,
  convertCurrency,
  equipItem,
  removeItem,
  unequipItem,
  updateQuantity,
} from '../../inventory/inventoryEngine';
import type {
  AddItemEvent,
  ConsumeItemEvent,
  EquipItemEvent,
  GiveItemEvent,
  RemoveItemEvent,
  UnequipItemEvent,
  UpdateCurrencyEvent,
  UpdateQuantityEvent,
} from '../types';

export type InventoryEventResult = {
  character: Character;
  applied: boolean;
  error?: string;
};

function normalizeLegacyItem(event: GiveItemEvent): Item {
  return {
    id: event.item.id,
    templateId: undefined,
    name: event.item.name,
    description: '',
    category: event.item.category,
    rarity: 'common',
    weight: event.item.weight,
    value: 0,
    quantity: Math.max(1, Math.trunc(event.item.quantity || 1)),
    equipped: false,
    attunement: false,
    attuned: false,
    effects: [],
  };
}

export function processAddItem(character: Character, event: AddItemEvent): InventoryEventResult {
  return {
    character: {
      ...character,
      inventory: addItem(character.inventory, event.item),
    },
    applied: true,
  };
}

export function processGiveItem(character: Character, event: GiveItemEvent): InventoryEventResult {
  return {
    character: {
      ...character,
      inventory: addItem(character.inventory, normalizeLegacyItem(event)),
    },
    applied: true,
  };
}

export function processRemoveItem(character: Character, event: RemoveItemEvent): InventoryEventResult {
  if (typeof event.quantity === 'number' && event.quantity > 0) {
    return {
      character: {
        ...character,
        inventory: updateQuantity(character.inventory, event.itemId, -event.quantity),
      },
      applied: true,
    };
  }

  return {
    character: {
      ...character,
      inventory: removeItem(character.inventory, event.itemId),
    },
    applied: true,
  };
}

export function processConsumeItem(character: Character, event: ConsumeItemEvent): InventoryEventResult {
  return {
    character: {
      ...character,
      inventory: updateQuantity(character.inventory, event.itemId, -(event.quantity ?? 1)),
    },
    applied: true,
  };
}

export function processEquipItem(character: Character, event: EquipItemEvent): InventoryEventResult {
  return {
    character: {
      ...character,
      inventory: equipItem(character.inventory, event.itemId),
    },
    applied: true,
  };
}

export function processUnequipItem(character: Character, event: UnequipItemEvent): InventoryEventResult {
  const itemId = event.itemId;
  if (!itemId) {
    return {
      character,
      applied: false,
      error: 'unequip_item requires itemId',
    };
  }

  return {
    character: {
      ...character,
      inventory: unequipItem(character.inventory, itemId),
    },
    applied: true,
  };
}

export function processUpdateCurrency(character: Character, event: UpdateCurrencyEvent): InventoryEventResult {
  if (event.from === event.to) {
    return {
      character: {
        ...character,
        inventory: {
          ...character.inventory,
          currency: {
            ...character.inventory.currency,
            [event.to]: Math.max(0, Math.trunc(event.amount)),
          },
        },
      },
      applied: true,
    };
  }

  return {
    character: {
      ...character,
      inventory: convertCurrency(character.inventory, event.from, event.to, event.amount),
    },
    applied: true,
  };
}

export function processUpdateQuantity(character: Character, event: UpdateQuantityEvent): InventoryEventResult {
  return {
    character: {
      ...character,
      inventory: updateQuantity(character.inventory, event.itemId, event.delta),
    },
    applied: true,
  };
}
