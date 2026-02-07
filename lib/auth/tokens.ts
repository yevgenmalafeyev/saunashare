/**
 * Token validation and role detection utilities
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

/**
 * Validate a token and return the corresponding role
 */
export async function validateToken(token: string): Promise<'admin' | 'user' | 'none'> {
  const adminToken = await getConfigValue('admin-token');
  const userToken = await getConfigValue('user-token');

  if (token === adminToken) {
    return 'admin';
  }
  if (token === userToken) {
    return 'user';
  }
  return 'none';
}

/**
 * Check if a role can be upgraded (user -> admin)
 */
export function shouldUpgradeRole(currentRole: 'admin' | 'user' | 'none', newRole: 'admin' | 'user' | 'none'): boolean {
  if (currentRole === 'none') return newRole !== 'none';
  if (currentRole === 'user') return newRole === 'admin';
  return false; // admin cannot be upgraded
}

/**
 * Get the phone number for a duty person
 */
export async function getDutyPersonPhone(dutyPerson: string): Promise<string | null> {
  const key = `${dutyPerson}-phone`;
  return getConfigValue(key);
}
