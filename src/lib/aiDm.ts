import type { AiDmPresetId, AiDmRequestMode } from '../types';

export const AI_CONTEXT_CHAR_BUDGET = 6_000;
export const DEFAULT_AI_DM_PRESET_ID: AiDmPresetId = 'balanced';

export type AiDmPreset = {
  id: AiDmPresetId;
  label: string;
  shortLabel: string;
  systemPrompt: string;
};

export const AI_DM_PRESETS: AiDmPreset[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    shortLabel: 'Balanced',
    systemPrompt:
      'Preset: Balanced Warden. Be dangerous but fair, cinematic but concise. Reward clever play and keep consequences readable.',
  },
  {
    id: 'grim',
    label: 'Grim',
    shortLabel: 'Grim',
    systemPrompt:
      'Preset: Grim Warden. Lean into dread, scarcity, scars, hard choices, and costly victories. Never become hopeless or unfair.',
  },
  {
    id: 'heroic',
    label: 'Heroic',
    shortLabel: 'Heroic',
    systemPrompt:
      'Preset: Heroic Warden. Make threats grand and choices bold. Emphasize courage, momentum, sacrifice, and clear stakes.',
  },
  {
    id: 'mystery',
    label: 'Mystery',
    shortLabel: 'Mystery',
    systemPrompt:
      'Preset: Mystery Warden. Emphasize clues, contradictions, secrets, sensory tells, and layered revelations. Avoid solving the mystery for players.',
  },
];

export function normalizeAiDmPresetId(value: unknown): AiDmPresetId {
  return AI_DM_PRESETS.some((preset) => preset.id === value) ? (value as AiDmPresetId) : DEFAULT_AI_DM_PRESET_ID;
}

export function resolveAiDmPreset(value: unknown): AiDmPreset {
  return AI_DM_PRESETS.find((preset) => preset.id === normalizeAiDmPresetId(value)) ?? AI_DM_PRESETS[0];
}

export function normalizeAiDmRequestMode(value: unknown): AiDmRequestMode {
  if (value === 'recap' || value === 'session_start' || value === 'dice_result') return value;
  return 'reply';
}
