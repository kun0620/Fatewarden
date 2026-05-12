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
    description: 'คำสาป เงามืด และทางเลือกที่มีราคา',
  },
  {
    key: 'gothic_horror',
    label: 'Cosmic Horror',
    description: 'ความจริงผิดรูป สัญญาณจากสิ่งเหนือมนุษย์ และแรงกดดันทางจิตใจ',
  },
  {
    key: 'mystery',
    label: 'Gothic Mystery',
    description: 'สืบสวน ร่องรอย คฤหาสน์/เมืองหม่น และ NPC มีแรงจูงใจซ่อนอยู่',
  },
  {
    key: 'wilderness',
    label: 'Wilderness',
    description: 'เดินทาง สำรวจ ทรัพยากร และอันตรายในป่า',
  },
  {
    key: 'heroic_fantasy',
    label: 'Heroic Fantasy',
    description: 'ผจญภัยชัดเจน จังหวะเร็ว และชัยชนะที่ยิ่งใหญ่',
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

export function normalizeSessionTheme(
  key: unknown,
  tone: unknown,
  notes: unknown,
): SessionTheme {
  return {
    key: typeof key === 'string' && themeKeys.has(key as SessionThemeKey)
      ? (key as SessionThemeKey)
      : defaultSessionTheme.key,
    tone: typeof tone === 'string' && themeTones.has(tone as SessionThemeTone)
      ? (tone as SessionThemeTone)
      : defaultSessionTheme.tone,
    notes: typeof notes === 'string' ? notes : defaultSessionTheme.notes,
  };
}

export function getSessionThemeDefinition(key: SessionThemeKey) {
  return sessionThemePresets.find((theme) => theme.key === key) ?? sessionThemePresets[0];
}
