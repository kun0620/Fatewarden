import type { AbilityKey } from '../types';

export type DieSize = 'd6' | 'd8' | 'd10' | 'd12';
export type HitDieType = DieSize;

export type ClassSkillOption =
  | 'Acrobatics' | 'Animal Handling' | 'Arcana' | 'Athletics'
  | 'Deception' | 'History' | 'Insight' | 'Intimidation'
  | 'Investigation' | 'Medicine' | 'Nature' | 'Perception'
  | 'Performance' | 'Persuasion' | 'Religion' | 'Sleight of Hand'
  | 'Stealth' | 'Survival';

export type ArmorProficiency = 'light' | 'medium' | 'heavy' | 'shields';
export type WeaponProficiency = 'simple' | 'martial' | string;

export type ClassFeature = {
  level: number;
  name: string;
  description: string;
  /** 'short' = recovers on short rest, 'long' = long rest only */
  recoveryType?: 'short' | 'long';
  /** true = player picks from a list at level up */
  isChoice?: boolean;
};

export type SubclassOption = {
  name: string;
  description: string;
};

export type ClassDefinition = {
  id: string;
  name: string;
  description: string;
  hitDie: DieSize;
  primaryAbilities: AbilityKey[];
  savingThrows: AbilityKey[];
  armorProficiencies: ArmorProficiency[];
  weaponProficiencies: WeaponProficiency[];
  skillChoices: ClassSkillOption[];
  skillChoiceCount: number;
  startingEquipment: string[];
  features: ClassFeature[];
  subclassLevel: number;
  subclassLabel: string;
  subclasses: SubclassOption[];
  /** true = has spell slots (see spellSlots.ts) */
  isCaster: boolean;
  /** 'full' | 'half' | 'third' | 'none' */
  castingProgression: 'full' | 'half' | 'third' | 'none';
  spellcastingAbility?: AbilityKey;
};

