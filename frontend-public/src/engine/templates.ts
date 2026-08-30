import type { CriteriaInput } from './types';

export interface Template {
  name: string;
  description: string;
  taskType: string;
  criteria: CriteriaInput;
}

export const TEMPLATES: Template[] = [
  {
    name: 'Basit API Endpoint',
    description: 'Tek bir CRUD endpoint, az bağımlılık, bilinen alan',
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
    name: 'Tam CRUD Özelliği',
    description: 'Frontend + backend, form, tablo, validasyon, testler',
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
    name: 'Büyük Refaktör',
    description: 'Birden çok modülü etkileyen mimari değişiklik',
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
    name: 'Basit Hata Düzeltme',
    description: 'Nedeni belli, izole bir bug fix',
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
    name: 'Karmaşık Hata',
    description: 'Tekrarlaması zor, kök nedeni belirsiz, geniş etki',
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
    name: 'Kullanıcı Araştırması',
    description: 'Paydaş görüşmeleri, veri analizi, resmî rapor',
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
    name: 'Altyapı Geçişi',
    description: 'Ortam taşıma, downtime riski, koordinasyon gerekli',
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
