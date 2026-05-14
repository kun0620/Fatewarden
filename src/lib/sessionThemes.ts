import type { SessionTheme, SessionThemeKey, SessionThemeTone } from '../types';

export const defaultSessionTheme: SessionTheme = {
  key: 'dark_fantasy',
  tone: 'grim',
  notes: '',
};

export const sessionThemePresets: Array<{
  key: SessionThemeKey;
  label: string;
  description: string;
}> = [
  {
    key: 'dark_fantasy',
    label: 'Dark Fantasy',
    description: 'คำสาป เงามืด',
  },
  {
    key: 'high_fantasy',
    label: 'High Fantasy',
    description: 'ผจญภัยใหญ่ ชัยชนะกล้าหาญ',
  },
  {
    key: 'horror',
    label: 'Horror',
    description: 'ความกลัว, สิ่งเหนือมนุษย์',
  },
  {
    key: 'mystery',
    label: 'Mystery',
    description: 'สืบสวน ปริศนา',
  },
];

export const sessionThemeTones: Array<{
  key: SessionThemeTone;
  label: string;
}> = [
  { key: 'grim', label: 'Grim' },
  { key: 'mysterious', label: 'Mysterious' },
  { key: 'cinematic', label: 'Cinematic' },
  { key: 'dangerous', label: 'Dangerous' },
  { key: 'light_adventure', label: 'Light Adventure' },
];

const themeKeys = new Set<SessionThemeKey>(sessionThemePresets.map((theme) => theme.key));
const themeTones = new Set<SessionThemeTone>(sessionThemeTones.map((tone) => tone.key));

function mapLegacyThemeKey(key: string): SessionThemeKey {
  // Map deprecated theme keys to new ones for backward compatibility
  const legacyMap: Record<string, SessionThemeKey> = {
    'gothic_horror': 'horror',
    'heroic_fantasy': 'high_fantasy',
    'wilderness': 'dark_fantasy',
  };
  return legacyMap[key] ?? (key as SessionThemeKey);
}

export function normalizeSessionTheme(
  key: unknown,
  tone: unknown,
  notes: unknown,
): SessionTheme {
  let normalizedKey = defaultSessionTheme.key;
  if (typeof key === 'string') {
    const mapped = mapLegacyThemeKey(key);
    if (themeKeys.has(mapped)) {
      normalizedKey = mapped;
    }
  }
  return {
    key: normalizedKey,
    tone: typeof tone === 'string' && themeTones.has(tone as SessionThemeTone)
      ? (tone as SessionThemeTone)
      : defaultSessionTheme.tone,
    notes: typeof notes === 'string' ? notes : defaultSessionTheme.notes,
  };
}

export function getSessionThemeDefinition(key: SessionThemeKey) {
  return sessionThemePresets.find((theme) => theme.key === key) ?? sessionThemePresets[0];
}
