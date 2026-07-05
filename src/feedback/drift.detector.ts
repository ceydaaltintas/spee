import { prisma } from '../db/prisma.client.js';

export interface EstimationSummary {
  estimationId: string;
  sourceId: string;
  taskType: string;
  suggestedSP: number;
  approvedSP: number;
  sprintId: string | null;
}

export interface DriftAnalysis {
  overallMeanError: number;
  overallDirection: 'over' | 'under' | 'balanced';
  byTaskType: Record<string, {
    meanError: number;
    direction: 'over' | 'under' | 'balanced';
    sampleCount: number;
  }>;
  shouldCalibrate: boolean;
  estimations: EstimationSummary[];
}

// Karşılaştırma: motorun önerisi (suggestedSP) vs takımın kararı (approvedSP)
// suggestedSP > approvedSP → motor fazla tahmin etti (over)
// suggestedSP < approvedSP → motor az tahmin etti (under)
export async function detectDrift(teamId: string, sprintIds: string[]): Promise<DriftAnalysis> {
  const hasSprintFilter = sprintIds.length > 0 && !sprintIds.includes('all');
  const estimations = await prisma.estimationResult.findMany({
    where: {
      teamId,
      approvedSP: { not: null },
      ...(hasSprintFilter ? { sprintId: { in: sprintIds } } : {}),
    },
    include: { workItem: true },
  });

  if (estimations.length === 0) {
    return {
      overallMeanError: 0,
      overallDirection: 'balanced',
      byTaskType: {},
      shouldCalibrate: false,
      estimations: [],
    };
  }

  // Aynı iş kalemi için sadece en güncel onaylı tahmini kullan
  const latestBySourceId = new Map<string, typeof estimations[0]>();
  for (const est of estimations) {
    const key = est.workItem.sourceId;
    const existing = latestBySourceId.get(key);
    if (!existing || est.createdAt > existing.createdAt) {
      latestBySourceId.set(key, est);
    }
  }
  const deduped = Array.from(latestBySourceId.values());

  const byTaskType: Record<string, { errors: number[]; directions: number[] }> = {};
  const allErrors: number[] = [];
  const allDirections: number[] = [];

  for (const est of deduped) {
    const suggested = est.suggestedSP;
    const approved = est.approvedSP!;

    const error = Math.abs(suggested - approved) / Math.max(approved, 1);
    const direction = suggested - approved; // pozitif = fazla tahmin, negatif = az tahmin

    allErrors.push(error);
    allDirections.push(direction);

    const tt = est.taskType as string;
    if (!byTaskType[tt]) byTaskType[tt] = { errors: [], directions: [] };
    byTaskType[tt].errors.push(error);
    byTaskType[tt].directions.push(direction);
  }

  const overallMeanError = mean(allErrors);
  const overallDirection = classifyDirection(allDirections);

  const byTaskTypeResult: DriftAnalysis['byTaskType'] = {};
  for (const [tt, data] of Object.entries(byTaskType)) {
    byTaskTypeResult[tt] = {
      meanError: mean(data.errors),
      direction: classifyDirection(data.directions),
      sampleCount: data.errors.length,
    };
  }

  const maxItemError = Math.max(...allErrors);
  const shouldCalibrate = overallMeanError > 0.15 ||
    Object.values(byTaskTypeResult).some(t => t.meanError > 0.20) ||
    maxItemError > 0.35;

  return {
    overallMeanError,
    overallDirection,
    byTaskType: byTaskTypeResult,
    shouldCalibrate,
    estimations: deduped.map(e => ({
      estimationId: e.id,
      sourceId: e.workItem.sourceId,
      taskType: e.taskType as string,
      suggestedSP: e.suggestedSP,
      approvedSP: e.approvedSP!,
      sprintId: e.sprintId,
    })),
  };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function classifyDirection(directions: number[]): 'over' | 'under' | 'balanced' {
  if (directions.length === 0) return 'balanced';
  const avg = mean(directions);
  if (avg > 0.5) return 'over';
  if (avg < -0.5) return 'under';
  return 'balanced';
}
