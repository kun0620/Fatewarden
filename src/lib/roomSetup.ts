import type { RunDifficulty, SessionPlayMode, SessionThemeKey, RuleStrictness, RoomVisibility } from '../types';

export type RoomSetupDraft = {
  title: string;
  playMode: SessionPlayMode;
  themeKey: SessionThemeKey;
  themeNotes: string;
  ruleStrictness: RuleStrictness;
  partySize: number;
  visibility: RoomVisibility;
  difficulty?: RunDifficulty;
  houseRules: string;
};

export type RoomSetupValidationError = {
  field: keyof RoomSetupDraft;
  message: string;
};

export const ruleStrictnessOptions: Array<{ id: RuleStrictness; label: string; description: string }> = [
  { id: 'casual', label: 'Casual', description: 'free-form, rule-of-cool' },
  { id: 'standard', label: 'Standard D&D', description: 'SRD 5.1 ตามมาตรฐาน' },
  { id: 'hardcore', label: 'Hardcore', description: 'permadeath, encumbrance, strict' },
];

export const visibilityOptions: Array<{ id: RoomVisibility; label: string; description: string }> = [
  { id: 'invite_code', label: 'Invite Code', description: 'share code ให้คนเข้าโต๊ะ' },
  { id: 'private', label: 'Private', description: 'เฉพาะคนที่ host เชิญ' },
];

export const PARTY_SIZE_MIN = 2;
export const PARTY_SIZE_MAX = 5;

export function getDefaultRoomSetup(): RoomSetupDraft {
  return {
    title: '',
    playMode: 'warden_run',
    themeKey: 'dark_fantasy',
    themeNotes: '',
    ruleStrictness: 'standard',
    partySize: 4,
    visibility: 'invite_code',
    difficulty: 'warden',
    houseRules: '',
  };
}

export function validateRoomSetup(draft: RoomSetupDraft): RoomSetupValidationError[] {
  const errors: RoomSetupValidationError[] = [];

  if (!draft.title.trim()) {
    errors.push({ field: 'title', message: 'Room name is required.' });
  }
  if (draft.title.length > 80) {
    errors.push({ field: 'title', message: 'Room name max 80 characters.' });
  }
  if (draft.partySize < PARTY_SIZE_MIN || draft.partySize > PARTY_SIZE_MAX) {
    errors.push({ field: 'partySize', message: `Party size ${PARTY_SIZE_MIN}-${PARTY_SIZE_MAX}.` });
  }

  return errors;
}

export function isRoomSetupValid(draft: RoomSetupDraft): boolean {
  return validateRoomSetup(draft).length === 0;
}
