/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Tab } from '@repo/types';

export const matchTabLocation = (
  tab: Tab,
  pathname: string,
  search: Record<string, unknown>,
  hash: string,
) => {
  return (
    tab.pathname === pathname &&
    Object.keys(tab.search ?? {}).length === Object.keys(search ?? {}).length &&
    Object.keys(tab.search ?? {}).every(
      (key) => tab.search?.[key as keyof typeof tab.search] === search[key as keyof typeof search],
    ) &&
    (tab.hash ?? '') === (hash ?? '')
  );
};

export const hasUrlInDataTransfer = (dataTransfer: DataTransfer | null) => {
  if (!dataTransfer) return false;
  return dataTransfer.types.includes('text/uri-list') || dataTransfer.types.length === 0;
};
