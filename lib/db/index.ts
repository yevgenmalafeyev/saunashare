import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';
import { ADMIN_TOKEN, USER_TOKEN } from '@/lib/auth/constants';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'banha.db');

let sqlite: Database.Database;

try {
  sqlite = new Database(dbPath, { timeout: 5000 });
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
} catch {
  // During build, connection may fail - create a dummy connection
  sqlite = new Database(':memory:');
}

export const db = drizzle(sqlite, { schema });

export * from './queries';

// Initialize database using Drizzle migrations
// Note: Schema is defined in schema.ts using Drizzle ORM
// Use `npx drizzle-kit push` to sync schema changes to the database
function initializeDatabase() {
  try {
    // Seed system expense template if it doesn't exist
    const existing = sqlite.prepare('SELECT id FROM expense_templates WHERE name = ?').get('Время, чай, вода');
    if (!existing) {
      sqlite.prepare('INSERT INTO expense_templates (name, usage_count, is_system) VALUES (?, 0, 1)').run('Время, чай, вода');
    }

    // Seed app config tokens and phone numbers if they don't exist
    const seedConfig = (key: string, value: string) => {
      const exists = sqlite.prepare('SELECT key FROM app_config WHERE key = ?').get(key);
      if (!exists) {
        sqlite.prepare('INSERT INTO app_config (key, value) VALUES (?, ?)').run(key, value);
      }
    };

    seedConfig('admin-token', ADMIN_TOKEN);
    seedConfig('user-token', USER_TOKEN);
    seedConfig('artur-phone', '+351924689616');
    seedConfig('andrey-phone', '+351963383623');

    // Create junction table if it doesn't exist (for production migration)
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS telegram_user_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_user_id INTEGER NOT NULL REFERENCES telegram_users(id) ON DELETE CASCADE,
        participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    sqlite.exec('CREATE UNIQUE INDEX IF NOT EXISTS tup_unique ON telegram_user_participants(telegram_user_id, participant_id)');

    // Migrate existing telegram_users.participant_id into junction table (idempotent)
    sqlite.prepare(`
      INSERT OR IGNORE INTO telegram_user_participants (telegram_user_id, participant_id, created_at)
      SELECT id, participant_id, updated_at FROM telegram_users WHERE participant_id IS NOT NULL
    `).run();
  } catch {
    // Ignore initialization errors during build (tables may not exist yet)
  }
}

initializeDatabase();
