import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer, openAPI } from 'better-auth/plugins';
import { db } from './db.js';
import { env } from '../env.js';
import { setEditorSettings } from '../services/editor-settings.js';
import { createDocument } from '../services/documents.js';
import { dbWritesQueue } from '../queues/db-writes.js';

export const adapter = drizzleAdapter(db, {
  provider: 'sqlite',
  usePlural: true,
});

export const auth = betterAuth({
  database: adapter,
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [env.CLIENT_URL],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          dbWritesQueue.add(() =>
            createDocument(
              {
                name: 'My Workspace',
                documentType: 'space',
              },
              user.id,
            ),
          );
          dbWritesQueue.add(() => setEditorSettings(user.id, {}));
        },
      },
    },
  },
  plugins: [bearer(), openAPI()],
});
