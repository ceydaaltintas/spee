import { describe, it, expect } from 'vitest';
import { calculateRawScore, runRuleEngine } from '../../../src/engines/rule-based/rule.engine.js';
import type { CriteriaInput } from '../../../src/engines/rule-based/criteria.types.js';
import { TASK_TYPE_REGISTRY } from '../../../src/task-types/task-type.registry.js';

describe('calculateRawScore', () => {
  it('calculates weighted sum for scale5 inputs', () => {
    const input: CriteriaInput = {
      technicalComplexity: { type: 'scale5', value: 4 },
      scopeClarity: { type: 'scale5', value: 3 },
    };
    const weights = { technicalComplexity: 0.6, scopeClarity: 0.4 };
    const { rawScore } = calculateRawScore(input, weights);
    // norm(4)=8*0.6 + norm(3)=6*0.4 = 4.8 + 2.4 = 7.2
    expect(rawScore).toBeCloseTo(7.2, 5);
  });

  it('applies boolean multiplier', () => {
    const input: CriteriaInput = {
      technicalComplexity: { type: 'scale5', value: 3 },
      hasSecurityConstraint: { type: 'boolean', value: true },
    };
    const weights = { technicalComplexity: 1.0 };
    const { rawScore } = calculateRawScore(input, weights);
    // norm(3)=6 * 1.0 * 1.20 = 7.2
    expect(rawScore).toBeCloseTo(7.2, 5);
  });

  it('does not apply boolean multiplier when false', () => {
    const input: CriteriaInput = {
      technicalComplexity: { type: 'scale5', value: 3 },
      hasSecurityConstraint: { type: 'boolean', value: false },
    };
    const weights = { technicalComplexity: 1.0 };
    const { rawScore } = calculateRawScore(input, weights);
    // norm(3)=6
    expect(rawScore).toBeCloseTo(6.0, 5);
  });

  it('inverts domainKnowledge (inverted criteria)', () => {
    const input: CriteriaInput = {
      domainKnowledge: { type: 'scale5', value: 1 },
    };
    const weights = { domainKnowledge: 1.0 };
    const { rawScore } = calculateRawScore(input, weights);
    // norm(1)=2, invert(2)=8, * 1.0 = 8.0
    expect(rawScore).toBeCloseTo(8.0, 5);
  });

  it('handles count type with normalization', () => {
    const input: CriteriaInput = {
      dependencyCount: { type: 'count', value: 7 },
    };
    const weights = { dependencyCount: 1.0 };
    const { rawScore } = calculateRawScore(input, weights);
    // log2(8)*2 = 3*2 = 6.0
    expect(rawScore).toBeCloseTo(6.0, 5);
  });
});

describe('runRuleEngine', () => {
  it('maps score to Fibonacci SP', () => {
    const input: CriteriaInput = {
      technicalComplexity: { type: 'scale5', value: 5 },
      scopeClarity: { type: 'scale5', value: 5 },
    };
    const weights = TASK_TYPE_REGISTRY.USER_STORY.defaultWeights;
    const result = runRuleEngine(input, weights, 'FIBONACCI');
    expect(typeof result.suggestedSP).toBe('number');
    expect(result.rawScore).toBeGreaterThan(0);
  });

  it('returns breakdown for each criterion', () => {
    const input: CriteriaInput = {
      technicalComplexity: { type: 'scale5', value: 3 },
      scopeClarity: { type: 'scale5', value: 2 },
    };
    const weights = { technicalComplexity: 0.6, scopeClarity: 0.4 };
    const result = runRuleEngine(input, weights, 'FIBONACCI');
    expect(result.breakdown).toHaveProperty('technicalComplexity');
    expect(result.breakdown).toHaveProperty('scopeClarity');
  });
});
