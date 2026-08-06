/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback, useEffect, useState } from 'react';
import { version } from '../../../../package.json';

/**
 * Shape returned by `GET /api/updates` and `POST /api/updates/check`.
 *
 * This is the contract the backend implements. The UI is written against it, so
 * wiring the real endpoint should mean replacing the body of `useUpdateStatus`
 * and deleting the prototype state below — nothing in the components changes.
 */
export type UpdateStatus = {
  /** False when the operator set UPDATE_CHECK=false. The UI hides everything. */
  enabled: boolean;
  /** Version this instance is running. */
  current: string;
  /** Newest published release, null when unknown. */
  latest: string | null;
  updateAvailable: boolean;
  /** Link to the release notes on GitHub, null when unknown. */
  releaseUrl: string | null;
  /** When the check last succeeded, ISO 8601, null when never. */
  checkedAt: string | null;
  /**
   * `unreachable` covers a blocked egress, DNS failure or GitHub outage. It is
   * a normal state for an air-gapped install, not an error — the endpoint still
   * answers 200 and the UI stays calm.
   */
  status: 'ok' | 'unreachable' | 'disabled';
};

/* ------------------------------------------------------------------------- *
 * PROTOTYPE ONLY — everything below is scaffolding for validating the UI and
 * should be deleted when the real endpoint lands.
 * ------------------------------------------------------------------------- */

export type PrototypeState = 'up-to-date' | 'update-available' | 'unreachable' | 'disabled';

const PROTOTYPE_STATES: Record<PrototypeState, UpdateStatus> = {
  'up-to-date': {
    enabled: true,
    current: version,
    latest: version,
    updateAvailable: false,
    releaseUrl: null,
    checkedAt: new Date().toISOString(),
    status: 'ok',
  },
  'update-available': {
    enabled: true,
    current: version,
    latest: '1.3.0',
    updateAvailable: true,
    releaseUrl: 'https://github.com/TeamCoderz/WordyMe/releases/tag/v1.3.0',
    checkedAt: new Date().toISOString(),
    status: 'ok',
  },
  unreachable: {
    enabled: true,
    current: version,
    latest: null,
    updateAvailable: false,
    releaseUrl: null,
    checkedAt: null,
    status: 'unreachable',
  },
  disabled: {
    enabled: false,
    current: version,
    latest: null,
    updateAvailable: false,
    releaseUrl: null,
    checkedAt: null,
    status: 'disabled',
  },
};

const STORAGE_KEY = 'wordyme:prototype-update-state';
const EVENT = 'wordyme:prototype-update-change';

export const readPrototypeState = (): PrototypeState => {
  if (typeof window === 'undefined') return 'update-available';
  const stored = window.localStorage.getItem(STORAGE_KEY) as PrototypeState | null;
  return stored && stored in PROTOTYPE_STATES ? stored : 'update-available';
};

export const setPrototypeState = (state: PrototypeState) => {
  window.localStorage.setItem(STORAGE_KEY, state);
  window.dispatchEvent(new CustomEvent(EVENT));
};

/* ------------------------------------------------------------------------- */

export function useUpdateStatus() {
  const [state, setState] = useState<PrototypeState>(readPrototypeState);
  const [isChecking, setIsChecking] = useState(false);

  // Keeps every mounted copy in sync when the prototype switcher changes state.
  useEffect(() => {
    const sync = () => setState(readPrototypeState());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  /**
   * Stands in for `POST /api/updates/check`. The artificial delay is here on
   * purpose: the spinner is part of what needs validating, and it is invisible
   * against an instant mock.
   */
  const check = useCallback(() => {
    setIsChecking(true);
    window.setTimeout(() => setIsChecking(false), 900);
  }, []);

  return { status: PROTOTYPE_STATES[state], isChecking, check };
}
