import { DocumentDetails } from './documents.js';

export type SocketEventsMap = {
  'document:created': DocumentDetails;
};

export type SocketEventKey = keyof SocketEventsMap;
