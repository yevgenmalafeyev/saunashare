import { drizzle } from 'drizzle-orm/libsql';
import { createClient, type Config } from '@libsql/client';
import * as schema from './schema';
import { seedDatabase } from './seed';
import path from 'path';
import fs from 'fs';

/**
 * Resolve the libSQL connection config.
 *
 * - Production (Vercel): a remote Turso database via TURSO_DATABASE_URL +
 *   TURSO_AUTH_TOKEN.
 * - Local / self-hosted: a file-backed libSQL database under ./data, which is
 *   wire-compatible with the SQLite file the app used previously.
 */
function resolveConfig(): Config {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    return { url, authToken: process.env.TURSO_AUTH_TOKEN };
  }

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return { url: `file:${path.join(dataDir, 'banha.db')}` };
}

export const client = createClient(resolveConfig());

export const db = drizzle(client, { schema });

export * from './queries';

/**
 * In development the local database may be empty on first run, so we seed it
 * idempotently. Production is provisioned from the imported SQL dump (or via
 * `npm run db:push` + the dump), so per-cold-start seeding is skipped to keep
 * serverless cold starts fast and avoid redundant writes to Turso.
 *
 * Cascading deletes are handled explicitly in the route handlers (see the
 * delete handlers under app/api/...), so the app does not depend on the
 * `foreign_keys` PRAGMA being enabled — important because it is off by default
 * on Turso and does not stick across Turso's stateless HTTP connections.
 */
export const dbReady: Promise<void> =
  process.env.NODE_ENV === 'production'
    ? Promise.resolve()
    : seedDatabase(db).catch((err) => {
        console.error('[db] seeding failed:', err);
      });
