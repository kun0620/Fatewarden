import type { Campaign, Node } from '../engine/campaign/campaignTypes';
import { validateCampaign } from '../engine/campaign/campaignValidator';

export type CampaignTone = 'dark_fantasy' | 'horror' | 'heroic' | 'mystery' | 'comedy';

export type AiCampaignInput = {
  theme: string;
  tone: CampaignTone;
  acts: number;
  levelMin: number;
  levelMax: number;
  customInstructions: string;
};

export type AiCampaignValidationIssue = {
  message: string;
  nodeId?: string;
};

export type AiCampaignValidationResult = {
  campaign: Campaign | null;
  errors: AiCampaignValidationIssue[];
  warnings: AiCampaignValidationIssue[];
  summary: {
    acts: number;
    chapters: number;
    scenes: number;
    nodes: number;
  } | null;
};

const NODE_TYPES = new Set([
  'narration',
  'choice',
  'dice_check',
  'combat',
  'item_reward',
  'npc_dialogue',
  'condition_check',
  'cutscene',
  'end',
]);

const CAMPAIGN_SCHEMA = {
  meta: {
    id: 'string',
    title: 'string',
    description: 'string',
    version: 'string',
    author: 'string',
    recommended_level: 'number',
    recommended_level_min: 'number',
    recommended_level_max: 'number',
    min_players: 'number',
    max_players: 'number',
    tags: ['string'],
    thumbnail: 'string optional',
  },
  acts: [
    {
      id: 'string',
      title: 'string',
      description: 'string',
      order: 'number',
      chapters: [
        {
          id: 'string',
          title: 'string',
          description: 'string',
          order: 'number',
          scenes: [
            {
              id: 'string',
              title: 'string',
              location: 'string',
              mood: 'exploration | combat | social | horror | rest',
              entry_node_id: 'string',
              nodes: [
                {
                  type: 'narration | choice | dice_check | combat | item_reward | npc_dialogue | condition_check | cutscene | end',
                  id: 'string',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export function buildAiCampaignPrompt(input: AiCampaignInput): string {
  return `You are a D&D 5e campaign designer. Create a complete Fatewarden campaign in JSON format.

CAMPAIGN REQUIREMENTS:
- Theme: ${input.theme || '(user did not specify)'}
- Tone: ${input.tone}
- Number of Acts: ${input.acts}
- Character Level: ${input.levelMin}-${input.levelMax}
- Custom instructions: ${input.customInstructions || '(none)'}

FATEWARDEN CAMPAIGN SCHEMA:
${JSON.stringify(CAMPAIGN_SCHEMA, null, 2)}

NODE TYPES AVAILABLE:
- narration: text + optional image + next
- choice: prompt + options (min 2) + optional flags
- dice_check: skill + DC + on_success + on_fail
- combat: enemies + win/lose conditions
- item_reward: items list
- npc_dialogue: NPC name + lines + player responses + flags
- condition_check: conditions (flag/stat/inventory) + on_true + on_default
- cutscene: slides (text + optional image)
- end: ending_id + title + description

RULES:
- Every path must end at an "end" node
- Use converging branches (paths split but merge back)
- All node IDs must be unique within the campaign
- Flags use boolean or counter (number) only
- Condition checks can check: flags, character stats, inventory items
- Include at least one combat node per chapter
- Include at least one npc_dialogue node per act
- Generate meaningful flag names in snake_case

OUTPUT:
- Return ONLY valid JSON
- No markdown code blocks
- No explanations
- Follow the schema exactly`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function summarizeCampaign(campaign: Campaign) {
  let chapters = 0;
  let scenes = 0;
  let nodes = 0;
  for (const act of campaign.acts) {
    chapters += act.chapters.length;
    for (const chapter of act.chapters) {
      scenes += chapter.scenes.length;
      for (const scene of chapter.scenes) nodes += scene.nodes.length;
    }
  }
  return { acts: campaign.acts.length, chapters, scenes, nodes };
}

function collectNodes(campaign: Campaign): Node[] {
  return campaign.acts.flatMap((act) =>
    act.chapters.flatMap((chapter) =>
      chapter.scenes.flatMap((scene) => scene.nodes),
    ),
  );
}

function getNodeTargets(node: Node): string[] {
  switch (node.type) {
    case 'narration':
    case 'item_reward':
    case 'npc_dialogue':
    case 'cutscene':
      return [node.next].filter(Boolean);
    case 'choice':
      return node.options.map((option) => option.next).filter(Boolean);
    case 'dice_check':
      return [node.on_success, node.on_fail, node.on_critical_success, node.on_critical_fail].filter(Boolean) as string[];
    case 'combat':
      return [node.on_win, node.on_lose].filter(Boolean);
    case 'condition_check':
      return [...node.conditions.map((condition) => condition.on_true), node.on_default].filter(Boolean);
    case 'end':
      return [];
    default:
      return [];
  }
}

function hasPathToEnd(nodeId: string, nodeMap: Map<string, Node>, visiting = new Set<string>()): boolean {
  const node = nodeMap.get(nodeId);
  if (!node) return false;
  if (node.type === 'end') return true;
  if (visiting.has(nodeId)) return false;
  visiting.add(nodeId);
  const targets = getNodeTargets(node);
  if (!targets.length) return false;
  return targets.every((target) => hasPathToEnd(target, nodeMap, new Set(visiting)));
}

export function validateAiCampaignJson(json: string): AiCampaignValidationResult {
  const errors: AiCampaignValidationIssue[] = [];
  const warnings: AiCampaignValidationIssue[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch (error) {
    return {
      campaign: null,
      errors: [{ message: `JSON parse error: ${error instanceof Error ? error.message : 'Invalid JSON'}` }],
      warnings,
      summary: null,
    };
  }

  if (!isRecord(parsed)) {
    return { campaign: null, errors: [{ message: 'Campaign JSON must be an object.' }], warnings, summary: null };
  }

  if (!isRecord(parsed.meta)) errors.push({ message: 'Missing required field: meta' });
  if (!Array.isArray(parsed.acts)) errors.push({ message: 'Missing required field: acts' });

  if (errors.length) return { campaign: null, errors, warnings, summary: null };

  const rawActs = parsed.acts as unknown[];
  rawActs.forEach((act, actIndex) => {
    if (!isRecord(act)) {
      errors.push({ message: `Act ${actIndex + 1} must be an object.` });
      return;
    }
    if (!Array.isArray(act.chapters)) errors.push({ message: `Missing required field: acts[${actIndex}].chapters` });
    (Array.isArray(act.chapters) ? act.chapters : []).forEach((chapter, chapterIndex) => {
      if (!isRecord(chapter)) {
        errors.push({ message: `Chapter ${actIndex + 1}.${chapterIndex + 1} must be an object.` });
        return;
      }
      if (!Array.isArray(chapter.scenes)) errors.push({ message: `Missing required field: chapters[${chapterIndex}].scenes` });
      (Array.isArray(chapter.scenes) ? chapter.scenes : []).forEach((scene, sceneIndex) => {
        if (!isRecord(scene)) {
          errors.push({ message: `Scene ${actIndex + 1}.${chapterIndex + 1}.${sceneIndex + 1} must be an object.` });
          return;
        }
        if (!Array.isArray(scene.nodes)) errors.push({ message: `Missing required field: scenes[${sceneIndex}].nodes` });
      });
    });
  });

  if (errors.length) return { campaign: null, errors, warnings, summary: null };

  const campaign = parsed as unknown as Campaign;
  const nodes = collectNodes(campaign);
  const seenNodeIds = new Set<string>();
  const duplicateNodeIds = new Set<string>();
  let hasCombat = false;

  for (const node of nodes) {
    if (!NODE_TYPES.has(node.type)) {
      errors.push({ message: `Unknown node type: ${String(node.type)}`, nodeId: node.id });
    }
    if (seenNodeIds.has(node.id)) duplicateNodeIds.add(node.id);
    seenNodeIds.add(node.id);
    if (node.type === 'combat') hasCombat = true;
  }

  duplicateNodeIds.forEach((nodeId) => errors.push({ message: `Duplicate node ID: ${nodeId}`, nodeId }));

  if (!hasCombat) warnings.push({ message: 'No combat node found.' });

  const engineValidation = validateCampaign(campaign);
  for (const error of engineValidation.errors) {
    const target = error.type === 'orphaned_flag' ? warnings : errors;
    target.push({ message: error.message, nodeId: error.node_id });
  }
  for (const warning of engineValidation.warnings) {
    warnings.push({ message: warning.message, nodeId: warning.node_id });
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  for (const node of nodes) {
    if (node.type !== 'end' && !hasPathToEnd(node.id, nodeMap)) {
      errors.push({ message: `Node "${node.id}" has no complete path to an end node.`, nodeId: node.id });
    }
  }

  return {
    campaign: errors.length ? null : campaign,
    errors,
    warnings,
    summary: summarizeCampaign(campaign),
  };
}
