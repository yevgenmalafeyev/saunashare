import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const participants = sqliteTable('participants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  activityScore: integer('activity_score').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
  dutyPerson: text('duty_person'), // 'artur' | 'andrey' | null
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const sessionParticipants = sqliteTable('session_participants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  participantId: integer('participant_id').notNull().references(() => participants.id, { onDelete: 'cascade' }),
  personCount: integer('person_count').notNull().default(1),
});

export const expenseTemplates = sqliteTable('expense_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  usageCount: integer('usage_count').notNull().default(0),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
});

export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  itemCount: integer('item_count').notNull().default(1),
  totalCost: real('total_cost'),
});

export const expenseAssignments = sqliteTable('expense_assignments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  expenseId: integer('expense_id').notNull().references(() => expenses.id, { onDelete: 'cascade' }),
  sessionParticipantId: integer('session_participant_id').notNull().references(() => sessionParticipants.id, { onDelete: 'cascade' }),
  share: real('share').notNull().default(1),
});

export const sessionParticipantMeta = sqliteTable('session_participant_meta', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionParticipantId: integer('session_participant_id')
    .notNull()
    .references(() => sessionParticipants.id, { onDelete: 'cascade' }),
  hasPaid: integer('has_paid', { mode: 'boolean' }).notNull().default(false),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const appConfig = sqliteTable('app_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const telegramUsers = sqliteTable('telegram_users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  telegramUserId: text('telegram_user_id').notNull().unique(),
  telegramUsername: text('telegram_username'),
  telegramFirstName: text('telegram_first_name'),
  participantId: integer('participant_id')
    .references(() => participants.id, { onDelete: 'set null' }),
  grantedRole: text('granted_role'), // 'admin' | 'user' | null - role granted via manual token entry
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;
export type DbSession = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type DbSessionParticipant = typeof sessionParticipants.$inferSelect;
export type NewSessionParticipant = typeof sessionParticipants.$inferInsert;
export type ExpenseTemplate = typeof expenseTemplates.$inferSelect;
export type NewExpenseTemplate = typeof expenseTemplates.$inferInsert;
export type DbExpense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type DbExpenseAssignment = typeof expenseAssignments.$inferSelect;
export type NewExpenseAssignment = typeof expenseAssignments.$inferInsert;
export type SessionParticipantMeta = typeof sessionParticipantMeta.$inferSelect;
export type NewSessionParticipantMeta = typeof sessionParticipantMeta.$inferInsert;
export type AppConfig = typeof appConfig.$inferSelect;
export type NewAppConfig = typeof appConfig.$inferInsert;
export type TelegramUser = typeof telegramUsers.$inferSelect;
export type NewTelegramUser = typeof telegramUsers.$inferInsert;
