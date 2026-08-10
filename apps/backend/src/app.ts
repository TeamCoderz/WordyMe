/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import express, { type Express, type Request, type Response } from 'express';
import { createServer } from 'node:http';
import morgan from 'morgan';
import cors from 'cors';
import { apiReference } from '@scalar/express-api-reference';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { openApiDocument } from './lib/docs.js';
import { initializeSocket } from './lib/socket.js';
import { hasWebBundle, webFallback, webStatic } from './lib/web.js';
import { env } from './env.js';

// Error Middlewares
import { errorHandler, notFoundHandler } from './middlewares/errors.js';
import { clientIp } from './middlewares/client-ip.js';
import { originHint } from './middlewares/origin-hint.js';
import { proxyHint } from './middlewares/proxy-hint.js';

// REST Routers
import { documentsRouter } from './routes/documents.js';
import { revisionsRouter } from './routes/revisions.js';
import { editorSettingsRouter } from './routes/editor-settings.js';
import { favoritesRouter } from './routes/favorites.js';
import { storageRouter } from './routes/storage.js';
import { healthRouter } from './routes/health.js';
import { authStateRouter } from './routes/auth-state.js';
import { updatesRouter } from './routes/updates.js';

const app: Express = express();
const server = createServer(app);

initializeSocket(server);

app.set('trust proxy', env.TRUST_PROXY);

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(clientIp);

app.use(
  morgan<Request, Response>('dev', {
    skip: (req) => req.originalUrl.split('?')[0] === '/api/health',
  }),
);

app.use(proxyHint);

app.use('/api/auth', originHint);

app.use('/api/auth', express.text({ type: '*/*', limit: '100kb' }));

app.all('/api/auth/{*any}', toNodeHandler(auth));

app.use(express.json({ limit: '5mb' }));

app.use('/api/documents', documentsRouter);
app.use('/api/revisions', revisionsRouter);
app.use('/api/editor-settings', editorSettingsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/health', healthRouter);
app.use('/api/auth-state', authStateRouter);
app.use('/api/updates', updatesRouter);

app.use('/storage', storageRouter);

app.get('/api/docs/openapi.json', (req, res) => {
  res.json(openApiDocument);
});

app.get(
  '/api/docs',
  apiReference({
    sources: [
      { title: 'WordyMe API', url: '/api/docs/openapi.json' },
      { title: 'Better-Auth API', url: '/api/auth/open-api/generate-schema' },
    ],
    pageTitle: 'WordyMe API Documentation',
  }),
);

if (hasWebBundle()) {
  app.use(webStatic);
  app.get('/{*any}', webFallback);
} else {
  app.get('/', (_req, res) => {
    res.type('text').send('WordyMe API. No web bundle present; run the web app separately.');
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

export default server;
