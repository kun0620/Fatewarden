import { useGameStore } from '../../store/useGameStore';
import { CombatArena } from './CombatArena';
import { EventScreen } from './EventScreen';
import { RestScreen } from './RestScreen';
import { RunMapScreen } from './RunMapScreen';
import { RunStartScreen } from './RunStartScreen';
import { RunSummaryScreen } from './RunSummaryScreen';
import { ShopScreen } from './ShopScreen';
import { TreasureScreen } from './TreasureScreen';

export function RunContent() {
  const { runState } = useGameStore();

  if (!runState) {
    return <RunStartScreen />;
  }

  if (runState.status === 'victory' || runState.status === 'defeat') {
    return <RunSummaryScreen />;
  }

  if (!runState.currentNodeId) {
    return <RunMapScreen onNodeSelect={() => {}} />;
  }

  const currentFloor = runState.floors[runState.currentFloor - 1];
  const currentNode = currentFloor?.nodes.find((node) => node.id === runState.currentNodeId);

  if (!currentNode) {
    return <RunMapScreen onNodeSelect={() => {}} />;
  }

  switch (currentNode.type) {
    case 'combat':
    case 'elite':
    case 'boss':
      return <CombatArena onCombatEnd={() => {}} />;
    case 'mystery':
      return <EventScreen />;
    case 'rest':
      return <RestScreen />;
    case 'shop':
      return <ShopScreen />;
    case 'treasure':
      return <TreasureScreen />;
    default:
      return <RunMapScreen onNodeSelect={() => {}} />;
  }
}

export default RunContent;
