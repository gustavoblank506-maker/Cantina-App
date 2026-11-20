import { existsSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import { config, rootDir } from './config/env.js';
import { authenticate } from './middlewares/auth.js';
import { errorHandler, notFound } from './middlewares/errors.js';
import { cors, noStore, requireJson, securityHeaders } from './middlewares/security.js';
import { router } from './routes/index.js';

const webDir = join(rootDir, 'dist');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  app.use(securityHeaders);
  app.use('/api', cors, noStore, requireJson, express.json({ limit: '10kb' }), authenticate, router, notFound);

  // O app web gerado pelo Expo (npm run build:web) é servido pelo mesmo servidor.
  if (existsSync(webDir)) app.use(express.static(webDir));
  else app.get('/', (req, res) => res.type('text').send('Gere o app web com "npm run build:web" e reinicie o servidor.'));

  app.use(errorHandler);
  return app;
}
