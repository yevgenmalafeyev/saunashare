import { db } from '@/lib/db';
import { telegramUsers, telegramUserParticipants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getApiRole } from '@/lib/auth/api-auth';
import { apiSuccess, apiError, parseRouteParams } from '@/lib/utils/api';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getApiRole();
  if (role !== 'admin') return apiError('Forbidden', 403);

  const { id: participantId } = await parseRouteParams(params);
  const body = await request.json();

  let telegramUserId: number;

  if (body.telegramUserId && typeof body.telegramUserId === 'number') {
    // Link to existing telegram user by ID
    telegramUserId = body.telegramUserId;
  } else if (body.telegramUsername && typeof body.telegramUsername === 'string') {
    // Pre-seed a new telegram user by username, or find existing
    const username = body.telegramUsername.replace(/^@/, '').trim();
    if (!username) return apiError('Invalid telegram username');

    const [existing] = await db
      .select({ id: telegramUsers.id })
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramUsername, username));

    if (existing) {
      telegramUserId = existing.id;
    } else {
      const firstName = typeof body.firstName === 'string' ? body.firstName.trim() || null : null;
      const [created] = await db
        .insert(telegramUsers)
        .values({
          telegramUserId: `placeholder_${username}`,
          telegramUsername: username,
          telegramFirstName: firstName,
          grantedRole: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      telegramUserId = created.id;
    }
  } else {
    return apiError('telegramUserId (number) or telegramUsername (string) is required');
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
