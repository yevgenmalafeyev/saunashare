import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { sessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { parseRouteParams, apiError, apiSuccess } from '@/lib/utils/api';
import { validateUpdateSession, validatePatchSession, validateAndRespond } from '@/lib/validation/schemas';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id: sessionId } = await parseRouteParams(params);

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId));

  if (!session) {
    return apiError('Session not found', 404);
  }

  return apiSuccess(session);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id: sessionId } = await parseRouteParams(params);
  const body = await request.json();
  const validated = validateAndRespond(validateUpdateSession, body);
  if (validated.error) return validated.error;

  const [session] = await db
    .update(sessions)
    .set({ name: validated.data.name, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId))
    .returning();

  return apiSuccess(session);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id: sessionId } = await parseRouteParams(params);
  const body = await request.json();
  const validated = validateAndRespond(validatePatchSession, body);
  if (validated.error) return validated.error;

  const [session] = await db
    .update(sessions)
    .set({ hidden: validated.data.hidden, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId))
    .returning();

  return apiSuccess(session);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id: sessionId } = await parseRouteParams(params);

  await db.delete(sessions).where(eq(sessions.id, sessionId));

  return apiSuccess({ success: true });
}
