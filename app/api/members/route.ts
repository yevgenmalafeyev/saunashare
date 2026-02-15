import { db } from '@/lib/db';
import { participants, telegramUserParticipants, telegramUsers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getApiRole } from '@/lib/auth/api-auth';
import { apiSuccess, apiError } from '@/lib/utils/api';
import type { Member } from '@/lib/types';

export async function GET() {
  const role = await getApiRole();
  if (role !== 'admin') return apiError('Forbidden', 403);

  const allParticipants = await db
    .select({
      id: participants.id,
      name: participants.name,
      activityScore: participants.activityScore,
    })
    .from(participants);

  const allLinks = await db
    .select({
      id: telegramUserParticipants.id,
      participantId: telegramUserParticipants.participantId,
      telegramUserId: telegramUserParticipants.telegramUserId,
      telegramUsername: telegramUsers.telegramUsername,
      telegramFirstName: telegramUsers.telegramFirstName,
    })
    .from(telegramUserParticipants)
    .innerJoin(telegramUsers, eq(telegramUserParticipants.telegramUserId, telegramUsers.id));

  const linksByParticipant = new Map<number, Member['telegramLinks']>();
  for (const link of allLinks) {
    const existing = linksByParticipant.get(link.participantId) || [];
    existing.push({
      linkId: link.id,
      telegramUserId: link.telegramUserId,
      telegramUsername: link.telegramUsername,
      telegramFirstName: link.telegramFirstName,
    });
    linksByParticipant.set(link.participantId, existing);
  }

  const members: Member[] = allParticipants.map((p) => ({
    id: p.id,
    name: p.name,
    activityScore: p.activityScore,
    telegramLinks: linksByParticipant.get(p.id) || [],
  }));

  // Sort by activity score descending
  members.sort((a, b) => b.activityScore - a.activityScore);

  return apiSuccess(members);
}
