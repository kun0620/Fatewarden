import type { RunRelic, RunState } from './runTypes';

export type NodeResult =
  | { type: 'combat'; won: boolean; goldEarned: number; enemiesKilled: number }
  | { type: 'rest'; choiceId: string }
  | { type: 'treasure'; itemId: string }
  | { type: 'shop'; purchased: string[] }
  | { type: 'mystery'; choiceId: string; outcomeId: string }
  | { type: 'forge'; itemId: string; upgradeId: string }
  | { type: 'gamble'; roll: number };

function cloneState(state: RunState): RunState {
  return {
    ...state,
    floors: state.floors.map((floor) => ({
      ...floor,
      nodes: floor.nodes.map((node) => ({ ...node, connectedTo: [...node.connectedTo] })),
    })),
    partyCharacterIds: [...state.partyCharacterIds],
    partyPositions: { ...state.partyPositions },
    deadCharacterIds: [...state.deadCharacterIds],
    relics: [...state.relics],
  };
}

function getActiveFloor(state: RunState) {
  return state.floors.find((floor) => floor.floorNumber === state.currentFloor) ?? null;
}

function isPartyWiped(state: RunState) {
  return state.partyCharacterIds.length > 0 && state.partyCharacterIds.every((id) => state.deadCharacterIds.includes(id));
}

export function selectNode(state: RunState, nodeId: string): RunState | { error: string } {
  if (state.status !== 'active') return { error: 'Run is not active.' };
  const next = cloneState(state);
  const floor = getActiveFloor(next);
  if (!floor) return { error: 'Current floor not found.' };
  const node = floor.nodes.find((item) => item.id === nodeId);
  if (!node) return { error: 'Node not found.' };
  if (node.status !== 'available') return { error: 'Node is not available.' };

  floor.nodes = floor.nodes.map((item) => ({
    ...item,
    status: item.id === nodeId ? 'current' : item.status === 'current' ? 'available' : item.status,
  }));
  next.currentNodeId = nodeId;
  return next;
}

export function completeNode(state: RunState, nodeId: string, result: NodeResult): RunState {
  const next = cloneState(state);
  const floor = getActiveFloor(next);
  if (!floor || state.status !== 'active') return next;

  const completed = floor.nodes.find((node) => node.id === nodeId);
  if (!completed) return next;

  floor.nodes = floor.nodes.map((node) => {
    if (node.id === nodeId) return { ...node, status: 'completed' };
    if (completed.connectedTo.includes(node.id) && node.status === 'locked') return { ...node, status: 'available' };
    return node;
  });
  next.currentNodeId = null;

  if (result.type === 'combat') {
    next.gold += result.goldEarned;
    next.enemiesKilled += result.enemiesKilled;
    if (!result.won) next.status = 'defeat';
  }

  if (nodeId === floor.bossNodeId) {
    floor.completed = true;
    next.floorsCleared += 1;
    next.wardenPointsEarned += 10 + next.currentFloor * 5;

    if (next.currentFloor >= next.floors.length) {
      next.status = 'victory';
      next.endedAt = new Date().toISOString();
    } else {
      next.currentFloor += 1;
      const newFloor = getActiveFloor(next);
      if (newFloor) {
        newFloor.nodes = newFloor.nodes.map((node) => ({
          ...node,
          status: node.row === 0 ? 'available' : node.status,
        }));
      }
    }
  }

  if (isPartyWiped(next)) {
    next.status = 'defeat';
    next.endedAt = new Date().toISOString();
  }

  return next;
}

export function addRelic(state: RunState, relic: RunRelic): RunState {
  if (state.relics.some((item) => item.id === relic.id)) return state;
  return { ...state, relics: [...state.relics, relic] };
}

export function addGold(state: RunState, amount: number): RunState {
  return { ...state, gold: Math.max(0, state.gold + amount) };
}

export function spendGold(state: RunState, amount: number): RunState | { error: string } {
  if (amount < 0) return { error: 'Gold cost cannot be negative.' };
  if (state.gold < amount) return { error: 'Not enough gold.' };
  return { ...state, gold: state.gold - amount };
}

export function markCharacterDead(state: RunState, characterId: string): RunState {
  const deadCharacterIds = state.deadCharacterIds.includes(characterId)
    ? state.deadCharacterIds
    : [...state.deadCharacterIds, characterId];
  const next = { ...state, deadCharacterIds };
  if (isPartyWiped(next)) {
    return { ...next, status: 'defeat', endedAt: new Date().toISOString() };
  }
  return next;
}
