import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type {
  Campaign,
  CampaignMeta,
  ConditionCheckItem,
  Node,
} from '../engine/campaign/campaignTypes';
import { findNodeInCampaign } from '../engine/campaign/campaignEngine';
import { transitionToNode } from '../engine/campaign/campaignRunner';
import type { RunnerState } from '../engine/campaign/campaignRunnerTypes';
import { importCampaignJSON, TEMPLATES } from '../engine/campaign/campaignCreatorUtils';
import { getNodePreview, getNodeStatus, validateCampaign } from '../engine/campaign/campaignValidator';
import { CAMPAIGN_CREATOR_DRAFT_KEY } from '../lib/campaignDraft';
import { supabase } from '../lib/supabase';
import { uploadUserImage } from '../lib/storage';
import { Icon } from './ui/Icons';

type CampaignCreatorProps = {
  user: User;
  onBack: () => void;
};

type NodeType = Node['type'];
type PositionMap = Record<string, { x: number; y: number }>;
type ConnectionStart = { nodeId: string; port: string } | null;
type TemplateKey = keyof typeof TEMPLATES;
type NodeField = string | number | boolean | undefined | Array<unknown> | Record<string, unknown>;

const nodeTypes: Array<{ type: NodeType; label: string; icon: string }> = [
  { type: 'narration', label: 'Narration', icon: 'book' },
  { type: 'choice', label: 'Choice', icon: 'layers' },
  { type: 'dice_check', label: 'Dice Check', icon: 'dice' },
  { type: 'combat', label: 'Combat', icon: 'sword' },
  { type: 'item_reward', label: 'Item Reward', icon: 'bag' },
  { type: 'npc_dialogue', label: 'NPC Dialogue', icon: 'users' },
  { type: 'condition_check', label: 'Condition Check', icon: 'filter' },
  { type: 'cutscene', label: 'Cutscene', icon: 'eye' },
  { type: 'end', label: 'End', icon: 'crown' },
];

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <section className="fw-card" style={style}>{children}</section>;
}

function getAllNodes(campaign: Campaign): Node[] {
  return campaign.acts.flatMap((act) => act.chapters.flatMap((chapter) => chapter.scenes.flatMap((scene) => scene.nodes)));
}

function firstScene(campaign: Campaign) {
  return campaign.acts[0]?.chapters[0]?.scenes[0] ?? null;
}

