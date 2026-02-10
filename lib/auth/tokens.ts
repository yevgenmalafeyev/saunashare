/**
 * Database-backed config utilities
 */

import { db } from '@/lib/db';
import { appConfig } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export type { UserRole } from './constants';
export { ROLE_COOKIE_NAME, COOKIE_MAX_AGE } from './constants';

/**
 * Get a config value from the database
 */
export async function getConfigValue(key: string): Promise<string | null> {
  const [config] = await db
    .select()
    .from(appConfig)
    .where(eq(appConfig.key, key));
  return config?.value ?? null;
}
