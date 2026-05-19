import { classes, getAllFeaturesUpToLevel, getClassById, getClassByName, type ClassDefinition } from '../data/classes';
import { itemTemplates, spawnItem } from '../data/items';
import {
  getAllTraits,
  getRaceById,
  getSubraceById,
  getTotalAbilityBonus,
  races,
  type RaceDefinition,
  type SubraceDefinition,
} from '../data/races';
import { buildSpellSlotState } from '../data/spellSlots';
import { demoCharacter } from '../data/demo';
import { calcACFromInventory, createEmptyInventory } from './inventory';
import { recalculateCharacter } from './characterDerived';
import type { AbilityKey, Character, CharacterPersonality, Inventory, Item } from '../types';

export type AbilityMethod = 'manual' | 'standard-array' | 'point-buy';
export type EquipmentMode = 'class' | 'gold' | 'custom';

export const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export const POINT_BUY_BUDGET = 27;

export const POINT_BUY_COST: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

export const BACKGROUND_PRESETS: Array<{
  id: string;
  name: string;
  skills: string[];
  personality: CharacterPersonality;
}> = [
  {
    id: 'acolyte',
    name: 'Acolyte',
    skills: ['Insight', 'Religion'],
    personality: {
      traits: 'I quote sacred texts and omens when tension rises.',
      ideals: 'Faith should protect the frightened, not crown the powerful.',
      bonds: 'A temple elder once saved me, and I still carry their sigil.',
      flaws: 'I trust holy signs before I trust people.',
      backstory: 'Raised in a shrine that taught service, secrecy, and the weight of vows.',
    },
  },
  {
    id: 'criminal',
    name: 'Criminal',
    skills: ['Deception', 'Stealth'],
    personality: {
      traits: 'I always know where the exits are.',
      ideals: 'Chains are meant to be picked.',
      bonds: 'My old crew is either dead, missing, or looking for me.',
      flaws: 'I assume every bargain hides a knife.',
      backstory: 'A former operator from the city underways trying to choose better jobs.',
    },
  },
  {
    id: 'folk-hero',
    name: 'Folk Hero',
    skills: ['Animal Handling', 'Survival'],
    personality: {
      traits: 'I speak plainly, even to kings.',
      ideals: 'Common people deserve champions who stay.',
      bonds: 'The village that raised me still waits for news.',
      flaws: 'I take every insult to the powerless personally.',
      backstory: 'A local troublemaker turned local legend after one impossible stand.',
    },
  },
  {
    id: 'sage',
    name: 'Sage',
    skills: ['Arcana', 'History'],
    personality: {
      traits: 'I collect fragments of forbidden explanations.',
      ideals: 'Truth is worth discomfort.',
      bonds: 'A lost archive contains the proof I need.',
      flaws: 'I will open doors that wiser people leave sealed.',
      backstory: 'A scholar whose research crossed from academic curiosity into survival.',
    },
  },
];

export function abilityModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(value: number) {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function clampAbility(score: number, min = 1, max = 30) {
  return Math.max(min, Math.min(max, Math.trunc(Number.isFinite(score) ? score : 10)));
}

function getSelectionDarkvision(race?: RaceDefinition, subrace?: SubraceDefinition) {
  const base = race?.darkvision ?? 0;
  const superiorDarkvision =
    subrace?.traits.some((trait) => trait.name.toLowerCase().includes('superior darkvision')) ?? false;
  return superiorDarkvision ? Math.max(base, 120) : base;
}

export function emptyAbilities(score = 10): Record<AbilityKey, number> {
  return ABILITY_KEYS.reduce((acc, key) => {
    acc[key] = score;
    return acc;
  }, {} as Record<AbilityKey, number>);
}

export function getRaceSelection(character: Character) {
  const raceId = character.systemData.creation?.raceId;
  const subraceId = character.systemData.creation?.subraceId;
  const race =
    (raceId ? getRaceById(raceId) : undefined) ??
    races.find((candidate) => candidate.name.toLowerCase() === character.ancestry.toLowerCase()) ??
    races[0];
  const subrace = subraceId ? getSubraceById(race.id, subraceId) : race.subraces?.[0];
  return { race, subrace };
}

export function getClassSelection(character: Character) {
  const classId = character.systemData.creation?.classId;
  return (classId ? getClassById(classId) : undefined) ?? getClassByName(character.className) ?? classes[0];
}

export function applyRacialBonuses(
  baseAbilities: Partial<Record<AbilityKey, number>>,
  race?: RaceDefinition,
  subrace?: SubraceDefinition,
) {
  const bonuses = race ? getTotalAbilityBonus(race.id, subrace?.id) : {};
  return ABILITY_KEYS.reduce((acc, key) => {
    acc[key] = clampAbility((baseAbilities[key] ?? 10) + (bonuses[key] ?? 0), 1, 30);
    return acc;
  }, {} as Record<AbilityKey, number>);
}

export function pointBuySpent(abilities: Partial<Record<AbilityKey, number>>) {
  return ABILITY_KEYS.reduce((sum, key) => sum + (POINT_BUY_COST[clampAbility(abilities[key] ?? 8, 8, 15)] ?? 0), 0);
}

export function isPointBuyValid(abilities: Partial<Record<AbilityKey, number>>) {
  return pointBuySpent(abilities) <= POINT_BUY_BUDGET;
}

function normalizeItemLookup(value: string) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/^\d+\s+/, '')
    .replace(/\b(two|three|four|five|six|ten|twenty)\b\s+/g, '')
    .replace(/'s\b/g, 's')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const ITEM_ALIASES: Record<string, string> = {
  chain_mail: 'chain_mail',
  leather_armor: 'leather',
  scale_mail: 'scale_mail',
  light_crossbow: 'light_crossbow',
  crossbow: 'light_crossbow',
  short_sword: 'shortsword',
  short_swords: 'shortsword',
  martial_weapon: 'longsword',
  simple_weapon: 'quarterstaff',
  shield: 'shield',
  spellbook: 'book',
  thieves_tools: 'thieves_tools',
};

