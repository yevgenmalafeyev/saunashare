import { db } from '@/lib/db';
import { participants, sessionParticipants, sessions } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { apiSuccess } from '@/lib/utils/api';

export async function GET() {
  const allParticipants = await db
    .select()
    .from(participants)
    .orderBy(desc(participants.activityScore));

  // Get the most recent person count for each participant
  const participantsWithRecentCount = await Promise.all(
    allParticipants.map(async (p) => {
      const recentSession = await db
        .select({ personCount: sessionParticipants.personCount })
        .from(sessionParticipants)
        .innerJoin(sessions, eq(sessions.id, sessionParticipants.sessionId))
        .where(eq(sessionParticipants.participantId, p.id))
        .orderBy(desc(sessions.createdAt))
        .limit(1);

      return {
        ...p,
        recentPersonCount: recentSession[0]?.personCount ?? 1,
      };
    })
  );

  return apiSuccess(participantsWithRecentCount);
}
