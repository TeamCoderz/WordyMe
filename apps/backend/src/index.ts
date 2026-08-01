/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import server from './app.js';
import { env } from './env.js';
import { getSocket } from './lib/socket.js';
import { dbWritesQueue } from './queues/db-writes.js';

/**
 * How long to wait for in-flight work before giving up. Docker's default grace
 * period before SIGKILL is 10s, so stay under it — otherwise the kernel kills
 * the process anyway and the graceful path achieved nothing.
 */
const SHUTDOWN_TIMEOUT_MS = 8_000;

server.listen(env.PORT, () => {
  console.log(`Server is running on http://localhost:${env.PORT}`);
});

let shuttingDown = false;

/**
 * Closes down in an order that protects the database: stop accepting
 * connections and disconnect clients, then let already-queued writes finish.
 * SQLite is single-writer, so being killed mid-write is the failure worth
 * avoiding.
 */
const shutdown = async (signal: string) => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`${signal} received, shutting down.`);

  // Backstop: if shutdown itself hangs, exit rather than wait for SIGKILL.
  const forceExit = setTimeout(() => {
    console.error('Graceful shutdown timed out, exiting.');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    // Socket.io closes the HTTP server it is attached to, so this stands in for
    // a separate server.close() rather than complementing it.
    await new Promise<void>((resolve, reject) => {
      getSocket().close((err) => (err ? reject(err) : resolve()));
    });

    await dbWritesQueue.onIdle();

    console.log('Shutdown complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
