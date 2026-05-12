import type {
  HexAbilityKey,
  HexHeroBuild,
  HexRaceDraft,
  HexRoleDraft,
  HexSkillKey,
  HexStatKey,
  HexVitalKey,
} from '../types';

export const hexAbilityLabels: Record<HexAbilityKey, string> = {
  attack: 'Attack',
  defend: 'Defend',
  firstMastery: 'First Mastery',
  secondMastery: 'Second Mastery',
};

export const hexSkillLabels: Record<HexSkillKey, string> = {
  navigate: 'Navigate',
  explore: 'Explore',
  survival: 'Survival',
};

export const hexVitalLabels: Record<HexVitalKey, string> = {
  health: 'Health',
  energy: 'Energy',
};

export const hexStatLabels: Record<HexStatKey, string> = {
  ...hexAbilityLabels,
  ...hexSkillLabels,
  ...hexVitalLabels,
};

export const hexAbilityKeys = Object.keys(hexAbilityLabels) as HexAbilityKey[];
export const hexSkillKeys = Object.keys(hexSkillLabels) as HexSkillKey[];
export const hexVitalKeys = Object.keys(hexVitalLabels) as HexVitalKey[];
export const hexStatKeys = Object.keys(hexStatLabels) as HexStatKey[];

export const emptyHexRoleDraft: HexRoleDraft = {
  name: '',
  category: '',
  favoredOpponent: '',
  abilities: {
    attack: { name: 'Attack', summary: '', base: 1, energyCost: 0 },
    defend: { name: 'Defend', summary: '', base: 1, energyCost: 0 },
    firstMastery: { name: 'First Mastery', summary: '', base: 1, energyCost: 0 },
    secondMastery: { name: 'Second Mastery', summary: '', base: 1, energyCost: 0 },
  },
  skills: {
    navigate: 1,
    explore: 1,
    survival: 1,
  },
  vitals: {
    health: 5,
    energy: 5,
  },
};

export const emptyHexRaceDraft: HexRaceDraft = {
  name: '',
  notes: '',
  modifiers: {
    attack: 0,
    defend: 0,
    firstMastery: 0,
    secondMastery: 0,
    navigate: 0,
    explore: 0,
    survival: 0,
    health: 0,
    energy: 0,
  },
};

export const emptyHexHeroBuild: HexHeroBuild = {
  role: emptyHexRoleDraft,
  race: emptyHexRaceDraft,
  foodRating: 1,
  gold: 0,
  backpackNotes: '',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clampScore(value: number) {
  return Math.min(30, Math.max(0, Math.round(value)));
}

function normalizeAbility(value: unknown, fallback: HexRoleDraft['abilities'][HexAbilityKey]) {
  const source = isRecord(value) ? value : {};
  return {
    name: readString(source.name, fallback.name),
    summary: readString(source.summary, fallback.summary),
    base: clampScore(readNumber(source.base, fallback.base)),
    energyCost: clampScore(readNumber(source.energyCost, fallback.energyCost)),
  };
}

export function normalizeHexHeroBuild(value: unknown): HexHeroBuild {
  const source = isRecord(value) ? value : {};
  const roleSource = isRecord(source.role) ? source.role : {};
  const raceSource = isRecord(source.race) ? source.race : {};
  const abilitySource = isRecord(roleSource.abilities) ? roleSource.abilities : {};
  const skillSource = isRecord(roleSource.skills) ? roleSource.skills : {};
  const vitalSource = isRecord(roleSource.vitals) ? roleSource.vitals : {};
  const modifierSource = isRecord(raceSource.modifiers) ? raceSource.modifiers : {};

  return {
    role: {
      name: readString(roleSource.name),
      category: readString(roleSource.category),
      favoredOpponent: readString(roleSource.favoredOpponent),
      abilities: Object.fromEntries(
        hexAbilityKeys.map((key) => [
          key,
          normalizeAbility(abilitySource[key], emptyHexRoleDraft.abilities[key]),
        ]),
      ) as HexRoleDraft['abilities'],
      skills: Object.fromEntries(
        hexSkillKeys.map((key) => [
          key,
          clampScore(readNumber(skillSource[key], emptyHexRoleDraft.skills[key])),
        ]),
      ) as HexRoleDraft['skills'],
      vitals: Object.fromEntries(
        hexVitalKeys.map((key) => [
          key,
          clampScore(readNumber(vitalSource[key], emptyHexRoleDraft.vitals[key])),
        ]),
      ) as HexRoleDraft['vitals'],
    },
    race: {
      name: readString(raceSource.name),
      notes: readString(raceSource.notes),
      modifiers: Object.fromEntries(
        hexStatKeys.map((key) => [
          key,
          Math.min(30, Math.max(-30, Math.round(readNumber(modifierSource[key], 0)))),
        ]),
      ) as HexRaceDraft['modifiers'],
    },
    foodRating: clampScore(readNumber(source.foodRating, emptyHexHeroBuild.foodRating)),
    gold: Math.max(0, Math.round(readNumber(source.gold, emptyHexHeroBuild.gold))),
    backpackNotes: readString(source.backpackNotes),
  };
}

export function calculateHexHeroStats(build: HexHeroBuild) {
  return {
    abilities: Object.fromEntries(
      hexAbilityKeys.map((key) => [
        key,
        clampScore(build.role.abilities[key].base + build.race.modifiers[key]),
      ]),
    ) as Record<HexAbilityKey, number>,
    skills: Object.fromEntries(
      hexSkillKeys.map((key) => [
        key,
        clampScore(build.role.skills[key] + build.race.modifiers[key]),
      ]),
    ) as Record<HexSkillKey, number>,
    vitals: Object.fromEntries(
      hexVitalKeys.map((key) => [
        key,
        clampScore(build.role.vitals[key] + build.race.modifiers[key]),
      ]),
    ) as Record<HexVitalKey, number>,
  };
}
