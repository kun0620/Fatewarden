import { calcMaxHP, recalculateCharacter } from './characterDerived';
import { classes, getClassByName, getClassData, normalizeClassName } from '../data/classes';
import { isCasterClass } from '../data/spellSlots';
import type { AbilityKey, Character, LevelUpChoice } from '../types';

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

  if (trimmed.startsWith('roll:')) {
    const raw = Number(trimmed.slice('roll:'.length).trim());
    return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : undefined;
  }

  if (trimmed === 'roll hit die') {
    return undefined;
  }

  const averageGain = Math.floor(hitDie / 2) + 1;
  return averageGain;
}

function getClassDefinition(className: string) {
  const normalizedClass = normalizeClassName(className);
  return (
    getClassByName(className) ??
    classes.find((classData) => classData.id === normalizedClass || classData.name.toLowerCase() === normalizedClass)
  );
}

function hitDieNumber(hitDie: string | undefined) {
  if (!hitDie) return 8;
  const parsed = Number(hitDie.replace(/^d/i, ''));
  return Number.isFinite(parsed) ? parsed : 8;
}

export function canLevelUp(character: Character) {
  return clampLevel(character.level) < maxLevel;
}

export function getLevelUpChoices(character: Character): LevelUpChoice[] {
  if (!canLevelUp(character)) return [];

  const currentLevel = clampLevel(character.level);
  const nextLevel = currentLevel + 1;
  const normalizedClass = normalizeClassName(character.className);
  const classDefinition = getClassDefinition(character.className);
  const compatibilityFeatures = getClassData(normalizedClass)?.featuresByLevel[nextLevel] ?? [];
  const features = classDefinition
    ? classDefinition.features.filter((feature) => feature.level === nextLevel).map((feature) => feature.name)
    : compatibilityFeatures;

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
      options: ['str+2', 'dex+2', 'con+2', 'int+2', 'wis+2', 'cha+2', 'str+1,dex+1', 'Feat (table rule)'],
    });
  }

  if (classDefinition?.subclassLevel === nextLevel && classDefinition.subclasses.length) {
    choices.push({
      type: 'subclass',
      options: classDefinition.subclasses.map((subclass) => subclass.name),
    });
  }

  if (isCasterClass(normalizedClass)) {
    choices.push({
      type: 'spell',
      options: ['Learn spell: Magic Missile', 'Learn spell: Cure Wounds', 'Learn spell: Shield', 'Swap spell', 'No spell change'],
    });
  }

  return choices;
}

function applyAbilitySelection(abilities: Character['abilities'], selected: string | undefined) {
  if (!selected) return abilities;
  const trimmed = selected.trim().toLowerCase();
  if (trimmed.includes('feat')) return abilities;

  const next = { ...abilities };
  trimmed.split(',').forEach((part) => {
    const [abilityRaw, bonusRaw] = part.split('+');
    const ability = abilityRaw?.trim() as AbilityKey;
    const bonus = Number(bonusRaw);
    if (!['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(ability) || !Number.isFinite(bonus)) return;
    next[ability] = Math.min(30, Math.max(1, next[ability] + Math.trunc(bonus)));
  });
  return next;
}

function parseSpellSelection(selected: string | undefined) {
  if (!selected) return undefined;
  const match = selected.match(/^learn spell:\s*(.+)$/i);
  return match?.[1]?.trim();
}

export function applyLevelUp(character: Character, choices: LevelUpChoice[]) {
  if (!canLevelUp(character)) return character;

  const currentLevel = clampLevel(character.level);
  const nextLevel = currentLevel + 1;
  const normalizedClass = normalizeClassName(character.className);
  const classDefinition = getClassDefinition(character.className);
  const hitDie = hitDieNumber(classDefinition?.hitDie);
  const featureGain =
    classDefinition?.features.filter((feature) => feature.level === nextLevel).map((feature) => feature.name) ??
    getClassData(normalizedClass)?.featuresByLevel[nextLevel] ??
    [];
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
  const abilityChoice = choices.find((choice) => choice.type === 'ability_score')?.selected;
  const subclassChoice = choices.find((choice) => choice.type === 'subclass')?.selected;
  const spellChoice = parseSpellSelection(choices.find((choice) => choice.type === 'spell')?.selected);
  const selectedAbilityChoices = abilityChoice ? [`Ability Score Improvement: ${abilityChoice}`] : [];
  const selectedSpellChoice = spellChoice ? [`Spell Learned: ${spellChoice}`] : [];
  const selectedSubclassChoice = subclassChoice ? [`Subclass: ${subclassChoice}`] : [];

  return recalculateCharacter({
    ...character,
    level: nextLevel,
    hitPoints: nextHitPoints,
    maxHitPoints,
    abilities: applyAbilitySelection(character.abilities, abilityChoice),
    subclass: subclassChoice ?? character.subclass,
    spells: spellChoice ? toUniqueList([...character.spells, spellChoice]) : character.spells,
    spellsKnown: spellChoice ? toUniqueList([...(character.spellsKnown ?? character.spells), spellChoice]) : character.spellsKnown,
    hitDice: Math.min(nextLevel, character.hitDice + 1),
    maxHitDice: nextLevel,
    features: toUniqueList([
      ...character.features,
      ...featureGain,
      ...selectedFeatures,
      ...selectedAbilityChoices,
      ...selectedSubclassChoice,
      ...selectedSpellChoice,
    ]),
  });
}