export const classes: ClassDefinition[] = [
  // ─────────────────── BARBARIAN ───────────────────
  {
    id: 'barbarian',
    name: 'Barbarian',
    description: 'A fierce warrior who channels primal rage into devastating attacks.',
    hitDie: 'd12',
    primaryAbilities: ['str', 'con'],
    savingThrows: ['str', 'con'],
    armorProficiencies: ['light', 'medium', 'shields'],
    weaponProficiencies: ['simple', 'martial'],
    skillChoices: ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival'],
    skillChoiceCount: 2,
    startingEquipment: ['Greataxe', 'Two handaxes', 'Explorer\'s pack', '4 javelins'],
    isCaster: false,
    castingProgression: 'none',
    subclassLevel: 3,
    subclassLabel: 'Primal Path',
    subclasses: [
      { name: 'Path of the Berserker', description: 'Channel rage into frenzied melee attacks.' },
      { name: 'Path of the Totem Warrior', description: 'Form a spiritual bond with a totem animal.' },
    ],
    features: [
      { level: 1, name: 'Rage', description: 'Enter a rage as a bonus action. Gain advantage on STR checks/saves, bonus to damage, resistance to bludgeoning/piercing/slashing. Lasts 1 minute. Uses per long rest: 2 (rises with level).', recoveryType: 'long' },
      { level: 1, name: 'Unarmored Defense', description: 'AC = 10 + DEX modifier + CON modifier when not wearing armor.' },
      { level: 2, name: 'Reckless Attack', description: 'On your first attack, gain advantage on all attack rolls this turn. Attackers also have advantage against you until next turn.' },
      { level: 2, name: 'Danger Sense', description: 'Advantage on DEX saves against effects you can see.' },
      { level: 3, name: 'Primal Path', description: 'Choose your Primal Path subclass.', isChoice: true },
      { level: 4, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 5, name: 'Extra Attack', description: 'Attack twice when you take the Attack action.' },
      { level: 5, name: 'Fast Movement', description: '+10 ft speed when not wearing heavy armor.' },
      { level: 6, name: 'Path Feature', description: 'Primal Path feature.' },
      { level: 7, name: 'Feral Instinct', description: 'Advantage on initiative rolls. Can enter rage to act normally even when surprised.' },
      { level: 8, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 9, name: 'Brutal Critical', description: 'Roll one additional damage die on critical hits.' },
      { level: 10, name: 'Path Feature', description: 'Primal Path feature.' },
      { level: 11, name: 'Relentless Rage', description: 'When dropped to 0 HP while raging, make DC 10 CON save to drop to 1 HP instead (DC +5 each use per rest).', recoveryType: 'short' },
      { level: 12, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 14, name: 'Path Feature', description: 'Primal Path feature.' },
      { level: 15, name: 'Persistent Rage', description: 'Rage ends early only if you fall unconscious or choose to end it.' },
      { level: 16, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 17, name: 'Brutal Critical (2 dice)', description: 'Roll two additional damage dice on critical hits.' },
      { level: 18, name: 'Indomitable Might', description: 'STR checks always equal at least your STR score.' },
      { level: 19, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 20, name: 'Primal Champion', description: '+4 STR, +4 CON. Rage uses become unlimited.' },
    ],
  },

  // ─────────────────── BARD ───────────────────
  {
    id: 'bard',
    name: 'Bard',
    description: 'An inspiring performer whose magic flows from music, art, and stories.',
    hitDie: 'd8',
    primaryAbilities: ['cha'],
    savingThrows: ['dex', 'cha'],
    armorProficiencies: ['light'],
    weaponProficiencies: ['simple', 'hand crossbows', 'longswords', 'rapiers', 'shortswords'],
    skillChoices: ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival'],
    skillChoiceCount: 3,
    startingEquipment: ['Rapier', 'Diplomat\'s pack', 'Lute', 'Leather armor', 'Dagger'],
    isCaster: true,
    castingProgression: 'full',
    spellcastingAbility: 'cha',
    subclassLevel: 3,
    subclassLabel: 'Bard College',
    subclasses: [
      { name: 'College of Lore', description: 'Expand your knowledge and cutting words to hinder foes.' },
      { name: 'College of Valor', description: 'Inspire allies in battle and wade into combat yourself.' },
    ],
    features: [
      { level: 1, name: 'Bardic Inspiration', description: 'Bonus action: give one creature within 60 ft a Bardic Inspiration die (d6). They can add it to one ability check, attack, or save within 10 min. Uses = CHA modifier (min 1). Recovers on long rest.', recoveryType: 'long' },
      { level: 1, name: 'Spellcasting', description: 'Cast spells using CHA. Know spells from Bard list.' },
      { level: 2, name: 'Jack of All Trades', description: 'Add half proficiency bonus to ability checks you are not proficient in.' },
      { level: 2, name: 'Song of Rest', description: 'Allies regain extra HP (1d6) when spending hit dice during short rest.' },
      { level: 3, name: 'Bard College', description: 'Choose your Bard College subclass.', isChoice: true },
      { level: 3, name: 'Expertise', description: 'Choose 2 skill proficiencies; double proficiency bonus for them.', isChoice: true },
      { level: 4, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 5, name: 'Bardic Inspiration (d8)', description: 'Inspiration die becomes d8.' },
      { level: 5, name: 'Font of Inspiration', description: 'Regain Bardic Inspiration uses on short or long rest.', recoveryType: 'short' },
      { level: 6, name: 'Countercharm', description: 'Use action to perform; you and allies within 30 ft have advantage on saves vs. being frightened or charmed.' },
      { level: 6, name: 'College Feature', description: 'Bard College feature.' },
      { level: 8, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 10, name: 'Bardic Inspiration (d10)', description: 'Inspiration die becomes d10.' },
      { level: 10, name: 'Expertise', description: 'Choose 2 more skill proficiencies to double.', isChoice: true },
      { level: 10, name: 'Magical Secrets', description: 'Learn 2 spells from any class spell list.', isChoice: true },
      { level: 12, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 14, name: 'Magical Secrets', description: 'Learn 2 more spells from any class list.', isChoice: true },
      { level: 14, name: 'College Feature', description: 'Bard College feature.' },
      { level: 15, name: 'Bardic Inspiration (d12)', description: 'Inspiration die becomes d12.' },
      { level: 16, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 18, name: 'Magical Secrets', description: 'Learn 2 more spells from any class list.', isChoice: true },
      { level: 19, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 20, name: 'Superior Inspiration', description: 'Regain at least 1 Bardic Inspiration on initiative if you have none.' },
    ],
  },

  // ─────────────────── CLERIC ───────────────────
  {
    id: 'cleric',
    name: 'Cleric',
    description: 'A priestly champion who wields divine magic in service of a higher power.',
    hitDie: 'd8',
    primaryAbilities: ['wis'],
    savingThrows: ['wis', 'cha'],
    armorProficiencies: ['light', 'medium', 'shields'],
    weaponProficiencies: ['simple'],
    skillChoices: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'],
    skillChoiceCount: 2,
    startingEquipment: ['Mace', 'Scale mail', 'Light crossbow', '20 bolts', 'Priest\'s pack', 'Shield', 'Holy symbol'],
    isCaster: true,
    castingProgression: 'full',
    spellcastingAbility: 'wis',
    subclassLevel: 1,
    subclassLabel: 'Divine Domain',
    subclasses: [
      { name: 'Life Domain', description: 'Master of healing and preserving life.' },
      { name: 'Light Domain', description: 'Wield radiant light and fire.' },
      { name: 'Trickery Domain', description: 'Sow discord with illusions and deceptions.' },
      { name: 'War Domain', description: 'Excel at martial combat and inspire allies in battle.' },
      { name: 'Knowledge Domain', description: 'Learn the secrets of the world.' },
      { name: 'Nature Domain', description: 'Commune with nature and its creatures.' },
      { name: 'Tempest Domain', description: 'Command thunder, lightning, and storms.' },
    ],
    features: [
      { level: 1, name: 'Divine Domain', description: 'Choose your Divine Domain. Grants domain spells and features.', isChoice: true },
      { level: 1, name: 'Spellcasting', description: 'Prepare spells from the Cleric list using WIS. Ritual casting available.' },
      { level: 2, name: 'Channel Divinity', description: 'Use one of your Channel Divinity options. Recharges on short or long rest.', recoveryType: 'short' },
      { level: 2, name: 'Channel Divinity: Turn Undead', description: 'Undead within 30 ft must succeed on WIS save or be turned for 1 minute.' },
      { level: 2, name: 'Domain Feature', description: 'Channel Divinity option from your domain.' },
      { level: 4, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 5, name: 'Destroy Undead (CR 1/2)', description: 'Undead of CR 1/2 or lower that fail Turn Undead are destroyed.' },
      { level: 6, name: 'Channel Divinity (2/rest)', description: 'Use Channel Divinity twice per rest.' },
      { level: 6, name: 'Domain Feature', description: 'Domain feature at level 6.' },
      { level: 8, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 8, name: 'Destroy Undead (CR 1)', description: 'Destroy undead of CR 1 or lower.' },
      { level: 8, name: 'Divine Strike / Potent Spellcasting', description: 'Domain grants a bonus to damage or cantrip damage.' },
      { level: 10, name: 'Divine Intervention', description: 'Call on your deity for aid. Roll d100 ≤ cleric level = success.' },
      { level: 11, name: 'Destroy Undead (CR 2)', description: 'Destroy undead of CR 2 or lower.' },
      { level: 12, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 14, name: 'Destroy Undead (CR 3)', description: 'Destroy undead of CR 3 or lower.' },
      { level: 16, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 17, name: 'Destroy Undead (CR 4)', description: 'Destroy undead of CR 4 or lower.' },
      { level: 17, name: 'Domain Feature', description: 'Domain feature at level 17.' },
      { level: 18, name: 'Channel Divinity (3/rest)', description: 'Use Channel Divinity three times per rest.' },
      { level: 19, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 20, name: 'Divine Intervention (Guaranteed)', description: 'Divine Intervention always succeeds.' },
    ],
  },

  // ─────────────────── DRUID ───────────────────
  {
    id: 'druid',
    name: 'Druid',
    description: 'A priest of the Old Faith wielding nature\'s magic and able to transform into animals.',
    hitDie: 'd8',
    primaryAbilities: ['wis'],
    savingThrows: ['int', 'wis'],
    armorProficiencies: ['light', 'medium', 'shields'],
    weaponProficiencies: ['clubs', 'daggers', 'darts', 'javelins', 'maces', 'quarterstaffs', 'scimitars', 'sickles', 'slings', 'spears'],
    skillChoices: ['Arcana', 'Animal Handling', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'],
    skillChoiceCount: 2,
    startingEquipment: ['Wooden shield', 'Scimitar', 'Leather armor', 'Explorer\'s pack', 'Druidic focus'],
    isCaster: true,
    castingProgression: 'full',
    spellcastingAbility: 'wis',
    subclassLevel: 2,
    subclassLabel: 'Druid Circle',
    subclasses: [
      { name: 'Circle of the Land', description: 'Draw power from a natural environment; recover spell slots on short rest.' },
      { name: 'Circle of the Moon', description: 'Transform into powerful beasts and elemental forms.' },
    ],
    features: [
      { level: 1, name: 'Druidic', description: 'Secret language known only to druids.' },
      { level: 1, name: 'Spellcasting', description: 'Prepare spells from the Druid list using WIS.' },
      { level: 2, name: 'Wild Shape', description: 'Use action to transform into a beast. CR limit rises by level. Uses = 2, recover on short rest.', recoveryType: 'short' },
      { level: 2, name: 'Druid Circle', description: 'Choose your Druid Circle subclass.', isChoice: true },
      { level: 4, name: 'Wild Shape Improvement (CR 1/2 swim)', description: 'Wild Shape allows swimming speed.' },
      { level: 4, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 8, name: 'Wild Shape Improvement (CR 1 fly)', description: 'Wild Shape allows flying speed.' },
      { level: 8, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 10, name: 'Circle Feature', description: 'Druid Circle feature at level 10.' },
      { level: 12, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 14, name: 'Circle Feature', description: 'Druid Circle feature at level 14.' },
      { level: 16, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 18, name: 'Timeless Body', description: 'Age 10× slower; immune to magical aging.' },
      { level: 18, name: 'Beast Spells', description: 'Cast druid spells in Wild Shape form.' },
      { level: 19, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 20, name: 'Archdruid', description: 'Unlimited Wild Shape uses.' },
    ],
  },

  // ─────────────────── FIGHTER ───────────────────
  {
    id: 'fighter',
    name: 'Fighter',
    description: 'A master of martial combat, skilled with a variety of weapons and armor.',
    hitDie: 'd10',
    primaryAbilities: ['str', 'dex'],
    savingThrows: ['str', 'con'],
    armorProficiencies: ['light', 'medium', 'heavy', 'shields'],
    weaponProficiencies: ['simple', 'martial'],
    skillChoices: ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival'],
    skillChoiceCount: 2,
    startingEquipment: ['Chain mail', 'Longsword', 'Shield', 'Light crossbow', '20 bolts', 'Dungeoneer\'s pack'],
    isCaster: false,
    castingProgression: 'none',
    subclassLevel: 3,
    subclassLabel: 'Martial Archetype',
    subclasses: [
      { name: 'Champion', description: 'Hone your combat prowess to perfection. Critical hits on 19–20.' },
      { name: 'Battle Master', description: 'Use combat maneuvers to gain a tactical edge.' },
      { name: 'Eldritch Knight', description: 'Combine martial mastery with wizard spellcasting.' },
    ],
    features: [
      { level: 1, name: 'Fighting Style', description: 'Choose a fighting style: Archery, Defense, Dueling, Great Weapon Fighting, Protection, or Two-Weapon Fighting.', isChoice: true },
      { level: 1, name: 'Second Wind', description: 'Bonus action: regain 1d10 + Fighter level HP. Recovers on short or long rest.', recoveryType: 'short' },
      { level: 2, name: 'Action Surge', description: 'Take one additional action on your turn. Recovers on short or long rest.', recoveryType: 'short' },
      { level: 3, name: 'Martial Archetype', description: 'Choose your Martial Archetype subclass.', isChoice: true },
      { level: 4, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 5, name: 'Extra Attack', description: 'Attack twice per Attack action.' },
      { level: 6, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 7, name: 'Archetype Feature', description: 'Martial Archetype feature.' },
      { level: 8, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 9, name: 'Indomitable', description: 'Reroll a failed saving throw. Must use the new roll. Uses = 1 (more at higher levels), recover on long rest.', recoveryType: 'long' },
      { level: 10, name: 'Archetype Feature', description: 'Martial Archetype feature.' },
      { level: 11, name: 'Extra Attack (3)', description: 'Attack three times per Attack action.' },
      { level: 12, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 13, name: 'Indomitable (2/rest)', description: 'Use Indomitable twice per long rest.' },
      { level: 14, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 15, name: 'Archetype Feature', description: 'Martial Archetype feature.' },
      { level: 16, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 17, name: 'Action Surge (2/rest)', description: 'Use Action Surge twice per short rest.' },
      { level: 17, name: 'Indomitable (3/rest)', description: 'Use Indomitable three times per long rest.' },
      { level: 18, name: 'Archetype Feature', description: 'Martial Archetype feature.' },
      { level: 19, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 20, name: 'Extra Attack (4)', description: 'Attack four times per Attack action.' },
    ],
  },

  // ─────────────────── MONK ───────────────────
  {
    id: 'monk',
    name: 'Monk',
    description: 'A master of martial arts who channels ki to perform superhuman feats.',
    hitDie: 'd8',
    primaryAbilities: ['dex', 'wis'],
    savingThrows: ['str', 'dex'],
    armorProficiencies: [],
    weaponProficiencies: ['simple', 'shortswords'],
    skillChoices: ['Acrobatics', 'Athletics', 'History', 'Insight', 'Religion', 'Stealth'],
    skillChoiceCount: 2,
    startingEquipment: ['Shortsword', 'Dungeoneer\'s pack', '10 darts'],
    isCaster: false,
    castingProgression: 'none',
    subclassLevel: 3,
    subclassLabel: 'Monastic Tradition',
    subclasses: [
      { name: 'Way of the Open Hand', description: 'Master unarmed combat and learn to manipulate ki.' },
      { name: 'Way of Shadow', description: 'Blend stealth and ki to become a living shadow.' },
      { name: 'Way of the Four Elements', description: 'Bend the elements to your will using ki.' },
    ],
    features: [
      { level: 1, name: 'Unarmored Defense', description: 'AC = 10 + DEX modifier + WIS modifier when not wearing armor.' },
      { level: 1, name: 'Martial Arts', description: 'Use DEX for unarmed strikes and monk weapons. Unarmed die: d4 (rises with level). Bonus action unarmed strike after Attack action.' },
      { level: 2, name: 'Ki', description: 'Ki points = Monk level. Spend ki for: Flurry of Blows, Patient Defense, Step of the Wind. Recover on short rest.', recoveryType: 'short' },
      { level: 2, name: 'Unarmored Movement', description: '+10 ft speed when not wearing armor (+5 ft per tier).' },
      { level: 3, name: 'Monastic Tradition', description: 'Choose your Monastic Tradition subclass.', isChoice: true },
      { level: 3, name: 'Deflect Missiles', description: 'Reaction: reduce ranged weapon damage by 1d10 + DEX + Monk level. If reduced to 0, catch and throw the missile.' },
      { level: 4, name: 'Slow Fall', description: 'Reaction: reduce falling damage by 5× Monk level.' },
      { level: 4, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 5, name: 'Extra Attack', description: 'Attack twice per Attack action.' },
      { level: 5, name: 'Stunning Strike', description: 'Spend 1 ki after hitting: target must CON save (DC = 8 + proficiency + WIS) or be stunned until end of your next turn.' },
      { level: 6, name: 'Ki-Empowered Strikes', description: 'Unarmed strikes count as magical.' },
      { level: 7, name: 'Evasion', description: 'On DEX save that halves damage: succeed = no damage, fail = half damage.' },
      { level: 7, name: 'Stillness of Mind', description: 'Action: end one charmed or frightened condition on yourself.' },
      { level: 8, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 9, name: 'Unarmored Movement (walls)', description: 'Move along vertical surfaces and across liquids without falling during movement.' },
      { level: 10, name: 'Purity of Body', description: 'Immune to disease and poison.' },
      { level: 11, name: 'Tradition Feature', description: 'Monastic Tradition feature.' },
      { level: 12, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 13, name: 'Tongue of the Sun and Moon', description: 'Understand all spoken languages; all creatures understand you.' },
      { level: 14, name: 'Diamond Soul', description: 'Proficient in all saving throws. Spend 1 ki to reroll a failed save.' },
      { level: 15, name: 'Timeless Body', description: 'No longer suffer penalties from aging; cannot be magically aged.' },
      { level: 16, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 18, name: 'Empty Body', description: 'Spend 4 ki: invisible for 1 min, resistance to all damage except force. Spend 8 ki: Astral Projection.' },
      { level: 19, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 20, name: 'Perfect Self', description: 'Regain 4 ki on initiative if you have none.' },
    ],
  },

  // ─────────────────── PALADIN ───────────────────
  {
    id: 'paladin',
    name: 'Paladin',
    description: 'A holy warrior bound by a sacred oath who smites foes with divine power.',
    hitDie: 'd10',
    primaryAbilities: ['str', 'cha'],
    savingThrows: ['wis', 'cha'],
    armorProficiencies: ['light', 'medium', 'heavy', 'shields'],
    weaponProficiencies: ['simple', 'martial'],
    skillChoices: ['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'],
    skillChoiceCount: 2,
    startingEquipment: ['Chain mail', 'Longsword', 'Shield', 'Javelin ×5', 'Priest\'s pack', 'Holy symbol'],
    isCaster: true,
    castingProgression: 'half',
    spellcastingAbility: 'cha',
    subclassLevel: 3,
    subclassLabel: 'Sacred Oath',
    subclasses: [
      { name: 'Oath of Devotion', description: 'The classic holy warrior archetype. Protect the innocent.' },
      { name: 'Oath of the Ancients', description: 'Protect the light of life and the beauty of nature.' },
      { name: 'Oath of Vengeance', description: 'Hunt down and punish those who commit great evils.' },
      { name: 'Oathbreaker', description: 'Fallen paladin who serves darkness (DM option).' },
    ],
    features: [
      { level: 1, name: 'Divine Sense', description: 'Action: know locations of celestials, fiends, undead within 60 ft until end of next turn. Uses = 1 + CHA modifier, recover on long rest.', recoveryType: 'long' },
      { level: 1, name: 'Lay on Hands', description: 'Pool of HP = 5 × Paladin level. Use action to restore HP or cure disease/poison (5 HP from pool).', recoveryType: 'long' },
      { level: 2, name: 'Fighting Style', description: 'Choose Defense, Dueling, Great Weapon Fighting, or Protection.', isChoice: true },
      { level: 2, name: 'Spellcasting', description: 'Prepare and cast Paladin spells using CHA.' },
      { level: 2, name: 'Divine Smite', description: 'After hitting with melee weapon, spend a spell slot: deal extra 2d8 radiant (+ 1d8 per slot level above 1st, + 1d8 vs undead/fiends).' },
      { level: 3, name: 'Divine Health', description: 'Immune to disease.' },
      { level: 3, name: 'Sacred Oath', description: 'Choose your Sacred Oath subclass.', isChoice: true },
      { level: 4, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 5, name: 'Extra Attack', description: 'Attack twice per Attack action.' },
      { level: 6, name: 'Aura of Protection', description: 'Allies within 10 ft (including you) add CHA modifier to saving throws (min +1).' },
      { level: 7, name: 'Sacred Oath Feature', description: 'Oath feature at level 7.' },
      { level: 8, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 10, name: 'Aura of Courage', description: 'Allies within 10 ft (including you) cannot be frightened.' },
      { level: 11, name: 'Improved Divine Smite', description: 'Always deal extra 1d8 radiant on melee hits.' },
      { level: 12, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 14, name: 'Cleansing Touch', description: 'Action: end one spell on yourself or willing ally. Uses = CHA modifier, recover on long rest.', recoveryType: 'long' },
      { level: 15, name: 'Sacred Oath Feature', description: 'Oath feature at level 15.' },
      { level: 16, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 18, name: 'Aura improvements (30 ft)', description: 'Aura of Protection and Courage expand to 30 ft.' },
      { level: 19, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 20, name: 'Sacred Oath Capstone', description: 'Oath capstone feature.' },
    ],
  },

  // ─────────────────── RANGER ───────────────────
  {
    id: 'ranger',
    name: 'Ranger',
    description: 'A warrior who uses martial prowess and nature magic to combat threats on the frontier.',
    hitDie: 'd10',
    primaryAbilities: ['dex', 'wis'],
    savingThrows: ['str', 'dex'],
    armorProficiencies: ['light', 'medium', 'shields'],
    weaponProficiencies: ['simple', 'martial'],
    skillChoices: ['Animal Handling', 'Athletics', 'Insight', 'Investigation', 'Nature', 'Perception', 'Stealth', 'Survival'],
    skillChoiceCount: 3,
    startingEquipment: ['Scale mail', 'Shortswords ×2', 'Dungeoneer\'s pack', 'Longbow', '20 arrows'],
    isCaster: true,
    castingProgression: 'half',
    spellcastingAbility: 'wis',
    subclassLevel: 3,
    subclassLabel: 'Ranger Archetype',
    subclasses: [
      { name: 'Hunter', description: 'Specialize in fighting powerful monsters with lethal techniques.' },
      { name: 'Beast Master', description: 'Form a magical bond with a beast companion.' },
    ],
    features: [
      { level: 1, name: 'Favored Enemy', description: 'Choose a favored enemy type (aberrations, beasts, celestials, constructs, dragons, elementals, fey, fiends, giants, monstrosities, oozes, plants, undead, or 2 humanoid races). Advantage on Survival to track and Intelligence to recall info about them.', isChoice: true },
      { level: 1, name: 'Natural Explorer', description: 'Choose a favored terrain. Gain benefits in that terrain: difficult terrain doesn\'t slow travel, can\'t become lost by nonmagical means, and more.', isChoice: true },
      { level: 2, name: 'Fighting Style', description: 'Choose Archery, Defense, Dueling, or Two-Weapon Fighting.', isChoice: true },
      { level: 2, name: 'Spellcasting', description: 'Cast ranger spells using WIS.' },
      { level: 3, name: 'Ranger Archetype', description: 'Choose your Ranger Archetype subclass.', isChoice: true },
      { level: 3, name: 'Primeval Awareness', description: 'Spend a spell slot to sense types of favored enemies within 1 mile (6 miles in favored terrain) for 1 min per slot level.' },
      { level: 4, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 5, name: 'Extra Attack', description: 'Attack twice per Attack action.' },
      { level: 6, name: 'Favored Enemy and Terrain (additional)', description: 'Choose an additional favored enemy and terrain.', isChoice: true },
      { level: 7, name: 'Archetype Feature', description: 'Ranger Archetype feature.' },
      { level: 8, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 8, name: 'Land\'s Stride', description: 'Move through nonmagical difficult terrain without penalty; advantage on saves vs. plants that impede movement.' },
      { level: 10, name: 'Natural Explorer (third terrain)', description: 'Choose a third favored terrain.', isChoice: true },
      { level: 10, name: 'Hide in Plain Sight', description: 'Spend 1 min camouflaging yourself: +10 to Stealth while stationary.' },
      { level: 11, name: 'Archetype Feature', description: 'Ranger Archetype feature.' },
      { level: 12, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 14, name: 'Favored Enemy (third)', description: 'Choose a third favored enemy.', isChoice: true },
      { level: 14, name: 'Vanish', description: 'Hide as a bonus action. Can\'t be tracked by nonmagical means.' },
      { level: 15, name: 'Archetype Feature', description: 'Ranger Archetype feature.' },
      { level: 16, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 18, name: 'Feral Senses', description: 'No disadvantage attacking invisible creatures; aware of invisible creatures within 30 ft.' },
      { level: 19, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 20, name: 'Foe Slayer', description: 'Add WIS modifier to attack or damage roll vs. favored enemies once per turn.' },
    ],
  },

  // ─────────────────── ROGUE ───────────────────
  {
    id: 'rogue',
    name: 'Rogue',
    description: 'A scoundrel who uses stealth and trickery to overcome obstacles and enemies.',
    hitDie: 'd8',
    primaryAbilities: ['dex'],
    savingThrows: ['dex', 'int'],
    armorProficiencies: ['light'],
    weaponProficiencies: ['simple', 'hand crossbows', 'longswords', 'rapiers', 'shortswords'],
    skillChoices: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'],
    skillChoiceCount: 4,
    startingEquipment: ['Rapier', 'Shortbow', '20 arrows', 'Burglar\'s pack', 'Leather armor', 'Two daggers', 'Thieves\' tools'],
    isCaster: false,
    castingProgression: 'none',
    subclassLevel: 3,
    subclassLabel: 'Roguish Archetype',
    subclasses: [
      { name: 'Thief', description: 'Hone your larcenous skills to near-perfection.' },
      { name: 'Assassin', description: 'Eliminate targets with deadly precision and disguise.' },
      { name: 'Arcane Trickster', description: 'Augment physical skills with illusion and enchantment magic.' },
    ],
    features: [
      { level: 1, name: 'Expertise', description: 'Choose 2 skill proficiencies (or thieves\' tools): double proficiency bonus.', isChoice: true },
      { level: 1, name: 'Sneak Attack', description: 'Once per turn, add extra damage (d6 per 2 Rogue levels) to an attack if you have advantage or an ally is adjacent to the target.' },
      { level: 1, name: 'Thieves\' Cant', description: 'Secret language of rogues; convey hidden messages in conversation.' },
      { level: 2, name: 'Cunning Action', description: 'Bonus action to Dash, Disengage, or Hide.' },
      { level: 3, name: 'Roguish Archetype', description: 'Choose your Roguish Archetype subclass.', isChoice: true },
      { level: 4, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 5, name: 'Uncanny Dodge', description: 'Reaction: halve the damage of one attack that you can see.' },
      { level: 6, name: 'Expertise (2 more)', description: 'Choose 2 more skills to double proficiency.', isChoice: true },
      { level: 7, name: 'Evasion', description: 'On DEX save that halves damage: succeed = no damage, fail = half.' },
      { level: 8, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 9, name: 'Archetype Feature', description: 'Roguish Archetype feature.' },
      { level: 10, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 11, name: 'Reliable Talent', description: 'Treat any d20 roll below 10 as a 10 for ability checks you are proficient in.' },
      { level: 12, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 13, name: 'Archetype Feature', description: 'Roguish Archetype feature.' },
      { level: 14, name: 'Blindsense', description: 'Aware of hidden/invisible creatures within 10 ft.' },
      { level: 15, name: 'Slippery Mind', description: 'Gain proficiency in WIS saving throws.' },
      { level: 16, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 17, name: 'Archetype Feature', description: 'Roguish Archetype feature.' },
      { level: 18, name: 'Elusive', description: 'Attackers never have advantage against you while you are not incapacitated.' },
      { level: 19, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 20, name: 'Stroke of Luck', description: 'Turn a missed attack into a hit or a failed ability check into a 20. Recover on short or long rest.', recoveryType: 'short' },
    ],
  },

  // ─────────────────── SORCERER ───────────────────
  {
    id: 'sorcerer',
    name: 'Sorcerer',
    description: 'A spellcaster who draws on inherent magic from a gift or bloodline.',
    hitDie: 'd6',
    primaryAbilities: ['cha'],
    savingThrows: ['con', 'cha'],
    armorProficiencies: [],
    weaponProficiencies: ['daggers', 'darts', 'slings', 'quarterstaffs', 'light crossbows'],
    skillChoices: ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion'],
    skillChoiceCount: 2,
    startingEquipment: ['Light crossbow', '20 bolts', 'Arcane focus', 'Dungeoneer\'s pack', 'Two daggers'],
    isCaster: true,
    castingProgression: 'full',
    spellcastingAbility: 'cha',
    subclassLevel: 1,
    subclassLabel: 'Sorcerous Origin',
    subclasses: [
      { name: 'Draconic Bloodline', description: 'Magic flows from draconic ancestry, granting resilience and elemental power.' },
      { name: 'Wild Magic', description: 'Magic surges chaotically from wild forces, causing random effects.' },
    ],
    features: [
      { level: 1, name: 'Spellcasting', description: 'Cast sorcerer spells using CHA. Know a limited number of spells.' },
      { level: 1, name: 'Sorcerous Origin', description: 'Choose your Sorcerous Origin subclass.', isChoice: true },
      { level: 2, name: 'Font of Magic', description: 'Gain Sorcery Points = Sorcerer level. Spend to create spell slots or use Metamagic. Recover on long rest.', recoveryType: 'long' },
      { level: 3, name: 'Metamagic', description: 'Choose 2 Metamagic options: Careful, Distant, Empowered, Extended, Heightened, Quickened, Subtle, Twinned.', isChoice: true },
      { level: 4, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 6, name: 'Origin Feature', description: 'Sorcerous Origin feature.' },
      { level: 8, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 10, name: 'Metamagic (3rd option)', description: 'Choose one additional Metamagic option.', isChoice: true },
      { level: 12, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 14, name: 'Origin Feature', description: 'Sorcerous Origin feature.' },
      { level: 16, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 17, name: 'Metamagic (4th option)', description: 'Choose one additional Metamagic option.', isChoice: true },
      { level: 18, name: 'Origin Feature', description: 'Sorcerous Origin feature.' },
      { level: 19, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 20, name: 'Sorcerous Restoration', description: 'Regain 4 Sorcery Points on short rest.', recoveryType: 'short' },
    ],
  },

  // ─────────────────── WARLOCK ───────────────────
  {
    id: 'warlock',
    name: 'Warlock',
    description: 'A wielder of magic derived from a bargain with an extraplanar entity.',
    hitDie: 'd8',
    primaryAbilities: ['cha'],
    savingThrows: ['wis', 'cha'],
    armorProficiencies: ['light'],
    weaponProficiencies: ['simple'],
    skillChoices: ['Arcana', 'Deception', 'History', 'Intimidation', 'Investigation', 'Nature', 'Religion'],
    skillChoiceCount: 2,
    startingEquipment: ['Light crossbow', '20 bolts', 'Arcane focus', 'Scholar\'s pack', 'Leather armor', 'Any simple weapon', 'Two daggers'],
    isCaster: true,
    castingProgression: 'full',
    spellcastingAbility: 'cha',
    subclassLevel: 1,
    subclassLabel: 'Otherworldly Patron',
    subclasses: [
      { name: 'The Archfey', description: 'Bargained with a lord of the fey; wield enchantment and fear.' },
      { name: 'The Fiend', description: 'Pact with a powerful devil or demon; deal fire damage and gain temporary HP.' },
      { name: 'The Great Old One', description: 'Patron is an alien entity; gain telepathy and forbidden knowledge.' },
    ],
    features: [
      { level: 1, name: 'Otherworldly Patron', description: 'Choose your Patron subclass.', isChoice: true },
      { level: 1, name: 'Pact Magic', description: 'Cast warlock spells using CHA. Spell slots = 1 (rises to 2–4 at higher levels); all slots are the same level (rises with level). Recover on short rest.', recoveryType: 'short' },
      { level: 2, name: 'Eldritch Invocations', description: 'Choose 2 Eldritch Invocations (passive or active boons).', isChoice: true },
      { level: 3, name: 'Pact Boon', description: 'Choose: Pact of the Chain (familiar), Pact of the Blade (magical weapon), or Pact of the Tome (spellbook).', isChoice: true },
      { level: 4, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 5, name: 'Eldritch Invocations (+1)', description: 'Learn one additional Eldritch Invocation.', isChoice: true },
      { level: 6, name: 'Patron Feature', description: 'Otherworldly Patron feature.' },
      { level: 7, name: 'Eldritch Invocations (+1)', description: 'Learn one additional Eldritch Invocation.', isChoice: true },
      { level: 8, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 9, name: 'Eldritch Invocations (+1)', description: 'Learn one additional Eldritch Invocation.', isChoice: true },
      { level: 10, name: 'Patron Feature', description: 'Otherworldly Patron feature.' },
      { level: 11, name: 'Mystic Arcanum (6th level)', description: 'Cast a 6th-level spell once per long rest without expending a slot.', recoveryType: 'long' },
      { level: 11, name: 'Eldritch Invocations (+1)', description: 'Learn one additional Eldritch Invocation.', isChoice: true },
      { level: 12, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 13, name: 'Mystic Arcanum (7th level)', description: 'Cast a 7th-level spell once per long rest.', recoveryType: 'long' },
      { level: 15, name: 'Mystic Arcanum (8th level)', description: 'Cast an 8th-level spell once per long rest.', recoveryType: 'long' },
      { level: 15, name: 'Patron Feature', description: 'Otherworldly Patron feature.' },
      { level: 16, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 17, name: 'Mystic Arcanum (9th level)', description: 'Cast a 9th-level spell once per long rest.', recoveryType: 'long' },
      { level: 19, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 20, name: 'Eldritch Master', description: 'Spend 1 minute entreating your patron to regain all Pact Magic slots. Once per long rest.', recoveryType: 'long' },
    ],
  },

  // ─────────────────── WIZARD ───────────────────
  {
    id: 'wizard',
    name: 'Wizard',
    description: 'A scholarly magic-user who masters spells through intense study and a spellbook.',
    hitDie: 'd6',
    primaryAbilities: ['int'],
    savingThrows: ['int', 'wis'],
    armorProficiencies: [],
    weaponProficiencies: ['daggers', 'darts', 'slings', 'quarterstaffs', 'light crossbows'],
    skillChoices: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'],
    skillChoiceCount: 2,
    startingEquipment: ['Quarterstaff', 'Spellbook', 'Scholar\'s pack', 'Arcane focus'],
    isCaster: true,
    castingProgression: 'full',
    spellcastingAbility: 'int',
    subclassLevel: 2,
    subclassLabel: 'Arcane Tradition',
    subclasses: [
      { name: 'School of Evocation', description: 'Sculpt destructive spells to protect allies.' },
      { name: 'School of Abjuration', description: 'Master protective and warding magic.' },
      { name: 'School of Conjuration', description: 'Transport objects and summon creatures.' },
      { name: 'School of Divination', description: 'Peer into the future and unravel secrets.' },
      { name: 'School of Enchantment', description: 'Bend minds and manipulate behavior.' },
      { name: 'School of Illusion', description: 'Weave phantasms to deceive and manipulate.' },
      { name: 'School of Necromancy', description: 'Manipulate the line between life and death.' },
      { name: 'School of Transmutation', description: 'Transform matter and creatures.' },
    ],
    features: [
      { level: 1, name: 'Spellcasting', description: 'Cast wizard spells using INT. Ritual casting from spellbook.' },
      { level: 1, name: 'Arcane Recovery', description: 'Once per day after short rest: recover spell slots totalling up to half Wizard level (rounded up). No slot above 5th.', recoveryType: 'short' },
      { level: 2, name: 'Arcane Tradition', description: 'Choose your Arcane Tradition subclass.', isChoice: true },
      { level: 4, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 6, name: 'Tradition Feature', description: 'Arcane Tradition feature.' },
      { level: 8, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 10, name: 'Tradition Feature', description: 'Arcane Tradition feature.' },
      { level: 12, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 14, name: 'Tradition Feature', description: 'Arcane Tradition feature.' },
      { level: 16, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 18, name: 'Spell Mastery', description: 'Choose one 1st-level and one 2nd-level spell; cast them without expending a slot.', isChoice: true },
      { level: 19, name: 'Ability Score Improvement', description: '+2 to one ability score, or +1 to two scores.', isChoice: true },
      { level: 20, name: 'Signature Spell', description: 'Choose two 3rd-level spells as signature spells; always prepared and each castable once without a slot per short rest.', recoveryType: 'short' },
    ],
  },
];

export function getClassById(id: string): ClassDefinition | undefined {
  return classes.find((c) => c.id === id);
}

export function getClassByName(name: string): ClassDefinition | undefined {
  return classes.find((c) => c.name.toLowerCase() === name.toLowerCase());
}

export function getFeaturesAtLevel(classId: string, level: number): ClassFeature[] {
  return getClassById(classId)?.features.filter((f) => f.level === level) ?? [];
}

export function getAllFeaturesUpToLevel(classId: string, level: number): ClassFeature[] {
  return getClassById(classId)?.features.filter((f) => f.level <= level) ?? [];
}

export function normalizeClassName(className: string) {
  return className.trim().toLowerCase();
}

export type ClassData = {
  id: string;
  name: string;
  hitDie: HitDieType;
  savingThrowProficiencies: AbilityKey[];
  featuresByLevel: Partial<Record<number, string[]>>;
  isCaster: boolean;
};

export const classData: ClassData[] = classes.map((classDef) => {
  const featuresByLevel = classDef.features.reduce<Partial<Record<number, string[]>>>((acc, feature) => {
    if (!acc[feature.level]) acc[feature.level] = [];
    acc[feature.level]?.push(feature.name);
    return acc;
  }, {});

  return {
    id: classDef.id,
    name: classDef.name,
    hitDie: classDef.hitDie,
    savingThrowProficiencies: classDef.savingThrows,
    featuresByLevel,
    isCaster: classDef.isCaster,
  };
});

export function getClassData(className: string) {
  const normalized = normalizeClassName(className);
  return classData.find((item) => item.id === normalized || item.name.toLowerCase() === normalized);
}
