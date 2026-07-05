import type { FastifyInstance } from 'fastify';
import { prisma } from '../../db/prisma.client.js';

interface HistoryParams {
  teamId: string;
}

interface HistoryQuery {
  taskType?: string;
  technique?: string;
  sprintId?: string;
  from?: string;
  to?: string;
  limit?: string;
  offset?: string;
}

interface DeleteParams {
  teamId: string;
  estimationId: string;
}

interface ApproveParams {
  teamId: string;
  estimationId: string;
}

interface ApproveBody {
  approvedSP: number;
}

export async function historyRoutes(app: FastifyInstance) {
  app.get<{ Params: HistoryParams; Querystring: HistoryQuery }>('/history/:teamId', async (request, reply) => {
    const { teamId } = request.params;
    const { taskType, technique, sprintId, from, to, limit: limitStr, offset: offsetStr } = request.query;

    const limit = Math.min(parseInt(limitStr ?? '20', 10) || 20, 100);
    const offset = Math.max(parseInt(offsetStr ?? '0', 10) || 0, 0);

    const where: any = { teamId };
    if (taskType) where.taskType = taskType;
    if (technique) where.technique = technique;
    if (sprintId) where.sprintId = sprintId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [total, estimations] = await Promise.all([
      prisma.estimationResult.count({ where }),
      prisma.estimationResult.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          workItem: { select: { sourceId: true, title: true, sourceSystem: true } },
          outcome: true,
        },
      }),
    ]);

    return reply.status(200).send({
      teamId,
      total,
      offset,
      limit,
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
        sprintId: e.sprintId,
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

  app.get<{ Params: HistoryParams }>('/history/:teamId/summary', async (request, reply) => {
    const { teamId } = request.params;

    const [total, approved, recent] = await Promise.all([
      prisma.estimationResult.count({ where: { teamId } }),
      prisma.estimationResult.count({ where: { teamId, approvedSP: { not: null } } }),
      prisma.estimationResult.findMany({
        where: { teamId, approvedSP: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { suggestedSP: true, approvedSP: true },
      }),
    ]);

    const pending = total - approved;
    let meanError: number | null = null;
    let direction: 'over' | 'under' | 'balanced' | null = null;
    if (recent.length > 0) {
      const errors = recent.map(e => (e.suggestedSP - e.approvedSP!) / Math.max(e.approvedSP!, 1));
      meanError = errors.reduce((a, b) => a + Math.abs(b), 0) / errors.length;
      const avgDir = errors.reduce((a, b) => a + b, 0) / errors.length;
      direction = Math.abs(avgDir) < 0.1 ? 'balanced' : avgDir > 0 ? 'over' : 'under';
    }

    return reply.status(200).send({ total, approved, pending, meanError, direction });
  });

  app.patch<{ Params: ApproveParams; Body: ApproveBody }>('/history/:teamId/:estimationId/approve', async (request, reply) => {
    const { teamId, estimationId } = request.params;
    const { approvedSP } = request.body;

    if (!approvedSP || approvedSP < 0) {
      return reply.status(400).send({ error: 'Geçerli bir SP değeri girin' });
    }

    const estimation = await prisma.estimationResult.findUnique({ where: { id: estimationId } });
    if (!estimation || estimation.teamId !== teamId) {
      return reply.status(404).send({ error: 'Tahmin bulunamadı' });
    }

    await prisma.estimationResult.update({
      where: { id: estimationId },
      data: { approvedSP },
    });

    return reply.status(200).send({ estimationId, approvedSP });
  });

  app.delete<{ Params: DeleteParams }>('/history/:teamId/:estimationId', async (request, reply) => {
    const { teamId, estimationId } = request.params;

    const estimation = await prisma.estimationResult.findUnique({
      where: { id: estimationId },
    });
    if (!estimation || estimation.teamId !== teamId) {
      return reply.status(404).send({ error: 'Tahmin bulunamadı' });
    }

    await prisma.actualOutcome.deleteMany({ where: { estimationResultId: estimationId } });
    await prisma.estimationResult.delete({ where: { id: estimationId } });

    return reply.status(200).send({ deleted: estimationId });
  });
}
