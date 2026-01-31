import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

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
  } catch {
    // Ignore initialization errors during build (tables may not exist yet)
  }
}

initializeDatabase();
