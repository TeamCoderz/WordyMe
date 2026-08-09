/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { checkForUpdates, getLatestRelease } from '@repo/sdk/updates.ts';
import { UPDATES_QUERY_KEYS } from '@/queries/query-keys';
import { isNewerVersion } from '@/utils/semver';
import { version } from '../../../../package.json';

export type UpdateStatus = {
  enabled: boolean;
  current: string;
  latest: string | null;
  updateAvailable: boolean;
  releaseUrl: string | null;
  checkedAt: string | null;
  status: 'ok' | 'unreachable' | 'disabled';
};

const ONE_HOUR_MS = 60 * 60 * 1000;

const UNREACHABLE: UpdateStatus = {
  enabled: true,
  current: version,
  latest: null,
  updateAvailable: false,
  releaseUrl: null,
  checkedAt: null,
  status: 'unreachable',
};

const toStatus = (release: {
  enabled: boolean;
  version: string | null;
  releaseUrl: string | null;
  checkedAt: string | null;
}): UpdateStatus => {
  if (!release.enabled) {
    return { ...UNREACHABLE, enabled: false, status: 'disabled' };
  }

  if (!release.version) return { ...UNREACHABLE, checkedAt: release.checkedAt };

  return {
    enabled: true,
    current: version,
    latest: release.version,
    updateAvailable: isNewerVersion(release.version, version),
    releaseUrl: release.releaseUrl,
    checkedAt: release.checkedAt,
    status: 'ok',
  };
};

export function useUpdateStatus() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: UPDATES_QUERY_KEYS.LATEST_RELEASE,
    queryFn: async () => {
      const { data, error } = await getLatestRelease();
      if (error) throw error;
      return data;
    },
    // Nothing to re-ask when the operator turned the check off, and an
    // answer we already have is good for an hour. Only an unreachable result
    // is worth retrying on the next mount.
    staleTime: (query) =>
      query.state.data && (query.state.data.version || !query.state.data.enabled) ? ONE_HOUR_MS : 0,
    refetchOnWindowFocus: false,
    retry: 1,
    select: toStatus,
  });

  const { mutate, isPending: isChecking } = useMutation({
    mutationKey: ['updates', 'check'],
    mutationFn: async () => {
      const { data, error } = await checkForUpdates();
      if (error) throw error;
      return data;
    },
    onSuccess: (release) => {
      queryClient.setQueryData(UPDATES_QUERY_KEYS.LATEST_RELEASE, release);
    },
    onError: () => {
      toast.error('Could not check for updates.');
    },
  });

  const check = useCallback(() => mutate(), [mutate]);

  return { status: data ?? UNREACHABLE, isChecking, check };
}
