export type SceneMode = 'exploration' | 'combat' | 'social' | 'rest' | 'horror' | 'transition';

export type SceneObjectiveStatus = 'active' | 'completed' | 'failed';

export interface SceneObjective {
  id: string;
  description: string;
  status: SceneObjectiveStatus;
  isHidden: boolean;
}

export interface ThreatClock {
  id: string;
  name: string;
  current: number;
  max: number; // when current >= max -> threat triggers
  triggerEvent: string; // description of what happens
}

export type DangerLevel = 'none' | 'low' | 'medium' | 'high' | 'extreme';
export type RealityStability = 'stable' | 'unstable' | 'fracturing' | 'broken';

export interface SceneFlags {
  dangerLevel: DangerLevel;
  realityStability: RealityStability;
  isLit: boolean;
  isSilent: boolean;
  hasEscape: boolean;
}

export interface SceneState {
  id: string;
  sessionId: string;
  mode: SceneMode;
  location: string;
  description: string;
  flags: SceneFlags;
  objectives: SceneObjective[];
  threatClocks: ThreatClock[];
  turnNumber: number;
  createdAt: number;
  updatedAt: number;
}

