import { calcMaxHP } from './characterDerived';
import { getClassData, normalizeClassName } from '../data/classes';
import { isCasterClass } from '../data/spellSlots';
import type { Character, LevelUpChoice } from '../types';

const maxLevel = 20;


function clampLevel(level: number) {
  if (!Number.isFinite(level)) return 1;
  return Math.max(1, Math.min(maxLevel, Math.trunc(level)));
}

function toUniqueList(values: string[]) {
  const seen = new Set<string>();
  const next: string[] = [];
  values.forEach((value) => {
    const normalized = value.trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    next.push(normalized);
  });
  return next;
}

function parseHpSelection(selected: string | undefined, hitDie: number) {
  if (!selected) return undefined;
  const trimmed = selected.trim().toLowerCase();
  if (trimmed.startsWith('manual:')) {
    const raw = Number(trimmed.slice('manual:'.length).trim());
    return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : undefined;
  }

  if (trimmed === 'roll hit die') {
    return undefined;
  }

  const averageGain = Math.floor(hitDie / 2) + 1;
  return averageGain;
}

export function canLevelUp(character: Character) {
  return clampLevel(character.level) < maxLevel;
}

export function getLevelUpChoices(character: Character): LevelUpChoice[] {
  if (!canLevelUp(character)) return [];

  const currentLevel = clampLevel(character.level);
  const nextLevel = currentLevel + 1;
  const normalizedClass = normalizeClassName(character.className);
  const features = getClassData(normalizedClass)?.featuresByLevel[nextLevel] ?? [];

  const choices: LevelUpChoice[] = [
    {
      type: 'hp',
      options: ['Fixed Average', 'Roll Hit Die'],
      selected: 'Fixed Average',
    },
  ];

  if (features.length) {
    choices.push({
      type: 'feature',
      options: features,
    });
  }

  if (features.some((feature) => feature.toLowerCase().includes('ability score improvement'))) {
    choices.push({
      type: 'ability_score',
      options: ['+2 one ability', '+1 two abilities', 'Feat (table rule)'],
    });
  }

  if (isCasterClass(normalizedClass)) {
    choices.push({
      type: 'spell',
      options: ['Learn spell', 'Swap spell', 'No spell change'],
    });
  }

  return choices;
}

export function applyLevelUp(character: Character, choices: LevelUpChoice[]) {
  if (!canLevelUp(character)) return character;

  const currentLevel = clampLevel(character.level);
  const nextLevel = currentLevel + 1;
  const normalizedClass = normalizeClassName(character.className);
  const hitDie = Number((getClassData(normalizedClass)?.hitDie ?? 'd8').slice(1));
  const featureGain = getClassData(normalizedClass)?.featuresByLevel[nextLevel] ?? [];
  const hpChoice = choices.find((choice) => choice.type === 'hp');
  const manualSelectedHp = parseHpSelection(hpChoice?.selected, hitDie);

  const defaultMaxHp = calcMaxHP(nextLevel, character.className, character.abilities.con);
  const maxHitPoints = manualSelectedHp
    ? Math.max(defaultMaxHp, character.maxHitPoints + manualSelectedHp + Math.floor((character.abilities.con - 10) / 2))
    : defaultMaxHp;
  const hpGain = Math.max(1, maxHitPoints - character.maxHitPoints);
  const nextHitPoints = Math.min(maxHitPoints, character.hitPoints + hpGain);

  const selectedFeatures = choices
    .find((choice) => choice.type === 'feature')
    ?.options.filter(Boolean)
    .map((item) => item.trim()) ?? [];
  const selectedAbilityChoices = choices
    .find((choice) => choice.type === 'ability_score')
    ?.selected
    ? [`Ability Score Improvement: ${choices.find((choice) => choice.type === 'ability_score')?.selected}`]
    : [];
  const selectedSpellChoice = choices
    .find((choice) => choice.type === 'spell')
    ?.selected
    ? [`Spell Choice: ${choices.find((choice) => choice.type === 'spell')?.selected}`]
    : [];

  return {
    ...character,
    level: nextLevel,
    hitPoints: nextHitPoints,
    maxHitPoints,
    features: toUniqueList([
      ...character.features,
      ...featureGain,
      ...selectedFeatures,
      ...selectedAbilityChoices,
      ...selectedSpellChoice,
    ]),
  };
}
