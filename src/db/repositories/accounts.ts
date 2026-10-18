import { and, asc, eq, isNull } from 'drizzle-orm';

import type { Account } from '@/domain/types';
import { nowTimestamp } from '@/lib/id';

import type { AppDatabase } from '../database';
import { accounts } from '../schema';
import { type EntityKeys, newEntity } from './common';

export type AccountInput = Omit<Account, EntityKeys | 'archivedAt'>;

export async function listAccounts(
  db: AppDatabase,
  { includeArchived = false }: { includeArchived?: boolean } = {},
): Promise<Account[]> {
  return db
    .select()
    .from(accounts)
    .where(
      and(isNull(accounts.deletedAt), includeArchived ? undefined : isNull(accounts.archivedAt)),
    )
    .orderBy(asc(accounts.name));
}

export async function getAccount(db: AppDatabase, id: string): Promise<Account | undefined> {
  const [row] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, id), isNull(accounts.deletedAt)));
  return row;
}

export async function createAccount(db: AppDatabase, input: AccountInput): Promise<Account> {
  const row: Account = { ...newEntity(), ...input, archivedAt: null };
  await db.insert(accounts).values(row);
  return row;
}

export async function updateAccount(
  db: AppDatabase,
  id: string,
  patch: Partial<AccountInput>,
): Promise<void> {
  await db
    .update(accounts)
    .set({ ...patch, updatedAt: nowTimestamp() })
    .where(eq(accounts.id, id));
}

export async function setAccountArchived(db: AppDatabase, id: string, archived: boolean) {
  const now = nowTimestamp();
  await db
    .update(accounts)
    .set({ archivedAt: archived ? now : null, updatedAt: now })
    .where(eq(accounts.id, id));
}

/** Exclusão lógica; `restore` desfaz. */
export async function setAccountDeleted(db: AppDatabase, id: string, deleted: boolean) {
  const now = nowTimestamp();
  await db
    .update(accounts)
    .set({ deletedAt: deleted ? now : null, updatedAt: now })
    .where(eq(accounts.id, id));
}
