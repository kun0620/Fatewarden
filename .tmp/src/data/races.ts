import type { AbilityKey } from '../types';

export type RacialTrait = {
  name: string;
  description: string;
};

export type SubraceDefinition = {
  id: string;
  name: string;
  description: string;
  abilityScoreBonus: Partial<Record<AbilityKey, number>>;
  traits: RacialTrait[];
  spellcastingAbility?: AbilityKey;
};

export type RaceDefinition = {
  id: string;
  name: string;
  description: string;
  /** Base ability score bonuses (before subrace) */
  abilityScoreBonus: Partial<Record<AbilityKey, number>>;
  speed: number;
  size: 'Small' | 'Medium';
  languages: string[];
  traits: RacialTrait[];
  subraces: SubraceDefinition[];
  darkvision: number; // ft, 0 = none
};

export const races: RaceDefinition[] = [
  // ─────────────────── DWARF ───────────────────
  {
    id: 'dwarf',
    name: 'Dwarf',
    description: 'Hardy and enduring, dwarves are a people of stone and forge, loyal to clan above all.',
    abilityScoreBonus: { con: 2 },
    speed: 25,
    size: 'Medium',
    languages: ['Common', 'Dwarvish'],
    darkvision: 60,
    traits: [
      { name: 'Darkvision', description: 'See in dim light within 60 ft as bright light, and in darkness as dim light (grayscale).' },
      { name: 'Dwarven Resilience', description: 'Advantage on saving throws vs. poison. Resistance to poison damage.' },
      { name: 'Dwarven Combat Training', description: 'Proficiency with battleaxe, handaxe, light hammer, and warhammer.' },
      { name: 'Tool Proficiency', description: "Proficiency with smith's tools, brewer's supplies, or mason's tools (your choice)." },
      { name: 'Stonecunning', description: 'Whenever you make a History check related to stonework, add double proficiency bonus.' },
    ],
    subraces: [
      {
        id: 'hill_dwarf',
        name: 'Hill Dwarf',
        description: 'Keen senses and deep intuition of the hills.',
        abilityScoreBonus: { wis: 1 },
        traits: [
          { name: 'Dwarven Toughness', description: 'HP maximum increases by 1, and increases by 1 again every level.' },
        ],
      },
      {
        id: 'mountain_dwarf',
        name: 'Mountain Dwarf',
        description: 'Strong and hardy, accustomed to a difficult life in rugged terrain.',
        abilityScoreBonus: { str: 2 },
        traits: [
          { name: 'Dwarven Armor Training', description: 'Proficiency with light and medium armor.' },
        ],
      },
    ],
  },

  // ─────────────────── ELF ───────────────────
  {
    id: 'elf',
    name: 'Elf',
    description: 'A magical people of otherworldly grace, long-lived and attuned to magic and nature.',
    abilityScoreBonus: { dex: 2 },
    speed: 30,
    size: 'Medium',
    languages: ['Common', 'Elvish'],
    darkvision: 60,
    traits: [
      { name: 'Darkvision', description: 'See in dim light within 60 ft as bright light, darkness as dim light.' },
      { name: 'Keen Senses', description: 'Proficiency in the Perception skill.' },
      { name: 'Fey Ancestry', description: 'Advantage on saving throws vs. being charmed. Cannot be magically put to sleep.' },
      { name: 'Trance', description: 'Do not need to sleep. Instead meditate 4 hours (equivalent to 8 hours of rest).' },
    ],
    subraces: [
      {
        id: 'high_elf',
        name: 'High Elf',
        description: 'Keenly attuned to magic, with a refined intellect.',
        abilityScoreBonus: { int: 1 },
        spellcastingAbility: 'int',
        traits: [
          { name: 'Elf Weapon Training', description: 'Proficiency with longsword, shortsword, shortbow, and longbow.' },
          { name: 'Cantrip', description: 'Know one wizard cantrip of your choice (INT-based).' },
          { name: 'Extra Language', description: 'Speak, read, and write one extra language of your choice.' },
        ],
      },
      {
        id: 'wood_elf',
        name: 'Wood Elf',
        description: 'Attuned to the wild; swift and stealthy.',
        abilityScoreBonus: { wis: 1 },
        traits: [
          { name: 'Elf Weapon Training', description: 'Proficiency with longsword, shortsword, shortbow, and longbow.' },
          { name: 'Fleet of Foot', description: 'Base walking speed increases to 35 ft.' },
          { name: 'Mask of the Wild', description: 'Can attempt to hide when only lightly obscured by foliage, rain, mist, etc.' },
        ],
      },
      {
        id: 'dark_elf',
        name: 'Dark Elf (Drow)',
        description: 'Dwellers of the Underdark, known for magical ability and a sinister reputation.',
        abilityScoreBonus: { cha: 1 },
        spellcastingAbility: 'cha',
        traits: [
          { name: 'Superior Darkvision', description: 'Darkvision range increases to 120 ft.' },
          { name: 'Sunlight Sensitivity', description: 'Disadvantage on attack rolls and Perception checks that rely on sight in direct sunlight.' },
          { name: 'Drow Magic', description: 'Know Dancing Lights cantrip. At 3rd level: Faerie Fire once/day. At 5th level: Darkness once/day. CHA-based.' },
          { name: 'Drow Weapon Training', description: 'Proficiency with rapiers, shortswords, and hand crossbows.' },
        ],
      },
    ],
  },

  // ─────────────────── HALFLING ───────────────────
  {
    id: 'halfling',
    name: 'Halfling',
    description: 'Small in stature but brave at heart, halflings are nimble wanderers and lucky survivors.',
    abilityScoreBonus: { dex: 2 },
    speed: 25,
    size: 'Small',
    languages: ['Common', 'Halfling'],
    darkvision: 0,
    traits: [
      { name: 'Lucky', description: 'When you roll a 1 on an attack, ability check, or saving throw, reroll and use the new result.' },
      { name: 'Brave', description: 'Advantage on saving throws vs. being frightened.' },
      { name: 'Halfling Nimbleness', description: 'Can move through the space of any creature larger than you.' },
    ],
    subraces: [
      {
        id: 'lightfoot',
        name: 'Lightfoot Halfling',
        description: 'Remarkably stealthy; able to hide behind larger creatures.',
        abilityScoreBonus: { cha: 1 },
        traits: [
          { name: 'Naturally Stealthy', description: 'Can attempt to hide when obscured by a creature at least one size larger.' },
        ],
      },
      {
        id: 'stout',
        name: 'Stout Halfling',
        description: 'Hardier than most, with dwarven blood in some family lines.',
        abilityScoreBonus: { con: 1 },
        traits: [
          { name: 'Stout Resilience', description: 'Advantage on saving throws vs. poison. Resistance to poison damage.' },
        ],
      },
    ],
  },

  // ─────────────────── HUMAN ───────────────────
  {
    id: 'human',
    name: 'Human',
    description: 'The most adaptable and ambitious people, humans spread across every corner of the world.',
    abilityScoreBonus: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    speed: 30,
    size: 'Medium',
    languages: ['Common'],
    darkvision: 0,
    traits: [
      { name: 'Extra Language', description: 'Learn one additional language of your choice.' },
    ],
    subraces: [
      {
        id: 'human_variant',
        name: 'Variant Human',
        description: 'Gain a feat and focused ability improvements instead of across-the-board bonuses.',
        abilityScoreBonus: {},
        traits: [
          { name: 'Ability Score Increase (choose 2)', description: 'Two different ability scores of your choice each increase by 1.' },
          { name: 'Skills', description: 'Proficiency in one skill of your choice.' },
          { name: 'Feat', description: 'Gain one feat of your choice.' },
        ],
      },
    ],
  },

  // ─────────────────── DRAGONBORN ───────────────────
  {
    id: 'dragonborn',
    name: 'Dragonborn',
    description: 'Proud and honorable, dragonborn claim descent from dragons and embody their power.',
    abilityScoreBonus: { str: 2, cha: 1 },
    speed: 30,
    size: 'Medium',
    languages: ['Common', 'Draconic'],
    darkvision: 0,
    traits: [
      {
        name: 'Draconic Ancestry',
        description: 'Choose a dragon type: Black (acid), Blue (lightning), Brass (fire), Bronze (lightning), Copper (acid), Gold (fire), Green (poison), Red (fire), Silver (cold), White (cold). Determines breath weapon damage type and resistance.',
      },
      {
        name: 'Breath Weapon',
        description: 'Use action to exhale destructive energy. Size and DC scale with level. Recharges on short or long rest. Damage: 2d6 (lvl 1), 3d6 (lvl 6), 4d6 (lvl 11), 5d6 (lvl 16).',
      },
      { name: 'Damage Resistance', description: 'Resistance to the damage type associated with your Draconic Ancestry.' },
    ],
    subraces: [],
  },

  // ─────────────────── GNOME ───────────────────
  {
    id: 'gnome',
    name: 'Gnome',
    description: 'Curious and energetic, gnomes are passionate inventors, illusionists, and tinkerers.',
    abilityScoreBonus: { int: 2 },
    speed: 25,
    size: 'Small',
    languages: ['Common', 'Gnomish'],
    darkvision: 60,
    traits: [
      { name: 'Darkvision', description: 'See in dim light within 60 ft as bright light, darkness as dim light.' },
      { name: 'Gnome Cunning', description: 'Advantage on INT, WIS, and CHA saving throws vs. magic.' },
    ],
    subraces: [
      {
        id: 'forest_gnome',
        name: 'Forest Gnome',
        description: 'Natural illusionists with a bond to small animals.',
        abilityScoreBonus: { dex: 1 },
        spellcastingAbility: 'int',
        traits: [
          { name: 'Natural Illusionist', description: 'Know the Minor Illusion cantrip (INT-based).' },
          { name: 'Speak with Small Beasts', description: 'Communicate simple ideas with Small or smaller beasts.' },
        ],
      },
      {
        id: 'rock_gnome',
        name: 'Rock Gnome',
        description: 'Inventive tinkerers who create small clockwork devices.',
        abilityScoreBonus: { con: 1 },
        traits: [
          { name: 'Artificer\'s Lore', description: 'Add twice proficiency bonus to History checks related to magic items, alchemical objects, or technological devices.' },
          { name: 'Tinker', description: 'Proficiency with artisan\'s tools (tinker\'s tools). Construct tiny clockwork devices using 1 hour and 10 gp of materials.' },
        ],
      },
    ],
  },

  // ─────────────────── HALF-ELF ───────────────────
  {
    id: 'half_elf',
    name: 'Half-Elf',
    description: 'With human curiosity and elven grace, half-elves walk between two worlds.',
    abilityScoreBonus: { cha: 2 },
    speed: 30,
    size: 'Medium',
    languages: ['Common', 'Elvish'],
    darkvision: 60,
    traits: [
      { name: 'Darkvision', description: 'See in dim light within 60 ft as bright light, darkness as dim light.' },
      { name: 'Fey Ancestry', description: 'Advantage on saving throws vs. being charmed. Cannot be magically put to sleep.' },
      { name: 'Skill Versatility', description: 'Proficiency in two skills of your choice.' },
      { name: 'Ability Score Increase (2 others)', description: 'Two ability scores other than CHA each increase by 1 (player\'s choice).' },
      { name: 'Extra Language', description: 'Speak, read, and write one extra language of your choice.' },
    ],
    subraces: [],
  },

  // ─────────────────── HALF-ORC ───────────────────
  {
    id: 'half_orc',
    name: 'Half-Orc',
    description: 'Powerful and resilient, half-orcs carry the ferocity of their orcish heritage.',
    abilityScoreBonus: { str: 2, con: 1 },
    speed: 30,
    size: 'Medium',
    languages: ['Common', 'Orc'],
    darkvision: 60,
    traits: [
      { name: 'Darkvision', description: 'See in dim light within 60 ft as bright light, darkness as dim light.' },
      { name: 'Menacing', description: 'Proficiency in the Intimidation skill.' },
      { name: 'Relentless Endurance', description: 'When reduced to 0 HP but not killed outright, drop to 1 HP instead. Once per long rest.' },
      { name: 'Savage Attacks', description: 'On a critical hit with a melee weapon, roll one additional weapon damage die and add it to the total.' },
    ],
    subraces: [],
  },

  // ─────────────────── TIEFLING ───────────────────
  {
    id: 'tiefling',
    name: 'Tiefling',
    description: 'Touched by infernal power, tieflings bear the mark of their fiendish heritage.',
    abilityScoreBonus: { int: 1, cha: 2 },
    speed: 30,
    size: 'Medium',
    languages: ['Common', 'Infernal'],
    darkvision: 60,
    traits: [
      { name: 'Darkvision', description: 'See in dim light within 60 ft as bright light, darkness as dim light.' },
      { name: 'Hellish Resistance', description: 'Resistance to fire damage.' },
      { name: 'Infernal Legacy', description: 'Know Thaumaturgy cantrip. At 3rd level: cast Hellish Rebuke once/day (2nd-level). At 5th level: cast Darkness once/day. CHA-based. Recover on long rest.' },
    ],
    subraces: [],
  },
];

