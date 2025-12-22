import { createDocument } from 'zod-openapi';
import { createDocumentSchema, documentDetailsSchema } from '../schemas/documents.js';

export const openApiDocument = createDocument({
  openapi: '3.0.0',
  info: {
    title: 'Wordy API',
    version: '1.0.0',
    description: 'API documentation for the Wordy application.',
  },
  paths: {
    '/api/documents': {
      post: {
        summary: 'Create Document',
        tags: ['Documents'],
        requestBody: {
          content: {
            'application/json': { schema: createDocumentSchema },
          },
        },
        responses: {
          201: {
            content: {
              'application/json': { schema: documentDetailsSchema },
            },
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
