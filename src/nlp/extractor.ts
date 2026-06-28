import type { TaskType } from '@prisma/client';

export interface ExtractedSignals {
  acCount: number;
  hasLegacy: boolean;
  hasSecurity: boolean;
  hasPerformance: boolean;
  hasRealtime: boolean;
  hasMigration: boolean;
  detectedTaskType: TaskType | null;
}

const AC_PATTERNS = [
  /acceptance\s*criteria\s*[:：]/i,
  /given\s+.+\s+when\s+.+\s+then\s+/gi,
  /^\s*\d+[\.\)]\s+/gm,
  /\bac\s*[:：]/i,
];

const TASK_TYPE_KEYWORDS: [RegExp, TaskType][] = [
  [/\b(bug|hata|fix|defect|\[bug\])\b/i, 'BUG'],
  [/\b(test|qa|doğrula|senaryoları?\s*yaz)\b/i, 'TEST_TASK'],
  [/\b(analiz|araştır|incele|değerlendir)\b/i, 'ANALYSIS'],
  [/\b(tasarım|ux|ui|mockup|wireframe|design)\b/i, 'DESIGN'],
  [/\b(deploy|pipeline|altyapı|infra|devops|ci\/cd)\b/i, 'DEVOPS'],
  [/\b(spike|poc|araştırma|proof\s*of\s*concept)\b/i, 'SPIKE'],
];

const SIGNAL_PATTERNS: [RegExp, keyof Pick<ExtractedSignals, 'hasLegacy' | 'hasSecurity' | 'hasPerformance' | 'hasRealtime' | 'hasMigration'>][] = [
  [/\b(legacy|eski|mevcut\s*sistem|deprecated)\b/i, 'hasLegacy'],
  [/\b(auth|permission|güvenlik|encryption|security|oauth|jwt|token)\b/i, 'hasSecurity'],
  [/\b(performans|gecikme|latency|cache|throughput|optimization)\b/i, 'hasPerformance'],
  [/\b(gerçek\s*zamanlı|realtime|real-time|websocket|sse|push)\b/i, 'hasRealtime'],
  [/\b(migration|taşıma|geçiş|migrate)\b/i, 'hasMigration'],
];

export function extractSignals(title: string, description?: string | null): ExtractedSignals {
  const text = `${title} ${description ?? ''}`;

  const acCount = countAcceptanceCriteria(description ?? '');

  const signals: ExtractedSignals = {
    acCount,
    hasLegacy: false,
    hasSecurity: false,
    hasPerformance: false,
    hasRealtime: false,
    hasMigration: false,
    detectedTaskType: null,
  };

  for (const [pattern, key] of SIGNAL_PATTERNS) {
    if (pattern.test(text)) {
      signals[key] = true;
    }
  }

  for (const [pattern, taskType] of TASK_TYPE_KEYWORDS) {
    if (pattern.test(title)) {
      signals.detectedTaskType = taskType;
      break;
    }
  }

  return signals;
}

function countAcceptanceCriteria(description: string): number {
  if (!description) return 0;

  const acSectionMatch = description.match(/acceptance\s*criteria\s*[:：]\s*([\s\S]*?)(?:\n\n|\n(?=[A-Z])|$)/i);
  if (acSectionMatch) {
    const section = acSectionMatch[1]!;
    const bullets = section.match(/^\s*[-*•]\s+.+/gm);
    if (bullets) return bullets.length;
    const numbered = section.match(/^\s*\d+[\.\)]\s+.+/gm);
    if (numbered) return numbered.length;
  }

  const bddMatches = description.match(/\bgiven\b/gi);
  if (bddMatches && bddMatches.length > 0) return bddMatches.length;

  const acPrefix = description.match(/\bac\s*[:：]\s*/i);
  if (acPrefix) {
    const afterAc = description.slice(acPrefix.index! + acPrefix[0].length);
    const lines = afterAc.match(/^\s*[-*•\d]\s*.+/gm);
    if (lines) return lines.length;
  }

  return 0;
}
