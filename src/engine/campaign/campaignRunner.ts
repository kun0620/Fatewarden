import type {
  Campaign, Scene, Node, Flag, CampaignSave, CharacterSnapshot
} from './campaignTypes';
import type {
  RunnerState, PlayerState, CampaignSession, NodeRenderContext,
  DiceRollResult, CoopDiceResult, ChoiceVote, ChoiceVoteResult,
  CampaignProgress, ActProgress, ChapterProgress, SceneProgress
} from './campaignRunnerTypes';
import type { Character } from '../../types';
import { findNodeInCampaign, findSceneInCampaign, setFlags, checkCondition } from './campaignEngine';
import {
  isNarrationNode, isChoiceNode, isDiceCheckNode, isCombatNode,
  isItemRewardNode, isNPCDialogueNode, isConditionCheckNode,
  isCutsceneNode, isEndNode
} from './campaignTypes';

/* ── Session Creation ────────────────────────────────────────────────────────── */

export function createRunnerState(
  campaign: Campaign,
  hostPlayerId: string,
  playerIds: string[],
  characters: Record<string, Character>
): RunnerState {
  const firstScene = campaign.acts[0]?.chapters[0]?.scenes[0];
  if (!firstScene) throw new Error('Campaign has no scenes');

  const party: Record<string, PlayerState> = {};
  for (const playerId of playerIds) {
    const char = characters[playerId];
    if (!char) throw new Error(`Character not found for player ${playerId}`);

    party[playerId] = {
      player_id: playerId,
      character_id: char.id,
      character: char,
      hp: char.hitPoints,
      conditions: [...char.activeConditions],
      inventory: {}, // campaign-tracked items, start empty
      spell_slots: char.spellSlots ?? {},
      class_resources: []
    };
  }

  return {
    campaign_id: campaign.meta.id,
    current_node_id: firstScene.entry_node_id,
    current_scene_id: firstScene.id,
    flags: {},
    party,
    is_multiplayer: playerIds.length > 1,
    host_player_id: hostPlayerId,
    updated_at: Date.now()
  };
}

export function createCampaignSession(
  campaignId: string,
  ownerId: string,
  playerIds: string[],
  state: RunnerState
): CampaignSession {
  return {
    id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    campaign_id: campaignId,
    owner_id: ownerId,
    player_ids: playerIds,
    is_active: true,
    current_state: state,
    created_at: Date.now(),
    updated_at: Date.now()
  };
}

/* ── State Updates ───────────────────────────────────────────────────────────── */

export function updatePlayerHP(
  state: RunnerState,
  playerId: string,
  newHP: number
): RunnerState {
  const player = state.party[playerId];
  if (!player) return state;

  return {
    ...state,
    party: {
      ...state.party,
      [playerId]: {
        ...player,
        hp: Math.max(0, newHP)
      }
    },
    updated_at: Date.now()
  };
}

export function addPlayerCondition(
  state: RunnerState,
  playerId: string,
  condition: string
): RunnerState {
  const player = state.party[playerId];
  if (!player || player.conditions.includes(condition)) return state;

  return {
    ...state,
    party: {
      ...state.party,
      [playerId]: {
        ...player,
        conditions: [...player.conditions, condition]
      }
    },
    updated_at: Date.now()
  };
}

export function removePlayerCondition(
  state: RunnerState,
  playerId: string,
  condition: string
): RunnerState {
  const player = state.party[playerId];
  if (!player) return state;

  return {
    ...state,
    party: {
      ...state.party,
      [playerId]: {
        ...player,
        conditions: player.conditions.filter(c => c !== condition)
      }
    },
    updated_at: Date.now()
  };
}

export function addPlayerItem(
  state: RunnerState,
  playerId: string,
  itemId: string,
  quantity: number = 1
): RunnerState {
  const player = state.party[playerId];
  if (!player) return state;

  return {
    ...state,
    party: {
      ...state.party,
      [playerId]: {
        ...player,
        inventory: {
          ...player.inventory,
          [itemId]: (player.inventory[itemId] ?? 0) + quantity
        }
      }
    },
    updated_at: Date.now()
  };
}

export function setStateFlags(state: RunnerState, newFlags: Flag[]): RunnerState {
  return {
    ...state,
    flags: setFlags(state.flags, newFlags),
    updated_at: Date.now()
  };
}

/* ── Node Navigation ─────────────────────────────────────────────────────────── */

export function getNextNode(
  campaign: Campaign,
  state: RunnerState,
  node: Node
): string | null {
  // Narration, Item Reward, Cutscene: simple next
  if (isNarrationNode(node) || isItemRewardNode(node) || isCutsceneNode(node)) {
    return node.next;
  }

  // Choice: no auto-next, wait for user choice
  if (isChoiceNode(node)) {
    return null;
  }

  // Dice Check: no auto-next, wait for roll
  if (isDiceCheckNode(node)) {
    return null;
  }

  // Combat: no auto-next, wait for combat result
  if (isCombatNode(node)) {
    return null;
  }

  // NPC Dialogue: no auto-next, wait for dialogue end
  if (isNPCDialogueNode(node)) {
    return node.next;
  }

  // Condition Check: check and route
  if (isConditionCheckNode(node)) {
    for (const condition of node.conditions) {
      const stats = state.party[state.host_player_id]?.character.systemData ?? {};
      const inventory = state.party[state.host_player_id]?.inventory;

      if (checkCondition(condition as any, state.flags, stats as any, inventory)) {
        return condition.on_true;
      }
    }
    return node.on_default;
  }

  // End: no next
  if (isEndNode(node)) {
    return null;
  }

  return null;
}

