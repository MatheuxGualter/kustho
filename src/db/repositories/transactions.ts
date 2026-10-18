import { and, asc, between, desc, eq, isNull } from 'drizzle-orm';

import type { ISODate, Transaction } from '@/domain/types';
import { nowTimestamp } from '@/lib/id';

import type { AppDatabase } from '../database';
import { transactions } from '../schema';
import { type EntityKeys, newEntity } from './common';

export type TransactionInput = Omit<Transaction, EntityKeys>;

/** Lançamentos não excluídos entre duas datas (inclusive), do mais recente ao mais antigo. */
export async function listTransactionsBetween(
  db: AppDatabase,
  from: ISODate,
  to: ISODate,
): Promise<Transaction[]> {
  return db
    .select()
    .from(transactions)
    .where(and(isNull(transactions.deletedAt), between(transactions.date, from, to)))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));
}

export async function listInvoiceTransactions(
  db: AppDatabase,
  invoiceId: string,
): Promise<Transaction[]> {
  return db
    .select()
    .from(transactions)
    .where(and(eq(transactions.invoiceId, invoiceId), isNull(transactions.deletedAt)))
    .orderBy(asc(transactions.date));
}

export async function getTransaction(
  db: AppDatabase,
  id: string,
): Promise<Transaction | undefined> {
  const [row] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), isNull(transactions.deletedAt)));
  return row;
}

/**
 * Grava lançamentos já montados pelo domínio, num único INSERT (tudo ou nada). Regras
 * (parcelas, pernas de transferência, fatura) são responsabilidade de quem chama. Um `id`
 * pode vir pronto quando as linhas se referenciam (ex.: `transferPeerId`).
 */
export async function insertTransactions(
  db: AppDatabase,
  inputs: readonly (TransactionInput & { id?: string })[],
): Promise<Transaction[]> {
  if (inputs.length === 0) return [];
  const rows: Transaction[] = inputs.map((input) => ({ ...newEntity(), ...input }));
  await db.insert(transactions).values(rows);
  return rows;
}

export async function updateTransaction(
  db: AppDatabase,
  id: string,
  patch: Partial<TransactionInput>,
): Promise<void> {
  await db
    .update(transactions)
    .set({ ...patch, updatedAt: nowTimestamp() })
    .where(eq(transactions.id, id));
}

/** Exclusão lógica; chamar com `false` desfaz. */
export async function setTransactionDeleted(db: AppDatabase, id: string, deleted: boolean) {
  const now = nowTimestamp();
  await db
    .update(transactions)
    .set({ deletedAt: deleted ? now : null, updatedAt: now })
    .where(eq(transactions.id, id));
}
