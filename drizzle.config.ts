import { defineConfig } from 'drizzle-kit';

const dbUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  ...(dbUrl ? {
    driver: 'turso' as const,
    dbCredentials: {
      url: dbUrl,
      authToken: authToken,
    },
  } : {
    dbCredentials: {
      url: 'file:./cv_data.db',
    },
  }),
});