function createNode(type: NodeType): Node {
  const id = `node_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  switch (type) {
    case 'narration':
      return { id, type, text: '', next: '' };
    case 'choice':
      return { id, type, prompt: '', options: [{ id: `${id}_a`, text: 'Option A', next: '' }, { id: `${id}_b`, text: 'Option B', next: '' }] };
    case 'dice_check':
      return { id, type, description: '', skill: 'perception', dc: 12, on_success: '', on_fail: '' };
    case 'combat':
      return {
        id,
        type,
        description: '',
        enemies: [{ name: 'Enemy', hp: 10, ac: 12, attack_bonus: 3, damage_dice: '1d6+1', damage_type: 'slashing' }],
        win_condition: 'kill_all',
        lose_condition: 'party_wipe',
        on_win: '',
        on_lose: '',
      };
    case 'item_reward':
      return { id, type, description: '', items: [{ name: 'Reward', description: '', quantity: 1 }], next: '' };
    case 'npc_dialogue':
      return { id, type, npc_name: 'NPC', lines: [{ speaker: 'npc', text: '' }], next: '' };
    case 'condition_check':
      return { id, type, conditions: [{ check: 'flag', flag_key: 'flag_name', flag_value: true, operator: 'eq', on_true: '' }], on_default: '' };
    case 'cutscene':
      return { id, type, slides: [{ text: '' }], next: '' };
    case 'end':
      return { id, type, ending_id: 'ending', title: 'The End', description: '' };
  }
}

function cloneWithNode(campaign: Campaign, updater: (nodes: Node[], sceneEntryId: string) => { nodes: Node[]; entryNodeId?: string }): Campaign {
  const scene = firstScene(campaign);
  if (!scene) return campaign;
  const result = updater(scene.nodes, scene.entry_node_id);
  return {
    ...campaign,
    acts: campaign.acts.map((act, actIndex) => actIndex ? act : {
      ...act,
      chapters: act.chapters.map((chapter, chapterIndex) => chapterIndex ? chapter : {
        ...chapter,
        scenes: chapter.scenes.map((nextScene, sceneIndex) => sceneIndex ? nextScene : {
          ...nextScene,
          entry_node_id: result.entryNodeId ?? nextScene.entry_node_id,
          nodes: result.nodes,
        }),
      }),
    }),
  };
}

function updateNode(campaign: Campaign, nodeId: string, updater: (node: Node) => Node): Campaign {
  return cloneWithNode(campaign, (nodes) => ({ nodes: nodes.map((node) => node.id === nodeId ? updater(node) : node) }));
}

function outputPorts(node: Node): string[] {
  switch (node.type) {
    case 'narration':
    case 'item_reward':
    case 'npc_dialogue':
    case 'cutscene':
      return ['next'];
    case 'choice':
      return node.options.map((_, index) => `option_${String.fromCharCode(65 + index)}`);
    case 'dice_check':
      return ['on_success', 'on_fail', 'on_critical_success', 'on_critical_fail'];
    case 'combat':
      return ['on_win', 'on_lose'];
    case 'condition_check':
      return [...node.conditions.map((_, index) => `on_true_${index + 1}`), 'on_default'];
    case 'end':
      return [];
  }
}

function portTarget(node: Node, port: string): string {
  if (node.type === 'choice') {
    const optionIndex = port.startsWith('option_') ? port.charCodeAt(port.length - 1) - 65 : -1;
    return node.options[optionIndex]?.next ?? '';
  }
  if (node.type === 'condition_check') {
    if (port === 'on_default') return node.on_default;
    const index = Number(port.replace('on_true_', '')) - 1;
    return node.conditions[index]?.on_true ?? '';
  }
  return String((node as unknown as Record<string, NodeField>)[port] ?? '');
}

function setPortTarget(node: Node, port: string, target: string): Node {
  if (node.type === 'choice') {
    const optionIndex = port.startsWith('option_') ? port.charCodeAt(port.length - 1) - 65 : -1;
    return { ...node, options: node.options.map((option, index) => index === optionIndex ? { ...option, next: target } : option) };
  }
  if (node.type === 'condition_check') {
    if (port === 'on_default') return { ...node, on_default: target };
    const index = Number(port.replace('on_true_', '')) - 1;
    return { ...node, conditions: node.conditions.map((condition, nextIndex) => nextIndex === index ? { ...condition, on_true: target } : condition) };
  }
  return { ...node, [port]: target } as Node;
}

function initialPositions(campaign: Campaign): PositionMap {
  const positions: PositionMap = {};
  getAllNodes(campaign).forEach((node, index) => {
    positions[node.id] = { x: 32 + (index % 3) * 260, y: 32 + Math.floor(index / 3) * 190 };
  });
  return positions;
}

function createRunnerState(campaign: Campaign): RunnerState {
  const scene = firstScene(campaign);
  return {
    campaign_id: campaign.meta.id,
    current_node_id: scene?.entry_node_id ?? getAllNodes(campaign)[0]?.id ?? '',
    current_scene_id: scene?.id ?? '',
    flags: {},
    party: {},
    is_multiplayer: false,
    host_player_id: 'playtest',
    updated_at: Date.now(),
  };
}

function levelMin(meta: CampaignMeta) {
  return meta.recommended_level_min ?? meta.recommended_level;
}

function levelMax(meta: CampaignMeta) {
  return meta.recommended_level_max ?? meta.recommended_level;
}

export default function CampaignCreator({ user, onBack }: CampaignCreatorProps) {
  const [campaign, setCampaign] = useState<Campaign>(() => {
    const stored = window.localStorage.getItem(CAMPAIGN_CREATOR_DRAFT_KEY);
    if (stored) {
      const imported = importCampaignJSON(stored);
      if (!('error' in imported)) return imported;
    }
    return TEMPLATES.blank.fn();
  });
  const [positions, setPositions] = useState<PositionMap>(() => initialPositions(campaign));
  const [selectedNodeId, setSelectedNodeId] = useState(() => firstScene(campaign)?.entry_node_id ?? getAllNodes(campaign)[0]?.id ?? '');
  const [draftDirty, setDraftDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [remoteId, setRemoteId] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(true);
  const [showPlaytest, setShowPlaytest] = useState(false);
  const [connecting, setConnecting] = useState<ConnectionStart>(null);
  const [dragLine, setDragLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [importError, setImportError] = useState('');
  const [playtestState, setPlaytestState] = useState<RunnerState>(() => createRunnerState(campaign));
  const [flagKey, setFlagKey] = useState('');
  const [flagValue, setFlagValue] = useState('true');
  const [statKey, setStatKey] = useState('level');
  const [statValue, setStatValue] = useState(1);
  const [stats, setStats] = useState<Record<string, number>>({ level: 1 });
  const [thumbnailBusy, setThumbnailBusy] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const nodes = useMemo(() => getAllNodes(campaign), [campaign]);
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const selectedNode = selectedNodeId ? findNodeInCampaign(campaign, selectedNodeId) : null;
  const validation = useMemo(() => validateCampaign(campaign), [campaign]);

  const markCampaign = useCallback((nextCampaign: Campaign) => {
    setCampaign(nextCampaign);
    setDraftDirty(true);
  }, []);

  const saveDraft = useCallback(async (nextCampaign = campaign) => {
    window.localStorage.setItem(CAMPAIGN_CREATOR_DRAFT_KEY, JSON.stringify(nextCampaign));
    setLastSaved(Date.now());
    setDraftDirty(false);
    if (!supabase || !user) return;

    const payload = {
      author_id: user.id,
      title: nextCampaign.meta.title || 'Untitled Campaign',
      summary: nextCampaign.meta.description || '',
      description: nextCampaign.meta.description || '',
      thumbnail_url: nextCampaign.meta.thumbnail || null,
      acts_count: nextCampaign.acts.length,
      level_min: levelMin(nextCampaign.meta),
      level_max: levelMax(nextCampaign.meta),
      min_players: nextCampaign.meta.min_players,
      max_players: nextCampaign.meta.max_players,
      tags: nextCampaign.meta.tags ?? [],
      version: nextCampaign.meta.version,
      visibility: 'private',
      draft_data: nextCampaign,
      is_published: false,
    };

    if (remoteId) {
      const { error } = await supabase.from('campaigns').update(payload).eq('id', remoteId);
      if (error) console.warn('Could not autosave campaign draft', error);
      return;
    }

    const { data, error } = await supabase.from('campaigns').insert(payload).select('id').single();
    if (error) {
      console.warn('Could not create campaign draft', error);
      return;
    }
    if (data?.id) setRemoteId(String(data.id));
  }, [campaign, remoteId, user]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (draftDirty) void saveDraft();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [draftDirty, saveDraft]);

  useEffect(() => {
    setPositions((current) => {
      const next = { ...current };
      nodes.forEach((node, index) => {
        if (!next[node.id]) next[node.id] = { x: 32 + (index % 3) * 260, y: 32 + Math.floor(index / 3) * 190 };
      });
      return next;
    });
  }, [nodes]);

  const addNode = useCallback((type: NodeType, connectFrom?: { nodeId: string; port: string }) => {
    const nextNode = createNode(type);
    const anchor = connectFrom ? positions[connectFrom.nodeId] : null;
    setPositions((current) => ({ ...current, [nextNode.id]: anchor ? { x: anchor.x + 280, y: anchor.y + 80 } : { x: 80, y: 80 } }));
    markCampaign(cloneWithNode(campaign, (currentNodes, entryNodeId) => {
      const connectedNodes = connectFrom
        ? currentNodes.map((node) => node.id === connectFrom.nodeId ? setPortTarget(node, connectFrom.port, nextNode.id) : node)
        : currentNodes;
      return { nodes: [...connectedNodes, nextNode], entryNodeId: entryNodeId || nextNode.id };
    }));
    setSelectedNodeId(nextNode.id);
  }, [campaign, markCampaign, positions]);

  const connectPort = useCallback((fromNodeId: string, port: string, toNodeId: string) => {
    markCampaign(updateNode(campaign, fromNodeId, (node) => setPortTarget(node, port, toNodeId)));
  }, [campaign, markCampaign]);

  const updateSelectedNode = useCallback((updater: (node: Node) => Node) => {
    if (!selectedNodeId) return;
    markCampaign(updateNode(campaign, selectedNodeId, updater));
  }, [campaign, markCampaign, selectedNodeId]);

  const updateMeta = useCallback((meta: CampaignMeta) => {
    markCampaign({ ...campaign, meta });
  }, [campaign, markCampaign]);

  const uploadThumbnail = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setThumbnailBusy(true);
    try {
      const uploaded = await uploadUserImage({
        bucket: 'thumbnails',
        file,
        ownerKind: 'campaign',
        ownerId: remoteId ?? undefined,
        user,
      });
      updateMeta({ ...campaign.meta, thumbnail: uploaded.publicUrl });
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Could not upload thumbnail.');
    } finally {
      setThumbnailBusy(false);
    }
  }, [campaign.meta, remoteId, updateMeta, user]);

  const applyTemplate = useCallback((key: TemplateKey) => {
    const nextCampaign = TEMPLATES[key].fn();
    markCampaign(nextCampaign);
    setPositions(initialPositions(nextCampaign));
    setSelectedNodeId(firstScene(nextCampaign)?.entry_node_id ?? getAllNodes(nextCampaign)[0]?.id ?? '');
    setPlaytestState(createRunnerState(nextCampaign));
  }, [markCampaign]);

  const exportJson = useCallback(() => {
    if (!validation.valid) {
      setShowValidation(true);
      return;
    }
    const blob = new Blob([JSON.stringify(campaign, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaign.meta.title || 'campaign'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [campaign, validation.valid]);

  const importJson = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = importCampaignJSON(String(reader.result ?? ''));
      if ('error' in result) {
        setImportError(result.error);
        return;
      }
      setImportError('');
      markCampaign(result);
      setPositions(initialPositions(result));
      setSelectedNodeId(firstScene(result)?.entry_node_id ?? getAllNodes(result)[0]?.id ?? '');
      setPlaytestState(createRunnerState(result));
    };
    reader.readAsText(file);
  }, [markCampaign]);

  const startConnection = (event: React.PointerEvent, nodeId: string, port: string) => {
    event.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    const nodePos = positions[nodeId] ?? { x: 0, y: 0 };
    const x1 = nodePos.x + 220;
    const y1 = nodePos.y + 72 + outputPorts(nodeMap.get(nodeId) as Node).indexOf(port) * 24;
    setConnecting({ nodeId, port });
    setDragLine({ x1, y1, x2: event.clientX - (rect?.left ?? 0), y2: event.clientY - (rect?.top ?? 0) });
  };

  const moveConnection = (event: React.PointerEvent) => {
    if (!connecting || !dragLine) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    setDragLine((line) => line ? { ...line, x2: event.clientX - (rect?.left ?? 0), y2: event.clientY - (rect?.top ?? 0) } : line);
  };

  const completeConnection = (nodeId: string) => {
    if (connecting && connecting.nodeId !== nodeId) connectPort(connecting.nodeId, connecting.port, nodeId);
    setConnecting(null);
    setDragLine(null);
  };

  const renderMetaEditor = () => (
    <Card style={{ padding: 16 }}>
      <div className="fw-card-head" style={{ padding: 0, borderBottom: 'none', marginBottom: 12 }}>
        <div>
          <div className="fw-eyebrow">Campaign Meta</div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Draft Settings</h2>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label className="fw-field"><span className="fw-label">Title</span><input className="fw-input" value={campaign.meta.title} onChange={(event) => updateMeta({ ...campaign.meta, title: event.target.value })} /></label>
        <label className="fw-field"><span className="fw-label">Version</span><input className="fw-input" value={campaign.meta.version} onChange={(event) => updateMeta({ ...campaign.meta, version: event.target.value })} /></label>
        <label className="fw-field" style={{ gridColumn: '1 / -1' }}><span className="fw-label">Description</span><textarea className="fw-textarea" rows={3} value={campaign.meta.description} onChange={(event) => updateMeta({ ...campaign.meta, description: event.target.value })} /></label>
        <label className="fw-field">
          <span className="fw-label">Thumbnail URL</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="fw-input" value={campaign.meta.thumbnail ?? ''} onChange={(event) => updateMeta({ ...campaign.meta, thumbnail: event.target.value })} />
            <label className="fw-btn fw-btn-ghost fw-btn-sm" style={{ whiteSpace: 'nowrap' }}>
              {thumbnailBusy ? 'Uploading...' : 'Upload'}
              <input accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void uploadThumbnail(event.target.files?.[0])} type="file" />
            </label>
          </div>
        </label>
        <label className="fw-field"><span className="fw-label">Min Level</span><input className="fw-input" type="number" min={1} value={levelMin(campaign.meta)} onChange={(event) => updateMeta({ ...campaign.meta, recommended_level: Number(event.target.value) || 1, recommended_level_min: Number(event.target.value) || 1 })} /></label>
        <label className="fw-field"><span className="fw-label">Max Level</span><input className="fw-input" type="number" min={1} value={levelMax(campaign.meta)} onChange={(event) => updateMeta({ ...campaign.meta, recommended_level_max: Number(event.target.value) || 1 })} /></label>
        <label className="fw-field"><span className="fw-label">Min Players</span><input className="fw-input" type="number" min={1} value={campaign.meta.min_players} onChange={(event) => updateMeta({ ...campaign.meta, min_players: Number(event.target.value) || 1 })} /></label>
        <label className="fw-field"><span className="fw-label">Max Players</span><input className="fw-input" type="number" min={1} value={campaign.meta.max_players} onChange={(event) => updateMeta({ ...campaign.meta, max_players: Number(event.target.value) || 1 })} /></label>
        <label className="fw-field" style={{ gridColumn: '1 / -1' }}><span className="fw-label">Tags</span><input className="fw-input" placeholder="mystery, dungeon, escort" value={(campaign.meta.tags ?? []).join(', ')} onChange={(event) => updateMeta({ ...campaign.meta, tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} /></label>
      </div>
    </Card>
  );

  const renderNodeForm = () => {
    if (!selectedNode) {
      return <Card style={{ padding: 18 }}><div className="fw-eyebrow">Node Detail</div><p className="fw-serif">Select a node to edit.</p></Card>;
    }

    const field = (label: string, children: React.ReactNode) => <label className="fw-field"><span className="fw-label">{label}</span>{children}</label>;
    const connectionField = (port: string) => field(port, (
      <select className="fw-select" value={portTarget(selectedNode, port)} onChange={(event) => updateSelectedNode((node) => setPortTarget(node, port, event.target.value))}>
        <option value="">None</option>
        {nodes.filter((node) => node.id !== selectedNode.id).map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}
      </select>
    ));

    const setNodeField = (key: string, value: NodeField) => updateSelectedNode((node) => ({ ...node, [key]: value }) as Node);
    const record = selectedNode as unknown as Record<string, NodeField>;

    return (
      <Card style={{ padding: 16 }}>
        <div className="fw-card-head" style={{ padding: 0, borderBottom: 'none', marginBottom: 12 }}>
          <div>
            <div className="fw-eyebrow">Node Detail Form</div>
            <h2 style={{ margin: 0, fontSize: 18 }}>{nodeTypes.find((item) => item.type === selectedNode.type)?.label}</h2>
          </div>
          <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" onClick={() => addNode('narration', { nodeId: selectedNode.id, port: outputPorts(selectedNode)[0] ?? 'next' })}>
            {Icon('plus', { size: 12 })} Add Next Node
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {field('Node ID', <input className="fw-input" value={selectedNode.id} readOnly />)}
          {selectedNode.type === 'narration' && <>
            {field('Text', <textarea className="fw-textarea" rows={5} value={String(record.text ?? '')} onChange={(event) => setNodeField('text', event.target.value)} />)}
            {field('Image URL', <input className="fw-input" value={String(record.image ?? '')} onChange={(event) => setNodeField('image', event.target.value)} />)}
            {connectionField('next')}
          </>}
          {selectedNode.type === 'choice' && <>
            {field('Prompt', <textarea className="fw-textarea" rows={4} value={selectedNode.prompt} onChange={(event) => setNodeField('prompt', event.target.value)} />)}
            {selectedNode.options.map((option, index) => (
              <div className="fw-card" key={option.id} style={{ padding: 10 }}>
                {field(`Option ${String.fromCharCode(65 + index)}`, <input className="fw-input" value={option.text} onChange={(event) => updateSelectedNode((node) => node.type === 'choice' ? { ...node, options: node.options.map((nextOption, nextIndex) => nextIndex === index ? { ...nextOption, text: event.target.value } : nextOption) } : node)} />)}
                {connectionField(`option_${String.fromCharCode(65 + index)}`)}
              </div>
            ))}
            <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" onClick={() => updateSelectedNode((node) => node.type === 'choice' ? { ...node, options: [...node.options, { id: `${node.id}_${node.options.length}`, text: `Option ${node.options.length + 1}`, next: '' }] } : node)}>{Icon('plus', { size: 12 })} Add Option</button>
          </>}
          {selectedNode.type === 'dice_check' && <>
            {field('Description', <textarea className="fw-textarea" rows={4} value={selectedNode.description} onChange={(event) => setNodeField('description', event.target.value)} />)}
            {field('Skill', <input className="fw-input" value={selectedNode.skill} onChange={(event) => setNodeField('skill', event.target.value)} />)}
            {field('DC', <input className="fw-input" type="number" min={1} max={30} value={selectedNode.dc} onChange={(event) => setNodeField('dc', Number(event.target.value) || 10)} />)}
            {outputPorts(selectedNode).map((port) => <div key={port}>{connectionField(port)}</div>)}
          </>}
          {selectedNode.type === 'combat' && <>
            {field('Description', <textarea className="fw-textarea" rows={3} value={selectedNode.description} onChange={(event) => setNodeField('description', event.target.value)} />)}
            {selectedNode.enemies.map((enemy, index) => (
              <div className="fw-card" key={`${enemy.name}-${index}`} style={{ padding: 10, display: 'grid', gap: 8 }}>
                {field('Enemy Name', <input className="fw-input" value={enemy.name} onChange={(event) => updateSelectedNode((node) => node.type === 'combat' ? { ...node, enemies: node.enemies.map((nextEnemy, nextIndex) => nextIndex === index ? { ...nextEnemy, name: event.target.value } : nextEnemy) } : node)} />)}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {field('HP', <input className="fw-input" type="number" value={enemy.hp} onChange={(event) => updateSelectedNode((node) => node.type === 'combat' ? { ...node, enemies: node.enemies.map((nextEnemy, nextIndex) => nextIndex === index ? { ...nextEnemy, hp: Number(event.target.value) || 1 } : nextEnemy) } : node)} />)}
                  {field('AC', <input className="fw-input" type="number" value={enemy.ac} onChange={(event) => updateSelectedNode((node) => node.type === 'combat' ? { ...node, enemies: node.enemies.map((nextEnemy, nextIndex) => nextIndex === index ? { ...nextEnemy, ac: Number(event.target.value) || 10 } : nextEnemy) } : node)} />)}
                  {field('Damage', <input className="fw-input" value={enemy.damage_dice} onChange={(event) => updateSelectedNode((node) => node.type === 'combat' ? { ...node, enemies: node.enemies.map((nextEnemy, nextIndex) => nextIndex === index ? { ...nextEnemy, damage_dice: event.target.value } : nextEnemy) } : node)} />)}
                </div>
              </div>
            ))}
            <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" onClick={() => updateSelectedNode((node) => node.type === 'combat' ? { ...node, enemies: [...node.enemies, { name: 'Enemy', hp: 10, ac: 12, attack_bonus: 3, damage_dice: '1d6', damage_type: 'slashing' }] } : node)}>{Icon('plus', { size: 12 })} Add Enemy</button>
            {connectionField('on_win')}{connectionField('on_lose')}
          </>}
          {selectedNode.type === 'item_reward' && <>
            {field('Description', <textarea className="fw-textarea" rows={3} value={selectedNode.description} onChange={(event) => setNodeField('description', event.target.value)} />)}
            {selectedNode.items.map((item, index) => (
              <div className="fw-card" key={`${item.name}-${index}`} style={{ padding: 10, display: 'grid', gap: 8 }}>
                {field('Item Name', <input className="fw-input" value={item.name} onChange={(event) => updateSelectedNode((node) => node.type === 'item_reward' ? { ...node, items: node.items.map((nextItem, nextIndex) => nextIndex === index ? { ...nextItem, name: event.target.value } : nextItem) } : node)} />)}
                {field('Item Description', <input className="fw-input" value={item.description} onChange={(event) => updateSelectedNode((node) => node.type === 'item_reward' ? { ...node, items: node.items.map((nextItem, nextIndex) => nextIndex === index ? { ...nextItem, description: event.target.value } : nextItem) } : node)} />)}
              </div>
            ))}
            <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" onClick={() => updateSelectedNode((node) => node.type === 'item_reward' ? { ...node, items: [...node.items, { name: 'Reward', description: '', quantity: 1 }] } : node)}>{Icon('plus', { size: 12 })} Add Item</button>
            {connectionField('next')}
          </>}
          {selectedNode.type === 'npc_dialogue' && <>
            {field('NPC Name', <input className="fw-input" value={selectedNode.npc_name} onChange={(event) => setNodeField('npc_name', event.target.value)} />)}
            {field('NPC Image', <input className="fw-input" value={selectedNode.npc_image ?? ''} onChange={(event) => setNodeField('npc_image', event.target.value)} />)}
            {selectedNode.lines.map((line, index) => field(`Line ${index + 1}`, <textarea className="fw-textarea" rows={2} value={line.text} onChange={(event) => updateSelectedNode((node) => node.type === 'npc_dialogue' ? { ...node, lines: node.lines.map((nextLine, nextIndex) => nextIndex === index ? { ...nextLine, text: event.target.value } : nextLine) } : node)} />))}
            <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" onClick={() => updateSelectedNode((node) => node.type === 'npc_dialogue' ? { ...node, lines: [...node.lines, { speaker: 'npc', text: '' }] } : node)}>{Icon('plus', { size: 12 })} Add Line</button>
            {connectionField('next')}
          </>}
          {selectedNode.type === 'condition_check' && <>
            {selectedNode.conditions.map((condition, index) => (
              <div className="fw-card" key={index} style={{ padding: 10, display: 'grid', gap: 8 }}>
                {field(`Condition ${index + 1}`, <input className="fw-input" value={condition.flag_key ?? condition.stat ?? condition.item_id ?? ''} onChange={(event) => updateSelectedNode((node) => node.type === 'condition_check' ? { ...node, conditions: node.conditions.map((nextCondition, nextIndex) => nextIndex === index ? { ...nextCondition, flag_key: event.target.value } : nextCondition) } : node)} />)}
                {connectionField(`on_true_${index + 1}`)}
              </div>
            ))}
            <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" onClick={() => updateSelectedNode((node) => node.type === 'condition_check' ? { ...node, conditions: [...node.conditions, { check: 'flag', flag_key: 'flag_name', flag_value: true, operator: 'eq', on_true: '' } as ConditionCheckItem] } : node)}>{Icon('plus', { size: 12 })} Add Condition</button>
            {connectionField('on_default')}
          </>}
          {selectedNode.type === 'cutscene' && <>
            {selectedNode.slides.map((slide, index) => (
              <div className="fw-card" key={index} style={{ padding: 10 }}>
                {field(`Slide ${index + 1}`, <textarea className="fw-textarea" rows={3} value={slide.text} onChange={(event) => updateSelectedNode((node) => node.type === 'cutscene' ? { ...node, slides: node.slides.map((nextSlide, nextIndex) => nextIndex === index ? { ...nextSlide, text: event.target.value } : nextSlide) } : node)} />)}
              </div>
            ))}
            <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" onClick={() => updateSelectedNode((node) => node.type === 'cutscene' ? { ...node, slides: [...node.slides, { text: '' }] } : node)}>{Icon('plus', { size: 12 })} Add Slide</button>
            {connectionField('next')}
          </>}
          {selectedNode.type === 'end' && <>
            {field('Ending ID', <input className="fw-input" value={selectedNode.ending_id} onChange={(event) => setNodeField('ending_id', event.target.value)} />)}
            {field('Title', <input className="fw-input" value={selectedNode.title} onChange={(event) => setNodeField('title', event.target.value)} />)}
            {field('Description', <textarea className="fw-textarea" rows={4} value={selectedNode.description} onChange={(event) => setNodeField('description', event.target.value)} />)}
          </>}
        </div>
      </Card>
    );
  };

  const renderValidation = () => showValidation ? (
    <Card style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={`fw-pill ${validation.valid ? 'success' : 'blood'}`}>{validation.valid ? 'No errors' : `${validation.errors.length} errors`}</span>
        <span className="fw-pill dim">{validation.warnings.length} warnings</span>
      </div>
      <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
        {validation.errors.map((error, index) => <div className="fw-cond bad" key={`e-${index}`}>{error.node_id ? `${error.node_id}: ` : ''}{error.message}</div>)}
        {validation.warnings.map((warning, index) => <div className="fw-cond warn" key={`w-${index}`}>{warning.node_id ? `${warning.node_id}: ` : ''}{warning.message}</div>)}
        {!validation.errors.length && !validation.warnings.length ? <div className="fw-cond ok">All validation checks passed.</div> : null}
      </div>
    </Card>
  ) : null;

  const renderPlaytest = () => {
    if (!showPlaytest) return null;
    const currentNode = findNodeInCampaign(campaign, playtestState.current_node_id);
    const jump = (target: string) => target && setPlaytestState((state) => transitionToNode(campaign, state, target));
    const setFlag = () => {
      if (!flagKey.trim()) return;
      const parsed = flagValue === 'true' ? true : flagValue === 'false' ? false : Number(flagValue) || 0;
      setPlaytestState((state) => ({ ...state, flags: { ...state.flags, [flagKey]: parsed }, updated_at: Date.now() }));
    };

    return (
      <div className="fw-overlay">
        <div className="fw-modal" style={{ width: 'min(920px, calc(100vw - 32px))' }}>
          <div className="fw-modal-head">
            <div>
              <div className="fw-eyebrow">Playtest Mode</div>
              <h2 style={{ margin: 0 }}>Draft Runner</h2>
            </div>
            <button className="fw-btn fw-btn-icon fw-btn-ghost" type="button" onClick={() => setShowPlaytest(false)}>{Icon('x', { size: 16 })}</button>
          </div>
          <div className="fw-modal-body" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 14 }}>
            <Card style={{ padding: 16 }}>
              <span className="fw-pill gold">{currentNode?.type ?? 'missing'}</span>
              <h3 className="fw-display" style={{ fontSize: 18 }}>{currentNode?.id ?? 'Node not found'}</h3>
              <p className="fw-serif" style={{ color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>
                {currentNode ? getNodePreview(currentNode) || 'No preview yet.' : 'The current node no longer exists.'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {currentNode ? outputPorts(currentNode).map((port) => {
                  const target = portTarget(currentNode, port);
                  return target ? <button className="fw-btn fw-btn-gold fw-btn-sm" key={port} type="button" onClick={() => jump(target)}>{port} {Icon('arrowR', { size: 11 })}</button> : null;
                }) : null}
              </div>
            </Card>
            <Card style={{ padding: 16, display: 'grid', gap: 10 }}>
              <label className="fw-field"><span className="fw-label">Jump to Node</span><select className="fw-select" value={playtestState.current_node_id} onChange={(event) => jump(event.target.value)}>{nodes.map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}</select></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 8, alignItems: 'end' }}>
                <label className="fw-field"><span className="fw-label">Toggle Flag</span><input className="fw-input" value={flagKey} onChange={(event) => setFlagKey(event.target.value)} /></label>
                <label className="fw-field"><span className="fw-label">Value</span><select className="fw-select" value={flagValue} onChange={(event) => setFlagValue(event.target.value)}><option>true</option><option>false</option><option>1</option><option>0</option></select></label>
                <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" onClick={setFlag}>Set</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px auto', gap: 8, alignItems: 'end' }}>
                <label className="fw-field"><span className="fw-label">Set Stat</span><input className="fw-input" value={statKey} onChange={(event) => setStatKey(event.target.value)} /></label>
                <label className="fw-field"><span className="fw-label">Value</span><input className="fw-input" type="number" value={statValue} onChange={(event) => setStatValue(Number(event.target.value) || 0)} /></label>
                <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" onClick={() => setStats((current) => ({ ...current, [statKey]: statValue }))}>Set</button>
              </div>
              <pre className="fw-card" style={{ padding: 10, margin: 0, maxHeight: 180, overflow: 'auto', color: 'var(--text-2)', fontSize: 11 }}>
                {JSON.stringify({ current_node_id: playtestState.current_node_id, flags: playtestState.flags, stats }, null, 2)}
              </pre>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page" style={{ maxWidth: 1500 }}>
        <header className="fw-page-head">
          <div>
            <div className="fw-eyebrow">Campaign Creator</div>
            <h1>{campaign.meta.title || 'Untitled Campaign'}</h1>
            <div className="sub">{draftDirty ? 'Unsaved draft changes' : lastSaved ? `Draft saved ${new Date(lastSaved).toLocaleTimeString()}` : 'Browser draft loaded'}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button className="fw-btn fw-btn-ghost" type="button" onClick={onBack}>{Icon('chevL', { size: 12 })} Library</button>
            <button className="fw-btn fw-btn-ghost" type="button" onClick={() => setShowValidation((value) => !value)}>{Icon('check', { size: 12 })} Validate</button>
            <button className="fw-btn fw-btn-ghost" type="button" onClick={() => { setPlaytestState(createRunnerState(campaign)); setShowPlaytest(true); }}>{Icon('play', { size: 12 })} Playtest</button>
            <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(event) => event.target.files?.[0] && importJson(event.target.files[0])} />
            <button className="fw-btn fw-btn-ghost" type="button" onClick={() => importRef.current?.click()}>{Icon('login', { size: 12 })} Import JSON</button>
            <button className="fw-btn fw-btn-gold" type="button" onClick={exportJson}>{Icon('scroll', { size: 12 })} Export JSON</button>
            <button className="fw-btn fw-btn-gold" type="button" onClick={() => void saveDraft()}>{Icon('check', { size: 12 })} Save Draft</button>
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.55fr) minmax(360px, 0.95fr)', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <Card style={{ padding: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select className="fw-select" style={{ width: 180 }} onChange={(event) => applyTemplate(event.target.value as TemplateKey)} defaultValue="">
                  <option value="" disabled>Template</option>
                  {(Object.keys(TEMPLATES) as TemplateKey[]).map((key) => <option key={key} value={key}>{TEMPLATES[key].name}</option>)}
                </select>
                <select className="fw-select" style={{ width: 190 }} onChange={(event) => event.target.value && addNode(event.target.value as NodeType)} defaultValue="">
                  <option value="" disabled>Add Node</option>
                  {nodeTypes.map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}
                </select>
                <span className="fw-pill dim">{nodes.length} nodes</span>
                <span className="fw-pill dim">single-owner draft</span>
                {importError ? <span className="fw-pill blood">{importError}</span> : null}
              </div>
            </Card>

            <Card style={{ minHeight: 650, overflow: 'hidden', position: 'relative' }}>
              <div className="fw-card-head">
                <div>
                  <div className="fw-eyebrow">Visual Tree</div>
                  <h2 style={{ margin: 0, fontSize: 18 }}>Nodes and Port Connections</h2>
                </div>
                <span className="fw-pill dim">drag output port to input</span>
              </div>
              <div
                ref={canvasRef}
                style={{ position: 'relative', height: 590, overflow: 'auto', background: 'rgba(0,0,0,0.18)' }}
                onPointerMove={moveConnection}
                onPointerUp={() => { setConnecting(null); setDragLine(null); }}
              >
                <svg style={{ position: 'absolute', inset: 0, width: 1200, height: 900, pointerEvents: 'none' }}>
                  {nodes.flatMap((node) => outputPorts(node).map((port) => ({ node, port, target: portTarget(node, port) }))).filter((edge) => edge.target && positions[edge.target]).map((edge) => {
                    const from = positions[edge.node.id] ?? { x: 0, y: 0 };
                    const to = positions[edge.target] ?? { x: 0, y: 0 };
                    const yOffset = 72 + outputPorts(edge.node).indexOf(edge.port) * 24;
                    return <path key={`${edge.node.id}-${edge.port}-${edge.target}`} d={`M ${from.x + 220} ${from.y + yOffset} C ${from.x + 310} ${from.y + yOffset}, ${to.x - 80} ${to.y + 58}, ${to.x} ${to.y + 58}`} stroke="rgba(214,168,79,0.7)" strokeWidth="2" fill="none" />;
                  })}
                  {dragLine ? <path d={`M ${dragLine.x1} ${dragLine.y1} L ${dragLine.x2} ${dragLine.y2}`} stroke="rgba(255,216,130,0.9)" strokeWidth="2" fill="none" strokeDasharray="4 4" /> : null}
                </svg>
                {nodes.map((node) => {
                  const pos = positions[node.id] ?? { x: 0, y: 0 };
                  const status = getNodeStatus(node, nodeMap);
                  return (
                    <article
                      className={`fw-card ${selectedNodeId === node.id ? 'fw-card-elev' : ''}`}
                      key={node.id}
                      style={{ position: 'absolute', left: pos.x, top: pos.y, width: 230, padding: 10, cursor: 'pointer', borderColor: selectedNodeId === node.id ? 'var(--gold)' : undefined }}
                      onClick={() => setSelectedNodeId(node.id)}
                      onPointerDown={(event) => {
                        if ((event.target as HTMLElement).dataset.port) return;
                        const start = { x: event.clientX, y: event.clientY, pos };
                        const move = (moveEvent: PointerEvent) => setPositions((current) => ({ ...current, [node.id]: { x: start.pos.x + moveEvent.clientX - start.x, y: start.pos.y + moveEvent.clientY - start.y } }));
                        const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
                        window.addEventListener('pointermove', move);
                        window.addEventListener('pointerup', up);
                      }}
                    >
                      <button
                        aria-label={`Input ${node.id}`}
                        className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm"
                        data-port="input"
                        type="button"
                        style={{ position: 'absolute', left: -16, top: 48 }}
                        onPointerUp={(event) => { event.stopPropagation(); completeConnection(node.id); }}
                      >
                        {Icon('link', { size: 11 })}
                      </button>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ color: 'var(--gold-bright)' }}>{Icon(nodeTypes.find((item) => item.type === node.type)?.icon ?? 'hex', { size: 16 })}</span>
                        <div style={{ minWidth: 0 }}>
                          <div className="fw-display" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.id}</div>
                          <div className="fw-eyebrow">{node.type}</div>
                        </div>
                        <span className={`fw-pill ${status === 'complete' ? 'success' : 'blood'}`} style={{ marginLeft: 'auto' }}>{status}</span>
                      </div>
                      <p className="fw-serif" style={{ color: 'var(--text-3)', fontSize: 12, minHeight: 34, margin: '8px 0' }}>{getNodePreview(node) || 'No preview yet.'}</p>
                      <div style={{ display: 'grid', gap: 4 }}>
                        {outputPorts(node).map((port) => (
                          <button
                            className="fw-btn fw-btn-ghost fw-btn-sm"
                            data-port={port}
                            key={port}
                            type="button"
                            style={{ justifyContent: 'space-between', height: 22 }}
                            onPointerDown={(event) => startConnection(event, node.id, port)}
                            title={`Drag ${port} to another node input`}
                          >
                            <span>{port}</span>{Icon('arrowR', { size: 10 })}
                          </button>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </Card>
          </div>

          <aside style={{ display: 'grid', gap: 12 }}>
            {renderMetaEditor()}
            {renderValidation()}
            {renderNodeForm()}
          </aside>
        </section>
      </div>
      {renderPlaytest()}
    </main>
  );
}
