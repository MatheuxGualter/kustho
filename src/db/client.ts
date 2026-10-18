import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'kustho.db';

/** `enableChangeListener` habilita as consultas reativas (`useLiveQuery`). */
export const sqlite = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
sqlite.execSync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

export const db = drizzle(sqlite, { schema });

export type Database = typeof db;
