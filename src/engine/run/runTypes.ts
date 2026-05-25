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

export type NodeStatus =
  | 'locked'
  | 'available'
  | 'current'
  | 'completed';

export interface RunNode {
  id: string;
  type: NodeType;
  status: NodeStatus;
  row: number;
  col: number;
  connectedTo: string[];
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
}

export interface RunState {
  id: string;
  sessionId: string;
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
