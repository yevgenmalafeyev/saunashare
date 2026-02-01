/**
 * API route authentication utilities
 */

import { cookies } from 'next/headers';
import { ROLE_COOKIE_NAME, type UserRole } from './tokens';

/**
 * Get the current user's role from cookies (for API routes)
 */
export async function getApiRole(): Promise<UserRole> {
  const cookieStore = await cookies();
  const role = cookieStore.get(ROLE_COOKIE_NAME)?.value;
  if (role === 'admin' || role === 'user') {
    return role;
  }
  return 'none';
}

/**
 * Check if the current request has admin access
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getApiRole();
  return role === 'admin';
}

/**
 * Check if the current request has any valid access (user or admin)
 */
export async function hasAccess(): Promise<boolean> {
  const role = await getApiRole();
  return role !== 'none';
}
