import type { CriteriaKey } from '../../task-types/task-type.registry.js';
import type { CriteriaInput } from './criteria.types.js';
import { BOOLEAN_MULTIPLIERS, INVERTED_CRITERIA } from './criteria.types.js';
import { normalizeCount, normalizeScale5, invert } from './normalizer.js';
import { mapScoreToSP, type TechniqueScale } from '../../techniques/technique.registry.js';

export interface RuleEngineResult {
  rawScore: number;
  suggestedSP: TechniqueScale;
  breakdown: Record<string, {
    rawValue: { type: string; value: number | boolean };
    normalizedScore: number;
    contribution: number;
  }>;
}

export function calculateRawScore(
  input: CriteriaInput,
  weights: Partial<Record<CriteriaKey, number>>,
): { rawScore: number; multiplier: number; breakdown: RuleEngineResult['breakdown'] } {
  let weightedSum = 0;
  let multiplier = 1.0;
  const breakdown: RuleEngineResult['breakdown'] = {};

  for (const [key, criteriaValue] of Object.entries(input)) {
    const ck = key as CriteriaKey;
    if (!criteriaValue) continue;

    if (criteriaValue.type === 'boolean') {
      const m = BOOLEAN_MULTIPLIERS[ck];
      if (m) multiplier *= criteriaValue.value ? m : 1.0;
      breakdown[ck] = {
        rawValue: criteriaValue,
        normalizedScore: criteriaValue.value ? 1 : 0,
        contribution: 0,
      };
      continue;
    }

    const weight = weights[ck] ?? 0;
    if (weight === 0) continue;

    let normalized = criteriaValue.type === 'count'
      ? normalizeCount(criteriaValue.value)
      : normalizeScale5(criteriaValue.value);

    if (INVERTED_CRITERIA.includes(ck)) {
      normalized = invert(normalized);
    }

    const contribution = normalized * weight;
    weightedSum += contribution;

    breakdown[ck] = {
      rawValue: criteriaValue,
      normalizedScore: normalized,
      contribution,
    };
  }

  return { rawScore: weightedSum * multiplier, multiplier, breakdown };
}

export function runRuleEngine(
  input: CriteriaInput,
  weights: Partial<Record<CriteriaKey, number>>,
  technique: string,
): RuleEngineResult {
  const { rawScore, breakdown } = calculateRawScore(input, weights);
  const suggestedSP = mapScoreToSP(rawScore, technique);
  return { rawScore, suggestedSP, breakdown };
}
