import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { authMiddleware } from './api/middlewares/auth.middleware.js';
import { errorHandler } from './api/middlewares/error.middleware.js';
import { estimateRoutes } from './api/routes/estimate.routes.js';
import { teamRoutes } from './api/routes/teams.routes.js';
import { webhookRoutes } from './api/routes/webhooks.routes.js';
import { historyRoutes } from './api/routes/history.routes.js';
import { calibrateRoutes } from './api/routes/calibrate.routes.js';
import { baselineRoutes } from './api/routes/baseline.routes.js';

export function buildApp() {
  const app = Fastify({ logger: env.NODE_ENV !== 'test' });

  app.register(cors, {
    origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',') : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.setErrorHandler(errorHandler);
  app.addHook('onRequest', authMiddleware);

  app.register(estimateRoutes, { prefix: '/api/v1' });
  app.register(teamRoutes, { prefix: '/api/v1' });
  app.register(webhookRoutes, { prefix: '/api/v1' });
  app.register(historyRoutes, { prefix: '/api/v1' });
  app.register(calibrateRoutes, { prefix: '/api/v1' });
  app.register(baselineRoutes, { prefix: '/api/v1' });

  app.get('/health', { config: { skipAuth: true } }, async () => ({ status: 'ok' }));

  return app;
}

async function start() {
  const app = buildApp();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
