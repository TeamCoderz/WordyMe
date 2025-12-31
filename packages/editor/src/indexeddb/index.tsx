import {
  clearDocument,
  createDocument,
  deleteDocument,
  getDocument,
  saveDocument,
} from './provider';
import type { SerializedEditorState } from 'lexical';

export function createLocalDocument(docId: string, name: string) {
  return createDocument(docId, name);
}

export function getLocalDocument(docId: string) {
  return getDocument(docId);
}

export function saveLocalDocument(docId: string, editorState: SerializedEditorState) {
  return saveDocument(docId, editorState);
}

export function deleteLocalDocument(docId: string) {
  return deleteDocument(docId);
}

export function clearLocalDocument(docId: string) {
  return clearDocument(docId);
}
