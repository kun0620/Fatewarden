import { getRaceData } from '../../data/races';
import type { AbilityKey, Character } from '../../types';

export type RacialTraitType =
  | 'darkvision'
  | 'resistance'
  | 'advantage'
  | 'proficiency'
  | 'movement'
  | 'innate_ability';

export type RacialTrait = {
  id: string;
  name: string;
  type: RacialTraitType;
  description: string;
  passive: boolean;
  usesPerRest?: 'short' | 'long';
  maxUses?: (level: number) => number;
  data?: Record<string, unknown>;
};

export type ResistanceState = {
  damageType: string;
  sources: string[];
};

export type PassiveRaceEffect = {
  darkvision: number;
  resistances: ResistanceState[];
  advantageTags: string[];
  disadvantageTags: string[];
  proficiencies: string[];
  movementBonus: number;
  movementMultiplier: number;
  innateAbilities: Array<{
    id: string;
    label: string;
    usesRemaining?: number | null;
    usesPerRest?: 'short' | 'long';
  }>;
};

type TraitCatalog = Record<string, RacialTrait[]>;

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

const raceTraitCatalog: TraitCatalog = {
  dwarf: [
    {
      id: 'dwarven-resilience',
      name: 'Dwarven Resilience',
      type: 'resistance',
      passive: true,
      description: 'Advantage on saves against poison, and resistance against poison damage.',
      data: { damageType: 'poison', advantageTag: 'save:poison' },
    },
  ],
  'hill-dwarf': [
    {
      id: 'dwarven-toughness',
      name: 'Dwarven Toughness',
      type: 'innate_ability',
      passive: true,
      description: 'Hit point maximum increases by 1 per level.',
      data: { hpBonusPerLevel: 1 },
    },
  ],
  'wood-elf': [
    {
      id: 'fleet-of-foot',
      name: 'Fleet of Foot',
      type: 'movement',
      passive: true,
      description: 'Base walking speed increases by 5 feet.',
      data: { movementBonus: 5 },
    },
  ],
  'half-orc': [
    {
      id: 'relentless-endurance',
      name: 'Relentless Endurance',
      type: 'innate_ability',
      passive: false,
      usesPerRest: 'long',
      maxUses: () => 1,
      description: 'Once per long rest, drop to 1 HP instead of 0.',
    },
  ],
  tiefling: [
    {
      id: 'hellish-resistance',
      name: 'Hellish Resistance',
      type: 'resistance',
      passive: true,
      description: 'You have resistance to fire damage.',
      data: { damageType: 'fire' },
    },
  ],
  gnome: [
    {
      id: 'gnome-cunning',
      name: 'Gnome Cunning',
      type: 'advantage',
      passive: true,
      description: 'Advantage on all INT, WIS, and CHA saving throws against magic.',
      data: { advantageTags: ['save:int:magic', 'save:wis:magic', 'save:cha:magic'] },
    },
  ],
  'stout-halfling': [
    {
      id: 'stout-resilience',
      name: 'Stout Resilience',
      type: 'resistance',
      passive: true,
      description: 'Advantage on saves against poison and resistance to poison damage.',
      data: { damageType: 'poison', advantageTag: 'save:poison' },
    },
  ],
};

function getRaceKey(character: Character) {
  const fromRace = getRaceData(character.ancestry)?.id;
  return normalize(fromRace ?? character.ancestry);
}

function getTraitsForRaceKey(raceKey: string): RacialTrait[] {
  const exact = raceTraitCatalog[raceKey] ?? [];
  const baseKey = raceKey.split('-').slice(-1)[0];
  const base = raceTraitCatalog[baseKey] ?? [];
  return [...exact, ...base];
}

function mergeResistances(traits: RacialTrait[]): ResistanceState[] {
  const byDamage = new Map<string, ResistanceState>();
  traits
    .filter((trait) => trait.type === 'resistance')
    .forEach((trait) => {
      const damageType = String(trait.data?.damageType ?? '').trim().toLowerCase();
      if (!damageType) return;
      const existing = byDamage.get(damageType);
      if (!existing) {
        byDamage.set(damageType, { damageType, sources: [trait.name] });
        return;
      }
      byDamage.set(damageType, {
        damageType,
        sources: unique([...existing.sources, trait.name]),
      });
    });
  return Array.from(byDamage.values());
}

export function getRaceTraits(character: Character): RacialTrait[] {
  const raceKey = getRaceKey(character);
  return getTraitsForRaceKey(raceKey);
}

export function getPassiveRaceEffects(character: Character): PassiveRaceEffect {
  const raceData = getRaceData(character.ancestry);
  const traits = getRaceTraits(character);
  const advantageTags = unique(
    traits
      .filter((trait) => trait.type === 'advantage')
      .flatMap((trait) => (trait.data?.advantageTags as string[] | undefined) ?? [])
      .concat(
        traits
          .filter((trait) => trait.type === 'resistance' && typeof trait.data?.advantageTag === 'string')
          .map((trait) => String(trait.data?.advantageTag)),
      ),
  );
  const proficiencies = unique(
    traits
      .filter((trait) => trait.type === 'proficiency')
      .flatMap((trait) => (trait.data?.proficiencies as string[] | undefined) ?? []),
  );
  const movementBonus = traits
    .filter((trait) => trait.type === 'movement')
    .reduce((sum, trait) => sum + Number(trait.data?.movementBonus ?? 0), 0);
  const movementMultipliers = traits
    .filter((trait) => trait.type === 'movement')
    .map((trait) => Number(trait.data?.movementMultiplier ?? 1))
    .filter((value) => Number.isFinite(value) && value > 0);
  const movementMultiplier = movementMultipliers.length
    ? movementMultipliers.reduce((acc, value) => acc * value, 1)
    : 1;

  const innateAbilities = traits
    .filter((trait) => trait.type === 'innate_ability')
    .map((trait) => {
      const maxUses = trait.maxUses?.(character.level) ?? null;
      return {
        id: trait.id,
        label: trait.name,
        usesRemaining: maxUses,
        usesPerRest: trait.usesPerRest,
      };
    });

  return {
    darkvision: raceData?.darkvision ?? 0,
    resistances: mergeResistances(traits),
    advantageTags,
    disadvantageTags: [],
    proficiencies,
    movementBonus,
    movementMultiplier,
    innateAbilities,
  };
}

export function getRaceAbilityBonuses(character: Character): Partial<Record<AbilityKey, number>> {
  return getRaceData(character.ancestry)?.abilityBonuses ?? {};
}
