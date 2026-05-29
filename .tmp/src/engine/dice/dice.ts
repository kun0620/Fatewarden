import type { DiceRoll } from './types';

const allowedSides = new Set([4, 6, 8, 10, 12, 20]);
const formulaPattern = /^\s*(\d+)d(4|6|8|10|12|20)\s*([+-]\s*\d+)?\s*$/i;

function defaultRng() {
  return Math.random();
}

function clampCount(count: number) {
  if (!Number.isFinite(count)) return 1;
  return Math.max(1, Math.min(100, Math.trunc(count)));
}

function normalizeModifier(raw?: string) {
  if (!raw) return 0;
  return Number(raw.replace(/\s+/g, ''));
}

export function rollMultiple(count: number, sides: number, rng: () => number = defaultRng): number[] {
  const safeCount = clampCount(count);
  if (!allowedSides.has(sides)) {
    throw new Error(`Unsupported die: d${sides}`);
  }

  return Array.from({ length: safeCount }, () => {
    const roll = Math.floor(rng() * sides) + 1;
    return Math.max(1, Math.min(sides, roll));
  });
}

export function rollD20(rng: () => number = defaultRng): number {
  return rollMultiple(1, 20, rng)[0];
}

export function rollDice(formula: string, rng: () => number = defaultRng): DiceRoll {
  const match = formula.match(formulaPattern);
  if (!match) {
    throw new Error(`Invalid dice formula: ${formula}`);
  }

  const count = Number(match[1]);
  const sides = Number(match[2]);
  const modifier = normalizeModifier(match[3]);
  const rolls = rollMultiple(count, sides, rng);
  const subtotal = rolls.reduce((sum, value) => sum + value, modifier);

  return {
    notation: `${count}d${sides}${modifier === 0 ? '' : modifier > 0 ? `+${modifier}` : modifier}`,
    count,
    sides,
    modifier,
    rolls,
    subtotal,
  };
}
