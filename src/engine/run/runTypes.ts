import type { RunDifficulty } from '../../types';

export type NodeType =
  | 'combat'
  | 'elite'
  | 'boss'
  | 'rest'
  | 'shop'
  | 'treasure'
  | 'mystery'
  | 'forge'
  | 'gamble';

export type RunDisplayNodeType = NodeType | 'start';

export type NodeStatus =
  | 'locked'
  | 'available'
  | 'current'
  | 'completed';

export interface RunCondition {
  k: string;
  kind: string;
  n?: number;
}

export interface RunSkill {
  id: string;
  name: string;
  kind: 'attack' | 'buff' | 'util' | 'heal';
  cost: number;
  dmg?: string;
  val?: string;
  targets?: Array<1 | 2 | 3 | 4>;
  self?: boolean;
  desc?: string;
  melee?: boolean;
}

export interface RunIntent {
  kind: string;
  val: string;
  target?: string;
}

export interface RunCombatant {
  id: string;
  name: string;
  className?: string;
  portrait?: string;
  color?: string;
  hp: number;
  hpMax: number;
  block?: number;
  pos: 1 | 2 | 3 | 4;
  you?: boolean;
  down?: boolean;
  boss?: boolean;
  conds?: RunCondition[];
  skills?: RunSkill[];
  intent?: RunIntent;
}

export interface RunNodeInfo {
  icon: string;
  label: string;
  color: string;
  blurb: string;
}

export interface RunInitEntry {
  id: string;
  side: 'ally' | 'foe';
  init: number;
  name: string;
  portrait?: string;
  color?: string;
  done?: boolean;
  now?: boolean;
  down?: boolean;
}

export interface RunShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  rarity: string;
  reroll?: boolean;
}

export interface RunShop {
  merchant: {
    name: string;
    quote: string;
  };
  items: RunShopItem[];
}

export interface RunEventTag {
  k: string;
  c: string;
}

export interface RunRestChoice {
  id: string;
  icon: string;
  title: string;
  description: string;
  effect: string;
  color: string;
}

export interface RunTreasureReward {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  isCursed?: boolean;
}

export interface RunSummaryStat {
  l: string;
  v: string;
  c?: string;
}

export interface RunSummaryUnlock {
  title: string;
  description: string;
  icon: string;
  isNew?: boolean;
}

export interface RunSummary {
  victory: boolean;
  floor: number | string;
  stats: RunSummaryStat[];
  wp: number;
  wpBreakdown: string[];
  unlocks: RunSummaryUnlock[];
}

export interface RunNode {
  id: string;
  type: NodeType;
  displayType?: RunDisplayNodeType;
  status: NodeStatus;
  row: number;
  col: number;
  connectedTo: string[];
  label?: string;
  x?: number;
  icon?: string;
  blurb?: string;
  eventId?: string;
}

export interface RunFloor {
  id: string;
  floorNumber: number;
  rows: number;
  nodes: RunNode[];
  bossNodeId: string;
  completed: boolean;
}

export interface RunRelic {
  id: string;
  name: string;
  description: string;
  effect: string;
  icon?: string;
  rarity?: string;
  count?: number;
}

export interface RunState {
  id: string;
  sessionId: string;
  difficulty?: RunDifficulty;
  currentFloor: number;
  currentNodeId: string | null;
  floors: RunFloor[];

  partyCharacterIds: string[];
  partyPositions: Record<string, 1 | 2 | 3 | 4>;
  deadCharacterIds: string[];

  gold: number;
  relics: RunRelic[];

  wardenPointsEarned: number;
  floorsCleared: number;
  enemiesKilled: number;
  status: 'active' | 'victory' | 'defeat';
  startedAt: string;
  endedAt?: string;

  depth?: number;
  runNumber?: number;
  party?: RunCombatant[];
  foes?: RunCombatant[];
  initiativeOrder?: RunInitEntry[];
  nodeInfo?: Partial<Record<RunDisplayNodeType, RunNodeInfo>>;
  summary?: RunSummary;
}

export interface PermanentProgress {
  userId: string;
  wardenPoints: number;
  totalPoints: number;
  unlockedClasses: string[];
  unlockedRaces: string[];
  unlockedRelics: string[];
  unlockedItems: string[];
  passiveBonuses: {
    startingGold: number;
    startingHpBonus: number;
    startingItems: number;
    shopDiscount: number;
  };
  runsCompleted: number;
  runsAttempted: number;
  bestFloor: number;
}
