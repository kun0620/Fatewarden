import { wardenRunFoes } from '../../data/enemies';
import { NODE_INFO } from '../../data/runEvents';
import { WARDEN_RUN_RELICS } from '../../data/relics';
import type {
  NodeType,
  RunCombatant,
  RunDisplayNodeType,
  RunFloor,
  RunInitEntry,
  RunNode,
  RunState,
  RunSummary,
} from './runTypes';

interface MockMapNode {
  layer: number;
  kind: RunDisplayNodeType;
  label: string;
  x: number;
}

const mockMapNodes: MockMapNode[] = [
  { layer: 0, kind: 'start', label: 'Entrance', x: 0.5 },
  { layer: 1, kind: 'combat', label: 'Skirmish', x: 0.25 },
  { layer: 1, kind: 'combat', label: 'Skirmish', x: 0.5 },
  { layer: 1, kind: 'mystery', label: 'Mystery', x: 0.75 },
  { layer: 2, kind: 'shop', label: 'Bazaar', x: 0.15 },
  { layer: 2, kind: 'combat', label: 'Skirmish', x: 0.4 },
  { layer: 2, kind: 'treasure', label: 'Treasure', x: 0.65 },
  { layer: 2, kind: 'combat', label: 'Skirmish', x: 0.88 },
  { layer: 3, kind: 'mystery', label: 'Mystery', x: 0.25 },
  { layer: 3, kind: 'elite', label: 'Elite', x: 0.55 },
  { layer: 3, kind: 'rest', label: 'Camp', x: 0.85 },
  { layer: 4, kind: 'forge', label: 'Forge', x: 0.2 },
  { layer: 4, kind: 'combat', label: 'Skirmish', x: 0.45 },
  { layer: 4, kind: 'gamble', label: 'Gamble', x: 0.7 },
  { layer: 4, kind: 'shop', label: 'Bazaar', x: 0.92 },
  { layer: 5, kind: 'elite', label: 'Elite', x: 0.32 },
  { layer: 5, kind: 'treasure', label: 'Treasure', x: 0.6 },
  { layer: 5, kind: 'rest', label: 'Camp', x: 0.88 },
  { layer: 6, kind: 'boss', label: 'The Cinder-Reeve', x: 0.5 },
];

const mockMapEdges: Array<[number, number]> = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 4],
  [1, 5],
  [2, 5],
  [2, 6],
  [3, 6],
  [3, 7],
  [4, 8],
  [5, 8],
  [5, 9],
  [6, 9],
  [6, 10],
  [7, 10],
  [8, 11],
  [8, 12],
  [9, 12],
  [9, 13],
  [10, 13],
  [10, 14],
  [11, 15],
  [12, 15],
  [12, 16],
  [13, 16],
  [13, 17],
  [14, 17],
  [15, 18],
  [16, 18],
  [17, 18],
];

