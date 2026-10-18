/**
 * Testes de fumaça dos fakes: garantem que as telas recebem dados coerentes antes dos
 * serviços reais. Servem também de exemplo de uso de cada contrato.
 */
import { createFakeServices, createFakeStore } from '../fakes';

jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: jest.fn() }));

const today = '2026-10-17';
const setup = () => {
  const store = createFakeStore(today);
  return { store, services: createFakeServices(store) };
};

describe('fake de contas', () => {
  it('lista 3 contas com saldo e soma o total', async () => {
    const { services } = setup();
    const accounts = await services.accounts.listAccountsWithBalance({ until: today });
    expect(accounts).toHaveLength(3);
    const total = await services.accounts.getTotalBalance(today);
    expect(total).toBe(accounts.reduce((s, a) => s + a.balanceCents, 0));
  });

  it('transferência move saldo sem mudar o total', async () => {
    const { services } = setup();
    const [from, to] = await services.accounts.listAccountsWithBalance({ until: today });
    const before = await services.accounts.getTotalBalance(today);
    await services.accounts.createTransfer({
      fromAccountId: from.id,
      toAccountId: to.id,
      amountCents: 5000,
      date: today,
    });
    expect(await services.accounts.getAccountBalance(from.id, today)).toBe(
      from.balanceCents - 5000,
    );
    expect(await services.accounts.getTotalBalance(today)).toBe(before);
  });

  it('ajuste leva o saldo ao valor informado', async () => {
    const { services } = setup();
    const [account] = await services.accounts.listAccountsWithBalance({ until: today });
    const adjustment = await services.accounts.adjustBalance(account.id, 100000, today);
    expect(adjustment?.kind).toBe('adjustment');
    expect(await services.accounts.getAccountBalance(account.id, today)).toBe(100000);
    expect(await services.accounts.adjustBalance(account.id, 100000, today)).toBeNull();
  });

  it('conta com lançamentos não pode ser excluída', async () => {
    const { services } = setup();
    const [account] = await services.accounts.listAccountsWithBalance();
    await expect(services.accounts.deleteAccount(account.id)).rejects.toThrow();
  });
});

describe('fake de lançamentos', () => {
  it('agrupa o mês por dia, do mais recente ao mais antigo', async () => {
    const { services } = setup();
    const groups = await services.transactions.listMonthTransactions('2026-09');
    expect(groups.length).toBeGreaterThan(0);
    const dates = groups.map((g) => g.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('excluir uma parcela leva o grupo junto e desfazer restaura', async () => {
    const { services, store } = setup();
    const installment = store.transactions.find((t) => t.installmentGroupId)!;
    const ids = await services.transactions.deleteTransaction(installment.id);
    expect(ids.length).toBe(installment.installmentTotal);
    expect(await services.transactions.getTransaction(installment.id)).toBeUndefined();
    await services.transactions.restoreTransactions(ids);
    expect(await services.transactions.getTransaction(installment.id)).toBeDefined();
  });

  it('resumo do mês separa receitas e despesas', async () => {
    const { services } = setup();
    const summary = await services.transactions.getMonthSummary('2026-09');
    expect(summary.incomeCents).toBeGreaterThan(0);
    expect(summary.expenseCents).toBeGreaterThan(0);
    expect(summary.netCents).toBe(summary.incomeCents - summary.expenseCents);
  });
});

describe('fake de cartões', () => {
  it('compra em 3x gera 3 parcelas em faturas seguidas', async () => {
    const { services } = setup();
    const [card] = await services.cards.listCardsWithSummary({ today });
    const rows = await services.cards.createCardPurchase({
      cardId: card.id,
      amountCents: 10000,
      installments: 3,
      date: today,
      description: 'Tênis',
      categoryId: null,
    });
    expect(rows.map((r) => r.amountCents)).toEqual([3334, 3333, 3333]);
    expect(new Set(rows.map((r) => r.invoiceId)).size).toBe(3);
  });

  it('pagar a fatura inteira marca como paga e reduz o saldo da conta', async () => {
    const { services } = setup();
    const [card] = await services.cards.listCardsWithSummary({ today });
    const invoice = card.currentInvoice!;
    const account = card.paymentAccountId!;
    const before = await services.accounts.getAccountBalance(account, today);
    await services.cards.payInvoice(invoice.id, account, invoice.remainingCents, today);
    expect((await services.cards.getInvoice(invoice.id))?.status).toBe('paid');
    expect(await services.accounts.getAccountBalance(account, today)).toBe(
      before - invoice.remainingCents,
    );
  });

  it('faturas pagas do seed não têm saldo restante', async () => {
    const { services } = setup();
    for (const card of await services.cards.listCardsWithSummary({ today })) {
      for (const invoice of await services.cards.listInvoices(card.id)) {
        if (invoice.status === 'paid') expect(invoice.remainingCents).toBe(0);
        if (invoice.status === 'partial') expect(invoice.remainingCents).toBeGreaterThan(0);
      }
    }
  });
});

describe('fake de categorias', () => {
  it('excluir categoria em uso exige mover os lançamentos', async () => {
    const { services, store } = setup();
    const used = store.transactions.find((t) => t.categoryId)!.categoryId!;
    const other = store.categories.find((c) => c.id !== used)!.id;
    await expect(services.categories.deleteCategory(used)).rejects.toThrow();
    await services.categories.deleteCategory(used, other);
    expect(store.transactions.some((t) => t.categoryId === used)).toBe(false);
  });
});
