export type ClassResourceRecoveryType = 'short' | 'long' | 'special';

export type ClassResource = {
  id: string; // 'rage', 'ki', 'action_surge', 'lay_on_hands', etc.
  name: string;
  current: number;
  max: number;
  recoveryType: ClassResourceRecoveryType;
};

export type ClassRuntime = {
  classId: string;
  subclassId?: string;
  level: number;
  resources: ClassResource[];
  activeFeatures: string[]; // feature ids currently available
  learnedSpells?: string[];
};
