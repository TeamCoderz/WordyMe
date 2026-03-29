/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  exportKey,
  generateEncryptionKey,
  importKey,
  type EncryptionKeyMaterial,
} from './encryption';

const COOKIE_NAME = 'YJS_OFFLINE_KEY';

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function setCookie(name: string, value: string) {
  // `Secure` cookies are never stored on http://, so the offline key would reset every load on LAN/dev HTTP.
  const secure =
    typeof globalThis.location !== 'undefined' && globalThis.location.protocol === 'https:';
  document.cookie = `${name}=${value};path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;SameSite=Lax${secure ? ';secure' : ''}`;
}

export async function getOrCreateKey(): Promise<EncryptionKeyMaterial> {
  // Check for existing key in cookie
  const cookieKey = getCookie(COOKIE_NAME);
  if (cookieKey) {
    // Use existing key from cookie
    return importKey(cookieKey);
  } else {
    // Generate new key and store in cookie
    const rawKey = generateEncryptionKey();
    setCookie(COOKIE_NAME, exportKey(rawKey));
    return rawKey;
  }
}
