import { getApiRole } from '@/lib/auth/api-auth';
import { apiSuccess } from '@/lib/utils/api';

export async function GET() {
  const role = await getApiRole();
  return apiSuccess({ role });
}
