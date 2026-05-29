import type { AbilityKey, Character } from '../../types';
import { getEquippedItems } from './equipmentEngine';
import { getInventoryState, type InventoryItem } from './inventoryEngine';

export type ItemEffectKind = 'passive_bonus' | 'active_consumable' | 'temporary_effect' | 'equipment_modifier';

export type ItemEffect = {
  id: string;
  sourceItemId: string;
  kind: ItemEffectKind;
  label: string;
  description: string;
  passive: boolean;
  durationRounds?: number;
  modifiers?: {
    armorClass?: number;
    maxHitPoints?: number;
    speed?: number;
    abilityBonus?: Partial<Record<AbilityKey, number>>;
  };
};

export type ResolvedItemEffects = {
  passive: ItemEffect[];
  activeConsumables: ItemEffect[];
  temporary: ItemEffect[];
  equipment: ItemEffect[];
};

function normalizeId(value: string) {
  return value.trim().toLowerCase();
}

function parseItemEffects(item: InventoryItem): ItemEffect[] {
  const raw = item.metadata?.effects;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => typeof entry === 'object' && entry !== null)
    .map((entry, index) => {
      const effect = entry as Record<string, unknown>;
      const kind = String(effect.kind ?? 'passive_bonus') as ItemEffectKind;
      return {
        id: String(effect.id ?? `${item.id}-fx-${index + 1}`),
        sourceItemId: item.id,
        kind,
        label: String(effect.label ?? item.name),
        description: String(effect.description ?? ''),
        passive: Boolean(effect.passive ?? (kind === 'passive_bonus' || kind === 'equipment_modifier')),
        durationRounds: typeof effect.durationRounds === 'number' ? Math.max(1, Math.trunc(effect.durationRounds)) : undefined,
        modifiers: (effect.modifiers as ItemEffect['modifiers'] | undefined) ?? undefined,
      };
    });
}

export function resolveItemEffects(character: Character): ResolvedItemEffects {
  const inventory = getInventoryState(character).items;
  const equipped = new Set(getEquippedItems(character).map((entry) => normalizeId(entry.itemId)));
  const activeEffects: ItemEffect[] = [];

  inventory.forEach((item) => {
    parseItemEffects(item).forEach((effect) => {
      if (effect.kind === 'equipment_modifier' && !equipped.has(normalizeId(item.id))) return;
      activeEffects.push(effect);
    });
  });

  return {
    passive: activeEffects.filter((effect) => effect.kind === 'passive_bonus'),
    activeConsumables: activeEffects.filter((effect) => effect.kind === 'active_consumable'),
    temporary: activeEffects.filter((effect) => effect.kind === 'temporary_effect'),
    equipment: activeEffects.filter((effect) => effect.kind === 'equipment_modifier'),
  };
}

export function applyPassiveItemBonuses(character: Character): Character {
  const effects = resolveItemEffects(character);
  const bonuses = [...effects.passive, ...effects.equipment]
    .map((effect) => effect.modifiers)
    .filter((value): value is NonNullable<ItemEffect['modifiers']> => Boolean(value));

  const totalAc = bonuses.reduce((sum, modifiers) => sum + (modifiers.armorClass ?? 0), 0);
  const totalMaxHp = bonuses.reduce((sum, modifiers) => sum + (modifiers.maxHitPoints ?? 0), 0);
  const totalSpeed = bonuses.reduce((sum, modifiers) => sum + (modifiers.speed ?? 0), 0);

  return {
    ...character,
    armorClass: Math.max(1, character.armorClass + totalAc),
    maxHitPoints: Math.max(1, character.maxHitPoints + totalMaxHp),
    hitPoints: Math.min(Math.max(1, character.maxHitPoints + totalMaxHp), character.hitPoints),
    speed: Math.max(0, character.speed + totalSpeed),
  };
}
