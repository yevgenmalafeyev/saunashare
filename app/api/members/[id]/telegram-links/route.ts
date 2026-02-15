import { db } from '@/lib/db';
import { telegramUserParticipants } from '@/lib/db/schema';
import { getApiRole } from '@/lib/auth/api-auth';
import { apiSuccess, apiError, parseRouteParams } from '@/lib/utils/api';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getApiRole();
  if (role !== 'admin') return apiError('Forbidden', 403);

  const { id: participantId } = await parseRouteParams(params);
  const { telegramUserId } = await request.json();

  if (!telegramUserId || typeof telegramUserId !== 'number') {
    return apiError('telegramUserId is required and must be a number');
  }

  try {
    const [link] = await db
      .insert(telegramUserParticipants)
      .values({ telegramUserId, participantId })
      .returning();

    return apiSuccess(link, 201);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint')) {
      return apiError('This telegram user is already linked to this participant', 409);
    }
    throw err;
  }
}
