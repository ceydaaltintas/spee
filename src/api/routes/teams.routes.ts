import type { FastifyInstance } from 'fastify';
import { prisma } from '../../db/prisma.client.js';
import { updateTeamConfigSchema } from '../schemas/team.schema.js';

interface CreateTeamBody {
  name: string;
  sourceSystem: 'JIRA' | 'ADO';
  activeTechnique?: 'FIBONACCI' | 'MODIFIED_FIBONACCI' | 'TSHIRT' | 'POWERS_OF_TWO' | 'LINEAR' | 'CUSTOM';
}

interface TeamParams {
  teamId: string;
}

interface JoinCodeParams {
  code: string;
}

interface UpdateConfigBody {
  activeTechnique?: string;
  sourceSystem?: string;
  weights?: Record<string, Record<string, number>>;
  weightSource?: string;
  activeCriteriaOverrides?: Record<string, string[]> | null;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

function generateJoinCode(): string {
  return Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
}

async function uniqueJoinCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateJoinCode();
    const existing = await prisma.team.findUnique({ where: { joinCode: code } });
    if (!existing) return code;
  }
  throw new Error('Could not generate unique join code');
}

export async function teamRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateTeamBody }>('/teams', async (request, reply) => {
    const { name, sourceSystem, activeTechnique = 'FIBONACCI' } = request.body;
    if (!name?.trim() || !sourceSystem) {
      return reply.status(400).send({ error: 'name ve sourceSystem zorunlu' });
    }
    const joinCode = await uniqueJoinCode();
    const team = await prisma.team.create({
      data: { name: name.trim(), sourceSystem, activeTechnique, joinCode },
    });
    return reply.status(201).send({
      id: team.id,
      joinCode: team.joinCode,
      name: team.name,
      sourceSystem: team.sourceSystem,
      activeTechnique: team.activeTechnique,
    });
  });

  // Resolve join code → team info (no sensitive data)
  app.get<{ Params: JoinCodeParams }>('/teams/join/:code', async (request, reply) => {
    const code = request.params.code.toUpperCase().trim();
    const team = await prisma.team.findUnique({ where: { joinCode: code } });
    if (!team) return reply.status(404).send({ error: 'Geçersiz giriş kodu' });
    return reply.status(200).send({
      id: team.id,
      joinCode: team.joinCode,
      name: team.name,
      sourceSystem: team.sourceSystem,
    });
  });

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
    const sourcesByTaskType: Record<string, Record<string, string>> = {};
    for (const w of team.weights) {
      if (!weightsByTaskType[w.taskType]) {
        weightsByTaskType[w.taskType] = {};
        sourcesByTaskType[w.taskType] = {};
      }
      weightsByTaskType[w.taskType][w.criteriaKey] = w.weight;
      sourcesByTaskType[w.taskType][w.criteriaKey] = w.source;
    }

    const customThresholds = (team.config?.customThresholds ?? {}) as Record<string, any>;
    const activeCriteriaOverrides = (customThresholds.activeCriteriaOverrides ?? null) as Record<string, string[]> | null;

    return reply.status(200).send({
      teamId: team.id,
      joinCode: team.joinCode,
      name: team.name,
      sourceSystem: team.sourceSystem,
      activeTechnique: team.activeTechnique,
      velocityAvg: team.velocityAvg,
      weights: weightsByTaskType,
      weightSources: sourcesByTaskType,
      activeCriteriaOverrides,
    });
  });

  app.put<{ Params: TeamParams; Body: UpdateConfigBody }>('/teams/:teamId/config', {
    schema: { body: updateTeamConfigSchema },
  }, async (request, reply) => {
    const { teamId } = request.params;
    const { activeTechnique, sourceSystem, weights, weightSource, activeCriteriaOverrides } = request.body;

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return reply.status(404).send({ error: 'Team not found' });
    }

    const teamUpdate: Record<string, any> = {};
    if (activeTechnique) teamUpdate.activeTechnique = activeTechnique;
    if (sourceSystem) teamUpdate.sourceSystem = sourceSystem;
    if (Object.keys(teamUpdate).length > 0) {
      await prisma.team.update({ where: { id: teamId }, data: teamUpdate });
    }

    if (weights) {
      const source = weightSource ?? 'manual';
      for (const [taskType, criteriaWeights] of Object.entries(weights)) {
        const nonZero = Object.values(criteriaWeights).filter(v => v > 0);
        const sum = nonZero.reduce((a, b) => a + b, 0);
        if (nonZero.length > 0 && Math.abs(sum - 1.0) > 0.02) {
          return reply.status(400).send({
            error: `${taskType} ağırlıkları toplamı 1.0 olmalı, şu an: ${sum.toFixed(4)}`,
          });
        }
        for (const [criteriaKey, weight] of Object.entries(criteriaWeights)) {
          await prisma.teamWeight.upsert({
            where: { teamId_taskType_criteriaKey: { teamId, taskType: taskType as any, criteriaKey } },
            update: { weight, source },
            create: { teamId, taskType: taskType as any, criteriaKey, weight, source },
          });
        }
      }
    }

    if (activeCriteriaOverrides !== undefined) {
      const existing = await prisma.teamConfig.findUnique({ where: { teamId } });
      const currentThresholds = (existing?.customThresholds ?? {}) as Record<string, any>;
      if (activeCriteriaOverrides === null) {
        delete currentThresholds.activeCriteriaOverrides;
      } else {
        currentThresholds.activeCriteriaOverrides = activeCriteriaOverrides;
      }
      await prisma.teamConfig.upsert({
        where: { teamId },
        update: { customThresholds: currentThresholds },
        create: { teamId, customThresholds: currentThresholds },
      });
    }

    return reply.status(200).send({ success: true });
  });
}
