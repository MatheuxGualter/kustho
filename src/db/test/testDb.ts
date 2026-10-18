/**
 * Banco de teste: SQLite real em memória (node:sqlite) com as migrações do app,
 * exposto pelo Drizzle com a mesma API que o app usa. Só para testes em Node.
 */
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type { AppDatabase } from '../database';
import * as schema from '../schema';

const migrationsDir = join(__dirname, '..', 'migrations');

export function createMigratedSqlite(): DatabaseSync {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    for (const statement of readFileSync(join(migrationsDir, file), 'utf8').split(
      '--> statement-breakpoint',
    )) {
      sqlite.exec(statement);
    }
  }
  return sqlite;
}

export function createTestDb(): { db: AppDatabase; sqlite: DatabaseSync } {
  const sqlite = createMigratedSqlite();
  const db = drizzle(
    async (sql, params, method) => {
      const statement = sqlite.prepare(sql);
      if (method === 'run') {
        statement.run(...params);
        return { rows: [] };
      }
      statement.setReturnArrays(true);
      if (method === 'get') {
        return { rows: (statement.get(...params) as unknown as unknown[]) ?? [] };
      }
      return { rows: statement.all(...params) as unknown as unknown[][] };
    },
    { schema },
  );
  return { db, sqlite };
}
