import { prisma } from '../db/prisma.client.js';

export interface OutcomeInput {
  estimationId: string;
  actualHours?: number;
  completedInSprint: boolean;
  reopenCount?: number;
}

export async function recordOutcomes(
  teamId: string,
  sprintId: string,
  outcomes: OutcomeInput[],
) {
  const results = [];

  for (const outcome of outcomes) {
    const estimation = await prisma.estimationResult.findUnique({
      where: { id: outcome.estimationId },
    });
    if (!estimation) continue;

    const record = await prisma.actualOutcome.upsert({
      where: { estimationResultId: outcome.estimationId },
      update: {
        actualHours: outcome.actualHours,
        completedInSprint: outcome.completedInSprint,
        reopenCount: outcome.reopenCount ?? 0,
      },
      create: {
        estimationResultId: outcome.estimationId,
        teamId,
        sprintId,
        plannedSP: estimation.approvedSP ?? estimation.suggestedSP,
        actualHours: outcome.actualHours,
        completedInSprint: outcome.completedInSprint,
        reopenCount: outcome.reopenCount ?? 0,
      },
    });
    results.push(record);
  }

  return results;
}
