import { getAllTraits, getRaceById, getSubraceById } from '../../data/races';
import type { CombatParticipant } from '../combat/combatTypes';

export type RaceRecoveryType = 'short' | 'long' | 'special';

export type RaceResource = {
  id: string;
  name: string;
  current: number;
  max: number;
  recoveryType: RaceRecoveryType;
};

export type RacialSpellRuntime = {
  id: string;
  name: string;
  unlocksAtLevel: number;
  maxUsesPerDay: number | null;
  usedToday: number;
};

export type RaceRuntime = {
  raceId: string;
  subraceId?: string;
  level: number;
  speed: number;
  darkvision: number;
  resistances: string[];
  traits: string[];
  resources: RaceResource[];
  racialSpells: RacialSpellRuntime[];
};

function clampLevel(level: number) {
  if (!Number.isFinite(level)) return 1;
  return Math.max(1, Math.min(20, Math.trunc(level)));
}

function normalizeId(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function extractResistances(raceId: string) {
  if (raceId === 'tiefling') return ['fire'];
  if (raceId === 'dragonborn') return ['draconic_ancestry'];
  if (raceId === 'dwarf' || raceId === 'halfling') return ['poison'];
  return [];
}

function buildRaceResources(raceId: string): RaceResource[] {
  if (raceId === 'half_orc') {
    return [{
      id: 'relentless_endurance',
      name: 'Relentless Endurance',
      current: 1,
      max: 1,
      recoveryType: 'long',
    }];
  }

  if (raceId === 'dragonborn') {
    return [{
      id: 'breath_weapon',
      name: 'Breath Weapon',
      current: 1,
      max: 1,
      recoveryType: 'short',
    }];
  }

  return [];
}

function buildRacialSpells(raceId: string, subraceId?: string): RacialSpellRuntime[] {
  if (raceId === 'tiefling') {
    return [
      { id: 'thaumaturgy', name: 'Thaumaturgy', unlocksAtLevel: 1, maxUsesPerDay: null, usedToday: 0 },
      { id: 'hellish_rebuke', name: 'Hellish Rebuke', unlocksAtLevel: 3, maxUsesPerDay: 1, usedToday: 0 },
      { id: 'darkness', name: 'Darkness', unlocksAtLevel: 5, maxUsesPerDay: 1, usedToday: 0 },
    ];
  }

  if (raceId === 'elf' && subraceId === 'dark_elf') {
    return [
      { id: 'dancing_lights', name: 'Dancing Lights', unlocksAtLevel: 1, maxUsesPerDay: null, usedToday: 0 },
      { id: 'faerie_fire', name: 'Faerie Fire', unlocksAtLevel: 3, maxUsesPerDay: 1, usedToday: 0 },
      { id: 'darkness', name: 'Darkness', unlocksAtLevel: 5, maxUsesPerDay: 1, usedToday: 0 },
    ];
  }

  if (raceId === 'gnome' && subraceId === 'forest_gnome') {
    return [
      { id: 'minor_illusion', name: 'Minor Illusion', unlocksAtLevel: 1, maxUsesPerDay: null, usedToday: 0 },
    ];
  }

  if (raceId === 'elf' && subraceId === 'high_elf') {
    return [
      { id: 'wizard_cantrip_choice', name: 'Wizard Cantrip (choice)', unlocksAtLevel: 1, maxUsesPerDay: null, usedToday: 0 },
    ];
  }

  return [];
}

export function buildRaceRuntime(raceId: string, subraceId: string | undefined, level: number): RaceRuntime {
  const normalizedRaceId = normalizeId(raceId);
  const normalizedSubraceId = subraceId ? normalizeId(subraceId) : undefined;
  const race = getRaceById(normalizedRaceId);
  const subrace = normalizedSubraceId ? getSubraceById(normalizedRaceId, normalizedSubraceId) : undefined;
  const safeLevel = clampLevel(level);
  const raceTraits = getAllTraits(normalizedRaceId, normalizedSubraceId).map((trait) => trait.name);
  const subraceHasSuperiorDarkvision = Boolean(
    subrace?.traits.some((trait) => trait.name.toLowerCase().includes('superior darkvision')),
  );
  const darkvision = subraceHasSuperiorDarkvision
    ? Math.max(120, race?.darkvision ?? 0)
    : (race?.darkvision ?? 0);

  return {
    raceId: normalizedRaceId,
    subraceId: normalizedSubraceId,
    level: safeLevel,
    speed: race?.speed ?? 30,
    darkvision,
    resistances: unique(extractResistances(normalizedRaceId)),
    traits: unique(raceTraits),
    resources: buildRaceResources(normalizedRaceId),
    racialSpells: buildRacialSpells(normalizedRaceId, normalizedSubraceId),
  };
}

export function applyRacialTraitsToParticipant(
  participant: CombatParticipant,
  raceRuntime: RaceRuntime,
): CombatParticipant {
  return {
    ...participant,
    speed: raceRuntime.speed,
    resistances: raceRuntime.resistances,
  };
}

export function useRacialSpell(raceRuntime: RaceRuntime, spellId: string): RaceRuntime | null {
  const normalizedSpellId = normalizeId(spellId);
  const spell = raceRuntime.racialSpells.find((entry) => normalizeId(entry.id) === normalizedSpellId);
  if (!spell) return null;
  if (raceRuntime.level < spell.unlocksAtLevel) return null;
  if (spell.maxUsesPerDay !== null && spell.usedToday >= spell.maxUsesPerDay) return null;

  return {
    ...raceRuntime,
    racialSpells: raceRuntime.racialSpells.map((entry) => {
      if (normalizeId(entry.id) !== normalizedSpellId) return entry;
      if (entry.maxUsesPerDay === null) return entry;
      return { ...entry, usedToday: entry.usedToday + 1 };
    }),
  };
}

export function resetRacialSpells(raceRuntime: RaceRuntime): RaceRuntime {
  return {
    ...raceRuntime,
    racialSpells: raceRuntime.racialSpells.map((entry) => ({ ...entry, usedToday: 0 })),
  };
}
