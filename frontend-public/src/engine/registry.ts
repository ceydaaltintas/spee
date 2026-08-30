import type { TaskTypeConfig, TechniqueConfig, TechniqueScale, CriteriaKey } from './types';

export const TASK_TYPE_REGISTRY: Record<string, TaskTypeConfig> = {
  USER_STORY: {
    label: 'Kullanıcı Hikâyesi / Özellik',
    activeCriteria: [
      'technicalComplexity', 'scopeClarity', 'dependencyCount',
      'integrationPoints', 'techDebtRisk', 'testLoad',
      'affectedModuleCount', 'domainKnowledge', 'hasSimilarHistory',
      'hasSecurityConstraint', 'hasPerformanceConstraint', 'teamMemberCount',
    ],
    defaultWeights: {
      technicalComplexity: 0.22, scopeClarity: 0.18, dependencyCount: 0.10,
      integrationPoints: 0.10, techDebtRisk: 0.13, testLoad: 0.10,
      affectedModuleCount: 0.05, domainKnowledge: 0.05, teamMemberCount: 0.07,
    },
  },
  BUG: {
    label: 'Hata / Kusur',
    activeCriteria: [
      'reproductionDifficulty', 'rootCauseClarity', 'fixImpactScope',
      'regressionRisk', 'techDebtRisk', 'domainKnowledge',
      'hasSimilarHistory', 'hasSecurityConstraint', 'teamMemberCount',
    ],
    defaultWeights: {
      reproductionDifficulty: 0.22, rootCauseClarity: 0.18, fixImpactScope: 0.18,
      regressionRisk: 0.13, techDebtRisk: 0.10, domainKnowledge: 0.10, teamMemberCount: 0.09,
    },
  },
  ANALYSIS: {
    label: 'Analiz / Araştırma',
    activeCriteria: [
      'scopeClarity', 'stakeholderCount', 'dataAccessDifficulty',
      'outputFormality', 'ambiguityLevel', 'dependencyCount',
      'domainKnowledge', 'hasSimilarHistory', 'teamMemberCount',
    ],
    defaultWeights: {
      ambiguityLevel: 0.22, scopeClarity: 0.18, domainKnowledge: 0.18,
      stakeholderCount: 0.13, dataAccessDifficulty: 0.10, outputFormality: 0.10, teamMemberCount: 0.09,
    },
  },
  TEST_TASK: {
    label: 'Test Görevi',
    activeCriteria: [
      'testCaseCount', 'envSetupComplexity', 'automationFeasibility',
      'regressionScope', 'testDataComplexity', 'scopeClarity',
      'domainKnowledge', 'hasSimilarHistory', 'teamMemberCount',
    ],
    defaultWeights: {
      testCaseCount: 0.22, regressionScope: 0.18, envSetupComplexity: 0.13,
      testDataComplexity: 0.13, automationFeasibility: 0.10, scopeClarity: 0.08,
      domainKnowledge: 0.05, teamMemberCount: 0.11,
    },
  },
  DESIGN: {
    label: 'Tasarım / Kullanıcı Deneyimi',
    activeCriteria: [
      'screenCount', 'approvalRounds', 'userResearchNeeded',
      'designSystemFit', 'platformDiversity', 'scopeClarity',
      'stakeholderCount', 'domainKnowledge', 'hasSimilarHistory',
      'userResearchNeeded', 'teamMemberCount',
    ],
    defaultWeights: {
      screenCount: 0.22, designSystemFit: 0.18, platformDiversity: 0.13,
      approvalRounds: 0.13, scopeClarity: 0.08, stakeholderCount: 0.08,
      domainKnowledge: 0.05, teamMemberCount: 0.13,
    },
  },
  DEVOPS: {
    label: 'Altyapı / DevOps',
    activeCriteria: [
      'envComplexity', 'requiresDowntime', 'rollbackComplexity',
      'crossTeamCoordination', 'productionRisk', 'techDebtRisk',
      'dependencyCount', 'domainKnowledge', 'hasSimilarHistory',
      'requiresDowntime', 'teamMemberCount',
    ],
    defaultWeights: {
      productionRisk: 0.22, rollbackComplexity: 0.18, envComplexity: 0.18,
      crossTeamCoordination: 0.13, techDebtRisk: 0.10, dependencyCount: 0.10, teamMemberCount: 0.09,
    },
  },
  SPIKE: {
    label: 'Araştırma / Kavram İspatı',
    activeCriteria: [
      'ambiguityLevel', 'domainKnowledge', 'dataAccessDifficulty',
      'scopeClarity', 'stakeholderCount', 'teamMemberCount',
    ],
    defaultWeights: {
      ambiguityLevel: 0.30, domainKnowledge: 0.25, dataAccessDifficulty: 0.18,
      scopeClarity: 0.13, teamMemberCount: 0.14,
    },
  },
  SUB_TASK: {
    label: 'Alt Görev',
    activeCriteria: [
      'technicalComplexity', 'scopeClarity', 'domainKnowledge', 'teamMemberCount',
    ],
    defaultWeights: {
      technicalComplexity: 0.43, scopeClarity: 0.25, domainKnowledge: 0.17, teamMemberCount: 0.15,
    },
  },
};

export const TECHNIQUE_REGISTRY: Record<string, TechniqueConfig> = {
  FIBONACCI: {
    label: 'Fibonacci',
    scale: [1, 2, 3, 5, 8, 13, 21, 34, 55],
    thresholds: [1.5, 2.5, 3.5, 5.0, 6.5, 7.5, 8.5, 9.5, Infinity],
  },
  MODIFIED_FIBONACCI: {
    label: 'Değiştirilmiş Fibonacci',
    scale: [1, 2, 3, 5, 8, 13, 20, 40, 100],
    thresholds: [1.5, 2.5, 3.5, 5.0, 6.5, 7.5, 8.5, 9.5, Infinity],
  },
  TSHIRT: {
    label: 'Tişört Boyutlandırma',
    scale: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    thresholds: [2.0, 3.5, 5.0, 7.0, 8.5, Infinity],
    numericMapping: { XS: 1, S: 2, M: 3, L: 5, XL: 8, XXL: 13 },
  },
  POWERS_OF_TWO: {
    label: 'İkinin Kuvvetleri',
    scale: [1, 2, 4, 8, 16, 32],
    thresholds: [2.0, 3.5, 5.5, 7.5, 9.0, Infinity],
  },
  LINEAR: {
    label: 'Doğrusal (1–10)',
    scale: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    thresholds: [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, Infinity],
  },
};

export function mapScoreToSP(rawScore: number, technique: string): TechniqueScale {
  const config = TECHNIQUE_REGISTRY[technique];
  if (!config) return rawScore;
  for (let i = 0; i < config.thresholds.length; i++) {
    if (rawScore < config.thresholds[i]) return config.scale[i];
  }
  return config.scale[config.scale.length - 1];
}

export const BOOLEAN_CRITERIA: CriteriaKey[] = [
  'hasSecurityConstraint', 'hasPerformanceConstraint',
  'requiresDowntime', 'userResearchNeeded', 'hasSimilarHistory',
];

export const BOOLEAN_MULTIPLIERS: Partial<Record<CriteriaKey, number>> = {
  hasSecurityConstraint: 1.20,
  hasPerformanceConstraint: 1.15,
  requiresDowntime: 1.25,
  userResearchNeeded: 1.10,
  hasSimilarHistory: 0.80,
};

export const INVERTED_CRITERIA: CriteriaKey[] = [
  'domainKnowledge', 'rootCauseClarity', 'automationFeasibility', 'hasSimilarHistory',
];
