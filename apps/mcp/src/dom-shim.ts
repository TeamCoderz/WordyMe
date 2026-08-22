/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Several editor nodes (MathLive, and the DOM-rendering decorators) expect
// browser globals at module load. Register a headless DOM before any
// @repo/editor module is imported — this file must stay the first import.
const nodeFetch = globalThis.fetch;

if (typeof globalThis.window === 'undefined') {
  GlobalRegistrator.register();
  // happy-dom also installs browser-style fetch/XMLHttpRequest that enforce the
  // same-origin policy. Networking must stay Node's own.
  globalThis.fetch = nodeFetch;
  delete (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest;
}

// MathLive skips its window registration outside a real browser, but the
// editor's MathNode module reads these globals at import time.
const win = globalThis.window as unknown as Record<string, unknown>;
win.MathfieldElement ??= class {};
win.mathVirtualKeyboard ??= {
  normalizedLayouts: Array.from({ length: 4 }, () => ({
    layers: [
      {
        rows: Array.from({ length: 8 }, () =>
          Array.from({ length: 16 }, () => ({ variants: [] as unknown[] })),
        ),
      },
    ],
  })),
};
