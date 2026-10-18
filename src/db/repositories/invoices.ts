import { and, asc, eq, isNull } from 'drizzle-orm';

import type { InvoiceCycle } from '@/domain/invoices/cycle';
import type { Invoice, InvoiceStatus } from '@/domain/types';
import { nowTimestamp } from '@/lib/id';

import type { AppDatabase } from '../database';
import { invoices } from '../schema';
import { newEntity } from './common';

export async function listInvoices(db: AppDatabase, cardId: string): Promise<Invoice[]> {
  return db
    .select()
    .from(invoices)
    .where(and(eq(invoices.cardId, cardId), isNull(invoices.deletedAt)))
    .orderBy(asc(invoices.referenceMonth));
}

/** Fatura do cartão para o ciclo; cria aberta se ainda não existir. */
export async function getOrCreateInvoice(
  db: AppDatabase,
  cardId: string,
  cycle: InvoiceCycle,
): Promise<Invoice> {
  const [existing] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.cardId, cardId), eq(invoices.referenceMonth, cycle.referenceMonth)));
  if (existing) return existing;
  const row: Invoice = { ...newEntity(), cardId, ...cycle, status: 'open' };
  await db.insert(invoices).values(row);
  return row;
}

export async function setInvoiceStatus(db: AppDatabase, id: string, status: InvoiceStatus) {
  await db.update(invoices).set({ status, updatedAt: nowTimestamp() }).where(eq(invoices.id, id));
}

export async function getInvoice(db: AppDatabase, id: string): Promise<Invoice | undefined> {
  const [row] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), isNull(invoices.deletedAt)));
  return row;
}
