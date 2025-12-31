import { DocumentDetails, PlainDocument } from './documents.js';
import { Favorite } from './favorites.js';

export type FavoriteRealtimeResponse = Favorite & { spaceId: string | null };

export type SocketEventsMap = {
  'document:created': DocumentDetails;
  'document:updated': PlainDocument;
  'document:deleted': PlainDocument;
  'document:favorited': FavoriteRealtimeResponse;
  'document:unfavorited': FavoriteRealtimeResponse;
  'space:created': DocumentDetails;
  'space:updated': PlainDocument;
  'space:deleted': PlainDocument;
  'space:favorited': FavoriteRealtimeResponse;
  'space:unfavorited': FavoriteRealtimeResponse;
  connect: void;
  disconnect: void;
};

export type SocketEventKey = keyof SocketEventsMap;
