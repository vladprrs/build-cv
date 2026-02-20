import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client/web';
import * as schema from '@/auth/admin-schema';

let adminDbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export const getAdminDb = () => {
  if (adminDbInstance) return adminDbInstance;

  const url = process.env.TURSO_ADMIN_DB_URL;
  const authToken = process.env.TURSO_ADMIN_DB_TOKEN;

  if (!url) {
    throw new Error('TURSO_ADMIN_DB_URL is not set');
  }

  const client = createClient({ url, authToken });
  adminDbInstance = drizzle(client, { schema });
  return adminDbInstance;
};
