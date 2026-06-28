import { describe, it, expect } from 'vitest';
import { normalizeScale5, normalizeCount, invert } from '../../../src/engines/rule-based/normalizer.js';

describe('normalizeScale5', () => {
  it('maps 1 to 2', () => {
    expect(normalizeScale5(1)).toBe(2);
  });

  it('maps 5 to 10', () => {
    expect(normalizeScale5(5)).toBe(10);
  });

  it('maps 3 to 6', () => {
    expect(normalizeScale5(3)).toBe(6);
  });
});

describe('normalizeCount', () => {
  it('maps 0 to 0', () => {
    expect(normalizeCount(0)).toBe(0);
  });

  it('maps 1 to 2', () => {
    expect(normalizeCount(1)).toBe(2);
  });

  it('maps 3 to ~4', () => {
    expect(normalizeCount(3)).toBeCloseTo(4, 0);
  });

  it('maps 7 to 6', () => {
    expect(normalizeCount(7)).toBe(6);
  });

  it('maps 31 to 10', () => {
    expect(normalizeCount(31)).toBe(10);
  });

  it('caps at 10', () => {
    expect(normalizeCount(1000)).toBe(10);
  });
});

describe('invert', () => {
  it('inverts 0 to 10', () => {
    expect(invert(0)).toBe(10);
  });

  it('inverts 10 to 0', () => {
    expect(invert(10)).toBe(0);
  });

  it('inverts 6 to 4', () => {
    expect(invert(6)).toBe(4);
  });
});