export function getRaceById(id: string): RaceDefinition | undefined {
  return races.find((r) => r.id === id);
}

export function getSubraceById(raceId: string, subraceId: string): SubraceDefinition | undefined {
  return getRaceById(raceId)?.subraces.find((s) => s.id === subraceId);
}

/**
 * Merge base race + subrace ability bonuses into one record.
 */
export function getTotalAbilityBonus(
  raceId: string,
  subraceId?: string,
): Partial<Record<AbilityKey, number>> {
  const race = getRaceById(raceId);
  if (!race) return {};

  const base = { ...race.abilityScoreBonus };

  if (subraceId) {
    const sub = getSubraceById(raceId, subraceId);
    if (sub) {
      for (const key of Object.keys(sub.abilityScoreBonus) as AbilityKey[]) {
        base[key] = (base[key] ?? 0) + (sub.abilityScoreBonus[key] ?? 0);
      }
    }
  }

  return base;
}

/**
 * All traits for a race + subrace combined.
 */
export function getAllTraits(raceId: string, subraceId?: string): RacialTrait[] {
  const race = getRaceById(raceId);
  if (!race) return [];
  const base = [...race.traits];
  if (subraceId) {
    const sub = getSubraceById(raceId, subraceId);
    if (sub) base.push(...sub.traits);
  }
  return base;
}

