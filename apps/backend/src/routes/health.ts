/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Router } from 'express';
import { db, withWriteRetry } from '../lib/db.js';

export const healthRouter = Router();

/**
 * Liveness probe. Deliberately touches nothing — no database, no filesystem — so
 * that a container still running startup migrations is not reported as broken.
 * Use `/api/health/db` when you actually want to know about the database.
 */
healthRouter.get('/', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ status: 'ok' });
});

healthRouter.get('/ready', async (_req, res) => {
  const start = Date.now();
  res.setHeader('Cache-Control', 'no-store');

  try {
    await withWriteRetry(async () => {
      const version = await db.$client.execute('PRAGMA user_version');
      await db.$client.execute(
        `PRAGMA user_version = ${Number(version.rows[0]?.user_version ?? 0)}`,
      );
    });

    return res.status(200).json({
      status: 'ready',
      db: 'writable',
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      status: 'unready',
      db: 'not-writable',
      detail: error instanceof Error ? error.message : 'unknown error',
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  }
});

healthRouter.get('/db', async (_req, res) => {
  const start = Date.now();

  try {
    await db.run('select 1');

    const latencyMs = Date.now() - start;
    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).json({
      status: 'healthy',
      db: 'connected',
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (_err) {
    const latencyMs = Date.now() - start;
    res.setHeader('Cache-Control', 'no-store');

    return res.status(503).json({
      status: 'unhealthy',
      db: 'disconnected',
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  }
});
