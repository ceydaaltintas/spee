import { describe, it, expect, vi } from 'vitest';

// Test the direction classification logic directly
describe('drift detection logic', () => {
  function classifyDirection(directions: number[]): 'over' | 'under' | 'balanced' {
    if (directions.length === 0) return 'balanced';
    const avg = directions.reduce((a, b) => a + b, 0) / directions.length;
    if (avg > 0.5) return 'over';
    if (avg < -0.5) return 'under';
    return 'balanced';
  }

  it('classifies balanced when no data', () => {
    expect(classifyDirection([])).toBe('balanced');
  });

  it('classifies over-estimation', () => {
    expect(classifyDirection([2, 3, 1])).toBe('over');
  });

  it('classifies under-estimation', () => {
    expect(classifyDirection([-2, -3, -1])).toBe('under');
  });

  it('classifies balanced for mixed', () => {
    expect(classifyDirection([0.1, -0.1, 0.2, -0.2])).toBe('balanced');
  });
});

describe('calibration weight adjustment', () => {
  function adjustWeights(
    weights: Record<string, number>,
    direction: 'over' | 'under' | 'balanced',
    meanError: number,
  ): Record<string, number> {
    if (direction === 'balanced' || meanError < 0.15) return { ...weights };
    const factor = direction === 'over' ? 1 + meanError * 0.1 : 1 - meanError * 0.1;
    const adjusted: Record<string, number> = {};
    const keys = Object.keys(weights);
    for (const key of keys) adjusted[key] = weights[key]! * factor;
    const sum = Object.values(adjusted).reduce((a, b) => a + b, 0);
    for (const key of keys) adjusted[key] = adjusted[key]! / sum;
    return adjusted;
  }

  it('does not adjust for balanced direction', () => {
    const weights = { a: 0.5, b: 0.5 };
    const result = adjustWeights(weights, 'balanced', 0.5);
    expect(result).toEqual(weights);
  });

  it('does not adjust for low error', () => {
    const weights = { a: 0.6, b: 0.4 };
    const result = adjustWeights(weights, 'over', 0.1);
    expect(result).toEqual(weights);
  });

  it('adjusted weights still sum to 1.0', () => {
    const weights = { a: 0.3, b: 0.4, c: 0.3 };
    const result = adjustWeights(weights, 'over', 0.4);
    const sum = Object.values(result).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('preserves relative proportions', () => {
    const weights = { a: 0.6, b: 0.4 };
    const result = adjustWeights(weights, 'over', 0.3);
    expect(result.a! / result.b!).toBeCloseTo(0.6 / 0.4, 5);
  });
});
