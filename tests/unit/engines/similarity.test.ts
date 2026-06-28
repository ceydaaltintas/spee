import { describe, it, expect } from 'vitest';
import { cosineSimilarity, weightedAverage } from '../../../src/engines/cbr/similarity.js';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1.0, 5);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5);
  });

  it('returns 0 for zero vectors', () => {
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });

  it('computes correctly for non-trivial vectors', () => {
    const sim = cosineSimilarity([1, 2, 3], [4, 5, 6]);
    expect(sim).toBeGreaterThan(0.97);
    expect(sim).toBeLessThan(1.0);
  });
});

describe('weightedAverage', () => {
  it('computes weighted average', () => {
    const result = weightedAverage([
      { value: 3, weight: 0.8 },
      { value: 5, weight: 0.5 },
    ]);
    // (3*0.8 + 5*0.5) / (0.8 + 0.5) = 4.9 / 1.3 ≈ 3.769
    expect(result).toBeCloseTo(3.769, 2);
  });

  it('returns 0 for empty array', () => {
    expect(weightedAverage([])).toBe(0);
  });

  it('returns value when single item', () => {
    expect(weightedAverage([{ value: 7, weight: 1 }])).toBe(7);
  });
});
