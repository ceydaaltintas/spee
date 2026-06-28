export type CriteriaKey =
  | 'scopeClarity'
  | 'dependencyCount'
  | 'domainKnowledge'
  | 'hasSimilarHistory'
  | 'technicalComplexity'
  | 'integrationPoints'
  | 'techDebtRisk'
  | 'testLoad'
  | 'hasSecurityConstraint'
  | 'hasPerformanceConstraint'
  | 'affectedModuleCount'
  | 'stakeholderCount'
  | 'dataAccessDifficulty'
  | 'outputFormality'
  | 'ambiguityLevel'
  | 'testCaseCount'
  | 'envSetupComplexity'
  | 'automationFeasibility'
  | 'regressionScope'
  | 'testDataComplexity'
  | 'reproductionDifficulty'
  | 'rootCauseClarity'
  | 'fixImpactScope'
  | 'regressionRisk'
  | 'screenCount'
  | 'approvalRounds'
  | 'userResearchNeeded'
  | 'designSystemFit'
  | 'platformDiversity'
  | 'envComplexity'
  | 'requiresDowntime'
  | 'rollbackComplexity'
  | 'crossTeamCoordination'
  | 'productionRisk'
  | 'teamMemberCount';

export interface TaskTypeConfig {
  label: string;
  activeCriteria: CriteriaKey[];
  defaultWeights: Partial<Record<CriteriaKey, number>>;
}

export const TASK_TYPE_REGISTRY: Record<string, TaskTypeConfig> = {
  USER_STORY: {
    label: 'User Story / Feature',
    activeCriteria: [
      'technicalComplexity', 'scopeClarity', 'dependencyCount',
      'integrationPoints', 'techDebtRisk', 'testLoad',
      'affectedModuleCount', 'domainKnowledge', 'hasSimilarHistory',
      'hasSecurityConstraint', 'hasPerformanceConstraint', 'teamMemberCount',
    ],
    defaultWeights: {
      technicalComplexity: 0.22,
      scopeClarity: 0.18,
      dependencyCount: 0.10,
      integrationPoints: 0.10,
      techDebtRisk: 0.13,
      testLoad: 0.10,
      affectedModuleCount: 0.05,
      domainKnowledge: 0.05,
      teamMemberCount: 0.07,
    },
  },

  BUG: {
    label: 'Bug / Defect',
    activeCriteria: [
      'reproductionDifficulty', 'rootCauseClarity', 'fixImpactScope',
      'regressionRisk', 'techDebtRisk', 'domainKnowledge',
      'hasSimilarHistory', 'hasSecurityConstraint', 'teamMemberCount',
    ],
    defaultWeights: {
      reproductionDifficulty: 0.22,
      rootCauseClarity: 0.18,
      fixImpactScope: 0.18,
      regressionRisk: 0.13,
      techDebtRisk: 0.10,
      domainKnowledge: 0.10,
      teamMemberCount: 0.09,
    },
  },

  ANALYSIS: {
    label: 'Analysis / Research',
    activeCriteria: [
      'scopeClarity', 'stakeholderCount', 'dataAccessDifficulty',
      'outputFormality', 'ambiguityLevel', 'dependencyCount',
      'domainKnowledge', 'hasSimilarHistory', 'teamMemberCount',
    ],
    defaultWeights: {
      ambiguityLevel: 0.22,
      scopeClarity: 0.18,
      domainKnowledge: 0.18,
      stakeholderCount: 0.13,
      dataAccessDifficulty: 0.10,
      outputFormality: 0.10,
      teamMemberCount: 0.09,
    },
  },

  TEST_TASK: {
    label: 'Test Task / QA',
    activeCriteria: [
      'testCaseCount', 'envSetupComplexity', 'automationFeasibility',
      'regressionScope', 'testDataComplexity', 'scopeClarity',
      'domainKnowledge', 'hasSimilarHistory', 'teamMemberCount',
    ],
    defaultWeights: {
      testCaseCount: 0.22,
      regressionScope: 0.18,
      envSetupComplexity: 0.13,
      testDataComplexity: 0.13,
      automationFeasibility: 0.10,
      scopeClarity: 0.08,
      domainKnowledge: 0.05,
      teamMemberCount: 0.11,
    },
  },

  DESIGN: {
    label: 'Design / UX',
    activeCriteria: [
      'screenCount', 'approvalRounds', 'userResearchNeeded',
      'designSystemFit', 'platformDiversity', 'scopeClarity',
      'stakeholderCount', 'domainKnowledge', 'hasSimilarHistory', 'teamMemberCount',
    ],
    defaultWeights: {
      screenCount: 0.22,
      designSystemFit: 0.18,
      platformDiversity: 0.13,
      approvalRounds: 0.13,
      scopeClarity: 0.08,
      stakeholderCount: 0.08,
      domainKnowledge: 0.05,
      teamMemberCount: 0.13,
    },
  },

  DEVOPS: {
    label: 'DevOps / Infrastructure',
    activeCriteria: [
      'envComplexity', 'requiresDowntime', 'rollbackComplexity',
      'crossTeamCoordination', 'productionRisk', 'techDebtRisk',
      'dependencyCount', 'domainKnowledge', 'hasSimilarHistory', 'teamMemberCount',
    ],
    defaultWeights: {
      productionRisk: 0.22,
      rollbackComplexity: 0.18,
      envComplexity: 0.18,
      crossTeamCoordination: 0.13,
      techDebtRisk: 0.10,
      dependencyCount: 0.10,
      teamMemberCount: 0.09,
    },
  },

  SPIKE: {
    label: 'Spike / Proof of Concept',
    activeCriteria: [
      'ambiguityLevel', 'domainKnowledge', 'dataAccessDifficulty',
      'scopeClarity', 'stakeholderCount', 'teamMemberCount',
    ],
    defaultWeights: {
      ambiguityLevel: 0.30,
      domainKnowledge: 0.25,
      dataAccessDifficulty: 0.18,
      scopeClarity: 0.13,
      teamMemberCount: 0.14,
    },
  },

  SUB_TASK: {
    label: 'Sub Task',
    activeCriteria: [
      'technicalComplexity', 'scopeClarity', 'domainKnowledge', 'teamMemberCount',
    ],
    defaultWeights: {
      technicalComplexity: 0.43,
      scopeClarity: 0.25,
      domainKnowledge: 0.17,
      teamMemberCount: 0.15,
    },
  },
};
