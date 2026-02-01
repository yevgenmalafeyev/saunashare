/**
 * Token validation and role detection utilities
 */

import { db } from '@/lib/db';
import { appConfig } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export type UserRole = 'admin' | 'user' | 'none';

export const ROLE_COOKIE_NAME = 'banha-role';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

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
export async function validateToken(token: string): Promise<UserRole> {
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
export function shouldUpgradeRole(currentRole: UserRole, newRole: UserRole): boolean {
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
