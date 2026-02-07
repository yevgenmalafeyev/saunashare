/**
 * API utilities for route handlers
 */

/**
 * Parse route params and extract numeric IDs
 */
export async function parseRouteParams<T extends Record<string, string>>(
  params: Promise<T>
): Promise<{ [K in keyof T]: number }> {
  const resolved = await params;
  const result = {} as { [K in keyof T]: number };

  for (const key in resolved) {
    const parsed = parseInt(resolved[key], 10);
    if (isNaN(parsed)) {
      throw new Error(`Invalid route param "${key}": expected a number, got "${resolved[key]}"`);
    }
    result[key] = parsed;
  }

  return result;
}

/**
 * Standard API error response
 */
export function apiError(message: string, status: number = 400) {
  return Response.json({ error: message }, { status });
}

/**
 * Standard API success response
 */
export function apiSuccess<T>(data: T, status: number = 200) {
  return Response.json(data, { status });
}
