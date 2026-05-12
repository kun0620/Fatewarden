export interface AdvantageResolution {
  readonly kept: number;
  readonly dropped: readonly number[];
  readonly all: readonly number[];
}

export function applyAdvantage(rollA: number, rollB: number): AdvantageResolution {
  const all = [rollA, rollB] as const;
  if (rollA >= rollB) {
    return { kept: rollA, dropped: [rollB], all };
  }
  return { kept: rollB, dropped: [rollA], all };
}

export function applyDisadvantage(rollA: number, rollB: number): AdvantageResolution {
  const all = [rollA, rollB] as const;
  if (rollA <= rollB) {
    return { kept: rollA, dropped: [rollB], all };
  }
  return { kept: rollB, dropped: [rollA], all };
}
