import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, openAPI } from "better-auth/plugins";
import { db } from "./db.js";
import { setEditorInitialSettings } from "../services/editor-settings.js";

export const adapter = drizzleAdapter(db, {
  provider: "sqlite",
  usePlural: true,
});

export const auth = betterAuth({
  database: adapter,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [bearer(), openAPI()],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await setEditorInitialSettings(user.id, {
            keepPreviousRevision: false,
            autosave: false,
          });
        },
      },
    },
  },
});
