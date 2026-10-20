/**
 * Fake da trilha C em memória. Usa as mesmas regras puras do serviço real
 * (`src/domain/cards/rules.ts`); só o armazenamento é diferente.
 */
import {
  availableLimit,
  buildCardPurchase,
  invoiceAdjustmentFor,
  invoiceStatus,
  invoiceTotals,
  refundableCents,
  refundReferenceMonth,
} from '@/domain/cards/rules';
import type { CardsService, InvoiceWithTotals } from '@/domain/contracts';
import { DomainError } from '@/domain/errors';
import {
  cycleForPurchase,
  cycleForReferenceMonth,
  type InvoiceCycle,
} from '@/domain/invoices/cycle';
import type { Invoice, Transaction } from '@/domain/types';
import { today } from '@/lib/dates';
import { newId, nowTimestamp } from '@/lib/id';

import { notifyDataChanged } from '../dataVersion';
import { blankTransaction, entity } from './common';
import { alive, type FakeStore, findOrThrow } from './store';

export function createFakeCardsService(store: FakeStore): CardsService {
  const invoiceFor = (cardId: string, cycle: InvoiceCycle): Invoice => {
    let invoice = store.invoices.find(
      (i) => i.cardId === cardId && i.referenceMonth === cycle.referenceMonth,
    );
    if (!invoice) {
      invoice = { ...entity(), cardId, ...cycle, status: 'open' };
      store.invoices.push(invoice);
    }
    return invoice;
  };

  const withTotals = (invoice: Invoice, day = today()): InvoiceWithTotals => {
    const totals = invoiceTotals(invoice.id, store.transactions);
    return { ...invoice, ...totals, status: invoiceStatus(invoice, totals, day) };
  };

  const cardInvoices = (cardId: string, day = today()) =>
    alive(store.invoices)
      .filter((i) => i.cardId === cardId)
      .map((i) => withTotals(i, day));

  const refundsOf = (purchaseId: string) =>
    alive(store.transactions).filter((t) => t.refundOfId === purchaseId);
  const requireCard = (id: string) => {
    const card = alive(store.cards).find((c) => c.id === id);
    if (!card) throw new DomainError('not_found');
    return card;
  };
  const assertAmount = (amountCents: number) => {
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0)
      throw new DomainError('invalid_amount');
  };

  return {
    async listCardsWithSummary({ includeArchived = false, today: day = today() } = {}) {
      return alive(store.cards)
        .filter((c) => includeArchived || c.archivedAt === null)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((card) => {
          const invoices = cardInvoices(card.id, day);
          const current = cycleForPurchase(card, day).referenceMonth;
          return {
            ...card,
            currentInvoice: invoices.find((i) => i.referenceMonth === current) ?? null,
            availableLimitCents: availableLimit(card.limitCents, invoices),
          };
        });
    },
    async getCard(id) {
      return alive(store.cards).find((c) => c.id === id);
    },
    async createCard(input) {
      const card = { ...entity(), ...input, archivedAt: null };
      store.cards.push(card);
      notifyDataChanged();
      return card;
    },
    async updateCard(id, patch) {
      Object.assign(requireCard(id), patch, { updatedAt: nowTimestamp() });
      notifyDataChanged();
    },
    async setCardArchived(id, archived) {
      requireCard(id).archivedAt = archived ? nowTimestamp() : null;
      notifyDataChanged();
    },
    async deleteCard(id) {
      requireCard(id);
      if (alive(store.transactions).some((t) => t.cardId === id)) {
        throw new DomainError('card_has_transactions');
      }
      findOrThrow(store.cards, id, 'Cartão').deletedAt = nowTimestamp();
      notifyDataChanged();
    },
    async restoreCard(id) {
      findOrThrow(store.cards, id, 'Cartão').deletedAt = null;
      notifyDataChanged();
    },
    async resolveInvoice(cardId, purchaseDate) {
      return invoiceFor(cardId, cycleForPurchase(requireCard(cardId), purchaseDate));
    },
    async adjustCurrentInvoice(cardId, targetCents, date) {
      const invoice = invoiceFor(cardId, cycleForPurchase(requireCard(cardId), date));
      const adjustment = invoiceAdjustmentFor(
        invoiceTotals(invoice.id, store.transactions),
        targetCents,
      );
      if (!adjustment) return null;
      const tx: Transaction = {
        ...blankTransaction(),
        ...adjustment,
        kind: 'adjustment',
        date,
        description: 'Ajuste da fatura',
        cardId,
        invoiceId: invoice.id,
      };
      store.transactions.push(tx);
      notifyDataChanged();
      return tx;
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
      const card = requireCard(cardId);
      const groupId = installments > 1 ? newId() : null;
      const rows = buildCardPurchase(card, { amountCents, installments, date }).map(
        (row): Transaction => ({
          ...blankTransaction(),
          kind: 'card_purchase',
          amountCents: row.amountCents,
          date: row.date,
          description,
          categoryId,
          notes,
          source,
          cardId,
          invoiceId: invoiceFor(cardId, row.cycle).id,
          installmentGroupId: groupId,
          installmentNumber: row.installmentNumber,
          installmentTotal: groupId ? installments : null,
        }),
      );
      store.transactions.push(...rows);
      notifyDataChanged();
      return rows;
    },
    async refundCardPurchase(transactionId, amountCents, date) {
      const purchase = alive(store.transactions).find((t) => t.id === transactionId);
      if (!purchase || purchase.kind !== 'card_purchase' || !purchase.cardId) {
        throw new DomainError('not_found');
      }
      if (amountCents > refundableCents(purchase, refundsOf(purchase.id))) {
        throw new DomainError('invalid_amount');
      }
      assertAmount(amountCents);
      const card = requireCard(purchase.cardId);
      const original = findOrThrow(store.invoices, purchase.invoiceId ?? '', 'Fatura');
      const month = refundReferenceMonth(card, original, date);
      const refund: Transaction = {
        ...blankTransaction(),
        kind: 'adjustment',
        direction: 'in',
        amountCents,
        date,
        description: `Estorno ${purchase.description}`,
        categoryId: purchase.categoryId,
        cardId: card.id,
        invoiceId: invoiceFor(card.id, cycleForReferenceMonth(card, month)).id,
        refundOfId: purchase.id,
      };
      store.transactions.push(refund);
      notifyDataChanged();
      return refund;
    },
    async getRefundableCents(transactionId) {
      const purchase = alive(store.transactions).find((t) => t.id === transactionId);
      if (!purchase || purchase.kind !== 'card_purchase') throw new DomainError('not_found');
      return refundableCents(purchase, refundsOf(purchase.id));
    },
    async listInvoices(cardId) {
      return cardInvoices(cardId).sort((a, b) => b.referenceMonth.localeCompare(a.referenceMonth));
    },
    async getInvoice(invoiceId) {
      const invoice = alive(store.invoices).find((i) => i.id === invoiceId);
      return invoice ? withTotals(invoice) : undefined;
    },
    async listInvoiceTransactions(invoiceId) {
      return alive(store.transactions)
        .filter((t) => t.invoiceId === invoiceId)
        .sort((a, b) => b.date.localeCompare(a.date));
    },
    async payInvoice(invoiceId, accountId, amountCents, date) {
      assertAmount(amountCents);
      const invoice = alive(store.invoices).find((i) => i.id === invoiceId);
      if (!invoice || !alive(store.accounts).some((a) => a.id === accountId)) {
        throw new DomainError('not_found');
      }
      const card = findOrThrow(store.cards, invoice.cardId, 'Cartão');
      const payment: Transaction = {
        ...blankTransaction(),
        kind: 'invoice_payment',
        amountCents,
        date,
        description: `Pagamento fatura ${card.name}`,
        accountId,
        cardId: card.id,
        invoiceId,
      };
      store.transactions.push(payment);
      invoice.status = withTotals(invoice, date).status;
      notifyDataChanged();
      return payment;
    },
    async getAvailableLimit(cardId) {
      const card = requireCard(cardId);
      return availableLimit(card.limitCents, cardInvoices(cardId));
    },
  };
}
