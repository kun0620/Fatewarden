import type { Campaign, Node } from './campaignTypes';
import type { ValidationResult, ValidationError, ValidationWarning } from './campaignCreatorTypes';
import {
  isNarrationNode, isChoiceNode, isDiceCheckNode, isCombatNode,
  isItemRewardNode, isNPCDialogueNode, isConditionCheckNode,
  isCutsceneNode, isEndNode
} from './campaignTypes';
import { findNodeInCampaign } from './campaignEngine';

/* ── Validation Entry Point ──────────────────────────────────────────────────── */

export function validateCampaign(campaign: Campaign): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check campaign structure
  if (campaign.acts.length === 0) {
    warnings.push({
      type: 'missing_structure',
      message: 'Campaign has no acts'
    });
  }

  // Collect all nodes and track visited
  const allNodes = new Map<string, Node>();
  const nodeConnections = new Map<string, Set<string>>();

  for (const act of campaign.acts) {
    for (const chapter of act.chapters) {
      for (const scene of chapter.scenes) {
        for (const node of scene.nodes) {
          allNodes.set(node.id, node);
          nodeConnections.set(node.id, new Set());
        }
      }
    }
  }

  // Check required fields and connections
  for (const [nodeId, node] of allNodes) {
    const nodeErrors = validateNode(node, allNodes);
    errors.push(...nodeErrors);

    // Track connections
    const targets = getNodeConnections(node);
    for (const target of targets) {
      if (target) {
        nodeConnections.get(nodeId)?.add(target);
      }
    }
  }

  // Check for dead ends
  for (const [nodeId, node] of allNodes) {
    if (!isEndNode(node)) {
      const connections = nodeConnections.get(nodeId);
      if (!connections || connections.size === 0) {
        errors.push({
          type: 'dead_end_node',
          node_id: nodeId,
          message: `Node "${node.id}" has no output connections (not an End node)`
        });
      }
    }
  }

  // Check for at least one End node
  const hasEndNode = Array.from(allNodes.values()).some(n => isEndNode(n));
  if (!hasEndNode) {
    errors.push({
      type: 'no_end_node',
      message: 'Campaign must have at least one End node'
    });
  }

  // Check for unreachable nodes
  const reachableNodes = getReachableNodes(campaign, allNodes);
  for (const [nodeId] of allNodes) {
    if (!reachableNodes.has(nodeId)) {
      warnings.push({
        type: 'unreachable_node',
        node_id: nodeId,
        message: `Node "${nodeId}" is unreachable from start`
      });
    }
  }

  // Check for orphaned flags
  const usedFlags = new Set<string>();
  const setFlags = new Set<string>();

  for (const node of allNodes.values()) {
    // Collect flags used in conditions
    if (isConditionCheckNode(node)) {
      for (const cond of node.conditions) {
        if (cond.check === 'flag' && cond.flag_key) {
          usedFlags.add(cond.flag_key);
        }
      }
    }

    // Collect flags set in actions
    if (isChoiceNode(node)) {
      for (const opt of node.options) {
        if (opt.set_flags) {
          for (const flag of opt.set_flags) {
            setFlags.add(flag.key);
          }
        }
      }
    }
    if (isNPCDialogueNode(node)) {
      for (const line of node.lines) {
        if (line.options) {
          for (const opt of line.options) {
            if (opt.set_flags) {
              for (const flag of opt.set_flags) {
                setFlags.add(flag.key);
              }
            }
          }
        }
      }
    }
  }

  // Flag used but never set
  for (const flag of usedFlags) {
    if (!setFlags.has(flag)) {
      errors.push({
        type: 'orphaned_flag',
        message: `Flag "${flag}" is used but never set`
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/* ── Node Validation ─────────────────────────────────────────────────────────── */

function validateNode(node: Node, allNodes: Map<string, Node>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (isNarrationNode(node)) {
    if (!node.text) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `Narration: text is required`
      });
    }
    if (!node.next || !allNodes.has(node.next)) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `Narration: next connection is required`
      });
    }
  } else if (isChoiceNode(node)) {
    if (!node.prompt) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `Choice: prompt is required`
      });
    }
    if (node.options.length < 2) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `Choice: at least 2 options required`
      });
    }
    for (const opt of node.options) {
      if (!opt.next || !allNodes.has(opt.next)) {
        errors.push({
          type: 'missing_required_field',
          node_id: node.id,
          message: `Choice: all options must have connections`
        });
      }
    }
  } else if (isDiceCheckNode(node)) {
    if (!node.description) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `Dice Check: description is required`
      });
    }
    if (!node.skill) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `Dice Check: skill is required`
      });
    }
    if (node.dc === undefined) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `Dice Check: DC is required`
      });
    }
    if (!node.on_success || !allNodes.has(node.on_success)) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `Dice Check: on_success connection is required`
      });
    }
    if (!node.on_fail || !allNodes.has(node.on_fail)) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `Dice Check: on_fail connection is required`
      });
    }
  } else if (isCombatNode(node)) {
    if (!node.enemies || node.enemies.length === 0) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `Combat: at least 1 enemy is required`
      });
    }
    if (!node.on_win || !allNodes.has(node.on_win)) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `Combat: on_win connection is required`
      });
    }
    if (!node.on_lose || !allNodes.has(node.on_lose)) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `Combat: on_lose connection is required`
      });
    }
  } else if (isItemRewardNode(node)) {
    if (!node.description) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `Item Reward: description is required`
      });
    }
    if (!node.items || node.items.length === 0) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `Item Reward: at least 1 item is required`
      });
    }
    if (!node.next || !allNodes.has(node.next)) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `Item Reward: next connection is required`
      });
    }
  } else if (isNPCDialogueNode(node)) {
    if (!node.npc_name) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `NPC Dialogue: npc_name is required`
      });
    }
    if (!node.lines || node.lines.length === 0) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `NPC Dialogue: at least 1 line is required`
      });
    }
    if (!node.next || !allNodes.has(node.next)) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `NPC Dialogue: next connection is required`
      });
    }
  } else if (isConditionCheckNode(node)) {
    if (!node.conditions || node.conditions.length === 0) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `Condition Check: at least 1 condition is required`
      });
    }
    if (!node.on_default || !allNodes.has(node.on_default)) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `Condition Check: on_default connection is required`
      });
    }
    for (const cond of node.conditions) {
      if (!cond.on_true || !allNodes.has(cond.on_true)) {
        errors.push({
          type: 'missing_required_field',
          node_id: node.id,
          message: `Condition Check: all conditions must have on_true connections`
        });
      }
    }
  } else if (isCutsceneNode(node)) {
    if (!node.slides || node.slides.length === 0) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `Cutscene: at least 1 slide is required`
      });
    }
    if (!node.next || !allNodes.has(node.next)) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `Cutscene: next connection is required`
      });
    }
  } else if (isEndNode(node)) {
    if (!node.ending_id) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `End: ending_id is required`
      });
    }
    if (!node.title) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `End: title is required`
      });
    }
    if (!node.description) {
      errors.push({
        type: 'missing_required_field',
        node_id: node.id,
        message: `End: description is required`
      });
    }
  }

  return errors;
}

