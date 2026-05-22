import type { Campaign, Act, Chapter, Scene, Node } from './campaignTypes';

/* ── Export ──────────────────────────────────────────────────────────────────── */

export function exportCampaignJSON(campaign: Campaign): string {
  return JSON.stringify(campaign, null, 2);
}

export function downloadCampaignJSON(campaign: Campaign, filename: string): void {
  const json = exportCampaignJSON(campaign);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Import ──────────────────────────────────────────────────────────────────── */

export function importCampaignJSON(json: string): Campaign | { error: string } {
  try {
    const parsed = JSON.parse(json);

    // Basic schema validation
    if (!parsed.meta || !parsed.acts || !Array.isArray(parsed.acts)) {
      return { error: 'Invalid campaign format: missing meta or acts' };
    }

    if (!parsed.meta.id || !parsed.meta.title) {
      return { error: 'Invalid campaign format: missing meta.id or meta.title' };
    }

    return parsed as Campaign;
  } catch (e) {
    return { error: `JSON parse error: ${(e as Error).message}` };
  }
}

/* ── Templates ───────────────────────────────────────────────────────────────── */

export function createBlankTemplate(): Campaign {
  const nodeId = `node_${Date.now()}`;

  return {
    meta: {
      id: `campaign_${Date.now()}`,
      title: 'New Campaign',
      description: '',
      author: 'Designer',
      thumbnail: '',
      recommended_level: 1,
      min_players: 1,
      max_players: 4,
      version: '1.0.0'
    },
    acts: [
      {
        id: `act_1`,
        title: 'Act 1',
        description: '',
        order: 1,
        chapters: [
          {
            id: `chapter_1_1`,
            title: 'Chapter 1',
            description: '',
            order: 1,
            scenes: [
              {
                id: `scene_1_1_1`,
                title: 'Scene 1',
                location: 'Unknown',
                mood: 'exploration',
                entry_node_id: nodeId,
                nodes: [
                  {
                    id: nodeId,
                    type: 'narration',
                    text: 'Your story begins...',
                    next: ''
                  } as Node
                ]
              }
            ]
          }
        ]
      }
    ]
  };
}

export function createLinearTemplate(): Campaign {
  const nodes: Node[] = [];

  // Create 10 linear nodes
  for (let i = 0; i < 10; i++) {
    const nodeId = `node_linear_${i}`;
    const nextNodeId = i < 9 ? `node_linear_${i + 1}` : `node_linear_end`;

    nodes.push({
      id: nodeId,
      type: 'narration',
      text: `Paragraph ${i + 1}...`,
      next: nextNodeId
    } as Node);
  }

  // End node
  nodes.push({
    id: `node_linear_end`,
    type: 'end',
    ending_id: 'ending_linear',
    title: 'The End',
    description: 'You have reached the end.'
  } as Node);

  return {
    meta: {
      id: `campaign_${Date.now()}`,
      title: 'Linear Story',
      description: 'A straightforward, branching-free narrative',
      author: 'Designer',
      thumbnail: '',
      recommended_level: 1,
      min_players: 1,
      max_players: 4,
      version: '1.0.0'
    },
    acts: [
      {
        id: 'act_1',
        title: 'The Journey',
        description: '',
        order: 1,
        chapters: [
          {
            id: 'chapter_1',
            title: 'Chapter 1',
            description: '',
            order: 1,
            scenes: [
              {
                id: 'scene_1',
                title: 'Scene 1',
                location: 'Road',
                mood: 'exploration',
                entry_node_id: 'node_linear_0',
                nodes
              }
            ]
          }
        ]
      }
    ]
  };
}

export function createBranchingTemplate(): Campaign {
  const nodes: Node[] = [];

  // Start choice
  nodes.push({
    id: 'node_start',
    type: 'choice',
    prompt: 'What do you do?',
    options: [
      { id: 'opt_1', text: 'Go left', next: 'node_left_1' },
      { id: 'opt_2', text: 'Go right', next: 'node_right_1' },
      { id: 'opt_3', text: 'Go straight', next: 'node_straight_1' }
    ]
  } as Node);

  // Left branch
  nodes.push({
    id: 'node_left_1',
    type: 'narration',
    text: 'You venture left...',
    next: 'node_merge_1'
  } as Node);

  // Right branch
  nodes.push({
    id: 'node_right_1',
    type: 'narration',
    text: 'You venture right...',
    next: 'node_merge_1'
  } as Node);

  // Straight branch
  nodes.push({
    id: 'node_straight_1',
    type: 'narration',
    text: 'You go straight ahead...',
    next: 'node_merge_1'
  } as Node);

  // Converge
  nodes.push({
    id: 'node_merge_1',
    type: 'narration',
    text: 'All paths lead to the same place.',
    next: 'node_choice_2'
  } as Node);

  // Second choice
  nodes.push({
    id: 'node_choice_2',
    type: 'choice',
    prompt: 'Final decision?',
    options: [
      { id: 'opt_a', text: 'Accept', next: 'node_end_good' },
      { id: 'opt_b', text: 'Refuse', next: 'node_end_bad' }
    ]
  } as Node);

  // Endings
  nodes.push({
    id: 'node_end_good',
    type: 'end',
    ending_id: 'ending_good',
    title: 'Success',
    description: 'You succeeded!'
  } as Node);

  nodes.push({
    id: 'node_end_bad',
    type: 'end',
    ending_id: 'ending_bad',
    title: 'Failure',
    description: 'You failed!'
  } as Node);

  return {
    meta: {
      id: `campaign_${Date.now()}`,
      title: 'Branching Story',
      description: 'Multiple paths converging',
      author: 'Designer',
      thumbnail: '',
      recommended_level: 1,
      min_players: 1,
      max_players: 4,
      version: '1.0.0'
    },
    acts: [
      {
        id: 'act_1',
        title: 'The Adventure',
        description: '',
        order: 1,
        chapters: [
          {
            id: 'chapter_1',
            title: 'Chapter 1',
            description: '',
            order: 1,
            scenes: [
              {
                id: 'scene_1',
                title: 'The Beginning',
                location: 'Village',
                mood: 'exploration',
                entry_node_id: 'node_start',
                nodes
              }
            ]
          }
        ]
      }
    ]
  };
}

export function createMysteryTemplate(): Campaign {
  const nodes: Node[] = [];

  // Start narration
  nodes.push({
    id: 'node_intro',
    type: 'narration',
    text: 'A mysterious letter arrives at your door...',
    next: 'node_investigate'
  } as Node);

  // Investigation choice
  nodes.push({
    id: 'node_investigate',
    type: 'choice',
    prompt: 'How do you investigate?',
    options: [
      { id: 'opt_clues', text: 'Search for clues', next: 'node_clue_check', set_flags: [{ key: 'found_clues', value: true }] },
      { id: 'opt_npc', text: 'Ask around town', next: 'node_talk_npc' }
    ]
  } as Node);

  // Clue check
  nodes.push({
    id: 'node_clue_check',
    type: 'dice_check',
    description: 'Can you find the hidden clue?',
    skill: 'investigation',
    dc: 12,
    on_success: 'node_found_secret',
    on_fail: 'node_missed_clue'
  } as Node);

  // Found secret
  nodes.push({
    id: 'node_found_secret',
    type: 'narration',
    text: 'You discover a hidden passage!',
    next: 'node_condition_check'
  } as Node);

  // Missed clue
  nodes.push({
    id: 'node_missed_clue',
    type: 'narration',
    text: 'You find nothing unusual.',
    next: 'node_condition_check'
  } as Node);

  // Talk NPC
  nodes.push({
    id: 'node_talk_npc',
    type: 'npc_dialogue',
    npc_name: 'Elder Marin',
    lines: [
      { speaker: 'npc', text: 'I know something about that letter...' },
      { speaker: 'player', text: 'Tell me everything!', options: [{ text: 'Continue', set_flags: [{ key: 'knows_truth', value: true }] }] }
    ],
    next: 'node_condition_check'
  } as Node);

  // Condition check
  nodes.push({
    id: 'node_condition_check',
    type: 'condition_check',
    conditions: [
      { check: 'flag', flag_key: 'found_clues', flag_value: true, on_true: 'node_true_ending' }
    ],
    on_default: 'node_false_ending'
  } as Node);

  // Endings
  nodes.push({
    id: 'node_true_ending',
    type: 'end',
    ending_id: 'ending_truth',
    title: 'The Truth',
    description: 'You uncovered the mystery!'
  } as Node);

  nodes.push({
    id: 'node_false_ending',
    type: 'end',
    ending_id: 'ending_unsolved',
    title: 'The Mystery Remains',
    description: 'Some mysteries are meant to stay hidden.'
  } as Node);

  return {
    meta: {
      id: `campaign_${Date.now()}`,
      title: 'Mystery Campaign',
      description: 'Uncover the secrets',
      author: 'Designer',
      thumbnail: '',
      recommended_level: 1,
      min_players: 1,
      max_players: 4,
      version: '1.0.0'
    },
    acts: [
      {
        id: 'act_1',
        title: 'The Investigation',
        description: '',
        order: 1,
        chapters: [
          {
            id: 'chapter_1',
            title: 'Chapter 1',
            description: '',
            order: 1,
            scenes: [
              {
                id: 'scene_1',
                title: 'The Beginning',
                location: 'Home',
                mood: 'exploration',
                entry_node_id: 'node_intro',
                nodes
              }
            ]
          }
        ]
      }
    ]
  };
}

// Minimal templates for Dungeon Crawl and Escort Mission
export function createDungeonCrawlTemplate(): Campaign {
  return createLinearTemplate();
}

export function createEscortMissionTemplate(): Campaign {
  return createLinearTemplate();
}

export const TEMPLATES = {
  blank: { name: 'Blank', fn: createBlankTemplate },
  linear: { name: 'Linear', fn: createLinearTemplate },
  branching: { name: 'Branching', fn: createBranchingTemplate },
  mystery: { name: 'Mystery', fn: createMysteryTemplate },
  dungeon_crawl: { name: 'Dungeon Crawl', fn: createDungeonCrawlTemplate },
  escort_mission: { name: 'Escort Mission', fn: createEscortMissionTemplate }
};
