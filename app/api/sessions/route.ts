import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { sessions, sessionParticipants, expenses } from '@/lib/db/schema';
import { desc, sql } from 'drizzle-orm';
import { DEFAULT_EXPENSE_NAME } from '@/lib/constants';
import { apiSuccess } from '@/lib/utils/api';
import { validateCreateSession, validateAndRespond } from '@/lib/validation/schemas';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const includeHidden = searchParams.get('includeHidden') === 'true';

  const allSessions = await db
    .select({
      id: sessions.id,
      name: sessions.name,
      hidden: sessions.hidden,
      createdAt: sessions.createdAt,
      participantCount: sql<number>`(
        SELECT COALESCE(SUM(${sessionParticipants.personCount}), 0)
        FROM ${sessionParticipants}
        WHERE ${sessionParticipants.sessionId} = ${sessions.id}
      )`,
    })
    .from(sessions)
    .orderBy(desc(sessions.createdAt));

  // Always return consistent shape
  const visible = includeHidden ? allSessions : allSessions.filter(s => !s.hidden);
  const hiddenCount = allSessions.filter(s => s.hidden).length;

  return apiSuccess({ sessions: visible, hiddenCount });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validated = validateAndRespond(validateCreateSession, body);
  if (validated.error) return validated.error;

  const [session] = await db
    .insert(sessions)
    .values({ name: validated.data.name })
    .returning();

  // Auto-create default expense
  await db.insert(expenses).values({
    sessionId: session.id,
    name: DEFAULT_EXPENSE_NAME,
    itemCount: 1,
  });

  return apiSuccess(session, 201);
}
