import type {
  Campaign, Scene, Node, CampaignSave, Flag, BooleanFlag, CounterFlag
} from './campaignTypes';

/* ── Campaign Navigation ──────────────────────────────────────────────────────── */

export function findNodeInCampaign(campaign: Campaign, nodeId: string): Node | null {
  for (const act of campaign.acts) {
    for (const chapter of act.chapters) {
      for (const scene of chapter.scenes) {
        const node = scene.nodes.find(n => n.id === nodeId);
        if (node) return node;
      }
    }
  }
  return null;
}

export function findSceneInCampaign(campaign: Campaign, sceneId: string): Scene | null {
  for (const act of campaign.acts) {
    for (const chapter of act.chapters) {
      const scene = chapter.scenes.find(s => s.id === sceneId);
      if (scene) return scene;
    }
  }
  return null;
}

export function getNodeScene(campaign: Campaign, nodeId: string): Scene | null {
  for (const act of campaign.acts) {
    for (const chapter of act.chapters) {
      for (const scene of chapter.scenes) {
        if (scene.nodes.some(n => n.id === nodeId)) {
          return scene;
        }
      }
    }
  }
  return null;
}

/* ── Flag Management ──────────────────────────────────────────────────────────── */

export function getFlag(flags: Record<string, boolean | number>, key: string): boolean | number | null {
  return flags[key] ?? null;
}

export function setFlag(flags: Record<string, boolean | number>, flag: Flag): Record<string, boolean | number> {
  return {
    ...flags,
    [flag.key]: flag.value
  };
}

export function setFlags(flags: Record<string, boolean | number>, newFlags: Flag[]): Record<string, boolean | number> {
  let updated = flags;
  for (const flag of newFlags) {
    updated = setFlag(updated, flag);
  }
  return updated;
}

export function incrementCounter(flags: Record<string, boolean | number>, key: string, amount: number = 1): Record<string, boolean | number> {
  const current = flags[key] ?? 0;
  if (typeof current !== 'number') return flags;
  return {
    ...flags,
    [key]: current + amount
  };
}

export function decrementCounter(flags: Record<string, boolean | number>, key: string, amount: number = 1): Record<string, boolean | number> {
  return incrementCounter(flags, key, -amount);
}

/* ── Condition Checking ──────────────────────────────────────────────────────── */

export function checkCondition(
  condition: {
    check: 'flag' | 'stat' | 'inventory';
    flag_key?: string;
    flag_value?: boolean | number;
    operator?: 'eq' | 'gte' | 'lte' | 'gt' | 'lt';
    stat?: string;
    item_id?: string;
    quantity?: number;
  },
  flags: Record<string, boolean | number>,
  stats?: Record<string, number>,
  inventory?: Record<string, number>
): boolean {
  switch (condition.check) {
    case 'flag':
      if (!condition.flag_key) return false;
      const flagValue = flags[condition.flag_key];
      const expectedValue = condition.flag_value;
      const operator = condition.operator ?? 'eq';
      return compareValues(flagValue, expectedValue, operator);

    case 'stat':
      if (!condition.stat || !stats) return false;
      const statValue = stats[condition.stat];
      if (typeof statValue !== 'number') return false;
      const expectedStat = condition.flag_value;
      const statOp = condition.operator ?? 'eq';
      return compareValues(statValue, expectedStat, statOp);

    case 'inventory':
      if (!condition.item_id || !inventory) return false;
      const qty = inventory[condition.item_id] ?? 0;
      const expectedQty = condition.quantity ?? 1;
      return qty >= expectedQty;

    default:
      return false;
  }
}

function compareValues(actual: any, expected: any, operator: string): boolean {
  switch (operator) {
    case 'eq': return actual === expected;
    case 'gt': return actual > expected;
    case 'gte': return actual >= expected;
    case 'lt': return actual < expected;
    case 'lte': return actual <= expected;
    default: return false;
  }
}

/* ── Campaign Save/Load ──────────────────────────────────────────────────────── */

export function validateCampaignNodeIds(campaign: Campaign): string[] {
  const ids = new Set<string>();
  const duplicates: string[] = [];

  for (const act of campaign.acts) {
    for (const chapter of act.chapters) {
      for (const scene of chapter.scenes) {
        for (const node of scene.nodes) {
          if (ids.has(node.id)) {
            duplicates.push(node.id);
          } else {
            ids.add(node.id);
          }
        }
      }
    }
  }

  return duplicates;
}

export function serializeCampaign(campaign: Campaign): string {
  return JSON.stringify(campaign, null, 2);
}

export function deserializeCampaign(json: string): Campaign | null {
  try {
    const parsed = JSON.parse(json);
    // Basic validation
    if (!parsed.meta || !parsed.acts) return null;
    return parsed as Campaign;
  } catch {
    return null;
  }
}

export function serializeSave(save: CampaignSave): string {
  return JSON.stringify(save, null, 2);
}

export function deserializeSave(json: string): CampaignSave | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed.campaign_id || !parsed.player_id || !parsed.current_node_id) return null;
    return parsed as CampaignSave;
  } catch {
    return null;
  }
}

/* ── Campaign Statistics ──────────────────────────────────────────────────────── */

export function getCampaignStats(campaign: Campaign): {
  total_acts: number;
  total_chapters: number;
  total_scenes: number;
  total_nodes: number;
  nodes_by_type: Record<string, number>;
} {
  let totalActs = 0;
  let totalChapters = 0;
  let totalScenes = 0;
  let totalNodes = 0;
  const nodesByType: Record<string, number> = {};

  for (const act of campaign.acts) {
    totalActs++;
    for (const chapter of act.chapters) {
      totalChapters++;
      for (const scene of chapter.scenes) {
        totalScenes++;
        for (const node of scene.nodes) {
          totalNodes++;
          nodesByType[node.type] = (nodesByType[node.type] ?? 0) + 1;
        }
      }
    }
  }

  return {
    total_acts: totalActs,
    total_chapters: totalChapters,
    total_scenes: totalScenes,
    total_nodes: totalNodes,
    nodes_by_type: nodesByType
  };
}
