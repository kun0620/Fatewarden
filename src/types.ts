import type { ClassRuntime } from './engine/classes/classTypes';

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
export type ExhaustionLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type RulesVersion = 'srd_5_1';

export type RulesModule = 'core' | 'combat' | 'conditions';

export type GamePhase = 'setup' | 'exploration' | 'combat' | 'rest';

export type SessionPlayMode = 'dnd' | 'hexplore';

export type SessionThemeKey = 'dark_fantasy' | 'gothic_horror' | 'mystery' | 'wilderness' | 'heroic_fantasy';

export type SessionThemeTone = 'grim' | 'mysterious' | 'cinematic' | 'dangerous' | 'light_adventure';

export type SessionTheme = {
  key: SessionThemeKey;
  tone: SessionThemeTone;
  notes: string;
};

export type SessionRules = {
  version: RulesVersion;
  enabledModules: RulesModule[];
  houseRules: string;
};

export type HexAbilityKey = 'attack' | 'defend' | 'firstMastery' | 'secondMastery';

export type HexSkillKey = 'navigate' | 'explore' | 'survival';

export type HexVitalKey = 'health' | 'energy';

export type HexStatKey = HexAbilityKey | HexSkillKey | HexVitalKey;

export type HexAbilityDraft = {
  name: string;
  summary: string;
  base: number;
  energyCost: number;
};

export type HexRoleDraft = {
  name: string;
  category: string;
  favoredOpponent: string;
  abilities: Record<HexAbilityKey, HexAbilityDraft>;
  skills: Record<HexSkillKey, number>;
  vitals: Record<HexVitalKey, number>;
};

export type HexRaceDraft = {
  name: string;
  modifiers: Record<HexStatKey, number>;
  notes: string;
};

export type HexHeroBuild = {
  role: HexRoleDraft;
  race: HexRaceDraft;
  foodRating: number;
  gold: number;
  backpackNotes: string;
};

export type CharacterSystemData = {
  hexplore?: HexHeroBuild;
  classRuntime?: ClassRuntime;
  [key: string]: unknown;
};

export type SpellSlotState = {
  used: number;
  max: number;
};

export type ItemCategory =
  | 'weapon'
  | 'armor'
  | 'shield'
  | 'gear'
  | 'consumable'
  | 'tool'
  | 'material'
  | 'quest'
  | 'currency'
  | 'misc';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' | 'artifact';

export type DamageType =
  | 'bludgeoning'
  | 'piercing'
  | 'slashing'
  | 'acid'
  | 'cold'
  | 'fire'
  | 'force'
  | 'lightning'
  | 'necrotic'
  | 'poison'
  | 'psychic'
  | 'radiant'
  | 'thunder';

export type WeaponProperty =
  | 'ammunition'
  | 'finesse'
  | 'heavy'
  | 'light'
  | 'loading'
  | 'range'
  | 'reach'
  | 'special'
  | 'thrown'
  | 'two_handed'
  | 'versatile'
  | 'silvered'
  | 'magical';

export type ItemEffect = {
  type: 'bonus' | 'resistance' | 'advantage' | 'disadvantage' | 'status' | 'custom';
  value: number;
  target?: string;
  description: string;
};

export type Item = {
  id: string;
  templateId?: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: ItemRarity;
  weight: number;
  value: number;
  quantity: number;
  equipped: boolean;
  attunement: boolean;
  attuned: boolean;
  weapon?: {
    damageDice: string;
    damageType: DamageType;
    properties: WeaponProperty[];
    rangeNormal?: number;
    rangeLong?: number;
    versatileDice?: string;
  };
  armor?: {
    type: 'light' | 'medium' | 'heavy' | 'shield' | 'natural';
    baseAC: number;
    maxDexBonus?: number;
    stealthDisadvantage: boolean;
    strengthRequirement?: number;
  };
  effects?: ItemEffect[];
};

export type Inventory = {
  items: Item[];
  maxCarryWeight: number;
  currency: {
    pp: number;
    gp: number;
    ep: number;
    sp: number;
    cp: number;
  };
};

export type DerivedStats = {
  proficiencyBonus: number;
  initiative: number;
  passivePerception: number;
  savingThrows: Record<AbilityKey, number>;
  skillBonuses: Record<string, number>;
};

