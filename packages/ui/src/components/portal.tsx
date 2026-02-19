/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import * as ReactDOM from 'react-dom';
import { useEffect, useState } from 'react';

interface PortalProps {
  children: React.ReactNode;
  container: string | HTMLElement | (() => HTMLElement);
  disablePortal?: boolean;
}

function getContainer(container: PortalProps['container']) {
  if (typeof container === 'string') return document.querySelector(container);
  if (typeof container === 'function') return container();
  return container;
}

export const Portal = (props: PortalProps) => {
  const { children, container, disablePortal = false } = props;
  const [mountNode, setMountNode] = useState<ReturnType<typeof getContainer> | null>(null);

  useEffect(() => {
    if (disablePortal) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMountNode(getContainer(container));
  }, [container, disablePortal]);

  if (disablePortal) return children;

  return mountNode ? ReactDOM.createPortal(children, mountNode) : mountNode;
};
