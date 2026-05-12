import type { Character } from '../../../types';
import { buildRaceRuntime, resetRacialSpells, useRacialSpell } from '../../races/raceRuntime';
import type { ResetRacialSpellsEvent, UseRacialSpellEvent } from '../types';

export type RaceEventResult = {
  character: Character;
  applied: boolean;
  error?: string;
};

function normalizeId(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
}

function resolveSubraceId(character: Character) {
  const ancestry = normalizeId(character.ancestry);
  if (ancestry.includes('high_elf')) return 'high_elf';
  if (ancestry.includes('dark_elf') || ancestry.includes('drow')) return 'dark_elf';
  if (ancestry.includes('wood_elf')) return 'wood_elf';
  if (ancestry.includes('forest_gnome')) return 'forest_gnome';
  if (ancestry.includes('rock_gnome')) return 'rock_gnome';
  if (ancestry.includes('hill_dwarf')) return 'hill_dwarf';
  if (ancestry.includes('mountain_dwarf')) return 'mountain_dwarf';
  if (ancestry.includes('lightfoot')) return 'lightfoot';
  if (ancestry.includes('stout')) return 'stout';
  return undefined;
}

function resolveRaceId(character: Character) {
  const ancestry = normalizeId(character.ancestry);
  if (ancestry.includes('dwarf')) return 'dwarf';
  if (ancestry.includes('elf') || ancestry.includes('drow')) return 'elf';
  if (ancestry.includes('halfling')) return 'halfling';
  if (ancestry.includes('dragonborn')) return 'dragonborn';
  if (ancestry.includes('gnome')) return 'gnome';
  if (ancestry.includes('half_elf')) return 'half_elf';
  if (ancestry.includes('half_orc')) return 'half_orc';
  if (ancestry.includes('tiefling')) return 'tiefling';
  if (ancestry.includes('human')) return 'human';
  return ancestry;
}

function getRaceRuntimeFromCharacter(character: Character) {
  const cached = character.systemData.raceRuntime as ReturnType<typeof buildRaceRuntime> | undefined;
  if (cached) return cached;
  return buildRaceRuntime(resolveRaceId(character), resolveSubraceId(character), character.level);
}

export function processUseRacialSpell(character: Character, event: UseRacialSpellEvent): RaceEventResult {
  const runtime = getRaceRuntimeFromCharacter(character);
  const updatedRuntime = useRacialSpell(runtime, event.spellId);
  if (!updatedRuntime) {
    return {
      character,
      applied: false,
      error: `Unable to use racial spell: ${event.spellId}`,
    };
  }

  return {
    character: {
      ...character,
      systemData: {
        ...character.systemData,
        raceRuntime: updatedRuntime,
      },
    },
    applied: true,
  };
}

export function processResetRacialSpells(character: Character, _event: ResetRacialSpellsEvent): RaceEventResult {
  const runtime = getRaceRuntimeFromCharacter(character);
  const updatedRuntime = resetRacialSpells(runtime);
  return {
    character: {
      ...character,
      systemData: {
        ...character.systemData,
        raceRuntime: updatedRuntime,
      },
    },
    applied: true,
  };
}
