import type { NodeType, RunState } from './runTypes';

export interface WpBreakdownItem {
  label: string;
  amount: number;
}

export function countCompletedNodes(runState: RunState, type: NodeType) {
  return runState.floors.reduce(
    (total, floor) => total + floor.nodes.filter((node) => node.type === type && node.status === 'completed').length,
    0,
  );
}

export function calculateWPBreakdown(runState: RunState) {
  const items: WpBreakdownItem[] = [];
  const elites = countCompletedNodes(runState, 'elite');
  const bosses = countCompletedNodes(runState, 'boss');
  const mysteryRooms = countCompletedNodes(runState, 'mystery');

  if (runState.floorsCleared > 0) {
    items.push({ label: 'Floor bonus', amount: runState.floorsCleared * 15 });
  }

  if (elites > 0) {
    items.push({ label: 'Elite bonus', amount: elites * 10 });
  }

  if (bosses > 0) {
    items.push({ label: 'Boss bonus', amount: bosses * 30 });
  }

  if (runState.deadCharacterIds.length === 0 && runState.status === 'victory') {
    items.push({ label: 'No-death bonus', amount: 40 });
  }

  if (runState.status === 'victory') {
    items.push({ label: 'Victory bonus', amount: 50 });
  }

  if (mysteryRooms > 0) {
    items.push({ label: 'Mystery bonus', amount: mysteryRooms * 4 });
  }

  items.push({ label: 'Run completed', amount: 20 });

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return { items, total };
}

export function getTotalRoomsCleared(runState: RunState) {
  return runState.floors.reduce(
    (total, floor) => total + floor.nodes.filter((node) => node.status === 'completed').length,
    0,
  );
}

export function getWardenRank(totalPoints: number) {
  if (totalPoints >= 2500) return 'Rank IV';
  if (totalPoints >= 1200) return 'Rank III';
  if (totalPoints >= 500) return 'Rank II';
  return 'Rank I';
}
