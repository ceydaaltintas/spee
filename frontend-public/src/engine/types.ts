export type CriteriaKey =
  | 'scopeClarity' | 'dependencyCount' | 'domainKnowledge' | 'hasSimilarHistory'
  | 'technicalComplexity' | 'integrationPoints' | 'techDebtRisk' | 'testLoad'
  | 'hasSecurityConstraint' | 'hasPerformanceConstraint' | 'affectedModuleCount'
  | 'stakeholderCount' | 'dataAccessDifficulty' | 'outputFormality' | 'ambiguityLevel'
  | 'testCaseCount' | 'envSetupComplexity' | 'automationFeasibility' | 'regressionScope'
  | 'testDataComplexity' | 'reproductionDifficulty' | 'rootCauseClarity' | 'fixImpactScope'
  | 'regressionRisk' | 'screenCount' | 'approvalRounds' | 'userResearchNeeded'
  | 'designSystemFit' | 'platformDiversity' | 'envComplexity' | 'requiresDowntime'
  | 'rollbackComplexity' | 'crossTeamCoordination' | 'productionRisk' | 'teamMemberCount';

export type CriteriaValue =
  | { type: 'scale5'; value: number }
  | { type: 'count'; value: number }
  | { type: 'boolean'; value: boolean };

export type CriteriaInput = Partial<Record<CriteriaKey, CriteriaValue>>;

export type TechniqueScale = number | string;

export interface TaskTypeConfig {
  label: string;
  activeCriteria: CriteriaKey[];
  defaultWeights: Partial<Record<CriteriaKey, number>>;
}

export interface TechniqueConfig {
  label: string;
  scale: TechniqueScale[];
  thresholds: number[];
  numericMapping?: Record<string, number>;
}

export interface EstimationResult {
  suggestedSP: TechniqueScale;
  rawScore: number;
  confidenceScore: number;
  confidenceLow: number;
  confidenceHigh: number;
  missingCriteria: string[];
  breakdown: Record<string, {
    rawValue: CriteriaValue;
    normalizedScore: number;
    contribution: number;
  }>;
}
