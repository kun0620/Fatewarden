import type { SceneFlags, SceneMode, SceneObjective, SceneObjectiveStatus, SceneState, ThreatClock } from './sceneTypes';

type SceneFlagsWithTriggers = SceneFlags & {
  triggeredThreats?: string[];
};

function nowTs() {
  return Date.now();
}

function clampInt(value: number, min: number, max: number) {
  const safe = Number.isFinite(value) ? Math.trunc(value) : min;
  return Math.max(min, Math.min(max, safe));
}

function nextScene(scene: SceneState, patch: Partial<SceneState>): SceneState {
  return {
    ...scene,
    ...patch,
    updatedAt: nowTs(),
  };
}

function normalizeObjectiveStatus(status: SceneObjectiveStatus): SceneObjectiveStatus {
  if (status === 'completed' || status === 'failed') return status;
  return 'active';
}

export function createScene(
  sessionId: string,
  mode: SceneMode,
  location: string,
  description: string,
): SceneState {
  const timestamp = nowTs();
  return {
    id: crypto.randomUUID(),
    sessionId,
    mode,
    location: location.trim(),
    description: description.trim(),
    flags: {
      dangerLevel: 'none',
      realityStability: 'stable',
      isLit: true,
      isSilent: false,
      hasEscape: true,
    },
    objectives: [],
    threatClocks: [],
    turnNumber: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function transitionScene(
  scene: SceneState,
  newMode: SceneMode,
  newLocation: string,
  newDescription: string,
): SceneState {
  return nextScene(scene, {
    mode: newMode,
    location: newLocation.trim(),
    description: newDescription.trim(),
    turnNumber: scene.turnNumber + 1,
  });
}

export function addObjective(scene: SceneState, objective: SceneObjective): SceneState {
  const nextObjective: SceneObjective = {
    ...objective,
    status: normalizeObjectiveStatus(objective.status),
  };
  return nextScene(scene, {
    objectives: [...scene.objectives, nextObjective],
  });
}

export function updateObjective(scene: SceneState, objectiveId: string, status: SceneObjectiveStatus): SceneState {
  return nextScene(scene, {
    objectives: scene.objectives.map((objective) => (
      objective.id === objectiveId
        ? { ...objective, status: normalizeObjectiveStatus(status) }
        : objective
    )),
  });
}

export function addThreatClock(scene: SceneState, clock: ThreatClock): SceneState {
  const nextClock: ThreatClock = {
    ...clock,
    current: clampInt(clock.current, 0, Number.MAX_SAFE_INTEGER),
    max: Math.max(1, Math.trunc(clock.max)),
  };
  return nextScene(scene, {
    threatClocks: [...scene.threatClocks, nextClock],
  });
}

export function advanceThreatClock(scene: SceneState, clockId: string, amount: number): SceneState {
  let triggeredClockName: string | null = null;
  const increment = clampInt(amount, 0, Number.MAX_SAFE_INTEGER);
  const threatClocks = scene.threatClocks.map((clock) => {
    if (clock.id !== clockId) return clock;
    const nextCurrent = clampInt(clock.current + increment, 0, Number.MAX_SAFE_INTEGER);
    if (nextCurrent >= clock.max) {
      triggeredClockName = clock.name;
    }
    return { ...clock, current: nextCurrent };
  });

  if (!triggeredClockName) {
    return nextScene(scene, { threatClocks });
  }

  const previousFlags = scene.flags as SceneFlagsWithTriggers;
  const triggeredThreats = Array.from(new Set([...(previousFlags.triggeredThreats ?? []), triggeredClockName]));
  const nextFlags: SceneFlagsWithTriggers = {
    ...previousFlags,
    triggeredThreats,
  };

  return nextScene(scene, {
    threatClocks,
    flags: nextFlags,
  });
}

export function updateSceneFlags(scene: SceneState, partial: Partial<SceneFlags>): SceneState {
  return nextScene(scene, {
    flags: {
      ...scene.flags,
      ...partial,
    },
  });
}

export function getSceneContext(scene: SceneState) {
  return {
    mode: scene.mode,
    location: scene.location,
    dangerLevel: scene.flags.dangerLevel,
    realityStability: scene.flags.realityStability,
    activeObjectives: scene.objectives
      .filter((objective) => objective.status === 'active')
      .map((objective) => objective.description),
    activeThreatClocks: scene.threatClocks
      .filter((clock) => clock.current < clock.max)
      .map((clock) => ({
        name: clock.name,
        current: clock.current,
        max: clock.max,
      })),
  };
}