function genericItemFromName(name: string): Item {
  return {
    id: crypto.randomUUID(),
    templateId: normalizeItemLookup(name).replace(/_/g, '-'),
    name,
    description: '',
    category: 'misc',
    rarity: 'common',
    weight: 0,
    value: 0,
    quantity: 1,
    equipped: false,
    attunement: false,
    attuned: false,
    effects: [],
  };
}

export function itemFromEquipmentName(name: string): Item {
  const normalized = normalizeItemLookup(name);
  const templateId = ITEM_ALIASES[normalized] ?? (itemTemplates[normalized] ? normalized : undefined);
  if (!templateId || !itemTemplates[templateId]) return genericItemFromName(name);
  return spawnItem(templateId);
}

export function inventoryFromEquipmentNames(names: string[], strScore = 10): Inventory {
  const inventory = createEmptyInventory(Math.max(90, strScore * 15));
  const items = names.map(itemFromEquipmentName);
  let equippedArmor = false;
  let equippedWeapon = false;

  return {
    ...inventory,
    items: items.map((item) => {
      if (!equippedArmor && item.armor && item.armor.type !== 'shield') {
        equippedArmor = true;
        return { ...item, equipped: true };
      }
      if (item.armor?.type === 'shield') {
        return { ...item, equipped: true };
      }
      if (!equippedWeapon && item.category === 'weapon') {
        equippedWeapon = true;
        return { ...item, equipped: true };
      }
      return item;
    }),
  };
}

export function getClassStartingEquipment(classData: ClassDefinition | undefined) {
  return classData?.startingEquipment.length ? classData.startingEquipment : ['Backpack', 'Bedroll', 'Rations (1 day)'];
}

export function makeCharacterDraft(): Character {
  const base = emptyAbilities(10);
  const race = races[0];
  const subrace = race.subraces?.[0];
  const classData = classes[0];
  const abilities = applyRacialBonuses(base, race, subrace);
  const inventory = inventoryFromEquipmentNames(getClassStartingEquipment(classData), abilities.str);
  const personality = BACKGROUND_PRESETS[0].personality;

  return recalculateCharacter({
    ...demoCharacter,
    id: 'char-draft',
    name: '',
    ancestry: race.name,
    race: race.name,
    subrace: subrace?.name ?? '',
    className: classData.name,
    subclass: '',
    level: 1,
    background: BACKGROUND_PRESETS[0].name,
    languages: [...race.languages],
    proficiencies: [...classData.savingThrows, ...classData.armorProficiencies, ...classData.weaponProficiencies],
    abilities,
    skills: classData.skillChoices.slice(0, classData.skillChoiceCount),
    inventory,
    armorClass: calcACFromInventory(inventory, abilities.dex),
    features: getAllFeaturesUpToLevel(classData.id, 1).map((feature) => feature.name),
    spells: [],
    spellsKnown: [],
    backstory: personality.backstory ?? '',
    personality,
    personalityTraits: [personality.traits, personality.ideals, personality.bonds, personality.flaws].filter(Boolean),
    speed: race.speed,
    darkvision: getSelectionDarkvision(race, subrace),
    hitDice: 1,
    maxHitDice: 1,
    spellSlots: buildSpellSlotState(classData.name, 1),
    systemData: {
      creation: {
        raceId: race.id,
        subraceId: subrace?.id,
        classId: classData.id,
        abilityMethod: 'standard-array',
        baseAbilities: base,
        skillChoices: classData.skillChoices.slice(0, classData.skillChoiceCount),
        equipmentMode: 'class',
        selectedEquipment: getClassStartingEquipment(classData),
      },
    },
  });
}

export function finalizeCharacter(character: Character) {
  const { race, subrace } = getRaceSelection(character);
  const classData = getClassSelection(character);
  const baseAbilities = character.systemData.creation?.baseAbilities ?? character.abilities;
  const abilities = applyRacialBonuses(baseAbilities, race, subrace);
  const traits = getAllTraits(race.id, subrace?.id).map((trait) => trait.name);
  const classFeatures = getAllFeaturesUpToLevel(classData.id, character.level).map((feature) => feature.name);
  const creation = character.systemData.creation ?? {};
  const selectedEquipment = creation.selectedEquipment?.length ? creation.selectedEquipment : getClassStartingEquipment(classData);
  const inventory =
    creation.equipmentMode === 'class'
      ? inventoryFromEquipmentNames(selectedEquipment, abilities.str)
      : character.inventory;

  return recalculateCharacter({
    ...character,
    ancestry: race.name,
    race: race.name,
    subrace: subrace?.name ?? '',
    className: classData.name,
    languages: Array.from(new Set([...race.languages, ...character.languages].filter(Boolean))),
    proficiencies: Array.from(
      new Set([
        ...classData.savingThrows,
        ...classData.armorProficiencies,
        ...classData.weaponProficiencies,
        ...character.proficiencies,
      ]),
    ),
    abilities,
    skills: creation.skillChoices?.length ? creation.skillChoices : character.skills,
    speed: race.speed,
    darkvision: getSelectionDarkvision(race, subrace),
    inventory,
    features: Array.from(new Set([...traits, ...classFeatures, ...character.features].filter(Boolean))),
    spellsKnown: character.spellsKnown ?? character.spells,
    systemData: {
      ...character.systemData,
      creation: {
        ...creation,
        raceId: race.id,
        subraceId: subrace?.id,
        classId: classData.id,
        baseAbilities,
        selectedEquipment,
      },
    },
  });
}
