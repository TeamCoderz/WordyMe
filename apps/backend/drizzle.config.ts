import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    out: './drizzle',
    schema: './src/schemas/index.ts',
    dialect: 'sqlite',
    dbCredentials: {
    // @ts-expect-error
    url: process.env.DB_FILE_NAME,
  },
});
