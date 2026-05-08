export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export type RulesVersion = 'srd_5_1';

export type RulesModule = 'core' | 'combat' | 'conditions';

export type GamePhase = 'setup' | 'exploration' | 'combat' | 'rest';

export type SessionRules = {
  version: RulesVersion;
  enabledModules: RulesModule[];
  houseRules: string;
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
  equipment: string[];
  features: string[];
  spells: string[];
  backstory: string;
  personalityTraits: string[];
  portraitUrl: string;
};

export type StoryMessage = {
  id: string;
  speaker: 'dm' | 'player' | 'system';
  author: string;
  body: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
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
  phase: GamePhase;
  rules: SessionRules;
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
