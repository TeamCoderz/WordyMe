/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { gcm } from '@noble/ciphers/aes.js';
import { randomBytes } from '@noble/ciphers/utils.js';

const KEY_LENGTH = 32;
const NONCE_LENGTH = 12;

/** Raw AES-256 key material (32 bytes). */
export type EncryptionKeyMaterial = Uint8Array;

function toUint8Array(value: ArrayBuffer | Uint8Array): Uint8Array {
  return value instanceof Uint8Array ? value : new Uint8Array(value);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
  return bytes.buffer;
}

export function importKey(key: string): EncryptionKeyMaterial {
  const rawKey = new Uint8Array(base64ToArrayBuffer(key));
  if (rawKey.length !== KEY_LENGTH) {
    throw new Error(`encryption: expected ${KEY_LENGTH}-byte key, got ${rawKey.length}`);
  }
  return rawKey;
}

export function exportKey(key: EncryptionKeyMaterial): string {
  if (key.length !== KEY_LENGTH) {
    throw new Error(`encryption: expected ${KEY_LENGTH}-byte key, got ${key.length}`);
  }
  const bytes =
    key.byteOffset === 0 && key.byteLength === key.buffer.byteLength ? key : key.slice();
  return btoa(String.fromCharCode(...bytes));
}

export function generateEncryptionKey(): EncryptionKeyMaterial {
  return randomBytes(KEY_LENGTH);
}

export async function encryptData(data: string, key: EncryptionKeyMaterial): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const iv = randomBytes(NONCE_LENGTH);
  const encrypted = gcm(key, iv).encrypt(dataBuffer);

  const result = new Uint8Array(iv.length + encrypted.length);
  result.set(iv);
  result.set(encrypted, iv.length);
  return result;
}

export async function decryptData(
  encryptedData: ArrayBuffer | Uint8Array,
  key: EncryptionKeyMaterial,
): Promise<string> {
  const buf = toUint8Array(encryptedData);
  if (buf.length < NONCE_LENGTH + 16) {
    throw new Error('encryption: ciphertext too short');
  }
  const iv = buf.subarray(0, NONCE_LENGTH);
  const data = buf.subarray(NONCE_LENGTH);
  const decrypted = gcm(key, iv).decrypt(data);
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
