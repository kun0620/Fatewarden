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
    label: 'Classic D&D',
    shortLabel: 'D&D',
    description: 'Classic table with combat, dice, character sheet',
  },
  {
    id: 'story',
    label: 'Story Mode',
    shortLabel: 'Story',
    description: 'Narrative-first, no combat tracker',
  },
  {
    id: 'ai_dm',
    label: 'AI DM Mode',
    shortLabel: 'AI DM',
    description: 'AI auto-narrates scenes & encounters',
  },
  {
    id: 'hexplore',
    label: 'HEXplore Mode',
    shortLabel: 'HEX',
    description: 'Expedition / hexcrawl travel & threat clocks',
  },
];

export function normalizePlayMode(value: unknown): SessionPlayMode {
  return playModes.some((mode) => mode.id === value) ? (value as SessionPlayMode) : 'dnd';
}

export function getPlayModeDefinition(value: unknown): PlayModeDefinition {
  return playModes.find((mode) => mode.id === normalizePlayMode(value)) ?? playModes[0];
}

export function playModeHidesCombat(mode: SessionPlayMode): boolean {
  return mode === 'story';
}

export function playModeAutoNarrates(mode: SessionPlayMode): boolean {
  return mode === 'ai_dm';
}
