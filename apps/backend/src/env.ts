import 'dotenv/config';
import z from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DB_FILE_NAME: z.string().default('file:storage/local.db'),
});

export const env = envSchema.parse(process.env);
