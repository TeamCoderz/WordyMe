/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import server from './app.js';
import { env } from './env.js';
import { checkpointDatabase, configureDatabase } from './lib/db.js';
import { originConfig } from './lib/auth.js';
import { clientUrlWarning } from './lib/client-url.js';
import { getSocket } from './lib/socket.js';
import { hasWebBundle } from './lib/web.js';
import { dbWritesQueue } from './queues/db-writes.js';
import { startUpdateChecks, stopUpdateChecks } from './services/updates.js';
import { recoverStagingOnBoot } from './services/backup/staging.js';
import { sweepUploads } from './services/backup/uploads.js';

/**
 * How long to wait for in-flight work before giving up. Docker's default grace
 * period before SIGKILL is 10s, so stay under it — otherwise the kernel kills
 * the process anyway and the graceful path achieved nothing.
 */
const SHUTDOWN_TIMEOUT_MS = 8_000;

await configureDatabase();
await sweepUploads();
await recoverStagingOnBoot();

server.listen(env.PORT, () => {
  console.log(`Server is running on http://localhost:${env.PORT}`);
  console.log(`Trusted origins (CLIENT_URL): ${env.CLIENT_URL.join(', ')}`);
  console.log(
    env.TRUST_HOST
      ? 'TRUST_HOST=true: also trusting whichever host a request arrives on.'
      : 'TRUST_HOST=false: only the origins above are accepted.',
  );
  console.log(`Session cookies Secure: ${originConfig.useSecureCookies}`);

  startUpdateChecks();

  for (const warning of originConfig.warnings) console.warn(warning);

  const warning = clientUrlWarning({
    clientUrls: env.CLIENT_URL,
    port: env.PORT,
    servesWebBundle: hasWebBundle(),
    behindProxy: env.TRUST_PROXY !== false,
    trustHost: env.TRUST_HOST,
  });

  if (warning) console.warn(warning);
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

  stopUpdateChecks();

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
    await checkpointDatabase();

    console.log('Shutdown complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception, exiting:', error);
  process.exit(1);
});
