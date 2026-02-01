/**
 * Client-side API utilities for consistent fetch handling
 */

import { JSON_HEADERS } from '@/lib/constants';

interface FetchAPIOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/**
 * Fetch wrapper with automatic JSON handling and error responses
 */
export async function fetchAPI<T>(
  url: string,
  options: FetchAPIOptions = {}
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: options.body ? JSON_HEADERS : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return { ok: false, error: errorData.error || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

/**
 * Simple POST helper
 */
export async function postAPI<T>(url: string, body: unknown): Promise<T | null> {
  const result = await fetchAPI<T>(url, { method: 'POST', body });
  return result.ok ? result.data : null;
}

/**
 * Simple PATCH helper
 */
export async function patchAPI<T>(url: string, body: unknown): Promise<T | null> {
  const result = await fetchAPI<T>(url, { method: 'PATCH', body });
  return result.ok ? result.data : null;
}

/**
 * Simple DELETE helper
 */
export async function deleteAPI(url: string): Promise<boolean> {
  const result = await fetchAPI(url, { method: 'DELETE' });
  return result.ok;
}
