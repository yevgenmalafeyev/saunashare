import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema';
import { expenseTemplates, appConfig } from './schema';
import { ADMIN_TOKEN, USER_TOKEN } from '@/lib/auth/constants';
import { DEFAULT_EXPENSE_NAME } from '@/lib/constants';

type Database = LibSQLDatabase<typeof schema>;

/**
 * Idempotently seed the baseline rows a fresh database needs: the system
 * expense template and the app_config defaults (auth tokens + duty phones).
 *
 * Relies on the unique constraint on `expense_templates.name` and the primary
 * key on `app_config.key`, so it is safe to run repeatedly.
 */
export async function seedDatabase(db: Database): Promise<void> {
  await db
    .insert(expenseTemplates)
    .values({ name: DEFAULT_EXPENSE_NAME, usageCount: 0, isSystem: true })
    .onConflictDoNothing();

  const defaults: { key: string; value: string }[] = [
    { key: 'admin-token', value: ADMIN_TOKEN },
    { key: 'user-token', value: USER_TOKEN },
    { key: 'artur-phone', value: '+351924689616' },
    { key: 'andrey-phone', value: '+351963383623' },
  ];

  await db.insert(appConfig).values(defaults).onConflictDoNothing();
}
