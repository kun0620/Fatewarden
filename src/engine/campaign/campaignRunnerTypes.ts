import type { Character } from '../../types';
import type { Node, CharacterSnapshot } from './campaignTypes';

/* ── Runner State ───────────────────────────────────────────────────────────── */

export interface PlayerState {
  player_id: string;
  character_id: string;
  character: Character;
  hp: number;
  conditions: string[];
  inventory: Record<string, number>; // item_id -> quantity for campaign tracking
  spell_slots: Record<number, { used: number; max: number }>;
  class_resources: Array<{ name: string; used: number; max: number }>;
}

export interface RunnerState {
  campaign_id: string;
  current_node_id: string;
  current_scene_id: string;
  flags: Record<string, boolean | number>;
  party: Record<string, PlayerState>; // player_id -> state
  is_multiplayer: boolean;
  host_player_id: string;
  choice_mode?: 'host' | 'vote';
  roller?: string; // player_id of who rolls
  updated_at: number;
}

/* ── Session ────────────────────────────────────────────────────────────────── */

export interface CampaignSession {
  id: string;
  campaign_id: string;
  owner_id: string;
  player_ids: string[];
  is_active: boolean;
  current_state: RunnerState;
  created_at: number;
  updated_at: number;
}

/* ── Node Context (for rendering) ───────────────────────────────────────────── */

export interface NodeRenderContext {
  node: Node;
  state: RunnerState;
  campaign_id: string;
  session_id: string;
  is_host: boolean;
  current_player_id: string;
}

/* ── Dice Roll Result ───────────────────────────────────────────────────────── */

export interface DiceRollResult {
  player_id: string;
  character_name: string;
  skill: string;
  value: number; // 1-20
  bonus: number;
  total: number;
  dc: number;
  success: boolean;
  critical_success: boolean;
  critical_fail: boolean;
}

export interface CoopDiceResult {
  roller: string;
  method: 'host' | 'highest_stat' | 'all_best' | 'all_worst';
  rolls: DiceRollResult[];
  final_result: DiceRollResult;
}

/* ── Choice Voting ───────────────────────────────────────────────────────────── */

export interface ChoiceVote {
  player_id: string;
  character_name: string;
  option_id: string;
}

export interface ChoiceVoteResult {
  votes: ChoiceVote[];
  winning_option_id: string;
  majority: number;
}

/* ── Combat Context ────────────────────────────────────────────────────────── */

export interface CombatContext {
  node_id: string;
  enemies: Array<{
    name: string;
    hp: number;
    ac: number;
    attack_bonus: number;
    damage_dice: string;
    damage_type: string;
  }>;
  starting_conditions?: string[];
  win_condition: 'kill_all' | 'kill_boss' | 'escape';
  lose_condition: 'party_wipe' | 'hp_below_percent';
  lose_threshold?: number;
}

/* ── Node State during rendering ─────────────────────────────────────────── */

export interface NarrationNodeState {
  type: 'narration';
  text: string;
  image?: string;
}

export interface ChoiceNodeState {
  type: 'choice';
  prompt: string;
  options: Array<{
    id: string;
    text: string;
  }>;
  mode: 'host' | 'vote';
  votes?: ChoiceVoteResult;
  pending_votes?: boolean;
}

export interface DiceCheckNodeState {
  type: 'dice_check';
  description: string;
  skill: string;
  dc: number;
  roller: string;
  method: 'host' | 'highest_stat' | 'all_best' | 'all_worst' | 'player_id';
  result?: CoopDiceResult;
  pending_roll?: boolean;
}

export interface CombatNodeState {
  type: 'combat';
  context: CombatContext;
  pending_combat?: boolean;
}

export interface ItemRewardNodeState {
  type: 'item_reward';
  description: string;
  items: Array<{
    name: string;
    description: string;
    quantity: number;
    image?: string;
  }>;
  pending_confirmation?: boolean;
}

export interface DialogueNodeState {
  type: 'npc_dialogue';
  npc_name: string;
  npc_image?: string;
  current_line_idx: number;
  total_lines: number;
  pending_response?: boolean;
}

export interface CutsceneNodeState {
  type: 'cutscene';
  slides: Array<{
    text: string;
    image?: string;
  }>;
  current_slide_idx: number;
  total_slides: number;
}

export interface EndNodeState {
  type: 'end';
  ending_id: string;
  title: string;
  description: string;
  image?: string;
}

export type ActiveNodeState =
  | NarrationNodeState
  | ChoiceNodeState
  | DiceCheckNodeState
  | CombatNodeState
  | ItemRewardNodeState
  | DialogueNodeState
  | CutsceneNodeState
  | EndNodeState;

/* ── Runner Events ────────────────────────────────────────────────────────── */

export type RunnerEvent =
  | { type: 'node_entered'; node_id: string }
  | { type: 'choice_made'; node_id: string; option_id: string }
  | { type: 'dice_rolled'; node_id: string; result: CoopDiceResult }
  | { type: 'combat_started'; node_id: string }
  | { type: 'combat_ended'; node_id: string; victory: boolean }
  | { type: 'item_received'; item_name: string }
  | { type: 'flag_set'; key: string; value: boolean | number }
  | { type: 'node_transitioned'; from: string; to: string }
  | { type: 'session_saved' }
  | { type: 'session_ended' };

/* ── Progress ────────────────────────────────────────────────────────────── */

export interface ProgressNode {
  node_id: string;
  visited: boolean;
  current: boolean;
}

export interface SceneProgress {
  scene_id: string;
  title: string;
  visited: boolean;
  current: boolean;
  nodes: ProgressNode[];
}

export interface ChapterProgress {
  chapter_id: string;
  title: string;
  visited: boolean;
  current: boolean;
  scenes: SceneProgress[];
}

export interface ActProgress {
  act_id: string;
  title: string;
  visited: boolean;
  current: boolean;
  chapters: ChapterProgress[];
}

export interface CampaignProgress {
  campaign_id: string;
  acts: ActProgress[];
}
