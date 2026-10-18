/**
 * Serviço real de cartões e faturas (trilha C) sobre o SQLite. Regras em `./rules.ts` e
 * `src/domain/invoices/cycle.ts`.
 */
import { and, eq, isNull } from 'drizzle-orm';

import type { AppDatabase } from '@/db/database';
import { getAccount } from '@/db/repositories/accounts';
import * as cardRepo from '@/db/repositories/cards';
import * as invoiceRepo from '@/db/repositories/invoices';
import * as txRepo from '@/db/repositories/transactions';
import { transactions } from '@/db/schema';
import type { CardsService, InvoiceWithTotals } from '@/domain/contracts';
import { DomainError } from '@/domain/errors';
import { cycleForPurchase, cycleForReferenceMonth } from '@/domain/invoices/cycle';
import type { CreditCard, Id, Invoice, Transaction } from '@/domain/types';
import { today } from '@/lib/dates';
import { newId } from '@/lib/id';

import {
  availableLimit,
  buildCardPurchase,
  invoiceStatus,
  invoiceTotals,
  refundReferenceMonth,
  refundableCents,
} from './rules';

const emptyCardTx = {
  direction: null,
  accountId: null,
  transferPeerId: null,
  refundOfId: null,
  installmentGroupId: null,
  installmentNumber: null,
  installmentTotal: null,
  status: 'posted',
  source: 'manual',
  notes: null,
  categoryId: null,
} as const;

