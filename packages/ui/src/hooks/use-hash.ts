/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useState, useCallback, useEffect } from 'react';

function getHash() {
  return typeof window !== 'undefined' ? window.location.hash : '';
}

export const useHash = () => {
  const [hash, setHash] = useState(getHash);

  const onHashChange = useCallback(() => {
    setHash(getHash);
  }, []);

  useEffect(() => {
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  const _setHash = useCallback(
    (newHash: string) => {
      if (newHash !== hash) {
        window.location.hash = newHash;
      }
    },
    [hash],
  );

  return [hash, _setHash] as const;
};
