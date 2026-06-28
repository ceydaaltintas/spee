import type { CriteriaKey } from '../../task-types/task-type.registry.js';

export type CriteriaValue =
  | { type: 'scale5'; value: 1 | 2 | 3 | 4 | 5 }
  | { type: 'count'; value: number }
  | { type: 'boolean'; value: boolean };

export type CriteriaInput = Partial<Record<CriteriaKey, CriteriaValue>>;

export const BOOLEAN_MULTIPLIERS: Partial<Record<CriteriaKey, number>> = {
  hasSecurityConstraint: 1.20,
  hasPerformanceConstraint: 1.15,
  requiresDowntime: 1.25,
  userResearchNeeded: 1.10,
  hasSimilarHistory: 0.80,
};

export const INVERTED_CRITERIA: CriteriaKey[] = [
  'domainKnowledge',
  'rootCauseClarity',
  'automationFeasibility',
  'hasSimilarHistory',
];
