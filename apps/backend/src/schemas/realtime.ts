import { DocumentDetails, PlainDocument } from './documents.js';

export type SocketEventsMap = {
  'document:created': PlainDocument;
  'document:updated': PlainDocument;
  'document:deleted': PlainDocument;
  'space:created': PlainDocument;
  'space:updated': PlainDocument;
  'space:deleted': PlainDocument;
};

export type SocketEventKey = keyof SocketEventsMap;
