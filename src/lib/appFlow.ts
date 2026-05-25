import type { User } from '@supabase/supabase-js';
import type { GameSession } from '../types';

/**
 * AppStage - explicit state machine for the top-level app flow.
 *
 * Target flow:
 *   login -> menu -> character-setup -> game
 *
 * `local-play` is a degenerate stage that bypasses Supabase when not configured
 * (developer / offline mode). Treated like `game` for render purposes.
 */
export type AppStage =
  | 'local-play'
  | 'login'
  | 'menu'
  | 'room-setup'
  | 'character-setup'
  | 'lobby'
  | 'char-sheet'
  | 'char-vault'
  | 'char-wizard'
  | 'dm-dashboard'
  | 'game'
  | 'bestiary'
  | 'library'
  | 'settings';

export type AppFlowInput = {
  hasSupabaseConfig: boolean;
  user: User | null;
  activeSession: GameSession | null;
  pendingSession: GameSession | null;
  pendingRoomSetup: boolean;
  pendingLibrary: boolean;
  pendingSettings: boolean;
  pendingLobby: boolean;
  pendingCharSheet: boolean;
  pendingCharVault: boolean;
  pendingCharWizard: boolean;
  pendingDmDash: boolean;
  pendingBestiary: boolean;
};

/**
 * Pure function - derives current stage from auth + session state.
 *
 * Rules (highest precedence first):
 *   1. No Supabase config        -> local-play (demo / offline)
 *   2. No authenticated user     -> login
 *   3. Active session selected   -> game
 *   4. Pending lobby handoff     -> lobby
 *   5. Character sheet overlay   -> char-sheet
 *   6. Pending session selected  -> character-setup
 *   7. otherwise                 -> menu
 */
export function computeAppStage(input: AppFlowInput): AppStage {
  const {
    hasSupabaseConfig,
    user,
    activeSession,
    pendingSession,
    pendingRoomSetup,
    pendingLibrary,
    pendingSettings,
    pendingLobby,
    pendingCharSheet,
    pendingCharVault,
    pendingCharWizard,
    pendingDmDash,
    pendingBestiary,
  } = input;
  if (!hasSupabaseConfig) return 'local-play';
  if (!user) return 'login';
  if (activeSession) return 'game';
  if (pendingCharWizard) return 'char-wizard';
  if (pendingLobby) return 'lobby';
  if (pendingCharSheet) return 'char-sheet';
  if (pendingSession) return 'character-setup';
  if (pendingCharVault) return 'char-vault';
  if (pendingDmDash) return 'dm-dashboard';
  if (pendingBestiary) return 'bestiary';
  if (pendingRoomSetup) return 'room-setup';
  if (pendingLibrary) return 'library';
  if (pendingSettings) return 'settings';
  return 'menu';
}

/** Stages that render the gate (pre-game funnel). */
export function isGateStage(stage: AppStage): boolean {
  return (
    stage === 'login' ||
    stage === 'menu' ||
    stage === 'library' ||
    stage === 'settings' ||
    stage === 'room-setup' ||
    stage === 'character-setup' ||
    stage === 'lobby' ||
    stage === 'char-sheet' ||
    stage === 'char-vault' ||
    stage === 'char-wizard' ||
    stage === 'dm-dashboard' ||
    stage === 'bestiary'
  );
}

/** Stages that render the in-game cockpit. */
export function isPlayStage(stage: AppStage): boolean {
  return stage === 'local-play' || stage === 'game';
}

/**
 * Step indicator state for the gate hero.
 * Each step: 'complete' (passed), 'active' (current), 'pending' (future).
 */
export type StepStatus = 'complete' | 'active' | 'pending';

export type GateStepIndicator = {
  signIn: StepStatus;
  table: StepStatus;
  character: StepStatus;
  play: StepStatus;
};

export function getGateSteps(stage: AppStage): GateStepIndicator {
  switch (stage) {
    case 'login':
      return { signIn: 'active', table: 'pending', character: 'pending', play: 'pending' };
    case 'menu':
    case 'library':
    case 'settings':
      return { signIn: 'complete', table: 'active', character: 'pending', play: 'pending' };
    case 'character-setup':
      return { signIn: 'complete', table: 'complete', character: 'active', play: 'pending' };
    case 'game':
    case 'local-play':
      return { signIn: 'complete', table: 'complete', character: 'complete', play: 'active' };
    default:
      return { signIn: 'pending', table: 'pending', character: 'pending', play: 'pending' };
  }
}
