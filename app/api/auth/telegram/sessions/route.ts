/**
 * Returns sessions where linked participants are checked in.
 * GET /api/auth/telegram/sessions?participantIds=1,2,3
 */

import { db } from '@/lib/db';
import { sessions, sessionParticipants } from '@/lib/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { apiSuccess, apiError } from '@/lib/utils/api';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const raw = url.searchParams.get('participantIds');

    if (!raw) {
      return apiError('Missing participantIds', 400);
    }

    const ids = raw.split(',').map(Number).filter(n => !isNaN(n) && n > 0);
    if (ids.length === 0) {
      return apiSuccess({});
    }

    // Find all session_participants rows for these participants in non-hidden sessions
    const rows = await db
      .select({
        sessionId: sessionParticipants.sessionId,
        participantId: sessionParticipants.participantId,
        sessionParticipantId: sessionParticipants.id,
        hidden: sessions.hidden,
      })
      .from(sessionParticipants)
      .innerJoin(sessions, eq(sessions.id, sessionParticipants.sessionId))
      .where(
        and(
          inArray(sessionParticipants.participantId, ids),
          eq(sessions.hidden, false),
        )
      );

    // Build map: sessionId -> { participantId, sessionParticipantId }
    const result: Record<number, { participantId: number; sessionParticipantId: number }> = {};
    for (const row of rows) {
      // Only keep the first match per session (user might have multiple linked participants in same session)
      if (!result[row.sessionId]) {
        result[row.sessionId] = {
          participantId: row.participantId,
          sessionParticipantId: row.sessionParticipantId,
        };
      }
    }

    return apiSuccess(result);
  } catch (error) {
    console.error('Telegram sessions error:', error);
    return apiError('Internal server error', 500);
  }
}
