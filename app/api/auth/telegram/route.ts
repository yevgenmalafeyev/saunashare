/**
 * Telegram Mini App authentication endpoint
 * Validates Telegram init data and sets auth cookie
 */

import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { telegramUsers, participants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { validateTelegramAuth } from '@/lib/telegram/validation';
import { ADMIN_TOKEN, USER_TOKEN, ROLE_COOKIE_NAME, COOKIE_MAX_AGE } from '@/lib/auth/constants';
import { apiSuccess, apiError } from '@/lib/utils/api';

export async function POST(request: Request) {
  try {
    const { initData, manualToken } = await request.json();

    if (!initData) {
      return apiError('Missing initData', 400);
    }

    // Validate Telegram auth (signature check)
    const authResult = await validateTelegramAuth(initData);

    if (!authResult.success) {
      return apiError(authResult.error || 'Authentication failed', 401);
    }

    // Get or create telegram user record
    let [existingTelegramUser] = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramUserId, authResult.telegramUserId));

    let linkedParticipantId: number | null = null;
    let linkedParticipantName: string | null = null;
    let finalRole: 'admin' | 'user' | null = null;
    let accessGranted = false;

    // Determine access
    if (authResult.isWhitelisted) {
      // User is in whitelist - grant access
      accessGranted = true;
      finalRole = authResult.role;
    } else if (existingTelegramUser?.grantedRole) {
      // User has previously been granted access via token
      accessGranted = true;
      finalRole = existingTelegramUser.grantedRole as 'admin' | 'user';
    } else if (manualToken) {
      // User is trying to authenticate with a manual token
      if (manualToken === ADMIN_TOKEN) {
        accessGranted = true;
        finalRole = 'admin';
      } else if (manualToken === USER_TOKEN) {
        accessGranted = true;
        finalRole = 'user';
      } else {
        return apiError('Invalid token', 401);
      }
    }

    // Update or create telegram user record
    if (existingTelegramUser) {
      await db
        .update(telegramUsers)
        .set({
          telegramUsername: authResult.username,
          telegramFirstName: authResult.firstName,
          grantedRole: finalRole || existingTelegramUser.grantedRole,
          updatedAt: new Date(),
        })
        .where(eq(telegramUsers.id, existingTelegramUser.id));

      linkedParticipantId = existingTelegramUser.participantId;

      // Get linked participant name if exists
      if (linkedParticipantId) {
        const [participant] = await db
          .select()
          .from(participants)
          .where(eq(participants.id, linkedParticipantId));
        linkedParticipantName = participant?.name ?? null;
      }
    } else {
      // Create new record
      const result = await db.insert(telegramUsers).values({
        telegramUserId: authResult.telegramUserId,
        telegramUsername: authResult.username,
        telegramFirstName: authResult.firstName,
        grantedRole: finalRole,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      existingTelegramUser = result[0];
    }

    // If access not granted, return without setting cookie
    if (!accessGranted || !finalRole) {
      return apiSuccess({
        success: false,
        accessDenied: true,
        telegramUserId: authResult.telegramUserId,
        username: authResult.username,
        firstName: authResult.firstName,
      });
    }

    // Set the role cookie
    const cookieStore = await cookies();
    cookieStore.set(ROLE_COOKIE_NAME, finalRole, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return apiSuccess({
      success: true,
      role: finalRole,
      telegramUserId: authResult.telegramUserId,
      username: authResult.username,
      firstName: authResult.firstName,
      linkedParticipantId,
      linkedParticipantName,
    });
  } catch (error) {
    console.error('Telegram auth error:', error);
    return apiError('Internal server error', 500);
  }
}

/**
 * Link or update Telegram user to participant
 */
export async function PATCH(request: Request) {
  try {
    const { telegramUserId, participantId } = await request.json();

    if (!telegramUserId) {
      return apiError('Missing telegramUserId', 400);
    }

    // Find the telegram user
    const [telegramUser] = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramUserId, telegramUserId));

    if (!telegramUser) {
      return apiError('Telegram user not found', 404);
    }

    // Update the participant link
    await db
      .update(telegramUsers)
      .set({
        participantId: participantId || null,
        updatedAt: new Date(),
      })
      .where(eq(telegramUsers.id, telegramUser.id));

    return apiSuccess({ success: true });
  } catch (error) {
    console.error('Telegram link error:', error);
    return apiError('Internal server error', 500);
  }
}
