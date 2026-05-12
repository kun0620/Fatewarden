export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export type RollType =
  | 'ability_check'
  | 'skill_check'
  | 'saving_throw'
  | 'attack_roll'
  | 'damage_roll'
  | 'initiative'
  | 'free_roll';

export type AdvantageState = 'normal' | 'advantage' | 'disadvantage';

export type ResourceRecoveryType = 'none' | 'short_rest' | 'long_rest' | 'special';