export function transitionToNode(
  campaign: Campaign,
  state: RunnerState,
  targetNodeId: string
): RunnerState {
  const targetNode = findNodeInCampaign(campaign, targetNodeId);
  if (!targetNode) return state;

  const scene = findSceneInCampaign(campaign, targetNodeId) || findSceneInCampaign(campaign, state.current_scene_id);
  if (!scene) return state;

  return {
    ...state,
    current_node_id: targetNodeId,
    current_scene_id: scene.id,
    updated_at: Date.now()
  };
}

/* ── Choice Voting ───────────────────────────────────────────────────────────── */

export function aggregateVotes(votes: ChoiceVote[]): ChoiceVoteResult {
  const voteMap: Record<string, number> = {};

  for (const vote of votes) {
    voteMap[vote.option_id] = (voteMap[vote.option_id] ?? 0) + 1;
  }

  const winning = Object.entries(voteMap).reduce((a, b) =>
    b[1] > a[1] ? b : a
  );

  return {
    votes,
    winning_option_id: winning[0],
    majority: winning[1]
  };
}

/* ── Dice Rolling ────────────────────────────────────────────────────────────── */

export function rollDice(playerId: string, character: Character, skill: string): DiceRollResult {
  const d20 = 1 + Math.floor(Math.random() * 20);
  const profBonus = character.systemData?.proficiencyBonus;
  const bonus = typeof profBonus === 'number' ? profBonus : 0;
  const total = d20 + bonus;

  return {
    player_id: playerId,
    character_name: character.name,
    skill,
    value: d20,
    bonus,
    total,
    dc: 0,
    success: false,
    critical_success: d20 === 20,
    critical_fail: d20 === 1
  };
}

export function aggregateDiceRolls(
  rolls: DiceRollResult[],
  method: 'highest_stat' | 'all_best' | 'all_worst'
): DiceRollResult {
  if (rolls.length === 0) throw new Error('No rolls to aggregate');
  if (rolls.length === 1) return rolls[0];

  switch (method) {
    case 'all_best':
      return rolls.reduce((best, curr) =>
        curr.total > best.total ? curr : best
      );
    case 'all_worst':
      return rolls.reduce((worst, curr) =>
        curr.total < worst.total ? curr : worst
      );
    default:
      return rolls[0];
  }
}

export function evaluateDiceResult(result: DiceRollResult, dc: number): DiceRollResult {
  return {
    ...result,
    dc,
    success: result.total >= dc && !result.critical_fail,
    critical_success: result.critical_success,
    critical_fail: result.critical_fail
  };
}

/* ── Auto-Save ───────────────────────────────────────────────────────────────── */

export function createCampaignSave(state: RunnerState): CampaignSave {
  // Build character snapshots from party state
  const snapshotExample = Object.values(state.party)[0];
  if (!snapshotExample) throw new Error('No players in party');

  return {
    campaign_id: state.campaign_id,
    player_id: state.host_player_id,
    current_node_id: state.current_node_id,
    flags: state.flags,
    character_snapshot: {
      hp: snapshotExample.hp,
      conditions: snapshotExample.conditions,
      inventory: snapshotExample.inventory,
      spell_slots: snapshotExample.spell_slots,
      class_resources: snapshotExample.class_resources
    },
    updated_at: Date.now()
  };
}

export function restoreFromSave(
  campaign: Campaign,
  save: CampaignSave,
  currentParty: Record<string, PlayerState>
): RunnerState {
  const targetScene = findSceneInCampaign(campaign, save.current_node_id);

  return {
    campaign_id: save.campaign_id,
    current_node_id: save.current_node_id,
    current_scene_id: targetScene?.id ?? '',
    flags: save.flags,
    party: currentParty,
    is_multiplayer: Object.keys(currentParty).length > 1,
    host_player_id: save.player_id,
    updated_at: Date.now()
  };
}

/* ── Progress Tracking ───────────────────────────────────────────────────────── */

export function buildProgressMap(
  campaign: Campaign,
  currentNodeId: string,
  visitedNodeIds: Set<string>
): CampaignProgress {
  const acts: ActProgress[] = campaign.acts.map(act => ({
    act_id: act.id,
    title: act.title,
    visited: false,
    current: false,
    chapters: act.chapters.map(chapter => ({
      chapter_id: chapter.id,
      title: chapter.title,
      visited: false,
      current: false,
      scenes: chapter.scenes.map(scene => ({
        scene_id: scene.id,
        title: scene.title,
        visited: false,
        current: false,
        nodes: scene.nodes.map(node => ({
          node_id: node.id,
          visited: visitedNodeIds.has(node.id),
          current: node.id === currentNodeId
        }))
      }))
    }))
  }));

  // Mark visited/current
  for (const act of acts) {
    let actVisited = false;
    for (const chapter of act.chapters) {
      let chapterVisited = false;
      for (const scene of chapter.scenes) {
        let sceneVisited = false;
        let sceneCurrent = false;
        for (const node of scene.nodes) {
          if (node.visited) sceneVisited = true;
          if (node.current) sceneCurrent = true;
        }
        scene.visited = sceneVisited;
        scene.current = sceneCurrent;
        if (sceneVisited || sceneCurrent) chapterVisited = true;
      }
      chapter.visited = chapterVisited;
      chapter.current = chapter.scenes.some((s: SceneProgress) => s.current);
      if (chapterVisited) actVisited = true;
    }
    act.visited = actVisited;
    act.current = act.chapters.some(c => c.current);
  }

  return {
    campaign_id: campaign.meta.id,
    acts
  };
}
