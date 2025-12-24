//documents query keys
export const DOCUMENTS_QUERY_KEYS = {
  FAVORITES: ['docs', 'favorites'],
  HOME: {
    BASE: ['home', 'docs'],
    FAVORITES: ['home', 'docs', 'favorites'],
    ALL_DOCUMENTS: ['home', 'docs', 'all-documents'],
    RECENT_VIEWS: ['home', 'docs', 'recent-views'],
  },
  RECENT_VIEWS: ['docs', 'recent-viewed'],
};

//spaces query keys
export const SPACES_QUERY_KEYS = {
  FAVORITES: ['spaces', 'favorites'],
  HOME: {
    BASE: ['home', 'spaces'],
    FAVORITES: ['home', 'spaces', 'favorites'],
  },
};
