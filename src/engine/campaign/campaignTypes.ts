/* ── Campaign Structure Types ────────────────────────────────────────────────── */

// ──────────────────────────────────────────────────────────────────────────────
// Campaign Metadata
// ──────────────────────────────────────────────────────────────────────────────

export interface CampaignMeta {
  id: string;
  title: string;
  description: string;
  version: string;
  author: string;
  recommended_level: number;
  recommended_level_min?: number;
  recommended_level_max?: number;
  min_players: number;
  max_players: number;
  tags?: string[];
  thumbnail?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Campaign Hierarchy
// ──────────────────────────────────────────────────────────────────────────────

export interface Act {
  id: string;
  title: string;
  description: string;
  order: number;
  chapters: Chapter[];
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  order: number;
  scenes: Scene[];
}

export interface Scene {
  id: string;
  title: string;
  location: string;
  mood: 'exploration' | 'combat' | 'social' | 'horror' | 'rest';
  entry_node_id: string;
  nodes: Node[];
}

export interface Campaign {
  meta: CampaignMeta;
  acts: Act[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Node Types (9 total)
// ──────────────────────────────────────────────────────────────────────────────

export type Node =
  | NarrationNode
  | ChoiceNode
  | DiceCheckNode
  | CombatNode
  | ItemRewardNode
  | NPCDialogueNode
  | ConditionCheckNode
  | CutsceneNode
  | EndNode;

// 1. Narration
export interface NarrationNode {
  type: 'narration';
  id: string;
  text: string;
  image?: string;
  next: string;
}

// 2. Choice
export interface ChoiceOption {
  id: string;
  text: string;
  next: string;
  set_flags?: Flag[];
}

export interface ChoiceNode {
  type: 'choice';
  id: string;
  prompt: string;
  options: ChoiceOption[];
}

// 3. Dice Check
export interface DiceCheckNode {
  type: 'dice_check';
  id: string;
  description: string;
  skill: string; // perception | investigation | athletics | etc.
  dc: number;
  on_success: string;
  on_fail: string;
  on_critical_success?: string;
  on_critical_fail?: string;
}

// 4. Combat
export interface CombatEnemy {
  name: string;
  hp: number;
  ac: number;
  attack_bonus: number;
  damage_dice: string; // e.g., "1d8+3"
  damage_type: string;
}

export interface CombatNode {
  type: 'combat';
  id: string;
  description: string;
  enemies: CombatEnemy[];
  starting_conditions?: string[]; // e.g., "surprised", "ambush"
  win_condition: 'kill_all' | 'kill_boss' | 'escape';
  lose_condition: 'party_wipe' | 'hp_below_percent';
  lose_threshold?: number; // for hp_below_percent
  on_win: string;
  on_lose: string;
}

// 5. Item Reward
export interface RewardItem {
  template_id?: string; // if using item from items.ts
  name: string;
  description: string;
  quantity: number;
  image?: string;
}

export interface ItemRewardNode {
  type: 'item_reward';
  id: string;
  description: string;
  items: RewardItem[];
  next: string;
}

// 6. NPC Dialogue
export interface DialogueLine {
  speaker: 'npc' | 'player';
  text: string;
  options?: DialogueOption[];
}

export interface DialogueOption {
  text: string;
  set_flags?: Flag[];
  next_line?: number; // index of next line (if undefined, go to next line auto)
}

export interface NPCDialogueNode {
  type: 'npc_dialogue';
  id: string;
  npc_name: string;
  npc_image?: string;
  lines: DialogueLine[];
  next: string;
}

// 7. Condition Check
export interface ConditionCheckItem {
  check: 'flag' | 'stat' | 'inventory';
  // if flag:
  flag_key?: string;
  flag_value?: boolean | number;
  operator?: 'eq' | 'gte' | 'lte' | 'gt' | 'lt';
  // if stat:
  stat?: 'hp' | 'hp_percent' | 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha' | 'level';
  // if inventory:
  item_id?: string;
  quantity?: number;
  // result:
  on_true: string;
}

export interface ConditionCheckNode {
  type: 'condition_check';
  id: string;
  conditions: ConditionCheckItem[];
  on_default: string;
}

// 8. Cutscene
export interface CutsceneSlide {
  text: string;
  image?: string;
}

export interface CutsceneNode {
  type: 'cutscene';
  id: string;
  slides: CutsceneSlide[];
  next: string;
}

// 9. End
export interface EndNode {
  type: 'end';
  id: string;
  ending_id: string; // e.g., "good_ending", "bad_ending"
  title: string;
  description: string;
  image?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Flag System
// ──────────────────────────────────────────────────────────────────────────────

export type Flag = BooleanFlag | CounterFlag;

export interface BooleanFlag {
  key: string;
  value: boolean;
}

export interface CounterFlag {
  key: string;
  value: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Campaign Save
// ──────────────────────────────────────────────────────────────────────────────

export interface SpellSlotState {
  used: number;
  max: number;
}

export interface ClassResource {
  name: string;
  used: number;
  max: number;
}

export interface CharacterSnapshot {
  hp: number;
  conditions: string[];
  inventory: Record<string, number>; // item_id -> quantity
  spell_slots: Record<number, SpellSlotState>;
  class_resources: ClassResource[];
}

export interface CampaignSave {
  campaign_id: string;
  player_id: string;
  current_node_id: string;
  flags: Record<string, boolean | number>;
  character_snapshot: CharacterSnapshot;
  updated_at: number; // timestamp
}

// ──────────────────────────────────────────────────────────────────────────────
// Type Guards
// ──────────────────────────────────────────────────────────────────────────────

export function isNarrationNode(node: Node): node is NarrationNode {
  return node.type === 'narration';
}

export function isChoiceNode(node: Node): node is ChoiceNode {
  return node.type === 'choice';
}

export function isDiceCheckNode(node: Node): node is DiceCheckNode {
  return node.type === 'dice_check';
}

export function isCombatNode(node: Node): node is CombatNode {
  return node.type === 'combat';
}

export function isItemRewardNode(node: Node): node is ItemRewardNode {
  return node.type === 'item_reward';
}

export function isNPCDialogueNode(node: Node): node is NPCDialogueNode {
  return node.type === 'npc_dialogue';
}

export function isConditionCheckNode(node: Node): node is ConditionCheckNode {
  return node.type === 'condition_check';
}

export function isCutsceneNode(node: Node): node is CutsceneNode {
  return node.type === 'cutscene';
}

export function isEndNode(node: Node): node is EndNode {
  return node.type === 'end';
}

export function isBooleanFlag(flag: Flag): flag is BooleanFlag {
  return typeof flag.value === 'boolean';
}

export function isCounterFlag(flag: Flag): flag is CounterFlag {
  return typeof flag.value === 'number';
}
