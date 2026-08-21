/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useSelector } from '@/store';
import { cn } from '@repo/ui/lib/utils';

export function useFolderIconColor(document: {
  isContainer?: boolean | null;
  color?: string | null;
}) {
  const folderColorsEnabled = useSelector((state) => state.ui.folderColorsEnabled);
  const folderDefaultColor = useSelector((state) => state.ui.folderDefaultColor);
  const folderColorSolid = useSelector((state) => state.ui.folderColorSolid);

  const enabled = folderColorsEnabled && document.isContainer === true;
  const color = enabled
    ? (document.color ?? (folderDefaultColor === 'theme' ? null : folderDefaultColor))
    : null;

  return {
    enabled,
    wrapperClass: color ? `color-${color}` : undefined,
    iconClass: enabled ? cn('text-primary', folderColorSolid && 'fill-current') : undefined,
  };
}
