import type { FastifyInstance } from 'fastify';
import { recordOutcomes, type OutcomeInput } from '../../feedback/feedback.service.js';
import { detectDrift } from '../../feedback/drift.detector.js';
import { generateCalibrationSuggestion } from '../../feedback/calibrator.js';

interface FeedbackBody {
  teamId: string;
  sprintId: string;
  outcomes: OutcomeInput[];
}

interface CalibrateBody {
  teamId: string;
  sprintIds: string[];
}

export async function calibrateRoutes(app: FastifyInstance) {
  app.post<{ Body: FeedbackBody }>('/feedback/outcomes', async (request, reply) => {
    const { teamId, sprintId, outcomes } = request.body;

    if (!outcomes || outcomes.length === 0) {
      return reply.status(400).send({ error: 'Outcomes array is required' });
    }

    const results = await recordOutcomes(teamId, sprintId, outcomes);

    return reply.status(200).send({
      recorded: results.length,
      sprintId,
    });
  });

  app.post<{ Body: CalibrateBody }>('/calibrate', async (request, reply) => {
    const { teamId, sprintIds } = request.body;

    if (!sprintIds || sprintIds.length === 0) {
      return reply.status(400).send({ error: 'sprintIds array is required' });
    }

    const driftAnalysis = await detectDrift(teamId, sprintIds);
    const suggestion = await generateCalibrationSuggestion(teamId, driftAnalysis);

    return reply.status(200).send(suggestion);
  });
}
