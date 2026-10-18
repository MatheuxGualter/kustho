/** Contrato de CardsService: roda igual no fake e no serviço real. */
import { isDomainError } from '@/domain/errors';

import { environments, TODAY } from './setup';

jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: jest.fn() }));

describe.each(environments)('CardsService ($name)', ({ create }) => {
  it('lista os 2 cartões com fatura atual e limite disponível', async () => {
    const { services } = await create();
    const cards = await services.cards.listCardsWithSummary({ today: TODAY });
    expect(cards.map((c) => c.name)).toEqual(['Inter Gold', 'Nubank Roxinho']);
    for (const card of cards) {
      expect(card.availableLimitCents).toBeLessThanOrEqual(card.limitCents);
      expect(card.availableLimitCents).toBe(await services.cards.getAvailableLimit(card.id));
    }
    const roxinho = cards.find((c) => c.name === 'Nubank Roxinho')!;
    // Hoje (17/10) já passou o fechamento do dia 3: compras de hoje vão para novembro.
    expect(roxinho.currentInvoice?.referenceMonth).toBe('2026-11');
  });

  it('faturas do seed: pagas sem restante, uma parcial, totais coerentes', async () => {
    const { services } = await create();
    let partial = 0;
    for (const card of await services.cards.listCardsWithSummary({ today: TODAY })) {
      const invoices = await services.cards.listInvoices(card.id);
      const months = invoices.map((i) => i.referenceMonth);
      expect([...months].sort().reverse()).toEqual(months);
      for (const invoice of invoices) {
        expect(invoice.remainingCents).toBe(Math.max(0, invoice.totalCents - invoice.paidCents));
        if (invoice.status === 'paid') expect(invoice.remainingCents).toBe(0);
        if (invoice.status === 'partial') partial++;
      }
    }
    expect(partial).toBe(1);
  });

  it('compra em 3x aparece em 3 faturas seguidas e consome o limite', async () => {
    const { services } = await create();
    const [card] = await services.cards.listCardsWithSummary({ today: TODAY });
    const before = await services.cards.getAvailableLimit(card.id);
    const rows = await services.cards.createCardPurchase({
      cardId: card.id,
      amountCents: 10000,
      installments: 3,
      date: TODAY,
      description: 'Tênis',
      categoryId: null,
    });
    expect(rows.map((r) => r.amountCents)).toEqual([3334, 3333, 3333]);
    expect(new Set(rows.map((r) => r.installmentGroupId)).size).toBe(1);
    const months = [];
    for (const row of rows)
      months.push((await services.cards.getInvoice(row.invoiceId!))!.referenceMonth);
    expect(months).toEqual(['2026-11', '2026-12', '2027-01']);
    expect(await services.cards.getAvailableLimit(card.id)).toBe(before - 10000);
  });

  it('compra no dia do fechamento vai para a fatura seguinte (regra 3)', async () => {
    const { services, seed } = await create();
    const roxinho = seed.creditCards.find((c) => c.name === 'Nubank Roxinho')!;
    expect((await services.cards.resolveInvoice(roxinho.id, '2026-11-02')).referenceMonth).toBe(
      '2026-11',
    );
    expect((await services.cards.resolveInvoice(roxinho.id, '2026-11-03')).referenceMonth).toBe(
      '2026-12',
    );
  });

  it('pagar a fatura inteira marca como paga e reduz o saldo da conta (regra 6)', async () => {
    const { services } = await create();
    const [card] = await services.cards.listCardsWithSummary({ today: TODAY });
    const invoice = card.currentInvoice!;
    const account = card.paymentAccountId!;
    const before = await services.accounts.getAccountBalance(account, TODAY);
    await services.cards.payInvoice(invoice.id, account, invoice.remainingCents, TODAY);
    const paid = await services.cards.getInvoice(invoice.id);
    expect(paid).toMatchObject({ status: 'paid', remainingCents: 0 });
    expect(await services.accounts.getAccountBalance(account, TODAY)).toBe(
      before - invoice.remainingCents,
    );
  });

  it('pagamento parcial deixa a fatura parcial com o restante visível', async () => {
    const { services } = await create();
    const [card] = await services.cards.listCardsWithSummary({ today: TODAY });
    const invoice = card.currentInvoice!;
    await services.cards.payInvoice(invoice.id, card.paymentAccountId!, 1000, TODAY);
    expect(await services.cards.getInvoice(invoice.id)).toMatchObject({
      status: 'partial',
      remainingCents: invoice.remainingCents - 1000,
    });
  });

  it('estorno de compra em fatura fechada vai para a fatura aberta', async () => {
    const { services, seed } = await create();
    const purchase = seed.transactions.find(
      (t) => t.kind === 'card_purchase' && !t.installmentGroupId && t.date.startsWith('2026-08'),
    )!;
    const refund = await services.cards.refundCardPurchase(purchase.id, 500, TODAY);
    expect(refund).toMatchObject({ kind: 'adjustment', direction: 'in', amountCents: 500 });
    const target = await services.cards.getInvoice(refund.invoiceId!);
    expect(target?.referenceMonth).not.toBe(
      (await services.cards.getInvoice(purchase.invoiceId!))?.referenceMonth,
    );
    expect(target?.status === 'open' || target?.status === 'closed').toBe(true);
  });

  it('estorno maior que a compra é recusado', async () => {
    const { services, seed } = await create();
    const purchase = seed.transactions.find((t) => t.kind === 'card_purchase')!;
    const error = await services.cards
      .refundCardPurchase(purchase.id, purchase.amountCents + 1, TODAY)
      .catch((e: unknown) => e);
    expect(isDomainError(error) && error.code).toBe('invalid_amount');
  });

  it('estornos somados não passam da compra', async () => {
    const { services, seed } = await create();
    const purchase = seed.transactions.find((t) => t.kind === 'card_purchase')!;
    expect(await services.cards.getRefundableCents(purchase.id)).toBe(purchase.amountCents);

    const first = await services.cards.refundCardPurchase(purchase.id, 100, TODAY);
    expect(first.refundOfId).toBe(purchase.id);
    expect(await services.cards.getRefundableCents(purchase.id)).toBe(purchase.amountCents - 100);

    const error = await services.cards
      .refundCardPurchase(purchase.id, purchase.amountCents, TODAY)
      .catch((e: unknown) => e);
    expect(isDomainError(error) && error.code).toBe('invalid_amount');

    await services.cards.refundCardPurchase(purchase.id, purchase.amountCents - 100, TODAY);
    expect(await services.cards.getRefundableCents(purchase.id)).toBe(0);
  });

  it('excluir um estorno libera o valor de novo', async () => {
    const { services, seed } = await create();
    const purchase = seed.transactions.find((t) => t.kind === 'card_purchase')!;
    const refund = await services.cards.refundCardPurchase(purchase.id, 100, TODAY);
    await services.transactions.deleteTransaction(refund.id);
    expect(await services.cards.getRefundableCents(purchase.id)).toBe(purchase.amountCents);
  });

  it('cartão novo: criar, editar, arquivar, excluir e desfazer', async () => {
    const { services, seed } = await create();
    const card = await services.cards.createCard({
      name: 'Visa',
      institution: 'Itaú',
      color: '#4F46E5',
      limitCents: 300000,
      closingDay: 31,
      dueDay: 8,
      paymentAccountId: seed.accounts[0].id,
    });
    expect(await services.cards.getAvailableLimit(card.id)).toBe(300000);
    await services.cards.updateCard(card.id, { limitCents: 400000 });
    expect((await services.cards.getCard(card.id))?.limitCents).toBe(400000);
    await services.cards.setCardArchived(card.id, true);
    expect((await services.cards.listCardsWithSummary()).some((c) => c.id === card.id)).toBe(false);
    await services.cards.deleteCard(card.id);
    expect(await services.cards.getCard(card.id)).toBeUndefined();
    await services.cards.restoreCard(card.id);
    expect(await services.cards.getCard(card.id)).toBeDefined();
  });

  it('cartão com lançamentos não pode ser excluído', async () => {
    const { services, seed } = await create();
    const error = await services.cards.deleteCard(seed.creditCards[0].id).catch((e: unknown) => e);
    expect(isDomainError(error) && error.code).toBe('card_has_transactions');
  });
});
