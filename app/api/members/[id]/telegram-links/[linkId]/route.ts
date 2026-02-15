import { db } from '@/lib/db';
import { telegramUserParticipants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getApiRole } from '@/lib/auth/api-auth';
import { apiSuccess, apiError, parseRouteParams } from '@/lib/utils/api';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  const role = await getApiRole();
  if (role !== 'admin') return apiError('Forbidden', 403);

  const { linkId } = await parseRouteParams(params);

  const deleted = await db
    .delete(telegramUserParticipants)
    .where(eq(telegramUserParticipants.id, linkId))
    .returning();

  if (deleted.length === 0) {
    return apiError('Link not found', 404);
  }

  return apiSuccess({ ok: true });
}
