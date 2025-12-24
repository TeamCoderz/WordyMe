import { PlainDocument } from './documents.js';
import { Favorite } from './favorites.js';

export type SocketEventsMap = {
  'document:created': PlainDocument;
  'document:updated': PlainDocument;
  'document:deleted': PlainDocument;
  'document:favorited': Favorite;
  'document:unfavorited': Favorite;
  'space:created': PlainDocument;
  'space:updated': PlainDocument;
  'space:deleted': PlainDocument;
  'space:favorited': Favorite;
  'space:unfavorited': Favorite;
};

export type SocketEventKey = keyof SocketEventsMap;
