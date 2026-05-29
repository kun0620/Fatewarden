import type { AbilityKey, Character, DiceRoll, RollMode, RulesModule, SessionRules } from '../types';

export const defaultSessionRules: SessionRules = {
  version: 'srd_5_1',
  enabledModules: ['core', 'combat', 'conditions'],
  houseRules: '',
};

export const abilityLabels: Record<AbilityKey, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

export const skillAbilityMap: Record<string, AbilityKey> = {
  Acrobatics: 'dex',
  'Animal Handling': 'wis',
  Arcana: 'int',
  Athletics: 'str',
  Deception: 'cha',
  History: 'int',
  Insight: 'wis',
  Intimidation: 'cha',
  Investigation: 'int',
  Medicine: 'wis',
  Nature: 'int',
  Perception: 'wis',
  Performance: 'cha',
  Persuasion: 'cha',
  Religion: 'int',
  'Sleight of Hand': 'dex',
  Stealth: 'dex',
  Survival: 'wis',
};

export const conditions = [
  'Blinded',
  'Charmed',
  'Deafened',
  'Frightened',
  'Grappled',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Poisoned',
  'Prone',
  'Restrained',
  'Stunned',
  'Unconscious',
];

export function normalizeRules(
  version?: string | null,
  enabledModules?: string[] | null,
  houseRules?: string | null,
): SessionRules {
  return {
    version: version === 'srd_5_1' ? 'srd_5_1' : defaultSessionRules.version,
    enabledModules: enabledModules?.length
      ? enabledModules.filter((module): module is RulesModule =>
          ['core', 'combat', 'conditions'].includes(module),
        )
      : defaultSessionRules.enabledModules,
    houseRules: houseRules ?? '',
  };
}

export function abilityModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(value: number) {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function proficiencyBonus(level: number) {
  return Math.ceil(Math.max(1, Math.min(20, level)) / 4) + 1;
}

export function characterHasSkill(character: Character, skill: string) {
  return character.skills.some((knownSkill) => knownSkill.toLowerCase() === skill.toLowerCase());
}

export function skillModifier(character: Character, skill: string) {
  const ability = skillAbilityMap[skill] ?? 'wis';
  const base = abilityModifier(character.abilities[ability]);
  return characterHasSkill(character, skill) ? base + proficiencyBonus(character.level) : base;
}

export function savingThrowModifier(character: Character, ability: AbilityKey) {
  return abilityModifier(character.abilities[ability]);
}

export function initiativeModifier(character: Character) {
  return abilityModifier(character.abilities.dex);
}

export function rollDice(count: number, sides: number) {
  return Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
}

export function resolveRoll({
  count,
  sides,
  modifier,
  mode,
  notation,
  label,
}: {
  count: number;
  sides: number;
  modifier: number;
  mode: RollMode;
  notation: string;
  label: string;
}): Pick<DiceRoll, 'rolls' | 'total' | 'keptRoll' | 'droppedRolls'> {
  if (sides === 20 && count === 1 && mode !== 'normal') {
    const rolls = rollDice(2, 20);
    const keptRoll = mode === 'advantage' ? Math.max(...rolls) : Math.min(...rolls);
    const keptIndex = rolls.indexOf(keptRoll);
    return {
      rolls,
      keptRoll,
      droppedRolls: rolls.filter((_value, index) => index !== keptIndex),
      total: keptRoll + modifier,
    };
  }

  const rolls = rollDice(count, sides);
  return {
    rolls,
    total: rolls.reduce((sum, value) => sum + value, modifier),
    keptRoll: undefined,
    droppedRolls: [],
  };
}

export function buildNotation(count: number, sides: number, modifier: number, mode: RollMode) {
  const mod = modifier === 0 ? '' : formatModifier(modifier);
  const modeSuffix = mode === 'normal' ? '' : ` ${mode}`;
  return `${count}d${sides}${mod}${modeSuffix}`;
}
