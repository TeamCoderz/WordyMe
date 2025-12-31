import {
  addDocumentToCache,
  isDocumentCached,
  removeDocumentFromCache,
} from '@/queries/caches/documents';
import { addSpaceToCache, isSpaceCached, removeSpaceFromCache } from '@/queries/caches/spaces';
import { getAllDocumentsQueryOptions, ListDocumentResult } from '@/queries/documents';
import { DOCUMENTS_QUERY_KEYS, SPACES_QUERY_KEYS } from '@/queries/query-keys';
import { getAllSpacesQueryOptions, ListSpaceResult } from '@/queries/spaces';
import { useAllQueriesInvalidate } from '@/queries/utils';
import { useSelector } from '@/store';
import { PlainDocument } from '@repo/backend/documents.js';
import {
  connectSocket,
  disconnectSocket,
  off,
  on,
  onConnect,
  onDisconnect,
  subscribeToSpace,
  unsubscribeFromSpace,
} from '@repo/sdk/realtime/client';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState } from 'react';
interface RealtimeProviderContextType {
  isConnected: boolean;
}
const RealtimeProviderContext = createContext<RealtimeProviderContextType>({
  isConnected: false,
});

export const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const activeSpaceId = useSelector((state) => state.activeSpace?.id);
  const invalidate = useAllQueriesInvalidate();
  useEffect(() => {
    connectSocket();
    return () => {
      disconnectSocket();
    };
  }, []);
  useEffect(() => {
    //handle connect
    const handleConnect = () => {
      setIsConnected(true);
    };
    onConnect(handleConnect);
    //handle disconnect
    const handleDisconnect = () => {
      setIsConnected(false);
    };
    onDisconnect(handleDisconnect);
    return () => {
      off('disconnect', handleDisconnect);
      off('connect', handleConnect);
    };
  }, [setIsConnected]);
  useEffect(() => {
    if (isConnected) {
      queryClient.invalidateQueries();
    }
  }, [queryClient, isConnected]);
  useEffect(() => {
    connectSocket();
    return () => {
      disconnectSocket();
    };
  }, []);
  useEffect(() => {
    if (activeSpaceId) {
      subscribeToSpace(activeSpaceId);
      return () => {
        unsubscribeFromSpace(activeSpaceId);
      };
    }
    return;
  }, [activeSpaceId]);
  // handle spaces real-time changes
  useEffect(() => {
    // handle space created
    const handleSpaceCreated = (data: PlainDocument) => {
      queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
        if (old) {
          if (!isSpaceCached(data.clientId)) {
            addSpaceToCache(data.clientId);
            return [...old, data];
          }
        }
        return old;
      });
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
    };
    on('space:created', handleSpaceCreated);
    // handle space updated
    const handleSpaceUpdated = (data: PlainDocument) => {
      queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
        if (old) {
          return old.map((space) => {
            if (space.id === data.id) {
              return data;
            }
            return space;
          });
        }
        return old;
      });
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
    };
    on('space:updated', handleSpaceUpdated);
    // handle space deleted
    const handleSpaceDeleted = (data: PlainDocument) => {
      queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
        if (old) {
          removeSpaceFromCache(data.clientId);
          return old.filter((space) => space.id !== data.id);
        }
        return old;
      });
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
    };
    on('space:deleted', handleSpaceDeleted);
    // handle space favorited
    const handleSpaceFavorited = (data: { id: string; userId: string; documentId: string }) => {
      queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
        if (old) {
          return old.map((space) => {
            if (space.id === data.documentId) {
              return { ...space, isFavorite: true };
            }
            return space;
          });
        }
        return old;
      });
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
    };
    on('space:favorited', handleSpaceFavorited);
    // handle space unfavorited
    const handleSpaceUnfavorited = (data: { id: string; userId: string; documentId: string }) => {
      queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
        if (old) {
          return old.map((space) => {
            if (space.id === data.documentId) {
              return { ...space, isFavorite: false };
            }
            return space;
          });
        }
        return old;
      });
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
    };
    on('space:unfavorited', handleSpaceUnfavorited);
    return () => {
      off('space:created', handleSpaceCreated);
      off('space:updated', handleSpaceUpdated);
      off('space:deleted', handleSpaceDeleted);
      off('space:favorited', handleSpaceFavorited);
      off('space:unfavorited', handleSpaceUnfavorited);
    };
  }, [queryClient, invalidate]);
  // handle documents real-time changes
  useEffect(() => {
    //handle document created
    const handleDocumentCreated = (data: PlainDocument) => {
      if (data.spaceId) {
        queryClient.setQueryData(
          getAllDocumentsQueryOptions(data.spaceId).queryKey,
          (old: ListDocumentResult) => {
            if (old) {
              if (!isDocumentCached(data.clientId)) {
                addDocumentToCache(data.clientId, 'real-time');
                return [...old, data];
              }
            }
            return old;
          },
        );
      }
      invalidate([
        DOCUMENTS_QUERY_KEYS.HOME.BASE,
        DOCUMENTS_QUERY_KEYS.FAVORITES,
        DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,
      ]);
    };
    on('document:created', handleDocumentCreated);
    //handle document updated
    const handleDocumentUpdated = (data: PlainDocument) => {
      if (data.spaceId) {
        queryClient.setQueryData(
          getAllDocumentsQueryOptions(data.spaceId).queryKey,
          (old: ListDocumentResult) => {
            if (old) {
              return old.map((document) => {
                if (document.id === data.id) {
                  return data;
                }
                return document;
              });
            }
            return old;
          },
        );
      }
      invalidate([
        DOCUMENTS_QUERY_KEYS.HOME.BASE,
        DOCUMENTS_QUERY_KEYS.FAVORITES,
        DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,
      ]);
    };
    on('document:updated', handleDocumentUpdated);
    //handle document deleted
    const handleDocumentDeleted = (data: PlainDocument) => {
      if (data.spaceId) {
        queryClient.setQueryData(
          getAllDocumentsQueryOptions(data.spaceId).queryKey,
          (old: ListDocumentResult) => {
            if (old) {
              removeDocumentFromCache(data.clientId);
              return old.filter((document) => document.id !== data.id);
            }
            return old;
          },
        );
      }
      invalidate([
        DOCUMENTS_QUERY_KEYS.HOME.BASE,
        DOCUMENTS_QUERY_KEYS.FAVORITES,
        DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,
      ]);
    };
    on('document:deleted', handleDocumentDeleted);
    //handle document favorited
    const handleDocumentFavorited = (data: {
      id: string;
      userId: string;
      documentId: string;
      spaceId: string | null;
    }) => {
      if (data.spaceId) {
        queryClient.setQueryData(
          getAllDocumentsQueryOptions(data.spaceId).queryKey,
          (old: ListDocumentResult) => {
            if (old) {
              return old.map((document) => {
                if (document.id === data.documentId) {
                  return { ...document, isFavorite: true };
                }
                return document;
              });
            }
            return old;
          },
        );
      }
      invalidate([
        DOCUMENTS_QUERY_KEYS.FAVORITES,
        DOCUMENTS_QUERY_KEYS.HOME.BASE,
        DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,
      ]);
    };
    on('document:favorited', handleDocumentFavorited);
    //handle document unfavorited
    const handleDocumentUnfavorited = (data: {
      id: string;
      userId: string;
      documentId: string;
      spaceId: string | null;
    }) => {
      if (data.spaceId) {
        queryClient.setQueryData(
          getAllDocumentsQueryOptions(data.spaceId).queryKey,
          (old: ListDocumentResult) => {
            if (old) {
              return old.map((document) => {
                if (document.id === data.documentId) {
                  return { ...document, isFavorite: false };
                }
                return document;
              });
            }
            return old;
          },
        );
      }
      invalidate([
        DOCUMENTS_QUERY_KEYS.FAVORITES,
        DOCUMENTS_QUERY_KEYS.HOME.BASE,
        DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,
      ]);
    };
    on('document:unfavorited', handleDocumentUnfavorited);
    return () => {
      off('document:created', handleDocumentCreated);
      off('document:updated', handleDocumentUpdated);
      off('document:deleted', handleDocumentDeleted);
      off('document:favorited', handleDocumentFavorited);
      off('document:unfavorited', handleDocumentUnfavorited);
    };
  }, [queryClient, invalidate]);
  useEffect(() => {
    if (!isConnected) {
      const intervalCallback = () => {
        queryClient.invalidateQueries();
      };
      const interval = setInterval(intervalCallback, 30000);
      return () => {
        clearInterval(interval);
      };
    }
    return;
  }, [isConnected, queryClient]);
  return (
    <RealtimeProviderContext.Provider value={{ isConnected }}>
      {children}
    </RealtimeProviderContext.Provider>
  );
};
export const useRealtime = () => {
  const context = useContext(RealtimeProviderContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
