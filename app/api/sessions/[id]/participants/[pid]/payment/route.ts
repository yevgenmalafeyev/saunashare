import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { sessionParticipantMeta } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { parseRouteParams, apiSuccess } from '@/lib/utils/api';

type RouteParams = { params: Promise<{ id: string; pid: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { pid: sessionParticipantId } = await parseRouteParams(params);

  const [meta] = await db
    .select()
    .from(sessionParticipantMeta)
    .where(eq(sessionParticipantMeta.sessionParticipantId, sessionParticipantId));

  if (!meta) {
    return apiSuccess({ hasPaid: false, joinedAt: null });
  }

  return apiSuccess({ hasPaid: meta.hasPaid, joinedAt: meta.joinedAt });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { pid: sessionParticipantId } = await parseRouteParams(params);
  const body = await request.json();
  const hasPaid = body.hasPaid === true;

  // Check if meta record exists
  const [existingMeta] = await db
    .select()
    .from(sessionParticipantMeta)
    .where(eq(sessionParticipantMeta.sessionParticipantId, sessionParticipantId));

  if (existingMeta) {
    // Update existing record
    await db
      .update(sessionParticipantMeta)
      .set({ hasPaid })
      .where(eq(sessionParticipantMeta.id, existingMeta.id));
  } else {
    // Create new record
    await db.insert(sessionParticipantMeta).values({
      sessionParticipantId,
      hasPaid,
      joinedAt: new Date(),
    });
  }

  return apiSuccess({ hasPaid });
}
