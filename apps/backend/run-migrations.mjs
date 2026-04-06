import { migrate } from 'drizzle-orm/libsql/migrator';
import { drizzle } from 'drizzle-orm/libsql';

const db = drizzle(process.env.DB_FILE_NAME);
await migrate(db, { migrationsFolder: './drizzle' });
console.log('Migrations completed.');
