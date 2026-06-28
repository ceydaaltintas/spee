import type { FastifyInstance } from 'fastify';
import { prisma } from '../../db/prisma.client.js';
import { TASK_TYPE_REGISTRY, type CriteriaKey } from '../../task-types/task-type.registry.js';
import { updateTeamConfigSchema } from '../schemas/team.schema.js';

interface TeamParams {
  teamId: string;
}

interface UpdateConfigBody {
  activeTechnique?: string;
  weights?: Record<string, Record<string, number>>;
}

export async function teamRoutes(app: FastifyInstance) {
  app.get<{ Params: TeamParams }>('/teams/:teamId/config', async (request, reply) => {
    const { teamId } = request.params;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { weights: true, config: true },
    });
    if (!team) {
      return reply.status(404).send({ error: 'Team not found' });
    }

    const weightsByTaskType: Record<string, Record<string, number>> = {};
    for (const w of team.weights) {
      if (!weightsByTaskType[w.taskType]) weightsByTaskType[w.taskType] = {};
      weightsByTaskType[w.taskType][w.criteriaKey] = w.weight;
    }

    return reply.status(200).send({
      teamId: team.id,
      name: team.name,
      sourceSystem: team.sourceSystem,
      activeTechnique: team.activeTechnique,
      velocityAvg: team.velocityAvg,
      weights: weightsByTaskType,
      customThresholds: team.config?.customThresholds ?? null,
    });
  });

  app.put<{ Params: TeamParams; Body: UpdateConfigBody }>('/teams/:teamId/config', {
    schema: { body: updateTeamConfigSchema },
  }, async (request, reply) => {
    const { teamId } = request.params;
    const { activeTechnique, weights } = request.body;

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return reply.status(404).send({ error: 'Team not found' });
    }

    if (activeTechnique) {
      await prisma.team.update({
        where: { id: teamId },
        data: { activeTechnique: activeTechnique as any },
      });
    }

    if (weights) {
      for (const [taskType, criteriaWeights] of Object.entries(weights)) {
        const sum = Object.values(criteriaWeights).reduce((a, b) => a + b, 0);
        if (Math.abs(sum - 1.0) > 0.01) {
          return reply.status(400).send({
            error: `Weights for ${taskType} must sum to 1.0, got ${sum.toFixed(4)}`,
          });
        }

        for (const [criteriaKey, weight] of Object.entries(criteriaWeights)) {
          await prisma.teamWeight.upsert({
            where: {
              teamId_taskType_criteriaKey: {
                teamId,
                taskType: taskType as any,
                criteriaKey,
              },
            },
            update: { weight },
            create: {
              teamId,
              taskType: taskType as any,
              criteriaKey,
              weight,
            },
          });
        }
      }
    }

    return reply.status(200).send({ success: true });
  });
}
