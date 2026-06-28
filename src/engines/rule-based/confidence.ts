import { TECHNIQUE_REGISTRY } from '../../techniques/technique.registry.js';

export interface ConfidenceInput {
  filledCriteriaCount: number;
  totalCriteriaCount: number;
  scopeClarity?: number;
  hasVelocityData: boolean;
  hasSimilarHistory: boolean;
  cbrEngineAgreement?: boolean;
}

export function calculateConfidence(input: ConfidenceInput): number {
  let score = 0;

  const fillRate = input.filledCriteriaCount / input.totalCriteriaCount;
  score += fillRate * 0.50;

  if (input.scopeClarity !== undefined) {
    score += ((5 - input.scopeClarity) / 4) * 0.20;
  }

  if (input.hasVelocityData) score += 0.15;
  if (input.hasSimilarHistory) score += 0.15;

  if (input.cbrEngineAgreement === true) score = Math.min(1.0, score + 0.05);
  if (input.cbrEngineAgreement === false) score = Math.max(0, score - 0.10);

  return Math.min(1.0, Math.max(0, score));
}

export function calculateConfidenceInterval(
  suggestedSP: number,
  confidence: number,
  technique: string,
): { low: number; high: number } {
  const config = TECHNIQUE_REGISTRY[technique];
  if (!config) return { low: suggestedSP, high: suggestedSP };

  const scale = config.scale as number[];
  const idx = scale.indexOf(suggestedSP);
  if (idx === -1) return { low: suggestedSP, high: suggestedSP };

  const spread = confidence > 0.8 ? 1 : confidence > 0.5 ? 2 : 3;
  const lowIdx = Math.max(0, idx - spread);
  const highIdx = Math.min(scale.length - 1, idx + spread);

  return { low: scale[lowIdx] as number, high: scale[highIdx] as number };
}
