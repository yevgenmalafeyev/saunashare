/**
 * Telegram Mini App init data validation
 */

import { validate, parse } from '@tma.js/init-data-node';
import type { TelegramAuthResult } from './types';

// Admin usernames from environment (comma-separated)
const ADMIN_USERNAMES = (process.env.TELEGRAM_ADMIN_USERNAMES || '')
  .split(',')
  .map((u) => u.trim().toLowerCase())
  .filter(Boolean);

// Non-admin whitelisted usernames from environment (comma-separated)
const USER_USERNAMES = (process.env.TELEGRAM_USER_USERNAMES || '')
  .split(',')
  .map((u) => u.trim().toLowerCase())
  .filter(Boolean);

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

/**
 * Validate Telegram init data and return auth result
 */
export async function validateTelegramAuth(initData: string): Promise<TelegramAuthResult> {
  if (!BOT_TOKEN) {
    return {
      success: false,
      role: 'user',
      telegramUserId: '',
      error: 'Telegram bot token not configured',
    };
  }

  try {
    // Validate the signature
    validate(initData, BOT_TOKEN, { expiresIn: 0 }); // expiresIn: 0 disables expiration check

    // Parse the init data to get user info
    const parsed = parse(initData);

    if (!parsed.user) {
      return {
        success: false,
        role: 'user',
        telegramUserId: '',
        error: 'No user data in init data',
      };
    }

    const telegramUserId = parsed.user.id.toString();
    const username = parsed.user.username;
    const firstName = parsed.user.first_name;
    const usernameLower = username?.toLowerCase() || '';

    // Check if user is whitelisted
    const isAdmin = usernameLower ? ADMIN_USERNAMES.includes(usernameLower) : false;
    const isWhitelistedUser = usernameLower ? USER_USERNAMES.includes(usernameLower) : false;
    const isWhitelisted = isAdmin || isWhitelistedUser;

    const role = isAdmin ? 'admin' : 'user';

    return {
      success: true,
      role,
      telegramUserId,
      username,
      firstName,
      isWhitelisted,
    };
  } catch (error) {
    console.error('Telegram auth validation failed:', error);
    return {
      success: false,
      role: 'user',
      telegramUserId: '',
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}