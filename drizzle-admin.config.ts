import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/auth/admin-schema.ts',
  out: './drizzle-admin',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_ADMIN_DB_URL!,
    authToken: process.env.TURSO_ADMIN_DB_TOKEN,
  },
});
