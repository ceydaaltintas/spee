import type { FastifyInstance } from 'fastify';
import { prisma } from '../../db/prisma.client.js';

interface HistoryParams {
  teamId: string;
}

interface HistoryQuery {
  taskType?: string;
  technique?: string;
  from?: string;
  to?: string;
  limit?: string;
}

export async function historyRoutes(app: FastifyInstance) {
  app.get<{ Params: HistoryParams; Querystring: HistoryQuery }>('/history/:teamId', async (request, reply) => {
    const { teamId } = request.params;
    const { taskType, technique, from, to, limit: limitStr } = request.query;

    const limit = Math.min(parseInt(limitStr ?? '50', 10) || 50, 100);

    const where: any = { teamId };
    if (taskType) where.taskType = taskType;
    if (technique) where.technique = technique;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const estimations = await prisma.estimationResult.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        workItem: { select: { sourceId: true, title: true, sourceSystem: true } },
        outcome: true,
      },
    });

    return reply.status(200).send({
      teamId,
      count: estimations.length,
      estimations: estimations.map(e => ({
        estimationId: e.id,
        sourceId: e.workItem.sourceId,
        title: e.workItem.title,
        sourceSystem: e.workItem.sourceSystem,
        taskType: e.taskType,
        technique: e.technique,
        suggestedSP: e.suggestedSP,
        approvedSP: e.approvedSP,
        confidenceScore: e.confidenceScore,
        confidenceLow: e.confidenceLow,
        confidenceHigh: e.confidenceHigh,
        createdAt: e.createdAt,
        outcome: e.outcome ? {
          completedInSprint: e.outcome.completedInSprint,
          actualHours: e.outcome.actualHours,
          reopenCount: e.outcome.reopenCount,
          spilloverCount: e.outcome.spilloverCount,
        } : null,
      })),
    });
  });
}
