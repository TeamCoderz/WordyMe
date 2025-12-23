import { createDocument } from 'zod-openapi';
import z from 'zod';
import {
  createDocumentSchema,
  updateDocumentSchema,
  documentDetailsSchema,
  documentHandleParamSchema,
  documentIdParamSchema,
  plainDocumentSchema,
  copiedDocumentSchema,
  documentFiltersSchema,
  documentListItemSchema,
  getSingleDocumentOptionsSchema,
} from '../schemas/documents.js';
import { plainRevisionSchema } from '../schemas/revisions.js';
import {
  copyDocumentSchema,
  exportedDocumentSchema,
  importDocumentSchema,
} from '../schemas/operations.js';
import { paginationQuerySchema, paginatedResultSchema } from '../schemas/pagination.js';
import { editorSettingsSchema } from '../schemas/editor-settings.js';

export const openApiDocument = createDocument({
  openapi: '3.0.0',
  info: {
    title: 'WordyMe API',
    version: '1.0.0',
    description: 'API documentation for the WordyMe application.',
  },
  paths: {
    '/api/documents': {
      get: {
        summary: 'List all user documents',
        tags: ['Documents'],
        description:
          'Retrieves all documents belonging to the authenticated user. Supports filtering by document type, space, parent, search term, and ordering.',
        requestParams: { query: documentFiltersSchema },
        responses: {
          200: {
            description: 'List of documents matching the filter criteria.',
            content: {
              'application/json': { schema: z.array(documentListItemSchema) },
            },
          },
        },
      },
    },
    '/api/documents/last-viewed': {
      get: {
        summary: 'List recently viewed documents',
        tags: ['Documents'],
        description:
          'Retrieves a paginated list of documents that the authenticated user has recently viewed. Results are ordered by last viewed timestamp by default. Useful for building "recent documents" or "continue where you left off" features.',
        requestParams: { query: documentFiltersSchema.extend(paginationQuerySchema.shape) },
        responses: {
          200: {
            description: 'Paginated list of recently viewed documents with metadata.',
            content: {
              'application/json': { schema: paginatedResultSchema(documentListItemSchema) },
            },
          },
        },
      },
    },
    '/api/documents/handle/{handle}': {
      get: {
        summary: 'Get document by handle',
        tags: ['Documents'],
        description:
          'Retrieves a document using its URL-friendly handle (slug). Handles are auto-generated from document names and are unique. Optionally updates the last viewed timestamp for the document.',
        requestParams: {
          path: documentHandleParamSchema,
          query: getSingleDocumentOptionsSchema,
        },
        responses: {
          200: {
            description: 'Document details including current revision and metadata.',
            content: {
              'application/json': { schema: documentDetailsSchema },
            },
          },
          404: {
            description: 'Document with the specified handle not found or not accessible.',
          },
        },
      },
    },
    '/api/documents/{documentId}': {
      get: {
        summary: 'Get document by ID',
        tags: ['Documents'],
        description:
          'Retrieves the full details of a specific document by its unique ID. Returns the document with its current revision, view history, and favorite status.',
        requestParams: { path: documentIdParamSchema },
        responses: {
          200: {
            description: 'Document details including current revision and metadata.',
            content: {
              'application/json': { schema: documentDetailsSchema },
            },
          },
          404: {
            description: 'Document not found or the user does not have access to it.',
          },
        },
      },
    },
    '/api/documents/{documentId}/export': {
      get: {
        summary: 'Export document tree',
        tags: ['Documents'],
        description:
          'Exports a document and all its nested children as a portable JSON structure. The export includes document metadata and revision content. Useful for backup or migration purposes.',
        requestParams: { path: documentIdParamSchema },
        responses: {
          200: {
            description: 'Exported document tree structure ready for import.',
            content: {
              'application/json': { schema: exportedDocumentSchema },
            },
          },
          401: {
            description:
              'Unauthorized. The document does not exist or is not accessible by the authenticated user.',
          },
        },
      },
    },
    '/api/documents/{documentId}/revisions': {
      get: {
        summary: 'List document revisions',
        tags: ['Documents'],
        description:
          'Retrieves all revisions (version history) for a specific document. Each revision represents a saved state of the document content. Useful for implementing version history or rollback features.',
        requestParams: { path: documentIdParamSchema },
        responses: {
          200: {
            description: 'List of all revisions for the document, ordered by creation date.',
            content: {
              'application/json': { schema: z.array(plainRevisionSchema) },
            },
          },
          401: {
            description:
              'Unauthorized. The document does not exist or is not accessible by the authenticated user.',
          },
        },
      },
    },
    '/api/documents/{documentId}/revisions/current': {
      get: {
        summary: 'Get current revision',
        tags: ['Documents'],
        description:
          "Retrieves the current (active) revision of a document. This is the revision that represents the document's current saved state.",
        requestParams: { path: documentIdParamSchema },
        responses: {
          200: {
            description: 'The current active revision of the document.',
            content: {
              'application/json': { schema: plainRevisionSchema },
            },
          },
          401: {
            description:
              'Unauthorized. The document does not exist or is not accessible by the authenticated user.',
          },
          404: {
            description:
              'No current revision exists for this document (document may be empty or newly created).',
          },
        },
      },
    },

    '/api/documents/create': {
      post: {
        summary: 'Create a new document',
        tags: ['Documents'],
        description:
          "Creates a new document (space, folder, or note) in the authenticated user's workspace. The document can optionally be nested under a parent document and associated with a space.",
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: createDocumentSchema },
          },
        },
        responses: {
          201: {
            description:
              'Document created successfully. Returns the full document details including current revision state.',
            content: {
              'application/json': { schema: documentDetailsSchema },
            },
          },
          401: {
            description:
              'Unauthorized. The specified parentId or spaceId does not exist or is not accessible by the authenticated user.',
          },
        },
      },
    },
    '/api/documents/import': {
      post: {
        summary: 'Import document tree',
        tags: ['Documents'],
        description:
          "Imports a previously exported document tree into the user's workspace. Recreates the full document hierarchy including all nested children and their content.",
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: importDocumentSchema },
          },
        },
        responses: {
          201: {
            description:
              'Document tree imported successfully. Returns the root document of the imported tree.',
            content: {
              'application/json': { schema: plainDocumentSchema },
            },
          },
          401: {
            description:
              'Unauthorized. The specified parentId or spaceId does not exist or is not accessible by the authenticated user.',
          },
        },
      },
    },
    '/api/documents/{documentId}/copy': {
      post: {
        summary: 'copy document',
        tags: ['Documents'],
        description:
          'Creates a complete copy of a document including its content and nested children. The copy can be placed at a custom position or under a different parent/space.',
        requestParams: { path: documentIdParamSchema },
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: copyDocumentSchema },
          },
        },
        responses: {
          201: {
            description:
              'Document copied successfully. Returns the new document with its revision.',
            content: {
              'application/json': { schema: copiedDocumentSchema },
            },
          },
          401: {
            description:
              'Unauthorized. The document does not exist or is not accessible by the authenticated user.',
          },
          500: {
            description: 'Internal server error. The copy operation failed unexpectedly.',
          },
        },
      },
    },

    '/api/documents/{documentId}/update': {
      patch: {
        summary: 'Update document',
        tags: ['Documents'],
        description:
          "Updates a document's properties such as name, icon, position, parent, or space. All fields are optional - only provided fields will be updated.",
        requestParams: { path: documentIdParamSchema },
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: updateDocumentSchema },
          },
        },
        responses: {
          200: {
            description: 'Document updated successfully. Returns the updated document.',
            content: {
              'application/json': { schema: plainDocumentSchema },
            },
          },
          401: {
            description:
              'Unauthorized. The document, specified parentId, or spaceId does not exist or is not accessible by the authenticated user.',
          },
        },
      },
    },

    '/api/documents/{documentId}/delete': {
      delete: {
        summary: 'Delete document',
        tags: ['Documents'],
        description:
          'Permanently deletes a document and all its nested children. This action cannot be undone. Users must always have at least one document in their workspace.',
        requestParams: { path: documentIdParamSchema },
        responses: {
          204: {
            description: 'Document deleted successfully.',
          },
          401: {
            description:
              'Unauthorized. The document does not exist or is not accessible by the authenticated user.',
          },
          422: {
            description:
              'Cannot delete the last remaining document. Users must have at least one document in their workspace.',
          },
        },
      },
    },
    '/api/editor-settings': {
      patch: {
        summary: 'Update editor settings',
        tags: ['Editor Settings'],
        description: 'Updates the editor settings for the authenticated user.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: editorSettingsSchema },
          },
        },
        responses: {
          200: {
            description: 'Editor settings updated successfully.',
            content: {
              'application/json': { schema: editorSettingsSchema },
            },
          },
          404: {
            description: 'Editor settings not found.',
          },
        },
      },
    },
  },
  security: [
    {
      apiKeyCookie: [],
      bearerAuth: [],
    },
  ],
});
