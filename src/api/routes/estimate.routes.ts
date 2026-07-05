import type { FastifyInstance } from 'fastify';
import { prisma } from '../../db/prisma.client.js';
import { TASK_TYPE_REGISTRY, type CriteriaKey } from '../../task-types/task-type.registry.js';
import { runRuleEngine } from '../../engines/rule-based/rule.engine.js';
import { calculateConfidence } from '../../engines/rule-based/confidence.js';
import type { CriteriaInput, CriteriaValue } from '../../engines/rule-based/criteria.types.js';
import { calculateConfidenceInterval } from '../../engines/rule-based/confidence.js';
import { estimateBodySchema, approveBodySchema } from '../schemas/estimate.schema.js';
import { runCriteriaCbr } from '../../engines/cbr/cbr.criteria.js';
import { TECHNIQUE_REGISTRY } from '../../techniques/technique.registry.js';

interface EstimateBody {
  sourceSystem: 'JIRA' | 'ADO';
  sourceId: string;
  teamId: string;
  taskType?: string;
  sprintId?: string;
  manualCriteria?: Record<string, CriteriaValue>;
}

interface ApproveBody {
  estimationId: string;
  approvedSP: number;
  approvedBy?: string;
}

export async function estimateRoutes(app: FastifyInstance) {
  app.post<{ Body: EstimateBody }>('/estimate', {
    schema: { body: estimateBodySchema },
  }, async (request, reply) => {
    const { sourceSystem, sourceId, teamId, taskType: requestedTaskType, sprintId, manualCriteria } = request.body;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { weights: true },
    });
    if (!team) {
      return reply.status(404).send({ error: 'Team not found' });
    }

    const taskType = requestedTaskType ?? 'USER_STORY';
    const taskConfig = TASK_TYPE_REGISTRY[taskType];
    if (!taskConfig) {
      return reply.status(400).send({ error: `Unknown task type: ${taskType}` });
    }

    const teamWeights: Partial<Record<CriteriaKey, number>> = {};
    const relevantWeights = team.weights.filter(w => w.taskType === taskType);
    if (relevantWeights.length > 0) {
      for (const w of relevantWeights) {
        teamWeights[w.criteriaKey as CriteriaKey] = w.weight;
      }
    } else {
      Object.assign(teamWeights, taskConfig.defaultWeights);
    }

    const criteriaInput: CriteriaInput = (manualCriteria ?? {}) as CriteriaInput;

    const BOOLEAN_CRITERIA: CriteriaKey[] = [
      'hasSecurityConstraint', 'hasPerformanceConstraint',
      'requiresDowntime', 'userResearchNeeded', 'hasSimilarHistory',
    ];
    const filledKeys = Object.keys(criteriaInput);
    const missingCriteria = taskConfig.activeCriteria.filter(
      c => !filledKeys.includes(c) && !BOOLEAN_CRITERIA.includes(c),
    );
    const autoFilledCriteria: CriteriaKey[] = [];

    const technique = team.activeTechnique;
    const result = runRuleEngine(criteriaInput, teamWeights, technique);

    const suggestedSP = typeof result.suggestedSP === 'number'
      ? result.suggestedSP
      : parseInt(result.suggestedSP, 10) || 0;

    const confidence = calculateConfidence({
      filledCriteriaCount: filledKeys.length,
      totalCriteriaCount: taskConfig.activeCriteria.length,
      scopeClarity: (criteriaInput.scopeClarity as { type: 'scale5'; value: number } | undefined)?.value,
      hasVelocityData: team.velocityAvg !== null,
      hasSimilarHistory: false,
    });

    let workItem = await prisma.workItemCache.findUnique({
      where: { sourceSystem_sourceId_teamId: { sourceSystem, sourceId, teamId } },
    });
    if (!workItem) {
      workItem = await prisma.workItemCache.create({
        data: {
          sourceSystem,
          sourceId,
          teamId,
          title: sourceId,
          rawPayload: {},
        },
      });
    }

    // Kriter tabanlı CBR — geçmiş onaylı tahminlerle benzerlik karşılaştırması
    const currentCriteriaForCbr = Object.fromEntries(
      Object.entries(result.breakdown).map(([k, v]) => [k, v.rawValue]),
    );
    const cbrResult = await runCriteriaCbr(currentCriteriaForCbr, teamId, taskType, technique);

    // Blend: similarity 0.5→0, 1.0→1 arası doğrusal ağırlık
    let finalSP = suggestedSP;
    if (cbrResult) {
      const cbrWeight = Math.max(0, Math.min(1, (cbrResult.similarity - 0.5) / 0.5));
      const blended = cbrWeight * cbrResult.sp + (1 - cbrWeight) * suggestedSP;
      const config = TECHNIQUE_REGISTRY[technique];
      const scale = (config?.scale ?? [1, 2, 3, 5, 8, 13, 21, 34, 55])
        .map(s => typeof s === 'number' ? s : parseInt(s as string, 10))
        .filter(n => !isNaN(n) && n > 0);
      finalSP = scale.reduce((closest, n) =>
        Math.abs(n - blended) < Math.abs(closest - blended) ? n : closest
      , scale[0]!);
    }

    const confidenceInterval = calculateConfidenceInterval(finalSP, confidence, technique);

    const estimation = await prisma.estimationResult.create({
      data: {
        workItemCacheId: workItem.id,
        teamId,
        taskType: taskType as any,
        technique,
        ruleBasedScore: result.rawScore,
        ruleBasedSP: suggestedSP,
        cbrSP: cbrResult?.sp ?? null,
        cbrSimilarity: cbrResult?.similarity ?? null,
        suggestedSP: finalSP,
        confidenceScore: confidence,
        confidenceLow: confidenceInterval?.low,
        confidenceHigh: confidenceInterval?.high,
        criteriaSnapshot: result.breakdown as any,
        sprintId: sprintId ?? null,
      },
    });

    return reply.status(200).send({
      estimationId: estimation.id,
      suggestedSP: finalSP,
      technique,
      confidenceScore: confidence,
      confidenceLow: confidenceInterval?.low ?? null,
      confidenceHigh: confidenceInterval?.high ?? null,
      taskType,
      missingCriteria,
      autoFilledCriteria,
      breakdown: result.breakdown,
      engines: {
        ruleBased: { rawScore: result.rawScore, sp: suggestedSP },
        ...(cbrResult ? { cbr: { sp: cbrResult.sp, similarity: cbrResult.similarity, matchCount: cbrResult.matchCount } } : {}),
      },
    });
  });

  app.post<{ Body: ApproveBody }>('/estimate/approve', {
    schema: { body: approveBodySchema },
  }, async (request, reply) => {
    const { estimationId, approvedSP, approvedBy } = request.body;

    const estimation = await prisma.estimationResult.findUnique({
      where: { id: estimationId },
    });
    if (!estimation) {
      return reply.status(404).send({ error: 'Estimation not found' });
    }

    const updated = await prisma.estimationResult.update({
      where: { id: estimationId },
      data: {
        approvedSP,
        approvedBy,
        approvedAt: new Date(),
      },
    });

    // Onay verildiğinde ActualOutcome otomatik oluştur (kalibrasyon için)
    const outcomeSprintId = estimation.sprintId ?? `sprint-auto-${new Date().toISOString().slice(0, 7)}`;
    await prisma.actualOutcome.upsert({
      where: { estimationResultId: estimationId },
      update: { plannedSP: approvedSP, sprintId: outcomeSprintId },
      create: {
        id: `ao-${estimationId}`,
        estimationResultId: estimationId,
        teamId: estimation.teamId,
        sprintId: outcomeSprintId,
        plannedSP: approvedSP,
        completedInSprint: true,
        reopenCount: 0,
        spilloverCount: 0,
      },
    });

    return reply.status(200).send({
      estimationId: updated.id,
      approvedSP: updated.approvedSP,
      approvedAt: updated.approvedAt,
    });
  });

  app.post<{ Body: { teamId: string; items: { sourceSystem: string; sourceId: string; taskType?: string }[] } }>('/estimate/bulk', async (request, reply) => {
    const { teamId, items } = request.body;
    if (!items || items.length === 0) {
      return reply.status(400).send({ error: 'Items array is required' });
    }
    if (items.length > 50) {
      return reply.status(400).send({ error: 'Maximum 50 items per bulk request' });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { weights: true },
    });
    if (!team) {
      return reply.status(404).send({ error: 'Team not found' });
    }

    const results = [];
    for (const item of items) {
      const taskType = item.taskType ?? 'USER_STORY';
      const taskConfig = TASK_TYPE_REGISTRY[taskType];
      if (!taskConfig) continue;

      const teamWeights: Partial<Record<CriteriaKey, number>> = {};
      const relevantWeights = team.weights.filter(w => w.taskType === taskType);
      if (relevantWeights.length > 0) {
        for (const w of relevantWeights) {
          teamWeights[w.criteriaKey as CriteriaKey] = w.weight;
        }
      } else {
        Object.assign(teamWeights, taskConfig.defaultWeights);
      }

      const engineResult = runRuleEngine({}, teamWeights, team.activeTechnique);
      const confidence = calculateConfidence({
        filledCriteriaCount: 0,
        totalCriteriaCount: taskConfig.activeCriteria.length,
        hasVelocityData: team.velocityAvg !== null,
        hasSimilarHistory: false,
      });

      results.push({
        sourceId: item.sourceId,
        taskType,
        suggestedSP: engineResult.suggestedSP,
        confidenceScore: confidence,
      });
    }

    return reply.status(200).send({ results });
  });
}
