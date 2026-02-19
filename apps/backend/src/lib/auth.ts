/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { betterAuth, BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer, customSession, openAPI, username } from 'better-auth/plugins';
import { db } from './db.js';
import { env } from '../env.js';
import { getEditorSettings, setEditorSettings } from '../services/editor-settings.js';
import { createDocument } from '../services/documents.js';
import { dbWritesQueue } from '../queues/db-writes.js';

export const adapter = drizzleAdapter(db, {
  provider: 'sqlite',
  usePlural: true,
});

export const options = {
  database: adapter,
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: env.CLIENT_URL,
  user: {
    additionalFields: {
      cover: {
        type: 'string',
        required: false,
      },
      bio: {
        type: 'string',
        required: false,
      },
      jobTitle: {
        type: 'string',
        required: false,
      },
      imageMeta: {
        type: 'json',
        defaultValue: '{}',
        required: false,
      },
      coverMeta: {
        type: 'json',
        defaultValue: '{}',
        required: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          dbWritesQueue.add(() =>
            createDocument(
              {
                name: 'My Workspace',
                documentType: 'space',
                icon: 'briefcase',
                position: 'a0',
                isContainer: false,
              },
              user.id,
            ),
          );
          dbWritesQueue.add(() => setEditorSettings(user.id, {}));
        },
      },
    },
  },
  plugins: [bearer(), openAPI(), username()],
} as const satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...options,
  plugins: [
    ...options.plugins,
    customSession(async ({ user, session }) => {
      return {
        session,
        user,
        editorSettings: await getEditorSettings(user.id),
      };
    }, options),
  ],
});
