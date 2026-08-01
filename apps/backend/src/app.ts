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

// REST Routers
import { documentsRouter } from './routes/documents.js';
import { revisionsRouter } from './routes/revisions.js';
import { editorSettingsRouter } from './routes/editor-settings.js';
import { favoritesRouter } from './routes/favorites.js';
import { storageRouter } from './routes/storage.js';
import { healthRouter } from './routes/health.js';
import { authStateRouter } from './routes/auth-state.js';

const app: Express = express();
const server = createServer(app);

initializeSocket(server);

// Only takes effect when TRUST_PROXY is set; see apps/backend/src/env.ts.
app.set('trust proxy', env.TRUST_PROXY);

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);

// Must run before the auth handler, which is what consumes the client IP.
app.use(clientIp);

app.all('/api/auth/{*any}', toNodeHandler(auth));

app.use(
  morgan<Request, Response>('dev', {
    // The container health check polls this every 30s. Logging it buries real
    // traffic and, on a device logging to an SD card, adds ~2,900 lines a day
    // that say nothing. Use originalUrl: Express rewrites req.url when a
    // request enters a mounted router, so by the time morgan evaluates this the
    // path would read as '/' rather than '/api/health'.
    skip: (req) => req.originalUrl.split('?')[0] === '/api/health',
  }),
);
app.use(express.json({ limit: '5mb' }));

app.use('/api/documents', documentsRouter);
app.use('/api/revisions', revisionsRouter);
app.use('/api/editor-settings', editorSettingsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/health', healthRouter);
app.use('/api/auth-state', authStateRouter);

app.use('/storage', storageRouter);

app.get('/docs/openapi.json', (req, res) => {
  res.json(openApiDocument);
});

app.get(
  '/docs',
  apiReference({
    sources: [
      { title: 'WordyMe API', url: '/docs/openapi.json' },
      { title: 'Better-Auth API', url: '/api/auth/open-api/generate-schema' },
    ],
    pageTitle: 'Wordy API Documentation',
  }),
);

// Serve the built web bundle from the same origin as the API. Mounted after
// every server route so it can never shadow one. When no bundle is present
// (`pnpm dev`), Vite serves the web app separately and this is skipped.
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
