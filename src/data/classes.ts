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
  id?: string;
  name: string;
  description: string;
  features?: ClassFeature[];
  spells?: string[];
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
      {
        id: 'path_of_the_world_tree',
        name: 'Path of the World Tree',
        description: 'Draw primal power from the cosmic tree that links worlds and shelters allies.',
        features: [
          { level: 3, name: 'Vitality of the Tree', description: 'While raging, call on world-tree vitality to protect yourself or an ally with restorative primal energy.' },
          { level: 6, name: 'Branches of the Tree', description: 'Use spectral branches to pull creatures through space and reshape the battlefield around your rage.' },
          { level: 10, name: 'Battering Roots', description: 'Your roots extend your reach and let your weapon strikes push, topple, or reposition enemies.' },
          { level: 14, name: 'Travel Along the Tree', description: 'Step through the World Tree to teleport yourself and allies to tactically powerful positions.' },
        ],
      },
      {
        id: 'path_of_the_wild_heart',
        name: 'Path of the Wild Heart',
        description: 'Bond with primal animal spirits and let their instincts shape each rage.',
        features: [
          { level: 3, name: 'Animal Speaker', description: 'Commune with beasts and primal spirits through ritual magic and instinctive understanding.' },
          { level: 3, name: 'Rage of the Wilds', description: 'Choose a wild aspect when you rage, gaining an animal-inspired combat benefit.' },
          { level: 6, name: 'Animal Fury', description: 'Deepen your animal aspect to gain a movement, survival, or combat adaptation.' },
          { level: 10, name: 'Greater Rage of the Wilds', description: 'Your rage calls stronger animal magic, expanding the benefits of your chosen aspect.' },
          { level: 14, name: 'Indomitable Beast', description: 'Your primal spirit hardens against control, fear, and battlefield disruption.' },
        ],
      },
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
      {
        id: 'college_of_dance',
        name: 'College of Dance',
        description: 'Channel magic through movement, rhythm, and impossible footwork.',
        features: [
          { level: 3, name: 'Dazzling Footwork', description: 'Your unarmored movement and performance-honed agility turn dance into defense and offense.' },
          { level: 3, name: 'Inspiring Movement', description: 'Spend Bardic Inspiration to move with an ally, letting rhythm carry the party out of danger.' },
          { level: 6, name: 'Tandem Footwork', description: 'Guide your companions through coordinated motion, improving initiative and battlefield timing.' },
          { level: 14, name: 'Leading Evasion', description: 'Your movement lets you and nearby allies slip through dangerous effects with uncanny grace.' },
        ],
      },
      {
        id: 'college_of_glamour',
        name: 'College of Glamour',
        description: 'Weave fey grandeur and beguiling presence into every performance.',
        features: [
          { level: 3, name: 'Mantle of Inspiration', description: 'Spend Bardic Inspiration to grant temporary vitality and movement to chosen allies.' },
          { level: 3, name: 'Enthralling Performance', description: 'After performing, charm an audience and turn admirers into helpful contacts.' },
          { level: 6, name: 'Mantle of Majesty', description: 'Wrap yourself in fey authority and command creatures with supernatural presence.' },
          { level: 14, name: 'Unbreakable Majesty', description: 'Your majestic aura makes enemies hesitate to attack and punishes those who defy your presence.' },
        ],
      },
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
      {
        id: 'death_domain',
        name: 'Death Domain',
        description: 'Command necrotic power, reap life force, and turn divine wrath toward death itself.',
        features: [
          { level: 1, name: 'Reaper', description: 'Learn a necromancy cantrip from any spell list and target two nearby creatures when casting certain necromancy cantrips.' },
          { level: 1, name: 'Bonus Proficiencies', description: 'Gain proficiency with martial weapons and heavy armor.' },
          { level: 2, name: 'Channel Divinity: Touch of Death', description: 'When you hit a creature with a melee attack, Channel Divinity adds necrotic damage equal to 5 + twice your cleric level.', recoveryType: 'short' },
          { level: 6, name: 'Inescapable Destruction', description: 'Your necrotic damage from cleric spells and Channel Divinity ignores resistance to necrotic damage.' },
          { level: 8, name: 'Divine Strike (Necrotic)', description: 'Once on each of your turns, add necrotic damage to a weapon hit. The bonus increases at higher level.' },
          { level: 17, name: 'Improved Reaper', description: 'When casting certain necromancy spells that target one creature, also target a second nearby creature.' },
        ],
      },
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
      {
        id: 'psi_warrior',
        name: 'Psi Warrior',
        description: 'Awaken psionic talent to shield allies, empower strikes, and move objects with thought.',
        features: [
          { level: 3, name: 'Psionic Power', description: 'Gain a Psionic Energy dice pool equal to your proficiency bonus. Dice begin as d6 and improve to d8, d10, then d12 as you level.' },
          { level: 3, name: 'Protective Field', description: 'Use a Psionic Energy die to reduce damage taken by a nearby creature.' },
          { level: 3, name: 'Psionic Strike', description: 'After hitting with a weapon attack, expend a Psionic Energy die to deal extra force damage.' },
          { level: 3, name: 'Telekinetic Movement', description: 'Move an object or willing creature with telekinetic force.' },
          { level: 7, name: 'Telekinetic Adept', description: 'Your psionic discipline expands into aerial movement and forceful control.' },
          { level: 7, name: 'Psi-Powered Leap', description: 'Propel yourself with psionic force, gaining a flying speed for the turn.' },
          { level: 7, name: 'Telekinetic Thrust', description: 'When Psionic Strike damages a target, force it to resist being knocked prone or pushed.' },
          { level: 10, name: 'Guarded Mind', description: 'Gain resistance to psychic damage and expend a Psionic Energy die to end charmed or frightened on yourself.' },
          { level: 15, name: 'Bulwark of Force', description: 'Project a psionic barrier that grants half-cover to yourself and nearby allies.' },
          { level: 18, name: 'Telekinetic Master', description: 'Cast telekinesis through psionic mastery and make a weapon attack as part of sustaining the power.' },
        ],
      },
      {
        id: 'rune_knight',
        name: 'Rune Knight',
        description: 'Carve giant runes into your gear and swell with ancient giant might.',
        features: [
          { level: 3, name: 'Bonus Proficiencies', description: 'Gain proficiency with smith\'s tools and learn to speak, read, and write Giant.' },
          { level: 3, name: 'Rune Carver', description: 'Learn two runes from Cloud, Fire, Frost, Hill, Stone, and Storm. Your known runes increase to three, then four at higher levels.' },
          { level: 3, name: 'Giant\'s Might', description: 'As a bonus action, become Large if space allows and deal an extra 1d6 damage once each turn while empowered.' },
          { level: 7, name: 'Runic Shield', description: 'Use your reaction to force a reroll when a nearby ally is hit by an attack roll.' },
          { level: 10, name: 'Great Stature', description: 'Your giant magic permanently increases your stature and Giant\'s Might bonus damage becomes 1d4 stronger.' },
          { level: 15, name: 'Master of Runes', description: 'You can invoke each rune you know twice per short or long rest instead of once.' },
          { level: 18, name: 'Runic Juggernaut', description: 'Giant\'s Might can make you Huge, increases your reach, and raises bonus damage to 1d8.' },
        ],
      },
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
      {
        id: 'oath_of_glory',
        name: 'Oath of Glory',
        description: 'Swear to pursue heroic excellence and inspire companions through legendary deeds.',
        spells: ['guiding bolt', 'heroism', 'enhance ability', 'magic weapon', 'haste', 'protection from energy', 'compulsion', 'freedom of movement', 'legend lore', 'commune'],
        features: [
          { level: 3, name: 'Oath Spells', description: 'Gain oath spells: guiding bolt, heroism, enhance ability, magic weapon, haste, protection from energy, compulsion, freedom of movement, legend lore, and commune.' },
          { level: 3, name: 'Channel Divinity: Inspiring Smite', description: 'After Divine Smite, distribute healing aura energy equal to 2d8 + your paladin level among nearby allies.', recoveryType: 'short' },
          { level: 3, name: 'Channel Divinity: Peerless Athlete', description: 'As an action, gain advantage on Athletics and Acrobatics checks, double carrying capacity, and double jump distance for 10 minutes.', recoveryType: 'short' },
          { level: 7, name: 'Aura of Alacrity', description: 'Your speed increases by 10 ft. Allies starting their turn within your 5 ft aura also gain +10 ft speed for that turn.' },
          { level: 15, name: 'Glorious Defense', description: 'When an ally is hit, use your reaction to add your CHA modifier to their AC. If the attack misses, make an attack against the attacker.' },
          { level: 20, name: 'Living Legend', description: 'For 1 minute, use CHA in place of STR or DEX checks, reroll one missed attack each turn, and turn one failed save into a success.' },
        ],
      },
      {
        id: 'oath_of_the_watchers',
        name: 'Oath of the Watchers',
        description: 'Stand guard against extraplanar threats and ward allies from alien magic.',
        spells: ['alarm', 'detect magic', 'moonbeam', 'see invisibility', 'counterspell', 'nondetection', 'aura of purity', 'banishment', 'hold monster', 'scrying'],
        features: [
          { level: 3, name: 'Oath Spells', description: 'Gain oath spells: alarm, detect magic, moonbeam, see invisibility, counterspell, nondetection, aura of purity, banishment, hold monster, and scrying.' },
          { level: 3, name: 'Channel Divinity: Abjure the Extraplanar', description: 'Turn aberrations, celestials, elementals, fey, and fiends with divine abjuration.', recoveryType: 'short' },
          { level: 3, name: 'Channel Divinity: Watcher\'s Will', description: 'Grant a number of creatures equal to your CHA modifier advantage on saves against magic for 1 minute.', recoveryType: 'short' },
          { level: 7, name: 'Aura of the Sentinel', description: 'You and allies in your aura add your proficiency bonus to initiative rolls.' },
          { level: 15, name: 'Vigilant Rebuke', description: 'When an ally succeeds on an INT, WIS, or CHA save, use your reaction to deal 2d8 + CHA necrotic damage to the caster.' },
          { level: 20, name: 'Mortal Bulwark', description: 'For 1 minute, gain truesight 120 ft, advantage on attacks against extraplanar creatures, and banish a target on hit without concentration.' },
        ],
      },
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
      {
        id: 'gloom_stalker',
        name: 'Gloom Stalker',
        description: 'Master ambush, darkness, and sudden violence in the places monsters fear.',
        spells: ['disguise self', 'rope trick', 'fear', 'greater invisibility', 'seeming'],
        features: [
          { level: 3, name: 'Gloom Stalker Magic', description: 'Gain gloom stalker spells: disguise self, rope trick, fear, greater invisibility, and seeming.' },
          { level: 3, name: 'Dread Ambusher', description: 'Add WIS to initiative. On your first turn, gain an extra attack that deals +1d8 damage on hit.' },
          { level: 3, name: 'Umbral Sight', description: 'Gain darkvision 60 ft or increase existing darkvision by 60 ft. While in darkness, you are invisible to creatures relying on darkvision.' },
          { level: 7, name: 'Iron Mind', description: 'Gain proficiency in WIS saves, or choose INT or CHA save proficiency if you already have WIS.' },
          { level: 11, name: 'Stalker\'s Flurry', description: 'Once on each of your turns, make another weapon attack when you miss.' },
          { level: 15, name: 'Shadowy Dodge', description: 'Use your reaction when attacked to impose disadvantage on the attack roll.' },
        ],
      },
      {
        id: 'fey_wanderer',
        name: 'Fey Wanderer',
        description: 'Carry fey magic through the world, turning charm, fear, and strange beauty into weapons.',
        spells: ['charm person', 'misty step', 'dispel magic', 'dimension door', 'mislead'],
        features: [
          { level: 3, name: 'Fey Wanderer Magic', description: 'Gain fey wanderer spells: charm person, misty step, dispel magic, dimension door, and mislead.' },
          { level: 3, name: 'Dreadful Strikes', description: 'Once each turn, deal an extra 1d4 psychic damage when you hit with a weapon attack.' },
          { level: 3, name: 'Otherworldly Glamour', description: 'Add your WIS modifier to CHA checks and gain proficiency in one CHA skill.' },
          { level: 7, name: 'Beguiling Twist', description: 'When a nearby creature succeeds against charm or frighten, use your reaction to redirect that magic to another creature for 1 minute.' },
          { level: 11, name: 'Fey Reinforcements', description: 'Cast summon fey once per long rest without a slot, or with spell slots; the casting can require no concentration.' },
          { level: 15, name: 'Misty Wanderer', description: 'Cast misty step without expending a slot and bring one willing creature with you.' },
        ],
      },
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
      {
        id: 'soulknife',
        name: 'Soulknife',
        description: 'Shape psionic energy into silent blades, telepathic talent, and impossible mobility.',
        features: [
          { level: 3, name: 'Psionic Power', description: 'Gain Psionic Energy dice starting as 2d6. Recover one die as a bonus action once per short rest.' },
          { level: 3, name: 'Psychic Blades', description: 'Manifest a 1d6 psychic finesse thrown blade with 60 ft range and no ammunition. As a bonus action, manifest an off-hand 1d4 psychic blade without adding your ability modifier.' },
          { level: 9, name: 'Soul Blades', description: 'Your psionic blades gain Homing Strikes and Psychic Teleportation.' },
          { level: 9, name: 'Homing Strikes', description: 'When Psychic Blades miss, spend a Psionic Energy die and add the roll to the attack.' },
          { level: 9, name: 'Psychic Teleportation', description: 'As a bonus action, spend a Psionic Energy die and teleport up to 5 ft times the number rolled.' },
          { level: 13, name: 'Psychic Veil', description: 'Become invisible for 1 hour once per long rest, or by expending a Psionic Energy die.' },
          { level: 17, name: 'Rend Mind', description: 'When Psychic Blades damage a creature, force a STR save against DC 8 + proficiency + DEX modifier or stun it until the end of your next turn. Use once per long rest or spend 3 Psionic Energy dice.' },
        ],
      },
      {
        id: 'swashbuckler',
        name: 'Swashbuckler',
        description: 'Win duels with charm, speed, daring footwork, and a blade always one beat ahead.',
        features: [
          { level: 3, name: 'Fancy Footwork', description: 'When you make a melee attack against a creature, that target cannot make opportunity attacks against you for the rest of the turn.' },
          { level: 3, name: 'Rakish Audacity', description: 'Add CHA to initiative and use Sneak Attack in a one-on-one duel without needing advantage or an adjacent ally.' },
          { level: 9, name: 'Panache', description: 'Use Persuasion against a target\'s Insight to charm an ally for 1 minute or force a hostile creature to focus its attacks on you.' },
          { level: 13, name: 'Elegant Maneuver', description: 'As a bonus action, gain advantage on your next Athletics or Acrobatics check this turn.' },
          { level: 17, name: 'Master Duelist', description: 'When you miss with an attack, reroll it with advantage once per short rest.' },
        ],
      },
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
      {
        id: 'aberrant_mind',
        name: 'Aberrant Mind',
        description: 'A mind touched by alien thought, psionic whispers, and reality-warping influence.',
        spells: ['arms of hadar', 'dissonant whispers', 'calm emotions', 'detect thoughts', 'hunger of hadar', 'sending', 'evard\'s black tentacles', 'summon aberration', 'telekinesis', 'rary\'s telepathic bond'],
        features: [
          { level: 1, name: 'Telepathic Speech', description: 'As a bonus action, form a telepathic link with a creature for 1 minute per point of your INT modifier.' },
          { level: 1, name: 'Psionic Spells', description: 'Gain psionic spells: arms of hadar, dissonant whispers, calm emotions, detect thoughts, hunger of hadar, sending, evard\'s black tentacles, summon aberration, telekinesis, and rary\'s telepathic bond.' },
          { level: 6, name: 'Psionic Sorcery', description: 'Cast a psionic spell using only a spell slot and no components.' },
          { level: 6, name: 'Psychic Defenses', description: 'Gain resistance to psychic damage and immunity to the charmed and frightened conditions.' },
          { level: 14, name: 'Revelation in Flesh', description: 'Spend sorcery points for 10 minutes of aberrant adaptations: see invisible, swim and breathe water, burrow 30 ft, or fly 40 ft.' },
          { level: 18, name: 'Warping Implosion', description: 'Teleport up to 120 ft and force creatures within 30 ft of your old space to take 4d10 force damage and risk being pulled toward that space.' },
        ],
      },
      {
        id: 'clockwork_soul',
        name: 'Clockwork Soul',
        description: 'Channel the perfect order of cosmic machinery to cancel chaos and restore balance.',
        spells: ['alarm', 'protection from evil and good', 'aid', 'lesser restoration', 'dispel magic', 'protection from energy', 'freedom of movement', 'summon construct', 'greater restoration', 'wall of force'],
        features: [
          { level: 1, name: 'Clockwork Magic', description: 'Gain clockwork spells: alarm, protection from evil and good, aid, lesser restoration, dispel magic, protection from energy, freedom of movement, summon construct, greater restoration, and wall of force.' },
          { level: 1, name: 'Restore Balance', description: 'As a reaction, cancel advantage or disadvantage on a roll a number of times per long rest equal to your proficiency bonus.', recoveryType: 'long' },
          { level: 6, name: 'Bastion of Law', description: 'As an action, spend 1 to 5 sorcery points to ward a creature. The ward absorbs damage equal to 5 times the points spent and lasts until your next long rest.' },
          { level: 14, name: 'Trance of Order', description: 'As a bonus action for 1 minute, attacks against you cannot gain advantage from disorder, and your attack rolls, checks, and saves below 10 count as 10.' },
          { level: 18, name: 'Clockwork Cavalcade', description: 'Create a 30 ft sphere of order for 1 minute, repairing objects, ending spells of 5th level or lower, and dispelling magical effects.' },
        ],
      },
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
      {
        id: 'the_celestial',
        name: 'The Celestial',
        description: 'Forge a pact with a radiant being and channel healing light, holy fire, and celestial endurance.',
        spells: ['sacred flame', 'light', 'cure wounds', 'guiding bolt', 'flaming sphere', 'lesser restoration', 'daylight', 'revivify', 'guardian of faith', 'wall of fire'],
        features: [
          { level: 1, name: 'Expanded Spell List', description: 'Gain celestial spells: sacred flame, light, cure wounds, guiding bolt, flaming sphere, lesser restoration, daylight, revivify, guardian of faith, and wall of fire.' },
          { level: 1, name: 'Healing Light', description: 'As a bonus action, heal with a d6 pool equal to your warlock level. Spend up to 1 + CHA modifier dice per use and recover all dice on a long rest.', recoveryType: 'long' },
          { level: 6, name: 'Radiant Soul', description: 'Gain resistance to radiant damage and add CHA to one radiant or fire spell damage roll against one target.' },
          { level: 10, name: 'Celestial Resilience', description: 'After a short or long rest, gain temporary HP equal to your warlock level + CHA modifier, and up to five allies gain half that amount.' },
          { level: 14, name: 'Searing Vengeance', description: 'When you make a death save, recover half your HP and burst with radiance. Enemies within 30 ft take 2d8 + CHA radiant damage, are blinded until the end of their turn, and you gain 30 ft fly speed until the end of your turn.' },
        ],
      },
      {
        id: 'the_fathomless',
        name: 'The Fathomless',
        description: 'Draw power from the crushing depths, calling spectral tentacles, sea-born endurance, and abyssal passage.',
        spells: ['create or destroy water', 'thunderwave', 'gust of wind', 'silence', 'lightning bolt', 'sleet storm', 'control water', 'summon elemental', 'cone of cold', 'maelstrom'],
        features: [
          { level: 1, name: 'Expanded Spell List', description: 'Gain fathomless spells: create or destroy water, thunderwave, gust of wind, silence, lightning bolt, sleet storm, control water, summon elemental, cone of cold, and maelstrom.' },
          { level: 1, name: 'Tentacle of the Deeps', description: 'As a bonus action, summon a spectral tentacle within 10 ft for 1 minute once per short rest. It attacks with your spell attack, deals 1d8 cold damage, slows the target by 10 ft, and can move 30 ft as a bonus action.', recoveryType: 'short' },
          { level: 1, name: 'Gift of the Sea', description: 'Gain a 40 ft swimming speed and the ability to breathe underwater.' },
          { level: 6, name: 'Oceanic Soul', description: 'Gain resistance to cold damage and telepathically communicate with creatures while both of you are underwater or breathing water.' },
          { level: 6, name: 'Guardian Coil', description: 'Use your reaction when a creature in your tentacle range takes damage to reduce that damage by 1d8.' },
          { level: 10, name: 'Grasping Tentacles', description: 'Cast evard\'s black tentacles once per long rest without a spell slot. Gain temporary HP equal to your warlock level when you cast it, and your concentration on it cannot be broken by damage.', recoveryType: 'long' },
          { level: 14, name: 'Fathomless Plunge', description: 'As an action, teleport yourself and up to eight willing creatures up to 1 mile to a body of water such as an ocean, lake, or river once per short rest.', recoveryType: 'short' },
        ],
      },
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
      {
        id: 'bladesinging',
        name: 'Bladesinging',
        description: 'Blend elven swordplay and wizardry into a precise dance of warding magic and steel.',
        features: [
          { level: 2, name: 'Training in War and Song', description: 'Gain proficiency with light armor, one one-handed melee weapon, and Performance if you do not already have it.' },
          { level: 2, name: 'Bladesong', description: 'As a bonus action, enter Bladesong for 1 minute a number of times per long rest equal to proficiency bonus. Gain +INT to AC, +10 ft walking speed, advantage on Acrobatics, and +INT to CON saves for concentration.', recoveryType: 'long' },
          { level: 6, name: 'Extra Attack', description: 'Attack twice when you take the Attack action, and replace one of those attacks with a cantrip.' },
          { level: 10, name: 'Song of Defense', description: 'While Bladesong is active, use your reaction and expend a spell slot to reduce damage by 5 times the slot level.' },
          { level: 14, name: 'Song of Victory', description: 'While Bladesong is active, add your INT modifier to melee weapon damage rolls.' },
        ],
      },
      {
        id: 'order_of_scribes',
        name: 'Order of Scribes',
        description: 'Awaken your spellbook as a magical companion and wield written arcana with unmatched speed.',
        features: [
          { level: 2, name: 'Wizardly Quill', description: 'As a bonus action, create a magic quill that produces its own ink, copies spells at 2 minutes per spell level, and can erase your own writing.' },
          { level: 2, name: 'Awakened Spellbook', description: 'Use your spellbook as an arcane focus, cast ritual spells without adding 10 minutes, and change a spell damage type to another type from a spell in your book when casting.' },
          { level: 6, name: 'Manifest Mind', description: 'As a bonus action, summon a spectral mind within 300 ft. See and hear through it, cast spells through it, move it 30 ft as a bonus action, and keep it until dismissed once per long rest or by expending a spell slot.', recoveryType: 'long' },
          { level: 10, name: 'Master Scrivener', description: 'After a long rest, create one free 1st- or 2nd-level spell scroll that only you can use and that loses magic at your next long rest.' },
          { level: 14, name: 'One with the Word', description: 'While Manifest Mind is active, use your reaction when damaged to prevent all damage, then roll 3d6 and temporarily lose spells of those levels from your spellbook until a long rest.', recoveryType: 'long' },
        ],
      },
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
