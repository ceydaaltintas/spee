import type { FastifyInstance } from 'fastify';
import { prisma } from '../../db/prisma.client.js';
import { TASK_TYPE_REGISTRY, type CriteriaKey } from '../../task-types/task-type.registry.js';
import { runRuleEngine } from '../../engines/rule-based/rule.engine.js';
import { calculateConfidence } from '../../engines/rule-based/confidence.js';
import type { CriteriaInput, CriteriaValue } from '../../engines/rule-based/criteria.types.js';
import { calculateConfidenceInterval } from '../../engines/rule-based/confidence.js';
import { estimateBodySchema, approveBodySchema } from '../schemas/estimate.schema.js';

interface EstimateBody {
  sourceSystem: 'JIRA' | 'ADO';
  sourceId: string;
  teamId: string;
  taskType?: string;
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
    const { sourceSystem, sourceId, teamId, taskType: requestedTaskType, manualCriteria } = request.body;

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

    const confidenceInterval = typeof result.suggestedSP === 'number'
      ? calculateConfidenceInterval(result.suggestedSP, confidence, technique)
      : null;

    const estimation = await prisma.estimationResult.create({
      data: {
        workItemCacheId: workItem.id,
        teamId,
        taskType: taskType as any,
        technique,
        ruleBasedScore: result.rawScore,
        ruleBasedSP: suggestedSP,
        suggestedSP,
        confidenceScore: confidence,
        confidenceLow: confidenceInterval?.low,
        confidenceHigh: confidenceInterval?.high,
        criteriaSnapshot: result.breakdown as any,
      },
    });

    return reply.status(200).send({
      estimationId: estimation.id,
      suggestedSP: result.suggestedSP,
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
