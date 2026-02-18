import { Router } from 'express';
import { db } from '../lib/db.js';

export const healthRouter = Router();

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
