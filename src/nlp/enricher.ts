import type { WorkItemRaw } from '../connectors/base.connector.js';
import { extractSignals, type ExtractedSignals } from './extractor.js';
import type { CriteriaInput } from '../engines/rule-based/criteria.types.js';
import type { CriteriaKey } from '../task-types/task-type.registry.js';

export interface EnrichedWorkItem {
  raw: WorkItemRaw;
  signals: ExtractedSignals;
  autoFilledCriteria: CriteriaKey[];
  autoCriteria: CriteriaInput;
}

export function enrichWorkItem(raw: WorkItemRaw): EnrichedWorkItem {
  const fullText = `${raw.title} ${raw.description ?? ''} ${raw.acceptanceCriteria ?? ''}`;
  const signals = extractSignals(raw.title, fullText);

  const autoCriteria: CriteriaInput = {};
  const autoFilledCriteria: CriteriaKey[] = [];

  if (raw.linkCount > 0) {
    autoCriteria.dependencyCount = { type: 'count', value: raw.linkCount };
    autoFilledCriteria.push('dependencyCount');
  }

  if (signals.hasSecurity) {
    autoCriteria.hasSecurityConstraint = { type: 'boolean', value: true };
    autoFilledCriteria.push('hasSecurityConstraint');
  }

  if (signals.hasPerformance) {
    autoCriteria.hasPerformanceConstraint = { type: 'boolean', value: true };
    autoFilledCriteria.push('hasPerformanceConstraint');
  }

  if (signals.acCount > 0) {
    autoCriteria.testCaseCount = { type: 'count', value: signals.acCount };
    autoFilledCriteria.push('testCaseCount');
  }

  return { raw, signals, autoFilledCriteria, autoCriteria };
}
