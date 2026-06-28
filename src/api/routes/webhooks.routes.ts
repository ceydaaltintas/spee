import type { FastifyInstance } from 'fastify';
import { prisma } from '../../db/prisma.client.js';
import { mapJiraIssueToWorkItem } from '../../connectors/jira/jira.mapper.js';
import { mapAdoWorkItemToWorkItem } from '../../connectors/ado/ado.mapper.js';
import { enrichWorkItem } from '../../nlp/enricher.js';
import type { JiraIssue } from '../../connectors/jira/jira.types.js';
import type { AdoWorkItem } from '../../connectors/ado/ado.types.js';

export async function webhookRoutes(app: FastifyInstance) {
  app.post<{ Body: { webhookEvent: string; issue: JiraIssue } }>('/webhooks/jira', async (request, reply) => {
    const { issue } = request.body;
    if (!issue) {
      return reply.status(400).send({ error: 'Missing issue in webhook payload' });
    }

    const raw = mapJiraIssueToWorkItem(issue);
    const enriched = enrichWorkItem(raw);

    await prisma.workItemCache.upsert({
      where: {
        sourceSystem_sourceId_teamId: {
          sourceSystem: 'JIRA',
          sourceId: raw.sourceId,
          teamId: 'default',
        },
      },
      update: {
        title: raw.title,
        description: raw.description,
        rawPayload: raw.rawPayload as any,
        acCount: enriched.signals.acCount,
        extractedSignals: enriched.signals as any,
      },
      create: {
        sourceSystem: 'JIRA',
        sourceId: raw.sourceId,
        teamId: 'default',
        title: raw.title,
        description: raw.description,
        rawPayload: raw.rawPayload as any,
        acCount: enriched.signals.acCount,
        extractedSignals: enriched.signals as any,
      },
    });

    return reply.status(200).send({ received: true, sourceId: raw.sourceId });
  });

  app.post<{ Body: { resource: AdoWorkItem } }>('/webhooks/ado', async (request, reply) => {
    const { resource } = request.body;
    if (!resource) {
      return reply.status(400).send({ error: 'Missing resource in webhook payload' });
    }

    const raw = mapAdoWorkItemToWorkItem(resource);
    const enriched = enrichWorkItem(raw);

    await prisma.workItemCache.upsert({
      where: {
        sourceSystem_sourceId_teamId: {
          sourceSystem: 'ADO',
          sourceId: raw.sourceId,
          teamId: 'default',
        },
      },
      update: {
        title: raw.title,
        description: raw.description,
        rawPayload: raw.rawPayload as any,
        acCount: enriched.signals.acCount,
        extractedSignals: enriched.signals as any,
      },
      create: {
        sourceSystem: 'ADO',
        sourceId: raw.sourceId,
        teamId: 'default',
        title: raw.title,
        description: raw.description,
        rawPayload: raw.rawPayload as any,
        acCount: enriched.signals.acCount,
        extractedSignals: enriched.signals as any,
      },
    });

    return reply.status(200).send({ received: true, sourceId: raw.sourceId });
  });
}
