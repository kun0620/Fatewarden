import type { RunDifficulty } from '../../types';
import type { NodeType, RunFloor, RunNode, RunState } from './runTypes';

type RandomSource = () => number;

function createRng(seed = Date.now()): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pickWeighted<T extends string>(rng: RandomSource, entries: Array<{ value: T; weight: number }>): T {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.value;
  }
  return entries[entries.length - 1].value;
}

function typeForRow(row: number, rng: RandomSource): NodeType {
  if (row === 0) return 'combat';
  if (row === 3) return 'boss';
  if (row === 1) {
    return pickWeighted(rng, [
      { value: 'combat', weight: 40 },
      { value: 'mystery', weight: 20 },
      { value: 'treasure', weight: 20 },
      { value: 'rest', weight: 20 },
    ]);
  }

  return pickWeighted(rng, [
    { value: 'combat', weight: 30 },
    { value: 'elite', weight: 15 },
    { value: 'shop', weight: 15 },
    { value: 'rest', weight: 15 },
    { value: 'mystery', weight: 15 },
    { value: rng() < 0.5 ? 'forge' : 'gamble', weight: 10 },
  ]);
}

function connectRows(nodes: RunNode[], row: number, rng: RandomSource) {
  const current = nodes.filter((node) => node.row === row);
  const next = nodes.filter((node) => node.row === row + 1);

  for (const node of current) {
    const closest = [...next].sort((left, right) => Math.abs(left.col - node.col) - Math.abs(right.col - node.col));
    const count = closest.length > 1 && rng() > 0.5 ? 2 : 1;
    node.connectedTo = closest.slice(0, count).map((target) => target.id);
  }

  for (const target of next) {
    const hasInbound = current.some((node) => node.connectedTo.includes(target.id));
    if (hasInbound) continue;
    const source = [...current].sort((left, right) => Math.abs(left.col - target.col) - Math.abs(right.col - target.col))[0];
    if (source && !source.connectedTo.includes(target.id)) source.connectedTo.push(target.id);
  }
}

export function generateFloor(floorNumber: number, seed?: number): RunFloor {
  const rng = createRng(seed ?? floorNumber * 7919);
  const rows = 4;
  const rowCounts = [1, 3, rng() < 0.5 ? 3 : 4, 1];
  const nodes: RunNode[] = [];

  rowCounts.forEach((count, row) => {
    for (let col = 0; col < count; col += 1) {
      nodes.push({
        id: `floor-${floorNumber}-r${row}-c${col}`,
        type: typeForRow(row, rng),
        status: row === 0 && floorNumber === 1 ? 'available' : 'locked',
        row,
        col,
        connectedTo: [],
      });
    }
  });

  for (let row = 0; row < rows - 1; row += 1) {
    connectRows(nodes, row, rng);
  }

  const bossNode = nodes.find((node) => node.row === 3);
  if (!bossNode) throw new Error('Generated floor is missing a boss node.');

  return {
    id: `floor-${floorNumber}`,
    floorNumber,
    rows,
    nodes,
    bossNodeId: bossNode.id,
    completed: false,
  };
}

export function generateRun(sessionId: string, totalFloors = 3, difficulty?: RunDifficulty): RunState {
  const floors = Array.from({ length: totalFloors }, (_, index) => generateFloor(index + 1));
  return {
    id: `run-${sessionId}-${Date.now()}`,
    sessionId,
    difficulty,
    currentFloor: 1,
    currentNodeId: null,
    floors,
    partyCharacterIds: [],
    partyPositions: {},
    deadCharacterIds: [],
    gold: 50,
    relics: [],
    wardenPointsEarned: 0,
    floorsCleared: 0,
    enemiesKilled: 0,
    status: 'active',
    startedAt: new Date().toISOString(),
  };
}
