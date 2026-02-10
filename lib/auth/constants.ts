/**
 * Auth constants and pure utilities — Edge-safe (no DB imports)
 * Used by middleware (Edge runtime) and server-side code alike.
 */

export type UserRole = 'admin' | 'user' | 'none';

export const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'cd3d0ebea24eb99fc7e7c220207b1dec';
export const USER_TOKEN = process.env.USER_TOKEN || 'f6b8fda5ba595d9233bc55f0675b2174';
export const ROLE_COOKIE_NAME = 'banha-role';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Validate a token against known constants. Returns the role or null if invalid. */
export function validateToken(token: string): 'admin' | 'user' | null {
  if (token === ADMIN_TOKEN) return 'admin';
  if (token === USER_TOKEN) return 'user';
  return null;
}

/** Check if a role should be upgraded (e.g. user → admin). */
export function shouldUpgradeRole(currentRole: string | undefined, newRole: 'admin' | 'user'): boolean {
  return !currentRole || currentRole === 'none' || (currentRole === 'user' && newRole === 'admin');
}
