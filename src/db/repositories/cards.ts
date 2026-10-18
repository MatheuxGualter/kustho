import { and, asc, eq, isNull } from 'drizzle-orm';

import type { CreditCard } from '@/domain/types';
import type { CreditCardInput } from '@/domain/contracts';
import { nowTimestamp } from '@/lib/id';

import type { AppDatabase } from '../database';
import { creditCards } from '../schema';
import { newEntity } from './common';

export type { CreditCardInput };

export async function listCards(
  db: AppDatabase,
  { includeArchived = false }: { includeArchived?: boolean } = {},
): Promise<CreditCard[]> {
  return db
    .select()
    .from(creditCards)
    .where(
      and(
        isNull(creditCards.deletedAt),
        includeArchived ? undefined : isNull(creditCards.archivedAt),
      ),
    )
    .orderBy(asc(creditCards.name));
}

export async function getCard(db: AppDatabase, id: string): Promise<CreditCard | undefined> {
  const [row] = await db
    .select()
    .from(creditCards)
    .where(and(eq(creditCards.id, id), isNull(creditCards.deletedAt)));
  return row;
}

export async function createCard(db: AppDatabase, input: CreditCardInput): Promise<CreditCard> {
  const row: CreditCard = { ...newEntity(), ...input, archivedAt: null };
  await db.insert(creditCards).values(row);
  return row;
}

export async function updateCard(
  db: AppDatabase,
  id: string,
  patch: Partial<CreditCardInput>,
): Promise<void> {
  await db
    .update(creditCards)
    .set({ ...patch, updatedAt: nowTimestamp() })
    .where(eq(creditCards.id, id));
}

export async function setCardArchived(db: AppDatabase, id: string, archived: boolean) {
  const now = nowTimestamp();
  await db
    .update(creditCards)
    .set({ archivedAt: archived ? now : null, updatedAt: now })
    .where(eq(creditCards.id, id));
}

export async function setCardDeleted(db: AppDatabase, id: string, deleted: boolean) {
  const now = nowTimestamp();
  await db
    .update(creditCards)
    .set({ deletedAt: deleted ? now : null, updatedAt: now })
    .where(eq(creditCards.id, id));
}
