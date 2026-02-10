/**
 * API route authentication utilities
 */

import { cookies } from 'next/headers';
import { ROLE_COOKIE_NAME, type UserRole } from './constants';

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
