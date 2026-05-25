#!/usr/bin/env node
/**
 * Import a SQLite `.dump` (produced by `sqlite3 db .dump`) into a libSQL/Turso
 * database. Works against a remote Turso database or a local `file:` URL.
 *
 * Usage:
 *   TURSO_DATABASE_URL=libsql://your-db.turso.io \
 *   TURSO_AUTH_TOKEN=...                          \
 *   node scripts/import-to-turso.mjs [path/to/dump.sql]
 *
 * If no dump path is given, the newest *.sql file in ./dumps is used.
 *
 * Statements are run one at a time in dump order (children-table DDL can
 * forward-reference parents because foreign-key enforcement is off during the
 * load). The dump's `BEGIN TRANSACTION;` / `COMMIT;` wrapper and `PRAGMA
 * foreign_keys` lines are skipped — running outside an explicit transaction
 * avoids Turso's "no transaction is active" HTTP quirk, and each DDL statement
 * commits before the next statement that depends on it is prepared.
 */
import { createClient } from '@libsql/client';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('✗ TURSO_DATABASE_URL is not set.');
  console.error('  Example: TURSO_DATABASE_URL=libsql://your-db.turso.io TURSO_AUTH_TOKEN=... node scripts/import-to-turso.mjs');
  process.exit(1);
}

function resolveDumpPath() {
  const arg = process.argv[2];
  if (arg) return arg;

  const dumpsDir = join(process.cwd(), 'dumps');
  const candidates = readdirSync(dumpsDir)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => join(dumpsDir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  if (candidates.length === 0) {
    console.error(`✗ No .sql dump found in ${dumpsDir} and no path argument given.`);
    process.exit(1);
  }
  return candidates[0];
}

const dumpPath = resolveDumpPath();
console.log(`→ Importing ${dumpPath}`);
console.log(`→ Target:   ${url}`);

/**
 * Split a sqlite `.dump` into individual statements. The dump emits one
 * statement per logical unit, terminating with `;` at the end of a line and
 * never embedding a newline inside a string literal, so a statement is complete
 * once an accumulated line ends with `;`.
 */
function splitStatements(sql) {
  const statements = [];
  let current = '';
  for (const line of sql.split('\n')) {
    const skip = current === '' &&
      (/^\s*$/.test(line) || /^\s*(BEGIN TRANSACTION|COMMIT|PRAGMA FOREIGN_KEYS)/i.test(line));
    if (skip) continue;

    current += (current ? '\n' : '') + line;
    if (/;\s*$/.test(line)) {
      statements.push(current);
      current = '';
    }
  }
  if (current.trim()) statements.push(current);
  return statements;
}

const raw = readFileSync(dumpPath, 'utf8');
const statements = splitStatements(raw);
console.log(`→ ${statements.length} statements to apply\n`);

const client = createClient({ url, authToken });

try {
  // The dump lists child tables before their parents, so disable FK checks for
  // the load. On the local file driver this PRAGMA persists for the connection;
  // on Turso, foreign keys are off by default, so it's a harmless no-op.
  await client.execute('PRAGMA foreign_keys = OFF');

  let done = 0;
  for (const stmt of statements) {
    await client.execute(stmt);
    done += 1;
    if (done % 100 === 0) console.log(`  …${done}/${statements.length}`);
  }
  console.log('✓ Import completed.');

  // Report row counts so the result is verifiable at a glance.
  const tables = (
    await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
  ).rows.map((r) => r.name);

  console.log('\nRow counts:');
  for (const t of tables) {
    const { rows } = await client.execute(`SELECT count(*) AS n FROM "${t}"`);
    console.log(`  ${String(t).padEnd(28)} ${rows[0].n}`);
  }
} catch (err) {
  console.error('✗ Import failed:', err.message ?? err);
  process.exitCode = 1;
} finally {
  client.close();
}
