export const conditionIds = [
  'blinded',
  'charmed',
  'deafened',
  'frightened',
  'grappled',
  'incapacitated',
  'invisible',
  'paralyzed',
  'petrified',
  'poisoned',
  'prone',
  'restrained',
  'stunned',
  'unconscious',
] as const;

export type ConditionId = (typeof conditionIds)[number];

export interface ConditionDefinition {
  readonly id: ConditionId;
  readonly name: string;
  readonly description: string;
}

export const conditionDefinitions: Record<ConditionId, ConditionDefinition> = {
  blinded: {
    id: 'blinded',
    name: 'Blinded',
    description: 'Cannot see and automatically fails checks requiring sight.',
  },
  charmed: {
    id: 'charmed',
    name: 'Charmed',
    description: 'Cannot attack charmer and charmer has advantage on social checks.',
  },
  deafened: {
    id: 'deafened',
    name: 'Deafened',
    description: 'Cannot hear and automatically fails checks requiring hearing.',
  },
  frightened: {
    id: 'frightened',
    name: 'Frightened',
    description: 'Disadvantage while source is in sight and cannot move closer willingly.',
  },
  grappled: {
    id: 'grappled',
    name: 'Grappled',
    description: 'Speed becomes 0 until grapple ends.',
  },
  incapacitated: {
    id: 'incapacitated',
    name: 'Incapacitated',
    description: 'Cannot take actions or reactions.',
  },
  invisible: {
    id: 'invisible',
    name: 'Invisible',
    description: 'Cannot be seen without special senses; attacks against have disadvantage.',
  },
  paralyzed: {
    id: 'paralyzed',
    name: 'Paralyzed',
    description: 'Incapacitated, cannot move/speak, fails STR/DEX saves.',
  },
  petrified: {
    id: 'petrified',
    name: 'Petrified',
    description: 'Transformed into rigid substance; incapacitated and speed 0.',
  },
  poisoned: {
    id: 'poisoned',
    name: 'Poisoned',
    description: 'Disadvantage on attack rolls and ability checks.',
  },
  prone: {
    id: 'prone',
    name: 'Prone',
    description: 'Only crawl movement; attack rolls against vary by distance.',
  },
  restrained: {
    id: 'restrained',
    name: 'Restrained',
    description: 'Speed 0, attack disadvantage, DEX save disadvantage.',
  },
  stunned: {
    id: 'stunned',
    name: 'Stunned',
    description: 'Incapacitated, cannot move, fails STR/DEX saves.',
  },
  unconscious: {
    id: 'unconscious',
    name: 'Unconscious',
    description: 'Incapacitated, cannot move/speak, unaware; drops prone.',
  },
};

export function normalizeConditionId(value: string): ConditionId | null {
  const normalized = value.trim().toLowerCase();
  return (conditionIds as readonly string[]).includes(normalized) ? (normalized as ConditionId) : null;
}