export function createCardsService(db: AppDatabase): CardsService {
  const requireCard = async (id: Id) => {
    const card = await cardRepo.getCard(db, id);
    if (!card) throw new DomainError('not_found', `Cartão não encontrado: ${id}`);
    return card;
  };

  /** Lançamentos não excluídos ligados a faturas do cartão. */
  const cardRows = (cardId: Id) =>
    db
      .select()
      .from(transactions)
      .where(and(eq(transactions.cardId, cardId), isNull(transactions.deletedAt)));

  const withTotals = (invoice: Invoice, rows: readonly Transaction[], day = today()) => {
    const totals = invoiceTotals(invoice.id, rows);
    return { ...invoice, ...totals, status: invoiceStatus(invoice, totals, day) };
  };

  const invoicesWithTotals = async (cardId: Id, day = today()): Promise<InvoiceWithTotals[]> => {
    const [list, rows] = await Promise.all([
      invoiceRepo.listInvoices(db, cardId),
      cardRows(cardId),
    ]);
    return list.map((i) => withTotals(i, rows, day));
  };

  const findInvoice = async (invoiceId: Id) => {
    const invoice = await invoiceRepo.getInvoice(db, invoiceId);
    const card = invoice ? await cardRepo.getCard(db, invoice.cardId) : undefined;
    return invoice && card ? { card, invoice } : undefined;
  };

  const summary = async (card: CreditCard, day: string) => {
    const invoices = await invoicesWithTotals(card.id, day);
    const current = cycleForPurchase(card, day).referenceMonth;
    return {
      ...card,
      currentInvoice: invoices.find((i) => i.referenceMonth === current) ?? null,
      availableLimitCents: availableLimit(card.limitCents, invoices),
    };
  };

  return {
    async listCardsWithSummary({ includeArchived = false, today: day = today() } = {}) {
      const cards = await cardRepo.listCards(db, { includeArchived });
      return Promise.all(cards.map((card) => summary(card, day)));
    },

    getCard: (id) => cardRepo.getCard(db, id),
    createCard: (input) => cardRepo.createCard(db, input),
    async updateCard(id, patch) {
      await requireCard(id);
      await cardRepo.updateCard(db, id, patch);
    },
    async setCardArchived(id, archived) {
      await requireCard(id);
      await cardRepo.setCardArchived(db, id, archived);
    },
    async deleteCard(id) {
      await requireCard(id);
      if ((await cardRows(id)).length > 0) throw new DomainError('card_has_transactions');
      await cardRepo.setCardDeleted(db, id, true);
    },
    restoreCard: (id) => cardRepo.setCardDeleted(db, id, false),

    async resolveInvoice(cardId, purchaseDate) {
      const card = await requireCard(cardId);
      return invoiceRepo.getOrCreateInvoice(db, cardId, cycleForPurchase(card, purchaseDate));
    },

    async createCardPurchase({
      cardId,
      amountCents,
      installments,
      date,
      description,
      categoryId,
      notes = null,
      source = 'manual',
    }) {
      const card = await requireCard(cardId);
      const rows = buildCardPurchase(card, { amountCents, installments, date });
      const groupId = installments > 1 ? newId() : null;
      const invoices: Invoice[] = [];
      for (const row of rows)
        invoices.push(await invoiceRepo.getOrCreateInvoice(db, cardId, row.cycle));
      return txRepo.insertTransactions(
        db,
        rows.map((row, i) => ({
          ...emptyCardTx,
          kind: 'card_purchase' as const,
          amountCents: row.amountCents,
          date: row.date,
          description,
          categoryId,
          notes,
          source,
          cardId,
          invoiceId: invoices[i].id,
          installmentGroupId: groupId,
          installmentNumber: row.installmentNumber,
          installmentTotal: groupId ? installments : null,
        })),
      );
    },

    async refundCardPurchase(transactionId, amountCents, date) {
      const purchase = await txRepo.getTransaction(db, transactionId);
      if (
        !purchase ||
        purchase.kind !== 'card_purchase' ||
        !purchase.cardId ||
        !purchase.invoiceId
      ) {
        throw new DomainError('not_found');
      }
      const refundable = refundableCents(purchase, await txRepo.listRefundsOf(db, purchase.id));
      if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > refundable) {
        throw new DomainError('invalid_amount');
      }
      const card = await requireCard(purchase.cardId);
      const original = await invoiceRepo.getInvoice(db, purchase.invoiceId);
      if (!original) throw new DomainError('not_found');
      const month = refundReferenceMonth(card, original, date);
      const target = await invoiceRepo.getOrCreateInvoice(
        db,
        card.id,
        cycleForReferenceMonth(card, month),
      );
      const [refund] = await txRepo.insertTransactions(db, [
        {
          ...emptyCardTx,
          kind: 'adjustment',
          direction: 'in',
          amountCents,
          date,
          description: `Estorno ${purchase.description}`,
          categoryId: purchase.categoryId,
          cardId: card.id,
          invoiceId: target.id,
          refundOfId: purchase.id,
        },
      ]);
      return refund;
    },

    async getRefundableCents(transactionId) {
      const purchase = await txRepo.getTransaction(db, transactionId);
      if (!purchase || purchase.kind !== 'card_purchase') throw new DomainError('not_found');
      return refundableCents(purchase, await txRepo.listRefundsOf(db, purchase.id));
    },

    listInvoices: async (cardId) =>
      (await invoicesWithTotals(cardId)).sort((a, b) =>
        b.referenceMonth.localeCompare(a.referenceMonth),
      ),

    async getInvoice(invoiceId) {
      const found = await findInvoice(invoiceId);
      if (!found) return undefined;
      return withTotals(found.invoice, await cardRows(found.card.id));
    },

    listInvoiceTransactions: async (invoiceId) =>
      (await txRepo.listInvoiceTransactions(db, invoiceId)).sort((a, b) =>
        b.date.localeCompare(a.date),
      ),

    async payInvoice(invoiceId, accountId, amountCents, date) {
      if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
        throw new DomainError('invalid_amount');
      }
      const found = await findInvoice(invoiceId);
      if (!found || !(await getAccount(db, accountId))) throw new DomainError('not_found');
      const [payment] = await txRepo.insertTransactions(db, [
        {
          ...emptyCardTx,
          kind: 'invoice_payment',
          amountCents,
          date,
          description: `Pagamento fatura ${found.card.name}`,
          accountId,
          cardId: found.card.id,
          invoiceId,
        },
      ]);
      const updated = withTotals(found.invoice, await cardRows(found.card.id), date);
      await invoiceRepo.setInvoiceStatus(db, invoiceId, updated.status);
      return payment;
    },

    async getAvailableLimit(cardId) {
      const card = await requireCard(cardId);
      return availableLimit(card.limitCents, await invoicesWithTotals(cardId));
    },
  };
}