export const MOCK_RUN_PARTY: RunCombatant[] = [
  {
    id: 'kessra',
    name: 'Kessra',
    className: 'Vanguard',
    portrait: 'fighter',
    color: '#B8860B',
    hp: 38,
    hpMax: 52,
    block: 4,
    pos: 1,
    conds: [{ k: 'Guarded', kind: 'buff', n: 2 }],
    skills: [
      { id: 'cleave', name: 'Cleave', kind: 'attack', cost: 2, dmg: '8-12', targets: [1, 2], desc: 'Strike the front two foes. Heavy front-line damage.', melee: true },
      { id: 'shield', name: 'Shield Wall', kind: 'buff', cost: 1, val: '+6 Block', targets: [4, 3, 2, 1], self: true, desc: 'Raise block on every ally. The line holds.' },
      { id: 'taunt', name: 'Bellow', kind: 'util', cost: 1, val: 'Mark', targets: [1, 2, 3, 4], desc: 'Force foes to target you for one round.' },
      { id: 'execute', name: 'Sundering Blow', kind: 'attack', cost: 3, dmg: '18-24', targets: [1], desc: 'Massive damage to one front foe. Heavier the lower their HP.' },
    ],
  },
  {
    id: 'mirenna',
    name: 'Mirenna',
    className: 'Druidwise',
    portrait: 'druid',
    color: '#7BB662',
    hp: 41,
    hpMax: 56,
    block: 0,
    pos: 2,
    conds: [{ k: 'Regen', kind: 'buff', n: 3 }],
    skills: [
      { id: 'thorns', name: 'Bramble Lash', kind: 'attack', cost: 1, dmg: '6-9', targets: [3, 4], desc: 'Pull a back-rank foe. Inflicts Bleed (2).' },
      { id: 'mend', name: 'Mend', kind: 'heal', cost: 1, val: '+12 HP', targets: [4, 3, 2, 1], desc: 'Restore HP to any ally.' },
      { id: 'wild', name: 'Wild Form', kind: 'buff', cost: 2, val: '+Dodge', self: true, desc: 'Cloak in beasts. Dodge for two rounds.' },
      { id: 'summon', name: 'Spirit of the Bear', kind: 'util', cost: 3, val: 'Summon', desc: 'Spirit beast intercepts the next hit.' },
    ],
  },
  {
    id: 'aedric',
    name: 'Aedric',
    className: 'Warlock',
    portrait: 'warlock',
    color: '#9B5DE5',
    hp: 28,
    hpMax: 52,
    block: 2,
    pos: 3,
    you: true,
    conds: [
      { k: 'Hexed', kind: 'neutral', n: 1 },
      { k: 'Frail', kind: 'debuff', n: 1 },
    ],
    skills: [
      { id: 'blast', name: 'Eldritch Blast', kind: 'attack', cost: 1, dmg: '10-14', targets: [1, 2, 3, 4], desc: 'Force damage at any range.' },
      { id: 'hex', name: 'Hex', kind: 'util', cost: 1, val: '+1d6', targets: [1, 2, 3, 4], desc: 'Mark a foe. Adds necrotic to your hits.' },
      { id: 'scorch', name: 'Cinder Scourge', kind: 'attack', cost: 2, dmg: '14-20', targets: [2, 3, 4], desc: 'Pact fire. Two back-rank foes, splash damage.' },
      { id: 'drain', name: 'Soul Drain', kind: 'attack', cost: 3, dmg: '20-26', targets: [3, 4], desc: 'Heavy necrotic. Heal yourself for half damage dealt.' },
    ],
  },
  {
    id: 'halric',
    name: 'Halric',
    className: 'Light-Cleric',
    portrait: 'cleric',
    color: '#D4A028',
    hp: 0,
    hpMax: 48,
    block: 0,
    pos: 4,
    down: true,
    conds: [
      { k: 'Unconscious', kind: 'debuff' },
      { k: 'Death 1/3', kind: 'debuff' },
    ],
    skills: [
      { id: 'smite', name: 'Radiant Smite', kind: 'attack', cost: 2, dmg: '12-18', targets: [1, 2] },
      { id: 'bless', name: 'Bless', kind: 'buff', cost: 1, val: '+1d4', targets: [4, 3, 2, 1] },
      { id: 'cure', name: 'Cure Wounds', kind: 'heal', cost: 1, val: '+14 HP', targets: [4, 3, 2, 1] },
      { id: 'revive', name: 'Revivify', kind: 'heal', cost: 3, val: 'Raise', targets: [4, 3, 2, 1] },
    ],
  },
];

export const MOCK_RUN_INIT_ORDER: RunInitEntry[] = [
  { id: 'kessra', side: 'ally', init: 21, name: 'Kessra', portrait: 'fighter', color: '#B8860B', done: true },
  { id: 'imp', side: 'foe', init: 18, name: 'Pact-Imp', portrait: 'imp', color: '#C53456', done: true },
  { id: 'aedric', side: 'ally', init: 17, name: 'Aedric', portrait: 'warlock', color: '#9B5DE5', now: true },
  { id: 'mirenna', side: 'ally', init: 15, name: 'Mirenna', portrait: 'druid', color: '#7BB662' },
  { id: 'wraith', side: 'foe', init: 14, name: 'Wraith', portrait: 'wraith', color: '#5B2A8C' },
  { id: 'knight', side: 'foe', init: 11, name: 'Knight', portrait: 'knight', color: '#8B1538' },
  { id: 'halric', side: 'ally', init: 9, name: 'Halric', portrait: 'cleric', color: '#D4A028', down: true },
  { id: 'reeve', side: 'foe', init: 6, name: 'Reeve', portrait: 'boss', color: '#8B1538' },
];

