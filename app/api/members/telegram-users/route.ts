import { db } from '@/lib/db';
import { telegramUsers, telegramUserParticipants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getApiRole } from '@/lib/auth/api-auth';
import { apiSuccess, apiError } from '@/lib/utils/api';
import type { TelegramUserOption } from '@/lib/types';

export async function GET() {
  const role = await getApiRole();
  if (role !== 'admin') return apiError('Forbidden', 403);

  const allTelegramUsers = await db
    .select({
      id: telegramUsers.id,
      telegramUsername: telegramUsers.telegramUsername,
      telegramFirstName: telegramUsers.telegramFirstName,
      grantedRole: telegramUsers.grantedRole,
    })
    .from(telegramUsers);

  const allLinks = await db
    .select({
      telegramUserId: telegramUserParticipants.telegramUserId,
      participantId: telegramUserParticipants.participantId,
    })
    .from(telegramUserParticipants);

  const linksByTelegramUser = new Map<number, number[]>();
  for (const link of allLinks) {
    const existing = linksByTelegramUser.get(link.telegramUserId) || [];
    existing.push(link.participantId);
    linksByTelegramUser.set(link.telegramUserId, existing);
  }

  const options: TelegramUserOption[] = allTelegramUsers.map((tu) => ({
    id: tu.id,
    telegramUsername: tu.telegramUsername,
    telegramFirstName: tu.telegramFirstName,
    grantedRole: tu.grantedRole,
    linkedParticipantIds: linksByTelegramUser.get(tu.id) || [],
  }));

  return apiSuccess(options);
}
