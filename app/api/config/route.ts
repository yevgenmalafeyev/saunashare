import { NextRequest } from 'next/server';
import { getConfigValue } from '@/lib/auth/tokens';
import { apiSuccess, apiError } from '@/lib/utils/api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return apiError('Key is required', 400);
  }

  // Only allow fetching phone numbers, not tokens
  if (!key.endsWith('-phone')) {
    return apiError('Invalid key', 400);
  }

  const value = await getConfigValue(key);
  return apiSuccess({ key, value });
}
