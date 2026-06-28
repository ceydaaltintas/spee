import { prisma } from '../db/prisma.client.js';
import type { TaskType } from '@prisma/client';

export interface DriftAnalysis {
  overallMeanError: number;
  overallDirection: 'over' | 'under' | 'balanced';
  byTaskType: Record<string, {
    meanError: number;
    direction: 'over' | 'under' | 'balanced';
    sampleCount: number;
  }>;
  shouldCalibrate: boolean;
}

export async function detectDrift(teamId: string, sprintIds: string[]): Promise<DriftAnalysis> {
  const outcomes = await prisma.actualOutcome.findMany({
    where: {
      teamId,
      sprintId: { in: sprintIds },
    },
    include: {
      estimation: true,
    },
  });

  if (outcomes.length === 0) {
    return {
      overallMeanError: 0,
      overallDirection: 'balanced',
      byTaskType: {},
      shouldCalibrate: false,
    };
  }

  const byTaskType: Record<string, { errors: number[]; directions: number[] }> = {};
  const allErrors: number[] = [];
  const allDirections: number[] = [];

  for (const outcome of outcomes) {
    const estimated = outcome.estimation.approvedSP ?? outcome.estimation.suggestedSP;
    const planned = outcome.plannedSP;

    const error = Math.abs(estimated - planned) / Math.max(planned, 1);
    const direction = estimated - planned;

    allErrors.push(error);
    allDirections.push(direction);

    const tt = outcome.estimation.taskType;
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

  const shouldCalibrate = overallMeanError > 0.3 ||
    Object.values(byTaskTypeResult).some(t => t.meanError > 0.4);

  return {
    overallMeanError,
    overallDirection,
    byTaskType: byTaskTypeResult,
    shouldCalibrate,
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
