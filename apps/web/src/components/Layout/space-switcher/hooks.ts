/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { arrayToTree } from '@repo/lib/data/tree';
import { useSelector, useActions } from '@/store';
import { getAllSpacesQueryOptions, ListSpaceResult } from '@/queries/spaces';
import { Space } from '@repo/types/spaces';
import { UseSpaceSwitcherReturn, SpaceData } from './types';
import { calculateSpacePath } from '@/utils/calculateSpacePath';

export function useSpaceSwitcher(overrideSpaces?: ListSpaceResult): UseSpaceSwitcherReturn {
  const { setActiveSpace } = useActions();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery(getAllSpacesQueryOptions);
  const spaces = overrideSpaces ?? data ?? [];
  const spacesTree = React.useMemo(() => arrayToTree(spaces as Space[]), [spaces]);
  const activeSpace = useSelector((state) => state.activeSpace);

  const [expandedSpaces, setExpandedSpaces] = React.useState<Set<string>>(new Set([]));
  const [openMenuSpaceId, setOpenMenuSpaceId] = React.useState<string | null>(null);

  const getAncestorIds = (spaceId?: string, ids: string[] = []): string[] => {
    const space = spaces.find((s) => s.id === spaceId);
    if (!space) return ids;
    if (space.parentId) {
      getAncestorIds(space.parentId, ids);
      ids.push(space.parentId);
    }
    return ids;
  };

  const isExpanded = (spaceId: string) => expandedSpaces.has(spaceId);

  const handleSelectSpace = (spaceId: string) => {
    const space = spaces.find((space) => space.id === spaceId);
    if (space) {
      const path = calculateSpacePath(spaceId, spaces as Space[]);
      setActiveSpace({
        ...space,
        icon: space.icon as Space['icon'],
        path,
      });
    } else {
      setActiveSpace(null);
    }
    setOpenMenuSpaceId(null);
  };

  const toggleExpanded = (spaceId?: string) => {
    if (!spaceId) return;
    setExpandedSpaces((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(spaceId)) {
        newSet.delete(spaceId);
      } else {
        newSet.add(spaceId);
      }
      return newSet;
    });
  };

  const handleEditSpace = (_space: SpaceData) => {
    // TODO: Implement edit space functionality
  };

  const handleDeleteSpace = (_space: SpaceData) => {
    // TODO: Implement delete space functionality
  };

  const handleAddChildSpace = (_parentSpace: SpaceData) => {
    // Close the context menu first
    setOpenMenuSpaceId(null);
    // Navigate to spaces manage page
    navigate({
      to: '/spaces/manage',
    });
  };

  React.useEffect(() => {
    const ancestorIds = getAncestorIds(activeSpace?.id);
    setExpandedSpaces((prev) => {
      const newSet = new Set(prev);
      ancestorIds.forEach((id) => newSet.add(id));
      return newSet;
    });
  }, []);

  return {
    spaces,
    spacesTree,
    activeSpace,
    expandedSpaces,
    openMenuSpaceId,
    isExpanded,
    handleSelectSpace,
    toggleExpanded,
    setOpenMenuSpaceId,
    handleEditSpace,
    handleDeleteSpace,
    handleAddChildSpace,
    getAncestorIds,
    isLoading,
  };
}
