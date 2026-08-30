import type { CriteriaInput, CriteriaKey, EstimationResult } from './types';
import {
  TASK_TYPE_REGISTRY, TECHNIQUE_REGISTRY, mapScoreToSP,
  BOOLEAN_MULTIPLIERS, INVERTED_CRITERIA, BOOLEAN_CRITERIA,
} from './registry';

function normalizeScale5(value: number): number {
  return value * 2;
}

function normalizeCount(value: number): number {
  return Math.min(10, Math.log2(value + 1) * 2);
}

function invert(normalizedValue: number): number {
  return 10 - normalizedValue;
}

export function estimate(
  taskType: string,
  technique: string,
  criteria: CriteriaInput,
  customWeights?: Record<string, number>,
): EstimationResult {
  const taskConfig = TASK_TYPE_REGISTRY[taskType];
  if (!taskConfig) throw new Error(`Bilinmeyen görev tipi: ${taskType}`);

  const weights = customWeights ?? taskConfig.defaultWeights;

  let weightedSum = 0;
  let multiplier = 1.0;
  const breakdown: EstimationResult['breakdown'] = {};

  for (const [key, criteriaValue] of Object.entries(criteria)) {
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

  const rawScore = weightedSum * multiplier;
  const suggestedSP = mapScoreToSP(rawScore, technique);

  const filledKeys = Object.keys(criteria);
  const missingCriteria = taskConfig.activeCriteria.filter(
    c => !filledKeys.includes(c) && !BOOLEAN_CRITERIA.includes(c),
  );

  const filledCount = filledKeys.length;
  const totalCount = taskConfig.activeCriteria.length;
  const fillRate = filledCount / totalCount;
  let confidenceScore = fillRate * 0.50;

  const scopeVal = criteria.scopeClarity;
  if (scopeVal && scopeVal.type === 'scale5') {
    confidenceScore += ((5 - scopeVal.value) / 4) * 0.20;
  }

  if (criteria.hasSimilarHistory?.type === 'boolean' && criteria.hasSimilarHistory.value) {
    confidenceScore += 0.15;
  }

  confidenceScore = Math.min(1.0, Math.max(0, confidenceScore));

  const config = TECHNIQUE_REGISTRY[technique];
  const scale = (config?.scale ?? []) as number[];
  const spNum = typeof suggestedSP === 'number' ? suggestedSP : 0;
  const idx = scale.indexOf(spNum);
  const spread = confidenceScore > 0.8 ? 1 : confidenceScore > 0.5 ? 2 : 3;
  const lowIdx = Math.max(0, idx - spread);
  const highIdx = Math.min(scale.length - 1, idx + spread);

  return {
    suggestedSP,
    rawScore,
    confidenceScore,
    confidenceLow: scale[lowIdx] ?? spNum,
    confidenceHigh: scale[highIdx] ?? spNum,
    missingCriteria,
    breakdown,
  };
}
