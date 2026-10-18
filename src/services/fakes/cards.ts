/** Fake da trilha C. Aproximação em memória; as regras oficiais ficam no serviço real. */
import type { CardsService, InvoiceWithTotals } from '@/domain/contracts';
import { cycleForPurchase, installmentCycles, type InvoiceCycle } from '@/domain/invoices/cycle';
import type { Invoice, Transaction } from '@/domain/types';
import { addMonths, compareDates, dateInMonth, monthOf, parseISODate, today } from '@/lib/dates';
import { newId, nowTimestamp } from '@/lib/id';
import { splitInstallments, sumCents } from '@/lib/money';

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

  const withTotals = (invoice: Invoice): InvoiceWithTotals => {
    const rows = alive(store.transactions).filter((t) => t.invoiceId === invoice.id);
    const totalCents = sumCents(
      rows.map((t) =>
        t.kind === 'card_purchase'
          ? t.amountCents
          : t.kind === 'adjustment'
            ? t.direction === 'in'
              ? -t.amountCents
              : t.amountCents
            : 0,
      ),
    );
    const paidCents = sumCents(
      rows.filter((t) => t.kind === 'invoice_payment').map((t) => t.amountCents),
    );
    return {
      ...invoice,
      totalCents,
      paidCents,
      remainingCents: Math.max(0, totalCents - paidCents),
    };
  };

  const availableLimit = (cardId: string) => {
    const card = findOrThrow(store.cards, cardId, 'Cartão');
    const owed = alive(store.invoices)
      .filter((i) => i.cardId === cardId && i.status !== 'paid')
      .map((i) => withTotals(i).remainingCents);
    return card.limitCents - sumCents(owed);
  };

  const service: CardsService = {
    async listCardsWithSummary({ includeArchived = false, today: day = today() } = {}) {
      return alive(store.cards)
        .filter((c) => includeArchived || c.archivedAt === null)
        .map((card) => {
          const cycle = cycleForPurchase(card, day);
          const invoice = store.invoices.find(
            (i) => i.cardId === card.id && i.referenceMonth === cycle.referenceMonth,
          );
          return {
            ...card,
            currentInvoice: invoice ? withTotals(invoice) : null,
            availableLimitCents: availableLimit(card.id),
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
      Object.assign(findOrThrow(store.cards, id, 'Cartão'), patch, { updatedAt: nowTimestamp() });
      notifyDataChanged();
    },
    async setCardArchived(id, archived) {
      findOrThrow(store.cards, id, 'Cartão').archivedAt = archived ? nowTimestamp() : null;
      notifyDataChanged();
    },
    async deleteCard(id) {
      if (alive(store.transactions).some((t) => t.cardId === id)) {
        throw new Error('Cartão com lançamentos só pode ser arquivado');
      }
      findOrThrow(store.cards, id, 'Cartão').deletedAt = nowTimestamp();
      notifyDataChanged();
    },
    async resolveInvoice(cardId, purchaseDate) {
      const card = findOrThrow(store.cards, cardId, 'Cartão');
      return invoiceFor(cardId, cycleForPurchase(card, purchaseDate));
    },
    async createCardPurchase({
      cardId,
      amountCents,
      installments,
      date,
      description,
      categoryId,
      notes = null,
    }) {
      const card = findOrThrow(store.cards, cardId, 'Cartão');
      const amounts = splitInstallments(amountCents, installments);
      const groupId = installments > 1 ? newId() : null;
      const { day } = parseISODate(date);
      const rows = installmentCycles(card, date, installments).map((cycle, i): Transaction => ({
        ...blankTransaction(),
        kind: 'card_purchase',
        amountCents: amounts[i],
        date: i === 0 ? date : dateInMonth(addMonths(monthOf(date), i), day),
        description,
        categoryId,
        notes,
        cardId,
        invoiceId: invoiceFor(cardId, cycle).id,
        installmentGroupId: groupId,
        installmentNumber: groupId ? i + 1 : null,
        installmentTotal: groupId ? installments : null,
      }));
      store.transactions.push(...rows);
      notifyDataChanged();
      return rows;
    },
    async refundCardPurchase(transactionId, amountCents, date) {
      const purchase = findOrThrow(store.transactions, transactionId, 'Lançamento');
      const card = findOrThrow(store.cards, purchase.cardId ?? '', 'Cartão');
      const original = store.invoices.find((i) => i.id === purchase.invoiceId);
      const invoice =
        original && original.status === 'open'
          ? original
          : invoiceFor(card.id, cycleForPurchase(card, date));
      const refund: Transaction = {
        ...blankTransaction(),
        kind: 'adjustment',
        direction: 'in',
        amountCents,
        date,
        description: `Estorno ${purchase.description}`,
        categoryId: purchase.categoryId,
        cardId: card.id,
        invoiceId: invoice.id,
      };
      store.transactions.push(refund);
      notifyDataChanged();
      return refund;
    },
    async listInvoices(cardId) {
      return alive(store.invoices)
        .filter((i) => i.cardId === cardId)
        .sort((a, b) => compareDates(b.dueDate, a.dueDate))
        .map(withTotals);
    },
    async getInvoice(invoiceId) {
      const invoice = alive(store.invoices).find((i) => i.id === invoiceId);
      return invoice ? withTotals(invoice) : undefined;
    },
    async listInvoiceTransactions(invoiceId) {
      return alive(store.transactions)
        .filter((t) => t.invoiceId === invoiceId)
        .sort((a, b) => compareDates(b.date, a.date));
    },
    async payInvoice(invoiceId, accountId, amountCents, date) {
      const invoice = findOrThrow(store.invoices, invoiceId, 'Fatura');
      const payment: Transaction = {
        ...blankTransaction(),
        kind: 'invoice_payment',
        amountCents,
        date,
        description: 'Pagamento de fatura',
        accountId,
        cardId: invoice.cardId,
        invoiceId,
      };
      store.transactions.push(payment);
      invoice.status = withTotals(invoice).remainingCents === 0 ? 'paid' : 'partial';
      notifyDataChanged();
      return payment;
    },
    async getAvailableLimit(cardId) {
      return availableLimit(cardId);
    },
  };
  return service;
}
