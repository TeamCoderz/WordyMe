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
  createDocumentWithRevisionSchema,
} from '../schemas/documents.js';
import {
  createRevisionSchema,
  plainRevisionSchema,
  revisionIdParamSchema,
  updateRevisionSchema,
} from '../schemas/revisions.js';
import {
  copyDocumentSchema,
  exportedDocumentSchema,
  importDocumentSchema,
} from '../schemas/operations.js';
import { paginationQuerySchema, paginatedResultSchema } from '../schemas/pagination.js';
import { editorSettingsSchema } from '../schemas/editor-settings.js';
import { favoriteSchema } from '../schemas/favorites.js';
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
          404: {
            description:
              'The specified parentId or spaceId does not exist or is not accessible by the authenticated user.',
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
    '/api/documents/with-revision': {
      post: {
        summary: 'Create a new document with initial revision',
        tags: ['Documents'],
        description:
          'Creates a new document along with its initial revision in a single operation. Useful for quickly setting up a new document with content. The document can optionally be nested under a parent document and associated with a space.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: createDocumentWithRevisionSchema },
          },
        },
        responses: {
          201: {
            description:
              'Document and initial revision created successfully. Returns the full document details including current revision state.',
            content: {
              'application/json': { schema: documentDetailsSchema },
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
    '/api/documents/{documentId}/export': {
      post: {
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
          404: {
            description:
              'The document does not exist or is not accessible by the authenticated user.',
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
          404: {
            description:
              'The document does not exist or is not accessible by the authenticated user.',
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
          404: {
            description:
              'The document does not exist or is not accessible by the authenticated user.',
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
          404: {
            description:
              'The specified parentId or spaceId does not exist or is not accessible by the authenticated user.',
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
          404: {
            description:
              'The document does not exist or is not accessible by the authenticated user.',
          },
          500: {
            description: 'Internal server error. The copy operation failed unexpectedly.',
          },
        },
      },
    },
    '/api/documents/{documentId}/': {
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
          404: {
            description:
              'The document, specified parentId, or spaceId does not exist or is not accessible by the authenticated user.',
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
          404: {
            description:
              'The document does not exist or is not accessible by the authenticated user.',
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
        summary: 'Update user editor preferences',
        tags: ['Editor Settings'],
        description:
          "Updates the authenticated user's editor preferences and configuration. Includes settings for theme, font size, line height, tab size, word wrap, spell check, auto-save, and other editor behavior customizations. All fields are optional - only provided fields will be updated.",
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: editorSettingsSchema },
          },
        },
        responses: {
          200: {
            description:
              'Editor settings updated successfully. Returns the complete updated settings object.',
            content: {
              'application/json': { schema: editorSettingsSchema },
            },
          },
          404: {
            description:
              'Editor settings not found. This may occur if the user account was not properly initialized.',
          },
        },
      },
    },
    '/api/favorites': {
      get: {
        summary: 'List user favorite documents',
        tags: ['Favorites'],
        description:
          "Retrieves a paginated list of the authenticated user's favorite documents. Favorites allow users to bookmark frequently accessed documents for quick navigation. Supports filtering by document type, space, parent, and search term. Results include full document metadata and last viewed timestamps.",
        requestParams: { query: documentFiltersSchema.extend(paginationQuerySchema.shape) },
        responses: {
          200: {
            description:
              'Paginated list of favorite documents with metadata including total count and page information.',
            content: {
              'application/json': { schema: paginatedResultSchema(documentListItemSchema) },
            },
          },
        },
      },
    },
    '/api/favorites/{documentId}': {
      post: {
        summary: 'Add document to favorites',
        tags: ['Favorites'],
        description:
          "Adds a document to the authenticated user's favorites collection. If the document is already favorited, the operation is idempotent and updates the favorite timestamp. Favoriting a document makes it easily accessible from the favorites list.",
        requestParams: { path: documentIdParamSchema },
        responses: {
          201: {
            description:
              'Document added to favorites successfully. Returns the favorite record with document and user IDs.',
            content: {
              'application/json': { schema: favoriteSchema },
            },
          },
          404: {
            description:
              'The document does not exist or is not accessible by the authenticated user.',
          },
        },
      },
      delete: {
        summary: 'Remove document from favorites',
        tags: ['Favorites'],
        description:
          "Removes a document from the authenticated user's favorites collection. The document itself is not affected - only the favorite bookmark is removed. This operation is idempotent.",
        requestParams: { path: documentIdParamSchema },
        responses: {
          204: {
            description: 'Document removed from favorites successfully. No content returned.',
          },
          404: {
            description:
              'The document does not exist or is not accessible by the authenticated user.',
          },
        },
      },
    },
    '/api/revisions/{revisionId}': {
      get: {
        summary: 'Get revision details',
        tags: ['Revisions'],
        description:
          'Retrieves the full details of a specific revision by its unique ID. Returns revision metadata, content checksum, and a URL to fetch the actual revision content. Useful for viewing historical versions or comparing revisions.',
        requestParams: { path: revisionIdParamSchema },
        responses: {
          200: {
            description:
              'Revision found. Returns revision metadata including ID, document reference, timestamp, and content URL.',
            content: {
              'application/json': { schema: plainRevisionSchema },
            },
          },
          404: {
            description:
              'The revision does not exist or is not accessible by the authenticated user.',
          },
        },
      },
      patch: {
        summary: 'Update revision metadata or content',
        tags: ['Revisions'],
        description:
          "Updates a revision's metadata (such as revision name) or content. Can be used to rename a revision for better organization, or to update the revision content and checksum. Supports partial updates - only provided fields will be modified.",
        requestParams: { path: revisionIdParamSchema },
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: updateRevisionSchema },
          },
        },
        responses: {
          200: {
            description: 'Revision updated successfully. Returns the updated revision metadata.',
            content: {
              'application/json': { schema: plainRevisionSchema },
            },
          },
          404: {
            description:
              'The revision does not exist or is not accessible by the authenticated user.',
          },
        },
      },
      delete: {
        summary: 'Delete a revision',
        tags: ['Revisions'],
        description:
          "Permanently deletes a revision from the document's version history. This action cannot be undone. The revision content file is also removed from storage. Cannot delete the current active revision of a document.",
        requestParams: { path: revisionIdParamSchema },
        responses: {
          204: {
            description: 'Revision deleted successfully. No content returned.',
          },
          404: {
            description:
              'The revision does not exist or is not accessible by the authenticated user.',
          },
        },
      },
    },
    '/api/revisions': {
      post: {
        summary: 'Create a new document revision',
        tags: ['Revisions'],
        description:
          'Creates a new revision (version snapshot) for a document. Each revision captures the complete state of the document content at a point in time. Revisions enable version history, undo/redo, and content recovery. Optionally set the new revision as the current active revision for the document.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: createRevisionSchema },
          },
        },
        responses: {
          201: {
            description:
              'Revision created successfully. Returns the revision metadata including ID, timestamp, and content URL.',
            content: {
              'application/json': { schema: plainRevisionSchema },
            },
          },
          404: {
            description:
              'The document does not exist or is not accessible by the authenticated user.',
          },
        },
      },
    },
    '/storage/revisions/{revisionId}': {
      get: {
        summary: 'Download revision content file',
        tags: ['Storage'],
        description:
          'Downloads the raw content file for a specific revision. Returns the actual revision content as a file download. This endpoint is used to retrieve the full document content for a specific version, typically for rendering or comparison purposes.',
        requestParams: { path: revisionIdParamSchema },
        responses: {
          200: {
            description:
              'Revision content file returned successfully. The response body contains the raw file content.',
            content: {
              'application/octet-stream': {
                schema: z.string(),
              },
            },
          },
          404: {
            description:
              'The revision does not exist or is not accessible by the authenticated user.',
          },
        },
      },
    },
    '/storage/attachments/{documentId}/{filename}': {
      get: {
        summary: 'Download document attachment',
        tags: ['Storage'],
        description:
          'Downloads an attachment file from a document. Returns the raw file content for the specified attachment. Used to serve images, PDFs, and other embedded files referenced in document content.',
        requestParams: {
          path: documentIdParamSchema.extend({
            filename: z.string().describe('The filename of the attachment to download'),
          }),
        },
        responses: {
          200: {
            description:
              'Attachment file returned successfully. The response body contains the raw file content with appropriate content-type header.',
            content: {
              'application/octet-stream': {
                schema: z.string(),
              },
            },
          },
          404: {
            description:
              'The document does not exist or is not accessible by the authenticated user.',
          },
        },
      },
    },
    '/storage/attachments/{documentId}': {
      post: {
        summary: 'Upload document attachment',
        tags: ['Storage'],
        description:
          "Uploads a file attachment to a document. Attachments can be images, PDFs, or other files embedded or referenced within the document content. Maximum file size is 10MB. The uploaded file is stored in the document's attachment directory and a URL is returned for referencing the file.",
        requestParams: { path: documentIdParamSchema },
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: z.object({
                attachments: z.string().describe('The file to upload (single file)'),
              }),
            },
          },
        },
        responses: {
          201: {
            description:
              'Attachment uploaded successfully. Returns the URL to access the uploaded file.',
            content: {
              'application/json': {
                schema: z.object({
                  url: z.string().describe('URL path to access the uploaded attachment'),
                }),
              },
            },
          },
          404: {
            description:
              'The document does not exist or is not accessible by the authenticated user.',
          },
        },
      },
    },
  },
  security: [{ apiKeyCookie: [], bearerAuth: [] }],
});
