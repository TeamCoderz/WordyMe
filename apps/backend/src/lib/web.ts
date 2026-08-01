/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import express, { type RequestHandler } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Directory holding the built web bundle.
 *
 * Resolved relative to this module rather than `process.cwd()`, so a change of
 * working directory cannot silently point it somewhere else. In the Docker image
 * the compiled backend lives at `/app/dist/lib`, which puts the bundle at
 * `/app/web`. During `pnpm dev` the directory does not exist and static serving
 * is skipped, because Vite serves the web app on its own port instead.
 */
export const WEB_DIR = process.env.WEB_DIR
  ? path.resolve(process.env.WEB_DIR)
  : path.resolve(moduleDir, '../../web');

/** True when a built web bundle is present and should be served. */
export const hasWebBundle = (): boolean => existsSync(path.join(WEB_DIR, 'index.html'));

/**
 * Files that must never be cached for long. The app shell and the service worker
 * are fetched by filename rather than by content hash, so a stale cached copy
 * pins clients to an old build.
 */
const NEVER_CACHE = new Set(['index.html', 'sw.js', 'registerSW.js', 'manifest.webmanifest']);

/** Paths owned by the server. They must keep their own 404s instead of the app shell. */
const SERVER_PREFIXES = ['/api/', '/storage/', '/docs'];

/**
 * Extensions that identify a request for a static file rather than a client-side
 * route. Anything matching this has already been given to `express.static` and
 * was not found, so answering with the app shell would hand the browser HTML
 * where it expected JavaScript — surfacing as "Unexpected token '<'" instead of
 * an honest 404. Matching on a known list rather than "contains a dot" keeps
 * legitimate routes such as `/users/john.doe` working.
 */
const STATIC_ASSET =
  /\.(?:js|mjs|css|map|json|webmanifest|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|wasm|txt|xml)$/i;

export const webStatic: RequestHandler = express.static(WEB_DIR, {
  // `index.html` is served by the fallback below, so it gets one consistent
  // set of headers whether it was reached via `/` or via a deep link.
  index: false,
  setHeaders: (res, filePath) => {
    const relativePath = path.relative(WEB_DIR, filePath);

    if (NEVER_CACHE.has(path.basename(filePath))) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (relativePath.startsWith(`assets${path.sep}`)) {
      // Vite fingerprints these filenames, so the content can never change.
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  },
});

/**
 * Serves the SPA shell so client-side routes survive a page reload, while
 * leaving unmatched server paths to the normal JSON 404 handler.
 */
export const webFallback: RequestHandler = (req, res, next) => {
  if (
    SERVER_PREFIXES.some((prefix) => req.path.startsWith(prefix)) ||
    STATIC_ASSET.test(req.path)
  ) {
    return next();
  }

  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(WEB_DIR, 'index.html'), (err) => {
    if (err) next(err);
  });
};
