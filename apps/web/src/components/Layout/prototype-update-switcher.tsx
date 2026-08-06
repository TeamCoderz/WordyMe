/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';

/*
 * PROTOTYPE ONLY — delete this file, its import in App.tsx, and the prototype
 * section of use-update-status.ts once the real /api/updates endpoint exists.
 *
 * Renders only under `pnpm dev`; it is compiled out of production builds by the
 * `import.meta.env.DEV` guard in App.tsx.
 */

import { useEffect, useState } from 'react';
import {
  readPrototypeState,
  setPrototypeState,
  type PrototypeState,
} from '@/hooks/use-update-status';

const STATES: { value: PrototypeState; label: string }[] = [
  { value: 'update-available', label: 'Update available' },
  { value: 'up-to-date', label: 'Up to date' },
  { value: 'unreachable', label: 'Unreachable' },
  { value: 'disabled', label: 'Disabled' },
];

export function PrototypeUpdateSwitcher() {
  const [state, setState] = useState<PrototypeState>(readPrototypeState);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => setPrototypeState(state), [state]);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="bg-background/95 fixed bottom-4 left-4 z-[9999] rounded-full border px-3 py-1.5 text-xs shadow-lg backdrop-blur"
      >
        Update states
      </button>
    );
  }

  return (
    <div className="bg-background/95 fixed bottom-4 left-4 z-[9999] w-52 rounded-lg border p-3 shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[0.625rem] font-semibold tracking-wide uppercase opacity-60">
          Update state · prototype
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="text-xs opacity-60 hover:opacity-100"
          aria-label="Collapse"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {STATES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setState(s.value)}
            className={
              'rounded-md px-2 py-1 text-left text-xs transition-colors ' +
              (state === s.value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      <p className="mt-2 text-[0.625rem] leading-snug opacity-60">
        Open the avatar menu to see each state. The dot appears only on “Update available”.
      </p>
    </div>
  );
}
