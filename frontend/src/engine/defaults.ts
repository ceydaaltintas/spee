// Backend task-type.registry.ts ile senkronize tutulan ön yüz kopyası

export type CriteriaType = 'scale5' | 'count' | 'boolean';

export interface CriteriaInfo {
  key: string;
  type: CriteriaType;
}

export const BOOLEAN_KEYS = new Set([
  'hasSecurityConstraint', 'hasPerformanceConstraint',
  'requiresDowntime', 'userResearchNeeded', 'hasSimilarHistory',
]);

// Görev tipine göre tüm mümkün kriterler (aktif/pasif edilebilir)
export const ALL_CRITERIA_BY_TASK_TYPE: Record<string, CriteriaInfo[]> = {
  USER_STORY: [
    { key: 'technicalComplexity', type: 'scale5' },
    { key: 'scopeClarity', type: 'scale5' },
    { key: 'dependencyCount', type: 'count' },
    { key: 'integrationPoints', type: 'count' },
    { key: 'techDebtRisk', type: 'scale5' },
    { key: 'testLoad', type: 'scale5' },
    { key: 'affectedModuleCount', type: 'count' },
    { key: 'domainKnowledge', type: 'scale5' },
    { key: 'teamMemberCount', type: 'count' },
    { key: 'hasSimilarHistory', type: 'boolean' },
    { key: 'hasSecurityConstraint', type: 'boolean' },
    { key: 'hasPerformanceConstraint', type: 'boolean' },
  ],
  BUG: [
    { key: 'reproductionDifficulty', type: 'scale5' },
    { key: 'rootCauseClarity', type: 'scale5' },
    { key: 'fixImpactScope', type: 'scale5' },
    { key: 'regressionRisk', type: 'scale5' },
    { key: 'techDebtRisk', type: 'scale5' },
    { key: 'domainKnowledge', type: 'scale5' },
    { key: 'teamMemberCount', type: 'count' },
    { key: 'hasSimilarHistory', type: 'boolean' },
    { key: 'hasSecurityConstraint', type: 'boolean' },
  ],
  ANALYSIS: [
    { key: 'ambiguityLevel', type: 'scale5' },
    { key: 'scopeClarity', type: 'scale5' },
    { key: 'domainKnowledge', type: 'scale5' },
    { key: 'stakeholderCount', type: 'count' },
    { key: 'dataAccessDifficulty', type: 'scale5' },
    { key: 'outputFormality', type: 'scale5' },
    { key: 'dependencyCount', type: 'count' },
    { key: 'teamMemberCount', type: 'count' },
    { key: 'hasSimilarHistory', type: 'boolean' },
  ],
  TEST_TASK: [
    { key: 'testCaseCount', type: 'count' },
    { key: 'regressionScope', type: 'scale5' },
    { key: 'envSetupComplexity', type: 'scale5' },
    { key: 'testDataComplexity', type: 'scale5' },
    { key: 'automationFeasibility', type: 'scale5' },
    { key: 'scopeClarity', type: 'scale5' },
    { key: 'domainKnowledge', type: 'scale5' },
    { key: 'teamMemberCount', type: 'count' },
    { key: 'hasSimilarHistory', type: 'boolean' },
  ],
  DESIGN: [
    { key: 'screenCount', type: 'count' },
    { key: 'designSystemFit', type: 'scale5' },
    { key: 'platformDiversity', type: 'scale5' },
    { key: 'approvalRounds', type: 'count' },
    { key: 'scopeClarity', type: 'scale5' },
    { key: 'stakeholderCount', type: 'count' },
    { key: 'domainKnowledge', type: 'scale5' },
    { key: 'teamMemberCount', type: 'count' },
    { key: 'hasSimilarHistory', type: 'boolean' },
    { key: 'userResearchNeeded', type: 'boolean' },
  ],
  DEVOPS: [
    { key: 'productionRisk', type: 'scale5' },
    { key: 'rollbackComplexity', type: 'scale5' },
    { key: 'envComplexity', type: 'scale5' },
    { key: 'crossTeamCoordination', type: 'scale5' },
    { key: 'techDebtRisk', type: 'scale5' },
    { key: 'dependencyCount', type: 'count' },
    { key: 'domainKnowledge', type: 'scale5' },
    { key: 'teamMemberCount', type: 'count' },
    { key: 'hasSimilarHistory', type: 'boolean' },
    { key: 'requiresDowntime', type: 'boolean' },
  ],
  SPIKE: [
    { key: 'ambiguityLevel', type: 'scale5' },
    { key: 'domainKnowledge', type: 'scale5' },
    { key: 'dataAccessDifficulty', type: 'scale5' },
    { key: 'scopeClarity', type: 'scale5' },
    { key: 'stakeholderCount', type: 'count' },
    { key: 'teamMemberCount', type: 'count' },
  ],
  SUB_TASK: [
    { key: 'technicalComplexity', type: 'scale5' },
    { key: 'scopeClarity', type: 'scale5' },
    { key: 'domainKnowledge', type: 'scale5' },
    { key: 'teamMemberCount', type: 'count' },
  ],
};

