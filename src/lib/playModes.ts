import type { SessionPlayMode } from '../types';

export type PlayModeDefinition = {
  id: SessionPlayMode;
  label: string;
  shortLabel: string;
  description: string;
};

export const playModes: PlayModeDefinition[] = [
  {
    id: 'dnd',
    label: 'DnD 5e Cockpit',
    shortLabel: 'DnD',
    description: 'Classic DnD table mode with Story Log, character sheet, dice, and combat tools.',
  },
  {
    id: 'hexplore',
    label: 'HEXplore It Mode',
    shortLabel: 'HEXplore',
    description: 'Expedition and hexcrawl mode for travel turns, events, resources, and threat clocks.',
  },
];

export function normalizePlayMode(value: unknown): SessionPlayMode {
  return playModes.some((mode) => mode.id === value) ? (value as SessionPlayMode) : 'dnd';
}

export function getPlayModeDefinition(value: unknown): PlayModeDefinition {
  return playModes.find((mode) => mode.id === normalizePlayMode(value)) ?? playModes[0];
}