export type LevelUpChoice = {
  type: 'hp' | 'feature' | 'spell' | 'ability_score';
  options: string[];
  selected?: string;
};

export type ConditionEffect = {
  name: string;
  penalties: Partial<Record<AbilityKey, number>>;
  disabledActions: string[];
  description: string;
};

export type ExhaustionEffect = {
  level: ExhaustionLevel;
  description: string;
  disadvantageAbilityChecks: boolean;
  speedMultiplier: number;
  disadvantageAttackRolls: boolean;
  disadvantageSavingThrows: boolean;
  hitPointMaximumMultiplier: number;
  speedBecomesZero: boolean;
  dead: boolean;
};

export type Character = {
  id: string;
  name: string;
  ancestry: string;
  className: string;
  level: number;
  background: string;
  age: string;
  alignment: string;
  languages: string[];
  proficiencies: string[];
  armorClass: number;
  hitPoints: number;
  maxHitPoints: number;
  speed: number;
  darkvision: number;
  inspiration: boolean;
  abilities: Record<AbilityKey, number>;
  skills: string[];
  inventory: Inventory;
  features: string[];
  spells: string[];
  backstory: string;
  personalityTraits: string[];
  portraitUrl: string;
  activeConditions: string[];
  exhaustionLevel: ExhaustionLevel;
  hitDice: number;
  maxHitDice: number;
  spellSlots: Record<number, SpellSlotState>;
  systemData: CharacterSystemData;
};

export type VaultCharacter = Character & {
  updatedAt?: string;
};

export type StoryMessage = {
  id: string;
  speaker: 'dm' | 'player' | 'system';
  author: string;
  body: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type SceneFlow = {
  title?: string;
  location?: string;
  objective?: string;
  threat?: string;
  hook?: string;
  nextActions?: string[];
};

export type AiSuggestedRoll = {
  required: boolean;
  type?: 'ability' | 'skill' | 'save' | 'initiative' | 'attack' | 'custom';
  ability?: AbilityKey;
  skill?: string;
  dc?: number;
  reason?: string;
  mode?: RollMode;
  label?: string;
};

export type AiChoiceIntent =
  | 'aggressive'
  | 'defensive'
  | 'investigate'
  | 'social'
  | 'support'
  | 'utility'
  | 'risky'
  | 'talk'
  | 'travel'
  | 'roll'
  | 'combat'
  | 'rest'
  | 'custom';

export type AiChoice = {
  number: number;
  label: string;
  prompt: string;
  intent: AiChoiceIntent;
  isCustom?: boolean;
  suggestedRoll?: string | AiSuggestedRoll;
};

export type AiConfirmActionType =
  | 'damage'
  | 'healing'
  | 'add_condition'
  | 'remove_condition'
  | 'phase_change'
  | 'start_combat'
  | 'next_turn'
  | 'previous_turn';

export type AiConfirmAction = {
  id: string;
  type: AiConfirmActionType;
  label: string;
  targetId?: string;
  targetName?: string;
  amount?: number;
  condition?: string;
  phase?: GamePhase;
  encounterName?: string;
  note?: string;
};

export type RollMode = 'normal' | 'advantage' | 'disadvantage';

export type RollType = 'free' | 'skill' | 'save' | 'initiative';

export type DiceRoll = {
  notation: string;
  total: number;
  rolls: number[];
  modifier: number;
  mode: RollMode;
  type: RollType;
  label: string;
  ability?: AbilityKey;
  skill?: string;
  keptRoll?: number;
  droppedRolls?: number[];
};

export type GameSession = {
  id: string;
  title: string;
  joinCode: string;
  createdAt: string;
  createdBy?: string;
  playMode: SessionPlayMode;
  phase: GamePhase;
  theme: SessionTheme;
  rules: SessionRules;
  combatState: EncounterState | null;
};

export type CombatantType = 'player' | 'enemy';

export type DeathSaves = {
  successes: number;
  failures: number;
};

export type Combatant = {
  id: string;
  name: string;
  type: CombatantType;
  armorClass: number;
  hitPoints: number;
  maxHitPoints: number;
  tempHitPoints: number;
  initiative: number;
  conditions: string[];
  deathSaves: DeathSaves;
};

export type EncounterState = {
  id: string;
  name: string;
  round: number;
  activeIndex: number;
  isActive: boolean;
  combatants: Combatant[];
};