// Backend defaultWeights ile aynı değerler
export const DEFAULT_WEIGHTS: Record<string, Record<string, number>> = {
  USER_STORY: {
    technicalComplexity: 0.22, scopeClarity: 0.18, dependencyCount: 0.10,
    integrationPoints: 0.10, techDebtRisk: 0.13, testLoad: 0.10,
    affectedModuleCount: 0.05, domainKnowledge: 0.05, teamMemberCount: 0.07,
  },
  BUG: {
    reproductionDifficulty: 0.22, rootCauseClarity: 0.18, fixImpactScope: 0.18,
    regressionRisk: 0.13, techDebtRisk: 0.10, domainKnowledge: 0.10, teamMemberCount: 0.09,
  },
  ANALYSIS: {
    ambiguityLevel: 0.22, scopeClarity: 0.18, domainKnowledge: 0.18,
    stakeholderCount: 0.13, dataAccessDifficulty: 0.10, outputFormality: 0.10, teamMemberCount: 0.09,
  },
  TEST_TASK: {
    testCaseCount: 0.22, regressionScope: 0.18, envSetupComplexity: 0.13,
    testDataComplexity: 0.13, automationFeasibility: 0.10, scopeClarity: 0.08,
    domainKnowledge: 0.05, teamMemberCount: 0.11,
  },
  DESIGN: {
    screenCount: 0.22, designSystemFit: 0.18, platformDiversity: 0.13,
    approvalRounds: 0.13, scopeClarity: 0.08, stakeholderCount: 0.08,
    domainKnowledge: 0.05, teamMemberCount: 0.13,
  },
  DEVOPS: {
    productionRisk: 0.22, rollbackComplexity: 0.18, envComplexity: 0.18,
    crossTeamCoordination: 0.13, techDebtRisk: 0.10, dependencyCount: 0.10, teamMemberCount: 0.09,
  },
  SPIKE: {
    ambiguityLevel: 0.30, domainKnowledge: 0.25, dataAccessDifficulty: 0.18,
    scopeClarity: 0.13, teamMemberCount: 0.14,
  },
  SUB_TASK: {
    technicalComplexity: 0.43, scopeClarity: 0.25, domainKnowledge: 0.17, teamMemberCount: 0.15,
  },
};

// Bir kriter değişince diğerlerini orantılı normalize et
export function normalizeWeights(
  weights: Record<string, number>,
  changedKey: string,
  newValue: number,
): Record<string, number> {
  const result = { ...weights, [changedKey]: newValue };
  const others = Object.keys(result).filter(k => k !== changedKey);
  const oldOthersSum = others.reduce((s, k) => s + (weights[k] ?? 0), 0);
  const remaining = Math.max(0, 1 - newValue);

  if (oldOthersSum === 0) {
    // Diğerlerini eşit böl
    const share = others.length > 0 ? remaining / others.length : 0;
    for (const k of others) result[k] = share;
  } else {
    for (const k of others) {
      result[k] = ((weights[k] ?? 0) / oldOthersSum) * remaining;
    }
  }
  return result;
}
