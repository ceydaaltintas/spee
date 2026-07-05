import type { FastifyInstance } from 'fastify';
import { prisma } from '../../db/prisma.client.js';

interface BaselineParams { teamId: string; }
interface BaselineIdParams { teamId: string; baselineId: string; }

interface BaselineBody {
  taskType?: string | null;
  title: string;
  description?: string;
  storyPoints: number;
  compDevelopment?: number;
  compAnalysis?: number;
  compTesting?: number;
  compDesign?: number;
  compDevops?: number;
  criteriaSnapshot?: Record<string, any>;
}

export async function baselineRoutes(app: FastifyInstance) {
  // Tüm baz işleri listele
  app.get<{ Params: BaselineParams }>('/teams/:teamId/baselines', async (request, reply) => {
    const { teamId } = request.params;
    const baselines = await prisma.baselineStory.findMany({
      where: { teamId, isActive: true },
      orderBy: [{ taskType: 'asc' }, { createdAt: 'desc' }],
    });
    return reply.status(200).send(baselines);
  });

  // Yeni baz iş oluştur
  app.post<{ Params: BaselineParams; Body: BaselineBody }>('/teams/:teamId/baselines', async (request, reply) => {
    const { teamId } = request.params;
    const { taskType, title, description, storyPoints, criteriaSnapshot, ...comp } = request.body;

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return reply.status(404).send({ error: 'Takım bulunamadı' });

    const baseline = await prisma.baselineStory.create({
      data: {
        teamId,
        taskType: taskType as any ?? null,
        title,
        description,
        storyPoints,
        compDevelopment: comp.compDevelopment ?? null,
        compAnalysis: comp.compAnalysis ?? null,
        compTesting: comp.compTesting ?? null,
        compDesign: comp.compDesign ?? null,
        compDevops: comp.compDevops ?? null,
        criteriaSnapshot: criteriaSnapshot ?? undefined,
      },
    });
    return reply.status(201).send(baseline);
  });

  // Baz iş güncelle
  app.put<{ Params: BaselineIdParams; Body: Partial<BaselineBody> }>('/teams/:teamId/baselines/:baselineId', async (request, reply) => {
    const { teamId, baselineId } = request.params;
    const body = request.body;

    const existing = await prisma.baselineStory.findUnique({ where: { id: baselineId } });
    if (!existing || existing.teamId !== teamId) {
      return reply.status(404).send({ error: 'Baz iş bulunamadı' });
    }

    const updated = await prisma.baselineStory.update({
      where: { id: baselineId },
      data: {
        taskType: body.taskType !== undefined ? (body.taskType as any) : undefined,
        title: body.title,
        description: body.description,
        storyPoints: body.storyPoints,
        compDevelopment: body.compDevelopment,
        compAnalysis: body.compAnalysis,
        compTesting: body.compTesting,
        compDesign: body.compDesign,
        compDevops: body.compDevops,
        criteriaSnapshot: body.criteriaSnapshot as any,
      },
    });
    return reply.status(200).send(updated);
  });

  // Baz işi sil (soft delete)
  app.delete<{ Params: BaselineIdParams }>('/teams/:teamId/baselines/:baselineId', async (request, reply) => {
    const { teamId, baselineId } = request.params;
    const existing = await prisma.baselineStory.findUnique({ where: { id: baselineId } });
    if (!existing || existing.teamId !== teamId) {
      return reply.status(404).send({ error: 'Baz iş bulunamadı' });
    }
    await prisma.baselineStory.update({ where: { id: baselineId }, data: { isActive: false } });
    return reply.status(200).send({ deleted: baselineId });
  });
}
