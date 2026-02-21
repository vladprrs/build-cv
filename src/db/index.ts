import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client/web';
import * as schema from './schema';

type DrizzleInstance = ReturnType<typeof drizzle<typeof schema>>;

// Connection cache for per-user databases
const connectionCache = new Map<string, DrizzleInstance>();

// For Edge Runtime (Vercel) — owner's default DB
export const getOwnerDb = (): DrizzleInstance => {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return drizzle(client, { schema });
};

// For local development (file-based SQLite)
export const getLocalDb = (): DrizzleInstance => {
  const client = createClient({
    url: process.env.LOCAL_DB_PATH || 'file:./cv_data.db',
  });
  return drizzle(client, { schema });
};

// Backward-compatible default export
export const db = process.env.TURSO_DATABASE_URL ? getOwnerDb() : getLocalDb();

/**
 * Get a Drizzle instance for a specific user's database.
 * Looks up credentials in admin DB's userDatabases table, caches connections.
 */
export async function getUserDb(userId: string): Promise<DrizzleInstance> {
  // Check cache first
  const cached = connectionCache.get(userId);
  if (cached) return cached;

  // Look up user's DB credentials from admin DB
  const { getAdminDb } = await import('./admin');
  const { userDatabases } = await import('@/auth/admin-schema');
  const { eq } = await import('drizzle-orm');

  const adminDb = getAdminDb();
  const result = await adminDb
    .select()
    .from(userDatabases)
    .where(eq(userDatabases.userId, userId))
    .limit(1);

  const userDb = result[0];
  if (!userDb) {
    throw new Error(`No database found for user ${userId}`);
  }

  if (userDb.status !== 'ready') {
    throw new Error(`User database is not ready (status: ${userDb.status})`);
  }

  // Create and cache connection
  const client = createClient({
    url: userDb.tursoDbUrl,
    authToken: userDb.tursoAuthToken,
  });
  const instance = drizzle(client, { schema });
  connectionCache.set(userId, instance);

  return instance;
}

/**
 * Create a Drizzle instance from explicit credentials (used during provisioning).
 */
export function createDbFromCredentials(url: string, authToken: string): DrizzleInstance {
  const client = createClient({ url, authToken });
  return drizzle(client, { schema });
}
