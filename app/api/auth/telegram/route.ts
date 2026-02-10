/**
 * Telegram Mini App authentication endpoint
 * Validates Telegram init data and sets auth cookie
 */

import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { telegramUsers, telegramUserParticipants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { validateTelegramAuth } from '@/lib/telegram/validation';
import { ROLE_COOKIE_NAME, COOKIE_MAX_AGE, validateToken } from '@/lib/auth/constants';
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

    // Get or create telegram user record (check by numeric ID first, then by username for pre-seeded records)
    let [existingTelegramUser] = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramUserId, authResult.telegramUserId));

    if (!existingTelegramUser && authResult.username) {
      [existingTelegramUser] = await db
        .select()
        .from(telegramUsers)
        .where(eq(telegramUsers.telegramUsername, authResult.username));

      // Claim this pre-seeded record by updating to real Telegram user ID
      if (existingTelegramUser) {
        await db
          .update(telegramUsers)
          .set({ telegramUserId: authResult.telegramUserId })
          .where(eq(telegramUsers.id, existingTelegramUser.id));
      }
    }

    let linkedParticipantIds: number[] = [];
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
      const tokenRole = validateToken(manualToken);
      if (tokenRole) {
        accessGranted = true;
        finalRole = tokenRole;
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

      // Get linked participant IDs from junction table
      const linkedRows = await db
        .select({ participantId: telegramUserParticipants.participantId })
        .from(telegramUserParticipants)
        .where(eq(telegramUserParticipants.telegramUserId, existingTelegramUser.id));
      linkedParticipantIds = linkedRows.map(r => r.participantId);
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
      linkedParticipantIds,
    });
  } catch (error) {
    console.error('Telegram auth error:', error);
    return apiError('Internal server error', 500);
  }
}