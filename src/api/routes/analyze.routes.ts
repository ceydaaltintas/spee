import type { FastifyInstance } from 'fastify';
import { analyzeText } from '../../nlp/groq.analyzer.js';

interface AnalyzeBody {
  title: string;
  description?: string;
}

export async function analyzeRoutes(app: FastifyInstance) {
  app.post<{ Body: AnalyzeBody }>('/analyze-text', async (request, reply) => {
    const { title, description } = request.body;

    if (!title?.trim()) {
      return reply.status(400).send({ error: 'title zorunlu' });
    }

    const result = await analyzeText(title.trim(), description?.trim());
    return reply.status(200).send(result);
  });
}
