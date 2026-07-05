import { prisma } from '../db/prisma.client.js';
import { TASK_TYPE_REGISTRY, type CriteriaKey } from '../task-types/task-type.registry.js';
import type { DriftAnalysis } from './drift.detector.js';

export interface CalibrationSuggestion {
  currentWeights: Record<string, Record<string, number>>;
  suggestedWeights: Record<string, Record<string, number>>;
  driftAnalysis: DriftAnalysis;
}

export async function generateCalibrationSuggestion(
  teamId: string,
  driftAnalysis: DriftAnalysis,
): Promise<CalibrationSuggestion> {
  const teamWeights = await prisma.teamWeight.findMany({
    where: { teamId },
  });

  const currentWeights: Record<string, Record<string, number>> = {};
  const suggestedWeights: Record<string, Record<string, number>> = {};

  for (const [taskType, config] of Object.entries(TASK_TYPE_REGISTRY)) {
    const existing = teamWeights.filter(w => w.taskType === taskType);

    const current: Record<string, number> = {};
    if (existing.length > 0) {
      for (const w of existing) current[w.criteriaKey] = w.weight;
    } else {
      Object.assign(current, config.defaultWeights);
    }
    currentWeights[taskType] = { ...current };

    const drift = driftAnalysis.byTaskType[taskType];
    if (!drift || drift.sampleCount < 1) {
      suggestedWeights[taskType] = { ...current };
      continue;
    }

    const adjusted = adjustWeights(current, drift.direction, drift.meanError);
    suggestedWeights[taskType] = adjusted;
  }

  return { currentWeights, suggestedWeights, driftAnalysis };
}

function adjustWeights(
  weights: Record<string, number>,
  direction: 'over' | 'under' | 'balanced',
  meanError: number,
): Record<string, number> {
  if (direction === 'balanced' || meanError < 0.15) {
    return { ...weights };
  }

  const keys = Object.keys(weights);
  const n = keys.length;
  if (n === 0) return weights;

  // How strongly to shift the distribution (capped at 20%)
  const strength = Math.min(meanError * 0.3, 0.20);
  const equalShare = 1 / n;
  const adjusted: Record<string, number> = {};

  for (const key of keys) {
    const w = weights[key]!;
    const deviation = w - equalShare;
    if (direction === 'under') {
      // Amplify high-weight criteria — they signal complexity that's being underweighted
      adjusted[key] = w + deviation * strength;
    } else {
      // Compress toward equal — reduce over-reliance on dominant criteria
      adjusted[key] = w - deviation * strength;
    }
    adjusted[key] = Math.max(adjusted[key]!, 0.01); // floor at 1%
  }

  const sum = Object.values(adjusted).reduce((a, b) => a + b, 0);
  for (const key of keys) {
    adjusted[key] = adjusted[key]! / sum;
  }

  return adjusted;
}
