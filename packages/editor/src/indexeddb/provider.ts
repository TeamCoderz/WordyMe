import { getOrCreateKey } from './keystore';
import { decryptData, encryptData } from './encryption';
import { getInitialEditorState } from '@repo/editor/utils/getInitialEditorState';
import type { SerializedEditorState } from 'lexical';

const OBJECT_STORE_NAME = 'data';

function openIndexedDB(name: string): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 5);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore(OBJECT_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = reject;
  });
}

export async function createDocument(docId: string, name: string) {
  const db = await openIndexedDB(docId);
  const encryptionKey = await getOrCreateKey();
  const editorState = getInitialEditorState(name);
  const stringifiedEditorState = JSON.stringify(editorState);
  const encryptedValue = await encryptData(stringifiedEditorState, encryptionKey);
  const objectStore = db.transaction(OBJECT_STORE_NAME, 'readwrite').objectStore(OBJECT_STORE_NAME);

  const request = objectStore.put(encryptedValue, 0);
  await new Promise<void>((resolve, reject) => {
    request.onsuccess = () => resolve();
    request.onerror = reject;
  });
}

export async function getDocument(id: string) {
  const db = await openIndexedDB(id);
  const encryptionKey = await getOrCreateKey();
  const objectStore = db.transaction(OBJECT_STORE_NAME).objectStore(OBJECT_STORE_NAME);
  const request = objectStore.get(0);
  return await new Promise<string | null>((resolve, reject) => {
    request.onsuccess = async () => {
      if (!request.result) return resolve(null);

      try {
        const stringifiedEditorState = await decryptData(request.result, encryptionKey);
        return resolve(stringifiedEditorState);
      } catch (error) {
        console.error('Error parsing editor state JSON:', error);
        return resolve(null);
      }
    };
    request.onerror = reject;
  });
}

export async function saveDocument(id: string, editorState: SerializedEditorState) {
  const db = await openIndexedDB(id);
  const encryptionKey = await getOrCreateKey();
  const stringifiedEditorState = JSON.stringify(editorState);
  const encryptedValue = await encryptData(stringifiedEditorState, encryptionKey);
  const objectStore = db.transaction(OBJECT_STORE_NAME, 'readwrite').objectStore(OBJECT_STORE_NAME);
  const request = objectStore.put(encryptedValue, 0);
  await new Promise<void>((resolve, reject) => {
    request.onsuccess = () => resolve();
    request.onerror = reject;
  });
}

export function deleteDocument(id: string) {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(id);
    request.onsuccess = () => resolve();
    request.onerror = reject;
  });
}

export async function clearDocument(id: string) {
  const db = await openIndexedDB(id);
  const objectStore = db.transaction(OBJECT_STORE_NAME, 'readwrite').objectStore(OBJECT_STORE_NAME);
  const request = objectStore.clear();
  await new Promise<void>((resolve, reject) => {
    request.onsuccess = () => resolve();
    request.onerror = reject;
  });
}
