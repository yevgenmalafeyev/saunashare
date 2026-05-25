import type { Config } from 'drizzle-kit';

// Remote Turso when env is set, otherwise the local file-backed libSQL db.
const url = process.env.TURSO_DATABASE_URL ?? 'file:./data/banha.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: { url, authToken },
} satisfies Config;
