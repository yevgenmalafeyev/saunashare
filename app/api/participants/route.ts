import { db } from '@/lib/db';
import { participants, sessionParticipants, sessions } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { apiSuccess } from '@/lib/utils/api';

export async function GET() {
  const allParticipants = await db
    .select()
    .from(participants)
    .orderBy(desc(participants.activityScore));

  // Batch query: get the most recent person count for each participant
  // Uses a subquery to find the latest session each participant attended,
  // then gets the personCount from that session_participant row.
  const recentCounts = await db
    .select({
      participantId: sessionParticipants.participantId,
      personCount: sessionParticipants.personCount,
    })
    .from(sessionParticipants)
    .innerJoin(sessions, eq(sessions.id, sessionParticipants.sessionId))
    .where(
      sql`${sessionParticipants.id} IN (
        SELECT sp2.id FROM session_participants sp2
        INNER JOIN sessions s2 ON s2.id = sp2.session_id
        WHERE sp2.participant_id = ${sessionParticipants.participantId}
        ORDER BY s2.created_at DESC
        LIMIT 1
      )`
    );

  const countMap = new Map<number, number>();
  for (const row of recentCounts) {
    countMap.set(row.participantId, row.personCount);
  }

  const participantsWithRecentCount = allParticipants.map((p) => ({
    ...p,
    recentPersonCount: countMap.get(p.id) ?? 1,
  }));

  return apiSuccess(participantsWithRecentCount);
}
