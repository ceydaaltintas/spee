import type { CriteriaInput } from './types';

export interface Template {
  nameKey: string;
  descKey: string;
  taskType: string;
  criteria: CriteriaInput;
}

export const TEMPLATES: Template[] = [
  {
    nameKey: 'tmpl_simple_api_name',
    descKey: 'tmpl_simple_api_desc',
    taskType: 'USER_STORY',
    criteria: {
      technicalComplexity: { type: 'scale5', value: 2 },
      scopeClarity: { type: 'scale5', value: 2 },
      dependencyCount: { type: 'count', value: 1 },
      integrationPoints: { type: 'count', value: 1 },
      techDebtRisk: { type: 'scale5', value: 1 },
      testLoad: { type: 'scale5', value: 2 },
      affectedModuleCount: { type: 'count', value: 1 },
      domainKnowledge: { type: 'scale5', value: 4 },
      teamMemberCount: { type: 'count', value: 1 },
    },
  },
  {
    nameKey: 'tmpl_full_crud_name',
    descKey: 'tmpl_full_crud_desc',
    taskType: 'USER_STORY',
    criteria: {
      technicalComplexity: { type: 'scale5', value: 3 },
      scopeClarity: { type: 'scale5', value: 2 },
      dependencyCount: { type: 'count', value: 3 },
      integrationPoints: { type: 'count', value: 2 },
      techDebtRisk: { type: 'scale5', value: 2 },
      testLoad: { type: 'scale5', value: 3 },
      affectedModuleCount: { type: 'count', value: 3 },
      domainKnowledge: { type: 'scale5', value: 3 },
      teamMemberCount: { type: 'count', value: 2 },
    },
  },
  {
    nameKey: 'tmpl_big_refactor_name',
    descKey: 'tmpl_big_refactor_desc',
    taskType: 'USER_STORY',
    criteria: {
      technicalComplexity: { type: 'scale5', value: 5 },
      scopeClarity: { type: 'scale5', value: 4 },
      dependencyCount: { type: 'count', value: 8 },
      integrationPoints: { type: 'count', value: 5 },
      techDebtRisk: { type: 'scale5', value: 5 },
      testLoad: { type: 'scale5', value: 5 },
      affectedModuleCount: { type: 'count', value: 10 },
      domainKnowledge: { type: 'scale5', value: 2 },
      teamMemberCount: { type: 'count', value: 3 },
      hasSecurityConstraint: { type: 'boolean', value: true },
    },
  },
  {
    nameKey: 'tmpl_simple_bug_name',
    descKey: 'tmpl_simple_bug_desc',
    taskType: 'BUG',
    criteria: {
      reproductionDifficulty: { type: 'scale5', value: 1 },
      rootCauseClarity: { type: 'scale5', value: 5 },
      fixImpactScope: { type: 'scale5', value: 1 },
      regressionRisk: { type: 'scale5', value: 1 },
      techDebtRisk: { type: 'scale5', value: 1 },
      domainKnowledge: { type: 'scale5', value: 4 },
      teamMemberCount: { type: 'count', value: 1 },
    },
  },
  {
    nameKey: 'tmpl_complex_bug_name',
    descKey: 'tmpl_complex_bug_desc',
    taskType: 'BUG',
    criteria: {
      reproductionDifficulty: { type: 'scale5', value: 4 },
      rootCauseClarity: { type: 'scale5', value: 2 },
      fixImpactScope: { type: 'scale5', value: 4 },
      regressionRisk: { type: 'scale5', value: 4 },
      techDebtRisk: { type: 'scale5', value: 3 },
      domainKnowledge: { type: 'scale5', value: 2 },
      teamMemberCount: { type: 'count', value: 2 },
    },
  },
  {
    nameKey: 'tmpl_user_research_name',
    descKey: 'tmpl_user_research_desc',
    taskType: 'ANALYSIS',
    criteria: {
      ambiguityLevel: { type: 'scale5', value: 4 },
      scopeClarity: { type: 'scale5', value: 3 },
      domainKnowledge: { type: 'scale5', value: 2 },
      stakeholderCount: { type: 'count', value: 5 },
      dataAccessDifficulty: { type: 'scale5', value: 3 },
      outputFormality: { type: 'scale5', value: 4 },
      teamMemberCount: { type: 'count', value: 2 },
    },
  },
  {
    nameKey: 'tmpl_infra_migration_name',
    descKey: 'tmpl_infra_migration_desc',
    taskType: 'DEVOPS',
    criteria: {
      productionRisk: { type: 'scale5', value: 4 },
      rollbackComplexity: { type: 'scale5', value: 4 },
      envComplexity: { type: 'scale5', value: 4 },
      crossTeamCoordination: { type: 'scale5', value: 3 },
      techDebtRisk: { type: 'scale5', value: 2 },
      dependencyCount: { type: 'count', value: 4 },
      requiresDowntime: { type: 'boolean', value: true },
      teamMemberCount: { type: 'count', value: 3 },
    },
  },
];