const MOCK_RUN_SUMMARY: RunSummary = {
  victory: true,
  floor: 3,
  stats: [
    { l: 'Floors descended', v: '3 of 6', c: '' },
    { l: 'Rooms cleared', v: '11', c: '' },
    { l: 'Elites slain', v: '1', c: '' },
    { l: 'Damage dealt', v: '1,247', c: '' },
    { l: 'Damage taken', v: '612', c: '' },
    { l: 'Gold earned', v: '412', c: 'gold' },
    { l: 'Relics collected', v: '5', c: 'violet' },
    { l: 'Time in dungeon', v: '47 min', c: '' },
  ],
  wp: 142,
  wpBreakdown: ['Floor bonus +60', 'Elite +30', 'No-death +40', 'Mystery +12'],
  unlocks: [
    { title: 'The Anchorite', description: 'A new playable class. Heals while still.', icon: 'bones', isNew: true },
    { title: 'Whisper-Veil', description: 'Relic now available in shops.', icon: 'feather', isNew: true },
    { title: 'Floor Variant: Crypt', description: 'An alternate path through floor 3.', icon: 'map', isNew: false },
  ],
};

function asNodeType(kind: RunDisplayNodeType): NodeType {
  return kind === 'start' ? 'combat' : kind;
}

function buildMockRunNodes(): RunNode[] {
  return mockMapNodes.map((node, index) => {
    const connectedTo = mockMapEdges
      .filter(([from]) => from === index)
      .map(([, to]) => `wr-node-${to}`);
    const info = NODE_INFO[node.kind];
    const id = `wr-node-${index}`;

    return {
      id,
      type: asNodeType(node.kind),
      displayType: node.kind,
      status: index === 0 ? 'completed' : index <= 3 ? 'available' : 'locked',
      row: node.layer,
      col: mockMapNodes.filter((candidate) => candidate.layer === node.layer).findIndex((candidate) => candidate === node),
      connectedTo,
      label: node.label,
      x: node.x,
      icon: info?.icon,
      blurb: info?.blurb,
    };
  });
}

const mockRunFloor: RunFloor = {
  id: 'mock-floor-3',
  floorNumber: 3,
  rows: 7,
  nodes: buildMockRunNodes(),
  bossNodeId: 'wr-node-18',
  completed: false,
};

export const MOCK_RUN_STATE: RunState = {
  id: 'mock-warden-run',
  sessionId: 'development',
  currentFloor: 3,
  currentNodeId: 'wr-node-8',
  floors: [mockRunFloor],
  partyCharacterIds: MOCK_RUN_PARTY.map((member) => member.id),
  partyPositions: {
    kessra: 1,
    mirenna: 2,
    aedric: 3,
    halric: 4,
  },
  deadCharacterIds: ['halric'],
  gold: 247,
  relics: WARDEN_RUN_RELICS,
  wardenPointsEarned: 142,
  floorsCleared: 2,
  enemiesKilled: 11,
  status: 'active',
  startedAt: '2026-05-26T00:00:00.000Z',
  depth: 6,
  runNumber: 17,
  party: MOCK_RUN_PARTY,
  foes: wardenRunFoes.map((foe) => ({
    id: foe.id,
    name: foe.name,
    portrait: foe.portrait,
    color: foe.color,
    hp: foe.hp,
    hpMax: foe.hpMax ?? foe.hp,
    pos: foe.position,
    boss: foe.boss,
    conds: foe.conds,
    intent: foe.intent,
  })),
  initiativeOrder: MOCK_RUN_INIT_ORDER,
  nodeInfo: NODE_INFO,
  summary: MOCK_RUN_SUMMARY,
};
