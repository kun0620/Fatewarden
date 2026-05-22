import type { Campaign } from './campaignTypes';

/* ── Creator State ───────────────────────────────────────────────────────────── */

export interface CampaignDraft {
  id: string;
  campaign: Campaign;
  unsaved_changes: boolean;
  last_saved_at: number;
}

export interface EditorState {
  selected_node_id: string | null;
  selected_connection: { from_node: string; from_port: string; to_node: string; to_port: string } | null;
  is_connecting: boolean;
  connection_start: { node_id: string; port: string } | null;
}

/* ── Validation ──────────────────────────────────────────────────────────────── */

export interface ValidationError {
  type: 'missing_required_field' | 'dead_end_node' | 'no_end_node' | 'orphaned_flag' | 'unreachable_node' | 'no_campaign_structure';
  node_id?: string;
  message: string;
}

export interface ValidationWarning {
  type: 'unreachable_node' | 'missing_structure' | 'unused_flag';
  node_id?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/* ── Node Editing ────────────────────────────────────────────────────────────── */

export interface NodeFormData {
  id: string;
  type: string;
  name: string;
  x?: number;
  y?: number;

  // Narration
  text?: string;
  image?: string;

  // Choice
  prompt?: string;
  options?: Array<{
    id: string;
    text: string;
    set_flags?: Array<{ key: string; value: boolean | number }>;
    choice_mode?: 'host' | 'vote';
  }>;

  // Dice Check
  description?: string;
  skill?: string;
  dc?: number;
  roller?: 'host' | 'highest_stat' | 'all_best' | 'all_worst' | string;

  // Combat
  enemies?: Array<{
    name: string;
    hp: number;
    ac: number;
    attack_bonus: number;
    damage_dice: string;
    damage_type: string;
  }>;
  starting_conditions?: string[];
  win_condition?: 'kill_all' | 'kill_boss' | 'escape';
  lose_condition?: 'party_wipe' | 'hp_below_percent';
  lose_threshold?: number;

  // Item Reward
  items?: Array<{
    id: string;
    name: string;
    description: string;
    quantity: number;
    image?: string;
  }>;

  // NPC Dialogue
  npc_name?: string;
  npc_image?: string;
  lines?: Array<{
    id: string;
    speaker: 'npc' | 'player';
    text: string;
    options?: Array<{
      id: string;
      text: string;
      set_flags?: Array<{ key: string; value: boolean | number }>;
    }>;
    set_flags?: Array<{ key: string; value: boolean | number }>;
  }>;

  // Condition Check
  conditions?: Array<{
    id: string;
    check: 'flag' | 'stat' | 'inventory';
    flag_key?: string;
    flag_value?: boolean | number;
    operator?: 'eq' | 'gte' | 'lte' | 'gt' | 'lt';
    stat?: string;
    item_id?: string;
    quantity?: number;
    on_true?: string;
  }>;
  on_default?: string;

  // Cutscene
  slides?: Array<{
    id: string;
    text: string;
    image?: string;
  }>;

  // End
  ending_id?: string;
  title?: string;
  status?: string;

  // Node connections
  next?: string;
  on_success?: string;
  on_fail?: string;
  on_critical_success?: string;
  on_critical_fail?: string;
  on_win?: string;
  on_lose?: string;
}

/* ── Playtest State ──────────────────────────────────────────────────────────── */

export interface PlaytestState {
  is_active: boolean;
  runner_state?: any; // RunnerState type from campaignRunner
  debug_panel_open: boolean;
  selected_jump_node?: string;
  flag_overrides: Record<string, boolean | number>;
  stat_overrides: Record<string, number>;
}

/* ── Creator UI State ────────────────────────────────────────────────────────── */

export interface CreatorUIState {
  canvas_pan: { x: number; y: number };
  canvas_zoom: number;
  show_validation: boolean;
  selected_template?: 'blank' | 'linear' | 'branching' | 'mystery' | 'dungeon_crawl' | 'escort_mission';
  show_export_dialog: boolean;
  show_import_dialog: boolean;
}
