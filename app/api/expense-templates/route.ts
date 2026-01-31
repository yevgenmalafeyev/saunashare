import { db } from '@/lib/db';
import { expenseTemplates } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { apiSuccess } from '@/lib/utils/api';

export async function GET() {
  const templates = await db
    .select()
    .from(expenseTemplates)
    .orderBy(desc(expenseTemplates.usageCount));

  return apiSuccess(templates);
}
