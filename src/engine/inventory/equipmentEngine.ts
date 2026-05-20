import type { Character } from '../../types';
import { getInventoryState, hasItem, type InventoryItem } from './inventoryEngine';

export type EquipmentSlot =
  | 'head'
  | 'hands'
  | 'armor'
  | 'main_hand'
  | 'off_hand'
  | 'two_handed'
  | 'ring_1'
  | 'ring_2'
  | 'amulet'
  | 'cloak'
  | 'belt';

export type EquippedEntry = {
  slot: EquipmentSlot;
  itemId: string;
  attuned?: boolean;
};

export type EquipmentState = {
  equipped: EquippedEntry[];
  attunementLimit: number;
};

type EquipmentRuntimeSystemData = Character['systemData'] & {
  inventoryRuntime?: {
    equipment?: EquipmentState;
  };
};

const SLOT_CONFLICTS: Record<EquipmentSlot, EquipmentSlot[]> = {
  head: [],
  hands: [],
  armor: [],
  main_hand: ['two_handed'],
  off_hand: ['two_handed'],
  two_handed: ['main_hand', 'off_hand'],
  ring_1: [],
  ring_2: [],
  amulet: [],
  cloak: [],
  belt: [],
};

function normalizeId(value: string) {
  return value.trim().toLowerCase();
}

function getEquipmentState(character: Character): EquipmentState {
  const systemData = (character.systemData ?? {}) as EquipmentRuntimeSystemData;
  return systemData.inventoryRuntime?.equipment ?? {
    equipped: [],
    attunementLimit: 3,
  };
}

function writeEquipmentState(character: Character, state: EquipmentState): Character {
  const systemData = (character.systemData ?? {}) as EquipmentRuntimeSystemData;
  return {
    ...character,
    systemData: {
      ...systemData,
      inventoryRuntime: {
        ...(systemData.inventoryRuntime ?? {}),
        equipment: {
          equipped: state.equipped.map((entry) => ({
            ...entry,
            itemId: normalizeId(entry.itemId),
          })),
          attunementLimit: Math.max(0, Math.trunc(state.attunementLimit || 0)),
        },
      },
    },
  };
}

function findInventoryItem(character: Character, itemId: string): InventoryItem | undefined {
  const id = normalizeId(itemId);
  return getInventoryState(character).items.find((item) => item.id === id);
}

function itemSupportsSlot(item: InventoryItem, slot: EquipmentSlot) {
  if (slot === 'armor') return item.category === 'armor';
  if (slot === 'off_hand') return item.category === 'weapon' || item.category === 'shield';
  if (slot === 'main_hand' || slot === 'two_handed') return item.category === 'weapon';
  if (slot === 'head' || slot === 'hands') return item.category === 'armor' || item.category === 'gear';
  if (slot === 'ring_1' || slot === 'ring_2' || slot === 'amulet' || slot === 'cloak' || slot === 'belt') {
    return true;
  }
  return false;
}

export function getEquippedItems(character: Character) {
  return getEquipmentState(character).equipped;
}

export function validateEquipment(character: Character): { valid: boolean; reasons: string[] } {
  const equipment = getEquipmentState(character);
  const reasons: string[] = [];
  const seenSlots = new Set<EquipmentSlot>();
  const attunedCount = equipment.equipped.filter((entry) => entry.attuned).length;

  if (attunedCount > equipment.attunementLimit) {
    reasons.push('Attunement limit exceeded.');
  }

  equipment.equipped.forEach((entry) => {
    if (seenSlots.has(entry.slot)) {
      reasons.push(`Duplicate slot: ${entry.slot}`);
    }
    seenSlots.add(entry.slot);
    if (!hasItem(character, entry.itemId)) {
      reasons.push(`Missing item in inventory: ${entry.itemId}`);
    }

    const item = findInventoryItem(character, entry.itemId);
    if (!item) return;
    if (!itemSupportsSlot(item, entry.slot)) {
      reasons.push(`Item ${item.name} cannot be equipped to ${entry.slot}`);
    }
  });

  return { valid: reasons.length === 0, reasons };
}

export function equipItem(character: Character, itemId: string, slot: EquipmentSlot, attuned = false): Character {
  const id = normalizeId(itemId);
  if (!hasItem(character, id)) return character;
  const item = findInventoryItem(character, id);
  if (!item || !itemSupportsSlot(item, slot)) return character;

  const state = getEquipmentState(character);
  const filtered = state.equipped.filter((entry) => (
    entry.slot !== slot
    && !SLOT_CONFLICTS[slot].includes(entry.slot)
  ));

  return writeEquipmentState(character, {
    ...state,
    equipped: [...filtered, { slot, itemId: id, attuned }],
  });
}

export function unequipItem(character: Character, slot: EquipmentSlot): Character {
  const state = getEquipmentState(character);
  return writeEquipmentState(character, {
    ...state,
    equipped: state.equipped.filter((entry) => entry.slot !== slot),
  });
}
