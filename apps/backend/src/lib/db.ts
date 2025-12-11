import { drizzle } from 'drizzle-orm/libsql';
import { env } from '../env.js';
import * as schema from '../schemas/index.js';

export const db = drizzle(env.DB_FILE_NAME, { schema });
