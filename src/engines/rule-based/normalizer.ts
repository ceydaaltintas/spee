export function normalizeScale5(value: number): number {
  return value * 2;
}

export function normalizeCount(value: number): number {
  return Math.min(10, Math.log2(value + 1) * 2);
}

export function invert(normalizedValue: number): number {
  return 10 - normalizedValue;
}
