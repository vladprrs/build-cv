import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client/web';
import * as schema from './schema';

// For Edge Runtime (Vercel)
export const getDb = () => {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return drizzle(client, { schema });
};

// For local development (file-based SQLite)
export const getLocalDb = () => {
  const client = createClient({
    url: process.env.LOCAL_DB_PATH || 'file:./cv_data.db',
  });
  return drizzle(client, { schema });
};

// Export db instance based on environment
export const db = process.env.TURSO_DATABASE_URL ? getDb() : getLocalDb();