// Compatibility exports for existing runtime code.
export type RaceData = {
  id: string;
  name: string;
  abilityBonuses: Partial<Record<AbilityKey, number>>;
  speed: number;
  darkvision: number;
};

export const raceData: RaceData[] = races.flatMap((race) => {
  const base: RaceData = {
    id: race.id.replace(/_/g, '-'),
    name: race.name,
    abilityBonuses: race.abilityScoreBonus,
    speed: race.speed,
    darkvision: race.darkvision,
  };
  const subraces: RaceData[] = race.subraces.map((subrace) => ({
    id: subrace.id.replace(/_/g, '-'),
    name: subrace.name,
    abilityBonuses: getTotalAbilityBonus(race.id, subrace.id),
    speed: race.speed,
    darkvision:
      subrace.traits.some((trait) => trait.name.toLowerCase().includes('superior darkvision'))
        ? Math.max(120, race.darkvision)
        : race.darkvision,
  }));
  return [base, ...subraces];
});

function normalizeRaceName(raceName: string) {
  return raceName.trim().toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
}

export function getRaceData(raceName: string) {
  const normalized = normalizeRaceName(raceName);
  return raceData.find((race) => {
    const raceId = normalizeRaceName(race.id);
    const raceLabel = normalizeRaceName(race.name);
    return raceId === normalized || raceLabel === normalized;
  });
}
