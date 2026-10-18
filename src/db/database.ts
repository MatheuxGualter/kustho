import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from './schema';

/**
 * Tipo de banco aceito pelos repositórios: o do app (expo-sqlite, síncrono) ou o dos
 * testes (node:sqlite via proxy, assíncrono). Repositórios sempre usam `await`.
 */
export type AppDatabase = BaseSQLiteDatabase<'sync' | 'async', unknown, typeof schema>;