/* ── Helper Functions ────────────────────────────────────────────────────────── */

function getNodeConnections(node: Node): (string | null)[] {
  const connections: (string | null)[] = [];

  if (isNarrationNode(node)) {
    connections.push(node.next);
  } else if (isChoiceNode(node)) {
    for (const opt of node.options) {
      connections.push(opt.next);
    }
  } else if (isDiceCheckNode(node)) {
    connections.push(node.on_success, node.on_fail);
    if (node.on_critical_success) connections.push(node.on_critical_success);
    if (node.on_critical_fail) connections.push(node.on_critical_fail);
  } else if (isCombatNode(node)) {
    connections.push(node.on_win, node.on_lose);
  } else if (isConditionCheckNode(node)) {
    for (const cond of node.conditions) {
      connections.push(cond.on_true);
    }
    connections.push(node.on_default);
  } else if (isItemRewardNode(node) || isNPCDialogueNode(node) || isCutsceneNode(node)) {
    connections.push(node.next);
  }

  return connections.filter(c => c !== null && c !== undefined);
}

function getReachableNodes(campaign: Campaign, allNodes: Map<string, Node>): Set<string> {
  const reachable = new Set<string>();
  const queue: string[] = [];

  // Start from first node
  const firstScene = campaign.acts[0]?.chapters[0]?.scenes[0];
  if (firstScene?.entry_node_id) {
    queue.push(firstScene.entry_node_id);
  }

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (reachable.has(nodeId)) continue;

    reachable.add(nodeId);
    const node = allNodes.get(nodeId);
    if (!node) continue;

    const connections = getNodeConnections(node);
    for (const target of connections) {
      if (target && !reachable.has(target)) {
        queue.push(target);
      }
    }
  }

  return reachable;
}

/* ── Status Badge Helpers ────────────────────────────────────────────────────── */

export function getNodeStatus(node: Node, allNodes: Map<string, Node>): 'complete' | 'incomplete' {
  const errors = validateNode(node, allNodes);
  return errors.length === 0 ? 'complete' : 'incomplete';
}

export function getNodePreview(node: Node): string {
  if (isNarrationNode(node)) {
    return node.text.substring(0, 20);
  } else if (isChoiceNode(node)) {
    return node.prompt.substring(0, 20);
  } else if (isDiceCheckNode(node)) {
    return node.description.substring(0, 20);
  } else if (isCombatNode(node)) {
    return `Combat: ${node.enemies[0]?.name || 'unknown'}`;
  } else if (isItemRewardNode(node)) {
    return node.description.substring(0, 20);
  } else if (isNPCDialogueNode(node)) {
    return node.npc_name.substring(0, 20);
  } else if (isConditionCheckNode(node)) {
    return `Condition: ${node.conditions.length} checks`;
  } else if (isCutsceneNode(node)) {
    return `Cutscene: ${node.slides.length} slides`;
  } else if (isEndNode(node)) {
    return node.title.substring(0, 20);
  }
  return '';
}
