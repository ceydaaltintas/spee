import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export function errorHandler(error: FastifyError, _request: FastifyRequest, reply: FastifyReply) {
  const statusCode = error.statusCode ?? 500;
  reply.status(statusCode).send({
    error: error.message,
    statusCode,
  });
}
