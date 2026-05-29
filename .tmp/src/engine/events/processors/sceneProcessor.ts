import type { SceneState } from '../../scene';
import { advanceThreatClock, transitionScene, updateObjective } from '../../scene';
import type {
  SceneObjectiveUpdateEvent,
  SceneTransitionEvent,
  ThreatClockAdvanceEvent,
} from '../types';

export type SceneEventResult = {
  scene: SceneState;
  applied: boolean;
  error?: string;
};

export function processSceneTransition(scene: SceneState, event: SceneTransitionEvent): SceneEventResult {
  if (scene.sessionId !== event.sessionId) {
    return {
      scene,
      applied: false,
      error: 'Scene session mismatch',
    };
  }

  return {
    scene: transitionScene(scene, event.newMode, event.newLocation, event.newDescription),
    applied: true,
  };
}

export function processObjectiveUpdate(scene: SceneState, event: SceneObjectiveUpdateEvent): SceneEventResult {
  if (scene.sessionId !== event.sessionId) {
    return {
      scene,
      applied: false,
      error: 'Scene session mismatch',
    };
  }

  const hasObjective = scene.objectives.some((objective) => objective.id === event.objectiveId);
  if (!hasObjective) {
    return {
      scene,
      applied: false,
      error: `Objective not found: ${event.objectiveId}`,
    };
  }

  return {
    scene: updateObjective(scene, event.objectiveId, event.status),
    applied: true,
  };
}

export function processThreatClockAdvance(scene: SceneState, event: ThreatClockAdvanceEvent): SceneEventResult {
  if (scene.sessionId !== event.sessionId) {
    return {
      scene,
      applied: false,
      error: 'Scene session mismatch',
    };
  }

  const hasClock = scene.threatClocks.some((clock) => clock.id === event.clockId);
  if (!hasClock) {
    return {
      scene,
      applied: false,
      error: `Threat clock not found: ${event.clockId}`,
    };
  }

  return {
    scene: advanceThreatClock(scene, event.clockId, event.amount),
    applied: true,
  };
}
