import type { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../../config/env.js';

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);
  if (token !== env.API_KEY) {
    return reply.status(401).send({ error: 'Invalid API key' });
  }
}
