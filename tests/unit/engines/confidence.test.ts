import { describe, it, expect } from 'vitest';
import { calculateConfidence, calculateConfidenceInterval } from '../../../src/engines/rule-based/confidence.js';

describe('calculateConfidence', () => {
  it('returns 0 when nothing is filled', () => {
    const score = calculateConfidence({
      filledCriteriaCount: 0,
      totalCriteriaCount: 10,
      hasVelocityData: false,
      hasSimilarHistory: false,
    });
    expect(score).toBe(0);
  });

  it('returns max ~1.0 when everything is filled and favorable', () => {
    const score = calculateConfidence({
      filledCriteriaCount: 10,
      totalCriteriaCount: 10,
      scopeClarity: 1,
      hasVelocityData: true,
      hasSimilarHistory: true,
    });
    expect(score).toBe(1.0);
  });

  it('penalizes high scopeClarity (unclear scope)', () => {
    const clear = calculateConfidence({
      filledCriteriaCount: 5,
      totalCriteriaCount: 10,
      scopeClarity: 1,
      hasVelocityData: false,
      hasSimilarHistory: false,
    });
    const unclear = calculateConfidence({
      filledCriteriaCount: 5,
      totalCriteriaCount: 10,
      scopeClarity: 5,
      hasVelocityData: false,
      hasSimilarHistory: false,
    });
    expect(clear).toBeGreaterThan(unclear);
  });

  it('adds CBR agreement bonus', () => {
    const base = calculateConfidence({
      filledCriteriaCount: 5,
      totalCriteriaCount: 10,
      hasVelocityData: false,
      hasSimilarHistory: false,
    });
    const withAgreement = calculateConfidence({
      filledCriteriaCount: 5,
      totalCriteriaCount: 10,
      hasVelocityData: false,
      hasSimilarHistory: false,
      cbrEngineAgreement: true,
    });
    expect(withAgreement).toBe(base + 0.05);
  });
});

describe('calculateConfidenceInterval', () => {
  it('returns narrow interval for high confidence', () => {
    const { low, high } = calculateConfidenceInterval(5, 0.9, 'FIBONACCI');
    expect(high - low).toBeLessThanOrEqual(8);
  });

  it('returns wider interval for low confidence', () => {
    const { low, high } = calculateConfidenceInterval(5, 0.3, 'FIBONACCI');
    expect(high - low).toBeGreaterThan(0);
  });

  it('returns same value for unknown technique', () => {
    const { low, high } = calculateConfidenceInterval(5, 0.5, 'UNKNOWN');
    expect(low).toBe(5);
    expect(high).toBe(5);
  });
});
